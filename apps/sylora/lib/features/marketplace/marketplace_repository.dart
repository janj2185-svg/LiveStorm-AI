import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../auth/auth.dart';

@immutable
final class CatalogProduct {
  const CatalogProduct({
    required this.id,
    required this.storeId,
    required this.slug,
    required this.kind,
    required this.category,
    required this.state,
    required this.title,
    required this.description,
    required this.amountMinor,
    required this.currency,
    required this.settlementMethod,
    required this.ratingCount,
    this.quantityAvailable,
    this.ratingAverage,
    this.publishedVersionId,
  });

  factory CatalogProduct.fromJson(JsonObject json) => CatalogProduct(
    id: requireString(json, 'id'),
    storeId: requireString(json, 'store_id'),
    slug: requireString(json, 'slug'),
    kind: requireString(json, 'kind'),
    category: requireString(json, 'category'),
    state: requireString(json, 'state'),
    title: requireString(json, 'title'),
    description: requireString(json, 'description'),
    amountMinor: requireInt(json, 'amount_minor'),
    currency: requireString(json, 'currency'),
    settlementMethod: requireString(json, 'settlement_method'),
    quantityAvailable: _optionalInt(json, 'quantity_available'),
    ratingAverage: _optionalInt(json, 'rating_average'),
    ratingCount: requireInt(json, 'rating_count'),
    publishedVersionId: optionalString(json, 'published_version_id'),
  );

  final String id;
  final String storeId;
  final String slug;
  final String kind;
  final String category;
  final String state;
  final String title;
  final String description;
  final int amountMinor;
  final String currency;
  final String settlementMethod;
  final int? quantityAvailable;
  final int? ratingAverage;
  final int ratingCount;
  final String? publishedVersionId;
}

@immutable
final class SellerProduct {
  const SellerProduct({
    required this.id,
    required this.storeId,
    required this.slug,
    required this.kind,
    required this.category,
    required this.state,
    required this.createdAt,
    this.publishedVersionId,
  });

  factory SellerProduct.fromJson(JsonObject json) => SellerProduct(
    id: requireString(json, 'id'),
    storeId: requireString(json, 'store_id'),
    slug: requireString(json, 'slug'),
    kind: requireString(json, 'kind'),
    category: requireString(json, 'category'),
    state: requireString(json, 'state'),
    publishedVersionId: optionalString(json, 'published_version_id'),
    createdAt: requireDateTime(json, 'created_at'),
  );

  final String id;
  final String storeId;
  final String slug;
  final String kind;
  final String category;
  final String state;
  final String? publishedVersionId;
  final DateTime createdAt;
}

@immutable
final class MarketplaceCartItem {
  const MarketplaceCartItem({
    required this.id,
    required this.productId,
    required this.productVersionId,
    required this.quantity,
    required this.unitPriceMinor,
    required this.currency,
    required this.settlementMethod,
    required this.title,
  });

  factory MarketplaceCartItem.fromJson(JsonObject json) => MarketplaceCartItem(
    id: requireString(json, 'id'),
    productId: requireString(json, 'product_id'),
    productVersionId: requireString(json, 'product_version_id'),
    quantity: requireInt(json, 'quantity'),
    unitPriceMinor: requireInt(json, 'unit_price_minor'),
    currency: requireString(json, 'currency'),
    settlementMethod: requireString(json, 'settlement_method'),
    title: requireString(json, 'title_snapshot'),
  );

  final String id;
  final String productId;
  final String productVersionId;
  final int quantity;
  final int unitPriceMinor;
  final String currency;
  final String settlementMethod;
  final String title;
}

@immutable
final class MarketplaceCart {
  const MarketplaceCart({
    required this.id,
    required this.items,
    required this.subtotalMinor,
    this.currency,
  });

