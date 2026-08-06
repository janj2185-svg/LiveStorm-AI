import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/living_atmosphere.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import '../creator/creator_repository.dart';
import '../platform/repositories.dart';

final friendsProvider = FutureProvider.autoDispose<List<ProfileModel>>(
  (ref) => ref.watch(socialRepositoryProvider).friends(),
);

final friendRequestsProvider = FutureProvider.autoDispose<List<ProfileModel>>(
  (ref) => ref.watch(socialRepositoryProvider).friendRequests(),
);

final profileProgressProvider = FutureProvider.autoDispose<ProfileProgress>(
  (ref) => ref.watch(socialRepositoryProvider).profileProgress(),
);

final ownProfileProvider = FutureProvider.autoDispose<ProfileModel>(
  (ref) => ref.watch(accountRepositoryProvider).profile(),
);

final musicJobsProvider =
    FutureProvider.autoDispose<CursorPage<NamedResource>>((ref) async {
      final page = await ref.watch(aiRepositoryProvider).jobs();
      final music = page.items
          .where((job) => job.label == 'music')
          .toList(growable: false);
      return CursorPage<NamedResource>(items: music, nextCursor: page.nextCursor);
    });

final class FriendsScreen extends ConsumerWidget {
  const FriendsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final friends = ref.watch(friendsProvider);
    final requests = ref.watch(friendRequestsProvider);
    return LumenPage(
      title: 'Friends',
      subtitle: 'Accepted friendships and pending requests from the social API.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text('Requests', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          LumenAsyncView<List<ProfileModel>>(
            value: requests,
            onRetry: () => ref.invalidate(friendRequestsProvider),
            data: (items) {
              if (items.isEmpty) {
                return Text(
                  'No pending friend requests.',
                  style: Theme.of(context).textTheme.bodyMedium,
                );
              }
              return Column(
                children: <Widget>[
                  for (final profile in items)
                    ListTile(
                      title: Text(profile.displayName),
                      subtitle: Text(
                        profile.handle == null
                            ? 'Open profile unavailable (no handle)'
                            : '@${profile.handle}',
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: profile.handle == null
                          ? null
                          : () => context.pushNamed(
                              'public-profile',
                              pathParameters: <String, String>{
                                'handle': profile.handle!,
                              },
                            ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          Text('Friends', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          LumenAsyncView<List<ProfileModel>>(
            value: friends,
            onRetry: () => ref.invalidate(friendsProvider),
            data: (items) {
              if (items.isEmpty) {
                return LumenEmptyView(
                  title: 'No friends yet',
                  message:
                      'The API returned no accepted friendships for this account.',
                  actionLabel: 'Search people',
                  onAction: () => context.go('/search'),
                  icon: Icons.people_outline_rounded,
                );
              }
              return Column(
                children: <Widget>[
                  for (final profile in items)
                    ListTile(
                      leading: CircleAvatar(
                        backgroundColor: LumenColors.skyMist,
                        child: Text(
                          profile.displayName.isEmpty
                              ? '?'
                              : profile.displayName[0].toUpperCase(),
                        ),
                      ),
                      title: Text(profile.displayName),
                      subtitle: Text(
                        profile.handle == null ? '' : '@${profile.handle}',
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: profile.handle == null
                          ? null
                          : () => context.pushNamed(
                              'public-profile',
                              pathParameters: <String, String>{
                                'handle': profile.handle!,
                              },
                            ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

final class MusicScreen extends ConsumerStatefulWidget {
  const MusicScreen({super.key});

  @override
  ConsumerState<MusicScreen> createState() => _MusicScreenState();
}

final class _MusicScreenState extends ConsumerState<MusicScreen> {
  late Future<AiProviderStatus> _status;
  late Future<CursorPage<NamedResource>> _jobs;

  @override
  void initState() {
    super.initState();
    final ai = ref.read(aiRepositoryProvider);
    _status = ai.providerStatus();
    _jobs = ai.jobs();
  }

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Music',
    subtitle: 'AI music generation jobs from the SYLORA AI jobs API.',
    actions: <Widget>[
      IconButton(
        tooltip: 'Create music job',
        onPressed: _createMusicJob,
        icon: const Icon(Icons.library_music_outlined),
      ),
    ],
    child: FutureBuilder<AiProviderStatus>(
      future: _status,
      builder: (context, statusSnapshot) {
        if (statusSnapshot.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.all(40),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (statusSnapshot.hasError) {
          return LumenErrorView(
            error: statusSnapshot.error!,
            onRetry: () => setState(() {
              _status = ref.read(aiRepositoryProvider).providerStatus();
            }),
          );
        }
        final musicAvailable =
            statusSnapshot.requireData.capabilities['music'] == true;
        if (!musicAvailable) {
          return LumenEmptyView(
            title: 'Music provider unavailable',
            message:
                'The backend reports no available music generation capability. Jobs will not be fabricated.',
            actionLabel: 'Check again',
            onAction: () => setState(() {
              _status = ref.read(aiRepositoryProvider).providerStatus();
            }),
            icon: Icons.music_off_outlined,
          );
        }
        return FutureBuilder<CursorPage<NamedResource>>(
          future: _jobs,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              return LumenErrorView(
                error: snapshot.error!,
                onRetry: () => setState(() {
                  _jobs = ref.read(aiRepositoryProvider).jobs();
                }),
              );
            }
            final musicJobs = snapshot.requireData.items
                .where((job) => job.label == 'music')
                .toList(growable: false);
            if (musicJobs.isEmpty) {
              return LumenEmptyView(
                title: 'No music jobs',
                message: 'Queue a music generation job when the provider is ready.',
                actionLabel: 'Create music job',
                onAction: _createMusicJob,
                icon: Icons.queue_music_outlined,
              );
            }
            return Column(
              children: <Widget>[
                for (final job in musicJobs)
                  ListTile(
                    leading: const Icon(Icons.audiotrack_rounded),
                    title: Text(job.label),
                    subtitle: Text(job.status ?? ''),
                  ),
              ],
            );
          },
        );
      },
    ),
  );

  Future<void> _createMusicJob() async {
    final status = await ref.read(aiRepositoryProvider).providerStatus();
    if (status.capabilities['music'] != true) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Music provider unavailable — job not queued.'),
        ),
      );
      return;
    }
    if (!mounted) return;
    final prompt = TextEditingController();
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create music job'),
        content: SizedBox(
          width: 480,
          child: TextField(
            controller: prompt,
            minLines: 2,
            maxLines: 6,
            maxLength: 8000,
            decoration: const InputDecoration(labelText: 'Prompt'),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final text = prompt.text.trim();
              if (text.isEmpty) return;
              try {
                await ref.read(aiRepositoryProvider).createJob(<String, dynamic>{
                  'capability': 'music',
                  'prompt': text,
                  'duration_seconds': 30,
                  'instrumental': false,
                });
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: const Text('Queue'),
          ),
        ],
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    prompt.dispose();
    if ((created ?? false) && mounted) {
      setState(() => _jobs = ref.read(aiRepositoryProvider).jobs());
    }
  }
}

final class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final canCreator =
        roles.contains('creator') || roles.contains('admin');
    return LumenPage(
      title: 'Analytics',
      subtitle: canCreator
          ? 'Creator analytics when available, with personal progress always shown.'
          : 'Personal progress from profile XP, level, and achievements.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (canCreator) const _CreatorAnalyticsCard(),
          const _PersonalProgressCard(),
        ],
      ),
    );
  }
}

final class _CreatorAnalyticsCard extends ConsumerWidget {
  const _CreatorAnalyticsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) => FutureBuilder<CreatorAnalytics>(
    future: ref.read(creatorRepositoryProvider).analytics(),
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        );
      }
      if (snapshot.hasError) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: LumenSurface(
            child: Text(
              'Creator analytics unavailable: ${messageFor(snapshot.error!)}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        );
      }
      final analytics = snapshot.requireData;
      return Padding(
        padding: const EdgeInsets.only(bottom: 20),
        child: LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Creator studio',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 12,
                children: <Widget>[
                  _Metric(label: 'Content', value: '${analytics.contentCount}'),
                  _Metric(
                    label: 'Published',
                    value: '${analytics.publishedContentCount}',
                  ),
                  _Metric(
                    label: 'Followers',
                    value: '${analytics.followerCount}',
                  ),
                  _Metric(
                    label: 'Subs',
                    value: '${analytics.activeSubscriptionCount}',
                  ),
                  _Metric(label: 'Gifts', value: '${analytics.giftCount}'),
                  _Metric(
                    label: 'Earnings',
                    value: '${analytics.totalCreatorEarningsMinor}',
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
}

final class _PersonalProgressCard extends ConsumerWidget {
  const _PersonalProgressCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progress = ref.watch(profileProgressProvider);
    return LumenAsyncView<ProfileProgress>(
      value: progress,
      onRetry: () => ref.invalidate(profileProgressProvider),
      data: (data) => LumenSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Personal progress',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 16,
              runSpacing: 12,
              children: <Widget>[
                _Metric(label: 'Level', value: '${data.level}'),
                _Metric(label: 'XP', value: '${data.xp}'),
                _Metric(label: 'To next', value: '${data.xpToNext}'),
                _Metric(
                  label: 'Achievements',
                  value: '${data.achievementsEarned.length}',
                ),
              ],
            ),
            if (data.achievementsEarned.isNotEmpty) ...<Widget>[
              const SizedBox(height: 16),
              Text(
                'Earned',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              for (final item in data.achievementsEarned)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.label),
                  subtitle: Text(item.description ?? ''),
                ),
            ],
            if (data.achievementsAvailable.isNotEmpty) ...<Widget>[
              const SizedBox(height: 8),
              Text(
                'Available',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              for (final item in data.achievementsAvailable.take(6))
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.label),
                  subtitle: Text(item.description ?? ''),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

final class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text(value, style: Theme.of(context).textTheme.headlineSmall),
      Text(label, style: Theme.of(context).textTheme.labelMedium),
    ],
  );
}

final class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(ownProfileProvider);
    final progress = ref.watch(profileProgressProvider);
    final user = ref.watch(authControllerProvider).user;
    return LumenPage(
      title: 'Profile',
      subtitle: 'Your account profile and progress from the live API.',
      actions: <Widget>[
        IconButton(
          tooltip: 'Settings',
          onPressed: () => context.go('/settings'),
          icon: const Icon(Icons.settings_outlined),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          LumenAsyncView<ProfileModel>(
            value: profile,
            onRetry: () => ref.invalidate(ownProfileProvider),
            data: (data) => LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      const LivingSyloraLogo(size: 48, pulse: false),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              data.displayName,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            if (data.handle != null)
                              Text(
                                '@${data.handle}',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            if (user != null)
                              Text(
                                user.email,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (data.bio != null && data.bio!.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 12),
                    Text(data.bio!),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: <Widget>[
                      LumenSecondaryButton(
                        label: 'Settings',
                        icon: Icons.settings_outlined,
                        onPressed: () => context.go('/settings'),
                      ),
                      if (data.handle != null)
                        LumenSecondaryButton(
                          label: 'Public profile',
                          icon: Icons.public_rounded,
                          onPressed: () => context.pushNamed(
                            'public-profile',
                            pathParameters: <String, String>{
                              'handle': data.handle!,
                            },
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          LumenAsyncView<ProfileProgress>(
            value: progress,
            onRetry: () => ref.invalidate(profileProgressProvider),
            data: (data) => LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Progress',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text('Level ${data.level} · ${data.xp} XP'),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: data.xpToNext <= 0
                        ? 1
                        : (data.xp % (data.xp + data.xpToNext)) /
                              (data.xp + data.xpToNext).clamp(1, 1 << 30),
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  const SizedBox(height: 8),
                  Text('${data.xpToNext} XP to next level'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class AuraSheet extends ConsumerStatefulWidget {
  const AuraSheet({super.key});

  @override
  ConsumerState<AuraSheet> createState() => _AuraSheetState();
}

final class _AuraSheetState extends ConsumerState<AuraSheet> {
  late Future<({AuraStatus status, AuraPulse pulse})> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<({AuraStatus status, AuraPulse pulse})> _load() async {
    final repo = ref.read(socialRepositoryProvider);
    final status = await repo.auraStatus();
    final pulse = await repo.auraPulse();
    return (status: status, pulse: pulse);
  }

  @override
  Widget build(BuildContext context) => GlassPanel(
    radius: 28,
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
    child: FutureBuilder<({AuraStatus status, AuraPulse pulse})>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SizedBox(
            height: 220,
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasError) {
          return SizedBox(
            height: 280,
            child: LumenErrorView(
              error: snapshot.error!,
              onRetry: () => setState(() => _future = _load()),
            ),
          );
        }
        final data = snapshot.requireData;
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const LivingSyloraLogo(size: 42),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          data.status.name,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        Text(
                          data.status.tagline,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                data.pulse.pulseText,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 16),
              Text(
                'Suggested',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              for (final action in data.pulse.suggestedActions)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(action.label),
                  subtitle: Text(action.reason),
                  trailing: const Icon(Icons.arrow_forward_rounded),
                  onTap: () {
                    Navigator.of(context).maybePop();
                    context.go(_clientRoute(action.route));
                  },
                ),
              const SizedBox(height: 8),
              LumenPrimaryButton(
                label: 'Open Aura workspace',
                icon: Icons.auto_awesome_rounded,
                onPressed: () {
                  Navigator.of(context).maybePop();
                  context.go('/ai');
                },
              ),
            ],
          ),
        );
      },
    ),
  );

  String _clientRoute(String route) {
    if (route.startsWith('/v1/')) {
      final trimmed = route.substring(3);
      if (trimmed.startsWith('/social/notifications')) return '/notifications';
      if (trimmed.startsWith('/wallet')) return '/wallet';
      if (trimmed.startsWith('/live')) return '/live';
      if (trimmed.startsWith('/learning')) return '/learning';
      if (trimmed.startsWith('/ai')) return '/ai';
      if (trimmed.startsWith('/social/friend')) return '/friends';
    }
    return route.startsWith('/') ? route : '/$route';
  }
}
