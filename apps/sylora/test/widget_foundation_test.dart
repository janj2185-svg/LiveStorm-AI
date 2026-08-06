import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/core/lumen_widgets.dart';
import 'package:sylora/core/models.dart';
import 'package:sylora/features/auth/auth.dart';
import 'package:sylora/features/auth/auth_screens.dart';
import 'package:sylora/features/platform/platform_screens.dart';
import 'package:sylora/features/platform/repositories.dart';

import 'fakes.dart';

void main() {
  testWidgets('auth form validates and renders backend error detail', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      loginError: const ApiProblem(
        status: 401,
        code: 'invalid_credentials',
        title: 'Sign-in failed',
        detail: 'The email or password is incorrect.',
      ),
    );
    final controller = AuthController(repository, autoRestore: false);
    await controller.restore();
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          authControllerProvider.overrideWith((ref) => controller),
        ],
        child: _material(const AuthScreen()),
      ),
    );

    await tester.tap(find.widgetWithText(ElevatedButton, 'Sign in'));
    await tester.pump();
    expect(find.text('Enter your email address.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'person@example.test',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'wrong-password',
    );
    await tester.tap(find.widgetWithText(ElevatedButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('The email or password is incorrect.'), findsOneWidget);
  });

  testWidgets('responsive shell switches bottom navigation to rail', (
    tester,
  ) async {
    const destinations = <ShellDestination>[
      ShellDestination(
        label: 'Home',
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        path: '/home',
      ),
      ShellDestination(
        label: 'Search',
        icon: Icons.search_outlined,
        selectedIcon: Icons.search,
        path: '/search',
      ),
    ];
    Widget shell() => _material(
      LumenResponsiveShell(
        destinations: destinations,
        selectedIndex: 0,
        onDestinationSelected: (_) {},
        body: const Text('Body'),
        contextPanel: const Text('Context'),
      ),
    );

    await tester.binding.setSurfaceSize(const Size(600, 800));
    await tester.pumpWidget(shell());
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);

    await tester.binding.setSurfaceSize(const Size(1300, 800));
    await tester.pumpWidget(shell());
    await tester.pump();
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.text('SYLORA'), findsOneWidget);
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Context'), findsOneWidget);
    await tester.binding.setSurfaceSize(null);
  });

  testWidgets('empty and offline states expose working retry actions', (
    tester,
  ) async {
    var retries = 0;
    await tester.pumpWidget(
      _material(
        Column(
          children: <Widget>[
            LumenEmptyView(
              title: 'No records',
              message: 'The API returned no records.',
              actionLabel: 'Reload records',
              onAction: () => retries += 1,
            ),
            LumenOfflineView(onRetry: () => retries += 1),
          ],
        ),
      ),
    );

    await tester.tap(find.text('Reload records'));
    await tester.tap(find.text('Try again'));
    expect(retries, 2);
  });

  testWidgets('wallet surfaces payment_provider_unavailable honestly', (
    tester,
  ) async {
    final repository = FakeWalletRepository(
      paymentError: const ApiProblem(
        status: 503,
        code: 'payment_provider_unavailable',
        title: 'Payment provider unavailable',
        detail: 'No payment provider is configured.',
      ),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          walletRepositoryProvider.overrideWithValue(repository),
        ],
        child: _material(const WalletScreen()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Top up'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Amount in minor units'),
      '1000',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Provider return URL'),
      'https://app.example.test/wallet',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Payment provider unavailable'), findsOneWidget);
    expect(
      find.textContaining('No payment provider is configured.'),
      findsOneWidget,
    );
    expect(find.textContaining('sandbox_topup.py'), findsOneWidget);
  });

  testWidgets('AI requires consent before exposing conversations', (
    tester,
  ) async {
    final repository = FakeAiRepository(consent: false, chatAvailable: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          aiRepositoryProvider.overrideWithValue(repository),
        ],
        child: _material(const AiScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('AI requires your consent'), findsOneWidget);
    await tester.tap(find.text('Grant AI consent'));
    await tester.pumpAndSettle();
    expect(repository.settingsUpdates, 1);
  });

  testWidgets('AI unavailable provider is a first-class state', (tester) async {
    final repository = FakeAiRepository(consent: true, chatAvailable: false);
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          aiRepositoryProvider.overrideWithValue(repository),
        ],
        child: _material(const AiScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('AI provider unavailable'), findsOneWidget);
    expect(
      find.textContaining('will not fabricate a response'),
      findsOneWidget,
    );
  });

  testWidgets(
    'live sessions remain available when integration permission is denied',
    (tester) async {
      const session = LiveSessionModel(
        id: 'session-id',
        title: 'API session',
        state: 'draft',
        ingestPath: 'live/session-id',
        ingestProvisioned: true,
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            liveProvider.overrideWith(
              (ref) async => const LiveSnapshot(
                sessions: <LiveSessionModel>[session],
                integrations: <NamedResource>[],
                integrationsError: ApiProblem(
                  status: 403,
                  code: 'permission_denied',
                  title: 'Permission denied',
                  detail: 'Integration management permission is required.',
                ),
              ),
            ),
          ],
          child: _material(const LiveScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('API session'), findsOneWidget);
      expect(
        find.textContaining('Integration management permission is required.'),
        findsOneWidget,
      );
      expect(
        find.textContaining(
          'Direct MediaMTX session controls remain available.',
        ),
        findsOneWidget,
      );
    },
  );
}

Widget _material(Widget home) => MaterialApp(
  theme: LumenTheme.light(),
  home: MediaQuery(
    data: const MediaQueryData(disableAnimations: true),
    child: Scaffold(body: home),
  ),
);
