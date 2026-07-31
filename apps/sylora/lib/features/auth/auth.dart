import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/models.dart';

@immutable
final class LoginResult {
  const LoginResult.authenticated(this.user)
    : challengeToken = null,
      mfaRequired = false;

  const LoginResult.mfa(this.challengeToken) : user = null, mfaRequired = true;

  final bool mfaRequired;
  final String? challengeToken;
  final UserAccount? user;
}

@immutable
final class SessionModel {
  const SessionModel({
    required this.id,
    required this.deviceLabel,
    required this.current,
    required this.revoked,
  });

  factory SessionModel.fromJson(JsonObject json) => SessionModel(
    id: requireString(json, 'id'),
    deviceLabel: requireString(json, 'device_label'),
    current: requireBool(json, 'current'),
    revoked: json['revoked_at'] != null,
  );

  final String id;
  final String deviceLabel;
  final bool current;
  final bool revoked;
}

abstract interface class AuthRepository {
  Future<UserAccount?> restore();
  Future<LoginResult> login({
    required String email,
    required String password,
    required String deviceLabel,
  });
  Future<UserAccount> verifyMfa({
    required String challengeToken,
    required String code,
    required String deviceLabel,
  });
  Future<void> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  });
  Future<void> requestEmailVerification(String email);
  Future<void> consumeEmailVerification(String token);
  Future<void> requestPasswordReset(String email);
  Future<void> consumePasswordReset(String token, String password);
  Future<void> logout();
  Future<void> logoutAll();
  Future<List<SessionModel>> sessions();
  Future<void> revokeSession(String id);
  Future<JsonObject> setupTotp();
  Future<List<String>> confirmTotp(String code);
  Future<void> disableTotp({required String code, String? password});
}

final class DioAuthRepository implements AuthRepository {
  DioAuthRepository(this.client, this.tokenStore);

  final ApiClient client;
  final TokenStore tokenStore;

  @override
  Future<UserAccount?> restore() async {
    if (!await client.restoreSession()) {
      return null;
    }
    return _me();
  }

  Future<UserAccount> _me() async {
    final response = await client.request('auth/me');
    return UserAccount.fromJson(requireObject(response.data, 'current user'));
  }

  @override
  Future<LoginResult> login({
    required String email,
    required String password,
    required String deviceLabel,
  }) async {
    final response = await client.request(
      'auth/login',
      method: 'POST',
      authentication: false,
      refreshOnUnauthorized: false,
      data: <String, dynamic>{
        'email': email,
        'password': password,
        'device_label': deviceLabel,
      },
    );
    final json = requireObject(response.data, 'login response');
    if (requireBool(json, 'mfa_required')) {
      return LoginResult.mfa(requireString(json, 'challenge_token'));
    }
    await tokenStore.save(
      AuthTokens.fromJson(requireObject(json['tokens'], 'login tokens')),
    );
    return LoginResult.authenticated(await _me());
  }

  @override
  Future<UserAccount> verifyMfa({
    required String challengeToken,
    required String code,
    required String deviceLabel,
  }) async {
    final response = await client.request(
      'auth/totp/verify',
      method: 'POST',
      authentication: false,
      refreshOnUnauthorized: false,
      data: <String, dynamic>{
        'challenge_token': challengeToken,
        'code': code,
        'device_label': deviceLabel,
      },
    );
    await tokenStore.save(
      AuthTokens.fromJson(requireObject(response.data, 'MFA tokens')),
    );
    return _me();
  }

  @override
  Future<void> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  }) async {
    await client.request(
      'auth/register',
      method: 'POST',
      authentication: false,
      refreshOnUnauthorized: false,
      data: <String, dynamic>{
        'email': email,
        'password': password,
        'display_name': displayName,
        'device_label': deviceLabel,
      },
    );
  }

  @override
  Future<void> requestEmailVerification(String email) => _publicPost(
    'auth/email-verification/request',
    <String, dynamic>{'email': email},
  );

  @override
  Future<void> consumeEmailVerification(String token) => _publicPost(
    'auth/email-verification/consume',
    <String, dynamic>{'token': token},
  );

  @override
  Future<void> requestPasswordReset(String email) => _publicPost(
    'auth/password-reset/request',
    <String, dynamic>{'email': email},
  );

  @override
  Future<void> consumePasswordReset(String token, String password) =>
      _publicPost('auth/password-reset/consume', <String, dynamic>{
        'token': token,
        'new_password': password,
      });

  Future<void> _publicPost(String path, JsonObject data) async {
    await client.request(
      path,
      method: 'POST',
      data: data,
      authentication: false,
      refreshOnUnauthorized: false,
    );
  }

  @override
  Future<void> logout() async {
    try {
      await client.request('auth/logout', method: 'POST');
    } finally {
      await tokenStore.clear();
    }
  }

  @override
  Future<void> logoutAll() async {
    try {
      await client.request('auth/logout-all', method: 'POST');
    } finally {
      await tokenStore.clear();
    }
  }

  @override
  Future<List<SessionModel>> sessions() async {
    final response = await client.request('auth/sessions');
    final values = response.data;
    if (values is! List) {
      throw const FormatException('Sessions response must be a JSON array.');
    }
    return values
        .map((value) => SessionModel.fromJson(requireObject(value, 'session')))
        .toList(growable: false);
  }

  @override
  Future<void> revokeSession(String id) async {
    await client.request('auth/sessions/$id', method: 'DELETE');
  }

  @override
  Future<JsonObject> setupTotp() async {
    final response = await client.request('auth/totp/setup', method: 'POST');
    return requireObject(response.data, 'TOTP setup');
  }

  @override
  Future<List<String>> confirmTotp(String code) async {
    final response = await client.request(
      'auth/totp/confirm',
      method: 'POST',
      data: <String, dynamic>{'code': code},
    );
    return requireList(
      requireObject(response.data, 'TOTP confirmation'),
      'recovery_codes',
    ).map((value) => value as String).toList(growable: false);
  }

  @override
  Future<void> disableTotp({required String code, String? password}) async {
    await client.request(
      'auth/totp/disable',
      method: 'POST',
      data: <String, dynamic>{'code': code, 'password': password},
    );
    await tokenStore.clear();
  }
}

