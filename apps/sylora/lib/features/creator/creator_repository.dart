import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../auth/auth.dart';

@immutable
final class CreatorAccount {
  const CreatorAccount({
    required this.userId,
    required this.publicSlug,
    required this.channelName,
    required this.category,
    required this.status,
    required this.contentMonetizationEnabled,
    required this.subscriptionsEnabled,
    required this.marketplaceEnabled,
    required this.payoutEligible,
    this.description,
  });

  factory CreatorAccount.fromJson(JsonObject json) => CreatorAccount(
    userId: requireString(json, 'user_id'),
    publicSlug: requireString(json, 'public_slug'),
    channelName: requireString(json, 'channel_name'),
    description: optionalString(json, 'description'),
    category: requireString(json, 'category'),
    status: requireString(json, 'status'),
    contentMonetizationEnabled: requireBool(
      json,
      'content_monetization_enabled',
    ),
    subscriptionsEnabled: requireBool(json, 'subscriptions_enabled'),
    marketplaceEnabled: requireBool(json, 'marketplace_enabled'),
    payoutEligible: requireBool(json, 'payout_eligible'),
  );

  final String userId;
  final String publicSlug;
  final String channelName;
  final String? description;
  final String category;
  final String status;
  final bool contentMonetizationEnabled;
  final bool subscriptionsEnabled;
  final bool marketplaceEnabled;
  final bool payoutEligible;
}

@immutable
final class CreatorAnalytics {
  const CreatorAnalytics({
    required this.contentCount,
    required this.publishedContentCount,
    required this.followerCount,
    required this.activeSubscriptionCount,
    required this.giftCount,
    required this.giftRevenueMinor,
    required this.subscriptionRevenueMinor,
    required this.marketplaceRevenueMinor,
    required this.totalCreatorEarningsMinor,
  });

  factory CreatorAnalytics.fromJson(JsonObject json) => CreatorAnalytics(
    contentCount: requireInt(json, 'content_count'),
    publishedContentCount: requireInt(json, 'published_content_count'),
    followerCount: requireInt(json, 'follower_count'),
    activeSubscriptionCount: requireInt(json, 'active_subscription_count'),
    giftCount: requireInt(json, 'gift_count'),
    giftRevenueMinor: requireInt(json, 'gift_revenue_minor'),
    subscriptionRevenueMinor: requireInt(json, 'subscription_revenue_minor'),
    marketplaceRevenueMinor: requireInt(json, 'marketplace_revenue_minor'),
    totalCreatorEarningsMinor: requireInt(json, 'total_creator_earnings_minor'),
  );

  final int contentCount;
  final int publishedContentCount;
  final int followerCount;
  final int activeSubscriptionCount;
  final int giftCount;
  final int giftRevenueMinor;
  final int subscriptionRevenueMinor;
  final int marketplaceRevenueMinor;
  final int totalCreatorEarningsMinor;
}

@immutable
final class CreatorContent {
  const CreatorContent({
    required this.id,
    required this.creatorUserId,
    required this.kind,
    required this.state,
    required this.visibility,
    required this.createdAt,
    this.requiredTierId,
    this.purchaseProductId,
    this.publishedVersionId,
    this.scheduledAt,
    this.publishedAt,
  });

  factory CreatorContent.fromJson(JsonObject json) => CreatorContent(
    id: requireString(json, 'id'),
    creatorUserId: requireString(json, 'creator_user_id'),
    kind: requireString(json, 'kind'),
    state: requireString(json, 'state'),
    visibility: requireString(json, 'visibility'),
    requiredTierId: optionalString(json, 'required_tier_id'),
    purchaseProductId: optionalString(json, 'purchase_product_id'),
    publishedVersionId: optionalString(json, 'published_version_id'),
    scheduledAt: _optionalDateTime(json, 'scheduled_at'),
    publishedAt: _optionalDateTime(json, 'published_at'),
    createdAt: requireDateTime(json, 'created_at'),
  );

  final String id;
  final String creatorUserId;
  final String kind;
  final String state;
  final String visibility;
  final String? requiredTierId;
  final String? purchaseProductId;
  final String? publishedVersionId;
  final DateTime? scheduledAt;
  final DateTime? publishedAt;
  final DateTime createdAt;
}

