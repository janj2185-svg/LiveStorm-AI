import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/locale_controller.dart';
import 'core/lumen_theme.dart';
import 'core/lumen_widgets.dart';
import 'design/sylora.dart';
import 'features/admin/admin_screens.dart';
import 'features/auth/auth.dart';
import 'features/auth/auth_screens.dart';
import 'features/business/business_screens.dart';
import 'features/conferences/conference_screens.dart';
import 'features/creator/creator_screens.dart';
import 'features/creator_studio/creator_studio_screen.dart';
import 'features/landing/landing_experience.dart';
import 'features/learning/learning_screens.dart';
import 'features/marketplace/marketplace_screens.dart';
import 'features/more/more_screen.dart';
import 'features/platform/platform_screens.dart';
import 'features/settings/settings_screen.dart';
import 'features/social/social_screens.dart';
import 'l10n/generated/app_localizations.dart';

const _homeDestination = ShellDestination(
  label: 'Home',
  icon: Icons.home_outlined,
  selectedIcon: Icons.home_rounded,
  path: '/home',
);
const _searchDestination = ShellDestination(
  label: 'Search',
  icon: Icons.search_outlined,
  selectedIcon: Icons.search_rounded,
  path: '/search',
);
const _friendsDestination = ShellDestination(
  label: 'Friends',
  icon: Icons.group_outlined,
  selectedIcon: Icons.group_rounded,
  path: '/friends',
);
const _messagesDestination = ShellDestination(
  label: 'Messages',
  icon: Icons.chat_bubble_outline_rounded,
  selectedIcon: Icons.chat_bubble_rounded,
  path: '/messages',
);
const _marketplaceDestination = ShellDestination(
  label: 'Market',
  icon: Icons.storefront_outlined,
  selectedIcon: Icons.storefront_rounded,
  path: '/marketplace',
);
const _creatorDestination = ShellDestination(
  label: 'Creator',
  icon: Icons.edit_note_outlined,
  selectedIcon: Icons.edit_note_rounded,
  path: '/creator',
);
const _businessDestination = ShellDestination(
  label: 'Workspace',
  icon: Icons.business_outlined,
  selectedIcon: Icons.business_rounded,
  path: '/business',
);
const _adminDestination = ShellDestination(
  label: 'Admin',
  icon: Icons.admin_panel_settings_outlined,
  selectedIcon: Icons.admin_panel_settings_rounded,
  path: '/admin',
);
const _moreDestination = ShellDestination(
  label: 'More',
  icon: Icons.apps_outlined,
  selectedIcon: Icons.apps_rounded,
  path: '/more',
);

const _compactDestinations = <ShellDestination>[
  _homeDestination,
  _searchDestination,
  _friendsDestination,
  _messagesDestination,
  _marketplaceDestination,
  _moreDestination,
];

List<ShellDestination> shellDestinationsForRoles(Iterable<String> roles) {
  final roleSet = roles.toSet();
  return <ShellDestination>[
    _homeDestination,
    _searchDestination,
    _friendsDestination,
    _messagesDestination,
    _marketplaceDestination,
    if (roleSet.contains('creator') || roleSet.contains('admin'))
      _creatorDestination,
    if (roleSet.contains('business') || roleSet.contains('admin'))
      _businessDestination,
    if (roleSet.contains('admin')) _adminDestination,
    _moreDestination,
  ];
}

