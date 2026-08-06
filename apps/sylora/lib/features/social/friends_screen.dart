import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/sylora_localizations.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../platform/repositories.dart';

final friendsProvider = FutureProvider.autoDispose<List<ProfileModel>>(
  (ref) => ref.watch(socialRepositoryProvider).friends(),
);

final friendRequestsProvider =
    FutureProvider.autoDispose<List<FriendRequestModel>>(
  (ref) => ref.watch(socialRepositoryProvider).friendRequests(),
);

final class FriendsScreen extends ConsumerWidget {
  const FriendsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    return DefaultTabController(
      length: 2,
      child: LumenPage(
        title: SyloraStrings.t(locale, 'nav_friends'),
        subtitle: 'Connections, requests, and people you trust on SYLORA.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const TabBar(
              tabs: <Tab>[
                Tab(text: 'Friends'),
                Tab(text: 'Requests'),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 640,
              child: TabBarView(
                children: <Widget>[
                  _FriendsList(
                    provider: friendsProvider,
                    emptyTitle: 'No friends yet',
                    emptyMessage:
                        'Send a friend request from someone\'s profile to connect.',
                  ),
                  _RequestsList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _FriendsList extends ConsumerWidget {
  const _FriendsList({
    required this.provider,
    required this.emptyTitle,
    required this.emptyMessage,
  });

  final AutoDisposeFutureProvider<List<ProfileModel>> provider;
  final String emptyTitle;
  final String emptyMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(provider);
    return LumenAsyncView<List<ProfileModel>>(
      value: value,
      onRetry: () => ref.invalidate(provider),
      data: (friends) {
        if (friends.isEmpty) {
          return LumenEmptyView(
            title: emptyTitle,
            message: emptyMessage,
            actionLabel: 'Search people',
            onAction: () => context.goNamed('search'),
            icon: Icons.people_outline_rounded,
          );
        }
        return ListView.separated(
          itemCount: friends.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final friend = friends[index];
            return LumenSurface(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  child: Text(
                    friend.displayName.isNotEmpty
                        ? friend.displayName[0].toUpperCase()
                        : '?',
                  ),
                ),
                title: Text(friend.displayName),
                subtitle: Text('@${friend.handle}'),
                trailing: IconButton(
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                  onPressed: () => context.goNamed('messages'),
                ),
                onTap: () => context.goNamed(
                  'public-profile',
                  pathParameters: <String, String>{
                    'handle': friend.handle ?? '',
                  },
                ),
              ),
            );
          },
        );
      },
    );
  }
}

final class _RequestsList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(friendRequestsProvider);
    return LumenAsyncView<List<FriendRequestModel>>(
      value: value,
      onRetry: () => ref.invalidate(friendRequestsProvider),
      data: (requests) {
        if (requests.isEmpty) {
          return const LumenEmptyView(
            title: 'No pending requests',
            message: 'Friend requests you receive will appear here.',
            actionLabel: 'Refresh',
            onAction: _noop,
            icon: Icons.inbox_outlined,
          );
        }
        return ListView.separated(
          itemCount: requests.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final request = requests[index];
            final profile = request.profile;
            return LumenSurface(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: <Widget>[
                  CircleAvatar(
                    child: Text(
                      profile.displayName.isNotEmpty
                          ? profile.displayName[0].toUpperCase()
                          : '?',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          profile.displayName,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text('@${profile.handle}'),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () async {
                      await ref
                          .read(socialRepositoryProvider)
                          .rejectFriendRequest(request.id);
                      ref.invalidate(friendRequestsProvider);
                    },
                    child: const Text('Decline'),
                  ),
                  const SizedBox(width: 4),
                  FilledButton(
                    onPressed: () async {
                      await ref
                          .read(socialRepositoryProvider)
                          .acceptFriendRequest(request.id);
                      ref.invalidate(friendRequestsProvider);
                      ref.invalidate(friendsProvider);
                    },
                    child: const Text('Accept'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

void _noop() {}