@immutable
final class ContentVersion {
  const ContentVersion({
    required this.id,
    required this.contentItemId,
    required this.versionNumber,
    required this.state,
    required this.title,
    required this.metadata,
    required this.createdAt,
    this.summary,
    this.body,
    this.publishedAt,
  });

  factory ContentVersion.fromJson(JsonObject json) => ContentVersion(
    id: requireString(json, 'id'),
    contentItemId: requireString(json, 'content_item_id'),
    versionNumber: requireInt(json, 'version_number'),
    state: requireString(json, 'state'),
    title: requireString(json, 'title'),
    summary: optionalString(json, 'summary'),
    body: optionalString(json, 'body'),
    metadata: requireObject(json['content_metadata'], 'content metadata'),
    createdAt: requireDateTime(json, 'created_at'),
    publishedAt: _optionalDateTime(json, 'published_at'),
  );

  final String id;
  final String contentItemId;
  final int versionNumber;
  final String state;
  final String title;
  final String? summary;
  final String? body;
  final JsonObject metadata;
  final DateTime createdAt;
  final DateTime? publishedAt;
}

@immutable
final class ContentDetail {
  const ContentDetail({
    required this.content,
    required this.version,
    required this.entitled,
  });

  factory ContentDetail.fromJson(JsonObject json) => ContentDetail(
    content: CreatorContent.fromJson(json),
    version: ContentVersion.fromJson(
      requireObject(json['version'], 'content version'),
    ),
    entitled: requireBool(json, 'entitled'),
  );

  final CreatorContent content;
  final ContentVersion version;
  final bool entitled;
}

@immutable
final class SubscriptionTier {
  const SubscriptionTier({
    required this.id,
    required this.creatorUserId,
    required this.name,
    required this.description,
    required this.durationDays,
    required this.benefits,
    required this.active,
    this.priceMinor,
    this.externalSettlementReference,
  });

  factory SubscriptionTier.fromJson(JsonObject json) => SubscriptionTier(
    id: requireString(json, 'id'),
    creatorUserId: requireString(json, 'creator_user_id'),
    name: requireString(json, 'name'),
    description: requireString(json, 'description'),
    priceMinor: _optionalInt(json, 'price_minor'),
    externalSettlementReference: optionalString(
      json,
      'external_settlement_reference',
    ),
    durationDays: requireInt(json, 'duration_days'),
    benefits: requireList(json, 'benefits')
        .map(
          (value) => value is String
              ? value
              : throw const FormatException('benefit must be a string.'),
        )
        .toList(growable: false),
    active: requireBool(json, 'active'),
  );

  final String id;
  final String creatorUserId;
  final String name;
  final String description;
  final int? priceMinor;
  final String? externalSettlementReference;
  final int durationDays;
  final List<String> benefits;
  final bool active;
}

@immutable
final class CreatorSubscription {
  const CreatorSubscription({
    required this.id,
    required this.subscriberUserId,
    required this.creatorUserId,
    required this.tierId,
    required this.status,
    required this.settlementMethod,
    required this.entitlementStartsAt,
    required this.entitlementEndsAt,
    required this.autoRenew,
    this.giftGiverUserId,
    this.provider,
  });

  factory CreatorSubscription.fromJson(JsonObject json) => CreatorSubscription(
    id: requireString(json, 'id'),
    subscriberUserId: requireString(json, 'subscriber_user_id'),
    creatorUserId: requireString(json, 'creator_user_id'),
    tierId: requireString(json, 'tier_id'),
    giftGiverUserId: optionalString(json, 'gift_giver_user_id'),
    status: requireString(json, 'status'),
    settlementMethod: requireString(json, 'settlement_method'),
    entitlementStartsAt: requireDateTime(json, 'entitlement_starts_at'),
    entitlementEndsAt: requireDateTime(json, 'entitlement_ends_at'),
    autoRenew: requireBool(json, 'auto_renew'),
    provider: optionalString(json, 'provider'),
  );

