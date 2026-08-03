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
import '../platform/repositories.dart';

final feedProvider = FutureProvider.autoDispose<CursorPage<PostModel>>(
  (ref) => ref.watch(socialRepositoryProvider).feed(),
);

final recommendationsProvider = FutureProvider.autoDispose<List<PostModel>>(
  (ref) => ref.watch(socialRepositoryProvider).recommendations(),
);

final notificationsProvider =
    FutureProvider.autoDispose<CursorPage<NamedResource>>(
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final feed = ref.watch(feedProvider);
    return LumenPage(
      title: l10n.feedTitle,
      subtitle: l10n.feedSubtitle,
      actions: <Widget>[
        IconButton(
          tooltip: 'Notifications',
          onPressed: () => context.pushNamed('notifications'),
          icon: const Icon(Icons.notifications_outlined),
        ),
        IconButton(
          tooltip: l10n.feedCreatePost,
          onPressed: () => _showComposer(context, ref),
          icon: const Icon(Icons.edit_outlined),
        ),
      ],
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
              for (final post in posts) ...<Widget>[
                PostCard(post: post),
                const SizedBox(height: 16),
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

final class PostCard extends ConsumerWidget {
  const PostCard({required this.post, super.key});

  final PostModel post;

  @override
  Widget build(BuildContext context, WidgetRef ref) => LumenSurface(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            CircleAvatar(
              child: Text(post.authorHandle.characters.first.toUpperCase()),
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
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      DateFormat.yMMMd().add_jm().format(
                        post.createdAt.toLocal(),
                      ),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ),
            LumenBadge(label: post.rawLifecycle),
          ],
        ),
        const SizedBox(height: 16),
        Text(post.body, style: Theme.of(context).textTheme.bodyLarge),
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
  Widget build(BuildContext context) => LumenPage(
    title: 'Search',
    subtitle: 'Search current users, posts, and communities.',
    child: Column(
      children: <Widget>[
        SearchBar(
          controller: _query,
          focusNode: _searchFocus,
          hintText: 'Search SYLORA',
          leading: const Icon(Icons.search_rounded),
          trailing: <Widget>[
            IconButton(
              tooltip: 'Search',
              onPressed: _search,
              icon: const Icon(Icons.arrow_forward_rounded),
            ),
          ],
          onSubmitted: (_) => _search(),
        ),
        const SizedBox(height: 20),
        if (_results == null)
          LumenEmptyView(
            title: 'Find your people',
            message:
                'Enter at least two characters to query the live SYLORA index.',
            actionLabel: 'Focus search',
            onAction: _searchFocus.requestFocus,
            icon: Icons.travel_explore_rounded,
          )
        else
          FutureBuilder<SocialSearchBundle>(
            future: _results,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                );
              }
              if (snapshot.hasError) {
                return LumenErrorView(error: snapshot.error!, onRetry: _search);
              }
              final data = snapshot.requireData;
              if (data.users.isEmpty &&
                  data.posts.isEmpty &&
                  data.communities.isEmpty) {
                return LumenEmptyView(
                  title: 'No results',
                  message:
                      'The API returned no users, posts, or communities for this query.',
                  actionLabel: 'Edit search',
                  onAction: _searchFocus.requestFocus,
                  icon: Icons.search_off_rounded,
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  if (data.users.isNotEmpty) ...<Widget>[
                    Text(
                      'People',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    for (final user in data.users)
                      ListTile(
                        title: Text(user.displayName),
                        subtitle: Text('@${user.handle}'),
                        onTap: () => context.pushNamed(
                          'public-profile',
                          pathParameters: <String, String>{
                            'handle': user.handle!,
                          },
                        ),
                      ),
                  ],
                  if (data.posts.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 16),
                    Text(
                      'Posts',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    for (final post in data.posts) ...<Widget>[
                      PostCard(post: post),
                      const SizedBox(height: 12),
                    ],
                  ],
                  if (data.communities.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 16),
                    Text(
                      'Communities',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    for (final community in data.communities)
                      ListTile(
                        title: Text(community.label),
                        subtitle: Text(community.description ?? ''),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => context.pushNamed(
                          'community',
                          pathParameters: <String, String>{
                            'slug': requireString(community.raw, 'slug'),
                          },
                        ),
                      ),
                  ],
                ],
              );
            },
          ),
      ],
    ),
  );

  void _search() {
    final query = _query.text.trim();
    if (query.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter at least two characters.')),
      );
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
      subtitle: 'Real friendships, requests, and people you may know.',
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
    await ref.refresh(friendsSnapshotProvider.future);
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
          : lastSeen == null
          ? l10n.friendsOnly
          : lastSeen,
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
    super.key,
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

final class CommunityScreen extends ConsumerWidget {
  const CommunityScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                      label: joined ? 'Leave community' : 'Join community',
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
                                      ? 'Membership request submitted.'
                                      : 'Community membership: $status',
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
                'Channels',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              if (snapshot.channels.isEmpty)
                LumenEmptyView(
                  title: 'No visible channels',
                  message: 'The API returned no channels for this community.',
                  actionLabel: 'Refresh',
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
    final value = ref.watch(publicProfileProvider(handle));
    return LumenPage(
      title: '@$handle',
      subtitle: 'Public profile and relationship controls from the social API.',
      child: LumenAsyncView<ProfileModel>(
        value: value,
        onRetry: () => ref.invalidate(publicProfileProvider(handle)),
        data: (profile) => LumenSurface(
          child: Column(
            children: <Widget>[
              CircleAvatar(
                radius: 44,
                backgroundImage: profile.avatarUrl == null
                    ? null
                    : NetworkImage(profile.avatarUrl!),
                child: profile.avatarUrl == null
                    ? Text(profile.displayName.characters.first.toUpperCase())
                    : null,
              ),
              const SizedBox(height: 12),
              Text(
                profile.displayName,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              Text('@${profile.handle}'),
              if (profile.bio != null) ...<Widget>[
                const SizedBox(height: 12),
                Text(profile.bio!, textAlign: TextAlign.center),
              ],
              const SizedBox(height: 20),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: <Widget>[
                  SizedBox(
                    width: 180,
                    child: LumenPrimaryButton(
                      label: profile.followedByViewer ? 'Unfollow' : 'Follow',
                      icon: Icons.person_add_alt_1_rounded,
                      onPressed: () async {
                        final repository = ref.read(socialRepositoryProvider);
                        if (profile.followedByViewer) {
                          await repository.unfollow(handle);
                        } else {
                          final status = await repository.follow(handle);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Follow status: $status')),
                            );
                          }
                        }
                        ref.invalidate(publicProfileProvider(handle));
                      },
                    ),
                  ),
                  SizedBox(
                    width: 180,
                    child: _ProfileFriendButton(
                      handle: handle,
                      profile: profile,
                    ),
                  ),
                  SizedBox(
                    width: 180,
                    child: LumenSecondaryButton(
                      label: 'Message',
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
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: <Widget>[
                  TextButton(
                    onPressed: () async {
                      await ref
                          .read(socialRepositoryProvider)
                          .mute(handle, true);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Account muted.')),
                        );
                      }
                    },
                    child: const Text('Mute'),
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
                    child: const Text('Block'),
                  ),
                ],
              ),
            ],
          ),
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

final class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: <Widget>[
          TextButton(
            onPressed: () async {
              await ref.read(socialRepositoryProvider).readAllNotifications();
              ref.invalidate(notificationsProvider);
            },
            child: const Text('Read all'),
          ),
        ],
      ),
      body: LumenAsyncView<CursorPage<NamedResource>>(
        value: value,
        onRetry: () => ref.invalidate(notificationsProvider),
        data: (page) => page.items.isEmpty
            ? LumenEmptyView(
                title: 'No notifications',
                message: 'The API returned no notification events.',
                actionLabel: 'Refresh',
                onAction: () => ref.invalidate(notificationsProvider),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: page.items.length,
                itemBuilder: (context, index) {
                  final item = page.items[index];
                  return ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text(item.label),
                    onTap: () async {
                      await ref
                          .read(socialRepositoryProvider)
                          .readNotification(item.id);
                      ref.invalidate(notificationsProvider);
                    },
                    trailing: IconButton(
                      tooltip: 'Mute this notification type',
                      onPressed: () async {
                        await ref
                            .read(socialRepositoryProvider)
                            .muteNotificationType(item.label, true);
                        ref.invalidate(notificationsProvider);
                      },
                      icon: const Icon(Icons.notifications_off_outlined),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

final class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(conversationsProvider);
    return LumenPage(
      title: l10n.messagesTitle,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.messagesNewConversation,
          onPressed: () => _createConversation(context, ref),
          icon: const Icon(Icons.add_comment_outlined),
        ),
      ],
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
                  for (final conversation in items)
                    Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.person_outline),
                        ),
                        title: Text(
                          '${l10n.messagesConversationTitle} '
                          '${conversation.id.substring(0, 8)}',
                        ),
                        subtitle: Text(conversation.state),
                        trailing: conversation.state == 'request'
                            ? Row(
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
                            : const Icon(Icons.chevron_right_rounded),
                        onTap: () => context.pushNamed(
                          'conversation',
                          pathParameters: <String, String>{
                            'id': conversation.id,
                          },
                        ),
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(messageHistoryProvider(widget.conversationId));
    return Scaffold(
      appBar: AppBar(title: Text(l10n.messagesConversationTitle)),
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
              onRetry: () =>
                  ref.invalidate(messageHistoryProvider(widget.conversationId)),
              data: (page) {
                if (page.items.isNotEmpty &&
                    _lastReadMessageId != page.items.first.id) {
                  _lastReadMessageId = page.items.first.id;
                  WidgetsBinding.instance.addPostFrameCallback((_) async {
                    try {
                      await ref
                          .read(messagingRepositoryProvider)
                          .markRead(widget.conversationId, page.items.first.id);
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
                        padding: const EdgeInsets.all(16),
                        itemCount: page.items.length,
                        itemBuilder: (context, index) {
                          final message = page.items[index];
                          return Align(
                            alignment: Alignment.centerLeft,
                            child: Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Text(message.body),
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
              padding: const EdgeInsets.all(12),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: TextField(
                      controller: _message,
                      focusNode: _messageFocus,
                      minLines: 1,
                      maxLines: 5,
                      decoration: InputDecoration(
                        labelText: l10n.messagesTypeMessage,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
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
        ],
      ),
    );
  }
}
