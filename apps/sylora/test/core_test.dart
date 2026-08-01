import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/config.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/core/models.dart';

import 'test_transport.dart';

void main() {
  group('AppConfig', () {
    test('validates API URL and production HTTPS', () {
      final config = AppConfig(
        apiBaseUri: Uri.parse('https://api.example.test'),
        production: true,
      );
      expect(
        config.endpoint('auth/me').toString(),
        'https://api.example.test/v1/auth/me',
      );
      expect(
        () => AppConfig(
          apiBaseUri: Uri.parse('http://api.example.test'),
          production: true,
        ),
        throwsFormatException,
      );
      expect(
        () => AppConfig(
          apiBaseUri: Uri.parse('https://api.example.test/backend'),
        ),
        throwsFormatException,
      );
    });

    test('local mobile origins resolve /v1 endpoints', () {
      final desktop = AppConfig.local(origin: AppConfig.localDesktopOrigin);
      final android = AppConfig.local(
        origin: AppConfig.localAndroidEmulatorOrigin,
      );
      expect(desktop.endpoint('auth/login').toString(), endsWith('/v1/auth/login'));
      expect(
        android.apiBaseUri.host,
        '10.0.2.2',
      );
      expect(
        android.websocket('ws/messages').scheme,
        'ws',
      );
    });
  });

  group('ApiProblem', () {
    test('parses RFC7807 fields and validation metadata', () {
      final problem = ApiProblem.fromJson(<String, dynamic>{
        'type': 'https://api.sylora.com/problems/validation_error',
        'title': 'Request validation failed',
        'status': 422,
        'detail': 'One or more request fields are invalid.',
        'instance': '/v1/auth/register',
        'code': 'validation_error',
        'request_id': 'request-42',
        'invalid_fields': <String>['email', 'password'],
      });

      expect(problem.status, 422);
      expect(problem.code, 'validation_error');
      expect(problem.requestId, 'request-42');
      expect(problem.invalidFields, <String>['email', 'password']);
    });

    test('uses safe fallbacks for malformed problem body', () {
      final problem = ApiProblem.fromJson(
        <String, dynamic>{
          'type': 1,
          'instance': false,
          'request_id': <String>[],
        },
        fallbackStatus: 503,
        responseRequestId: 'header-request',
      );
      expect(problem.status, 503);
      expect(problem.code, 'request_failed');
      expect(problem.type, isNull);
      expect(problem.instance, isNull);
      expect(problem.requestId, 'header-request');
    });
  });

  test(
    'API requests omit null query values instead of sending empty cursors',
    () async {
      late RequestOptions captured;
      final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/v1/'));
      dio.httpClientAdapter = TestTransport((options) {
        captured = options;
        return jsonResponse(<String, dynamic>{'status': 'ok'}, 200);
      });
      final client = ApiClient(
        config: AppConfig(apiBaseUri: Uri.parse('https://api.example.test')),
        tokenStore: _MemoryTokenStore(
          const AuthTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 900,
          ),
        ),
        networkMonitor: const _OnlineMonitor(),
        dio: dio,
      );

      await client.request(
        'social/feed',
        queryParameters: <String, dynamic>{
          'mode': 'chronological',
          'cursor': null,
          'q': null,
        },
      );

      expect(captured.uri.queryParameters, <String, String>{
        'mode': 'chronological',
      });
    },
  );

  test('refresh rotation is single-flight across concurrent 401s', () async {
    final store = _MemoryTokenStore(
      const AuthTokens(
        accessToken: 'expired-access',
        refreshToken: 'refresh-one',
        expiresIn: 10,
      ),
    );
    var refreshCalls = 0;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/v1/'));
    dio.httpClientAdapter = TestTransport((options) async {
      if (options.path.endsWith('auth/refresh')) {
        refreshCalls += 1;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return jsonResponse(<String, dynamic>{
          'access_token': 'fresh-access',
          'refresh_token': 'refresh-two',
          'token_type': 'Bearer',
          'expires_in': 900,
        }, 200);
      }
      if (options.headers['Authorization'] == 'Bearer fresh-access') {
        return jsonResponse(<String, dynamic>{'ok': true}, 200);
      }
      return jsonResponse(<String, dynamic>{
        'status': 401,
        'code': 'invalid_token',
        'title': 'Invalid token',
        'detail': 'Refresh required.',
      }, 401);
    });
    final client = ApiClient(
      config: AppConfig(apiBaseUri: Uri.parse('https://api.example.test')),
      tokenStore: store,
      networkMonitor: const _OnlineMonitor(),
      dio: dio,
    );

    final responses = await Future.wait<Response<dynamic>>(
      <Future<Response<dynamic>>>[
        client.request('profile'),
        client.request('settings'),
      ],
    );

    expect(refreshCalls, 1);
    expect(responses.every((response) => response.statusCode == 200), isTrue);
    expect(store.accessToken, 'fresh-access');
    expect(await store.readRefreshToken(), 'refresh-two');
  });

  test('transient refresh failure preserves the stored session', () async {
    final store = _MemoryTokenStore(
      const AuthTokens(
        accessToken: 'expired-access',
        refreshToken: 'refresh-one',
        expiresIn: 10,
      ),
    );
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/v1/'));
    dio.httpClientAdapter = TestTransport(
      (_) => jsonResponse(<String, dynamic>{
        'status': 503,
        'code': 'service_unavailable',
        'title': 'Service unavailable',
        'detail': 'Try again later.',
      }, 503),
    );
    final client = ApiClient(
      config: AppConfig(apiBaseUri: Uri.parse('https://api.example.test')),
      tokenStore: store,
      networkMonitor: const _OnlineMonitor(),
      dio: dio,
    );

    expect(await client.restoreSession(), isFalse);
    expect(store.accessToken, 'expired-access');
    expect(await store.readRefreshToken(), 'refresh-one');
  });

  test('invalid refresh token clears the stored session', () async {
    final store = _MemoryTokenStore(
      const AuthTokens(
        accessToken: 'expired-access',
        refreshToken: 'refresh-one',
        expiresIn: 10,
      ),
    );
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/v1/'));
    dio.httpClientAdapter = TestTransport(
      (_) => jsonResponse(<String, dynamic>{
        'status': 401,
        'code': 'invalid_refresh_token',
        'title': 'Invalid refresh token',
        'detail': 'The refresh token is invalid or expired.',
      }, 401),
    );
    final client = ApiClient(
      config: AppConfig(apiBaseUri: Uri.parse('https://api.example.test')),
      tokenStore: store,
      networkMonitor: const _OnlineMonitor(),
      dio: dio,
    );

    expect(await client.restoreSession(), isFalse);
    expect(store.accessToken, isNull);
    expect(await store.readRefreshToken(), isNull);
  });

  test('malformed successful refresh clears the rotated session', () async {
    final store = _MemoryTokenStore(
      const AuthTokens(
        accessToken: 'expired-access',
        refreshToken: 'refresh-one',
        expiresIn: 10,
      ),
    );
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/v1/'));
    dio.httpClientAdapter = TestTransport(
      (_) => jsonResponse(<String, dynamic>{
        'access_token': 'fresh-access',
        'expires_in': 900,
      }, 200),
    );
    final client = ApiClient(
      config: AppConfig(apiBaseUri: Uri.parse('https://api.example.test')),
      tokenStore: store,
      networkMonitor: const _OnlineMonitor(),
      dio: dio,
    );

    expect(await client.restoreSession(), isFalse);
    expect(store.accessToken, isNull);
    expect(await store.readRefreshToken(), isNull);
  });

  group('strict model parsing', () {
    test('preserves an unknown enum value without crashing', () {
      final post = PostModel.fromJson(_postJson(lifecycle: 'future_state'));
      expect(post.lifecycle, PostLifecycle.unknown);
      expect(post.rawLifecycle, 'future_state');
    });

    test('rejects a missing required field', () {
      final json = _postJson()..remove('author_handle');
      expect(() => PostModel.fromJson(json), throwsFormatException);
    });

    test('parses live destinations without dropping capabilities', () {
      final session = LiveSessionModel.fromJson(<String, dynamic>{
        'id': 'session-id',
        'title': 'Launch',
        'state': 'draft',
        'ingest_path': 'live/session-id',
        'ingest_provisioned': true,
        'destinations': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'destination-id',
            'connection_id': 'connection-id',
            'state': 'ready',
            'publish_enabled': true,
            'chat_enabled': false,
            'events_enabled': true,
            'moderation_enabled': false,
            'analytics_enabled': true,
          },
        ],
      });

      expect(session.destinations, hasLength(1));
      expect(session.destinations.single.publishEnabled, isTrue);
      expect(session.destinations.single.eventsEnabled, isTrue);
      expect(session.destinations.single.analyticsEnabled, isTrue);
    });
  });

  test('Lumen light tokens preserve readable contrast and warm canvas', () {
    const foreground = LumenColors.porcelainInk;
    const background = LumenColors.porcelainCanvas;
    expect(background, isNot(Colors.white));
    expect(_contrast(foreground, background), greaterThanOrEqualTo(4.5));
    expect(
      LumenTheme.light().textTheme.headlineLarge?.fontFamily,
      'Instrument Serif',
    );
  });

  test(
    'visual settings persist an update made during initialization',
    () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'visual.theme': 'dark',
        'visual.highContrast': false,
      });
      final controller = VisualSettingsController();
      const expected = VisualSettings(
        themeMode: LumenThemeMode.system,
        highContrast: true,
        reducedMotion: true,
        textScale: 1.25,
      );

      await controller.update(expected);
      final preferences = await SharedPreferences.getInstance();

      expect(controller.state.themeMode, LumenThemeMode.system);
      expect(controller.state.highContrast, isTrue);
      expect(preferences.getString('visual.theme'), 'system');
      expect(preferences.getBool('visual.highContrast'), isTrue);
      expect(preferences.getBool('visual.reducedMotion'), isTrue);
      expect(preferences.getDouble('visual.textScale'), 1.25);
      controller.dispose();
    },
  );
}

