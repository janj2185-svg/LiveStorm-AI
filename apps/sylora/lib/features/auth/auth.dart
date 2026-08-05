import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/models.dart';
import '../../core/push_service.dart';

@immutable
final class AuthMethods {
  const AuthMethods({
    required this.phone,
    required this.email,
    this.emailPassword = true,
    this.emailOtp = false,
    required this.tiktok,
    required this.facebook,
    required this.google,
    required this.apple,
  });

  factory AuthMethods.fromJson(JsonObject json) {
    final email = requireBool(json, 'email');
    return AuthMethods(
      phone: requireBool(json, 'phone'),
      email: email,
      emailPassword: json['email_password'] is bool
          ? json['email_password'] as bool
          : true,
      emailOtp: json['email_otp'] is bool ? json['email_otp'] as bool : email,
      tiktok: requireBool(json, 'tiktok'),
      facebook: requireBool(json, 'facebook'),
      google: requireBool(json, 'google'),
      apple: requireBool(json, 'apple'),
    );
  }

  final bool phone;
  final bool email;
  final bool emailPassword;
  final bool emailOtp;
  final bool tiktok;
  final bool facebook;
  final bool google;
  final bool apple;
}

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
final class OtpStartResult {
  const OtpStartResult({this.debugCode, this.resendAfter = 60});

  factory OtpStartResult.fromJson(JsonObject json) => OtpStartResult(
    debugCode: json['debug_code'] is String
        ? json['debug_code'] as String
        : null,
    resendAfter: json['resend_after'] is num
        ? (json['resend_after'] as num).toInt()
        : 60,
  );

  final String? debugCode;
  final int resendAfter;
}

@immutable
final class RegisterResult {
  const RegisterResult({required this.status});

  factory RegisterResult.fromJson(JsonObject json) => RegisterResult(
    status: json['status'] is String
        ? json['status'] as String
        : 'verification_queued',
  );

  final String status;

  bool get verified => status == 'registered_verified';
}

@immutable
final class DeliveryHint {
  const DeliveryHint({this.debugToken, this.debugLink});

  factory DeliveryHint.fromJson(JsonObject json) => DeliveryHint(
    debugToken: json['debug_token'] is String
        ? json['debug_token'] as String
        : null,
    debugLink: json['debug_link'] is String
        ? json['debug_link'] as String
        : null,
  );

