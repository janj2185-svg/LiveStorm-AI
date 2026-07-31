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
}

final class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.loginFails = false});

  final bool loginFails;

  static const user = UserAccount(
    id: 'user-id',
    email: 'person@example.test',
    status: 'active',
    roles: <String>['user'],
  );

  @override
  Future<UserAccount?> restore() async => null;

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
  Future<List<String>> confirmTotp(String code) async => <String>[];

  @override
  Future<void> consumeEmailVerification(String token) async {}

  @override
  Future<void> consumePasswordReset(String token, String password) async {}

  @override
  Future<void> disableTotp({required String code, String? password}) async {}

  @override
  Future<void> logout() async {}

  @override
  Future<void> logoutAll() async {}

  @override
  Future<void> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  }) async {}

  @override
  Future<void> requestEmailVerification(String email) async {}

  @override
  Future<void> requestPasswordReset(String email) async {}

  @override
  Future<void> revokeSession(String id) async {}

  @override
  Future<List<SessionModel>> sessions() async => <SessionModel>[];

  @override
  Future<JsonObject> setupTotp() async => <String, dynamic>{};
}