  final String id;
  final String subscriberUserId;
  final String creatorUserId;
  final String tierId;
  final String? giftGiverUserId;
  final String status;
  final String settlementMethod;
  final DateTime entitlementStartsAt;
  final DateTime entitlementEndsAt;
  final bool autoRenew;
  final String? provider;
}

@immutable
final class AssetUploadCapability {
  const AssetUploadCapability({
    required this.assetId,
    required this.objectKey,
    required this.uploadUrl,
    required this.headers,
    required this.expiresInSeconds,
  });

  factory AssetUploadCapability.fromJson(JsonObject json) =>
      AssetUploadCapability(
        assetId: requireString(json, 'asset_id'),
        objectKey: requireString(json, 'object_key'),
        uploadUrl: requireString(json, 'upload_url'),
        headers: requireObject(json['headers'], 'upload headers').map(
          (key, value) => MapEntry(
            key,
            value is String
                ? value
                : throw FormatException('$key upload header must be a string.'),
          ),
        ),
        expiresInSeconds: requireInt(json, 'expires_in_seconds'),
      );

  final String assetId;
  final String objectKey;
  final String uploadUrl;
  final Map<String, String> headers;
  final int expiresInSeconds;
}

@immutable
final class ProcessingJob {
  const ProcessingJob({
    required this.id,
    required this.contentVersionId,
    required this.processor,
    required this.operation,
    required this.state,
    this.providerJobId,
    this.failureCode,
  });

  factory ProcessingJob.fromJson(JsonObject json) => ProcessingJob(
    id: requireString(json, 'id'),
    contentVersionId: requireString(json, 'content_version_id'),
    processor: requireString(json, 'processor'),
    operation: requireString(json, 'operation'),
    state: requireString(json, 'state'),
    providerJobId: optionalString(json, 'provider_job_id'),
    failureCode: optionalString(json, 'failure_code'),
  );

  final String id;
  final String contentVersionId;
  final String processor;
  final String operation;
  final String state;
  final String? providerJobId;
  final String? failureCode;
}

abstract interface class CreatorRepository {
  Future<CreatorAccount> account();
  Future<CreatorAccount> createAccount(JsonObject payload);
  Future<CreatorAccount> updateAccount(JsonObject patch);
  Future<CreatorAnalytics> analytics();
  Future<CursorPage<CreatorContent>> content({
    String? state,
    String? kind,
    String? cursor,
  });
  Future<ContentDetail> contentDetail(String id);
  Future<ContentDetail> createContent(JsonObject payload);
  Future<CreatorContent> updateContent(String id, JsonObject patch);
  Future<ContentVersion> createVersion(String id, JsonObject payload);
  Future<ContentVersion> updateVersion(
    String id,
    String versionId,
    JsonObject patch,
  );
  Future<CreatorContent> contentAction(String id, String action);
  Future<CreatorContent> schedule(String id, DateTime scheduledAt);
  Future<AssetUploadCapability> requestAssetUpload(
    String contentId,
    String versionId,
    JsonObject payload,
  );
  Future<JsonObject> verifyAsset(String contentId, String assetId);
  Future<ProcessingJob> createProcessingJob(
    String contentId,
    String versionId,
    String operation,
  );
  Future<List<SubscriptionTier>> tiers();
  Future<SubscriptionTier> createTier(JsonObject payload);
  Future<SubscriptionTier> updateTier(String id, JsonObject patch);
  Future<CursorPage<CreatorSubscription>> subscriptions({String? cursor});
  Future<CreatorSubscription> subscribe({
    required String tierId,
    required String settlementMethod,
    String? recipientUserId,
    String? returnUrl,
    bool autoRenew = false,
  });
  Future<CreatorSubscription> cancelSubscription(String id);
  Future<CreatorSubscription> renewSubscription(
    String id, {
    String? returnUrl,
    bool autoRenew = false,
  });
  Future<CreatorSubscription> refundSubscription(String id);
}

final class DioCreatorRepository implements CreatorRepository {
  DioCreatorRepository(this._client, {Uuid? uuid})
    : _uuid = uuid ?? const Uuid();

  final ApiClient _client;
  final Uuid _uuid;

