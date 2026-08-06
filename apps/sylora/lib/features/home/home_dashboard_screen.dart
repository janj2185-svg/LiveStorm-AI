import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/l10n/sylora_localizations.dart';
import '../../core/lumen_effects.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import '../platform/platform_screens.dart';
import '../platform/repositories.dart';
import '../social/social_screens.dart';

final homeDashboardProvider = FutureProvider.autoDispose<_HomeDashboardData>((
  ref,
) async {
  final profile = await ref.watch(accountRepositoryProvider).profile();
  final feed = await ref.watch(socialRepositoryProvider).feed();
  LiveSnapshot? live;
  try {
    live = await ref.watch(liveProvider.future);
  } on Object {
    live = null;
  }
  return _HomeDashboardData(profile: profile, feed: feed, live: live);
});

@immutable
final class _HomeDashboardData {
  const _HomeDashboardData({
    required this.profile,
    required this.feed,
    this.live,
  });

  final ProfileModel profile;
  final CursorPage<PostModel> feed;
  final LiveSnapshot? live;
}

final class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final value = ref.watch(homeDashboardProvider);
    return LumenAsyncView<_HomeDashboardData>(
      value: value,
      onRetry: () => ref.invalidate(homeDashboardProvider),
      data: (data) => CustomScrollView(
        slivers: <Widget>[
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  _GreetingHeader(
                    locale: locale,
                    name: data.profile.displayName,
                  ),
                  const SizedBox(height: 20),
                  _AuraHeroCard(locale: locale),
                  const SizedBox(height: 24),
                  Text(
                    SyloraStrings.t(locale, 'home_modules'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  _ModuleGrid(locale: locale),
                  const SizedBox(height: 28),
                  _SectionHeader(
                    title: SyloraStrings.t(locale, 'popular_live'),
                    actionLabel: SyloraStrings.t(locale, 'see_all'),
                    onAction: () => context.goNamed('live'),
                  ),
                  const SizedBox(height: 12),
                  _PopularLiveRow(sessions: data.live?.sessions ?? const []),
                  const SizedBox(height: 28),
                  _SectionHeader(
                    title: SyloraStrings.t(locale, 'home_feed'),
                    actionLabel: SyloraStrings.t(locale, 'write_post'),
                    onAction: () => _showComposer(context, ref),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
          if (data.feed.items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: LumenEmptyView(
                title: SyloraStrings.t(locale, 'feed_empty_title'),
                message: SyloraStrings.t(locale, 'feed_empty_message'),
                actionLabel: SyloraStrings.t(locale, 'write_post'),
                onAction: () => _showComposer(context, ref),
                icon: Icons.auto_awesome_outlined,
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
              sliver: SliverList.separated(
                itemCount: data.feed.items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 14),
                itemBuilder: (context, index) =>
                    PostCard(post: data.feed.items[index]),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _showComposer(BuildContext context, WidgetRef ref) async {
    final body = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create a post'),
        content: TextField(
          controller: body,
          autofocus: true,
          minLines: 4,
          maxLines: 8,
          decoration: const InputDecoration(labelText: 'Plain-text post'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (body.text.trim().isEmpty) return;
              await ref
                  .read(socialRepositoryProvider)
                  .createPost(body.text.trim(), publish: true);
              if (dialogContext.mounted) Navigator.pop(dialogContext, true);
            },
            child: const Text('Publish'),
          ),
        ],
      ),
    );
    body.dispose();
    if (saved ?? false) {
      ref.invalidate(homeDashboardProvider);
      ref.invalidate(feedProvider);
    }
  }
}

final class _GreetingHeader extends StatelessWidget {
  const _GreetingHeader({required this.locale, required this.name});

  final SyloraLocale locale;
  final String name;

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              SyloraStrings.greeting(locale, name),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 4),
            Text(
              SyloraStrings.t(locale, 'home_subtitle'),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
      IconButton(
        tooltip: SyloraStrings.t(locale, 'notifications'),
        onPressed: () => context.pushNamed('notifications'),
        icon: const Icon(Icons.notifications_outlined),
      ),
    ],
  );
}

final class _AuraHeroCard extends StatelessWidget {
  const _AuraHeroCard({required this.locale});

  final SyloraLocale locale;

  @override
  Widget build(BuildContext context) => LumenVellum(
    padding: const EdgeInsets.all(20),
    child: Row(
      children: <Widget>[
        SizedBox(
          width: 72,
          height: 72,
          child: Stack(
            alignment: Alignment.center,
            children: <Widget>[
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: <Color>[Color(0xFF42C6D5), Color(0xFF9D8BE8)],
                  ),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: LumenColors.aether.withValues(alpha: 0.35),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              Positioned(
                right: 4,
                bottom: 4,
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    color: LumenColors.verdigris,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Text(
                    'Aura',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(width: 8),
                  LumenBadge(
                    label: SyloraStrings.t(locale, 'online'),
                    color: LumenColors.verdigris,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                SyloraStrings.t(locale, 'aura_home_hint'),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
        FilledButton.icon(
          onPressed: () => context.goNamed('ai'),
          icon: const Icon(Icons.mic_rounded, size: 18),
          label: Text(SyloraStrings.t(locale, 'talk')),
        ),
      ],
    ),
  );
}

final class _ModuleGrid extends StatelessWidget {
  const _ModuleGrid({required this.locale});

  final SyloraLocale locale;

  static const _modules = <_ModuleDef>[
    _ModuleDef('live', 'nav_live', Icons.sensors_rounded, Color(0xFFFF6B6B), Color(0xFFFF8E53)),
    _ModuleDef('ai', 'nav_aura', Icons.auto_awesome_rounded, Color(0xFF42C6D5), Color(0xFF9D8BE8)),
    _ModuleDef('friends', 'nav_friends', Icons.people_rounded, Color(0xFF6C55B8), Color(0xFFB93886)),
    _ModuleDef('marketplace', 'nav_market', Icons.storefront_rounded, Color(0xFF247B51), Color(0xFF42C6D5)),
    _ModuleDef('business', 'nav_business', Icons.business_rounded, Color(0xFF8A6512), Color(0xFFE8C96A)),
    _ModuleDef('learning', 'nav_learning', Icons.school_rounded, Color(0xFF087F91), Color(0xFF42C6D5)),
    _ModuleDef('music', 'nav_music', Icons.music_note_rounded, Color(0xFFB93886), Color(0xFF9D8BE8)),
    _ModuleDef('creator', 'nav_creator', Icons.movie_creation_rounded, Color(0xFF6C55B8), Color(0xFF42C6D5)),
  ];

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final crossAxisCount = constraints.maxWidth > 900 ? 4 : 2;
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.35,
        ),
        itemCount: _modules.length,
        itemBuilder: (context, index) {
          final module = _modules[index];
          return LumenRipple(
            onTap: () => context.goNamed(module.route),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: <Color>[module.from, module.to],
                ),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: module.from.withValues(alpha: 0.25),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Stack(
                children: <Widget>[
                  Positioned(
                    right: -8,
                    bottom: -8,
                    child: Icon(
                      module.icon,
                      size: 56,
                      color: Colors.white.withValues(alpha: 0.18),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Icon(module.icon, color: Colors.white, size: 28),
                        const Spacer(),
                        Text(
                          SyloraStrings.t(locale, module.labelKey),
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

@immutable
final class _ModuleDef {
  const _ModuleDef(
    this.route,
    this.labelKey,
    this.icon,
    this.from,
    this.to,
  );

  final String route;
  final String labelKey;
  final IconData icon;
  final Color from;
  final Color to;
}

final class _PopularLiveRow extends StatelessWidget {
  const _PopularLiveRow({required this.sessions});

  final List<LiveSessionModel> sessions;

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) {
      return LumenVellum(
        child: Row(
          children: <Widget>[
            const Icon(Icons.sensors_rounded, color: LumenColors.aether),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'No live sessions right now. Start one from Live.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            TextButton(
              onPressed: () => context.goNamed('live'),
              child: const Text('Go Live'),
            ),
          ],
        ),
      );
    }
    return SizedBox(
      height: 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: sessions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final session = sessions[index];
          final live = session.state == 'live' || session.state == 'active';
          return LumenRipple(
            onTap: () => context.pushNamed(
              'live-session',
              pathParameters: <String, String>{'id': session.id},
            ),
            child: SizedBox(
              width: 260,
              child: LumenVellum(
                padding: EdgeInsets.zero,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(20),
                          ),
                          gradient: LinearGradient(
                            colors: <Color>[
                              LumenColors.pulse.withValues(alpha: 0.35),
                              LumenColors.aether.withValues(alpha: 0.45),
                            ],
                          ),
                        ),
                        child: Stack(
                          children: <Widget>[
                            const Center(
                              child: Icon(
                                Icons.play_circle_fill_rounded,
                                size: 48,
                                color: Colors.white70,
                              ),
                            ),
                            if (live)
                              Positioned(
                                top: 10,
                                left: 10,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF4D4D),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'LIVE',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            session.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          Text(
                            session.state,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

final class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      Expanded(
        child: Text(title, style: Theme.of(context).textTheme.titleLarge),
      ),
      TextButton(onPressed: onAction, child: Text(actionLabel)),
    ],
  );
}
