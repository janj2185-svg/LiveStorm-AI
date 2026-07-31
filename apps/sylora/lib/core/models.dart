import 'package:flutter/foundation.dart';

import 'api.dart';

enum PostLifecycle { draft, published, archived, deleted, unknown }

PostLifecycle parsePostLifecycle(String value) => switch (value) {
  'draft' => PostLifecycle.draft,
  'published' => PostLifecycle.published,
  'archived' => PostLifecycle.archived,
  'deleted' => PostLifecycle.deleted,
  _ => PostLifecycle.unknown,
};

@immutable
final class UserAccount {
  const UserAccount({
    required this.id,
    required this.email,
    required this.status,
    required this.roles,
  });

  factory UserAccount.fromJson(JsonObject json) => UserAccount(
    id: requireString(json, 'id'),
    email: requireString(json, 'email'),
    status: requireString(json, 'status'),
    roles: requireList(
      json,
      'roles',
    ).map((value) => value as String).toList(growable: false),
  );

  final String id;
  final String email;
  final String status;
  final List<String> roles;
}

@immutable
final class ProfileModel {
  const ProfileModel({
    required this.userId,
    required this.handle,
    required this.displayName,
    required this.bio,
    required this.avatarUrl,
    required this.locale,
    required this.timezone,
    this.visibility,
    this.followedByViewer = false,
    this.friendWithViewer = false,
  });

  factory ProfileModel.fromOwnedJson(JsonObject json) => ProfileModel(
    userId: requireString(json, 'user_id'),
    handle: optionalString(json, 'handle'),
    displayName: requireString(json, 'display_name'),
    bio: optionalString(json, 'bio'),
    avatarUrl: optionalString(json, 'avatar_url'),
    locale: requireString(json, 'locale'),
    timezone: requireString(json, 'timezone'),
  );

  factory ProfileModel.fromPublicJson(JsonObject json) => ProfileModel(
    userId: requireString(json, 'user_id'),
    handle: requireString(json, 'handle'),
    displayName: requireString(json, 'display_name'),
    bio: optionalString(json, 'bio'),
    avatarUrl: optionalString(json, 'avatar_url'),
    locale: '',
    timezone: '',
    visibility: requireString(json, 'visibility'),
    followedByViewer: requireBool(json, 'followed_by_viewer'),
    friendWithViewer: requireBool(json, 'friend_with_viewer'),
  );

  final String userId;
  final String? handle;
  final String displayName;
  final String? bio;
  final String? avatarUrl;
  final String locale;
  final String timezone;
  final String? visibility;
  final bool followedByViewer;
  final bool friendWithViewer;
}

@immutable
final class AccountSettingsModel {
  const AccountSettingsModel({
    required this.productEmails,
    required this.marketingEmails,
    required this.securityEmails,
    required this.profileVisibility,
  });

  factory AccountSettingsModel.fromJson(JsonObject json) =>
      AccountSettingsModel(
        productEmails: requireBool(json, 'product_emails'),
        marketingEmails: requireBool(json, 'marketing_emails'),
        securityEmails: requireBool(json, 'security_emails'),
        profileVisibility: requireString(json, 'profile_visibility'),
      );

  final bool productEmails;
  final bool marketingEmails;
  final bool securityEmails;
  final String profileVisibility;
}

@immutable
final class PostModel {
  const PostModel({
    required this.id,
    required this.authorId,
    required this.authorHandle,
    required this.kind,
    required this.body,
    required this.visibility,
    required this.lifecycle,
    required this.rawLifecycle,
    required this.createdAt,
    required this.reactionCount,
    required this.commentCount,
    required this.repostCount,
    required this.bookmarked,
    this.viewerReaction,
  });

  factory PostModel.fromJson(JsonObject json) {
    final rawLifecycle = requireString(json, 'lifecycle');
    return PostModel(
      id: requireString(json, 'id'),
      authorId: requireString(json, 'author_id'),
      authorHandle: requireString(json, 'author_handle'),
      kind: requireString(json, 'kind'),
      body: requireString(json, 'body'),
      visibility: requireString(json, 'visibility'),
      lifecycle: parsePostLifecycle(rawLifecycle),
      rawLifecycle: rawLifecycle,
      createdAt: requireDateTime(json, 'created_at'),
      reactionCount: requireInt(json, 'reaction_count'),
      commentCount: requireInt(json, 'comment_count'),
      repostCount: requireInt(json, 'repost_count'),
      bookmarked: requireBool(json, 'bookmarked'),
      viewerReaction: optionalString(json, 'viewer_reaction'),
    );
  }