  @override
  Future<CreatorAccount> account() async {
    final response = await _client.request('creator/account');
    return CreatorAccount.fromJson(
      requireObject(response.data, 'creator account'),
    );
  }

  @override
  Future<CreatorAccount> createAccount(JsonObject payload) async {
    final response = await _client.request(
      'creator/account',
      method: 'POST',
      data: payload,
    );
    return CreatorAccount.fromJson(
      requireObject(response.data, 'creator account'),
    );
  }

  @override
  Future<CreatorAccount> updateAccount(JsonObject patch) async {
    final response = await _client.request(
      'creator/account',
      method: 'PATCH',
      data: patch,
    );
    return CreatorAccount.fromJson(
      requireObject(response.data, 'creator account'),
    );
  }

  @override
  Future<CreatorAnalytics> analytics() async {
    final response = await _client.request('creator/dashboard');
    return CreatorAnalytics.fromJson(
      requireObject(response.data, 'creator analytics'),
    );
  }

  @override
  Future<CursorPage<CreatorContent>> content({
    String? state,
    String? kind,
    String? cursor,
  }) async {
    final response = await _client.request(
      'content',
      queryParameters: <String, dynamic>{
        'state': state,
        'kind': kind,
        'cursor': cursor,
      },
    );
    return CursorPage<CreatorContent>.fromJson(
      requireObject(response.data, 'creator content'),
      CreatorContent.fromJson,
    );
  }

  @override
  Future<ContentDetail> contentDetail(String id) async {
    final response = await _client.request('content/$id');
    return ContentDetail.fromJson(
      requireObject(response.data, 'content detail'),
    );
  }

  @override
  Future<ContentDetail> createContent(JsonObject payload) async {
    final response = await _client.request(
      'content',
      method: 'POST',
      data: payload,
    );
    return ContentDetail.fromJson(
      requireObject(response.data, 'content detail'),
    );
  }

  @override
  Future<CreatorContent> updateContent(String id, JsonObject patch) async {
    final response = await _client.request(
      'content/$id',
      method: 'PATCH',
      data: patch,
    );
    return CreatorContent.fromJson(
      requireObject(response.data, 'creator content'),
    );
  }

  @override
  Future<ContentVersion> createVersion(String id, JsonObject payload) async {
    final response = await _client.request(
      'content/$id/versions',
      method: 'POST',
      data: payload,
    );
    return ContentVersion.fromJson(
      requireObject(response.data, 'content version'),
    );
  }

  @override
  Future<ContentVersion> updateVersion(
    String id,
    String versionId,
    JsonObject patch,
  ) async {
    final response = await _client.request(
      'content/$id/versions/$versionId',
      method: 'PATCH',
      data: patch,
    );
    return ContentVersion.fromJson(
      requireObject(response.data, 'content version'),
    );
  }

  @override
  Future<CreatorContent> contentAction(String id, String action) async {
    if (!const <String>{
      'submit-review',
      'publish',
      'unpublish',
      'archive',
      'delete',
    }.contains(action)) {
      throw ArgumentError.value(action, 'action');
    }
    final response = await _client.request(
      action == 'delete' ? 'content/$id' : 'content/$id/$action',
      method: action == 'delete' ? 'DELETE' : 'POST',
    );
    return CreatorContent.fromJson(
      requireObject(response.data, 'creator content'),
    );
  }

  @override
  Future<CreatorContent> schedule(String id, DateTime scheduledAt) async {
    final response = await _client.request(
      'content/$id/schedule',
      method: 'POST',
      data: <String, dynamic>{
        'scheduled_at': scheduledAt.toUtc().toIso8601String(),
      },
    );
    return CreatorContent.fromJson(
      requireObject(response.data, 'creator content'),
    );
  }

  @override
  Future<AssetUploadCapability> requestAssetUpload(
    String contentId,
    String versionId,
    JsonObject payload,
  ) async {
    final response = await _client.request(
      'content/$contentId/versions/$versionId/assets/uploads',
      method: 'POST',
      data: payload,
    );
    return AssetUploadCapability.fromJson(
      requireObject(response.data, 'asset upload capability'),
    );
  }

