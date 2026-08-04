import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../core/realtime.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../conferences/conference_screens.dart';
import '../platform/repositories.dart';

final feedProvider = FutureProvider.autoDispose<CursorPage<PostModel>>(
  (ref) => ref.watch(socialRepositoryProvider).feed(),
);

final recommendationsProvider = FutureProvider.autoDispose<List<PostModel>>(
  (ref) => ref.watch(socialRepositoryProvider).recommendations(),
);

final notificationsProvider =
    FutureProvider.autoDispose<CursorPage<AppNotification>>(
      (ref) => ref.watch(socialRepositoryProvider).notifications(),
    );

final conversationsProvider =
    FutureProvider.autoDispose<List<ConversationModel>>(
      (ref) => ref.watch(messagingRepositoryProvider).conversations(),
    );

final messageHistoryProvider = FutureProvider.autoDispose
    .family<CursorPage<MessageModel>, String>(
      (ref, id) => ref.watch(messagingRepositoryProvider).history(id),
    );

final publicProfileProvider = FutureProvider.autoDispose
    .family<ProfileModel, String>(
      (ref, handle) =>
          ref.watch(socialRepositoryProvider).publicProfile(handle),
    );

@immutable
final class FriendsSnapshot {
  const FriendsSnapshot({
    required this.friends,
    required this.requests,
    required this.suggestions,
  });

  final List<FriendSummaryModel> friends;
  final FriendRequestsModel requests;
  final List<FriendSuggestionModel> suggestions;
}

final friendsSnapshotProvider = FutureProvider.autoDispose<FriendsSnapshot>((
  ref,
) async {
  final repository = ref.watch(socialRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.listFriends(),
    repository.friendRequests(),
    repository.suggestions(),
  ]);
  return FriendsSnapshot(
    friends: values[0] as List<FriendSummaryModel>,
    requests: values[1] as FriendRequestsModel,
    suggestions: values[2] as List<FriendSuggestionModel>,
  );
});

final friendRequestsProvider = FutureProvider.autoDispose<FriendRequestsModel>(
  (ref) => ref.watch(socialRepositoryProvider).friendRequests(),
);

void _invalidateFriendSurfaces(WidgetRef ref, [String? handle]) {
  ref.invalidate(friendsSnapshotProvider);
  ref.invalidate(friendRequestsProvider);
  if (handle != null) {
    ref.invalidate(publicProfileProvider(handle));
  }
}

final postProvider = FutureProvider.autoDispose.family<PostModel, String>(
  (ref, id) => ref.watch(socialRepositoryProvider).post(id),
);

final commentsProvider = FutureProvider.autoDispose
    .family<List<CommentModel>, String>(
      (ref, id) => ref.watch(socialRepositoryProvider).comments(id),
    );

const List<(String, String)> _reportReasons = <(String, String)>[
  ('spam', 'Spam'),
  ('harassment', 'Harassment or bullying'),
  ('hate', 'Hateful content'),
  ('violence', 'Violence or threats'),
  ('sexual_content', 'Sexual content'),
  ('misinformation', 'Misinformation'),
  ('impersonation', 'Impersonation'),
  ('other', 'Something else'),
];

Future<void> _showReportDialog(
  BuildContext context,
  WidgetRef ref, {
  required String targetType,
  required String targetId,
  required String targetLabel,
}) async {
  final evidence = TextEditingController();
  var reason = _reportReasons.first.$1;
  var busy = false;
  String? error;
  final reportId = await showDialog<String>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setDialogState) => AlertDialog(
        icon: const Icon(Icons.shield_outlined),
        title: Text('Report $targetLabel'),
        content: SizedBox(
          width: 520,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Text(
                'Reports are reviewed by the safety team. The person you '
                'report will not be told who submitted it.',
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: reason,
                decoration: const InputDecoration(labelText: 'Reason'),
                items: <DropdownMenuItem<String>>[
                  for (final option in _reportReasons)
                    DropdownMenuItem<String>(
                      value: option.$1,
                      child: Text(option.$2),
                    ),
                ],
                onChanged: busy
                    ? null
                    : (value) {
                        if (value != null) {
                          reason = value;
                        }
                      },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: evidence,
                enabled: !busy,
                minLines: 3,
                maxLines: 6,
                maxLength: 5000,
                decoration: const InputDecoration(
                  labelText: 'What happened? (optional)',
                  hintText: 'Share details that will help the reviewer.',
                  alignLabelWithHint: true,
                ),
              ),
              if (error != null)
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: busy ? null : () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: busy
                ? null
                : () async {
                    setDialogState(() {
                      busy = true;
                      error = null;
                    });
                    try {
                      final id = await ref
                          .read(socialRepositoryProvider)
                          .report(
                            targetType: targetType,
                            targetId: targetId,
                            reason: reason,
                            evidence: evidence.text.trim().isEmpty
                                ? null
                                : evidence.text.trim(),
                          );
                      if (dialogContext.mounted) {
                        Navigator.pop(dialogContext, id);
                      }
                    } on Object catch (caught) {
                      if (dialogContext.mounted) {
                        setDialogState(() {
                          busy = false;
                          error = messageFor(caught);
                        });
                      }
                    }
                  },
            icon: const Icon(Icons.flag_outlined),
            label: Text(busy ? 'Sending…' : 'Submit report'),
          ),
        ],
      ),
    ),
  );
  evidence.dispose();
  if (reportId != null && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Report submitted. The safety team will review it.'),
      ),
    );
  }
}

@immutable
final class CommunitySnapshot {
  const CommunitySnapshot({required this.community, required this.channels});

  final NamedResource community;
  final List<NamedResource> channels;
}

final communityProvider = FutureProvider.autoDispose
    .family<CommunitySnapshot, String>((ref, slug) async {
      final repository = ref.watch(socialRepositoryProvider);
      final values = await Future.wait<Object>(<Future<Object>>[
        repository.community(slug),
        repository.channels(slug),
      ]);
      return CommunitySnapshot(
        community: values[0] as NamedResource,
        channels: values[1] as List<NamedResource>,
      );
    });

final class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

final class _FeedScreenState extends ConsumerState<FeedScreen> {
  final List<PostModel> _additionalPosts = <PostModel>[];
  String? _nextCursor;
  bool _paginationInitialized = false;
  bool _loadingMore = false;
  late final SyloraAuraPresenceController _aura =
      SyloraAuraPresenceController.forPreset(SyloraAuraContextPreset.feed);