  final String id;
  final String authorId;
  final String authorHandle;
  final String kind;
  final String body;
  final String visibility;
  final PostLifecycle lifecycle;
  final String rawLifecycle;
  final DateTime createdAt;
  final int reactionCount;
  final int commentCount;
  final int repostCount;
  final bool bookmarked;
  final String? viewerReaction;
}

@immutable
final class CursorPage<T> {
  const CursorPage({required this.items, required this.nextCursor});

  factory CursorPage.fromJson(
    JsonObject json,
    T Function(JsonObject json) parse,
  ) => CursorPage<T>(
    items: requireList(json, 'items')
        .map((value) => parse(requireObject(value, 'page item')))
        .toList(growable: false),
    nextCursor: optionalString(json, 'next_cursor'),
  );

  final List<T> items;
  final String? nextCursor;
}

@immutable
final class CommentModel {
  const CommentModel({
    required this.id,
    required this.authorHandle,
    required this.body,
    required this.createdAt,
  });

  factory CommentModel.fromJson(JsonObject json) => CommentModel(
    id: requireString(json, 'id'),
    authorHandle: requireString(json, 'author_handle'),
    body: requireString(json, 'body'),
    createdAt: requireDateTime(json, 'created_at'),
  );

  final String id;
  final String authorHandle;
  final String body;
  final DateTime createdAt;
}

@immutable
final class ConversationModel {
  const ConversationModel({
    required this.id,
    required this.state,
    required this.updatedAt,
    required this.participantIds,
  });

  factory ConversationModel.fromJson(JsonObject json) => ConversationModel(
    id: requireString(json, 'id'),
    state: requireString(json, 'state'),
    updatedAt: requireDateTime(json, 'updated_at'),
    participantIds: requireList(json, 'participants')
        .map(
          (value) =>
              requireString(requireObject(value, 'participant'), 'user_id'),
        )
        .toList(growable: false),
  );

  final String id;
  final String state;
  final DateTime updatedAt;
  final List<String> participantIds;
}

@immutable
final class MessageModel {
  const MessageModel({
    required this.id,
    required this.senderId,
    required this.body,
    required this.createdAt,
    this.conversationId,
  });

  factory MessageModel.fromJson(JsonObject json) => MessageModel(
    id: requireString(json, 'id'),
    conversationId: optionalString(json, 'conversation_id'),
    senderId: requireString(json, 'sender_id'),
    body: requireString(json, 'body'),
    createdAt: requireDateTime(json, 'created_at'),
  );

  final String id;
  final String? conversationId;
  final String senderId;
  final String body;
  final DateTime createdAt;
}

@immutable
final class WalletBalance {
  const WalletBalance({
    required this.assetCode,
    required this.spendableMinor,
    required this.accountId,
  });

  factory WalletBalance.fromJson(JsonObject json) => WalletBalance(
    assetCode: requireString(json, 'asset_code'),
    spendableMinor: requireInt(json, 'spendable_minor'),
    accountId: requireString(json, 'account_id'),
  );

  final String assetCode;
  final int spendableMinor;
  final String accountId;
}

@immutable
final class LedgerTransactionModel {
  const LedgerTransactionModel({
    required this.id,
    required this.type,
    required this.status,
    required this.createdAt,
  });

  factory LedgerTransactionModel.fromJson(JsonObject json) =>
      LedgerTransactionModel(
        id: requireString(json, 'id'),
        type: requireString(json, 'transaction_type'),
        status: requireString(json, 'status'),
        createdAt: requireDateTime(json, 'created_at'),
      );

  final String id;
  final String type;
  final String status;
  final DateTime createdAt;
}

@immutable
final class PaymentOperationModel {
  const PaymentOperationModel({
    required this.id,
    required this.type,
    required this.status,
    required this.provider,
    required this.amountMinor,
    this.failureCode,
    this.providerData = const <String, dynamic>{},
  });