  @override
  Future<JsonObject> verifyAsset(String contentId, String assetId) async {
    final response = await _client.request(
      'content/$contentId/assets/$assetId/verify',
      method: 'POST',
    );
    return requireObject(response.data, 'content asset');
  }

  @override
  Future<ProcessingJob> createProcessingJob(
    String contentId,
    String versionId,
    String operation,
  ) async {
    final response = await _client.request(
      'content/$contentId/versions/$versionId/processing-jobs',
      method: 'POST',
      data: <String, dynamic>{'operation': operation},
    );
    return ProcessingJob.fromJson(
      requireObject(response.data, 'processing job'),
    );
  }

  @override
  Future<List<SubscriptionTier>> tiers() async {
    final response = await _client.request('creator/subscription-tiers');
    return _objects(
      response.data,
      'subscription tiers',
    ).map(SubscriptionTier.fromJson).toList(growable: false);
  }

  @override
  Future<SubscriptionTier> createTier(JsonObject payload) async {
    final response = await _client.request(
      'creator/subscription-tiers',
      method: 'POST',
      data: payload,
    );
    return SubscriptionTier.fromJson(
      requireObject(response.data, 'subscription tier'),
    );
  }

  @override
  Future<SubscriptionTier> updateTier(String id, JsonObject patch) async {
    final response = await _client.request(
      'creator/subscription-tiers/$id',
      method: 'PATCH',
      data: patch,
    );
    return SubscriptionTier.fromJson(
      requireObject(response.data, 'subscription tier'),
    );
  }

  @override
  Future<CursorPage<CreatorSubscription>> subscriptions({
    String? cursor,
  }) async {
    final response = await _client.request(
      'subscriptions',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<CreatorSubscription>.fromJson(
      requireObject(response.data, 'subscriptions'),
      CreatorSubscription.fromJson,
    );
  }

  @override
  Future<CreatorSubscription> subscribe({
    required String tierId,
    required String settlementMethod,
    String? recipientUserId,
    String? returnUrl,
    bool autoRenew = false,
  }) async {
    final response = await _client.request(
      'subscriptions',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{
        'tier_id': tierId,
        'settlement_method': settlementMethod,
        'recipient_user_id': recipientUserId,
        'auto_renew': autoRenew,
        'return_url': returnUrl,
      },
    );
    return CreatorSubscription.fromJson(
      requireObject(response.data, 'subscription'),
    );
  }

  @override
  Future<CreatorSubscription> cancelSubscription(String id) =>
      _subscriptionAction(id, 'cancel');

  @override
  Future<CreatorSubscription> renewSubscription(
    String id, {
    String? returnUrl,
    bool autoRenew = false,
  }) => _subscriptionAction(
    id,
    'renew',
    idempotent: true,
    data: <String, dynamic>{'return_url': returnUrl, 'auto_renew': autoRenew},
  );

  @override
  Future<CreatorSubscription> refundSubscription(String id) =>
      _subscriptionAction(id, 'refund', idempotent: true);

  Future<CreatorSubscription> _subscriptionAction(
    String id,
    String action, {
    bool idempotent = false,
    JsonObject? data,
  }) async {
    final response = await _client.request(
      'subscriptions/$id/$action',
      method: 'POST',
      headers: idempotent
          ? <String, dynamic>{'Idempotency-Key': _uuid.v4()}
          : null,
      data: data,
    );
    return CreatorSubscription.fromJson(
      requireObject(response.data, 'subscription'),
    );
  }
}

DateTime? _optionalDateTime(JsonObject json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) {
      return parsed;
    }
  }
  throw FormatException('$key must be an ISO-8601 date-time or null.');
}

int? _optionalInt(JsonObject json, String key) {
  final value = json[key];
  if (value == null || value is int) {
    return value as int?;
  }
  throw FormatException('$key must be an integer or null.');
}

List<JsonObject> _objects(Object? value, String context) {
  if (value is! List<dynamic>) {
    throw FormatException('$context must be a JSON array.');
  }
  return value
      .map((item) => requireObject(item, '$context item'))
      .toList(growable: false);
}

final creatorRepositoryProvider = Provider<CreatorRepository>(
  (ref) => DioCreatorRepository(ref.watch(apiClientProvider)),
);
