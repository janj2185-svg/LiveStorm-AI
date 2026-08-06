import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/core/models.dart';
import 'package:sylora/features/auth/auth.dart';
import 'package:sylora/features/learning/learning_repository.dart';
import 'package:sylora/features/learning/learning_screens.dart';
import 'package:sylora/features/marketplace/marketplace_repository.dart';
import 'package:sylora/features/marketplace/marketplace_screens.dart';
import 'package:sylora/features/more/more_screen.dart';

void main() {
  testWidgets('More navigation exposes workspaces only for matching roles', (
    tester,
  ) async {
    final adminController = AuthController(
      _RoleAuthRepository(const <String>['admin']),
      autoRestore: false,
    );
    await adminController.login(
      email: 'admin@example.test',
      password: 'password',
    );
    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: <Override>[
          authControllerProvider.overrideWith((ref) => adminController),
        ],
        child: _material(const MoreScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Creator Studio'), findsOneWidget);
    expect(find.text('Business'), findsOneWidget);
    expect(find.text('Administration'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
    final userController = AuthController(
      _RoleAuthRepository(const <String>['user']),
      autoRestore: false,
    );
    await userController.login(
      email: 'user@example.test',
      password: 'password',
    );
    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: <Override>[
          authControllerProvider.overrideWith((ref) => userController),
        ],
        child: _material(const MoreScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Creator Studio'), findsNothing);
    expect(find.text('Business'), findsNothing);
    expect(find.text('Administration'), findsNothing);
    expect(find.text('Learning'), findsOneWidget);
  });

  testWidgets('marketplace checkout surfaces provider unavailable exactly', (
    tester,
  ) async {
    const cart = MarketplaceCart(
      id: 'cart-id',
      items: <MarketplaceCartItem>[
        MarketplaceCartItem(
          id: 'item-id',
          productId: 'product-id',
          productVersionId: 'version-id',
          quantity: 1,
          unitPriceMinor: 100,
          currency: 'SYLORA_CREDIT',
          settlementMethod: 'credits',
          title: 'API product',
        ),
      ],
      subtotalMinor: 100,
      currency: 'SYLORA_CREDIT',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          marketplaceRepositoryProvider.overrideWithValue(
            _UnavailableMarketplaceRepository(),
          ),
        ],
        child: _material(MarketplaceCartView(cart: cart, onChanged: () {})),
      ),
    );

    await tester.tap(find.text('Checkout with credits'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Payment provider unavailable'), findsOneWidget);
    expect(
      find.textContaining('No payment provider is configured.'),
      findsOneWidget,
    );
  });

  testWidgets('learning catalog renders an honest API empty state', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          learningRepositoryProvider.overrideWithValue(
            _EmptyLearningRepository(),
          ),
        ],
        child: _material(const LearningScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No published courses'), findsOneWidget);
    expect(
      find.text('The learning catalog returned no courses for these filters.'),
      findsOneWidget,
    );
  });

  testWidgets('certificate verification validates before calling API', (
    tester,
  ) async {
    final repository = _EmptyLearningRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          learningRepositoryProvider.overrideWithValue(repository),
        ],
        child: _material(const CertificateVerificationView()),
      ),
    );

    await tester.tap(find.text('Verify'));
    await tester.pump();

    expect(find.text('Enter a verification code.'), findsOneWidget);
    expect(repository.verificationCalls, 0);
  });
}

Widget _material(Widget home) => MaterialApp(
  theme: LumenTheme.light(),
  home: MediaQuery(
    data: const MediaQueryData(disableAnimations: true),
    child: Scaffold(body: home),
  ),
);

final class _RoleAuthRepository implements AuthRepository {
  const _RoleAuthRepository(this.roles);

  final List<String> roles;

  @override
  Future<LoginResult> login({
    required String email,
    required String password,
    required String deviceLabel,
  }) async => LoginResult.authenticated(
    UserAccount(id: 'user-id', email: email, status: 'active', roles: roles),
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _UnavailableMarketplaceRepository implements MarketplaceRepository {
  @override
  Future<MarketplaceOrder> checkout({
    required String settlementMethod,
    String? returnUrl,
  }) {
    throw const ApiProblem(
      status: 503,
      code: 'payment_provider_unavailable',
      title: 'Payment provider unavailable',
      detail: 'No payment provider is configured.',
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _EmptyLearningRepository implements LearningRepository {
  int verificationCalls = 0;

  @override
  Future<CursorPage<Course>> courses({
    String? search,
    String? category,
    String? cursor,
  }) async => const CursorPage<Course>(items: <Course>[], nextCursor: null);

  @override
  Future<CursorPage<Enrollment>> enrollments({String? cursor}) async =>
      const CursorPage<Enrollment>(items: <Enrollment>[], nextCursor: null);

  @override
  Future<CertificateVerification> verifyCertificate(String code) async {
    verificationCalls += 1;
    throw StateError('Validation should prevent this call.');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