enum AuthStatus { checking, unauthenticated, mfaRequired, authenticated }

@immutable
final class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.challengeToken,
    this.busy = false,
    this.error,
    this.notice,
  });

  const AuthState.checking() : this(status: AuthStatus.checking);
  const AuthState.unauthenticated({
    String? error,
    String? notice,
    bool busy = false,
  }) : this(
         status: AuthStatus.unauthenticated,
         error: error,
         notice: notice,
         busy: busy,
       );

  final AuthStatus status;
  final UserAccount? user;
  final String? challengeToken;
  final bool busy;
  final String? error;
  final String? notice;

  AuthState copyWith({
    AuthStatus? status,
    UserAccount? user,
    String? challengeToken,
    bool? busy,
    String? error,
    String? notice,
    bool clearMessages = false,
  }) => AuthState(
    status: status ?? this.status,
    user: user ?? this.user,
    challengeToken: challengeToken ?? this.challengeToken,
    busy: busy ?? this.busy,
    error: clearMessages ? null : error ?? this.error,
    notice: clearMessages ? null : notice ?? this.notice,
  );
}

final class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository, {bool autoRestore = true})
    : super(const AuthState.checking()) {
    if (autoRestore) {
      unawaited(restore());
    }
  }

  final AuthRepository _repository;

  Future<void> restore() async {
    state = const AuthState.checking();
    try {
      final user = await _repository.restore();
      state = user == null
          ? const AuthState.unauthenticated()
          : AuthState(status: AuthStatus.authenticated, user: user);
    } on Object {
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> login({
    required String email,
    required String password,
    String deviceLabel = 'SYLORA client',
  }) async {
    state = const AuthState.unauthenticated(busy: true);
    try {
      final result = await _repository.login(
        email: email.trim(),
        password: password,
        deviceLabel: deviceLabel,
      );
      state = result.mfaRequired
          ? AuthState(
              status: AuthStatus.mfaRequired,
              challengeToken: result.challengeToken,
            )
          : AuthState(status: AuthStatus.authenticated, user: result.user);
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
    }
  }

  Future<void> verifyMfa(String code) async {
    final challenge = state.challengeToken;
    if (challenge == null) {
      state = const AuthState.unauthenticated(
        error: 'The MFA challenge expired. Sign in again.',
      );
      return;
    }
    state = state.copyWith(busy: true, clearMessages: true);
    try {
      final user = await _repository.verifyMfa(
        challengeToken: challenge,
        code: code,
        deviceLabel: 'SYLORA client',
      );
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on Object catch (error) {
      state = state.copyWith(busy: false, error: messageFor(error));
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    state = const AuthState.unauthenticated(busy: true);
    try {
      await _repository.register(
        email: email.trim(),
        password: password,
        displayName: displayName.trim(),
        deviceLabel: 'SYLORA client',
      );
      state = const AuthState.unauthenticated(
        notice: 'Check your email to verify your account.',
      );
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState.unauthenticated();
  }

  void expire() {
    state = const AuthState.unauthenticated(
      error: 'Your session ended. Sign in again.',
    );
  }
}

String messageFor(Object error) {
  if (error is ApiProblem) {
    return error.detail;
  }
  if (error is OfflineException) {
    return 'You are offline. Connect and try again.';
  }
  if (error is FormatException) {
    return 'The server returned an unexpected response.';
  }
  return 'The request could not be completed.';
}

String? validateEmail(String? value) {
  final email = value?.trim() ?? '';
  if (email.isEmpty) {
    return 'Enter your email address.';
  }
  if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
    return 'Enter a valid email address.';
  }
  return null;
}

String? validatePassword(String? value, {bool registration = false}) {
  final password = value ?? '';
  if (password.isEmpty) {
    return 'Enter your password.';
  }
  if (registration && password.length < 12) {
    return 'Use at least 12 characters.';
  }
  return null;
}

final appConfigProvider = Provider<AppConfig>(
  (ref) => AppConfig.fromEnvironment(),
);

final tokenStoreProvider = Provider<TokenStore>((ref) => PlatformTokenStore());

final networkMonitorProvider = Provider<NetworkMonitor>(
  (ref) => ConnectivityNetworkMonitor(),
);

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(
    config: ref.watch(appConfigProvider),
    tokenStore: ref.watch(tokenStoreProvider),
    networkMonitor: ref.watch(networkMonitorProvider),
  ),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => DioAuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStoreProvider),
  ),
);

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    final controller = AuthController(ref.watch(authRepositoryProvider));
    ref.watch(apiClientProvider).onSessionExpired = controller.expire;
    return controller;
  },
);