  factory PaymentOperationModel.fromJson(JsonObject json) =>
      PaymentOperationModel(
        id: requireString(json, 'id'),
        type: requireString(json, 'operation_type'),
        status: requireString(json, 'status'),
        provider: requireString(json, 'provider'),
        amountMinor: requireInt(json, 'amount_minor'),
        failureCode: optionalString(json, 'failure_code'),
        providerData: requireObject(
          json['safe_provider_data'],
          'safe_provider_data',
        ),
      );

  final String id;
  final String type;
  final String status;
  final String provider;
  final int amountMinor;
  final String? failureCode;
  final JsonObject providerData;
}

@immutable
final class GiftModel {
  const GiftModel({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.priceMinor,
    required this.tier,
    required this.state,
    required this.rendererTargets,
  });

  factory GiftModel.fromJson(JsonObject json) => GiftModel(
    id: requireString(json, 'id'),
    slug: requireString(json, 'slug'),
    name: requireString(json, 'name'),
    description: requireString(json, 'description'),
    priceMinor: requireInt(json, 'price_minor'),
    tier: requireString(json, 'tier'),
    state: requireString(json, 'state'),
    rendererTargets: requireList(
      json,
      'renderer_targets',
    ).map((value) => value as String).toList(growable: false),
  );

  final String id;
  final String slug;
  final String name;
  final String description;
  final int priceMinor;
  final String tier;
  final String state;
  final List<String> rendererTargets;
}

@immutable
final class InventoryItemModel {
  const InventoryItemModel({
    required this.id,
    required this.giftDefinitionId,
    required this.quantity,
    required this.unitPriceMinor,
  });

  factory InventoryItemModel.fromJson(JsonObject json) => InventoryItemModel(
    id: requireString(json, 'id'),
    giftDefinitionId: requireString(json, 'gift_definition_id'),
    quantity: requireInt(json, 'quantity'),
    unitPriceMinor: requireInt(json, 'unit_price_minor'),
  );

  final String id;
  final String giftDefinitionId;
  final int quantity;
  final int unitPriceMinor;
}

@immutable
final class GiftEventModel {
  const GiftEventModel({
    required this.event,
    required this.cursor,
    required this.occurredAt,
    required this.payload,
  });

  factory GiftEventModel.fromJson(JsonObject json) => GiftEventModel(
    event: requireString(json, 'event'),
    cursor: requireString(json, 'cursor'),
    occurredAt: requireDateTime(json, 'occurred_at'),
    payload: requireObject(json['payload'], 'gift event payload'),
  );

  final String event;
  final String cursor;
  final DateTime occurredAt;
  final JsonObject payload;
}

@immutable
final class AiSettingsModel {
  const AiSettingsModel({
    required this.consentGranted,
    required this.memoryEnabled,
    required this.preferredLocale,
    required this.capabilityFlags,
  });

  factory AiSettingsModel.fromJson(JsonObject json) => AiSettingsModel(
    consentGranted: requireBool(json, 'consent_granted'),
    memoryEnabled: requireBool(json, 'memory_enabled'),
    preferredLocale: requireString(json, 'preferred_locale'),
    capabilityFlags: requireObject(json['capability_flags'], 'capability_flags')
        .map(
          (key, value) => MapEntry(
            key,
            value is bool
                ? value
                : throw FormatException(
                    '$key capability flag must be boolean.',
                  ),
          ),
        ),
  );

  final bool consentGranted;
  final bool memoryEnabled;
  final String preferredLocale;
  final Map<String, bool> capabilityFlags;
}

@immutable
final class AiProviderStatus {
  const AiProviderStatus({
    required this.capabilities,
    required this.providerNames,
  });

  factory AiProviderStatus.fromJson(JsonObject json) => AiProviderStatus(
    capabilities: requireObject(json['capabilities'], 'capabilities').map(
      (key, value) => MapEntry(
        key,
        value is bool
            ? value
            : throw FormatException('$key capability must be boolean.'),
      ),
    ),
    providerNames: requireList(json, 'providers')
        .map((value) => requireString(requireObject(value, 'provider'), 'name'))
        .toList(growable: false),
  );

  final Map<String, bool> capabilities;
  final List<String> providerNames;

  bool get chatAvailable => capabilities['chat'] ?? false;
}

@immutable
final class AiConversationModel {
  const AiConversationModel({
    required this.id,
    required this.title,
    required this.mode,
    required this.locale,
  });

