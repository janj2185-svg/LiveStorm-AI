import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

abstract interface class PushTokenProvider {
  Future<String?> currentToken();
}

final class NoopPushTokenProvider implements PushTokenProvider {
  const NoopPushTokenProvider();

  @override
  Future<String?> currentToken() async => null;
}

abstract interface class PushRegistrationClient {
  Future<void> registerDevice({required String platform, required String token});
  Future<void> unregisterDevice({required String platform, required String token});
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

  void _read(SharedPreferences preferences) {
    state = preferences.getBool(_enabledKey) ?? false;
  }

  Future<void> setEnabled(bool enabled) async {
    final preferences = _preferences ?? await _initialization;
    state = enabled;
    await preferences.setBool(_enabledKey, enabled);
    if (enabled) {
      final token = await tokenProvider.currentToken();
      if (token != null && token.trim().isNotEmpty) {
        await registerToken(token);
      }
      return;
    }
    final lastToken = preferences.getString(_lastTokenKey);
    final lastPlatform = preferences.getString(_lastPlatformKey);
    if (lastToken != null && lastPlatform != null) {
      await unregisterToken(lastToken, platform: lastPlatform);
    }
  }

  Future<void> registerToken(String token, {String? platform}) async {
    if (!state) {
      return;
    }
    final normalizedToken = token.trim();
    if (normalizedToken.isEmpty) {
      return;
    }
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