  factory MarketplaceCart.fromJson(JsonObject json) => MarketplaceCart(
    id: requireString(json, 'id'),
    items: requireList(json, 'items')
        .map(
          (value) =>
              MarketplaceCartItem.fromJson(requireObject(value, 'cart item')),
        )
        .toList(growable: false),
    subtotalMinor: requireInt(json, 'subtotal_minor'),
    currency: optionalString(json, 'currency'),
  );

  final String id;
  final List<MarketplaceCartItem> items;
  final int subtotalMinor;
  final String? currency;
}

@immutable
final class MarketplaceOrderLine {
  const MarketplaceOrderLine({
    required this.id,
    required this.productId,
    required this.productVersionId,
    required this.sellerUserId,
    required this.productKind,
    required this.title,
    required this.quantity,
    required this.lineTotalMinor,
  });

  factory MarketplaceOrderLine.fromJson(JsonObject json) =>
      MarketplaceOrderLine(
        id: requireString(json, 'id'),
        productId: requireString(json, 'product_id'),
        productVersionId: requireString(json, 'product_version_id'),
        sellerUserId: requireString(json, 'seller_user_id'),
        productKind: requireString(json, 'product_kind'),
        title: requireString(json, 'title_snapshot'),
        quantity: requireInt(json, 'quantity'),
        lineTotalMinor: requireInt(json, 'line_total_minor'),
      );

  final String id;
  final String productId;
  final String productVersionId;
  final String sellerUserId;
  final String productKind;
  final String title;
  final int quantity;
  final int lineTotalMinor;
}

@immutable
final class MarketplaceOrder {
  const MarketplaceOrder({
    required this.id,
    required this.buyerUserId,
    required this.buyerDisplayName,
    required this.state,
    required this.settlementMethod,
    required this.currency,
    required this.subtotalMinor,
    required this.feeMinor,
    required this.totalMinor,
    required this.safeProviderData,
    required this.createdAt,
    required this.lines,
    this.provider,
    this.providerOperationId,
  });

  factory MarketplaceOrder.fromJson(JsonObject json) => MarketplaceOrder(
    id: requireString(json, 'id'),
    buyerUserId: requireString(json, 'buyer_user_id'),
    buyerDisplayName: requireString(json, 'buyer_display_name'),
    state: requireString(json, 'state'),
    settlementMethod: requireString(json, 'settlement_method'),
    currency: requireString(json, 'currency'),
    subtotalMinor: requireInt(json, 'subtotal_minor'),
    feeMinor: requireInt(json, 'fee_minor'),
    totalMinor: requireInt(json, 'total_minor'),
    provider: optionalString(json, 'provider'),
    providerOperationId: optionalString(json, 'provider_operation_id'),
    safeProviderData: requireObject(
      json['safe_provider_data'],
      'safe provider data',
    ),
    createdAt: requireDateTime(json, 'created_at'),
    lines: requireList(json, 'lines')
        .map(
          (value) =>
              MarketplaceOrderLine.fromJson(requireObject(value, 'order line')),
        )
        .toList(growable: false),
  );

  final String id;
  final String buyerUserId;
  final String buyerDisplayName;
  final String state;
  final String settlementMethod;
  final String currency;
  final int subtotalMinor;
  final int feeMinor;
  final int totalMinor;
  final String? provider;
  final String? providerOperationId;
  final JsonObject safeProviderData;
  final DateTime createdAt;
  final List<MarketplaceOrderLine> lines;
}

@immutable
final class MarketplaceEntitlement {
  const MarketplaceEntitlement({
    required this.id,
    required this.productId,
    required this.productVersionId,
    required this.orderLineId,
    required this.state,
    required this.downloadCount,
    required this.grantedAt,
    this.downloadLimit,
    this.expiresAt,
  });

