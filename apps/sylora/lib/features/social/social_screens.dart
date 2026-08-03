import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../core/realtime.dart';
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
    final feed = ref.watch(feedProvider);
    return LumenPage(
      title: 'Home',
      subtitle: 'Current posts from the SYLORA social API.',
      actions: <Widget>[
        IconButton(
          tooltip: 'Notifications',
          onPressed: () => context.pushNamed('notifications'),
          icon: const Icon(Icons.notifications_outlined),
        ),
        IconButton(
          tooltip: 'Write a post',
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
              title: 'Your feed is quiet',
              message:
                  'No published posts were returned. Publish a post or follow people to shape your feed.',
              actionLabel: 'Write a post',
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
                  label: _loadingMore ? 'Loading posts…' : 'Load more posts',
                  icon: Icons.expand_more_rounded,
                  onPressed: _loadingMore ? null : _loadMore,
                  disabledReason: _loadingMore
                      ? 'The next feed page is loading.'
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
    final body = TextEditingController();
    var publish = true;
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Create a post'),
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
                  decoration: const InputDecoration(
                    labelText: 'Plain-text post',
                    alignLabelWithHint: true,
                  ),
                ),
                SwitchListTile(
                  value: publish,
                  onChanged: (value) => setState(() => publish = value),
                  title: Text(publish ? 'Publish now' : 'Save as draft'),
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
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
              child: Text(publish ? 'Publish' : 'Save draft'),
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
    final value = ref.watch(recommendationsProvider);
    return Padding(
      padding: const EdgeInsets.all(20),
      child: LumenSurface(
        child: value.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Text('Recommendations unavailable'),
              TextButton(
                onPressed: () => ref.invalidate(recommendationsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
          data: (posts) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('For you', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 16),
              if (posts.isEmpty)
                Text(
                  'The API has no recommendations yet.',
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
                    child: LumenSecondaryButton(
                      label: 'Friend',
                      icon: Icons.group_add_outlined,
                      onPressed: () async {
                        final status = await ref
                            .read(socialRepositoryProvider)
                            .friend(handle);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Friend status: $status')),
                          );
                        }
                      },
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
    final value = ref.watch(conversationsProvider);
    return LumenPage(
      title: 'Messages',
      actions: <Widget>[
        IconButton(
          tooltip: 'New conversation',
          onPressed: () => _createConversation(context, ref),
          icon: const Icon(Icons.add_comment_outlined),
        ),
      ],
      child: LumenAsyncView<List<ConversationModel>>(
        value: value,
        onRetry: () => ref.invalidate(conversationsProvider),
        data: (items) => items.isEmpty
            ? LumenEmptyView(
                title: 'No conversations',
                message:
                    'No conversation history was returned. Start one with a public handle.',
                actionLabel: 'New conversation',
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
                          'Conversation ${conversation.id.substring(0, 8)}',
                        ),
                        subtitle: Text(conversation.state),
                        trailing: conversation.state == 'request'
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: <Widget>[
                                  IconButton(
                                    tooltip: 'Decline message request',
                                    onPressed: () async {
                                      await ref
                                          .read(messagingRepositoryProvider)
                                          .declineRequest(conversation.id);
                                      ref.invalidate(conversationsProvider);
                                    },
                                    icon: const Icon(Icons.close_rounded),
                                  ),
                                  IconButton.filledTonal(
                                    tooltip: 'Accept message request',
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
    final handle = TextEditingController();
    final result = await showDialog<ConversationModel>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New conversation'),
        content: TextField(
          controller: handle,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Recipient handle'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
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
            child: const Text('Start'),
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
    final value = ref.watch(messageHistoryProvider(widget.conversationId));
    return Scaffold(
      appBar: AppBar(title: const Text('Conversation')),
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
                        title: 'No messages yet',
                        message:
                            'The API returned an empty history. Send the first message.',
                        actionLabel: 'Focus message field',
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
                      decoration: const InputDecoration(labelText: 'Message'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: 'Send message',
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