  factory AiConversationModel.fromJson(JsonObject json) => AiConversationModel(
    id: requireString(json, 'id'),
    title: optionalString(json, 'title'),
    mode: requireString(json, 'mode'),
    locale: requireString(json, 'locale'),
  );

  final String id;
  final String? title;
  final String mode;
  final String locale;
}

@immutable
final class AiCitationModel {
  const AiCitationModel({
    required this.sourceType,
    required this.sourceId,
    this.excerpt,
  });

  factory AiCitationModel.fromJson(JsonObject json) => AiCitationModel(
    sourceType: requireString(json, 'source_type'),
    sourceId: requireString(json, 'source_id'),
    excerpt: optionalString(json, 'safe_excerpt'),
  );

  final String sourceType;
  final String sourceId;
  final String? excerpt;
}

@immutable
final class AiToolProposalModel {
  const AiToolProposalModel({
    required this.id,
    required this.toolName,
    required this.risk,
    required this.state,
  });

  factory AiToolProposalModel.fromJson(JsonObject json) => AiToolProposalModel(
    id: requireString(json, 'id'),
    toolName: requireString(json, 'tool_name'),
    risk: requireString(json, 'risk'),
    state: requireString(json, 'state'),
  );

  final String id;
  final String toolName;
  final String risk;
  final String state;
}

@immutable
final class AiMessageModel {
  const AiMessageModel({
    required this.id,
    required this.role,
    required this.content,
    required this.status,
    required this.citations,
    required this.proposals,
  });

  factory AiMessageModel.fromJson(JsonObject json) => AiMessageModel(
    id: requireString(json, 'id'),
    role: requireString(json, 'role'),
    content: requireString(json, 'content'),
    status: requireString(json, 'status'),
    citations: requireList(json, 'citations')
        .map(
          (value) => AiCitationModel.fromJson(requireObject(value, 'citation')),
        )
        .toList(growable: false),
    proposals: requireList(json, 'proposals')
        .map(
          (value) => AiToolProposalModel.fromJson(
            requireObject(value, 'tool proposal'),
          ),
        )
        .toList(growable: false),
  );

  final String id;
  final String role;
  final String content;
  final String status;
  final List<AiCitationModel> citations;
  final List<AiToolProposalModel> proposals;
}

@immutable
final class LiveDestinationModel {
  const LiveDestinationModel({
    required this.id,
    required this.connectionId,
    required this.state,
    required this.publishEnabled,
    required this.chatEnabled,
    required this.eventsEnabled,
    required this.moderationEnabled,
    required this.analyticsEnabled,
  });

  factory LiveDestinationModel.fromJson(JsonObject json) =>
      LiveDestinationModel(
        id: requireString(json, 'id'),
        connectionId: requireString(json, 'connection_id'),
        state: requireString(json, 'state'),
        publishEnabled: requireBool(json, 'publish_enabled'),
        chatEnabled: requireBool(json, 'chat_enabled'),
        eventsEnabled: requireBool(json, 'events_enabled'),
        moderationEnabled: requireBool(json, 'moderation_enabled'),
        analyticsEnabled: requireBool(json, 'analytics_enabled'),
      );

  final String id;
  final String connectionId;
  final String state;
  final bool publishEnabled;
  final bool chatEnabled;
  final bool eventsEnabled;
  final bool moderationEnabled;
  final bool analyticsEnabled;
}

@immutable
final class LiveSessionModel {
  const LiveSessionModel({
    required this.id,
    required this.title,
    required this.state,
    required this.ingestPath,
    required this.ingestProvisioned,
    this.streamKeyOnce,
    this.destinations = const <LiveDestinationModel>[],
  });

  factory LiveSessionModel.fromJson(JsonObject json) => LiveSessionModel(
    id: requireString(json, 'id'),
    title: requireString(json, 'title'),
    state: requireString(json, 'state'),
    ingestPath: requireString(json, 'ingest_path'),
    ingestProvisioned: requireBool(json, 'ingest_provisioned'),
    streamKeyOnce: optionalString(json, 'stream_key_once'),
    destinations: requireList(json, 'destinations')
        .map(
          (value) => LiveDestinationModel.fromJson(
            requireObject(value, 'live destination'),
          ),
        )
        .toList(growable: false),
  );

  final String id;
  final String title;
  final String state;
  final String ingestPath;
  final bool ingestProvisioned;
  final String? streamKeyOnce;
  final List<LiveDestinationModel> destinations;
}