  factory MarketplaceEntitlement.fromJson(JsonObject json) =>
      MarketplaceEntitlement(
        id: requireString(json, 'id'),
        productId: requireString(json, 'product_id'),
        productVersionId: requireString(json, 'product_version_id'),
        orderLineId: requireString(json, 'order_line_id'),
        state: requireString(json, 'state'),
        expiresAt: _optionalDateTime(json, 'expires_at'),
        downloadLimit: _optionalInt(json, 'download_limit'),
        downloadCount: requireInt(json, 'download_count'),
        grantedAt: requireDateTime(json, 'granted_at'),
      );

  final String id;
  final String productId;
  final String productVersionId;
  final String orderLineId;
  final String state;
  final DateTime? expiresAt;
  final int? downloadLimit;
  final int downloadCount;
  final DateTime grantedAt;
}

@immutable
final class ProductReview {
  const ProductReview({
    required this.id,
    required this.productId,
    required this.orderLineId,
    required this.reviewerUserId,
    required this.rating,
    required this.createdAt,
    this.body,
  });

  factory ProductReview.fromJson(JsonObject json) => ProductReview(
    id: requireString(json, 'id'),
    productId: requireString(json, 'product_id'),
    orderLineId: requireString(json, 'order_line_id'),
    reviewerUserId: requireString(json, 'reviewer_user_id'),
    rating: requireInt(json, 'rating'),
    body: optionalString(json, 'body'),
    createdAt: requireDateTime(json, 'created_at'),
  );

  final String id;
  final String productId;
  final String orderLineId;
  final String reviewerUserId;
  final int rating;
  final String? body;
  final DateTime createdAt;
}

@immutable
final class SellerStore {
  const SellerStore({
    required this.id,
    required this.ownerUserId,
    required this.slug,
    required this.name,
    required this.active,
    required this.platformFeeBps,
    this.description,
  });

  factory SellerStore.fromJson(JsonObject json) => SellerStore(
    id: requireString(json, 'id'),
    ownerUserId: requireString(json, 'owner_user_id'),
    slug: requireString(json, 'slug'),
    name: requireString(json, 'name'),
    description: optionalString(json, 'description'),
    active: requireBool(json, 'active'),
    platformFeeBps: requireInt(json, 'platform_fee_bps'),
  );

  final String id;
  final String ownerUserId;
  final String slug;
  final String name;
  final String? description;
  final bool active;
  final int platformFeeBps;
}

@immutable
final class ServiceBooking {
  const ServiceBooking({
    required this.id,
    required this.orderLineId,
    required this.buyerUserId,
    required this.sellerUserId,
    required this.status,
    this.requestedStartAt,
    this.scheduledStartAt,
    this.scheduledEndAt,
  });

  factory ServiceBooking.fromJson(JsonObject json) => ServiceBooking(
    id: requireString(json, 'id'),
    orderLineId: requireString(json, 'order_line_id'),
    buyerUserId: requireString(json, 'buyer_user_id'),
    sellerUserId: requireString(json, 'seller_user_id'),
    status: requireString(json, 'status'),
    requestedStartAt: _optionalDateTime(json, 'requested_start_at'),
    scheduledStartAt: _optionalDateTime(json, 'scheduled_start_at'),
    scheduledEndAt: _optionalDateTime(json, 'scheduled_end_at'),
  );

  final String id;
  final String orderLineId;
  final String buyerUserId;
  final String sellerUserId;
  final String status;
  final DateTime? requestedStartAt;
  final DateTime? scheduledStartAt;
  final DateTime? scheduledEndAt;
}

