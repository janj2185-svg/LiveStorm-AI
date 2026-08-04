import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/models.dart';
import '../../core/realtime.dart';
import '../auth/auth.dart';

@immutable
final class NamedResource {
  const NamedResource({
    required this.id,
    required this.label,
    required this.raw,
    this.status,
    this.description,
  });

  factory NamedResource.fromJson(
    JsonObject json, {
    String labelKey = 'name',
    String? statusKey,
    String? descriptionKey = 'description',
  }) => NamedResource(
    id: requireString(json, 'id'),
    label: requireString(json, labelKey),
    status: statusKey == null ? null : optionalString(json, statusKey),
    description: descriptionKey == null
        ? null
        : optionalString(json, descriptionKey),
    raw: json,
  );

  final String id;
  final String label;
  final String? status;
  final String? description;
  final JsonObject raw;
}

@immutable
final class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.metadata,
    required this.createdAt,
    this.actorUserId,
    this.targetType,
    this.targetId,
    this.readAt,
    this.mutedAt,
  });

  factory AppNotification.fromJson(JsonObject json) => AppNotification(
    id: requireString(json, 'id'),
    type: requireString(json, 'notification_type'),
    actorUserId: optionalString(json, 'actor_user_id'),
    targetType: optionalString(json, 'target_type'),
    targetId: optionalString(json, 'target_id'),
    metadata: requireObject(json['event_metadata'], 'notification metadata'),
    createdAt: requireDateTime(json, 'created_at'),
    readAt: optionalDateTime(json, 'read_at'),
    mutedAt: optionalDateTime(json, 'muted_at'),
  );

  final String id;
  final String type;
  final String? actorUserId;
  final String? targetType;
  final String? targetId;
  final JsonObject metadata;
  final DateTime createdAt;
  final DateTime? readAt;
  final DateTime? mutedAt;

  bool get isRead => readAt != null;
}

@immutable
final class NotificationDestination {
  const NotificationDestination(
    this.routeName, [
    this.pathParameters = const {},
  ]);

  final String routeName;
  final Map<String, String> pathParameters;
}

NotificationDestination? notificationDestination(AppNotification notification) {
  final targetId = notification.targetId;
  final handle = notification.metadata['handle'];
  final slug = notification.metadata['slug'];
  return switch (notification.targetType) {
    'post' when targetId != null => NotificationDestination(
      'post',
      <String, String>{'id': targetId},
    ),
    'conversation' when targetId != null => NotificationDestination(
      'conversation',
      <String, String>{'id': targetId},
    ),
    'live' || 'live_session' when targetId != null => NotificationDestination(
      'live-session',
      <String, String>{'id': targetId},
    ),
    'content' when targetId != null => NotificationDestination(
      'creator-content',
      <String, String>{'id': targetId},
    ),
    'user' when handle is String => NotificationDestination(
      'public-profile',
      <String, String>{'handle': handle},
    ),
    'user' ||
    'friendship' ||
    'follow_request' => const NotificationDestination('friends'),
    'community' when slug is String => NotificationDestination(
      'community',
      <String, String>{'slug': slug},
    ),
    'community' => const NotificationDestination('communities'),
    _ when notification.type == 'message_request' =>
      const NotificationDestination('messages'),
    _ => null,
  };
}

abstract interface class AccountRepository {
  Future<ProfileModel> profile();
  Future<ProfileModel> updateProfile(JsonObject patch);
  Future<AccountSettingsModel> settings();
  Future<AccountSettingsModel> updateSettings(JsonObject patch);
}

final class DioAccountRepository implements AccountRepository {
  const DioAccountRepository(this._client);

  final ApiClient _client;

  @override
  Future<ProfileModel> profile() async {
    final response = await _client.request('profile');
    return ProfileModel.fromOwnedJson(requireObject(response.data, 'profile'));
  }

  @override
  Future<ProfileModel> updateProfile(JsonObject patch) async {
    final response = await _client.request(
      'profile',
      method: 'PATCH',
      data: patch,
    );
    return ProfileModel.fromOwnedJson(requireObject(response.data, 'profile'));
  }

  @override
  Future<AccountSettingsModel> settings() async {
    final response = await _client.request('settings');
    return AccountSettingsModel.fromJson(
      requireObject(response.data, 'account settings'),
    );
  }

  @override
  Future<AccountSettingsModel> updateSettings(JsonObject patch) async {
    final response = await _client.request(
      'settings',
      method: 'PATCH',
      data: patch,
    );
    return AccountSettingsModel.fromJson(
      requireObject(response.data, 'account settings'),
    );
  }
}

@immutable
final class SocialSearchBundle {
  const SocialSearchBundle({
    required this.users,
    required this.posts,
    required this.communities,
  });

  final List<ProfileModel> users;
  final List<PostModel> posts;
  final List<NamedResource> communities;
}

abstract interface class SocialRepository {
  Future<CursorPage<PostModel>> feed({
    String mode = 'chronological',
    String? cursor,
  });
  Future<List<PostModel>> recommendations();
  Future<PostModel> createPost(String body, {bool publish = false});
  Future<PostModel> publishPost(String id);
  Future<PostModel> post(String id);
  Future<List<CommentModel>> comments(String postId);
  Future<CommentModel> comment(String postId, String body);
  Future<void> react(String targetType, String targetId, String value);
  Future<void> removeReaction(String targetType, String targetId);
  Future<void> setBookmark(String postId, bool value);
  Future<void> setRepost(String postId, bool value);
  Future<ProfileModel> publicProfile(String handle);
  Future<String> follow(String handle);
  Future<void> unfollow(String handle);
  Future<List<FriendSummaryModel>> listFriends();
  Future<FriendRequestsModel> friendRequests();
  Future<void> cancelFriendRequest(String id);
  Future<String> acceptFriendRequest(String id);
  Future<void> rejectFriendRequest(String id);
  Future<String> friend(String handle);
  Future<void> unfriend(String handle);
  Future<List<FriendSuggestionModel>> suggestions();
  Future<List<FriendSummaryModel>> mutuals(String handle);
  Future<void> block(String handle, bool value);
  Future<void> mute(String handle, bool value);
  Future<String> report({
    required String targetType,
    required String targetId,
    required String reason,
    String? evidence,
  });
  Future<SocialSearchBundle> search(String query);
  Future<List<NamedResource>> communities({String? query});
  Future<NamedResource> createCommunity({
    required String slug,
    required String name,
    String? description,
    String visibility = 'public',
  });
  Future<NamedResource> community(String slug);
  Future<String> joinCommunity(String slug);
  Future<void> leaveCommunity(String slug);
  Future<List<NamedResource>> channels(String slug);
  Future<CursorPage<AppNotification>> notifications({String? cursor});
  Future<void> readNotification(String id);
  Future<void> readAllNotifications();
  Future<void> muteNotificationType(String type, bool muted);
}

final class DioSocialRepository implements SocialRepository {
  const DioSocialRepository(this._client);

  final ApiClient _client;

  @override
  Future<CursorPage<PostModel>> feed({
    String mode = 'chronological',
    String? cursor,
  }) async {
    final response = await _client.request(
      'social/feed',
      queryParameters: <String, dynamic>{'mode': mode, 'cursor': cursor},
    );
    return CursorPage<PostModel>.fromJson(
      requireObject(response.data, 'feed'),
      PostModel.fromJson,
    );
  }