Map<String, dynamic> _postJson({String lifecycle = 'published'}) =>
    <String, dynamic>{
      'id': 'post-id',
      'author_id': 'author-id',
      'author_handle': 'author',
      'kind': 'text',
      'body': 'A real post',
      'visibility': 'public',
      'lifecycle': lifecycle,
      'created_at': '2026-07-31T12:00:00Z',
      'reaction_count': 0,
      'comment_count': 0,
      'repost_count': 0,
      'bookmarked': false,
      'viewer_reaction': null,
    };

double _contrast(Color a, Color b) {
  final lighter = a.computeLuminance() > b.computeLuminance() ? a : b;
  final darker = identical(lighter, a) ? b : a;
  return (lighter.computeLuminance() + 0.05) /
      (darker.computeLuminance() + 0.05);
}

final class _MemoryTokenStore implements TokenStore {
  _MemoryTokenStore(AuthTokens initial)
    : _accessToken = initial.accessToken,
      _refreshToken = initial.refreshToken;

  String? _accessToken;
  String? _refreshToken;

  @override
  String? get accessToken => _accessToken;

  @override
  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
  }

  @override
  Future<String?> readRefreshToken() async => _refreshToken;

  @override
  Future<void> save(AuthTokens tokens) async {
    _accessToken = tokens.accessToken;
    _refreshToken = tokens.refreshToken;
  }
}

final class _OnlineMonitor implements NetworkMonitor {
  const _OnlineMonitor();

  @override
  Future<bool> get isOffline async => false;

  @override
  Stream<bool> get offlineChanges => const Stream<bool>.empty();
}