abstract interface class MarketplaceRepository {
  Future<CursorPage<CatalogProduct>> catalog({
    String? search,
    String? category,
    String? kind,
    String? cursor,
  });
  Future<CatalogProduct> product(String id);
  Future<CursorPage<ProductReview>> reviews(String productId, {String? cursor});
  Future<MarketplaceCart> cart();
  Future<MarketplaceCart> addToCart(
    String productId, {
    int quantity = 1,
    String settlementMethod = 'credits',
  });
  Future<MarketplaceCart> updateCartItem(String itemId, int quantity);
  Future<MarketplaceCart> removeCartItem(String itemId);
  Future<MarketplaceCart> clearCart();
  Future<MarketplaceOrder> checkout({
    required String settlementMethod,
    String? returnUrl,
  });
  Future<CursorPage<MarketplaceOrder>> orders({String? cursor});
  Future<MarketplaceOrder> order(String id);
  Future<CursorPage<MarketplaceEntitlement>> entitlements({String? cursor});
  Future<JsonObject> download(String entitlementId, String assetId);
  Future<ProductReview> createReview({
    required String orderLineId,
    required int rating,
    String? body,
  });
  Future<SellerStore> store();
  Future<SellerStore> createStore(JsonObject payload);
  Future<SellerStore> updateStore(JsonObject patch);
  Future<CursorPage<SellerProduct>> sellerProducts({String? cursor});
  Future<SellerProduct> createProduct(JsonObject payload);
  Future<SellerProduct> updateProduct(String productId, JsonObject patch);
  Future<JsonObject> createProductVersion(String productId, JsonObject payload);
  Future<JsonObject> addProductPrice(String productId, JsonObject payload);
  Future<JsonObject> updateProductInventory(String productId, JsonObject patch);
  Future<SellerProduct> productAction(String productId, String action);
  Future<CursorPage<MarketplaceOrder>> sellerSales({String? cursor});
  Future<MarketplaceOrder> refundOrder(String orderId, String reason);
  Future<ServiceBooking> booking(String id);
  Future<ServiceBooking> updateBooking(String id, JsonObject patch);
  Future<JsonObject> addBookingMessage(String id, String body);
}

final class DioMarketplaceRepository implements MarketplaceRepository {
  DioMarketplaceRepository(this._client, {Uuid? uuid})
    : _uuid = uuid ?? const Uuid();

  final ApiClient _client;
  final Uuid _uuid;

  @override
  Future<CursorPage<CatalogProduct>> catalog({
    String? search,
    String? category,
    String? kind,
    String? cursor,
  }) async {
    final response = await _client.request(
      'marketplace/catalog',
      queryParameters: <String, dynamic>{
        'search': search,
        'category': category,
        'kind': kind,
        'cursor': cursor,
      },
    );
    return CursorPage<CatalogProduct>.fromJson(
      requireObject(response.data, 'marketplace catalog'),
      CatalogProduct.fromJson,
    );
  }

  @override
  Future<CatalogProduct> product(String id) async {
    final response = await _client.request('marketplace/catalog/$id');
    return CatalogProduct.fromJson(
      requireObject(response.data, 'catalog product'),
    );
  }