  @override
  void dispose() {
    _aura.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final feed = ref.watch(feedProvider);
    final wide = MediaQuery.sizeOf(context).width >= 1100;
    return LumenPage(
      title: 'SYLORA',
      subtitle: l10n.feedSubtitle,
      intensity: 1,
      showOrbits: !wide,
      showAuraPresence: true,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      showAuraDock: wide,
      auraEmotion: AuraEmotion.greeting,
      maxContentWidth: 1080,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.settingsNotifications,
          onPressed: () => context.pushNamed('notifications'),
          icon: const Icon(Icons.notifications_outlined),
        ),
        IconButton(
          tooltip: l10n.navFriends,
          onPressed: () => context.goNamed('friends'),
          icon: const Icon(Icons.group_outlined),
        ),
        IconButton(
          tooltip: l10n.feedCreatePost,
          onPressed: () => _showComposer(context, ref),
          icon: const Icon(Icons.edit_outlined),
        ),
      ],
      header: _HomeUniverseHero(onCompose: () => _showComposer(context, ref)),
      child: LumenAsyncView<CursorPage<PostModel>>(
        value: feed,
        onRetry: () => ref.invalidate(feedProvider),
        data: (page) {
          if (!_paginationInitialized) {
            _paginationInitialized = true;
            _nextCursor = page.nextCursor;
          }
          final posts = <PostModel>[...page.items, ..._additionalPosts];
          if (posts.isEmpty) {
            return LumenEmptyView(
              title: l10n.feedEmpty,
              message: l10n.feedEmptyMessage,
              actionLabel: l10n.feedCreatePost,
              onAction: () => _showComposer(context, ref),
              icon: Icons.auto_awesome_outlined,
            );
          }
          return Column(
            children: <Widget>[
              for (var i = 0; i < posts.length; i++) ...<Widget>[
                _StaggeredReveal(
                  index: i,
                  child: PostCard(post: posts[i]),
                ),
                const SizedBox(height: 18),
              ],
              if (_nextCursor != null)
                LumenSecondaryButton(
                  label: _loadingMore
                      ? l10n.feedLoadingPosts
                      : l10n.feedLoadMore,
                  icon: Icons.expand_more_rounded,
                  onPressed: _loadingMore ? null : _loadMore,
                  disabledReason: _loadingMore
                      ? l10n.feedLoadingMoreReason
                      : null,
                ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null) {
      return;
    }
    setState(() => _loadingMore = true);
    try {
      final page = await ref
          .read(socialRepositoryProvider)
          .feed(cursor: cursor);
      setState(() {
        _additionalPosts.addAll(page.items);
        _nextCursor = page.nextCursor;
      });
    } finally {
      if (mounted) {
        setState(() => _loadingMore = false);
      }
    }
  }

  Future<void> _showComposer(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final body = TextEditingController();
    var publish = true;
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(l10n.feedCreatePost),
          content: SizedBox(
            width: 520,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextField(
                  controller: body,
                  autofocus: true,
                  minLines: 4,
                  maxLines: 10,
                  maxLength: 20000,
                  decoration: InputDecoration(
                    labelText: l10n.feedPostBodyLabel,
                    alignLabelWithHint: true,
                  ),
                ),
                SwitchListTile(
                  value: publish,
                  onChanged: (value) => setState(() => publish = value),
                  title: Text(
                    publish ? l10n.feedPublishNow : l10n.feedSaveDraft,
                  ),
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: Text(l10n.commonCancel),
            ),
            FilledButton(
              onPressed: () async {
                if (body.text.trim().isEmpty) {
                  return;
                }
                try {
                  await ref
                      .read(socialRepositoryProvider)
                      .createPost(body.text.trim(), publish: publish);
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
              child: Text(publish ? l10n.feedPublish : l10n.feedSaveDraft),
            ),
          ],
        ),
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    body.dispose();
    if (saved ?? false) {
      setState(() {
        _additionalPosts.clear();
        _nextCursor = null;
        _paginationInitialized = false;
      });
      ref.invalidate(feedProvider);
    }
  }
}

final class RecommendationsPanel extends ConsumerWidget {
  const RecommendationsPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(recommendationsProvider);
    return Padding(
      padding: const EdgeInsets.all(20),
      child: LumenSurface(
        child: value.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text(l10n.feedRecommendationsUnavailable),
              TextButton(
                onPressed: () => ref.invalidate(recommendationsProvider),
                child: Text(l10n.commonRetry),
              ),
            ],
          ),
          data: (posts) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                l10n.feedRecommended,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              if (posts.isEmpty)
                Text(
                  l10n.feedRecommendationsEmpty,
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                for (final post in posts.take(4))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('@${post.authorHandle}'),
                    subtitle: Text(
                      post.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => context.pushNamed(
                      'post',
                      pathParameters: <String, String>{'id': post.id},
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _HomeUniverseHero extends StatelessWidget {
  const _HomeUniverseHero({required this.onCompose});

  final VoidCallback onCompose;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final compact = MediaQuery.sizeOf(context).width < 720;
    final portals = <(String, String, IconData)>[
      (l10n.navAi, 'ai', Icons.auto_awesome_rounded),
      (l10n.navLive, 'live', Icons.podcasts_rounded),
      ('Music', 'music', Icons.library_music_rounded),
      (l10n.navFriends, 'friends', Icons.group_rounded),
      (l10n.navMessages, 'messages', Icons.forum_rounded),
      (l10n.moreLearning, 'learning', Icons.school_rounded),
      (l10n.navMarket, 'marketplace', Icons.storefront_rounded),
      (l10n.navCreator, 'creator', Icons.videocam_rounded),
    ];

    return SyloraGlass(
      radius: SyloraTokens.radiusXl,
      padding: EdgeInsets.fromLTRB(
        compact ? 18 : 28,
        compact ? 22 : 30,
        compact ? 18 : 28,
        compact ? 20 : 26,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            l10n.homeHeroEyebrow,
            style: SyloraTokens.label(11, color: SyloraTokens.ion),
          ),
          const SizedBox(height: 10),
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: <Color>[SyloraTokens.night, SyloraTokens.ion],
            ).createShader(bounds),
            child: Text(
              'SYLORA',
              style: SyloraTokens.display(
                compact ? 42 : 56,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            l10n.homeHeroBody,
            style: SyloraTokens.body(
              compact ? 14.5 : 16.5,
              color: SyloraTokens.inkSoft,
              weight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 22),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
              onTap: onCompose,
              child: Ink(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
                  gradient: const LinearGradient(
                    colors: <Color>[SyloraTokens.ion, SyloraTokens.petal],
                  ),
                  boxShadow: SyloraTokens.glow(
                    SyloraTokens.violet,
                    blur: 26,
                    opacity: 0.28,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 22,
                    vertical: 16,
                  ),
                  child: Row(
                    children: <Widget>[
                      const Icon(
                        Icons.auto_awesome_rounded,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          l10n.homeComposeHint,
                          style: SyloraTokens.body(
                            15,
                            color: Colors.white,
                            weight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Text(
                        l10n.feedCreatePost,
                        style: SyloraTokens.body(
                          13.5,
                          color: Colors.white,
                          weight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            l10n.homeModulesLabel,
            style: SyloraTokens.label(11, color: SyloraTokens.ion),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final portal in portals)
                _HomePortalChip(
                  label: portal.$1,
                  icon: portal.$3,
                  onTap: () => context.goNamed(portal.$2),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

final class _HomePortalChip extends StatefulWidget {
  const _HomePortalChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  State<_HomePortalChip> createState() => _HomePortalChipState();
}

final class _HomePortalChipState extends State<_HomePortalChip> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedContainer(
        duration: SyloraTokens.durFast,
        curve: SyloraTokens.curveSoft,
        transform: Matrix4.translationValues(0, _hover ? -2 : 0, 0),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
            onTap: widget.onTap,
            child: Ink(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: _hover ? 0.92 : 0.72),
                borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
                border: Border.all(
                  color: _hover
                      ? SyloraTokens.ion.withValues(alpha: 0.45)
                      : Colors.white.withValues(alpha: 0.8),
                ),
                boxShadow: _hover
                    ? SyloraTokens.glow(
                        SyloraTokens.ion,
                        blur: 18,
                        opacity: 0.2,
                      )
                    : null,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(widget.icon, size: 16, color: SyloraTokens.violet),
                    const SizedBox(width: 8),
                    Text(
                      widget.label,
                      style: SyloraTokens.body(
                        13,
                        color: SyloraTokens.ink,
                        weight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final class _StaggeredReveal extends StatelessWidget {
  const _StaggeredReveal({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) {
      return child;
    }
    final delayMs = (index.clamp(0, 8) * 55);
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: Duration(milliseconds: 520 + delayMs),
      curve: SyloraTokens.curveSnap,
      builder: (context, value, child) {
        final t = Curves.easeOutCubic.transform(value);
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 18),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

final class PostCard extends ConsumerWidget {
  const PostCard({required this.post, super.key});

  final PostModel post;

  @override
  Widget build(BuildContext context, WidgetRef ref) => SyloraCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: <Color>[SyloraTokens.ion, SyloraTokens.violet],
                ),
                boxShadow: SyloraTokens.glow(
                  SyloraTokens.violet,
                  blur: 14,
                  opacity: 0.22,
                ),
              ),
              child: Text(
                post.authorHandle.characters.first.toUpperCase(),
                style: SyloraTokens.body(
                  16,
                  color: Colors.white,
                  weight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: InkWell(
                onTap: () => context.pushNamed(
                  'public-profile',
                  pathParameters: <String, String>{'handle': post.authorHandle},
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      '@${post.authorHandle}',
                      style: SyloraTokens.title(17),
                    ),
                    Text(
                      DateFormat.yMMMd().add_jm().format(
                        post.createdAt.toLocal(),
                      ),
                      style: SyloraTokens.body(
                        12.5,
                        color: SyloraTokens.inkMute,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            LumenBadge(label: post.rawLifecycle),
            if (ref.watch(authControllerProvider).user?.id != post.authorId)
              IconButton(
                tooltip: 'Report post',
                onPressed: () => _showReportDialog(
                  context,
                  ref,
                  targetType: 'post',
                  targetId: post.id,
                  targetLabel: 'post',
                ),
                icon: const Icon(Icons.more_horiz_rounded),
              ),
          ],
        ),
        const SizedBox(height: 16),
        Text(post.body, style: SyloraTokens.body(16, color: SyloraTokens.ink)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 4,
          children: <Widget>[
            IconButton(
              tooltip: post.viewerReaction == null
                  ? 'React'
                  : 'Remove reaction',
              onPressed: () async {
                final repository = ref.read(socialRepositoryProvider);
                if (post.viewerReaction == null) {
                  await repository.react('post', post.id, 'like');
                } else {
                  await repository.removeReaction('post', post.id);
                }
                ref.invalidate(feedProvider);
              },
              icon: Icon(
                post.viewerReaction == null
                    ? Icons.favorite_border_rounded
                    : Icons.favorite_rounded,
              ),
            ),
            TextButton.icon(
              onPressed: () => context.pushNamed(
                'post',
                pathParameters: <String, String>{'id': post.id},
              ),
              icon: const Icon(Icons.chat_bubble_outline_rounded),
              label: Text('${post.commentCount}'),
            ),
            IconButton(
              tooltip: post.bookmarked ? 'Remove bookmark' : 'Bookmark',
              onPressed: () async {
                await ref
                    .read(socialRepositoryProvider)
                    .setBookmark(post.id, !post.bookmarked);
                ref.invalidate(feedProvider);
              },
              icon: Icon(
                post.bookmarked
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
              ),
            ),
            IconButton(
              tooltip: 'Repost',
              onPressed: () async {
                await ref
                    .read(socialRepositoryProvider)
                    .setRepost(post.id, true);
                ref.invalidate(feedProvider);
              },
              icon: const Icon(Icons.repeat_rounded),
            ),
          ],
        ),
      ],
    ),
  );
}

final class PostDetailScreen extends ConsumerStatefulWidget {
  const PostDetailScreen({required this.postId, super.key});

  final String postId;

  @override
  ConsumerState<PostDetailScreen> createState() => _PostDetailScreenState();
}

final class _PostDetailScreenState extends ConsumerState<PostDetailScreen> {
  final _comment = TextEditingController();

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final post = ref.watch(postProvider(widget.postId));
    final comments = ref.watch(commentsProvider(widget.postId));
    return Scaffold(
      appBar: AppBar(title: const Text('Post')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: <Widget>[
          post.when(
            data: (value) => PostCard(post: value),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stackTrace) => LumenErrorView(
              error: error,
              onRetry: () => ref.invalidate(postProvider(widget.postId)),
            ),
          ),
          const SizedBox(height: 20),
          Text('Comments', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: TextField(
                  controller: _comment,
                  minLines: 1,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Add a comment'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Send comment',
                onPressed: () async {
                  final body = _comment.text.trim();
                  if (body.isEmpty) {
                    return;
                  }
                  await ref
                      .read(socialRepositoryProvider)
                      .comment(widget.postId, body);
                  _comment.clear();
                  ref.invalidate(commentsProvider(widget.postId));
                  ref.invalidate(postProvider(widget.postId));
                },
                icon: const Icon(Icons.send_rounded),
              ),
            ],
          ),
          const SizedBox(height: 12),
          comments.when(
            data: (items) => items.isEmpty
                ? Text(
                    'No comments were returned.',
                    style: Theme.of(context).textTheme.bodySmall,
                  )
                : Column(
                    children: <Widget>[
                      for (final comment in items)
                        ListTile(
                          title: Text('@${comment.authorHandle}'),
                          subtitle: Text(comment.body),
                        ),
                    ],
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stackTrace) => LumenErrorView(
              error: error,
              onRetry: () => ref.invalidate(commentsProvider(widget.postId)),
            ),
          ),
        ],
      ),
    );
  }
}

final class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

final class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _query = TextEditingController();
  final _searchFocus = FocusNode();
  Future<SocialSearchBundle>? _results;

  @override
  void dispose() {
    _query.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return LumenPage(
      title: l10n.searchTitle,
      subtitle: l10n.searchSubtitle,
      intensity: 0.94,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      header: SyloraUniverseHero(
        eyebrow: l10n.searchHeroEyebrow,
        title: l10n.searchTitle,
        body: l10n.searchSubtitle,
        trailing: SyloraGlass(
          radius: SyloraTokens.radiusPill,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: <Widget>[
              const SizedBox(width: 8),
              Icon(Icons.travel_explore_rounded, color: SyloraTokens.violet),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _query,
                  focusNode: _searchFocus,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _search(),
                  decoration: InputDecoration(
                    hintText: l10n.searchHint,
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  style: SyloraTokens.body(
                    15,
                    color: SyloraTokens.ink,
                    weight: FontWeight.w500,
                  ),
                ),
              ),
              IconButton(
                tooltip: l10n.searchTitle,
                onPressed: _search,
                icon: const Icon(Icons.arrow_forward_rounded),
              ),
            ],
          ),
        ),
        footer: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            SyloraPortalChip(
              label: l10n.searchPeople,
              icon: Icons.person_search_rounded,
              onTap: _searchFocus.requestFocus,
            ),
            SyloraPortalChip(
              label: l10n.searchPosts,
              icon: Icons.article_outlined,
              onTap: _searchFocus.requestFocus,
            ),
            SyloraPortalChip(
              label: l10n.searchCommunities,
              icon: Icons.groups_2_outlined,
              onTap: _searchFocus.requestFocus,
            ),
          ],
        ),
      ),
      child: _results == null
          ? LumenEmptyView(
              title: l10n.searchFindPeople,
              message: l10n.searchFindPeopleMessage,
              actionLabel: l10n.searchFocus,
              onAction: _searchFocus.requestFocus,
              icon: Icons.travel_explore_rounded,
            )
          : FutureBuilder<SocialSearchBundle>(
              future: _results,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(),
                  );
                }
                if (snapshot.hasError) {
                  return LumenErrorView(
                    error: snapshot.error!,
                    onRetry: _search,
                  );
                }
                final data = snapshot.requireData;
                if (data.users.isEmpty &&
                    data.posts.isEmpty &&
                    data.communities.isEmpty) {
                  return LumenEmptyView(
                    title: l10n.searchNoResults,
                    message: l10n.searchNoResultsMessage,
                    actionLabel: l10n.searchEdit,
                    onAction: _searchFocus.requestFocus,
                    icon: Icons.search_off_rounded,
                  );
                }
                var index = 0;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if (data.users.isNotEmpty) ...<Widget>[
                      Text(l10n.searchPeople, style: SyloraTokens.title(20)),
                      const SizedBox(height: 12),
                      for (final user in data.users)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: SyloraStaggeredReveal(
                            index: index++,
                            child: SyloraGlassTile(
                              onTap: () => context.pushNamed(
                                'public-profile',
                                pathParameters: <String, String>{
                                  'handle': user.handle!,
                                },
                              ),
                              child: Row(
                                children: <Widget>[
                                  SyloraAvatarOrb(
                                    label: user.displayName,
                                    size: 46,
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: <Widget>[
                                        Text(
                                          user.displayName,
                                          style: SyloraTokens.title(16),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          '@${user.handle}',
                                          style: SyloraTokens.body(
                                            13,
                                            color: SyloraTokens.inkMute,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right_rounded),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                    if (data.posts.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(l10n.searchPosts, style: SyloraTokens.title(20)),
                      const SizedBox(height: 12),
                      for (final post in data.posts)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: SyloraStaggeredReveal(
                            index: index++,
                            child: PostCard(post: post),
                          ),
                        ),
                    ],
                    if (data.communities.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(
                        l10n.searchCommunities,
                        style: SyloraTokens.title(20),
                      ),
                      const SizedBox(height: 12),
                      for (final community in data.communities)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: SyloraStaggeredReveal(
                            index: index++,
                            child: SyloraGlassTile(
                              onTap: () => context.pushNamed(
                                'community',
                                pathParameters: <String, String>{
                                  'slug': requireString(community.raw, 'slug'),
                                },
                              ),
                              child: Row(
                                children: <Widget>[
                                  const Icon(
                                    Icons.groups_2_rounded,
                                    color: SyloraTokens.violet,
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: <Widget>[
                                        Text(
                                          community.label,
                                          style: SyloraTokens.title(16),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (community.description != null)
                                          Text(
                                            community.description!,
                                            style: SyloraTokens.body(
                                              13,
                                              color: SyloraTokens.inkMute,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right_rounded),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ],
                );
              },
            ),
    );
  }

  void _search() {
    final l10n = AppLocalizations.of(context);
    final query = _query.text.trim();
    if (query.length < 2) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.searchMinChars)));
      return;
    }
    setState(() {
      _results = ref.read(socialRepositoryProvider).search(query);
    });
  }
}

enum _FriendsTab { friends, requests, suggestions }

final class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

final class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  _FriendsTab _tab = _FriendsTab.friends;
  final Set<String> _busy = <String>{};

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(friendsSnapshotProvider);
    return SyloraModuleScaffold(
      title: l10n.friendsTitle,
      subtitle: l10n.friendsSubtitle,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.friendsSearchFriends,
          onPressed: () => context.goNamed('search'),
          icon: const Icon(Icons.person_search_rounded),
        ),
        IconButton(
          tooltip: l10n.commonRetry,
          onPressed: () => unawaited(_refresh()),
          icon: const Icon(Icons.refresh_rounded),
        ),
      ],
      child: LumenAsyncView<FriendsSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(friendsSnapshotProvider),
        data: (snapshot) => RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: EdgeInsets.zero,
            shrinkWrap: true,
            primary: false,
            physics: const AlwaysScrollableScrollPhysics(),
            children: <Widget>[
              _FriendsHero(snapshot: snapshot),
              const SizedBox(height: SyloraTokens.space4),
              _FriendsSegmentedTabs(
                selected: _tab,
                snapshot: snapshot,
                onSelected: (tab) => setState(() => _tab = tab),
              ),
              const SizedBox(height: SyloraTokens.space4),
              AnimatedSwitcher(
                duration: SyloraTokens.durMed,
                switchInCurve: SyloraTokens.curveSoft,
                switchOutCurve: SyloraTokens.curveSoft,
                child: _tabBody(snapshot),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _refresh() async {
    _invalidateFriendSurfaces(ref);
    await ref.read(friendsSnapshotProvider.future);
  }

  Widget _tabBody(FriendsSnapshot snapshot) {
    final l10n = AppLocalizations.of(context);
    return switch (_tab) {
      _FriendsTab.friends => _FriendsList(
        key: const ValueKey<_FriendsTab>(_FriendsTab.friends),
        friends: snapshot.friends,
        busy: _busy,
        onUnfriend: (friend) => _run(
          'unfriend:${friend.handle}',
          () => ref.read(socialRepositoryProvider).unfriend(friend.handle),
          handle: friend.handle,
        ),
      ),
      _FriendsTab.requests => _RequestsList(
        key: const ValueKey<_FriendsTab>(_FriendsTab.requests),
        requests: snapshot.requests,
        busy: _busy,
        onAccept: (request) => _run('accept:${request.id}', () async {
          await ref
              .read(socialRepositoryProvider)
              .acceptFriendRequest(request.id);
        }, handle: request.handle),
        onReject: (request) => _run(
          'reject:${request.id}',
          () => ref
              .read(socialRepositoryProvider)
              .rejectFriendRequest(request.id),
          handle: request.handle,
        ),
        onCancel: (request) => _run(
          'cancel:${request.id}',
          () => ref
              .read(socialRepositoryProvider)
              .cancelFriendRequest(request.id),
          handle: request.handle,
        ),
      ),
      _FriendsTab.suggestions => _SuggestionsList(
        key: const ValueKey<_FriendsTab>(_FriendsTab.suggestions),
        suggestions: snapshot.suggestions,
        busy: _busy,
        onAdd: (suggestion) => _run('add:${suggestion.handle}', () async {
          final status = await ref
              .read(socialRepositoryProvider)
              .friend(suggestion.handle);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${l10n.friendsTitle}: $status')),
            );
          }
        }, handle: suggestion.handle),
      ),
    };
  }

  Future<void> _run(
    String key,
    Future<void> Function() action, {
    String? handle,
  }) async {
    if (_busy.contains(key)) {
      return;
    }
    setState(() => _busy.add(key));
    try {
      await action();
      _invalidateFriendSurfaces(ref, handle);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _busy.remove(key));
      }
    }
  }
}

final class _FriendsHero extends StatelessWidget {
  const _FriendsHero({required this.snapshot});

  final FriendsSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final onlineCount = snapshot.friends
        .where((friend) => friend.online)
        .length;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            SyloraTokens.ion.withValues(alpha: 0.18),
            SyloraTokens.petal.withValues(alpha: 0.12),
            Colors.white.withValues(alpha: 0.66),
          ],
        ),
        border: Border.all(color: Colors.white.withValues(alpha: 0.72)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(SyloraTokens.space5),
        child: Wrap(
          spacing: SyloraTokens.space4,
          runSpacing: SyloraTokens.space4,
          crossAxisAlignment: WrapCrossAlignment.center,
          alignment: WrapAlignment.spaceBetween,
          children: <Widget>[
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    l10n.friendsSearchFriends,
                    style: SyloraTokens.label(12, color: SyloraTokens.violet),
                  ),
                  const SizedBox(height: SyloraTokens.space2),
                  Text(l10n.friendsTitle, style: SyloraTokens.display(34)),
                  const SizedBox(height: SyloraTokens.space2),
                  Text(
                    '${snapshot.requests.incoming.length} ${l10n.friendsPendingIncoming} · '
                    '${snapshot.requests.outgoing.length} ${l10n.friendsPendingOutgoing}',
                    style: SyloraTokens.body(15, weight: FontWeight.w500),
                  ),
                ],
              ),
            ),
            Wrap(
              spacing: SyloraTokens.space2,
              runSpacing: SyloraTokens.space2,
              children: <Widget>[
                _MetricPill(
                  label: l10n.friendsTitle,
                  value: '${snapshot.friends.length}',
                  icon: Icons.group_rounded,
                ),
                _MetricPill(
                  label: l10n.friendsOnline,
                  value: '$onlineCount',
                  icon: Icons.bolt_rounded,
                ),
                _MetricPill(
                  label: l10n.friendsSuggestions,
                  value: '${snapshot.suggestions.length}',
                  icon: Icons.auto_awesome_rounded,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

final class _MetricPill extends StatelessWidget {
  const _MetricPill({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SyloraGlass(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    radius: SyloraTokens.radiusMd,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon, color: SyloraTokens.violet, size: 18),
        const SizedBox(width: SyloraTokens.space2),
        Text(value, style: SyloraTokens.title(18)),
        const SizedBox(width: SyloraTokens.space1),
        Text(label, style: SyloraTokens.body(12, color: SyloraTokens.inkMute)),
      ],
    ),
  );
}

final class _FriendsSegmentedTabs extends StatelessWidget {
  const _FriendsSegmentedTabs({
    required this.selected,
    required this.snapshot,
    required this.onSelected,
  });

  final _FriendsTab selected;
  final FriendsSnapshot snapshot;
  final ValueChanged<_FriendsTab> onSelected;

  @override
  Widget build(BuildContext context) {
    final tabs = <_FriendsTab>[
      _FriendsTab.friends,
      _FriendsTab.requests,
      _FriendsTab.suggestions,
    ];
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
        border: Border.all(color: Colors.white.withValues(alpha: 0.72)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(5),
        child: Row(
          children: <Widget>[
            for (final tab in tabs)
              Expanded(
                child: _SegmentButton(
                  tab: tab,
                  selected: selected == tab,
                  count: _countFor(tab),
                  onTap: () => onSelected(tab),
                ),
              ),
          ],
        ),
      ),
    );
  }

  int _countFor(_FriendsTab tab) => switch (tab) {
    _FriendsTab.friends => snapshot.friends.length,
    _FriendsTab.requests =>
      snapshot.requests.incoming.length + snapshot.requests.outgoing.length,
    _FriendsTab.suggestions => snapshot.suggestions.length,
  };
}

final class _SegmentButton extends StatelessWidget {
  const _SegmentButton({
    required this.tab,
    required this.selected,
    required this.count,
    required this.onTap,
  });

  final _FriendsTab tab;
  final bool selected;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = _tabLabel(context, tab);
    return Semantics(
      selected: selected,
      button: true,
      label: '$label $count',
      child: InkWell(
        borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
        onTap: onTap,
        child: AnimatedContainer(
          duration: SyloraTokens.durMed,
          curve: SyloraTokens.curveSoft,
          padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
            gradient: selected
                ? const LinearGradient(
                    colors: <Color>[SyloraTokens.ion, SyloraTokens.petal],
                  )
                : null,
            boxShadow: selected
                ? SyloraTokens.glow(
                    SyloraTokens.violet,
                    blur: 20,
                    opacity: 0.22,
                  )
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: SyloraTokens.body(
                    14,
                    color: selected ? Colors.white : SyloraTokens.inkSoft,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: SyloraTokens.space2),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: (selected ? Colors.white : SyloraTokens.violet)
                      .withValues(alpha: selected ? 0.22 : 0.1),
                  borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  child: Text(
                    '$count',
                    style: SyloraTokens.label(
                      10,
                      color: selected ? Colors.white : SyloraTokens.violet,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _FriendsList extends StatelessWidget {
  const _FriendsList({
    required this.friends,
    required this.busy,
    required this.onUnfriend,
    super.key,
  });

  final List<FriendSummaryModel> friends;
  final Set<String> busy;
  final ValueChanged<FriendSummaryModel> onUnfriend;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (friends.isEmpty) {
      return _FriendsEmptyState(
        title: l10n.friendsNoFriends,
        message: l10n.friendsSearchFriends,
        actionLabel: l10n.friendsSearchFriends,
        icon: Icons.group_outlined,
      );
    }
    return Column(
      key: key,
      children: <Widget>[
        for (var i = 0; i < friends.length; i++) ...<Widget>[
          _StaggeredEntrance(
            index: i,
            child: _FriendCard(
              friend: friends[i],
              busy: busy.contains('unfriend:${friends[i].handle}'),
              onUnfriend: () => onUnfriend(friends[i]),
            ),
          ),
          const SizedBox(height: SyloraTokens.space3),
        ],
      ],
    );
  }
}

final class _RequestsList extends StatelessWidget {
  const _RequestsList({
    required this.requests,
    required this.busy,
    required this.onAccept,
    required this.onReject,
    required this.onCancel,
    super.key,
  });

  final FriendRequestsModel requests;
  final Set<String> busy;
  final ValueChanged<FriendRequestSummaryModel> onAccept;
  final ValueChanged<FriendRequestSummaryModel> onReject;
  final ValueChanged<FriendRequestSummaryModel> onCancel;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final total = requests.incoming.length + requests.outgoing.length;
    if (total == 0) {
      return _FriendsEmptyState(
        title: l10n.friendsRequests,
        message: l10n.friendsSearchFriends,
        actionLabel: l10n.friendsSearchFriends,
        icon: Icons.mark_email_unread_outlined,
      );
    }
    var index = 0;
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (requests.incoming.isNotEmpty) ...<Widget>[
          _SectionTitle(label: l10n.friendsPendingIncoming),
          const SizedBox(height: SyloraTokens.space2),
          for (final request in requests.incoming) ...<Widget>[
            _StaggeredEntrance(
              index: index++,
              child: _RequestCard(
                request: request,
                incoming: true,
                acceptBusy: busy.contains('accept:${request.id}'),
                rejectBusy: busy.contains('reject:${request.id}'),
                cancelBusy: false,
                onAccept: () => onAccept(request),
                onReject: () => onReject(request),
                onCancel: null,
              ),
            ),
            const SizedBox(height: SyloraTokens.space3),
          ],
        ],
        if (requests.outgoing.isNotEmpty) ...<Widget>[
          const SizedBox(height: SyloraTokens.space2),
          _SectionTitle(label: l10n.friendsPendingOutgoing),
          const SizedBox(height: SyloraTokens.space2),
          for (final request in requests.outgoing) ...<Widget>[
            _StaggeredEntrance(
              index: index++,
              child: _RequestCard(
                request: request,
                incoming: false,
                acceptBusy: false,
                rejectBusy: false,
                cancelBusy: busy.contains('cancel:${request.id}'),
                onAccept: null,
                onReject: null,
                onCancel: () => onCancel(request),
              ),
            ),
            const SizedBox(height: SyloraTokens.space3),
          ],
        ],
      ],
    );
  }
}

final class _SuggestionsList extends StatelessWidget {
  const _SuggestionsList({
    required this.suggestions,
    required this.busy,
    required this.onAdd,
    super.key,
  });

  final List<FriendSuggestionModel> suggestions;
  final Set<String> busy;
  final ValueChanged<FriendSuggestionModel> onAdd;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (suggestions.isEmpty) {
      return _FriendsEmptyState(
        title: l10n.friendsSuggestions,
        message: l10n.friendsSearchFriends,
        actionLabel: l10n.friendsSearchFriends,
        icon: Icons.auto_awesome_outlined,
      );
    }
    return Column(
      key: key,
      children: <Widget>[
        for (var i = 0; i < suggestions.length; i++) ...<Widget>[
          _StaggeredEntrance(
            index: i,
            child: _SuggestionCard(
              suggestion: suggestions[i],
              busy: busy.contains('add:${suggestions[i].handle}'),
              onAdd: () => onAdd(suggestions[i]),
            ),
          ),
          const SizedBox(height: SyloraTokens.space3),
        ],
      ],
    );
  }
}

final class _FriendCard extends StatelessWidget {
  const _FriendCard({
    required this.friend,
    required this.busy,
    required this.onUnfriend,
  });

  final FriendSummaryModel friend;
  final bool busy;
  final VoidCallback onUnfriend;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final lastSeen = friend.lastSeenAt == null
        ? null
        : DateFormat.MMMd().add_jm().format(friend.lastSeenAt!.toLocal());
    return _PersonCard(
      avatarUrl: friend.avatarUrl,
      displayName: friend.displayName,
      handle: friend.handle,
      online: friend.online,
      eyebrow: friend.online
          ? l10n.friendsOnline
          : lastSeen ?? l10n.friendsOnly,
      onTap: () => context.pushNamed(
        'public-profile',
        pathParameters: <String, String>{'handle': friend.handle},
      ),
      trailing: SyloraButton(
        label: l10n.friendsUnfriend,
        icon: Icons.person_remove_outlined,
        variant: SyloraButtonVariant.secondary,
        expanded: false,
        busy: busy,
        onPressed: onUnfriend,
      ),
    );
  }
}

final class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.incoming,
    required this.acceptBusy,
    required this.rejectBusy,
    required this.cancelBusy,
    required this.onAccept,
    required this.onReject,
    required this.onCancel,
  });

  final FriendRequestSummaryModel request;
  final bool incoming;
  final bool acceptBusy;
  final bool rejectBusy;
  final bool cancelBusy;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final requestedAt = DateFormat.MMMd().add_jm().format(
      request.requestedAt.toLocal(),
    );
    return _PersonCard(
      avatarUrl: request.avatarUrl,
      displayName: request.displayName,
      handle: request.handle,
      online: false,
      eyebrow: requestedAt,
      onTap: () => context.pushNamed(
        'public-profile',
        pathParameters: <String, String>{'handle': request.handle},
      ),
      trailing: incoming
          ? Wrap(
              spacing: SyloraTokens.space2,
              runSpacing: SyloraTokens.space2,
              children: <Widget>[
                SyloraButton(
                  label: l10n.friendsAccept,
                  icon: Icons.check_rounded,
                  expanded: false,
                  busy: acceptBusy,
                  onPressed: onAccept,
                ),
                SyloraButton(
                  label: l10n.friendsReject,
                  icon: Icons.close_rounded,
                  variant: SyloraButtonVariant.ghost,
                  expanded: false,
                  busy: rejectBusy,
                  onPressed: onReject,
                ),
              ],
            )
          : SyloraButton(
              label: l10n.commonCancel,
              icon: Icons.undo_rounded,
              variant: SyloraButtonVariant.secondary,
              expanded: false,
              busy: cancelBusy,
              onPressed: onCancel,
            ),
    );
  }
}

final class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({
    required this.suggestion,
    required this.busy,
    required this.onAdd,
  });

  final FriendSuggestionModel suggestion;
  final bool busy;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _PersonCard(
      avatarUrl: suggestion.avatarUrl,
      displayName: suggestion.displayName,
      handle: suggestion.handle,
      online: false,
      eyebrow: '${suggestion.mutualCount} ${l10n.friendsMutual}',
      onTap: () => context.pushNamed(
        'public-profile',
        pathParameters: <String, String>{'handle': suggestion.handle},
      ),
      trailing: SyloraButton(
        label: l10n.friendsAddFriend,
        icon: Icons.person_add_alt_1_rounded,
        expanded: false,
        busy: busy,
        onPressed: onAdd,
      ),
    );
  }
}

final class _PersonCard extends StatelessWidget {
  const _PersonCard({
    required this.avatarUrl,
    required this.displayName,
    required this.handle,
    required this.online,
    required this.eyebrow,
    required this.trailing,
    required this.onTap,
  });

  final String? avatarUrl;
  final String displayName;
  final String handle;
  final bool online;
  final String eyebrow;
  final Widget trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SyloraGlass(
    padding: const EdgeInsets.all(SyloraTokens.space4),
    radius: SyloraTokens.radiusLg,
    child: LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 620;
        final identity = InkWell(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
          onTap: onTap,
          child: Row(
            children: <Widget>[
              _PersonAvatar(
                avatarUrl: avatarUrl,
                displayName: displayName,
                online: online,
              ),
              const SizedBox(width: SyloraTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      displayName,
                      style: SyloraTokens.title(18),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '@$handle',
                      style: SyloraTokens.body(
                        13,
                        color: SyloraTokens.inkMute,
                        weight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: SyloraTokens.space2),
                    Row(
                      children: <Widget>[
                        _PresenceOrb(online: online),
                        const SizedBox(width: SyloraTokens.space2),
                        Flexible(
                          child: Text(
                            eyebrow,
                            style: SyloraTokens.label(
                              10,
                              color: online
                                  ? SyloraTokens.aqua
                                  : SyloraTokens.inkMute,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              identity,
              const SizedBox(height: SyloraTokens.space3),
              Align(alignment: Alignment.centerLeft, child: trailing),
            ],
          );
        }
        return Row(
          children: <Widget>[
            Expanded(child: identity),
            const SizedBox(width: SyloraTokens.space4),
            trailing,
          ],
        );
      },
    ),
  );
}

final class _PersonAvatar extends StatelessWidget {
  const _PersonAvatar({
    required this.avatarUrl,
    required this.displayName,
    required this.online,
  });

  final String? avatarUrl;
  final String displayName;
  final bool online;

  @override
  Widget build(BuildContext context) {
    final initial = displayName.characters.isEmpty
        ? '?'
        : displayName.characters.first.toUpperCase();
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: online
                ? SyloraTokens.glow(SyloraTokens.aqua, blur: 28, opacity: 0.28)
                : SyloraTokens.softElevation,
          ),
          child: CircleAvatar(
            radius: 30,
            backgroundColor: SyloraTokens.violet.withValues(alpha: 0.16),
            backgroundImage: avatarUrl == null
                ? null
                : NetworkImage(avatarUrl!),
            child: avatarUrl == null
                ? Text(initial, style: SyloraTokens.title(20))
                : null,
          ),
        ),
        Positioned(right: -1, bottom: 1, child: _PresenceOrb(online: online)),
      ],
    );
  }
}

final class _PresenceOrb extends StatelessWidget {
  const _PresenceOrb({required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: online ? SyloraTokens.aqua : SyloraTokens.mist,
      border: Border.all(color: Colors.white, width: 2),
      boxShadow: online
          ? SyloraTokens.glow(SyloraTokens.aqua, blur: 18, opacity: 0.48)
          : null,
    ),
    child: const SizedBox(width: 14, height: 14),
  );
}

final class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) =>
      Text(label, style: SyloraTokens.label(12, color: SyloraTokens.violet));
}

final class _FriendsEmptyState extends StatelessWidget {
  const _FriendsEmptyState({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.icon,
  });

  final String title;
  final String message;
  final String actionLabel;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SyloraGlass(
    padding: const EdgeInsets.all(SyloraTokens.space6),
    radius: SyloraTokens.radiusLg,
    child: LumenEmptyView(
      title: title,
      message: message,
      actionLabel: actionLabel,
      onAction: () => context.goNamed('search'),
      icon: icon,
    ),
  );
}

final class _StaggeredEntrance extends StatelessWidget {
  const _StaggeredEntrance({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final start = (index * 0.06).clamp(0.0, 0.62);
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: Duration(milliseconds: 620 + index * 70),
      curve: Interval(start, 1, curve: SyloraTokens.curveSoft),
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, (1 - value) * 18),
          child: child,
        ),
      ),
      child: child,
    );
  }
}

String _tabLabel(BuildContext context, _FriendsTab tab) {
  final l10n = AppLocalizations.of(context);
  return switch (tab) {
    _FriendsTab.friends => l10n.friendsTitle,
    _FriendsTab.requests => l10n.friendsRequests,
    _FriendsTab.suggestions => l10n.friendsSuggestions,
  };
}

final class CommunitiesScreen extends ConsumerStatefulWidget {
  const CommunitiesScreen({super.key});

  @override
  ConsumerState<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

final class _CommunitiesScreenState extends ConsumerState<CommunitiesScreen> {
  final _search = TextEditingController();
  late Future<List<NamedResource>> _future = _load();

  Future<List<NamedResource>> _load() {
    final query = _search.text.trim();
    return ref
        .read(socialRepositoryProvider)
        .communities(query: query.length >= 2 ? query : null);
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return LumenPage(
      title: l10n.communitiesTitle,
      subtitle: l10n.communitiesSubtitle,
      intensity: 0.92,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      maxContentWidth: 1120,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.communitiesCreate,
          onPressed: _createCommunity,
          icon: const Icon(Icons.group_add_outlined),
        ),
      ],
      header: SyloraUniverseHero(
        eyebrow: l10n.communitiesHeroEyebrow,
        title: l10n.communitiesHeroTitle,
        body: l10n.communitiesHeroBody,
        trailing: SyloraPortalChip(
          label: l10n.communitiesCreate,
          icon: Icons.add_rounded,
          onTap: _createCommunity,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          LumenSurface(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Row(
              children: <Widget>[
                const Icon(Icons.search_rounded),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: l10n.communitiesSearchHint,
                      border: InputBorder.none,
                    ),
                    onSubmitted: (_) => _searchCommunities(),
                  ),
                ),
                IconButton(
                  tooltip: l10n.communitiesSearch,
                  onPressed: _searchCommunities,
                  icon: const Icon(Icons.arrow_forward_rounded),
                ),
                if (_search.text.isNotEmpty)
                  IconButton(
                    tooltip: l10n.communitiesClearSearch,
                    onPressed: _clearSearch,
                    icon: const Icon(Icons.close_rounded),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          FutureBuilder<List<NamedResource>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return LumenErrorView(
                  error: snapshot.error!,
                  onRetry: _refresh,
                );
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final communities = snapshot.data!;
              if (communities.isEmpty) {
                return LumenEmptyView(
                  title: _search.text.trim().isEmpty
                      ? l10n.communitiesEmptyTitle
                      : l10n.communitiesNoMatchesTitle,
                  message: _search.text.trim().isEmpty
                      ? l10n.communitiesEmptyMessage
                      : l10n.communitiesNoMatchesMessage,
                  actionLabel: _search.text.trim().isEmpty
                      ? l10n.communitiesCreate
                      : l10n.communitiesClearSearch,
                  onAction: _search.text.trim().isEmpty
                      ? _createCommunity
                      : _clearSearch,
                  icon: Icons.groups_2_outlined,
                );
              }
              return LayoutBuilder(
                builder: (context, constraints) {
                  final columns = constraints.maxWidth >= 760 ? 2 : 1;
                  final cardWidth =
                      (constraints.maxWidth - (columns - 1) * 12) / columns;
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: <Widget>[
                      for (var index = 0; index < communities.length; index++)
                        SizedBox(
                          width: cardWidth,
                          child: SyloraStaggeredReveal(
                            index: index,
                            child: _CommunityBrowseCard(
                              community: communities[index],
                            ),
                          ),
                        ),
                    ],
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  void _searchCommunities() {
    final query = _search.text.trim();
    if (query.isNotEmpty && query.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context).searchMinChars)),
      );
      return;
    }
    _refresh();
  }

  void _clearSearch() {
    _search.clear();
    _refresh();
  }

  void _refresh() => setState(() => _future = _load());

  Future<void> _createCommunity() async {
    final l10n = AppLocalizations.of(context);
    final form = GlobalKey<FormState>();
    final name = TextEditingController();
    final slug = TextEditingController();
    final description = TextEditingController();
    var visibility = 'public';
    final created = await showDialog<NamedResource>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(l10n.communitiesCreate),
          content: SizedBox(
            width: 520,
            child: Form(
              key: form,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    TextFormField(
                      controller: name,
                      maxLength: 100,
                      decoration: InputDecoration(
                        labelText: l10n.communitiesNameLabel,
                      ),
                      validator: (value) => value?.trim().isEmpty ?? true
                          ? l10n.communitiesNameRequired
                          : null,
                    ),
                    TextFormField(
                      controller: slug,
                      maxLength: 64,
                      decoration: InputDecoration(
                        labelText: l10n.communitiesSlugLabel,
                        helperText: l10n.communitiesSlugHelper,
                      ),
                      validator: (value) =>
                          RegExp(
                                r'^[a-z0-9]+(?:-[a-z0-9]+)*$',
                              ).hasMatch(value?.trim() ?? '') &&
                              (value?.trim().length ?? 0) >= 3
                          ? null
                          : l10n.communitiesSlugInvalid,
                    ),
                    TextFormField(
                      controller: description,
                      maxLength: 4000,
                      minLines: 2,
                      maxLines: 5,
                      decoration: InputDecoration(
                        labelText: l10n.communitiesDescriptionLabel,
                      ),
                    ),
                    DropdownButtonFormField<String>(
                      initialValue: visibility,
                      decoration: InputDecoration(
                        labelText: l10n.communitiesVisibilityLabel,
                      ),
                      items: <DropdownMenuItem<String>>[
                        DropdownMenuItem(
                          value: 'public',
                          child: Text(l10n.communitiesVisibilityPublic),
                        ),
                        DropdownMenuItem(
                          value: 'private',
                          child: Text(l10n.communitiesVisibilityPrivate),
                        ),
                        DropdownMenuItem(
                          value: 'invite_only',
                          child: Text(l10n.communitiesVisibilityInviteOnly),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setDialogState(() => visibility = value);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(l10n.commonCancel),
            ),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) {
                  return;
                }
                try {
                  final community = await ref
                      .read(socialRepositoryProvider)
                      .createCommunity(
                        slug: slug.text.trim(),
                        name: name.text.trim(),
                        description: description.text.trim().isEmpty
                            ? null
                            : description.text.trim(),
                        visibility: visibility,
                      );
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, community);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    ScaffoldMessenger.of(
                      dialogContext,
                    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                  }
                }
              },
              child: Text(l10n.commonCreate),
            ),
          ],
        ),
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    name.dispose();
    slug.dispose();
    description.dispose();
    if (created != null && mounted) {
      _refresh();
      await context.pushNamed(
        'community',
        pathParameters: <String, String>{
          'slug': requireString(created.raw, 'slug'),
        },
      );
    }
  }
}

final class _CommunityBrowseCard extends StatelessWidget {
  const _CommunityBrowseCard({required this.community});

  final NamedResource community;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final visibility = requireString(community.raw, 'visibility');
    final slug = requireString(community.raw, 'slug');
    return SyloraGlassTile(
      onTap: () => context.pushNamed(
        'community',
        pathParameters: <String, String>{'slug': slug},
      ),
      child: Row(
        children: <Widget>[
          const SyloraPulseGlow(
            child: Icon(
              Icons.groups_2_rounded,
              color: SyloraTokens.violet,
              size: 30,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(community.label, style: SyloraTokens.title(17)),
                const SizedBox(height: 3),
                Text(
                  community.description?.trim().isNotEmpty == true
                      ? community.description!
                      : '/$slug',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: SyloraTokens.body(13, color: SyloraTokens.inkMute),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          LumenBadge(
            label: community.status == 'active'
                ? l10n.communitiesJoined
                : switch (visibility) {
                    'private' => l10n.communitiesVisibilityPrivateShort,
                    'invite_only' => l10n.communitiesVisibilityInviteOnly,
                    _ => l10n.communitiesVisibilityPublic,
                  },
          ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

final class CommunityScreen extends ConsumerWidget {
  const CommunityScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(communityProvider(slug));
    return Scaffold(
      appBar: AppBar(title: Text(slug)),
      body: value.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => LumenErrorView(
          error: error,
          onRetry: () => ref.invalidate(communityProvider(slug)),
        ),
        data: (snapshot) {
          final membership = snapshot.community.status;
          final joined = membership == 'active';
          return ListView(
            padding: const EdgeInsets.all(20),
            children: <Widget>[
              LumenSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      snapshot.community.label,
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    if (snapshot.community.description != null) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(snapshot.community.description!),
                    ],
                    const SizedBox(height: 16),
                    LumenPrimaryButton(
                      label: joined
                          ? l10n.communitiesLeave
                          : l10n.communitiesJoin,
                      icon: joined
                          ? Icons.exit_to_app_rounded
                          : Icons.group_add_outlined,
                      onPressed: () async {
                        if (joined) {
                          await ref
                              .read(socialRepositoryProvider)
                              .leaveCommunity(slug);
                        } else {
                          final status = await ref
                              .read(socialRepositoryProvider)
                              .joinCommunity(slug);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  status == 'pending'
                                      ? l10n.communitiesMembershipPending
                                      : l10n.communitiesMembershipStatus(
                                          status,
                                        ),
                                ),
                              ),
                            );
                          }
                        }
                        ref.invalidate(communityProvider(slug));
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text(
                l10n.communitiesChannels,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              if (snapshot.channels.isEmpty)
                LumenEmptyView(
                  title: l10n.communitiesNoChannelsTitle,
                  message: l10n.communitiesNoChannelsMessage,
                  actionLabel: l10n.commonRefresh,
                  onAction: () => ref.invalidate(communityProvider(slug)),
                  icon: Icons.tag_rounded,
                )
              else
                LumenSurface(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: <Widget>[
                      for (final channel in snapshot.channels)
                        ListTile(
                          leading: const Icon(Icons.tag_rounded),
                          title: Text(channel.label),
                          subtitle: Text(channel.description ?? ''),
                        ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

final class PublicProfileScreen extends ConsumerWidget {
  const PublicProfileScreen({required this.handle, super.key});

  final String handle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(publicProfileProvider(handle));
    final width = MediaQuery.sizeOf(context).width;
    final actionWidth = width < 620 ? double.infinity : 200.0;
    return LumenPage(
      title: '@$handle',
      subtitle: l10n.profileSubtitle,
      intensity: 0.9,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      child: LumenAsyncView<ProfileModel>(
        value: value,
        onRetry: () => ref.invalidate(publicProfileProvider(handle)),
        data: (profile) => Column(
          children: <Widget>[
            SyloraStaggeredReveal(
              index: 0,
              child: SyloraUniverseHero(
                eyebrow: l10n.navProfile.toUpperCase(),
                title: profile.displayName,
                body: profile.bio?.trim().isNotEmpty == true
                    ? profile.bio!
                    : '@${profile.handle}',
                trailing: Center(
                  child: SyloraPulseGlow(
                    child: SyloraAvatarOrb(
                      label: profile.displayName,
                      imageUrl: profile.avatarUrl,
                      size: 88,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: SyloraTokens.space4),
            SyloraStaggeredReveal(
              index: 1,
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: <Widget>[
                  SizedBox(
                    width: actionWidth,
                    child: LumenPrimaryButton(
                      label: profile.followedByViewer
                          ? l10n.profileUnfollow
                          : l10n.profileFollow,
                      icon: Icons.person_add_alt_1_rounded,
                      onPressed: () async {
                        final repository = ref.read(socialRepositoryProvider);
                        if (profile.followedByViewer) {
                          await repository.unfollow(handle);
                        } else {
                          final status = await repository.follow(handle);
                          if (context.mounted) {
                            ScaffoldMessenger.of(
                              context,
                            ).showSnackBar(SnackBar(content: Text(status)));
                          }
                        }
                        ref.invalidate(publicProfileProvider(handle));
                      },
                    ),
                  ),
                  SizedBox(
                    width: actionWidth,
                    child: _ProfileFriendButton(
                      handle: handle,
                      profile: profile,
                    ),
                  ),
                  SizedBox(
                    width: actionWidth,
                    child: LumenSecondaryButton(
                      label: l10n.profileMessage,
                      icon: Icons.chat_outlined,
                      onPressed: () async {
                        final conversation = await ref
                            .read(messagingRepositoryProvider)
                            .createConversation(handle);
                        if (context.mounted) {
                          await context.pushNamed(
                            'conversation',
                            pathParameters: <String, String>{
                              'id': conversation.id,
                            },
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: SyloraTokens.space3),
            Wrap(
              spacing: 8,
              children: <Widget>[
                TextButton(
                  onPressed: () async {
                    await ref.read(socialRepositoryProvider).mute(handle, true);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.profileMuted)),
                      );
                    }
                  },
                  child: Text(l10n.profileMute),
                ),
                TextButton(
                  onPressed: () async {
                    await ref
                        .read(socialRepositoryProvider)
                        .block(handle, true);
                    if (context.mounted) {
                      context.pop();
                    }
                  },
                  child: Text(l10n.profileBlock),
                ),
                if (ref.watch(authControllerProvider).user?.id !=
                    profile.userId)
                  TextButton.icon(
                    onPressed: () => _showReportDialog(
                      context,
                      ref,
                      targetType: 'user',
                      targetId: profile.userId,
                      targetLabel: '@$handle',
                    ),
                    icon: const Icon(Icons.flag_outlined),
                    label: const Text('Report'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

final class _ProfileFriendButton extends ConsumerStatefulWidget {
  const _ProfileFriendButton({required this.handle, required this.profile});

  final String handle;
  final ProfileModel profile;

  @override
  ConsumerState<_ProfileFriendButton> createState() =>
      _ProfileFriendButtonState();
}

final class _ProfileFriendButtonState
    extends ConsumerState<_ProfileFriendButton> {
  String? _localStatus;
  bool _locallyUnfriended = false;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final requests = ref.watch(friendRequestsProvider);
    final outgoingPending = requests.maybeWhen(
      data: (value) =>
          value.outgoing.any((request) => request.handle == widget.handle),
      orElse: () => false,
    );
    final accepted =
        !_locallyUnfriended &&
        (widget.profile.friendWithViewer || _localStatus == 'friends');
    final pending =
        !accepted && (_localStatus == 'requested' || outgoingPending);
    return SyloraButton(
      label: accepted
          ? l10n.friendsUnfriend
          : pending
          ? l10n.friendsPendingOutgoing
          : l10n.friendsAddFriend,
      icon: accepted
          ? Icons.group_rounded
          : pending
          ? Icons.hourglass_top_rounded
          : Icons.group_add_outlined,
      variant: accepted
          ? SyloraButtonVariant.secondary
          : SyloraButtonVariant.primary,
      busy: _busy,
      onPressed: pending || _busy ? null : () => _toggle(accepted),
    );
  }

  Future<void> _toggle(bool accepted) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _busy = true);
    try {
      final repository = ref.read(socialRepositoryProvider);
      if (accepted) {
        await repository.unfriend(widget.handle);
        _localStatus = null;
        _locallyUnfriended = true;
      } else {
        final status = await repository.friend(widget.handle);
        _localStatus = status;
        _locallyUnfriended = false;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${l10n.friendsTitle}: $status')),
          );
        }
      }
      _invalidateFriendSurfaces(ref, widget.handle);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

final class _NotificationsScreenState
    extends ConsumerState<NotificationsScreen> {
  final Set<String> _busyIds = <String>{};
  bool _readingAll = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(notificationsProvider);
    final notifications = value.asData?.value.items;
    final unreadCount =
        notifications?.where((notification) => !notification.isRead).length ??
        0;
    return LumenPage(
      title: l10n.notificationsTitle,
      subtitle: unreadCount == 0
          ? l10n.notificationsEmptyMessage
          : '$unreadCount unread',
      intensity: 0.88,
      actions: <Widget>[
        TextButton(
          onPressed: unreadCount > 0 && !_readingAll ? _readAll : null,
          child: _readingAll
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(l10n.notificationsReadAll),
        ),
      ],
      header: SyloraUniverseHero(
        eyebrow: l10n.notificationsTitle.toUpperCase(),
        title: l10n.notificationsTitle,
        body: unreadCount == 0
            ? 'You are all caught up. In-app activity always appears here.'
            : '$unreadCount new ${unreadCount == 1 ? 'signal' : 'signals'} waiting for you.',
      ),
      child: LumenAsyncView<CursorPage<AppNotification>>(
        value: value,
        onRetry: () => ref.invalidate(notificationsProvider),
        data: (page) => page.items.isEmpty
            ? LumenEmptyView(
                title: l10n.notificationsEmpty,
                message: l10n.notificationsEmptyMessage,
                actionLabel: l10n.commonRefresh,
                onAction: () => ref.invalidate(notificationsProvider),
                icon: Icons.notifications_none_rounded,
              )
            : _buildGroups(page.items),
      ),
    );
  }

  Widget _buildGroups(List<AppNotification> notifications) {
    final groups = <String, List<AppNotification>>{};
    for (final notification in notifications) {
      groups
          .putIfAbsent(_dayLabel(notification.createdAt), () => [])
          .add(notification);
    }
    var revealIndex = 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (final group in groups.entries) ...<Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 4, 10),
            child: Text(group.key, style: SyloraTokens.label(12)),
          ),
          for (final notification in group.value)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SyloraStaggeredReveal(
                index: revealIndex++,
                child: _notificationTile(notification),
              ),
            ),
        ],
      ],
    );
  }

  Widget _notificationTile(AppNotification notification) {
    final destination = notificationDestination(notification);
    final busy = _busyIds.contains(notification.id);
    final color = notification.isRead
        ? SyloraTokens.inkSoft
        : SyloraTokens.violet;
    return SyloraGlassTile(
      onTap: busy ? null : () => _open(notification, destination),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Stack(
              clipBehavior: Clip.none,
              children: <Widget>[
                Icon(_notificationIcon(notification.type), color: color),
                if (!notification.isRead)
                  Positioned(
                    right: -2,
                    top: -3,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: SyloraTokens.petal,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  _notificationTitle(notification),
                  style: SyloraTokens.body(
                    15,
                    color: SyloraTokens.ink,
                    weight: notification.isRead
                        ? FontWeight.w500
                        : FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${_notificationDetail(notification)} · '
                  '${DateFormat.jm().format(notification.createdAt.toLocal())}',
                  style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
                ),
              ],
            ),
          ),
          if (busy)
            const Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else ...<Widget>[
            if (!notification.isRead)
              IconButton(
                tooltip: 'Mark as read',
                onPressed: () => _markRead(notification),
                icon: const Icon(Icons.done_rounded),
              ),
            PopupMenuButton<String>(
              tooltip: 'Notification options',
              onSelected: (action) {
                if (action == 'mute') {
                  _mute(notification);
                }
              },
              itemBuilder: (context) => <PopupMenuEntry<String>>[
                PopupMenuItem<String>(
                  value: 'mute',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.notifications_off_outlined),
                    title: Text(
                      AppLocalizations.of(context).notificationsMuteType,
                    ),
                  ),
                ),
              ],
            ),
            if (destination != null)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Icon(Icons.chevron_right_rounded),
              ),
          ],
        ],
      ),
    );
  }

  Future<void> _readAll() async {
    setState(() => _readingAll = true);
    try {
      await ref.read(socialRepositoryProvider).readAllNotifications();
      ref.invalidate(notificationsProvider);
    } on Object catch (error) {
      _showNotificationError(error);
    } finally {
      if (mounted) {
        setState(() => _readingAll = false);
      }
    }
  }

  Future<void> _markRead(AppNotification notification) async {
    setState(() => _busyIds.add(notification.id));
    try {
      await ref
          .read(socialRepositoryProvider)
          .readNotification(notification.id);
      ref.invalidate(notificationsProvider);
    } on Object catch (error) {
      _showNotificationError(error);
    } finally {
      if (mounted) {
        setState(() => _busyIds.remove(notification.id));
      }
    }
  }

  Future<void> _open(
    AppNotification notification,
    NotificationDestination? destination,
  ) async {
    if (!notification.isRead) {
      await _markRead(notification);
      if (!mounted) return;
    }
    if (destination != null) {
      await context.pushNamed(
        destination.routeName,
        pathParameters: destination.pathParameters,
      );
    }
  }

  Future<void> _mute(AppNotification notification) async {
    setState(() => _busyIds.add(notification.id));
    try {
      await ref
          .read(socialRepositoryProvider)
          .muteNotificationType(notification.type, true);
      ref.invalidate(notificationsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${notification.type} notifications muted')),
        );
      }
    } on Object catch (error) {
      _showNotificationError(error);
    } finally {
      if (mounted) {
        setState(() => _busyIds.remove(notification.id));
      }
    }
  }

  void _showNotificationError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
  }

  String _dayLabel(DateTime value) {
    final local = value.toLocal();
    final today = DateUtils.dateOnly(DateTime.now());
    final date = DateUtils.dateOnly(local);
    if (date == today) return 'Today';
    if (date == today.subtract(const Duration(days: 1))) return 'Yesterday';
    return DateFormat.MMMEd().format(local);
  }

  String _notificationTitle(AppNotification notification) =>
      switch (notification.type) {
        'follow' => 'Someone followed you',
        'follow_request' => 'New follow request',
        'follow_accepted' => 'Follow request accepted',
        'friend_request' => 'New friend request',
        'friend_accepted' => 'Friend request accepted',
        'community_invitation' => 'Community invitation',
        'community_membership_approved' => 'Community request approved',
        'comment' => 'New comment on your post',
        'reply' => 'New reply to your comment',
        'reaction' => 'New reaction',
        'repost' => 'Your post was reposted',
        'message_request' => 'New message request',
        'moderation_decision' ||
        'trust_safety_decision' => 'Safety review updated',
        _ => notification.type.replaceAll('_', ' '),
      };

  String _notificationDetail(AppNotification notification) {
    final reaction = notification.metadata['reaction'];
    if (reaction is String && reaction.isNotEmpty) {
      return '$reaction reaction';
    }
    final status = notification.metadata['status'];
    if (status is String && status.isNotEmpty) {
      return 'Status: ${status.replaceAll('_', ' ')}';
    }
    return notificationDestination(notification) == null
        ? 'Activity update'
        : 'Tap to view';
  }

  IconData _notificationIcon(String type) => switch (type) {
    'follow' ||
    'follow_request' ||
    'follow_accepted' => Icons.person_add_alt_1_rounded,
    'friend_request' || 'friend_accepted' => Icons.group_rounded,
    'community_invitation' ||
    'community_membership_approved' => Icons.diversity_3_rounded,
    'comment' || 'reply' => Icons.chat_bubble_outline_rounded,
    'reaction' => Icons.favorite_rounded,
    'repost' => Icons.repeat_rounded,
    'message_request' => Icons.mark_chat_unread_rounded,
    'moderation_decision' || 'trust_safety_decision' => Icons.shield_outlined,
    _ => Icons.notifications_active_outlined,
  };
}

final class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(conversationsProvider);
    return LumenPage(
      title: l10n.messagesTitle,
      subtitle: l10n.messagesSubtitle,
      intensity: 0.94,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.messagesNewConversation,
          onPressed: () => _createConversation(context, ref),
          icon: const Icon(Icons.add_comment_outlined),
        ),
      ],
      header: SyloraUniverseHero(
        eyebrow: l10n.messagesHeroEyebrow,
        title: l10n.messagesTitle,
        body: l10n.messagesHeroBody,
        trailing: SyloraPortalChip(
          label: l10n.messagesNewConversation,
          icon: Icons.edit_square,
          onTap: () => _createConversation(context, ref),
        ),
      ),
      child: LumenAsyncView<List<ConversationModel>>(
        value: value,
        onRetry: () => ref.invalidate(conversationsProvider),
        data: (items) => items.isEmpty
            ? LumenEmptyView(
                title: l10n.messagesEmpty,
                message: l10n.messagesEmptyMessage,
                actionLabel: l10n.messagesNewConversation,
                onAction: () => _createConversation(context, ref),
                icon: Icons.forum_outlined,
              )
            : Column(
                children: <Widget>[
                  for (var i = 0; i < items.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: SyloraStaggeredReveal(
                        index: i,
                        child: _ConversationRow(conversation: items[i]),
                      ),
                    ),
                ],
              ),
      ),
    );
  }

  Future<void> _createConversation(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final handle = TextEditingController();
    final result = await showDialog<ConversationModel>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.messagesNewConversation),
        content: TextField(
          controller: handle,
          autofocus: true,
          decoration: InputDecoration(labelText: l10n.messagesRecipientHandle),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () async {
              final normalized = handle.text.trim().replaceFirst('@', '');
              if (normalized.length < 3) {
                return;
              }
              try {
                final conversation = await ref
                    .read(messagingRepositoryProvider)
                    .createConversation(normalized);
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, conversation);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: Text(l10n.messagesStart),
          ),
        ],
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    handle.dispose();
    if (result != null && context.mounted) {
      ref.invalidate(conversationsProvider);
      await context.pushNamed(
        'conversation',
        pathParameters: <String, String>{'id': result.id},
      );
    }
  }
}

final class _ConversationRow extends ConsumerWidget {
  const _ConversationRow({required this.conversation});

  final ConversationModel conversation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final isRequest = conversation.state == 'request';
    final stamp = DateFormat.MMMd().add_Hm().format(
      conversation.updatedAt.toLocal(),
    );
    return SyloraGlassTile(
      onTap: () => context.pushNamed(
        'conversation',
        pathParameters: <String, String>{'id': conversation.id},
      ),
      child: Row(
        children: <Widget>[
          SyloraPulseGlow(
            color: isRequest ? SyloraTokens.petal : SyloraTokens.ion,
            child: SyloraAvatarOrb(
              label: conversation.id,
              size: 48,
              online: !isRequest,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '${l10n.messagesConversationTitle} '
                  '${conversation.id.substring(0, 8)}',
                  style: SyloraTokens.title(16),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  isRequest ? l10n.messagesRequestBadge : stamp,
                  style: SyloraTokens.body(13, color: SyloraTokens.inkMute),
                ),
              ],
            ),
          ),
          if (isRequest)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                IconButton(
                  tooltip: l10n.messagesDeclineRequest,
                  onPressed: () async {
                    await ref
                        .read(messagingRepositoryProvider)
                        .declineRequest(conversation.id);
                    ref.invalidate(conversationsProvider);
                  },
                  icon: const Icon(Icons.close_rounded),
                ),
                IconButton.filledTonal(
                  tooltip: l10n.messagesAcceptRequest,
                  onPressed: () async {
                    await ref
                        .read(messagingRepositoryProvider)
                        .acceptRequest(conversation.id);
                    ref.invalidate(conversationsProvider);
                  },
                  icon: const Icon(Icons.check_rounded),
                ),
              ],
            )
          else
            const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

final class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({required this.conversationId, super.key});

  final String conversationId;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

final class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final _message = TextEditingController();
  final _messageFocus = FocusNode();
  StreamSubscription<JsonObject>? _events;
  String? _lastReadMessageId;

  @override
  void initState() {
    super.initState();
    if (realtimeSupported) {
      _events = ref.read(messagingRepositoryProvider).events().listen((event) {
        if (event['conversation_id'] == widget.conversationId) {
          ref.invalidate(messageHistoryProvider(widget.conversationId));
        }
      });
    }
  }

  @override
  void dispose() {
    _events?.cancel();
    _message.dispose();
    _messageFocus.dispose();
    super.dispose();
  }

  Future<void> _startCall(
    BuildContext context, {
    required String purpose,
    required String title,
  }) async {
    try {
      final room = await ref
          .read(conferenceRepositoryProvider)
          .create(title: title, purpose: purpose);
      await ref.read(conferenceRepositoryProvider).join(room.id);
      if (!context.mounted) {
        return;
      }
      await context.pushNamed(
        'conference-room',
        pathParameters: <String, String>{'id': room.id},
      );
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(messageHistoryProvider(widget.conversationId));
    final me = ref.watch(authControllerProvider).user?.id;
    return SyloraLivingScaffold(
      intensity: 0.86,
      showOrbits: MediaQuery.sizeOf(context).width < 900,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: SyloraTokens.glassStrong,
          title: Text(
            l10n.messagesConversationTitle,
            style: SyloraTokens.title(18),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          actions: <Widget>[
            IconButton(
              tooltip: 'Voice call',
              onPressed: () =>
                  _startCall(context, purpose: 'social', title: 'Voice call'),
              icon: const Icon(Icons.call_rounded),
            ),
            IconButton(
              tooltip: 'Video call',
              onPressed: () =>
                  _startCall(context, purpose: 'social', title: 'Video call'),
              icon: const Icon(Icons.videocam_rounded),
            ),
            IconButton(
              tooltip: 'Conference',
              onPressed: () => _startCall(
                context,
                purpose: 'social',
                title: 'Group conference',
              ),
              icon: const Icon(Icons.groups_rounded),
            ),
          ],
        ),
        body: Column(
          children: <Widget>[
            if (!realtimeSupported)
              MaterialBanner(
                content: Text(realtimeUnsupportedReason!),
                actions: const <Widget>[SizedBox.shrink()],
              ),
            Expanded(
              child: LumenAsyncView<CursorPage<MessageModel>>(
                value: value,
                onRetry: () => ref.invalidate(
                  messageHistoryProvider(widget.conversationId),
                ),
                data: (page) {
                  if (page.items.isNotEmpty &&
                      _lastReadMessageId != page.items.first.id) {
                    _lastReadMessageId = page.items.first.id;
                    WidgetsBinding.instance.addPostFrameCallback((_) async {
                      try {
                        await ref
                            .read(messagingRepositoryProvider)
                            .markRead(
                              widget.conversationId,
                              page.items.first.id,
                            );
                      } on Object catch (error) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(messageFor(error))),
                          );
                        }
                      }
                    });
                  }
                  return page.items.isEmpty
                      ? LumenEmptyView(
                          title: l10n.messagesEmpty,
                          message: l10n.messagesEmptyMessage,
                          actionLabel: l10n.messagesTypeMessage,
                          onAction: _messageFocus.requestFocus,
                          icon: Icons.mark_chat_unread_outlined,
                        )
                      : ListView.builder(
                          reverse: true,
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          itemCount: page.items.length,
                          itemBuilder: (context, index) {
                            final message = page.items[index];
                            final mine = me != null && message.senderId == me;
                            return SyloraStaggeredReveal(
                              index: index,
                              slide: 10,
                              child: Align(
                                alignment: mine
                                    ? Alignment.centerRight
                                    : Alignment.centerLeft,
                                child: ConstrainedBox(
                                  constraints: BoxConstraints(
                                    maxWidth:
                                        MediaQuery.sizeOf(context).width * 0.78,
                                  ),
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 10),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(
                                        SyloraTokens.radiusMd,
                                      ),
                                      gradient: LinearGradient(
                                        colors: mine
                                            ? const <Color>[
                                                SyloraTokens.ion,
                                                SyloraTokens.violet,
                                              ]
                                            : <Color>[
                                                Colors.white.withValues(
                                                  alpha: 0.92,
                                                ),
                                                SyloraTokens.mist.withValues(
                                                  alpha: 0.35,
                                                ),
                                              ],
                                      ),
                                      boxShadow: mine
                                          ? SyloraTokens.glow(
                                              SyloraTokens.violet,
                                              blur: 16,
                                              opacity: 0.2,
                                            )
                                          : null,
                                    ),
                                    child: Text(
                                      message.body,
                                      style: SyloraTokens.body(
                                        15,
                                        color: mine
                                            ? Colors.white
                                            : SyloraTokens.ink,
                                        weight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        );
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: SyloraGlass(
                  radius: SyloraTokens.radiusPill,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        child: TextField(
                          controller: _message,
                          focusNode: _messageFocus,
                          minLines: 1,
                          maxLines: 5,
                          decoration: InputDecoration(
                            hintText: l10n.messagesTypeMessage,
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                      IconButton.filled(
                        tooltip: l10n.messagesSend,
                        onPressed: () async {
                          final text = _message.text.trim();
                          if (text.isEmpty) {
                            return;
                          }
                          await ref
                              .read(messagingRepositoryProvider)
                              .send(widget.conversationId, text);
                          _message.clear();
                          ref.invalidate(
                            messageHistoryProvider(widget.conversationId),
                          );
                        },
                        icon: const Icon(Icons.send_rounded),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
