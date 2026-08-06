import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/aura_overlay.dart';
import 'core/l10n/sylora_localizations.dart';
import 'core/lumen_effects.dart';
import 'core/lumen_theme.dart';
import 'core/lumen_widgets.dart';
import 'core/shell_navigation.dart';
import 'features/admin/admin_screens.dart';
import 'features/auth/auth.dart';
import 'features/auth/auth_screens.dart';
import 'features/business/business_screens.dart';
import 'features/creator/analytics_screen.dart';
import 'features/creator/creator_screens.dart';
import 'features/learning/learning_screens.dart';
import 'features/marketplace/marketplace_screens.dart';
import 'features/more/more_screen.dart';
import 'features/music/music_screen.dart';
import 'features/platform/platform_screens.dart';
import 'features/profile/profile_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/social/friends_screen.dart';
import 'features/social/social_screens.dart';


bool canAccessRoleRoute(Iterable<String> roles, String path) {
  final roleSet = roles.toSet();
  if (path == '/analytics' || path.startsWith('/analytics/')) {
    return true;
  }
  if (path == '/friends' || path.startsWith('/friends/')) {
    return true;
  }
  if (path == '/music' || path.startsWith('/music/')) {
    return true;
  }
  if (path == '/profile' || path.startsWith('/profile/')) {
    return true;
  }
  if (path == '/marketplace/seller') {
    return roleSet.contains('creator') || roleSet.contains('admin');
  }
  if (path == '/creator' || path.startsWith('/creator/')) {
    return roleSet.contains('creator') || roleSet.contains('admin');
  }
  if (path == '/business' || path.startsWith('/business/')) {
    return roleSet.contains('business') || roleSet.contains('admin');
  }
  if (path == '/admin' || path.startsWith('/admin/')) {
    return roleSet.contains('admin');
  }
  return true;
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final roles = auth.user?.roles ?? const <String>[];
  final navItems = navItemsForRoles(roles);
  final primaryItems = primaryNavItemsForRoles(roles);
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
        pageBuilder: (context, state) => _page(
          state,
          AuthScreen(
            initialCreateAccount: state.uri.queryParameters['create'] == '1',
          ),
          reducedMotion,
        ),
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
          final index = navIndexForPath(state.uri.path, navItems);
          final primaryIndex = navIndexForPath(state.uri.path, primaryItems);
          return AuraOverlay(
            child: LumenResponsiveShell(
              navItems: navItems,
              selectedIndex: index,
              onDestinationSelected: (value) =>
                  context.goNamed(navItems[value].routeName),
              primaryItems: primaryItems,
              primarySelectedIndex: primaryIndex,
              onPrimaryDestinationSelected: (value) =>
                  context.goNamed(primaryItems[value].routeName),
              contextPanel: index == 0 ? const RecommendationsPanel() : null,
              body: child,
            ),
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
            path: '/marketplace',
            name: 'marketplace',
            pageBuilder: (context, state) =>
                _page(state, const MarketplaceScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/learning',
            name: 'learning',
            pageBuilder: (context, state) =>
                _page(state, const LearningScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/creator',
            name: 'creator',
            pageBuilder: (context, state) =>
                _page(state, const CreatorScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/business',
            name: 'business',
            pageBuilder: (context, state) =>
                _page(state, const BusinessScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/admin',
            name: 'admin',
            pageBuilder: (context, state) =>
                _page(state, const AdminScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/more',
            name: 'more',
            pageBuilder: (context, state) =>
                _page(state, const MoreScreen(), reducedMotion),
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
            path: '/friends',
            name: 'friends',
            pageBuilder: (context, state) =>
                _page(state, const FriendsScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/music',
            name: 'music',
            pageBuilder: (context, state) =>
                _page(state, const MusicScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/analytics',
            name: 'analytics',
            pageBuilder: (context, state) =>
                _page(state, const AnalyticsScreen(), reducedMotion),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            pageBuilder: (context, state) =>
                _page(state, const ProfileScreen(), reducedMotion),
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
        path: '/creator/content/:id',
        name: 'creator-content',
        pageBuilder: (context, state) => _page(
          state,
          CreatorContentScreen(contentId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/marketplace/products/:id',
        name: 'marketplace-product',
        pageBuilder: (context, state) => _page(
          state,
          MarketplaceProductScreen(productId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/marketplace/orders/:id',
        name: 'marketplace-order',
        pageBuilder: (context, state) => _page(
          state,
          MarketplaceOrderScreen(orderId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/marketplace/seller',
        name: 'marketplace-seller',
        pageBuilder: (context, state) =>
            _page(state, const MarketplaceSellerScreen(), reducedMotion),
      ),
      GoRoute(
        path: '/marketplace/bookings/:id',
        name: 'marketplace-booking',
        pageBuilder: (context, state) => _page(
          state,
          MarketplaceBookingScreen(bookingId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/learning/courses/:id',
        name: 'learning-course',
        pageBuilder: (context, state) => _page(
          state,
          LearningCourseScreen(courseId: state.pathParameters['id']!),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/learning/enrollments/:id/courses/:courseId',
        name: 'learning-enrollment',
        pageBuilder: (context, state) => _page(
          state,
          LearningEnrollmentScreen(
            enrollmentId: state.pathParameters['id']!,
            courseId: state.pathParameters['courseId']!,
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/learning/enrollments/:enrollmentId/lessons/:lessonId',
        name: 'learning-lesson',
        pageBuilder: (context, state) => _page(
          state,
          LearningLessonScreen(
            enrollmentId: state.pathParameters['enrollmentId']!,
            lessonId: state.pathParameters['lessonId']!,
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/learning/enrollments/:enrollmentId/quizzes/:quizId',
        name: 'learning-quiz',
        pageBuilder: (context, state) => _page(
          state,
          LearningQuizScreen(
            quizId: state.pathParameters['quizId']!,
            enrollmentId: state.pathParameters['enrollmentId']!,
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/business/workspaces/:workspaceId',
        name: 'business-workspace',
        pageBuilder: (context, state) => _page(
          state,
          BusinessWorkspaceScreen(
            workspaceId: state.pathParameters['workspaceId']!,
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/business/workspaces/:workspaceId/:area',
        name: 'business-area',
        pageBuilder: (context, state) => _page(
          state,
          BusinessAreaScreen(
            workspaceId: state.pathParameters['workspaceId']!,
            area: state.pathParameters['area']!,
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/business/workspaces/:workspaceId/documents/:documentId',
        name: 'business-document',
        pageBuilder: (context, state) => _page(
          state,
          BusinessDocumentScreen(
            workspaceId: state.pathParameters['workspaceId']!,
            documentId: state.pathParameters['documentId']!,
          ),
          reducedMotion,
        ),
      ),
      GoRoute(
        path: '/admin/users/:id',
        name: 'admin-user',
        pageBuilder: (context, state) => _page(
          state,
          AdminUserScreen(userId: state.pathParameters['id']!),
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
              : canAccessRoleRoute(roles, location)
              ? null
              : '/home',
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

final class SyloraApp extends ConsumerWidget {
  const SyloraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visual = ref.watch(visualSettingsProvider);
    final locale = ref.watch(localeProvider);
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
      locale: locale.flutterLocale,
      supportedLocales: SyloraLocale.values
          .map((value) => value.flutterLocale)
          .toList(growable: false),
      localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
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

final class _SplashScreen extends ConsumerWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reducedMotion = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    return Scaffold(
      body: LumenLivingBackground(
        reducedMotion: reducedMotion,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              AnimatedSyloraLogo(
                size: 88,
                intro: true,
                reducedMotion: reducedMotion,
              ),
              const SizedBox(height: 28),
              Text(
                'SYLORA',
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 20),
              const CircularProgressIndicator(),
            ],
          ),
        ),
      ),
    );
  }
}