  @override
  Future<CursorPage<ProductReview>> reviews(
    String productId, {
    String? cursor,
  }) async {
    final response = await _client.request(
      'marketplace/catalog/$productId/reviews',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<ProductReview>.fromJson(
      requireObject(response.data, 'product reviews'),
      ProductReview.fromJson,
    );
  }

  @override
  Future<MarketplaceCart> cart() async {
    final response = await _client.request('marketplace/cart');
    return MarketplaceCart.fromJson(
      requireObject(response.data, 'marketplace cart'),
    );
  }

  @override
  Future<MarketplaceCart> addToCart(
    String productId, {
    int quantity = 1,
    String settlementMethod = 'credits',
  }) async {
    final response = await _client.request(
      'marketplace/cart/items',
      method: 'POST',
      data: <String, dynamic>{
        'product_id': productId,
        'quantity': quantity,
        'settlement_method': settlementMethod,
      },
    );
    return MarketplaceCart.fromJson(
      requireObject(response.data, 'marketplace cart'),
    );
  }

  @override
  Future<MarketplaceCart> updateCartItem(String itemId, int quantity) async {
    final response = await _client.request(
      'marketplace/cart/items/$itemId',
      method: 'PATCH',
      data: <String, dynamic>{'quantity': quantity},
    );
    return MarketplaceCart.fromJson(
      requireObject(response.data, 'marketplace cart'),
    );
  }

  @override
  Future<MarketplaceCart> removeCartItem(String itemId) async {
    final response = await _client.request(
      'marketplace/cart/items/$itemId',
      method: 'DELETE',
    );
    return MarketplaceCart.fromJson(
      requireObject(response.data, 'marketplace cart'),
    );
  }

  @override
  Future<MarketplaceCart> clearCart() async {
    final response = await _client.request(
      'marketplace/cart',
      method: 'DELETE',
    );
    return MarketplaceCart.fromJson(
      requireObject(response.data, 'marketplace cart'),
    );
  }

  @override
  Future<MarketplaceOrder> checkout({
    required String settlementMethod,
    String? returnUrl,
  }) async {
    final response = await _client.request(
      'marketplace/checkout',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{
        'settlement_method': settlementMethod,
        'return_url': returnUrl,
      },
    );
    return MarketplaceOrder.fromJson(
      requireObject(response.data, 'marketplace order'),
    );
  }

  @override
  Future<CursorPage<MarketplaceOrder>> orders({String? cursor}) =>
      _orderPage('marketplace/orders', cursor);

  @override
  Future<MarketplaceOrder> order(String id) async {
    final response = await _client.request('marketplace/orders/$id');
    return MarketplaceOrder.fromJson(
      requireObject(response.data, 'marketplace order'),
    );
  }

  @override
  Future<CursorPage<MarketplaceEntitlement>> entitlements({
    String? cursor,
  }) async {
    final response = await _client.request(
      'marketplace/entitlements',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<MarketplaceEntitlement>.fromJson(
      requireObject(response.data, 'marketplace entitlements'),
      MarketplaceEntitlement.fromJson,
    );
  }

  @override
  Future<JsonObject> download(String entitlementId, String assetId) async {
    final response = await _client.request(
      'marketplace/downloads/$entitlementId/$assetId',
      method: 'POST',
    );
    final json = requireObject(response.data, 'marketplace download');
    requireString(json, 'download_url');
    requireInt(json, 'expires_in_seconds');
    requireInt(json, 'download_count');
    _optionalInt(json, 'download_limit');
    return json;
  }

  @override
  Future<ProductReview> createReview({
    required String orderLineId,
    required int rating,
    String? body,
  }) async {
    final response = await _client.request(
      'marketplace/reviews',
      method: 'POST',
      data: <String, dynamic>{
        'order_line_id': orderLineId,
        'rating': rating,
        'body': body,
      },
    );
    return ProductReview.fromJson(
      requireObject(response.data, 'product review'),
    );
  }

  @override
  Future<SellerStore> store() async {
    final response = await _client.request('marketplace/seller/store');
    return SellerStore.fromJson(requireObject(response.data, 'seller store'));
  }

  @override
  Future<SellerStore> createStore(JsonObject payload) async {
    final response = await _client.request(
      'marketplace/seller/store',
      method: 'POST',
      data: payload,
    );
    return SellerStore.fromJson(requireObject(response.data, 'seller store'));
  }

  @override
  Future<SellerStore> updateStore(JsonObject patch) async {
    final response = await _client.request(
      'marketplace/seller/store',
      method: 'PATCH',
      data: patch,
    );
    return SellerStore.fromJson(requireObject(response.data, 'seller store'));
  }

  @override
  Future<CursorPage<SellerProduct>> sellerProducts({String? cursor}) async {
    final response = await _client.request(
      'marketplace/seller/products',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<SellerProduct>.fromJson(
      requireObject(response.data, 'seller products'),
      SellerProduct.fromJson,
    );
  }

  @override
  Future<SellerProduct> createProduct(JsonObject payload) async {
    final response = await _client.request(
      'marketplace/seller/products',
      method: 'POST',
      data: payload,
    );
    return SellerProduct.fromJson(
      requireObject(response.data, 'seller product'),
    );
  }

  @override
  Future<SellerProduct> updateProduct(
    String productId,
    JsonObject patch,
  ) async {
    final response = await _client.request(
      'marketplace/seller/products/$productId',
      method: 'PATCH',
      data: patch,
    );
    return SellerProduct.fromJson(
      requireObject(response.data, 'seller product'),
    );
  }

  @override
  Future<JsonObject> createProductVersion(
    String productId,
    JsonObject payload,
  ) async {
    final response = await _client.request(
      'marketplace/seller/products/$productId/versions',
      method: 'POST',
      data: payload,
    );
    return requireObject(response.data, 'seller product version');
  }

  @override
  Future<JsonObject> addProductPrice(
    String productId,
    JsonObject payload,
  ) async {
    final response = await _client.request(
      'marketplace/seller/products/$productId/prices',
      method: 'POST',
      data: payload,
    );
    return requireObject(response.data, 'seller product price');
  }

  @override
  Future<JsonObject> updateProductInventory(
    String productId,
    JsonObject patch,
  ) async {
    final response = await _client.request(
      'marketplace/seller/products/$productId/inventory',
      method: 'PATCH',
      data: patch,
    );
    return requireObject(response.data, 'seller product inventory');
  }

  @override
  Future<SellerProduct> productAction(String productId, String action) async {
    if (!const <String>{'publish', 'retire'}.contains(action)) {
      throw ArgumentError.value(action, 'action');
    }
    final response = await _client.request(
      'marketplace/seller/products/$productId/$action',
      method: 'POST',
    );
    return SellerProduct.fromJson(
      requireObject(response.data, 'seller product'),
    );
  }

  @override
  Future<CursorPage<MarketplaceOrder>> sellerSales({String? cursor}) =>
      _orderPage('marketplace/seller/sales', cursor);

  @override
  Future<MarketplaceOrder> refundOrder(String orderId, String reason) async {
    final response = await _client.request(
      'marketplace/seller/orders/$orderId/refund',
      method: 'POST',
      headers: <String, dynamic>{'Idempotency-Key': _uuid.v4()},
      data: <String, dynamic>{'reason': reason},
    );
    return MarketplaceOrder.fromJson(
      requireObject(response.data, 'marketplace order'),
    );
  }

  @override
  Future<ServiceBooking> booking(String id) async {
    final response = await _client.request('marketplace/orders/bookings/$id');
    return ServiceBooking.fromJson(
      requireObject(response.data, 'service booking'),
    );
  }

  @override
  Future<ServiceBooking> updateBooking(String id, JsonObject patch) async {
    final response = await _client.request(
      'marketplace/orders/bookings/$id',
      method: 'PATCH',
      data: patch,
    );
    return ServiceBooking.fromJson(
      requireObject(response.data, 'service booking'),
    );
  }

  @override
  Future<JsonObject> addBookingMessage(String id, String body) async {
    final response = await _client.request(
      'marketplace/orders/bookings/$id/messages',
      method: 'POST',
      data: <String, dynamic>{'body': body},
    );
    final json = requireObject(response.data, 'booking message');
    requireString(json, 'id');
    requireString(json, 'booking_id');
    requireString(json, 'sender_user_id');
    requireString(json, 'body');
    requireDateTime(json, 'created_at');
    return json;
  }

  Future<CursorPage<MarketplaceOrder>> _orderPage(
    String path,
    String? cursor,
  ) async {
    final response = await _client.request(
      path,
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<MarketplaceOrder>.fromJson(
      requireObject(response.data, path),
      MarketplaceOrder.fromJson,
    );
  }
}

int? _optionalInt(JsonObject json, String key) {
  final value = json[key];
  if (value == null || value is int) {
    return value as int?;
  }
  throw FormatException('$key must be an integer or null.');
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

final marketplaceRepositoryProvider = Provider<MarketplaceRepository>(
  (ref) => DioMarketplaceRepository(ref.watch(apiClientProvider)),
);