bool canAccessRoleRoute(Iterable<String> roles, String path) {
  final roleSet = roles.toSet();
  if (path == '/marketplace/seller') {
    return roleSet.contains('creator') || roleSet.contains('admin');
  }
  if (path == '/creator' ||
      path.startsWith('/creator/') ||
      path == '/creator-studio' ||
      path.startsWith('/creator-studio/')) {
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
  // Rebuild only when auth gate / role shell must change — not on busy/notice/error,
  // otherwise AuthScreen remounts and OTP/register panes snap back to the chooser.
  final authView = ref.watch(
    authControllerProvider.select(
      (state) => (
        status: state.status,
        userId: state.user?.id,
        roles: state.user?.roles ?? const <String>[],
      ),
    ),
  );
  final roles = authView.roles;
  final destinations = shellDestinationsForRoles(roles);
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
            _page(state, const LandingExperience(), reducedMotion),
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
        path: '/auth/oauth/complete',
        name: 'oauth-complete',
        pageBuilder: (context, state) =>
            _page(state, const OAuthCompleteScreen(), reducedMotion),
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
          final index = _destinationIndex(state.uri.path, destinations);
          final compactIndex = _destinationIndex(
            state.uri.path,
            _compactDestinations,
          );
          final localizedDestinations = _localizedDestinations(
            context,
            destinations,
          );
          final localizedCompactDestinations = _localizedDestinations(
            context,
            _compactDestinations,
          );
          return LumenResponsiveShell(
            destinations: localizedDestinations,
            selectedIndex: index,
            onDestinationSelected: (value) =>
                context.go(localizedDestinations[value].path),
            compactDestinations: localizedCompactDestinations,
            compactSelectedIndex: compactIndex,
            onCompactDestinationSelected: (value) =>
                context.go(localizedCompactDestinations[value].path),
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
            path: '/friends',
            name: 'friends',
            pageBuilder: (context, state) =>
                _page(state, const FriendsScreen(), reducedMotion),
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
            path: '/creator-studio',
            name: 'creator-studio',
            pageBuilder: (context, state) =>
                _page(state, const CreatorStudioScreen(), reducedMotion),
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
            path: '/conferences',
            name: 'conferences',
            pageBuilder: (context, state) =>
                _page(state, const ConferencesScreen(), reducedMotion),
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
        path: '/conferences/:id',
        name: 'conference-room',
        pageBuilder: (context, state) => _page(
          state,
          ConferenceRoomScreen(conferenceId: state.pathParameters['id']!),
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
        '/auth/oauth/complete',
        '/verify-email',
        '/reset-password',
      }.contains(location);
      return switch (authView.status) {
        AuthStatus.checking => location == '/splash' ? null : '/splash',
        AuthStatus.mfaRequired => location == '/mfa' ? null : '/mfa',
        AuthStatus.unauthenticated => public ? null : '/welcome',
        AuthStatus.authenticated =>
          public || location == '/mfa' || location == '/splash'
              ? '/home'
              : canAccessRoleRoute(roles, location)
              ? null
              : '/more',
      };
    },
  );
});

Page<void> _page(GoRouterState state, Widget child, bool reducedMotion) {
  return SyloraMotion.worldPage(
    key: state.pageKey,
    child: child,
    reducedMotion: reducedMotion,
  );
}

int _destinationIndex(String path, List<ShellDestination> destinations) {
  var index = destinations.indexWhere(
    (destination) =>
        path == destination.path || path.startsWith('${destination.path}/'),
  );
  if (index < 0) {
    index = destinations.indexWhere(
      (destination) => destination.path == '/more',
    );
  }
  return index < 0 ? 0 : index;
}

List<ShellDestination> _localizedDestinations(
  BuildContext context,
  List<ShellDestination> destinations,
) {
  final l10n = AppLocalizations.of(context);
  return <ShellDestination>[
    for (final destination in destinations)
      ShellDestination(
        label: _localizedDestinationLabel(l10n, destination.path),
        icon: destination.icon,
        selectedIcon: destination.selectedIcon,
        path: destination.path,
      ),
  ];
}

String _localizedDestinationLabel(AppLocalizations l10n, String path) =>
    switch (path) {
      '/home' => l10n.navHome,
      '/search' => l10n.navSearch,
      '/friends' => l10n.navFriends,
      '/messages' => l10n.navMessages,
      '/marketplace' => l10n.navMarket,
      '/creator' => l10n.navCreator,
      '/business' => l10n.navWorkspace,
      '/admin' => l10n.navAdmin,
      '/more' => l10n.navMore,
      _ => l10n.navMore,
    };

final class SyloraApp extends ConsumerWidget {
  const SyloraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visual = ref.watch(visualSettingsProvider);
    final locale = ref.watch(localeControllerProvider);
    final router = ref.watch(routerProvider);
    final mode = switch (visual.themeMode) {
      LumenThemeMode.system => ThemeMode.system,
      LumenThemeMode.light => ThemeMode.light,
      LumenThemeMode.dark => ThemeMode.dark,
    };
    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      debugShowCheckedModeBanner: false,
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: SyloraLocales.supported,
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