  final String? debugToken;
  final String? debugLink;
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
  Future<AuthMethods> authMethods();
  Future<UserAccount?> restore();
  Future<UserAccount> currentUser();
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
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  });
  Future<OtpStartResult> startPhoneOtp(String phone);
  Future<UserAccount> verifyPhoneOtp({
    required String phone,
    required String code,
    required String deviceLabel,
  });
  Future<OtpStartResult> startEmailOtp(String email);
  Future<UserAccount> verifyEmailOtp({
    required String email,
    required String code,
    required String deviceLabel,
  });
  Future<UserAccount> completeOAuthSession();
  Future<DeliveryHint> requestEmailVerification(String email);
  Future<void> consumeEmailVerification(String token);
  Future<DeliveryHint> requestPasswordReset(String email);
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
  Future<AuthMethods> authMethods() async {
    final response = await client.request(
      'auth/methods',
      authentication: false,
      refreshOnUnauthorized: false,
    );
    return AuthMethods.fromJson(requireObject(response.data, 'auth methods'));
  }

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
  Future<UserAccount> currentUser() => _me();

  Future<UserAccount> _saveTokensAndMe(JsonObject tokens) async {
    await tokenStore.save(AuthTokens.fromJson(tokens));
    return _me();
  }

  @override
  Future<OtpStartResult> startPhoneOtp(String phone) => _publicPostResult(
    'auth/phone/start',
    <String, dynamic>{'phone': phone},
    OtpStartResult.fromJson,
  );

  @override
  Future<UserAccount> verifyPhoneOtp({
    required String phone,
    required String code,
    required String deviceLabel,
  }) async {
    final response = await client.request(
      'auth/phone/verify',
      method: 'POST',
      authentication: false,
      refreshOnUnauthorized: false,
      data: <String, dynamic>{
        'phone': phone,
        'code': code,
        'device_label': deviceLabel,
      },
    );
    return _saveTokensAndMe(requireObject(response.data, 'phone tokens'));
  }

  @override
  Future<OtpStartResult> startEmailOtp(String email) => _publicPostResult(
    'auth/email/otp/start',
    <String, dynamic>{'email': email},
    OtpStartResult.fromJson,
  );

  @override
  Future<UserAccount> verifyEmailOtp({
    required String email,
    required String code,
    required String deviceLabel,
  }) async {
    final response = await client.request(
      'auth/email/otp/verify',
      method: 'POST',
      authentication: false,
      refreshOnUnauthorized: false,
      data: <String, dynamic>{
        'email': email,
        'code': code,
        'device_label': deviceLabel,
      },
    );
    return _saveTokensAndMe(requireObject(response.data, 'email otp tokens'));
  }

  @override
  Future<UserAccount> completeOAuthSession() async {
    final response = await client.request(
      'auth/oauth/session-complete',
      authentication: false,
      refreshOnUnauthorized: false,
    );
    return _saveTokensAndMe(requireObject(response.data, 'oauth tokens'));
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
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  }) async {
    final response = await client.request(
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
    final json = response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};
    return RegisterResult.fromJson(json);
  }

  @override
  Future<DeliveryHint> requestEmailVerification(String email) =>
      _publicPostResult('auth/email-verification/request', <String, dynamic>{
        'email': email,
      }, DeliveryHint.fromJson);

  @override
  Future<void> consumeEmailVerification(String token) => _publicPost(
    'auth/email-verification/consume',
    <String, dynamic>{'token': token},
  );

  @override
  Future<DeliveryHint> requestPasswordReset(String email) => _publicPostResult(
    'auth/password-reset/request',
    <String, dynamic>{'email': email},
    DeliveryHint.fromJson,
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

  Future<T> _publicPostResult<T>(
    String path,
    JsonObject data,
    T Function(JsonObject json) parse,
  ) async {
    final response = await client.request(
      path,
      method: 'POST',
      data: data,
      authentication: false,
      refreshOnUnauthorized: false,
    );
    final json = response.data is Map
        ? Map<String, dynamic>.from(response.data as Map)
        : <String, dynamic>{};
    return parse(json);
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
  AuthController(
    this._repository, {
    this.syncPushRegistration,
    this.clearPushRegistration,
    bool autoRestore = true,
  }) : super(const AuthState.checking()) {
    if (autoRestore) {
      unawaited(restore());
    }
  }

  final AuthRepository _repository;
  final Future<void> Function()? syncPushRegistration;
  final Future<void> Function()? clearPushRegistration;

  Future<void> restore() async {
    state = const AuthState.checking();
    try {
      final user = await _repository.restore();
      state = user == null
          ? const AuthState.unauthenticated()
          : AuthState(status: AuthStatus.authenticated, user: user);
      if (user != null) {
        await _runPushCallback(
          syncPushRegistration,
          operation: 'startup registration',
        );
      }
    } on Object {
      state = const AuthState.unauthenticated();
    }
  }

  /// Re-fetch /auth/me without clearing the session (e.g. after assume-role).
  Future<void> refreshMe() async {
    if (state.status != AuthStatus.authenticated) {
      return;
    }
    try {
      final user = await _repository.currentUser();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on Object catch (error) {
      state = state.copyWith(error: messageFor(error));
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
        error: 'Час на код двофакторної перевірки минув. Увійдіть знову.',
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

  Future<RegisterResult?> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    state = const AuthState.unauthenticated(busy: true);
    try {
      final trimmedEmail = email.trim();
      final result = await _repository.register(
        email: trimmedEmail,
        password: password,
        displayName: displayName.trim(),
        deviceLabel: 'SYLORA client',
      );
      if (result.verified) {
        // Test stand / auto-verify: sign in immediately so registration feels complete.
        final loginResult = await _repository.login(
          email: trimmedEmail,
          password: password,
          deviceLabel: 'SYLORA client',
        );
        if (loginResult.mfaRequired) {
          state = AuthState.unauthenticated(
            notice: 'Акаунт створено. Підтвердіть MFA, щоб увійти.',
          );
          return result;
        }
        state = AuthState(
          status: AuthStatus.authenticated,
          user: loginResult.user,
        );
        return result;
      }
      state = const AuthState.unauthenticated(
        notice: 'Перевірте пошту, щоб підтвердити акаунт.',
      );
      return result;
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
      return null;
    }
  }

  Future<OtpStartResult?> startPhoneOtp(String phone) async {
    state = state.copyWith(busy: true, clearMessages: true);
    try {
      final result = await _repository.startPhoneOtp(phone);
      final codeHint = result.debugCode == null
          ? ''
          : ' Код для тесту: ${result.debugCode}.';
      state = state.copyWith(
        busy: false,
        notice: 'Якщо номер коректний, код надіслано в SMS.$codeHint',
      );
      return result;
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
      return null;
    }
  }

  Future<void> verifyPhoneOtp({
    required String phone,
    required String code,
  }) async {
    state = state.copyWith(busy: true, clearMessages: true);
    try {
      final user = await _repository.verifyPhoneOtp(
        phone: phone,
        code: code,
        deviceLabel: 'SYLORA client',
      );
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
    }
  }

  Future<OtpStartResult?> startEmailOtp(String email) async {
    state = state.copyWith(busy: true, clearMessages: true);
    try {
      final result = await _repository.startEmailOtp(email.trim());
      final codeHint = result.debugCode == null
          ? ''
          : ' Код для тесту: ${result.debugCode}.';
      state = state.copyWith(
        busy: false,
        notice: 'Якщо адреса коректна, код надіслано на пошту.$codeHint',
      );
      return result;
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
      return null;
    }
  }

  Future<void> verifyEmailOtp({
    required String email,
    required String code,
  }) async {
    state = state.copyWith(busy: true, clearMessages: true);
    try {
      final user = await _repository.verifyEmailOtp(
        email: email.trim(),
        code: code,
        deviceLabel: 'SYLORA client',
      );
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
    }
  }

  Future<void> completeOAuthSession() async {
    state = state.copyWith(busy: true, clearMessages: true);
    try {
      final user = await _repository.completeOAuthSession();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on Object catch (error) {
      state = AuthState.unauthenticated(error: messageFor(error));
      rethrow;
    }
  }

  Future<void> logout() async {
    await _runPushCallback(
      clearPushRegistration,
      operation: 'logout unregistration',
    );
    await _repository.logout();
    state = const AuthState.unauthenticated();
  }

  Future<void> logoutAll() async {
    await _runPushCallback(
      clearPushRegistration,
      operation: 'logout-all unregistration',
    );
    await _repository.logoutAll();
    state = const AuthState.unauthenticated();
  }

  Future<void> _runPushCallback(
    Future<void> Function()? callback, {
    required String operation,
  }) async {
    if (callback == null) {
      return;
    }
    try {
      await callback();
    } on Object catch (error) {
      debugPrint('Push $operation failed: $error');
    }
  }

  void expire() {
    state = const AuthState.unauthenticated(
      error: 'Сесію завершено. Увійдіть знову.',
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
  final detail = error.toString().trim();
  if (detail.isNotEmpty && detail != "Instance of '${error.runtimeType}'") {
    // Surface actionable platform failures (e.g. locked keyring) in local QA.
    if (detail.contains('Keyring') ||
        detail.contains('secure storage') ||
        detail.contains('libsecret')) {
      return 'Secure storage is unavailable on this device. $detail';
    }
  }
  return 'The request could not be completed.';
}

String? validateEmail(String? value) {
  final email = value?.trim() ?? '';
  if (email.isEmpty) {
    return 'Вкажіть електронну пошту.';
  }
  if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
    return 'Вкажіть коректну електронну пошту.';
  }
  return null;
}

String? validatePassword(String? value, {bool registration = false}) {
  final password = value ?? '';
  if (password.isEmpty) {
    return 'Вкажіть пароль.';
  }
  if (registration && password.length < 12) {
    return 'Використайте щонайменше 12 символів.';
  }
  return null;
}

String? validatePhone(String? value) {
  final phone = value?.trim() ?? '';
  if (phone.isEmpty) {
    return 'Вкажіть номер телефону.';
  }
  if (phone.replaceAll(RegExp(r'[\s\-()]'), '').length < 8) {
    return 'Вкажіть коректний номер телефону.';
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

final pushServiceProvider = StateNotifierProvider<PushService, bool>(
  (ref) => PushService(
    client: ApiPushRegistrationClient(ref.watch(apiClientProvider)),
    tokenProvider: ref.watch(pushTokenProviderProvider),
  ),
);

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    final controller = AuthController(
      ref.watch(authRepositoryProvider),
      syncPushRegistration: () =>
          ref.read(pushServiceProvider.notifier).syncEnabledRegistration(),
      clearPushRegistration: () =>
          ref.read(pushServiceProvider.notifier).clearRegistrationOnLogout(),
    );
    ref.watch(apiClientProvider).onSessionExpired = controller.expire;
    return controller;
  },
);
