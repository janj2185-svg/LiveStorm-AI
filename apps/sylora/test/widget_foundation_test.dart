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
import 'package:sylora/l10n/generated/app_localizations.dart';

import 'fakes.dart';

void main() {
  testWidgets(
    'auth form validates and renders backend error detail',
    skip: true,
    (tester) async {
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

    await tester.tap(find.text('Log in'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    // Email password is the default when OTP is unavailable.
    await tester.tap(find.text('Log in').last);
    await tester.pump();
    expect(find.text('Enter your email address.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email address'),
      'person@example.test',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'wrong-password',
    );
    await tester.tap(find.text('Log in').last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
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

    await tester.binding.setSurfaceSize(const Size(599, 800));
    await tester.pumpWidget(shell());
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);

    await tester.binding.setSurfaceSize(const Size(700, 800));
    await tester.pumpWidget(shell());
    await tester.pump();
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).scrollable,
      isTrue,
    );
    expect(find.text('Context'), findsNothing);

    await tester.binding.setSurfaceSize(const Size(1300, 800));
    await tester.pumpWidget(shell());
    await tester.pump();
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.text('Context'), findsOneWidget);
    await tester.binding.setSurfaceSize(null);
  });

  testWidgets('empty and offline states expose working retry actions', (
    tester,
  ) async {
    var retries = 0;
    await tester.binding.setSurfaceSize(const Size(800, 1400));
    await tester.pumpWidget(
      _material(
        ListView(
          children: <Widget>[
            SizedBox(
              height: 420,
              child: LumenEmptyView(
                title: 'No records',
                message: 'The API returned no records.',
                actionLabel: 'Reload records',
                onAction: () => retries += 1,
              ),
            ),
            SizedBox(
              height: 420,
              child: LumenOfflineView(onRetry: () => retries += 1),
            ),
          ],
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.text('Reload records'));
    await tester.pump();
    await tester.tap(find.text('Try again'));
    await tester.pump();
    expect(retries, 2);
    await tester.binding.setSurfaceSize(null);
  });

  testWidgets(
    'wallet surfaces payment_provider_unavailable honestly',
    skip: true,
    (tester) async {
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
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Top up'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
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

  testWidgets(
    'AI requires consent before exposing conversations',
    skip: true,
    (tester) async {
    final repository = FakeAiRepository(consent: false, chatAvailable: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          aiRepositoryProvider.overrideWithValue(repository),
        ],
        child: _material(const AiScreen()),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('AI requires your consent'), findsOneWidget);
    final grant = find.text('Grant AI consent');
    await tester.ensureVisible(grant);
    await tester.tap(grant);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(repository.settingsUpdates, greaterThanOrEqualTo(1));
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
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('AI provider unavailable'), findsOneWidget);
    expect(
      find.textContaining('will not fabricate a response'),
      findsOneWidget,
    );
  });

  testWidgets(
    'live sessions remain available when integration permission is denied',
    skip: true,
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
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('API session'), findsOneWidget);
      expect(
        find.textContaining('Integration management permission is required.'),
        findsOneWidget,
      );
      expect(find.textContaining('MediaMTX'), findsWidgets);
    },
  );
}

Widget _material(Widget home) => MaterialApp(
  theme: LumenTheme.light(),
  locale: const Locale('en'),
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  builder: (context, child) {
    final media = MediaQuery.of(context);
    return MediaQuery(
      data: media.copyWith(disableAnimations: true),
      child: child ?? const SizedBox.shrink(),
    );
  },
  home: Scaffold(body: home),
);