  @override
  Future<List<PostModel>> recommendations() async {
    final response = await _client.request('social/recommendations');
    return _array(response.data, 'recommendations')
        .map(
          (value) => PostModel.fromJson(
            requireObject(value['post'], 'recommended post'),
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<PostModel> createPost(String body, {bool publish = false}) async {
    final response = await _client.request(
      'social/posts',
      method: 'POST',
      data: <String, dynamic>{
        'kind': 'text',
        'body': body,
        'media_references': <Object>[],
        'visibility': 'public',
        'lifecycle': publish ? 'published' : 'draft',
      },
    );
    return PostModel.fromJson(requireObject(response.data, 'post'));
  }

  @override
  Future<PostModel> publishPost(String id) async {
    final response = await _client.request(
      'social/posts/$id/publish',
      method: 'POST',
    );
    return PostModel.fromJson(requireObject(response.data, 'post'));
  }

  @override
  Future<PostModel> post(String id) async {
    final response = await _client.request('social/posts/$id');
    return PostModel.fromJson(requireObject(response.data, 'post'));
  }

  @override
  Future<List<CommentModel>> comments(String postId) async {
    final response = await _client.request('social/posts/$postId/comments');
    return _array(
      response.data,
      'comments',
    ).map(CommentModel.fromJson).toList(growable: false);
  }

  @override
  Future<CommentModel> comment(String postId, String body) async {
    final response = await _client.request(
      'social/posts/$postId/comments',
      method: 'POST',
      data: <String, dynamic>{'body': body},
    );
    return CommentModel.fromJson(requireObject(response.data, 'comment'));
  }

  @override
  Future<void> react(String targetType, String targetId, String value) async {
    await _client.request(
      'social/reactions/$targetType/$targetId',
      method: 'PUT',
      data: <String, dynamic>{'value': value},
    );
  }

  @override
  Future<void> removeReaction(String targetType, String targetId) async {
    await _client.request(
      'social/reactions/$targetType/$targetId',
      method: 'DELETE',
    );
  }

  @override
  Future<void> setBookmark(String postId, bool value) async {
    await _client.request(
      'social/posts/$postId/bookmark',
      method: value ? 'POST' : 'DELETE',
    );
  }

  @override
  Future<void> setRepost(String postId, bool value) async {
    await _client.request(
      'social/posts/$postId/repost',
      method: value ? 'POST' : 'DELETE',
    );
  }

  @override
  Future<ProfileModel> publicProfile(String handle) async {
    final response = await _client.request('social/profiles/$handle');
    return ProfileModel.fromPublicJson(
      requireObject(response.data, 'public profile'),
    );
  }

  @override
  Future<String> follow(String handle) async {
    final response = await _client.request(
      'social/follows/$handle',
      method: 'POST',
    );
    return requireString(
      requireObject(response.data, 'follow relationship'),
      'status',
    );
  }

  @override
  Future<void> unfollow(String handle) async {
    await _client.request('social/follows/$handle', method: 'DELETE');
  }

  @override
  Future<List<FriendSummaryModel>> listFriends() async {
    final response = await _client.request('social/friends');
    return _array(
      response.data,
      'friends',
    ).map(FriendSummaryModel.fromJson).toList(growable: false);
  }

  @override
  Future<FriendRequestsModel> friendRequests() async {
    final response = await _client.request('social/friend-requests');
    return FriendRequestsModel.fromJson(
      requireObject(response.data, 'friend requests'),
    );
  }

  @override
  Future<void> cancelFriendRequest(String id) async {
    await _client.request(
      'social/friend-requests/$id/cancel',
      method: 'DELETE',
    );
  }

  @override
  Future<String> acceptFriendRequest(String id) async {
    final response = await _client.request(
      'social/friend-requests/$id/accept',
      method: 'POST',
    );
    return requireString(
      requireObject(response.data, 'friend relationship'),
      'status',
    );
  }

  @override
  Future<void> rejectFriendRequest(String id) async {
    await _client.request('social/friend-requests/$id/reject', method: 'POST');
  }

  @override
  Future<String> friend(String handle) async {
    final response = await _client.request(
      'social/friends/$handle',
      method: 'POST',
    );
    return requireString(
      requireObject(response.data, 'friend relationship'),
      'status',
    );
  }

  @override
  Future<void> unfriend(String handle) async {
    await _client.request('social/friends/$handle', method: 'DELETE');
  }

  @override
  Future<List<FriendSuggestionModel>> suggestions() async {
    final response = await _client.request('social/friends/suggestions');
    return _array(
      response.data,
      'friend suggestions',
    ).map(FriendSuggestionModel.fromJson).toList(growable: false);
  }

  @override
  Future<List<FriendSummaryModel>> mutuals(String handle) async {
    final response = await _client.request('social/friends/$handle/mutuals');
    return _array(
      response.data,
      'mutual friends',
    ).map(FriendSummaryModel.fromJson).toList(growable: false);
  }

  @override
  Future<void> block(String handle, bool value) async {
    await _client.request(
      'social/blocks/$handle',
      method: value ? 'POST' : 'DELETE',
    );
  }

  @override
  Future<void> mute(String handle, bool value) async {
    await _client.request(
      'social/mutes/$handle',
      method: value ? 'POST' : 'DELETE',
    );
  }

  @override
  Future<String> report({
    required String targetType,
    required String targetId,
    required String reason,
    String? evidence,
  }) async {
    final response = await _client.request(
      'social/reports',
      method: 'POST',
      data: <String, dynamic>{
        'target_type': targetType,
        'target_id': targetId,
        'reason': reason,
        'evidence': evidence,
      },
    );
    return requireString(requireObject(response.data, 'content report'), 'id');
  }

  @override
  Future<SocialSearchBundle> search(String query) async {
    final responses = await Future.wait<Response<dynamic>>([
      _client.request(
        'social/search/users',
        queryParameters: <String, dynamic>{'q': query},
      ),
      _client.request(
        'social/search/posts',
        queryParameters: <String, dynamic>{'q': query},
      ),
      _client.request(
        'social/search/communities',
        queryParameters: <String, dynamic>{'q': query},
      ),
    ]);
    final users = requireObject(responses[0].data, 'user search');
    final posts = requireObject(responses[1].data, 'post search');
    final communities = requireObject(responses[2].data, 'community search');
    return SocialSearchBundle(
      users: requireList(users, 'items')
          .map(
            (value) => ProfileModel.fromPublicJson(
              requireObject(value, 'searched profile'),
            ),
          )
          .toList(growable: false),
      posts: requireList(posts, 'items')
          .map(
            (value) =>
                PostModel.fromJson(requireObject(value, 'searched post')),
          )
          .toList(growable: false),
      communities: requireList(communities, 'items')
          .map(
            (value) => NamedResource.fromJson(
              requireObject(value, 'searched community'),
            ),
          )
          .toList(growable: false),
    );
  }

  @override
  Future<List<NamedResource>> communities({String? query}) async {
    final response = await _client.request(
      'social/communities',
      queryParameters: <String, dynamic>{'q': query, 'limit': 100},
    );
    final page = requireObject(response.data, 'communities');
    return requireList(page, 'items')
        .map(
          (value) => NamedResource.fromJson(
            requireObject(value, 'community'),
            statusKey: 'viewer_membership_status',
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<NamedResource> createCommunity({
    required String slug,
    required String name,
    String? description,
    String visibility = 'public',
  }) async {
    final response = await _client.request(
      'social/communities',
      method: 'POST',
      data: <String, dynamic>{
        'slug': slug,
        'name': name,
        'description': description,
        'visibility': visibility,
      },
    );
    return NamedResource.fromJson(
      requireObject(response.data, 'community'),
      statusKey: 'viewer_membership_status',
    );
  }

  @override
  Future<NamedResource> community(String slug) async {
    final response = await _client.request('social/communities/$slug');
    return NamedResource.fromJson(
      requireObject(response.data, 'community'),
      statusKey: 'viewer_membership_status',
    );
  }

  @override
  Future<String> joinCommunity(String slug) async {
    final response = await _client.request(
      'social/communities/$slug/join',
      method: 'POST',
    );
    return requireString(
      requireObject(response.data, 'community membership'),
      'status',
    );
  }

  @override
  Future<void> leaveCommunity(String slug) async {
    await _client.request('social/communities/$slug/leave', method: 'DELETE');
  }

  @override
  Future<List<NamedResource>> channels(String slug) async {
    final response = await _client.request('social/communities/$slug/channels');
    return _array(
      response.data,
      'channels',
    ).map(NamedResource.fromJson).toList(growable: false);
  }

  @override
  Future<CursorPage<AppNotification>> notifications({String? cursor}) async {
    final response = await _client.request(
      'social/notifications',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<AppNotification>.fromJson(
      requireObject(response.data, 'notifications'),
      AppNotification.fromJson,
    );
  }

  @override
  Future<void> readNotification(String id) async {
    await _client.request('social/notifications/$id/read', method: 'POST');
  }

  @override
  Future<void> readAllNotifications() async {
    await _client.request('social/notifications/read-all', method: 'POST');
  }

  @override
  Future<void> muteNotificationType(String type, bool muted) async {
    await _client.request(
      'social/notifications/mutes/$type',
      method: 'PUT',
      data: <String, dynamic>{'muted': muted},
    );
  }
}

abstract interface class MessagingRepository {
  Future<List<ConversationModel>> conversations();
  Future<ConversationModel> createConversation(String recipientHandle);
  Future<ConversationModel> acceptRequest(String conversationId);
  Future<void> declineRequest(String conversationId);
  Future<CursorPage<MessageModel>> history(
    String conversationId, {
    String? cursor,
  });
  Future<MessageModel> send(String conversationId, String body);
  Future<void> markRead(String conversationId, String throughMessageId);
  Stream<JsonObject> events({String? since});
}

final class DioMessagingRepository implements MessagingRepository {
  const DioMessagingRepository(this._client, this._config, this._tokenStore);

  final ApiClient _client;
  final AppConfig _config;
  final TokenStore _tokenStore;

  @override
  Future<List<ConversationModel>> conversations() async {
    final response = await _client.request('messages/conversations');
    return _array(
      response.data,
      'conversations',
    ).map(ConversationModel.fromJson).toList(growable: false);
  }

  @override
  Future<ConversationModel> createConversation(String recipientHandle) async {
    final response = await _client.request(
      'messages/conversations',
      method: 'POST',
      data: <String, dynamic>{'recipient_handle': recipientHandle},
    );
    return ConversationModel.fromJson(
      requireObject(response.data, 'conversation'),
    );
  }

  @override
  Future<ConversationModel> acceptRequest(String conversationId) async {
    final response = await _client.request(
      'messages/conversations/$conversationId/accept',
      method: 'POST',
    );
    return ConversationModel.fromJson(
      requireObject(response.data, 'conversation'),
    );
  }

  @override
  Future<void> declineRequest(String conversationId) async {
    await _client.request(
      'messages/conversations/$conversationId/decline',
      method: 'POST',
    );
  }

  @override
  Future<CursorPage<MessageModel>> history(
    String conversationId, {
    String? cursor,
  }) async {
    final response = await _client.request(
      'messages/conversations/$conversationId/messages',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<MessageModel>.fromJson(
      requireObject(response.data, 'message history'),
      MessageModel.fromJson,
    );
  }

  @override
  Future<MessageModel> send(String conversationId, String body) async {
    final response = await _client.request(
      'messages/conversations/$conversationId/messages',
      method: 'POST',
      data: <String, dynamic>{'body': body},
    );
    return MessageModel.fromJson(requireObject(response.data, 'message'));
  }

  @override
  Future<void> markRead(String conversationId, String throughMessageId) async {
    await _client.request(
      'messages/conversations/$conversationId/read',
      method: 'POST',
      data: <String, dynamic>{'through_message_id': throughMessageId},
    );
  }

  @override
  Stream<JsonObject> events({String? since}) async* {
    if (!realtimeSupported) {
      throw UnsupportedError(
        realtimeUnsupportedReason ?? 'Realtime sockets are unavailable.',
      );
    }
    var cursor = since;
    var backoffSeconds = 1;
    while (true) {
      final token = _tokenStore.accessToken;
      if (token == null) {
        return;
      }
      try {
        final ticketResponse = await _client.request(
          'messages/events/ticket',
          method: 'POST',
        );
        final ticketJson = requireObject(ticketResponse.data, 'message ticket');
        final ticket = requireString(ticketJson, 'ticket');
        final socket = openTicketSocket(
          _config.websocket('ws/messages', <String, dynamic>{
            'since': cursor,
            'ticket': ticket,
          }),
        );
        try {
          await for (final payload in socket.stream) {
            final json = requireObject(
              jsonDecode(payload as String),
              'message event',
            );
            cursor = optionalString(json, 'cursor') ?? cursor;
            backoffSeconds = 1;
            yield json;
          }
        } on Object {
          // Reconnect below. Transport and malformed-frame failures must not
          // terminate HTTP-backed messaging.
        } finally {
          await socket.sink.close();
        }
      } on Object {
        // Ticket mint or connect failed — backoff and retry.
      }
      await Future<void>.delayed(Duration(seconds: backoffSeconds));
      backoffSeconds = (backoffSeconds * 2).clamp(1, 30);
    }
  }
}

abstract interface class WalletRepository {
  Future<WalletBalance> balance();
  Future<WalletBalance> creatorEarnings();
  Future<CursorPage<LedgerTransactionModel>> transactions({String? cursor});
  Future<PaymentOperationModel> topUp({
    required int amountMinor,
    required String settlementCurrency,
    required String returnUrl,
  });
  Future<PaymentOperationModel> payout({
    required int amountMinor,
    required String settlementCurrency,
    required String destinationReference,
  });
}

final class DioWalletRepository implements WalletRepository {
  DioWalletRepository(this._client, {Uuid? uuid})
    : _uuid = uuid ?? const Uuid();

  final ApiClient _client;
  final Uuid _uuid;

  @override
  Future<WalletBalance> balance() async {
    final response = await _client.request('wallet/balance');
    return WalletBalance.fromJson(
      requireObject(response.data, 'wallet balance'),
    );
  }

  @override
  Future<WalletBalance> creatorEarnings() async {
    final response = await _client.request('wallet/creator-earnings');
    return WalletBalance.fromJson(
      requireObject(response.data, 'creator earnings'),
    );
  }

  @override
  Future<CursorPage<LedgerTransactionModel>> transactions({
    String? cursor,
  }) async {
    final response = await _client.request(
      'wallet/transactions',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<LedgerTransactionModel>.fromJson(
      requireObject(response.data, 'wallet transactions'),
      LedgerTransactionModel.fromJson,
    );
  }

  @override
  Future<PaymentOperationModel> topUp({
    required int amountMinor,
    required String settlementCurrency,
    required String returnUrl,
  }) async {
    final response = await _client.request(
      'wallet/topups',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{
        'amount_minor': amountMinor,
        'settlement_currency': settlementCurrency,
        'return_url': returnUrl,
      },
    );
    return PaymentOperationModel.fromJson(
      requireObject(response.data, 'top-up operation'),
    );
  }

  @override
  Future<PaymentOperationModel> payout({
    required int amountMinor,
    required String settlementCurrency,
    required String destinationReference,
  }) async {
    final response = await _client.request(
      'wallet/payouts',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{
        'amount_minor': amountMinor,
        'settlement_currency': settlementCurrency,
        'destination_reference': destinationReference,
      },
    );
    return PaymentOperationModel.fromJson(
      requireObject(response.data, 'payout operation'),
    );
  }
}

abstract interface class GiftRepository {
  Future<CursorPage<GiftModel>> catalog({
    String? query,
    String? category,
    String? cursor,
  });
  Future<GiftModel> gift(String slug);
  Future<List<NamedResource>> categories();
  Future<List<NamedResource>> collections();
  Future<List<GiftModel>> recommendations();
  Future<CursorPage<InventoryItemModel>> inventory({String? cursor});
  Future<InventoryItemModel> purchase(String giftDefinitionId, int quantity);
  Future<JsonObject> send({
    required String recipientUserId,
    String? inventoryItemId,
    String? giftDefinitionId,
    String? message,
    String? liveSessionId,
    String? conferenceId,
  });
  Future<CursorPage<NamedResource>> sentHistory({String? cursor});
  Future<CursorPage<NamedResource>> receivedHistory({String? cursor});
  Future<JsonObject> preferences();
  Future<JsonObject> updatePreferences(JsonObject patch);
  Future<JsonObject> creatorMonetization();
  Future<JsonObject> setCreatorMonetization(bool enabled);
  Future<CursorPage<GiftEventModel>> eventHistory({String? cursor});
  Future<GiftRankingResponseModel> rankings({
    String scope = 'global_daily',
    String? id,
  });
  Stream<GiftEventModel> events({String? since});
}

final class DioGiftRepository implements GiftRepository {
  DioGiftRepository(this._client, this._config, this._tokenStore, {Uuid? uuid})
    : _uuid = uuid ?? const Uuid();

  final ApiClient _client;
  final AppConfig _config;
  final TokenStore _tokenStore;
  final Uuid _uuid;

  @override
  Future<CursorPage<GiftModel>> catalog({
    String? query,
    String? category,
    String? cursor,
  }) async {
    final response = await _client.request(
      'gifts/catalog',
      queryParameters: <String, dynamic>{
        'q': query,
        'category': category,
        'cursor': cursor,
      },
    );
    return CursorPage<GiftModel>.fromJson(
      requireObject(response.data, 'gift catalog'),
      GiftModel.fromJson,
    );
  }

  @override
  Future<GiftModel> gift(String slug) async {
    final response = await _client.request('gifts/catalog/$slug');
    return GiftModel.fromJson(requireObject(response.data, 'gift'));
  }

  @override
  Future<List<NamedResource>> categories() async {
    final response = await _client.request('gifts/categories');
    return _array(
      response.data,
      'gift categories',
    ).map(NamedResource.fromJson).toList(growable: false);
  }

  @override
  Future<List<NamedResource>> collections() async {
    final response = await _client.request('gifts/collections');
    return _array(
      response.data,
      'gift collections',
    ).map(NamedResource.fromJson).toList(growable: false);
  }

  @override
  Future<List<GiftModel>> recommendations() async {
    final response = await _client.request('gifts/recommendations');
    final json = requireObject(response.data, 'gift recommendations');
    return requireList(json, 'items')
        .map(
          (value) => GiftModel.fromJson(
            requireObject(
              requireObject(value, 'gift recommendation')['gift'],
              'recommended gift',
            ),
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<CursorPage<InventoryItemModel>> inventory({String? cursor}) async {
    final response = await _client.request(
      'gifts/inventory',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<InventoryItemModel>.fromJson(
      requireObject(response.data, 'gift inventory'),
      InventoryItemModel.fromJson,
    );
  }

  @override
  Future<InventoryItemModel> purchase(
    String giftDefinitionId,
    int quantity,
  ) async {
    final response = await _client.request(
      'gifts/purchases',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{
        'gift_definition_id': giftDefinitionId,
        'quantity': quantity,
      },
    );
    return InventoryItemModel.fromJson(
      requireObject(response.data, 'inventory item'),
    );
  }

  @override
  Future<JsonObject> send({
    required String recipientUserId,
    String? inventoryItemId,
    String? giftDefinitionId,
    String? message,
    String? liveSessionId,
    String? conferenceId,
  }) async {
    final response = await _client.request(
      'gifts/sends',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{
        'recipient_user_id': recipientUserId,
        'inventory_item_id': inventoryItemId,
        'gift_definition_id': giftDefinitionId,
        'message': message,
        'live_session_id': liveSessionId,
        'conference_id': conferenceId,
      },
    );
    return requireObject(response.data, 'gift send');
  }

  @override
  Future<CursorPage<NamedResource>> sentHistory({String? cursor}) =>
      _history('sent', cursor);

  @override
  Future<CursorPage<NamedResource>> receivedHistory({String? cursor}) =>
      _history('received', cursor);

  Future<CursorPage<NamedResource>> _history(
    String direction,
    String? cursor,
  ) async {
    final response = await _client.request(
      'gifts/history/$direction',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<NamedResource>.fromJson(
      requireObject(response.data, 'gift history'),
      (json) => NamedResource(
        id: requireString(json, 'id'),
        label: requireString(json, 'status'),
        status: optionalString(json, 'failure_code'),
        raw: json,
      ),
    );
  }

  @override
  Future<JsonObject> preferences() async {
    final response = await _client.request('gifts/preferences');
    return requireObject(response.data, 'gift preferences');
  }

  @override
  Future<JsonObject> updatePreferences(JsonObject patch) async {
    final response = await _client.request(
      'gifts/preferences',
      method: 'PATCH',
      data: patch,
    );
    return requireObject(response.data, 'gift preferences');
  }

  @override
  Future<JsonObject> creatorMonetization() async {
    final response = await _client.request('gifts/creator/monetization');
    return requireObject(response.data, 'creator monetization');
  }

  @override
  Future<JsonObject> setCreatorMonetization(bool enabled) async {
    final response = await _client.request(
      'gifts/creator/monetization',
      method: 'PATCH',
      data: <String, dynamic>{'gifts_enabled': enabled},
    );
    return requireObject(response.data, 'creator monetization');
  }

  @override
  Future<CursorPage<GiftEventModel>> eventHistory({String? cursor}) async {
    final response = await _client.request(
      'gifts/events',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<GiftEventModel>.fromJson(
      requireObject(response.data, 'gift events'),
      GiftEventModel.fromJson,
    );
  }

  @override
  Future<GiftRankingResponseModel> rankings({
    String scope = 'global_daily',
    String? id,
  }) async {
    final response = await _client.request(
      'gifts/rankings',
      queryParameters: <String, dynamic>{'scope': scope, 'id': id},
    );
    return GiftRankingResponseModel.fromJson(
      requireObject(response.data, 'gift rankings'),
    );
  }

  @override
  Stream<GiftEventModel> events({String? since}) async* {
    if (!realtimeSupported) {
      throw UnsupportedError(
        realtimeUnsupportedReason ?? 'Realtime sockets are unavailable.',
      );
    }
    var cursor = since;
    var backoffSeconds = 1;
    while (true) {
      final token = _tokenStore.accessToken;
      if (token == null) {
        return;
      }
      try {
        final ticketResponse = await _client.request(
          'gifts/events/ticket',
          method: 'POST',
        );
        final ticketJson = requireObject(ticketResponse.data, 'gift ticket');
        final ticket = requireString(ticketJson, 'ticket');
        final socket = openTicketSocket(
          _config.websocket('ws/gifts', <String, dynamic>{
            'since': cursor,
            'ticket': ticket,
          }),
        );
        try {
          await for (final payload in socket.stream) {
            final json = requireObject(
              jsonDecode(payload as String),
              'gift event',
            );
            if (json['event'] == 'heartbeat') {
              backoffSeconds = 1;
              continue;
            }
            final event = GiftEventModel.fromJson(json);
            cursor = event.cursor;
            backoffSeconds = 1;
            yield event;
          }
        } on Object {
          // Reconnect below after both error and orderly socket closure.
        } finally {
          await socket.sink.close();
        }
      } on Object {
        // Ticket mint or connect failed — backoff and retry.
      }
      await Future<void>.delayed(Duration(seconds: backoffSeconds));
      backoffSeconds = (backoffSeconds * 2).clamp(1, 30);
    }
  }
}

abstract interface class GiftAuthoringRepository {
  Future<JsonObject> createCategory(JsonObject payload);
  Future<JsonObject> createDefinition(JsonObject payload);
  Future<JsonObject> createVersion(String definitionId, JsonObject manifest);
  Future<JsonObject> updateManifest(String versionId, JsonObject manifest);
  Future<JsonObject> requestAssetUpload(String versionId, JsonObject payload);
  Future<JsonObject> completeAssetUpload(String assetId);
  Future<JsonObject> assetDownload(String assetId);
  Future<JsonObject> submitVersion(String versionId);
  Future<JsonObject> validateVersion(String versionId);
  Future<JsonObject> publishVersion(String versionId);
  Future<JsonObject> retireVersion(String versionId);
  Future<JsonObject> emergencyRetireVersion(String versionId);
  Future<JsonObject> createCollection(JsonObject payload);
  Future<JsonObject> addCollectionItem(String collectionId, JsonObject payload);
}

final class DioGiftAuthoringRepository implements GiftAuthoringRepository {
  const DioGiftAuthoringRepository(this._client);

  final ApiClient _client;

  Future<JsonObject> _request(
    String path, {
    String method = 'POST',
    JsonObject? data,
  }) async {
    final response = await _client.request(path, method: method, data: data);
    return requireObject(response.data, 'gift authoring response');
  }

  @override
  Future<JsonObject> createCategory(JsonObject payload) =>
      _request('gifts/author/categories', data: payload);

  @override
  Future<JsonObject> createDefinition(JsonObject payload) =>
      _request('gifts/author/definitions', data: payload);

  @override
  Future<JsonObject> createVersion(String definitionId, JsonObject manifest) =>
      _request(
        'gifts/author/definitions/$definitionId/versions',
        data: <String, dynamic>{'manifest': manifest},
      );

  @override
  Future<JsonObject> updateManifest(String versionId, JsonObject manifest) =>
      _request(
        'gifts/author/versions/$versionId/manifest',
        method: 'PATCH',
        data: <String, dynamic>{'manifest': manifest},
      );

  @override
  Future<JsonObject> requestAssetUpload(String versionId, JsonObject payload) =>
      _request('gifts/author/versions/$versionId/assets/upload', data: payload);

  @override
  Future<JsonObject> completeAssetUpload(String assetId) =>
      _request('gifts/author/assets/$assetId/complete');

  @override
  Future<JsonObject> assetDownload(String assetId) =>
      _request('gifts/author/assets/$assetId/download', method: 'GET');

  @override
  Future<JsonObject> submitVersion(String versionId) =>
      _request('gifts/author/versions/$versionId/submit');

  @override
  Future<JsonObject> validateVersion(String versionId) =>
      _request('gifts/review/versions/$versionId/validate');

  @override
  Future<JsonObject> publishVersion(String versionId) =>
      _request('gifts/review/versions/$versionId/publish');

  @override
  Future<JsonObject> retireVersion(String versionId) =>
      _request('gifts/review/versions/$versionId/retire');

  @override
  Future<JsonObject> emergencyRetireVersion(String versionId) =>
      _request('gifts/moderation/versions/$versionId/emergency-retire');

  @override
  Future<JsonObject> createCollection(JsonObject payload) =>
      _request('gifts/author/collections', data: payload);

  @override
  Future<JsonObject> addCollectionItem(
    String collectionId,
    JsonObject payload,
  ) => _request('gifts/author/collections/$collectionId/items', data: payload);
}

abstract interface class AiRepository {
  Future<AiSettingsModel> settings();
  Future<AiSettingsModel> updateSettings(JsonObject patch);
  Future<AiProviderStatus> providerStatus();
  Future<CursorPage<AiConversationModel>> conversations({String? cursor});
  Future<AiConversationModel> conversation(String id);
  Future<AiConversationModel> createConversation({
    String? title,
    String purpose = 'general',
  });
  Future<CursorPage<AiMessageModel>> messages(
    String conversationId, {
    String? cursor,
  });
  Future<AiMessageModel> send(String conversationId, String content);
  Future<List<AiToolProposalModel>> proposals(String conversationId);
  Future<JsonObject> toolAction(
    String conversationId,
    String proposalId,
    String action,
  );
  Future<List<NamedResource>> memory();
  Future<JsonObject> createMemory(String kind, String content);
  Future<void> deleteMemory(String id);
  Future<JsonObject> exportMemory();
  Future<JsonObject> usageSummary();
  Future<JsonObject> translate(
    String text,
    String sourceLanguage,
    String targetLanguage,
  );
  Future<JsonObject> moderate(String text);
  Future<JsonObject> transcribeAudio(
    Uint8List audio, {
    required String filename,
    required String contentType,
    String? language,
  });
  Future<CursorPage<NamedResource>> jobs({String? cursor});
  Future<JsonObject> createJob(JsonObject typedRequest);
  Future<JsonObject> auraPresence();
}

final class DioAiRepository implements AiRepository {
  const DioAiRepository(this._client);

  final ApiClient _client;

  @override
  Future<AiSettingsModel> settings() async {
    final response = await _client.request('ai/settings');
    return AiSettingsModel.fromJson(
      requireObject(response.data, 'AI settings'),
    );
  }

  @override
  Future<AiSettingsModel> updateSettings(JsonObject patch) async {
    final response = await _client.request(
      'ai/settings',
      method: 'PATCH',
      data: patch,
    );
    return AiSettingsModel.fromJson(
      requireObject(response.data, 'AI settings'),
    );
  }

  @override
  Future<AiProviderStatus> providerStatus() async {
    final response = await _client.request('ai/providers/status');
    return AiProviderStatus.fromJson(
      requireObject(response.data, 'AI provider status'),
    );
  }

  @override
  Future<CursorPage<AiConversationModel>> conversations({
    String? cursor,
  }) async {
    final response = await _client.request(
      'ai/conversations',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<AiConversationModel>.fromJson(
      requireObject(response.data, 'AI conversations'),
      AiConversationModel.fromJson,
    );
  }

  @override
  Future<AiConversationModel> conversation(String id) async {
    final response = await _client.request('ai/conversations/$id');
    return AiConversationModel.fromJson(
      requireObject(response.data, 'AI conversation'),
    );
  }

  @override
  Future<AiConversationModel> createConversation({
    String? title,
    String purpose = 'general',
  }) async {
    final response = await _client.request(
      'ai/conversations',
      method: 'POST',
      data: <String, dynamic>{
        'title': title,
        'mode': 'copilot',
        'purpose': purpose,
      },
    );
    return AiConversationModel.fromJson(
      requireObject(response.data, 'AI conversation'),
    );
  }

  @override
  Future<CursorPage<AiMessageModel>> messages(
    String conversationId, {
    String? cursor,
  }) async {
    final response = await _client.request(
      'ai/conversations/$conversationId/messages',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<AiMessageModel>.fromJson(
      requireObject(response.data, 'AI messages'),
      AiMessageModel.fromJson,
    );
  }

  @override
  Future<AiMessageModel> send(String conversationId, String content) async {
    final response = await _client.request(
      'ai/conversations/$conversationId/messages',
      method: 'POST',
      data: <String, dynamic>{'content': content, 'content_refs': <Object>[]},
    );
    return AiMessageModel.fromJson(requireObject(response.data, 'AI message'));
  }

  @override
  Future<List<AiToolProposalModel>> proposals(String conversationId) async {
    final response = await _client.request(
      'ai/conversations/$conversationId/proposals',
    );
    return _array(
      response.data,
      'AI tool proposals',
    ).map(AiToolProposalModel.fromJson).toList(growable: false);
  }

  @override
  Future<JsonObject> toolAction(
    String conversationId,
    String proposalId,
    String action,
  ) async {
    if (!{'approve', 'reject', 'execute'}.contains(action)) {
      throw ArgumentError.value(action, 'action', 'Unsupported tool action');
    }
    final response = await _client.request(
      'ai/conversations/$conversationId/proposals/$proposalId/$action',
      method: 'POST',
    );
    return requireObject(response.data, 'AI tool action');
  }

  @override
  Future<List<NamedResource>> memory() async {
    final response = await _client.request('ai/memory');
    return _array(response.data, 'AI memory')
        .map(
          (json) => NamedResource(
            id: requireString(json, 'id'),
            label:
                optionalString(json, 'content') ?? requireString(json, 'kind'),
            status: requireString(json, 'embedding_state'),
            raw: json,
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<JsonObject> createMemory(String kind, String content) async {
    final response = await _client.request(
      'ai/memory',
      method: 'POST',
      data: <String, dynamic>{'kind': kind, 'content': content},
    );
    return requireObject(response.data, 'AI memory');
  }

  @override
  Future<void> deleteMemory(String id) async {
    await _client.request('ai/memory/$id', method: 'DELETE');
  }

  @override
  Future<JsonObject> exportMemory() async {
    final response = await _client.request('ai/memory/export');
    return requireObject(response.data, 'AI memory export');
  }

  @override
  Future<JsonObject> usageSummary() async {
    final response = await _client.request('ai/usage/summary');
    return requireObject(response.data, 'AI usage summary');
  }

  @override
  Future<JsonObject> translate(
    String text,
    String sourceLanguage,
    String targetLanguage,
  ) async {
    final response = await _client.request(
      'ai/translate',
      method: 'POST',
      data: <String, dynamic>{
        'text': text,
        'source_language': sourceLanguage,
        'target_language': targetLanguage,
      },
    );
    return requireObject(response.data, 'translation');
  }

  @override
  Future<JsonObject> moderate(String text) async {
    final response = await _client.request(
      'ai/moderate',
      method: 'POST',
      data: <String, dynamic>{'text': text},
    );
    return requireObject(response.data, 'moderation result');
  }

  @override
  Future<JsonObject> transcribeAudio(
    Uint8List audio, {
    required String filename,
    required String contentType,
    String? language,
  }) async {
    if (audio.isEmpty) {
      throw ArgumentError.value(audio, 'audio', 'Audio clip cannot be empty');
    }
    final response = await _client.request(
      'ai/transcriptions',
      method: 'POST',
      data: FormData.fromMap(<String, dynamic>{
        'audio': MultipartFile.fromBytes(
          audio,
          filename: filename,
          contentType: DioMediaType.parse(contentType),
        ),
        'language': ?language,
      }),
    );
    return requireObject(response.data, 'transcription');
  }

  @override
  Future<CursorPage<NamedResource>> jobs({String? cursor}) async {
    final response = await _client.request(
      'ai/jobs',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<NamedResource>.fromJson(
      requireObject(response.data, 'AI jobs'),
      (json) => NamedResource(
        id: requireString(json, 'id'),
        label: requireString(json, 'capability'),
        status: requireString(json, 'status'),
        raw: json,
      ),
    );
  }

  @override
  Future<JsonObject> createJob(JsonObject typedRequest) async {
    final response = await _client.request(
      'ai/jobs',
      method: 'POST',
      data: typedRequest,
    );
    return requireObject(response.data, 'AI job');
  }

  @override
  Future<JsonObject> auraPresence() async {
    final response = await _client.request('ai/aura/presence');
    return requireObject(response.data, 'Aura presence');
  }
}

abstract interface class LiveRepository {
  Future<List<NamedResource>> integrations();
  Future<JsonObject> tiktokControlPanel();
  Future<JsonObject> integrationHealth(String connectionId);
  Future<void> disconnectIntegration(String connectionId);
  Future<JsonObject> startIntegrationOAuth(
    String platform,
    List<String> scopes,
  );
  Future<List<LiveSessionModel>> sessions();
  Future<LiveSessionModel> createSession(String title);
  Future<LiveSessionModel> session(String id);
  Future<JsonObject> mediaCapability(String sessionId);
  Future<JsonObject> publishCredentials(String sessionId);
  Future<List<LiveGuestInviteModel>> incomingGuestInvites();
  Future<List<LiveGuestInviteModel>> guests(String sessionId);
  Future<LiveGuestInviteModel> inviteGuest(
    String sessionId, {
    required String invitee,
    required String role,
  });
  Future<JsonObject> acceptGuestInvite(String sessionId, String inviteId);
  Future<JsonObject> guestPublishCredentials(String inviteId);
  Future<LiveGuestInviteModel> declineGuestInvite(
    String sessionId,
    String inviteId,
  );
  Future<JsonObject> replayPlayback(String replayId);
  Future<JsonObject> obsScenes(String sessionId);
  Future<JsonObject> selectObsScene(String sessionId, String sceneName);
  Future<JsonObject> startObsRecording(String sessionId);
  Future<JsonObject> stopObsRecording(String sessionId);
  Future<JsonObject> addDestination(
    String sessionId,
    String connectionId, {
    required bool publishEnabled,
    required bool chatEnabled,
    required bool eventsEnabled,
    required bool moderationEnabled,
    required bool analyticsEnabled,
  });
  Future<void> removeDestination(String sessionId, String destinationId);
  Future<JsonObject> preflight(String id);
  Future<LiveSessionModel> start(String id);
  Future<LiveSessionModel> end(String id);
  Future<JsonObject> rotateStreamKey(String id);
  Future<List<NamedResource>> personas();
  Future<List<NamedResource>> rules();
  Future<CursorPage<NamedResource>> events(String sessionId, {String? cursor});
  Future<CursorPage<NamedResource>> actions(String sessionId, {String? cursor});
  Future<JsonObject> action(String actionId, String operation);
  Future<JsonObject> genericCreate(String resource, JsonObject payload);
  Future<JsonObject> genericUpdate(
    String resource,
    String id,
    JsonObject payload,
  );
  Future<void> genericDelete(String resource, String id);
  Stream<JsonObject> liveEvents(String sessionId, {String? since});
}

final class DioLiveRepository implements LiveRepository {
  const DioLiveRepository(this._client, this._config, this._tokenStore);

  final ApiClient _client;
  final AppConfig _config;
  final TokenStore _tokenStore;

  @override
  Future<List<NamedResource>> integrations() async {
    final response = await _client.request('live/integrations');
    return _array(response.data, 'live integrations')
        .map(
          (json) => NamedResource.fromJson(
            json,
            labelKey: 'platform',
            statusKey: 'state',
            descriptionKey: null,
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<JsonObject> tiktokControlPanel() async {
    final response = await _client.request('live/tiktok/control-panel');
    return requireObject(response.data, 'tiktok control panel');
  }

  @override
  Future<JsonObject> integrationHealth(String connectionId) async {
    final response = await _client.request(
      'live/integrations/$connectionId/health',
      method: 'POST',
    );
    return requireObject(response.data, 'integration health');
  }

  @override
  Future<void> disconnectIntegration(String connectionId) async {
    await _client.request(
      'live/integrations/$connectionId/disconnect',
      method: 'POST',
    );
  }

  @override
  Future<JsonObject> startIntegrationOAuth(
    String platform,
    List<String> scopes,
  ) async {
    final response = await _client.request(
      'live/integrations/oauth/$platform/start',
      method: 'POST',
      data: <String, dynamic>{'scopes': scopes},
    );
    return requireObject(response.data, 'integration OAuth');
  }

  @override
  Future<List<LiveSessionModel>> sessions() async {
    final response = await _client.request('live/sessions');
    return _array(
      response.data,
      'live sessions',
    ).map(LiveSessionModel.fromJson).toList(growable: false);
  }

  @override
  Future<LiveSessionModel> createSession(String title) async {
    final response = await _client.request(
      'live/sessions',
      method: 'POST',
      data: <String, dynamic>{
        'title': title,
        'language': 'en',
        'recording_enabled': false,
        'moderation_mode': 'recommend',
        'ai_mode': 'off',
        'destinations': <Object>[],
      },
    );
    return LiveSessionModel.fromJson(
      requireObject(response.data, 'live session'),
    );
  }

  @override
  Future<LiveSessionModel> session(String id) async {
    final response = await _client.request('live/sessions/$id');
    return LiveSessionModel.fromJson(
      requireObject(response.data, 'live session'),
    );
  }

  @override
  Future<JsonObject> mediaCapability(String sessionId) async {
    final response = await _client.request(
      'live/sessions/$sessionId/media-capability',
    );
    return requireObject(response.data, 'live media capability');
  }

  @override
  Future<JsonObject> publishCredentials(String sessionId) async {
    final response = await _client.request(
      'live/sessions/$sessionId/publish-credentials',
      method: 'POST',
    );
    return requireObject(response.data, 'live publish credentials');
  }

  @override
  Future<List<LiveGuestInviteModel>> incomingGuestInvites() async {
    final response = await _client.request('live/guest-invites');
    return _array(
      response.data,
      'incoming live guest invites',
    ).map(LiveGuestInviteModel.fromJson).toList(growable: false);
  }

  @override
  Future<List<LiveGuestInviteModel>> guests(String sessionId) async {
    final response = await _client.request('live/sessions/$sessionId/guests');
    return _array(
      response.data,
      'live guests',
    ).map(LiveGuestInviteModel.fromJson).toList(growable: false);
  }

  @override
  Future<LiveGuestInviteModel> inviteGuest(
    String sessionId, {
    required String invitee,
    required String role,
  }) async {
    final target = invitee.trim();
    final username = target.startsWith('@') ? target.substring(1) : target;
    final response = await _client.request(
      'live/sessions/$sessionId/guests/invite',
      method: 'POST',
      data: <String, dynamic>{
        if (_uuidPattern.hasMatch(target)) 'invitee_user_id': target,
        if (!_uuidPattern.hasMatch(target)) 'invitee_username': username,
        'role': role,
      },
    );
    return LiveGuestInviteModel.fromJson(
      requireObject(response.data, 'live guest invite'),
    );
  }

  @override
  Future<JsonObject> acceptGuestInvite(
    String sessionId,
    String inviteId,
  ) async {
    final response = await _client.request(
      'live/sessions/$sessionId/guests/$inviteId/accept',
      method: 'POST',
    );
    return requireObject(response.data, 'live guest invite acceptance');
  }

  @override
  Future<JsonObject> guestPublishCredentials(String inviteId) async {
    final response = await _client.request(
      'live/guest-invites/$inviteId/publish-credentials',
      method: 'POST',
    );
    return requireObject(response.data, 'live guest publish credentials');
  }

  @override
  Future<LiveGuestInviteModel> declineGuestInvite(
    String sessionId,
    String inviteId,
  ) async {
    final response = await _client.request(
      'live/sessions/$sessionId/guests/$inviteId/decline',
      method: 'POST',
    );
    return LiveGuestInviteModel.fromJson(
      requireObject(response.data, 'live guest invite'),
    );
  }

  @override
  Future<JsonObject> replayPlayback(String replayId) async {
    final response = await _client.request('live/replays/$replayId');
    return requireObject(response.data, 'live replay playback');
  }

  @override
  Future<JsonObject> obsScenes(String sessionId) async {
    final response = await _client.request(
      'live/sessions/$sessionId/obs/scenes',
    );
    return requireObject(response.data, 'OBS scene list');
  }

  @override
  Future<JsonObject> selectObsScene(String sessionId, String sceneName) async {
    final response = await _client.request(
      'live/sessions/$sessionId/obs/scenes/select',
      method: 'POST',
      data: <String, dynamic>{'scene_name': sceneName},
    );
    return requireObject(response.data, 'OBS scene selection');
  }

  @override
  Future<JsonObject> startObsRecording(String sessionId) async {
    final response = await _client.request(
      'live/sessions/$sessionId/obs/record/start',
      method: 'POST',
    );
    return requireObject(response.data, 'OBS recording start');
  }

  @override
  Future<JsonObject> stopObsRecording(String sessionId) async {
    final response = await _client.request(
      'live/sessions/$sessionId/obs/record/stop',
      method: 'POST',
    );
    return requireObject(response.data, 'OBS recording stop');
  }

  @override
  Future<JsonObject> addDestination(
    String sessionId,
    String connectionId, {
    required bool publishEnabled,
    required bool chatEnabled,
    required bool eventsEnabled,
    required bool moderationEnabled,
    required bool analyticsEnabled,
  }) async {
    final response = await _client.request(
      'live/sessions/$sessionId/destinations',
      method: 'POST',
      data: <String, dynamic>{
        'connection_id': connectionId,
        'publish_enabled': publishEnabled,
        'chat_enabled': chatEnabled,
        'events_enabled': eventsEnabled,
        'moderation_enabled': moderationEnabled,
        'analytics_enabled': analyticsEnabled,
      },
    );
    return requireObject(response.data, 'live destination');
  }

  @override
  Future<void> removeDestination(String sessionId, String destinationId) async {
    await _client.request(
      'live/sessions/$sessionId/destinations/$destinationId',
      method: 'DELETE',
    );
  }

  @override
  Future<JsonObject> preflight(String id) async {
    final response = await _client.request(
      'live/sessions/$id/preflight',
      method: 'POST',
    );
    return requireObject(response.data, 'live preflight');
  }

  @override
  Future<LiveSessionModel> start(String id) async {
    final response = await _client.request(
      'live/sessions/$id/start',
      method: 'POST',
    );
    return LiveSessionModel.fromJson(
      requireObject(response.data, 'live session'),
    );
  }

  @override
  Future<LiveSessionModel> end(String id) async {
    final response = await _client.request(
      'live/sessions/$id/end',
      method: 'POST',
    );
    return LiveSessionModel.fromJson(
      requireObject(response.data, 'live session'),
    );
  }

  @override
  Future<JsonObject> rotateStreamKey(String id) async {
    final response = await _client.request(
      'live/sessions/$id/stream-key/rotate',
      method: 'POST',
    );
    return requireObject(response.data, 'stream key rotation');
  }

  @override
  Future<List<NamedResource>> personas() => _named('live/personas');

  @override
  Future<List<NamedResource>> rules() => _named('live/rules');

  Future<List<NamedResource>> _named(String path) async {
    final response = await _client.request(path);
    return _array(
      response.data,
      path,
    ).map(NamedResource.fromJson).toList(growable: false);
  }

  @override
  Future<CursorPage<NamedResource>> events(
    String sessionId, {
    String? cursor,
  }) =>
      _page('live/sessions/$sessionId/events', cursor, labelKey: 'event_type');

  @override
  Future<CursorPage<NamedResource>> actions(
    String sessionId, {
    String? cursor,
  }) => _page(
    'live/sessions/$sessionId/actions',
    cursor,
    labelKey: 'action_type',
    statusKey: 'state',
  );

  Future<CursorPage<NamedResource>> _page(
    String path,
    String? cursor, {
    required String labelKey,
    String? statusKey,
  }) async {
    final response = await _client.request(
      path,
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<NamedResource>.fromJson(
      requireObject(response.data, path),
      (json) => NamedResource.fromJson(
        json,
        labelKey: labelKey,
        statusKey: statusKey,
        descriptionKey: null,
      ),
    );
  }

  @override
  Future<JsonObject> action(String actionId, String operation) async {
    if (!{'approve', 'execute'}.contains(operation)) {
      throw ArgumentError.value(
        operation,
        'operation',
        'Unsupported live action operation',
      );
    }
    final response = await _client.request(
      'live/actions/$actionId/$operation',
      method: 'POST',
    );
    return requireObject(response.data, 'live action');
  }

  @override
  Future<JsonObject> genericCreate(String resource, JsonObject payload) async {
    if (!{'personas', 'rules', 'games'}.contains(resource)) {
      throw ArgumentError.value(resource, 'resource');
    }
    final response = await _client.request(
      'live/$resource',
      method: 'POST',
      data: payload,
    );
    return requireObject(response.data, 'live $resource');
  }

  @override
  Future<JsonObject> genericUpdate(
    String resource,
    String id,
    JsonObject payload,
  ) async {
    if (!{'personas', 'rules'}.contains(resource)) {
      throw ArgumentError.value(resource, 'resource');
    }
    final response = await _client.request(
      'live/$resource/$id',
      method: 'PATCH',
      data: payload,
    );
    return requireObject(response.data, 'live $resource');
  }

  @override
  Future<void> genericDelete(String resource, String id) async {
    if (!{'personas', 'rules'}.contains(resource)) {
      throw ArgumentError.value(resource, 'resource');
    }
    await _client.request('live/$resource/$id', method: 'DELETE');
  }

  @override
  Stream<JsonObject> liveEvents(String sessionId, {String? since}) async* {
    if (!realtimeSupported) {
      throw UnsupportedError(
        realtimeUnsupportedReason ?? 'Realtime sockets are unavailable.',
      );
    }
    var cursor = since;
    var backoffSeconds = 1;
    while (true) {
      final token = _tokenStore.accessToken;
      if (token == null) {
        return;
      }
      final socket = openAuthorizedSocket(
        _config.websocket('ws/live/$sessionId', <String, dynamic>{
          'since': cursor,
        }),
        token,
      );
      try {
        await for (final payload in socket.stream) {
          final event = requireObject(
            jsonDecode(payload as String),
            'live event',
          );
          cursor = optionalString(event, 'cursor') ?? cursor;
          backoffSeconds = 1;
          yield event;
        }
      } on Object {
        // Reconnect below after both error and orderly socket closure.
      } finally {
        await socket.sink.close();
      }
      await Future<void>.delayed(Duration(seconds: backoffSeconds));
      backoffSeconds = (backoffSeconds * 2).clamp(1, 30);
    }
  }
}

final RegExp _uuidPattern = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

List<JsonObject> _array(Object? value, String context) {
  if (value is! List) {
    throw FormatException('$context must be a JSON array.');
  }
  return value
      .map((item) => requireObject(item, '$context item'))
      .toList(growable: false);
}

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => DioAccountRepository(ref.watch(apiClientProvider)),
);
final socialRepositoryProvider = Provider<SocialRepository>(
  (ref) => DioSocialRepository(ref.watch(apiClientProvider)),
);
final messagingRepositoryProvider = Provider<MessagingRepository>(
  (ref) => DioMessagingRepository(
    ref.watch(apiClientProvider),
    ref.watch(appConfigProvider),
    ref.watch(tokenStoreProvider),
  ),
);
final walletRepositoryProvider = Provider<WalletRepository>(
  (ref) => DioWalletRepository(ref.watch(apiClientProvider)),
);
final giftRepositoryProvider = Provider<GiftRepository>(
  (ref) => DioGiftRepository(
    ref.watch(apiClientProvider),
    ref.watch(appConfigProvider),
    ref.watch(tokenStoreProvider),
  ),
);
final giftAuthoringRepositoryProvider = Provider<GiftAuthoringRepository>(
  (ref) => DioGiftAuthoringRepository(ref.watch(apiClientProvider)),
);
final aiRepositoryProvider = Provider<AiRepository>(
  (ref) => DioAiRepository(ref.watch(apiClientProvider)),
);
final liveRepositoryProvider = Provider<LiveRepository>(
  (ref) => DioLiveRepository(
    ref.watch(apiClientProvider),
    ref.watch(appConfigProvider),
    ref.watch(tokenStoreProvider),
  ),
);
