import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

abstract interface class PushTokenProvider {
  bool get configured;
  Future<String?> currentToken();
  Stream<String> get tokenChanges;
}

/// Default token source for builds that do not package a native push SDK.
///
/// A Firebase-enabled packaging entry point can override this provider with a
/// [PushTokenProvider] backed by `firebase_messaging`. Keeping the no-op value
/// here prevents partially configured Firebase projects from breaking normal
/// client builds.
final pushTokenProviderProvider = Provider<PushTokenProvider>(
  (ref) => const NoopPushTokenProvider(),
);

final class NoopPushTokenProvider implements PushTokenProvider {
  const NoopPushTokenProvider();

  @override
  bool get configured => false;

  @override
  Future<String?> currentToken() async => null;

  @override
  Stream<String> get tokenChanges => const Stream<String>.empty();
}

abstract interface class PushRegistrationClient {
  Future<void> registerDevice({
    required String platform,
    required String token,
  });
  Future<void> unregisterDevice({
    required String platform,
    required String token,
  });
}

final class ApiPushRegistrationClient implements PushRegistrationClient {
  const ApiPushRegistrationClient(this._client);

  final ApiClient _client;

  @override
  Future<void> registerDevice({
    required String platform,
    required String token,
  }) async {
    await _client.request(
      'push/devices',
      method: 'POST',
      data: <String, dynamic>{'platform': platform, 'token': token},
    );
  }

  @override
  Future<void> unregisterDevice({
    required String platform,
    required String token,
  }) async {
    await _client.request(
      'push/devices/unregister',
      method: 'POST',
      data: <String, dynamic>{'platform': platform, 'token': token},
    );
  }
}

final class PushService extends StateNotifier<bool> {
  PushService({
    required this.client,
    this.tokenProvider = const NoopPushTokenProvider(),
    SharedPreferences? preferences,
  }) : _preferences = preferences,
       super(false) {
    _tokenSubscription = tokenProvider.tokenChanges.listen((token) {
      if (state) {
        unawaited(_registerRefreshedToken(token));
      }
    });
    if (preferences != null) {
      _initialization = SynchronousFuture<SharedPreferences>(preferences);
      _read(preferences);
    } else {
      _initialization = SharedPreferences.getInstance().then((value) {
        _preferences = value;
        _read(value);
        return value;
      });
    }
  }

  static const _enabledKey = 'push.notificationsEnabled';
  static const _lastTokenKey = 'push.lastToken';
  static const _lastPlatformKey = 'push.lastPlatform';

  final PushRegistrationClient client;
  final PushTokenProvider tokenProvider;
  SharedPreferences? _preferences;
  late final Future<SharedPreferences> _initialization;
  late final StreamSubscription<String> _tokenSubscription;

  bool get nativePushAvailable => tokenProvider.configured;

  void _read(SharedPreferences preferences) {
    state = nativePushAvailable && (preferences.getBool(_enabledKey) ?? false);
  }

  Future<void> setEnabled(bool enabled) async {
    final preferences = _preferences ?? await _initialization;
    if (enabled && !nativePushAvailable) {
      throw StateError('Push requires FCM configuration');
    }
    if (enabled) {
      final token = await tokenProvider.currentToken();
      if (token == null || token.trim().isEmpty) {
        throw StateError('Push token is unavailable');
      }
      await _registerToken(token);
      await preferences.setBool(_enabledKey, true);
      state = true;
      return;
    }
    state = false;
    await preferences.setBool(_enabledKey, false);
    final lastToken = preferences.getString(_lastTokenKey);
    final lastPlatform = preferences.getString(_lastPlatformKey);
    if (lastToken != null && lastPlatform != null) {
      await unregisterToken(lastToken, platform: lastPlatform);
    }
  }

  /// Re-registers the current token after an authenticated startup restore.
  Future<void> syncEnabledRegistration() async {
    await _initialization;
    if (!state || !nativePushAvailable) {
      return;
    }
    final token = await tokenProvider.currentToken();
    if (token == null || token.trim().isEmpty) {
      return;
    }
    await _registerToken(token);
  }

  /// Removes the local user's last registration before authentication is lost.
  Future<void> clearRegistrationOnLogout() async {
    final preferences = _preferences ?? await _initialization;
    state = false;
    await preferences.setBool(_enabledKey, false);
    final lastToken = preferences.getString(_lastTokenKey);
    final lastPlatform =
        preferences.getString(_lastPlatformKey) ?? currentPushPlatform();
    if (lastToken != null && lastToken.trim().isNotEmpty) {
      try {
        await client.unregisterDevice(
          platform: lastPlatform,
          token: lastToken.trim(),
        );
      } on Object catch (error) {
        debugPrint('Push logout unregistration failed: $error');
      }
    }
    await Future.wait(<Future<bool>>[
      preferences.remove(_lastTokenKey),
      preferences.remove(_lastPlatformKey),
    ]);
  }

  Future<void> registerToken(String token, {String? platform}) async {
    if (!state) {
      return;
    }
    final normalizedToken = token.trim();
    if (normalizedToken.isEmpty) {
      return;
    }
    await _registerToken(normalizedToken, platform: platform);
  }

  Future<void> _registerToken(String token, {String? platform}) async {
    final normalizedToken = token.trim();
    final normalizedPlatform = platform ?? currentPushPlatform();
    await client.registerDevice(
      platform: normalizedPlatform,
      token: normalizedToken,
    );
    final preferences = _preferences ?? await _initialization;
    await Future.wait(<Future<bool>>[
      preferences.setString(_lastTokenKey, normalizedToken),
      preferences.setString(_lastPlatformKey, normalizedPlatform),
    ]);
  }

  Future<void> unregisterToken(String token, {String? platform}) async {
    final normalizedToken = token.trim();
    if (normalizedToken.isEmpty) {
      return;
    }
    await client.unregisterDevice(
      platform: platform ?? currentPushPlatform(),
      token: normalizedToken,
    );
    final preferences = _preferences ?? await _initialization;
    await Future.wait(<Future<bool>>[
      preferences.remove(_lastTokenKey),
      preferences.remove(_lastPlatformKey),
    ]);
  }

  Future<void> _registerRefreshedToken(String token) async {
    try {
      await registerToken(token);
    } on Object catch (error) {
      debugPrint('Push token refresh registration failed: $error');
    }
  }

  @override
  void dispose() {
    _tokenSubscription.cancel();
    super.dispose();
  }
}

String currentPushPlatform() {
  if (kIsWeb) {
    return 'web';
  }
  return switch (defaultTargetPlatform) {
    TargetPlatform.iOS => 'ios',
    TargetPlatform.android => 'android',
    _ => 'web',
  };
}
