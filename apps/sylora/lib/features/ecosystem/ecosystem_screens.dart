import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/locale.dart';
import '../../core/lumen_motion.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import '../platform/repositories.dart';

final friendsProvider = FutureProvider.autoDispose<FriendsBundle>((ref) async {
  final repository = ref.watch(socialRepositoryProvider);
  final friends = await repository.friends();
  final requests = await repository.friendRequests();
  return FriendsBundle(friends: friends, requests: requests);
});

final musicTracksProvider =
    FutureProvider.autoDispose<List<MusicTrackModel>>((ref) {
      return ref.watch(musicRepositoryProvider).tracks();
    });

final musicLibraryProvider =
    FutureProvider.autoDispose<List<MusicTrackModel>>((ref) {
      return ref.watch(musicRepositoryProvider).library();
    });

final progressionProvider =
    FutureProvider.autoDispose<ProgressionModel>((ref) {
      return ref.watch(progressionRepositoryProvider).me();
    });

final analyticsSnapshotProvider =
    FutureProvider.autoDispose<AnalyticsSnapshot>((ref) async {
      final progression = await ref.watch(progressionRepositoryProvider).me();
      final wallet = await ref.watch(walletRepositoryProvider).balance();
      return AnalyticsSnapshot(progression: progression, wallet: wallet);
    });

@immutable
final class FriendsBundle {
  const FriendsBundle({required this.friends, required this.requests});

  final List<FriendModel> friends;
  final FriendRequestsModel requests;
}

@immutable
final class AnalyticsSnapshot {
  const AnalyticsSnapshot({required this.progression, required this.wallet});

  final ProgressionModel progression;
  final WalletBalance wallet;
}

