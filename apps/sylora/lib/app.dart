import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/lumen_theme.dart';
import 'core/lumen_widgets.dart';
import 'features/auth/auth.dart';
import 'features/auth/auth_screens.dart';
import 'features/platform/platform_screens.dart';
import 'features/settings/settings_screen.dart';
import 'features/social/social_screens.dart';

const _destinations = <ShellDestination>[
  ShellDestination(
    label: 'Home',
    icon: Icons.home_outlined,
    selectedIcon: Icons.home_rounded,
    path: '/home',
  ),
  ShellDestination(
    label: 'Search',
    icon: Icons.search_outlined,
    selectedIcon: Icons.search_rounded,
    path: '/search',
  ),
  ShellDestination(
    label: 'Messages',
    icon: Icons.chat_bubble_outline_rounded,
    selectedIcon: Icons.chat_bubble_rounded,
    path: '/messages',
  ),
  ShellDestination(
    label: 'Wallet',
    icon: Icons.account_balance_wallet_outlined,
    selectedIcon: Icons.account_balance_wallet_rounded,
    path: '/wallet',
  ),
  ShellDestination(
    label: 'Gifts',
    icon: Icons.card_giftcard_outlined,
    selectedIcon: Icons.card_giftcard_rounded,
    path: '/gifts',
  ),
  ShellDestination(
    label: 'AI',
    icon: Icons.auto_awesome_outlined,
    selectedIcon: Icons.auto_awesome_rounded,
    path: '/ai',
  ),
  ShellDestination(
    label: 'Live',
    icon: Icons.sensors_outlined,
    selectedIcon: Icons.sensors_rounded,
    path: '/live',
  ),
  ShellDestination(
    label: 'Settings',
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings_rounded,
    path: '/settings',
  ),
];

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final reducedMotion = ref.watch(
    visualSettingsProvider.select((value) => value.reducedMotion),
  );
  return GoRouter(
    initialLocation: '/welcome',
    routes: <RouteBase>[
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const _SplashScreen(),
      ),
      GoRoute(
        path: '/welcome',
        name: 'welcome',
        pageBuilder: (context, state) =>
            _page(state, const WelcomeScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/auth',
        name: 'auth',
        pageBuilder: (context, state) =>
            _page(state, const AuthScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/mfa',
        name: 'mfa',
        pageBuilder: (context, state) =>
            _page(state, const MfaScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/verify-email',
        name: 'email-verification',
        pageBuilder: (context, state) => _page(
          state,
          AuthUtilityScreen(
            mode: AuthUtilityMode.emailVerification,
            initialToken: state.uri.queryParameters['token'],
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/reset-password',
        name: 'password-reset',
        pageBuilder: (context, state) => _page(
          state,
          AuthUtilityScreen(
            mode: AuthUtilityMode.passwordReset,
            initialToken: state.uri.queryParameters['token'],
          ),
          reducedMotion,
        ),
      ),
      ShellRoute(
        builder: (context, state, child) {
          final index = _destinationIndex(state.uri.path);
          return LumenResponsiveShell(
            destinations: _destinations,
            selectedIndex: index,
            onDestinationSelected: (value) =>
                context.go(_destinations[value].path),
            contextPanel: index == 0 ? const RecommendationsPanel() : null,
            body: child,
          );
        },
        routes: <RouteBase>[
          GoRoute(
            path: '/home',
            name: 'home',
            pageBuilder: (context, state) =>
                _page(state, const FeedScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/search',
            name: 'search',
            pageBuilder: (context, state) =>
                _page(state, const SearchScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/messages',
            name: 'messages',
            pageBuilder: (context, state) =>
                _page(state, const ConversationsScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/wallet',
            name: 'wallet',
            pageBuilder: (context, state) =>
                _page(state, const WalletScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/gifts',
            name: 'gifts',
            pageBuilder: (context, state) =>
                _page(state, const GiftsScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/ai',
            name: 'ai',
            pageBuilder: (context, state) =>
                _page(state, const AiScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/live',
            name: 'live',
            pageBuilder: (context, state) =>
                _page(state, const LiveScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/settings',
            name: 'settings',
            pageBuilder: (context, state) =>
                _page(state, const SettingsScreen(), reducedMotion),
          ),
        ],
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        pageBuilder: (context, state) =>
            _page(state, const NotificationsScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/u/:handle',
        name: 'public-profile',
        pageBuilder: (context, state) => _page(
          state,
          PublicProfileScreen(handle: state.pathParameters['handle']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/communities/:slug',
        name: 'community',
        pageBuilder: (context, state) => _page(
          state,
          CommunityScreen(slug: state.pathParameters['slug']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/posts/:id',
        name: 'post',
        pageBuilder: (context, state) => _page(
          state,
          PostDetailScreen(postId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/messages/:id',
        name: 'conversation',
        pageBuilder: (context, state) => _page(
          state,
          ConversationScreen(conversationId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/gifts/:slug',
        name: 'gift-detail',
        pageBuilder: (context, state) => _page(
          state,
          GiftDetailScreen(slug: state.pathParameters['slug']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/gift-authoring',
        name: 'gift-authoring',
        pageBuilder: (context, state) =>
            _page(state, const GiftAuthoringScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/ai/conversations/:id',
        name: 'ai-conversation',
        pageBuilder: (context, state) => _page(
          state,
          AiConversationScreen(conversationId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/ai/memory',
        name: 'ai-memory',
        pageBuilder: (context, state) =>
            _page(state, const AiMemoryScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/ai/jobs',
        name: 'ai-jobs',
        pageBuilder: (context, state) =>
            _page(state, const AiJobsScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/live/:id',
        name: 'live-session',
        pageBuilder: (context, state) => _page(
          state,
          LiveSessionScreen(sessionId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/settings/sessions',
        name: 'sessions',
        pageBuilder: (context, state) =>
            _page(state, const SessionsScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/settings/totp',
        name: 'totp',
        pageBuilder: (context, state) =>
            _page(state, const TotpScreen(), reducedMotion),
      ),
    ],
    redirect: (context, state) {
      final location = state.uri.path;
      final public = <String>{
        '/welcome',
        '/auth',
        '/verify-email',
        '/reset-password',
      }.contains(location);
      return switch (auth.status) {
        AuthStatus.checking => location == '/splash' ? null : '/splash',
        AuthStatus.mfaRequired => location == '/mfa' ? null : '/mfa',
        AuthStatus.unauthenticated => public ? null : '/welcome',
        AuthStatus.authenticated =>
          public || location == '/mfa' || location == '/splash'
              ? '/home'
              : null,
      };
    },
  );
});

Page<void> _page(GoRouterState state, Widget child, bool reducedMotion) {
  if (reducedMotion) {
    return NoTransitionPage<void>(key: state.pageKey, child: child);
  }
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) =>
        FadeTransition(
          opacity: CurvedAnimation(
            parent: animation,
            curve: const Cubic(0.16, 1, 0.3, 1),
          ),
          child: child,
        ),
    transitionDuration: const Duration(milliseconds: 200),
    reverseTransitionDuration: const Duration(milliseconds: 140),
  );
}

int _destinationIndex(String path) {
  final index = _destinations.indexWhere(
    (destination) => path == destination.path,
  );
  return index < 0 ? 0 : index;
}

final class SyloraApp extends ConsumerWidget {
  const SyloraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visual = ref.watch(visualSettingsProvider);
    final router = ref.watch(routerProvider);
    final mode = switch (visual.themeMode) {
      LumenThemeMode.system => ThemeMode.system,
      LumenThemeMode.light => ThemeMode.light,
      LumenThemeMode.dark => ThemeMode.dark,
    };
    return MaterialApp.router(
      title: 'SYLORA',
      debugShowCheckedModeBanner: false,
      themeMode: mode,
      theme: LumenTheme.light(highContrast: visual.highContrast),
      darkTheme: LumenTheme.dark(highContrast: visual.highContrast),
      routerConfig: router,
      builder: (context, child) {
        final media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: TextScaler.linear(visual.textScale),
            disableAnimations: visual.reducedMotion,
            highContrast: visual.highContrast,
          ),
          child: child!,
        );
      },
    );
  }
}

final class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          SyloraLogo(size: 72),
          SizedBox(height: 20),
          CircularProgressIndicator(),
        ],
      ),
    ),
  );
}
