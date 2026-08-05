import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/models.dart';
import 'package:sylora/features/auth/auth.dart';

void main() {
  test(
    'auth controller transitions through restore, MFA, and authenticated',
    () async {
      final repository = _FakeAuthRepository();
      final controller = AuthController(repository, autoRestore: false);

      await controller.restore();
      expect(controller.state.status, AuthStatus.unauthenticated);

      await controller.login(
        email: 'person@example.test',
        password: 'correct horse battery staple',
      );
      expect(controller.state.status, AuthStatus.mfaRequired);
      expect(controller.state.challengeToken, 'challenge-token');

      await controller.verifyMfa('123456');
      expect(controller.state.status, AuthStatus.authenticated);
      expect(controller.state.user?.email, 'person@example.test');
    },
  );

  test('auth controller exposes API detail without changing it', () async {
    final repository = _FakeAuthRepository(loginFails: true);
    final controller = AuthController(repository, autoRestore: false);
    await controller.restore();
    await controller.login(email: 'person@example.test', password: 'incorrect');
    expect(controller.state.status, AuthStatus.unauthenticated);
    expect(controller.state.error, 'Credentials were rejected.');
  });

  test('auth controller syncs push after restoring a session', () async {
    var syncCalls = 0;
    final repository = _FakeAuthRepository(
      restoredUser: _FakeAuthRepository.user,
    );
    final controller = AuthController(
      repository,
      autoRestore: false,
      syncPushRegistration: () async {
        syncCalls += 1;
      },
    );

    await controller.restore();

    expect(controller.state.status, AuthStatus.authenticated);
    expect(syncCalls, 1);
  });

  test(
    'logout methods clear push best-effort before ending sessions',
    () async {
      var clearCalls = 0;
      final repository = _FakeAuthRepository();
      final controller = AuthController(
        repository,
        autoRestore: false,
        clearPushRegistration: () async {
          clearCalls += 1;
          throw StateError('offline');
        },
      );

      await controller.logout();
      await controller.logoutAll();

      expect(clearCalls, 2);
      expect(repository.logoutCalls, 1);
      expect(repository.logoutAllCalls, 1);
      expect(controller.state.status, AuthStatus.unauthenticated);
    },
  );
}

final class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.loginFails = false, this.restoredUser});

  final bool loginFails;
  final UserAccount? restoredUser;
  int logoutCalls = 0;
  int logoutAllCalls = 0;

  static const user = UserAccount(
    id: 'user-id',
    email: 'person@example.test',
    status: 'active',
    roles: <String>['user'],
  );

  @override
  Future<AuthMethods> authMethods() async => const AuthMethods(
    phone: false,
    email: true,
    tiktok: false,
    facebook: false,
    google: false,
    apple: false,
  );

  @override
  Future<UserAccount?> restore() async => restoredUser;

  @override
  Future<UserAccount> currentUser() async => restoredUser ?? user;

  @override
  Future<LoginResult> login({
    required String email,
    required String password,
    required String deviceLabel,
  }) async {
    if (loginFails) {
      throw const ApiProblem(
        status: 401,
        code: 'invalid_credentials',
        title: 'Sign-in failed',
        detail: 'Credentials were rejected.',
      );
    }
    return const LoginResult.mfa('challenge-token');
  }

  @override
  Future<UserAccount> verifyMfa({
    required String challengeToken,
    required String code,
    required String deviceLabel,
  }) async => user;

  @override
  Future<OtpStartResult> startPhoneOtp(String phone) async =>
      const OtpStartResult();

  @override
  Future<UserAccount> verifyPhoneOtp({
    required String phone,
    required String code,
    required String deviceLabel,
  }) async => user;

  @override
  Future<OtpStartResult> startEmailOtp(String email) async =>
      const OtpStartResult();

  @override
  Future<UserAccount> verifyEmailOtp({
    required String email,
    required String code,
    required String deviceLabel,
  }) async => user;

  @override
  Future<UserAccount> completeOAuthSession() async => user;

  @override
  Future<List<String>> confirmTotp(String code) async => <String>[];

  @override
  Future<void> consumeEmailVerification(String token) async {}

  @override
  Future<void> consumePasswordReset(String token, String password) async {}

  @override
  Future<void> disableTotp({required String code, String? password}) async {}

  @override
  Future<void> logout() async {
    logoutCalls += 1;
  }

  @override
  Future<void> logoutAll() async {
    logoutAllCalls += 1;
  }

  @override
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  }) async => const RegisterResult(status: 'registered_verified');

  @override
  Future<DeliveryHint> requestEmailVerification(String email) async =>
      const DeliveryHint();

  @override
  Future<DeliveryHint> requestPasswordReset(String email) async =>
      const DeliveryHint();

  @override
  Future<void> revokeSession(String id) async {}

  @override
  Future<List<SessionModel>> sessions() async => <SessionModel>[];

  @override
  Future<JsonObject> setupTotp() async => <String, dynamic>{};
}