final class FriendsScreen extends ConsumerWidget {
  const FriendsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    final value = ref.watch(friendsProvider);
    return LumenPage(
      title: locale.t('friends'),
      subtitle: 'Accepted friendships and pending requests from the live graph.',
      child: LumenAsyncView<FriendsBundle>(
        value: value,
        onRetry: () => ref.invalidate(friendsProvider),
        data: (bundle) {
          if (bundle.friends.isEmpty &&
              bundle.requests.incoming.isEmpty &&
              bundle.requests.outgoing.isEmpty) {
            return LumenEmptyView(
              title: 'No friends yet',
              message:
                  'Search for people and send a friend request. Accepted friendships appear here.',
              actionLabel: 'Open search',
              onAction: () => context.goNamed('search'),
              icon: Icons.group_outlined,
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (bundle.requests.incoming.isNotEmpty) ...<Widget>[
                Text(
                  'Incoming requests',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                for (final request in bundle.requests.incoming)
                  ListTile(
                    title: Text(request.profile.displayName),
                    subtitle: Text('@${request.profile.handle}'),
                    trailing: Wrap(
                      spacing: 8,
                      children: <Widget>[
                        TextButton(
                          onPressed: () async {
                            await ref
                                .read(socialRepositoryProvider)
                                .acceptFriendRequest(request.friendshipId);
                            ref.invalidate(friendsProvider);
                          },
                          child: const Text('Accept'),
                        ),
                        TextButton(
                          onPressed: () async {
                            await ref
                                .read(socialRepositoryProvider)
                                .rejectFriendRequest(request.friendshipId);
                            ref.invalidate(friendsProvider);
                          },
                          child: const Text('Reject'),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
              ],
              if (bundle.requests.outgoing.isNotEmpty) ...<Widget>[
                Text(
                  'Outgoing requests',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                for (final request in bundle.requests.outgoing)
                  ListTile(
                    title: Text(request.profile.displayName),
                    subtitle: Text('@${request.profile.handle} · pending'),
                  ),
                const SizedBox(height: 16),
              ],
              Text(
                'Friends',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              for (final friend in bundle.friends)
                ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.person_outline_rounded),
                  ),
                  title: Text(friend.friend.displayName),
                  subtitle: Text('@${friend.friend.handle}'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.pushNamed(
                    'public-profile',
                    pathParameters: <String, String>{
                      'handle': friend.friend.handle!,
                    },
                  ),
                ),
            ],
          );
        },
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
  final _title = TextEditingController();
  final _artist = TextEditingController();
  final _genre = TextEditingController(text: 'Ambient');
  final _duration = TextEditingController(text: '180000');

  @override
  void dispose() {
    _title.dispose();
    _artist.dispose();
    _genre.dispose();
    _duration.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeControllerProvider);
    final tracks = ref.watch(musicTracksProvider);
    final library = ref.watch(musicLibraryProvider);
    return LumenPage(
      title: locale.t('music'),
      subtitle: 'Browse published tracks, save to your library, or publish yours.',
      actions: <Widget>[
        IconButton(
          tooltip: 'Publish track metadata',
          onPressed: _createTrack,
          icon: const Icon(Icons.library_music_outlined),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Catalog', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          LumenAsyncView<List<MusicTrackModel>>(
            value: tracks,
            onRetry: () => ref.invalidate(musicTracksProvider),
            data: (items) {
              if (items.isEmpty) {
                return LumenEmptyView(
                  title: 'No published tracks',
                  message:
                      'Create track metadata with audio object keys when your media is ready, then publish.',
                  actionLabel: 'Create track',
                  onAction: _createTrack,
                  icon: Icons.music_note_outlined,
                );
              }
              return Column(
                children: <Widget>[
                  for (final track in items)
                    LumenSurface(
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(track.title),
                        subtitle: Text(
                          '${track.artistName} · ${track.genre} · ${_formatDuration(track.durationMs)}',
                        ),
                        trailing: IconButton(
                          tooltip: 'Save to library',
                          onPressed: () async {
                            await ref
                                .read(musicRepositoryProvider)
                                .saveToLibrary(track.id);
                            ref.invalidate(musicLibraryProvider);
                          },
                          icon: const Icon(Icons.favorite_border_rounded),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          Text('Your library', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          LumenAsyncView<List<MusicTrackModel>>(
            value: library,
            onRetry: () => ref.invalidate(musicLibraryProvider),
            data: (items) {
              if (items.isEmpty) {
                return const Text('Saved tracks will appear here.');
              }
              return Column(
                children: <Widget>[
                  for (final track in items)
                    ListTile(
                      title: Text(track.title),
                      subtitle: Text(track.artistName),
                      trailing: IconButton(
                        onPressed: () async {
                          await ref
                              .read(musicRepositoryProvider)
                              .removeFromLibrary(track.id);
                          ref.invalidate(musicLibraryProvider);
                        },
                        icon: const Icon(Icons.delete_outline_rounded),
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

  Future<void> _createTrack() async {
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create track metadata'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              TextField(
                controller: _artist,
                decoration: const InputDecoration(labelText: 'Artist'),
              ),
              TextField(
                controller: _genre,
                decoration: const InputDecoration(labelText: 'Genre'),
              ),
              TextField(
                controller: _duration,
                decoration: const InputDecoration(
                  labelText: 'Duration (ms)',
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create & publish'),
          ),
        ],
      ),
    );
    if (created != true || !mounted) {
      return;
    }
    try {
      final repository = ref.read(musicRepositoryProvider);
      final track = await repository.createTrack(
        title: _title.text.trim(),
        artistName: _artist.text.trim(),
        genre: _genre.text.trim(),
        durationMs: int.parse(_duration.text.trim()),
      );
      await repository.publishTrack(track.id);
      ref.invalidate(musicTracksProvider);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Track published to the music catalog.')),
      );
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }

  String _formatDuration(int ms) {
    final seconds = (ms / 1000).round();
    final minutes = seconds ~/ 60;
    final rem = seconds % 60;
    return '$minutes:${rem.toString().padLeft(2, '0')}';
  }
}

final class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    final value = ref.watch(analyticsSnapshotProvider);
    return LumenPage(
      title: locale.t('analytics'),
      subtitle: 'Progression, wallet activity, and creator signals in one place.',
      child: LumenAsyncView<AnalyticsSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(analyticsSnapshotProvider),
        data: (snapshot) => Column(
          children: <Widget>[
            _MetricCard(
              label: 'Level',
              value: '${snapshot.progression.level}',
              detail:
                  '${snapshot.progression.xp} XP · ${snapshot.progression.xpToNext} to next',
              color: LumenColors.aether,
            ),
            const SizedBox(height: 12),
            _MetricCard(
              label: 'Wallet balance',
              value: _money(snapshot.wallet),
              detail: 'Available credits from the live ledger',
              color: LumenColors.solar,
            ),
            const SizedBox(height: 12),
            _MetricCard(
              label: 'Achievements',
              value: '${snapshot.progression.achievements.length}',
              detail: snapshot.progression.achievements.isEmpty
                  ? 'Complete first actions to unlock achievements'
                  : snapshot.progression.achievements
                        .map((item) => item.name)
                        .join(' · '),
              color: LumenColors.pulse,
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                LumenSecondaryButton(
                  label: 'Creator analytics',
                  icon: Icons.insights_outlined,
                  onPressed: () => context.goNamed('creator'),
                ),
                LumenSecondaryButton(
                  label: 'Wallet history',
                  icon: Icons.receipt_long_outlined,
                  onPressed: () => context.goNamed('wallet'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _money(WalletBalance wallet) {
    final formatter = NumberFormat.compactCurrency(
      symbol: '${wallet.assetCode} ',
      decimalDigits: 2,
    );
    return formatter.format(wallet.spendableMinor / 100);
  }
}

final class ProfileHubScreen extends ConsumerWidget {
  const ProfileHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    final progression = ref.watch(progressionProvider);
    final profile = ref.watch(ownProfileProvider);
    return LumenPage(
      title: locale.t('profile'),
      subtitle: 'Level, XP, achievements, and your public presence.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          LumenAsyncView<ProfileModel>(
            value: profile,
            onRetry: () => ref.invalidate(ownProfileProvider),
            data: (value) => GlassPanel(
              child: Row(
                children: <Widget>[
                  const AnimatedSyloraLogo(
                    size: 56,
                    state: LogoMotionState.rest,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          value.displayName,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        Text('@${value.handle ?? 'unset'}'),
                        if (value.bio != null && value.bio!.isNotEmpty)
                          Text(value.bio!),
                      ],
                    ),
                  ),
                  if (value.handle != null)
                    IconButton(
                      tooltip: 'Public profile',
                      onPressed: () => context.pushNamed(
                        'public-profile',
                        pathParameters: <String, String>{
                          'handle': value.handle!,
                        },
                      ),
                      icon: const Icon(Icons.open_in_new_rounded),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          LumenAsyncView<ProgressionModel>(
            value: progression,
            onRetry: () => ref.invalidate(progressionProvider),
            data: (value) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Level ${value.level}',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 10,
                    value: value.xpToNext == 0
                        ? 1
                        : value.xp / (value.xp + value.xpToNext),
                  ),
                ),
                const SizedBox(height: 8),
                Text('${value.xp} XP · ${value.xpToNext} until next level'),
                const SizedBox(height: 20),
                Text(
                  'Achievements',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                if (value.achievements.isEmpty)
                  const Text('No achievements unlocked yet.')
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      for (final achievement in value.achievements)
                        LumenBadge(
                          label: '${achievement.name} +${achievement.xpReward}',
                          color: LumenColors.pulse,
                        ),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: <Widget>[
              LumenPrimaryButton(
                label: 'Settings',
                icon: Icons.settings_outlined,
                onPressed: () => context.goNamed('settings'),
              ),
              LumenSecondaryButton(
                label: 'Wallet',
                icon: Icons.account_balance_wallet_outlined,
                onPressed: () => context.goNamed('wallet'),
              ),
              LumenSecondaryButton(
                label: 'Analytics',
                icon: Icons.insights_outlined,
                onPressed: () => context.goNamed('analytics'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

final ownProfileProvider = FutureProvider.autoDispose<ProfileModel>((ref) {
  return ref.watch(accountRepositoryProvider).profile();
});

final class LearnMoreScreen extends StatelessWidget {
  const LearnMoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const capabilities = <(IconData, String, String)>[
      (Icons.sensors_rounded, 'Live', 'RTMP, WebRTC, OBS companion, gifts, AI co-host.'),
      (Icons.auto_awesome_rounded, 'Aura', 'Chat, memory, translate, multimodal jobs.'),
      (Icons.groups_rounded, 'Social', 'Feed, communities, friends, messages.'),
      (Icons.school_outlined, 'Learning', 'Courses, quizzes, certificates.'),
      (Icons.storefront_outlined, 'Market', 'Digital goods, services, subscriptions.'),
      (Icons.business_outlined, 'Business', 'CRM, docs, invoices, team workspaces.'),
      (Icons.card_giftcard_rounded, 'Gifts', 'Catalog, authoring, cinematic runtime.'),
      (Icons.music_note_outlined, 'Music', 'Tracks, playlists, creator library.'),
    ];
    return LivingBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('SYLORA ecosystem'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 40),
          children: <Widget>[
            const AnimatedSyloraLogo(
              size: 88,
              state: LogoMotionState.thinking,
              showWordmark: true,
            ),
            const SizedBox(height: 24),
            Text(
              'One luminous operating system for creators, learners, and teams.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 28),
            for (final item in capabilities) ...<Widget>[
              GlassPanel(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(item.$1, color: LumenColors.aether, size: 28),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            item.$2,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(item.$3),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 12),
            LumenPrimaryButton(
              label: 'Create account',
              onPressed: () => context.go('/auth?create=1'),
            ),
            const SizedBox(height: 10),
            LumenSecondaryButton(
              label: 'Sign in',
              icon: Icons.login_rounded,
              onPressed: () => context.goNamed('auth'),
            ),
          ],
        ),
      ),
    );
  }
}

final class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.detail,
    required this.color,
  });

  final String label;
  final String value;
  final String detail;
  final Color color;

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Row(
      children: <Widget>[
        Container(
          width: 10,
          height: 64,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(label, style: Theme.of(context).textTheme.labelLarge),
              Text(value, style: Theme.of(context).textTheme.headlineMedium),
              Text(detail, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ],
    ),
  );
}
