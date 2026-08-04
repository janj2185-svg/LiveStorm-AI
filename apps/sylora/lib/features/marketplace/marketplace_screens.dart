import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';
import 'marketplace_repository.dart';

@immutable
final class _MarketplaceSnapshot {
  const _MarketplaceSnapshot({
    required this.catalog,
    required this.cart,
    required this.orders,
    required this.entitlements,
  });

  final CursorPage<CatalogProduct> catalog;
  final MarketplaceCart cart;
  final CursorPage<MarketplaceOrder> orders;
  final CursorPage<MarketplaceEntitlement> entitlements;
}

final _marketplaceProvider = FutureProvider.autoDispose<_MarketplaceSnapshot>((
  ref,
) async {
  final repository = ref.watch(marketplaceRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.catalog(),
    repository.cart(),
    repository.orders(),
    repository.entitlements(),
  ]);
  return _MarketplaceSnapshot(
    catalog: values[0] as CursorPage<CatalogProduct>,
    cart: values[1] as MarketplaceCart,
    orders: values[2] as CursorPage<MarketplaceOrder>,
    entitlements: values[3] as CursorPage<MarketplaceEntitlement>,
  );
});

final class MarketplaceScreen extends ConsumerWidget {
  const MarketplaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(_marketplaceProvider);
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final seller = roles.contains('creator') || roles.contains('admin');
    return LumenPage(
      title: 'Marketplace',
      subtitle:
          'The persisted catalog, cart, orders, entitlements, and seller APIs.',
      intensity: 0.9,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.marketplace,
      actions: <Widget>[
        if (seller)
          IconButton(
            tooltip: 'Seller workspace',
            onPressed: () => context.pushNamed('marketplace-seller'),
            icon: const Icon(Icons.storefront_outlined),
          ),
      ],
      header: SyloraUniverseHero(
        eyebrow: 'COMMERCE',
        title: 'Marketplace',
        body:
            'Catalog, cart, orders and creator commerce — glass surfaces with living motion.',
        trailing: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            if (seller)
              SyloraPortalChip(
                label: 'Seller',
                icon: Icons.storefront_rounded,
                onTap: () => context.pushNamed('marketplace-seller'),
              ),
            SyloraPortalChip(
              label: 'Gift Shop',
              icon: Icons.storefront_outlined,
              onTap: () => context.goNamed('gifts'),
            ),
            SyloraPortalChip(
              label: 'Aura',
              icon: Icons.auto_awesome_rounded,
              onTap: () => context.goNamed('ai'),
            ),
          ],
        ),
      ),
      child: LumenAsyncView<_MarketplaceSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(_marketplaceProvider),
        data: (snapshot) => DefaultTabController(
          length: 4,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const TabBar(
                isScrollable: true,
                tabs: <Tab>[
                  Tab(text: 'All'),
                  Tab(text: 'Cart'),
                  Tab(text: 'Orders'),
                  Tab(text: 'Library'),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: (MediaQuery.sizeOf(context).height * 0.72).clamp(
                  480.0,
                  920.0,
                ),
                child: TabBarView(
                  children: <Widget>[
                    _CatalogView(initialPage: snapshot.catalog),
                    MarketplaceCartView(
                      cart: snapshot.cart,
                      onChanged: () => ref.invalidate(_marketplaceProvider),
                    ),
                    _OrdersView(initialPage: snapshot.orders),
                    _EntitlementsView(
                      initialPage: snapshot.entitlements,
                      onChanged: () => ref.invalidate(_marketplaceProvider),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _CatalogView extends ConsumerStatefulWidget {
  const _CatalogView({required this.initialPage});

  final CursorPage<CatalogProduct> initialPage;

  @override
  ConsumerState<_CatalogView> createState() => _CatalogViewState();
}

final class _CatalogViewState extends ConsumerState<_CatalogView> {
  final _search = TextEditingController();
  final _category = TextEditingController();
  late List<CatalogProduct> _items;
  String? _cursor;
  String? _kind;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _items = widget.initialPage.items.toList();
    _cursor = widget.initialPage.nextCursor;
  }

  @override
  void dispose() {
    _search.dispose();
    _category.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      Wrap(
        spacing: 10,
        runSpacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          SizedBox(
            width: 240,
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                labelText: 'Search products',
                prefixIcon: Icon(Icons.search_rounded),
              ),
              onSubmitted: (_) => _reload(),
            ),
          ),
          SizedBox(
            width: 190,
            child: TextField(
              controller: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              onSubmitted: (_) => _reload(),
            ),
          ),
          SizedBox(
            width: 180,
            child: DropdownButtonFormField<String?>(
              initialValue: _kind,
              decoration: const InputDecoration(labelText: 'Kind'),
              items: const <DropdownMenuItem<String?>>[
                DropdownMenuItem(value: null, child: Text('All')),
                DropdownMenuItem(value: 'digital', child: Text('Digital')),
                DropdownMenuItem(value: 'service', child: Text('Service')),
              ],
              onChanged: (value) {
                setState(() => _kind = value);
                _reload();
              },
            ),
          ),
          FilledButton.icon(
            onPressed: _busy ? null : _reload,
            icon: const Icon(Icons.tune_rounded),
            label: const Text('Apply'),
          ),
        ],
      ),
      const SizedBox(height: 14),
      Expanded(
        child: _items.isEmpty
            ? LumenEmptyView(
                title: 'No marketplace products',
                message:
                    'The catalog API returned no products for these filters.',
                actionLabel: 'Clear filters',
                onAction: _clear,
                icon: Icons.storefront_outlined,
              )
            : ListView(
                children: <Widget>[
                  for (final product in _items)
                    Card(
                      child: ListTile(
                        leading: Icon(
                          product.kind == 'digital'
                              ? Icons.download_outlined
                              : product.kind == 'service'
                              ? Icons.event_available_outlined
                              : Icons.inventory_2_outlined,
                        ),
                        title: Text(product.title),
                        subtitle: Text(
                          '${product.category} • ${product.amountMinor} ${product.currency}'
                          ' • ${product.ratingCount} reviews',
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => context.pushNamed(
                          'marketplace-product',
                          pathParameters: <String, String>{'id': product.id},
                        ),
                      ),
                    ),
                  if (_cursor != null)
                    Center(
                      child: TextButton.icon(
                        onPressed: _busy ? null : _loadMore,
                        icon: const Icon(Icons.expand_more_rounded),
                        label: const Text('Load more'),
                      ),
                    ),
                ],
              ),
      ),
    ],
  );

  Future<void> _clear() async {
    _search.clear();
    _category.clear();
    setState(() => _kind = null);
    await _reload();
  }

  Future<void> _reload() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(marketplaceRepositoryProvider)
          .catalog(
            search: _blankToNull(_search.text),
            category: _blankToNull(_category.text),
            kind: _kind,
          );
      if (mounted) {
        setState(() {
          _items = page.items.toList();
          _cursor = page.nextCursor;
        });
      }
    } on Object catch (error) {
      _notify(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _loadMore() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(marketplaceRepositoryProvider)
          .catalog(
            search: _blankToNull(_search.text),
            category: _blankToNull(_category.text),
            kind: _kind,
            cursor: _cursor,
          );
      if (mounted) {
        setState(() {
          _items.addAll(page.items);
          _cursor = page.nextCursor;
        });
      }
    } on Object catch (error) {
      _notify(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _notify(Object error) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }
}

final class MarketplaceCartView extends ConsumerStatefulWidget {
  const MarketplaceCartView({
    required this.cart,
    required this.onChanged,
    super.key,
  });

  final MarketplaceCart cart;
  final VoidCallback onChanged;

  @override
  ConsumerState<MarketplaceCartView> createState() =>
      _MarketplaceCartViewState();
}

final class _MarketplaceCartViewState
    extends ConsumerState<MarketplaceCartView> {
  bool _busy = false;
  String? _result;
  bool _resultIsError = false;

  @override
  Widget build(BuildContext context) => ListView(
    children: <Widget>[
      if (widget.cart.items.isEmpty)
        LumenEmptyView(
          title: 'Your cart is empty',
          message: 'The persisted marketplace cart contains no items.',
          actionLabel: 'Browse catalog',
          onAction: () => DefaultTabController.of(context).animateTo(0),
          icon: Icons.shopping_cart_outlined,
        )
      else ...<Widget>[
        for (final item in widget.cart.items)
          Card(
            child: ListTile(
              title: Text(item.title),
              subtitle: Text(
                '${item.quantity} × ${item.unitPriceMinor} ${item.currency}'
                ' • ${item.settlementMethod}',
              ),
              trailing: Wrap(
                spacing: 4,
                children: <Widget>[
                  IconButton(
                    tooltip: 'Decrease quantity',
                    onPressed: _busy || item.quantity <= 1
                        ? null
                        : () => _quantity(item, item.quantity - 1),
                    icon: const Icon(Icons.remove_rounded),
                  ),
                  IconButton(
                    tooltip: 'Increase quantity',
                    onPressed: _busy
                        ? null
                        : () => _quantity(item, item.quantity + 1),
                    icon: const Icon(Icons.add_rounded),
                  ),
                  IconButton(
                    tooltip: 'Remove item',
                    onPressed: _busy ? null : () => _remove(item),
                    icon: const Icon(Icons.delete_outline_rounded),
                  ),
                ],
              ),
            ),
          ),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Subtotal: ${widget.cart.subtotalMinor} '
                '${widget.cart.currency ?? ''}',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: <Widget>[
                  LumenPrimaryButton(
                    label: 'Checkout with credits',
                    busy: _busy,
                    onPressed: () => _checkout('credits'),
                    icon: Icons.account_balance_wallet_outlined,
                  ),
                  LumenSecondaryButton(
                    label: 'External checkout',
                    onPressed: _busy ? null : () => _checkout('external'),
                    icon: Icons.open_in_new_rounded,
                  ),
                  TextButton(
                    onPressed: _busy ? null : _clear,
                    child: const Text('Clear cart'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
      if (_result != null) ...<Widget>[
        const SizedBox(height: 14),
        LumenSurface(
          child: SelectableText(
            _result!,
            style: TextStyle(
              color: _resultIsError
                  ? Theme.of(context).colorScheme.error
                  : null,
            ),
          ),
        ),
      ],
    ],
  );

  Future<void> _quantity(MarketplaceCartItem item, int quantity) async =>
      _mutate(
        () => ref
            .read(marketplaceRepositoryProvider)
            .updateCartItem(item.id, quantity),
      );

  Future<void> _remove(MarketplaceCartItem item) async => _mutate(
    () => ref.read(marketplaceRepositoryProvider).removeCartItem(item.id),
  );

  Future<void> _clear() async =>
      _mutate(() => ref.read(marketplaceRepositoryProvider).clearCart());

  Future<void> _mutate(Future<MarketplaceCart> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      widget.onChanged();
    } on Object catch (error) {
      _setError(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _checkout(String method) async {
    setState(() {
      _busy = true;
      _result = null;
    });
    try {
      final order = await ref
          .read(marketplaceRepositoryProvider)
          .checkout(
            settlementMethod: method,
            returnUrl: method == 'external' ? Uri.base.toString() : null,
          );
      final redirect =
          order.safeProviderData['checkout_url'] ??
          order.safeProviderData['redirect_url'];
      if (redirect is String && Uri.tryParse(redirect) != null) {
        await launchUrl(
          Uri.parse(redirect),
          mode: LaunchMode.externalApplication,
        );
      }
      if (mounted) {
        setState(() {
          _result =
              'Order ${order.id} is ${order.state}.'
              '${redirect is String ? ' The payment provider was opened.' : ''}';
          _resultIsError = false;
        });
      }
      widget.onChanged();
    } on Object catch (error) {
      _setError(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _setError(Object error) {
    if (mounted) {
      setState(() {
        _result = error is ApiProblem
            ? '${error.title}\n${error.detail}'
            : messageFor(error);
        _resultIsError = true;
      });
    }
  }
}

final class _OrdersView extends ConsumerStatefulWidget {
  const _OrdersView({required this.initialPage});

  final CursorPage<MarketplaceOrder> initialPage;

  @override
  ConsumerState<_OrdersView> createState() => _OrdersViewState();
}

final class _OrdersViewState extends ConsumerState<_OrdersView> {
  late final List<MarketplaceOrder> _items = widget.initialPage.items.toList();
  late String? _cursor = widget.initialPage.nextCursor;
  bool _busy = false;

  @override
  Widget build(BuildContext context) => _items.isEmpty
      ? LumenEmptyView(
          title: 'No marketplace orders',
          message: 'The purchase history API returned no orders.',
          actionLabel: 'Browse catalog',
          onAction: () => DefaultTabController.of(context).animateTo(0),
          icon: Icons.receipt_long_outlined,
        )
      : ListView(
          children: <Widget>[
            for (final order in _items)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: Text(
                    '${order.totalMinor} ${order.currency} • ${order.lines.length} items',
                  ),
                  subtitle: Text(
                    DateFormat.yMMMd().add_jm().format(
                      order.createdAt.toLocal(),
                    ),
                  ),
                  trailing: LumenBadge(label: order.state),
                  onTap: () => context.pushNamed(
                    'marketplace-order',
                    pathParameters: <String, String>{'id': order.id},
                  ),
                ),
              ),
            if (_cursor != null)
              Center(
                child: TextButton.icon(
                  onPressed: _busy ? null : _loadMore,
                  icon: const Icon(Icons.expand_more_rounded),
                  label: const Text('Load more'),
                ),
              ),
          ],
        );

  Future<void> _loadMore() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(marketplaceRepositoryProvider)
          .orders(cursor: _cursor);
      if (mounted) {
        setState(() {
          _items.addAll(page.items);
          _cursor = page.nextCursor;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class _EntitlementsView extends ConsumerStatefulWidget {
  const _EntitlementsView({required this.initialPage, required this.onChanged});

  final CursorPage<MarketplaceEntitlement> initialPage;
  final VoidCallback onChanged;

  @override
  ConsumerState<_EntitlementsView> createState() => _EntitlementsViewState();
}

final class _EntitlementsViewState extends ConsumerState<_EntitlementsView> {
  late final List<MarketplaceEntitlement> _items = widget.initialPage.items
      .toList();
  late String? _cursor = widget.initialPage.nextCursor;
  bool _busy = false;

  @override
  Widget build(BuildContext context) => _items.isEmpty
      ? LumenEmptyView(
          title: 'No digital entitlements',
          message: 'The entitlement API returned no purchased downloads.',
          actionLabel: 'Browse catalog',
          onAction: () => DefaultTabController.of(context).animateTo(0),
          icon: Icons.download_outlined,
        )
      : ListView(
          children: <Widget>[
            const Text(
              'The current entitlement response does not expose product asset '
              'IDs. Enter the asset ID supplied with the purchased product.',
            ),
            const SizedBox(height: 10),
            for (final entitlement in _items)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.verified_user_outlined),
                  title: Text(
                    'Product ${entitlement.productId.substring(0, 8)}',
                  ),
                  subtitle: Text(
                    '${entitlement.downloadCount}'
                    '${entitlement.downloadLimit == null ? '' : '/${entitlement.downloadLimit}'} downloads',
                  ),
                  trailing: FilledButton.tonal(
                    onPressed: entitlement.state == 'active'
                        ? () => _download(entitlement)
                        : null,
                    child: const Text('Download'),
                  ),
                ),
              ),
            if (_cursor != null)
              Center(
                child: TextButton.icon(
                  onPressed: _busy ? null : _loadMore,
                  icon: const Icon(Icons.expand_more_rounded),
                  label: const Text('Load more'),
                ),
              ),
          ],
        );

  Future<void> _download(MarketplaceEntitlement entitlement) async {
    final controller = TextEditingController();
    final assetId = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Download purchased asset'),
        content: TextFormField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Product asset ID'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.pop(dialogContext, controller.text.trim());
              }
            },
            child: const Text('Request download'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (assetId == null) {
      return;
    }
    try {
      final result = await ref
          .read(marketplaceRepositoryProvider)
          .download(entitlement.id, assetId);
      final uri = Uri.parse(requireString(result, 'download_url'));
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      widget.onChanged();
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  Future<void> _loadMore() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(marketplaceRepositoryProvider)
          .entitlements(cursor: _cursor);
      if (mounted) {
        setState(() {
          _items.addAll(page.items);
          _cursor = page.nextCursor;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class MarketplaceProductScreen extends ConsumerStatefulWidget {
  const MarketplaceProductScreen({required this.productId, super.key});

  final String productId;

  @override
  ConsumerState<MarketplaceProductScreen> createState() =>
      _MarketplaceProductScreenState();
}

final class _MarketplaceProductScreenState
    extends ConsumerState<MarketplaceProductScreen> {
  late Future<(CatalogProduct, CursorPage<ProductReview>, MarketplaceOrder?)>
  _future = _load();
  bool _busy = false;
  String? _message;

  Future<(CatalogProduct, CursorPage<ProductReview>, MarketplaceOrder?)>
  _load() async {
    final repository = ref.read(marketplaceRepositoryProvider);
    final product = await repository.product(widget.productId);
    final reviews = await repository.reviews(widget.productId);
    MarketplaceOrder? purchasedOrder;
    String? cursor;
    do {
      final orders = await repository.orders(cursor: cursor);
      for (final order in orders.items) {
        if (order.lines.any((line) => line.productId == widget.productId)) {
          purchasedOrder = order;
          break;
        }
      }
      cursor = orders.nextCursor;
    } while (purchasedOrder == null && cursor != null);
    return (product, reviews, purchasedOrder);
  }

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Product',
    subtitle: 'Catalog detail, cart entry, and verified reviews.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.marketplace,
    child:
        FutureBuilder<
          (CatalogProduct, CursorPage<ProductReview>, MarketplaceOrder?)
        >(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return LumenErrorView(
                error: snapshot.error!,
                onRetry: () => setState(() => _future = _load()),
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final (product, reviews, purchasedOrder) = snapshot.data!;
            final purchasedLine = purchasedOrder?.lines
                .where((line) => line.productId == product.id)
                .firstOrNull;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                LumenSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        product.title,
                        style: Theme.of(context).textTheme.headlineLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(product.description),
                      const SizedBox(height: 12),
                      Text(
                        '${product.amountMinor} ${product.currency} • '
                        '${product.settlementMethod} settlement',
                      ),
                      if (product.quantityAvailable != null)
                        Text('${product.quantityAvailable} available'),
                      const SizedBox(height: 16),
                      LumenPrimaryButton(
                        label: 'Add to cart',
                        busy: _busy,
                        onPressed: () => _add(product),
                        icon: Icons.add_shopping_cart_rounded,
                      ),
                    ],
                  ),
                ),
                if (_message != null) ...<Widget>[
                  const SizedBox(height: 12),
                  LumenSurface(child: Text(_message!)),
                ],
                const SizedBox(height: 20),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        'Verified-purchase reviews',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ),
                    LumenSecondaryButton(
                      label: 'Write review',
                      onPressed: purchasedLine == null
                          ? null
                          : () => _review(purchasedLine.id),
                      disabledReason:
                          'Only a buyer with an order line for this product can review it.',
                      icon: Icons.rate_review_outlined,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (reviews.items.isEmpty)
                  const Text('The reviews API returned no reviews.')
                else
                  for (final review in reviews.items)
                    Card(
                      child: ListTile(
                        leading: Text('${review.rating}/5'),
                        title: Text(review.body ?? 'Rating only'),
                        subtitle: Text(
                          DateFormat.yMMMd().format(review.createdAt.toLocal()),
                        ),
                      ),
                    ),
              ],
            );
          },
        ),
  );

  Future<void> _add(CatalogProduct product) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(marketplaceRepositoryProvider)
          .addToCart(product.id, settlementMethod: product.settlementMethod);
      setState(() => _message = 'Added to the persisted cart.');
    } on Object catch (error) {
      setState(() => _message = messageFor(error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _review(String orderLineId) async {
    var rating = 5;
    final body = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Review verified purchase'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              DropdownButtonFormField<int>(
                initialValue: rating,
                decoration: const InputDecoration(labelText: 'Rating'),
                items: <DropdownMenuItem<int>>[
                  for (var value = 1; value <= 5; value += 1)
                    DropdownMenuItem(value: value, child: Text('$value of 5')),
                ],
                onChanged: (value) =>
                    setDialogState(() => rating = value ?? rating),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: body,
                maxLength: 2000,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Review (optional)',
                ),
              ),
            ],
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                try {
                  await ref
                      .read(marketplaceRepositoryProvider)
                      .createReview(
                        orderLineId: orderLineId,
                        rating: rating,
                        body: _blankToNull(body.text),
                      );
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
              child: const Text('Publish review'),
            ),
          ],
        ),
      ),
    );
    body.dispose();
    if (submitted ?? false) {
      setState(() => _future = _load());
    }
  }
}

final class MarketplaceOrderScreen extends ConsumerWidget {
  const MarketplaceOrderScreen({required this.orderId, super.key});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) => LumenPage(
    title: 'Order detail',
    subtitle: 'Marketplace settlement and line item record.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.marketplace,
    child: FutureBuilder<MarketplaceOrder>(
      future: ref.read(marketplaceRepositoryProvider).order(orderId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(
            error: snapshot.error!,
            onRetry: () => context.pushReplacementNamed(
              'marketplace-order',
              pathParameters: <String, String>{'id': orderId},
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final order = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          '${order.totalMinor} ${order.currency}',
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                      LumenBadge(label: order.state),
                    ],
                  ),
                  Text('Settlement: ${order.settlementMethod}'),
                  Text('Buyer: ${order.buyerDisplayName}'),
                  if (order.safeProviderData.isNotEmpty) ...<Widget>[
                    const Divider(),
                    const Text('Safe provider response'),
                    for (final entry in order.safeProviderData.entries.take(8))
                      SelectableText('${entry.key}: ${entry.value}'),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            for (final line in order.lines)
              Card(
                child: ListTile(
                  title: Text(line.title),
                  subtitle: Text(
                    '${line.quantity} • ${line.lineTotalMinor} • ${line.productKind}',
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}

final class MarketplaceSellerScreen extends ConsumerStatefulWidget {
  const MarketplaceSellerScreen({super.key});

  @override
  ConsumerState<MarketplaceSellerScreen> createState() =>
      _MarketplaceSellerScreenState();
}

final class _MarketplaceSellerScreenState
    extends ConsumerState<MarketplaceSellerScreen> {
  late Future<
    (SellerStore?, CursorPage<SellerProduct>, CursorPage<MarketplaceOrder>)
  >
  _future = _load();

  Future<
    (SellerStore?, CursorPage<SellerProduct>, CursorPage<MarketplaceOrder>)
  >
  _load() async {
    final repository = ref.read(marketplaceRepositoryProvider);
    SellerStore? store;
    try {
      store = await repository.store();
    } on ApiProblem catch (error) {
      if (error.code != 'marketplace_store_required') {
        rethrow;
      }
    }
    if (store == null) {
      return (
        null,
        const CursorPage<SellerProduct>(
          items: <SellerProduct>[],
          nextCursor: null,
        ),
        const CursorPage<MarketplaceOrder>(
          items: <MarketplaceOrder>[],
          nextCursor: null,
        ),
      );
    }
    final values = await Future.wait<Object>(<Future<Object>>[
      repository.sellerProducts(),
      repository.sellerSales(),
    ]);
    return (
      store,
      values[0] as CursorPage<SellerProduct>,
      values[1] as CursorPage<MarketplaceOrder>,
    );
  }

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Seller workspace',
    subtitle: 'Store setup, seller products, sales, and service bookings.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.marketplace,
    maxContentWidth: 1180,
    child:
        FutureBuilder<
          (
            SellerStore?,
            CursorPage<SellerProduct>,
            CursorPage<MarketplaceOrder>,
          )
        >(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return LumenErrorView(error: snapshot.error!, onRetry: _refresh);
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final (store, products, sales) = snapshot.data!;
            if (store == null) {
              return _StoreOnboarding(onCreated: _refresh);
            }
            return DefaultTabController(
              length: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  const TabBar(
                    isScrollable: true,
                    tabs: <Tab>[
                      Tab(
                        icon: Icon(Icons.storefront_outlined),
                        text: 'Store & products',
                      ),
                      Tab(
                        icon: Icon(Icons.point_of_sale_outlined),
                        text: 'Sales',
                      ),
                      Tab(
                        icon: Icon(Icons.event_available_outlined),
                        text: 'Bookings',
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: (MediaQuery.sizeOf(context).height * 0.72).clamp(
                      480.0,
                      920.0,
                    ),
                    child: TabBarView(
                      children: <Widget>[
                        _SellerProducts(
                          store: store,
                          products: products.items,
                          onChanged: _refresh,
                        ),
                        _SellerSales(sales: sales.items, onChanged: _refresh),
                        const _BookingLookup(),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
  );

  void _refresh() => setState(() => _future = _load());
}

final class _StoreOnboarding extends ConsumerStatefulWidget {
  const _StoreOnboarding({required this.onCreated});

  final VoidCallback onCreated;

  @override
  ConsumerState<_StoreOnboarding> createState() => _StoreOnboardingState();
}

final class _StoreOnboardingState extends ConsumerState<_StoreOnboarding> {
  final _form = GlobalKey<FormState>();
  final _slug = TextEditingController();
  final _name = TextEditingController();
  final _description = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _slug.dispose();
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 720),
      child: LumenSurface(
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Icon(Icons.storefront_outlined, size: 48),
              const SizedBox(height: 12),
              Text(
                'Open your marketplace store',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              const Text(
                'Choose a public store identity now. After setup, you can create product drafts, configure prices and inventory, then publish when ready.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),
              TextFormField(
                controller: _slug,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Store slug',
                  helperText:
                      'Public URL: lowercase letters, numbers, and hyphens.',
                ),
                validator: _slugValidator,
              ),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Store name'),
                validator: _requiredTwo,
              ),
              TextFormField(
                controller: _description,
                maxLength: 1000,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                ),
              ),
              if (_error != null)
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              const SizedBox(height: 12),
              LumenPrimaryButton(
                label: 'Create store',
                busy: _busy,
                onPressed: _submit,
                icon: Icons.arrow_forward_rounded,
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(marketplaceRepositoryProvider)
          .createStore(<String, dynamic>{
            'slug': _slug.text.trim(),
            'name': _name.text.trim(),
            'description': _blankToNull(_description.text),
          });
      widget.onCreated();
    } on Object catch (error) {
      setState(() => _error = messageFor(error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class _SellerProducts extends ConsumerWidget {
  const _SellerProducts({
    required this.store,
    required this.products,
    required this.onChanged,
  });

  final SellerStore store;
  final List<SellerProduct> products;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) => LayoutBuilder(
    builder: (context, constraints) {
      final desktop = constraints.maxWidth >= 820;
      final cardWidth = desktop
          ? (constraints.maxWidth - 52) / 2
          : constraints.maxWidth - 40;
      return ListView(
        padding: const EdgeInsets.all(20),
        children: <Widget>[
          LumenSurface(
            child: Wrap(
              spacing: 16,
              runSpacing: 14,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: <Widget>[
                SizedBox(
                  width: desktop ? constraints.maxWidth - 260 : cardWidth,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: <Widget>[
                          Text(
                            store.name,
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          LumenBadge(
                            label: store.active ? 'active' : 'inactive',
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('/${store.slug} • ${store.platformFeeBps} bps fee'),
                      if (store.description?.trim().isNotEmpty ?? false) ...[
                        const SizedBox(height: 6),
                        Text(store.description!),
                      ],
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => _editStore(context, ref),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit store'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Products',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  Text(
                    '${products.length} ${products.length == 1 ? 'listing' : 'listings'}',
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: () => _createProduct(context, ref),
                icon: const Icon(Icons.add_rounded),
                label: const Text('New product'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (products.isEmpty)
            LumenEmptyView(
              title: 'Your store has no products yet',
              message:
                  'Create a draft, review its content and pricing, then publish it when it is ready for buyers.',
              actionLabel: 'Create your first product',
              onAction: () => _createProduct(context, ref),
              icon: Icons.inventory_2_outlined,
            )
          else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: <Widget>[
                for (final product in products)
                  SizedBox(
                    width: cardWidth,
                    child: _productCard(context, ref, product),
                  ),
              ],
            ),
        ],
      );
    },
  );

  Widget _productCard(
    BuildContext context,
    WidgetRef ref,
    SellerProduct product,
  ) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  product.slug,
                  style: Theme.of(context).textTheme.titleLarge,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              LumenBadge(label: product.state),
            ],
          ),
          const SizedBox(height: 6),
          Text('${product.kind} • ${product.category}'),
          Text(
            'Created ${DateFormat.yMMMd().format(product.createdAt.toLocal())}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.end,
            children: <Widget>[
              OutlinedButton.icon(
                onPressed: () => _editProduct(context, ref, product),
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('Edit listing'),
              ),
              PopupMenuButton<String>(
                tooltip: 'More product actions',
                onSelected: (action) =>
                    _handleProductAction(context, ref, product, action),
                itemBuilder: (context) => <PopupMenuEntry<String>>[
                  const PopupMenuItem(
                    value: 'new-version',
                    child: ListTile(
                      leading: Icon(Icons.note_add_outlined),
                      title: Text('New content version'),
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'price',
                    child: ListTile(
                      leading: Icon(Icons.sell_outlined),
                      title: Text('Update price'),
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'inventory',
                    child: ListTile(
                      leading: Icon(Icons.inventory_outlined),
                      title: Text('Update inventory'),
                    ),
                  ),
                  if (product.state != 'published')
                    const PopupMenuItem(
                      value: 'publish',
                      child: ListTile(
                        leading: Icon(Icons.public_rounded),
                        title: Text('Publish'),
                      ),
                    ),
                  if (product.state == 'published')
                    const PopupMenuItem(
                      value: 'retire',
                      child: ListTile(
                        leading: Icon(Icons.archive_outlined),
                        title: Text('Retire'),
                      ),
                    ),
                ],
                child: const Padding(
                  padding: EdgeInsets.all(10),
                  child: Icon(Icons.more_horiz_rounded),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  Future<void> _editStore(BuildContext context, WidgetRef ref) async {
    final form = GlobalKey<FormState>();
    final name = TextEditingController(text: store.name);
    final description = TextEditingController(text: store.description);
    var active = store.active;
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit store'),
          content: SizedBox(
            width: 520,
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  TextFormField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Store name'),
                    validator: _requiredTwo,
                  ),
                  TextFormField(
                    controller: description,
                    maxLength: 1000,
                    minLines: 2,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Description (optional)',
                    ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Store visible in marketplace'),
                    subtitle: const Text(
                      'Turning this off hides every published product.',
                    ),
                    value: active,
                    onChanged: (value) => setDialogState(() => active = value),
                  ),
                ],
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) {
                  return;
                }
                try {
                  await ref
                      .read(marketplaceRepositoryProvider)
                      .updateStore(<String, dynamic>{
                        'name': name.text.trim(),
                        'description': _blankToNull(description.text),
                        'active': active,
                      });
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, true);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    _showError(dialogContext, error);
                  }
                }
              },
              child: const Text('Save changes'),
            ),
          ],
        ),
      ),
    );
    name.dispose();
    description.dispose();
    if (saved ?? false) {
      onChanged();
    }
  }

  Future<void> _editProduct(
    BuildContext context,
    WidgetRef ref,
    SellerProduct product,
  ) async {
    final form = GlobalKey<FormState>();
    final slug = TextEditingController(text: product.slug);
    final category = TextEditingController(text: product.category);
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit product listing'),
        content: SizedBox(
          width: 520,
          child: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  controller: slug,
                  decoration: const InputDecoration(labelText: 'Slug'),
                  validator: _slugValidator,
                ),
                TextFormField(
                  controller: category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  validator: _requiredTwo,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Use the product actions menu to create a new content version, update pricing, or change inventory.',
                ),
              ],
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!form.currentState!.validate()) {
                return;
              }
              try {
                await ref
                    .read(marketplaceRepositoryProvider)
                    .updateProduct(product.id, <String, dynamic>{
                      'slug': slug.text.trim(),
                      'category': category.text.trim().toLowerCase(),
                    });
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  _showError(dialogContext, error);
                }
              }
            },
            child: const Text('Save changes'),
          ),
        ],
      ),
    );
    slug.dispose();
    category.dispose();
    if (saved ?? false) {
      onChanged();
    }
  }

  Future<void> _handleProductAction(
    BuildContext context,
    WidgetRef ref,
    SellerProduct product,
    String action,
  ) async {
    switch (action) {
      case 'new-version':
        await _newProductVersion(context, ref, product);
        return;
      case 'price':
        await _updatePrice(context, ref, product);
        return;
      case 'inventory':
        await _updateInventory(context, ref, product);
        return;
      case 'publish':
      case 'retire':
        final verb = action == 'publish' ? 'Publish' : 'Retire';
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text('$verb ${product.slug}?'),
            content: Text(
              action == 'publish'
                  ? 'This makes the latest complete version available to marketplace buyers.'
                  : 'This removes the product from the catalog. Existing purchases remain available.',
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: Text(verb),
              ),
            ],
          ),
        );
        if (!(confirmed ?? false)) {
          return;
        }
        try {
          await ref
              .read(marketplaceRepositoryProvider)
              .productAction(product.id, action);
          onChanged();
        } on Object catch (error) {
          if (context.mounted) {
            _showError(context, error);
          }
        }
    }
  }

  Future<void> _newProductVersion(
    BuildContext context,
    WidgetRef ref,
    SellerProduct product,
  ) async {
    final form = GlobalKey<FormState>();
    final title = TextEditingController();
    final description = TextEditingController();
    final terms = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create content version'),
        content: SizedBox(
          width: 560,
          child: Form(
            key: form,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  const Text(
                    'A new version returns this listing to draft so you can review it before publishing.',
                  ),
                  TextFormField(
                    controller: title,
                    maxLength: 200,
                    decoration: const InputDecoration(labelText: 'Title'),
                    validator: _requiredTwo,
                  ),
                  TextFormField(
                    controller: description,
                    maxLength: 20000,
                    minLines: 3,
                    maxLines: 7,
                    decoration: const InputDecoration(labelText: 'Description'),
                    validator: _requiredTwo,
                  ),
                  TextFormField(
                    controller: terms,
                    maxLength: 2000,
                    minLines: 2,
                    maxLines: 5,
                    decoration: const InputDecoration(
                      labelText: 'Fulfillment terms',
                    ),
                    validator: _requiredTwo,
                  ),
                ],
              ),
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!form.currentState!.validate()) {
                return;
              }
              try {
                await ref
                    .read(marketplaceRepositoryProvider)
                    .createProductVersion(product.id, <String, dynamic>{
                      'title': title.text.trim(),
                      'description': description.text.trim(),
                      'fulfillment_terms': terms.text.trim(),
                    });
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  _showError(dialogContext, error);
                }
              }
            },
            child: const Text('Create draft version'),
          ),
        ],
      ),
    );
    title.dispose();
    description.dispose();
    terms.dispose();
    if (saved ?? false) {
      onChanged();
    }
  }

  Future<void> _updatePrice(
    BuildContext context,
    WidgetRef ref,
    SellerProduct product,
  ) async {
    final form = GlobalKey<FormState>();
    final amount = TextEditingController();
    final externalReference = TextEditingController();
    var settlement = 'credits';
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Update product price'),
          content: SizedBox(
            width: 520,
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  const Text(
                    'The new price replaces the active price for this settlement method.',
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: settlement,
                    decoration: const InputDecoration(labelText: 'Settlement'),
                    items: const <DropdownMenuItem<String>>[
                      DropdownMenuItem(
                        value: 'credits',
                        child: Text('Credits'),
                      ),
                      DropdownMenuItem(
                        value: 'external',
                        child: Text('External provider'),
                      ),
                    ],
                    onChanged: (value) =>
                        setDialogState(() => settlement = value ?? settlement),
                  ),
                  TextFormField(
                    controller: amount,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Amount in minor units',
                    ),
                    validator: _positiveInt,
                  ),
                  if (settlement == 'external')
                    TextFormField(
                      controller: externalReference,
                      decoration: const InputDecoration(
                        labelText: 'Payment provider price reference',
                      ),
                      validator: _requiredTwo,
                    ),
                ],
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) {
                  return;
                }
                try {
                  await ref
                      .read(marketplaceRepositoryProvider)
                      .addProductPrice(product.id, <String, dynamic>{
                        'settlement_method': settlement,
                        'amount_minor': int.parse(amount.text),
                        'currency': settlement == 'credits'
                            ? 'SYLORA_CREDIT'
                            : 'USD',
                        'external_reference': settlement == 'external'
                            ? externalReference.text.trim()
                            : null,
                        'available_from': null,
                        'available_until': null,
                      });
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, true);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    _showError(dialogContext, error);
                  }
                }
              },
              child: const Text('Update price'),
            ),
          ],
        ),
      ),
    );
    amount.dispose();
    externalReference.dispose();
    if (saved ?? false) {
      onChanged();
    }
  }

  Future<void> _updateInventory(
    BuildContext context,
    WidgetRef ref,
    SellerProduct product,
  ) async {
    final form = GlobalKey<FormState>();
    final quantity = TextEditingController();
    var unlimited = true;
    var active = true;
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Update product inventory'),
          content: SizedBox(
            width: 520,
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Unlimited availability'),
                    value: unlimited,
                    onChanged: (value) =>
                        setDialogState(() => unlimited = value),
                  ),
                  if (!unlimited)
                    TextFormField(
                      controller: quantity,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Quantity available',
                      ),
                      validator: _nonNegativeInt,
                    ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Available for purchase'),
                    value: active,
                    onChanged: (value) => setDialogState(() => active = value),
                  ),
                ],
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) {
                  return;
                }
                try {
                  await ref
                      .read(marketplaceRepositoryProvider)
                      .updateProductInventory(product.id, <String, dynamic>{
                        'quantity_available': unlimited
                            ? null
                            : int.parse(quantity.text),
                        'active': active,
                      });
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, true);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    _showError(dialogContext, error);
                  }
                }
              },
              child: const Text('Update inventory'),
            ),
          ],
        ),
      ),
    );
    quantity.dispose();
    if (saved ?? false) {
      onChanged();
    }
  }

  void _showError(BuildContext context, Object error) {
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }

  Future<void> _createProduct(BuildContext context, WidgetRef ref) async {
    final form = GlobalKey<FormState>();
    final slug = TextEditingController();
    final title = TextEditingController();
    final category = TextEditingController();
    final description = TextEditingController();
    final terms = TextEditingController();
    final amount = TextEditingController();
    final externalReference = TextEditingController();
    final quantity = TextEditingController();
    var kind = 'digital';
    var settlement = 'credits';
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New marketplace product'),
          content: SizedBox(
            width: 540,
            child: Form(
              key: form,
              child: SingleChildScrollView(
                child: Column(
                  children: <Widget>[
                    TextFormField(
                      controller: slug,
                      autofocus: true,
                      decoration: const InputDecoration(
                        labelText: 'Slug',
                        helperText:
                            'Public URL: lowercase letters, numbers, and hyphens.',
                      ),
                      validator: _slugValidator,
                    ),
                    TextFormField(
                      controller: title,
                      decoration: const InputDecoration(labelText: 'Title'),
                      validator: _requiredTwo,
                    ),
                    TextFormField(
                      controller: category,
                      decoration: const InputDecoration(labelText: 'Category'),
                      validator: _requiredTwo,
                    ),
                    TextFormField(
                      controller: description,
                      minLines: 3,
                      maxLines: 6,
                      maxLength: 20000,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                      ),
                      validator: _requiredTwo,
                    ),
                    TextFormField(
                      controller: terms,
                      minLines: 2,
                      maxLines: 4,
                      maxLength: 2000,
                      decoration: const InputDecoration(
                        labelText: 'Fulfillment terms',
                        helperText:
                            'Tell buyers how and when this product is delivered.',
                      ),
                      validator: _requiredTwo,
                    ),
                    DropdownButtonFormField<String>(
                      initialValue: kind,
                      decoration: const InputDecoration(labelText: 'Kind'),
                      items: const <DropdownMenuItem<String>>[
                        DropdownMenuItem(
                          value: 'digital',
                          child: Text('Digital'),
                        ),
                        DropdownMenuItem(
                          value: 'service',
                          child: Text('Service'),
                        ),
                      ],
                      onChanged: (value) =>
                          setDialogState(() => kind = value ?? kind),
                    ),
                    if (kind == 'digital')
                      const Padding(
                        padding: EdgeInsets.only(top: 10),
                        child: Text(
                          'Digital products need a verified asset before they can be published.',
                        ),
                      ),
                    DropdownButtonFormField<String>(
                      initialValue: settlement,
                      decoration: const InputDecoration(
                        labelText: 'Settlement',
                      ),
                      items: const <DropdownMenuItem<String>>[
                        DropdownMenuItem(
                          value: 'credits',
                          child: Text('Credits'),
                        ),
                        DropdownMenuItem(
                          value: 'external',
                          child: Text('External provider'),
                        ),
                      ],
                      onChanged: (value) => setDialogState(
                        () => settlement = value ?? settlement,
                      ),
                    ),
                    TextFormField(
                      controller: amount,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Amount in minor units',
                      ),
                      validator: _positiveInt,
                    ),
                    if (settlement == 'external')
                      TextFormField(
                        controller: externalReference,
                        decoration: const InputDecoration(
                          labelText: 'Payment provider price reference',
                        ),
                        validator: _requiredTwo,
                      ),
                    TextFormField(
                      controller: quantity,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Quantity available (optional)',
                      ),
                      validator: (value) => value?.trim().isEmpty ?? true
                          ? null
                          : _nonNegativeInt(value),
                    ),
                  ],
                ),
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) {
                  return;
                }
                try {
                  await ref
                      .read(marketplaceRepositoryProvider)
                      .createProduct(<String, dynamic>{
                        'slug': slug.text.trim(),
                        'kind': kind,
                        'category': category.text.trim().toLowerCase(),
                        'title': title.text.trim(),
                        'description': description.text.trim(),
                        'fulfillment_terms': terms.text.trim(),
                        'settlement_method': settlement,
                        'amount_minor': int.parse(amount.text),
                        'currency': settlement == 'credits'
                            ? 'SYLORA_CREDIT'
                            : 'USD',
                        'external_reference': settlement == 'external'
                            ? externalReference.text.trim()
                            : null,
                        'quantity_available': quantity.text.trim().isNotEmpty
                            ? int.parse(quantity.text)
                            : null,
                        'available_from': null,
                        'available_until': null,
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
              child: const Text('Create draft'),
            ),
          ],
        ),
      ),
    );
    slug.dispose();
    title.dispose();
    category.dispose();
    description.dispose();
    terms.dispose();
    amount.dispose();
    externalReference.dispose();
    quantity.dispose();
    if (created ?? false) {
      onChanged();
    }
  }
}

final class _SellerSales extends ConsumerWidget {
  const _SellerSales({required this.sales, required this.onChanged});

  final List<MarketplaceOrder> sales;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (sales.isEmpty) {
      return LumenEmptyView(
        title: 'No customer orders yet',
        message:
            'Published products and completed checkouts will appear here with fulfillment and refund actions.',
        actionLabel: 'Refresh orders',
        onAction: onChanged,
        icon: Icons.point_of_sale_outlined,
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final desktop = constraints.maxWidth >= 820;
        final cardWidth = desktop
            ? (constraints.maxWidth - 52) / 2
            : constraints.maxWidth - 40;
        return ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text(
              'Customer orders',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 4),
            Text('${sales.length} ${sales.length == 1 ? 'order' : 'orders'}'),
            const SizedBox(height: 14),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: <Widget>[
                for (final order in sales)
                  SizedBox(
                    width: cardWidth,
                    child: Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: <Widget>[
                            Row(
                              children: <Widget>[
                                Expanded(
                                  child: Text(
                                    '${order.totalMinor} ${order.currency}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleLarge,
                                  ),
                                ),
                                LumenBadge(label: order.state),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(order.buyerDisplayName),
                            Text(
                              '${order.lines.length} ${order.lines.length == 1 ? 'item' : 'items'} • '
                              '${DateFormat.yMMMd().format(order.createdAt.toLocal())}',
                            ),
                            const SizedBox(height: 14),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              alignment: WrapAlignment.end,
                              children: <Widget>[
                                OutlinedButton.icon(
                                  onPressed: () => context.pushNamed(
                                    'marketplace-order',
                                    pathParameters: <String, String>{
                                      'id': order.id,
                                    },
                                  ),
                                  icon: const Icon(
                                    Icons.receipt_long_outlined,
                                    size: 18,
                                  ),
                                  label: const Text('View order'),
                                ),
                                LumenSecondaryButton(
                                  label: 'Refund',
                                  onPressed:
                                      const <String>{
                                        'paid',
                                        'fulfilling',
                                        'completed',
                                      }.contains(order.state)
                                      ? () => _refund(context, ref, order)
                                      : null,
                                  disabledReason:
                                      'Only paid or fulfilled orders can refund.',
                                  icon: Icons.undo_rounded,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }

  Future<void> _refund(
    BuildContext context,
    WidgetRef ref,
    MarketplaceOrder order,
  ) async {
    final controller = TextEditingController();
    final form = GlobalKey<FormState>();
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Refund marketplace order'),
        content: Form(
          key: form,
          child: TextFormField(
            controller: controller,
            maxLength: 500,
            decoration: const InputDecoration(labelText: 'Refund reason'),
            validator: (value) => (value?.trim().length ?? 0) < 5
                ? 'Enter at least 5 characters.'
                : null,
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (form.currentState!.validate()) {
                Navigator.pop(dialogContext, controller.text.trim());
              }
            },
            child: const Text('Refund'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null) {
      return;
    }
    try {
      await ref
          .read(marketplaceRepositoryProvider)
          .refundOrder(order.id, reason);
      onChanged();
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }
}

final class _BookingLookup extends StatefulWidget {
  const _BookingLookup();

  @override
  State<_BookingLookup> createState() => _BookingLookupState();
}

final class _BookingLookupState extends State<_BookingLookup> {
  final _id = TextEditingController();

  @override
  void dispose() {
    _id.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: <Widget>[
      LumenSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              'Open service booking',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const Text(
              'Use the booking ID supplied for a purchased service order.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _id,
              decoration: const InputDecoration(labelText: 'Booking ID'),
            ),
            const SizedBox(height: 12),
            LumenPrimaryButton(
              label: 'Open booking',
              onPressed: () {
                if (_id.text.trim().isNotEmpty) {
                  context.pushNamed(
                    'marketplace-booking',
                    pathParameters: <String, String>{'id': _id.text.trim()},
                  );
                }
              },
            ),
          ],
        ),
      ),
    ],
  );
}

final class MarketplaceBookingScreen extends ConsumerStatefulWidget {
  const MarketplaceBookingScreen({required this.bookingId, super.key});

  final String bookingId;

  @override
  ConsumerState<MarketplaceBookingScreen> createState() =>
      _MarketplaceBookingScreenState();
}

final class _MarketplaceBookingScreenState
    extends ConsumerState<MarketplaceBookingScreen> {
  late Future<ServiceBooking> _future = ref
      .read(marketplaceRepositoryProvider)
      .booking(widget.bookingId);

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Service booking',
    subtitle: 'Booking status, scheduling, and seller-buyer messaging.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.marketplace,
    child: FutureBuilder<ServiceBooking>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(error: snapshot.error!, onRetry: _reload);
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final booking = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      const Expanded(child: Text('Booking status')),
                      LumenBadge(label: booking.status),
                    ],
                  ),
                  if (booking.requestedStartAt != null)
                    Text('Requested ${booking.requestedStartAt!.toLocal()}'),
                  if (booking.scheduledStartAt != null)
                    Text(
                      'Scheduled ${booking.scheduledStartAt!.toLocal()} – '
                      '${booking.scheduledEndAt?.toLocal()}',
                    ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: <Widget>[
                      if (booking.status == 'requested') ...<Widget>[
                        FilledButton.tonal(
                          onPressed: () => _status('accepted'),
                          child: const Text('Accept'),
                        ),
                        OutlinedButton(
                          onPressed: () => _status('declined'),
                          child: const Text('Decline'),
                        ),
                      ],
                      if (booking.status == 'accepted')
                        FilledButton.tonalIcon(
                          onPressed: _schedule,
                          icon: const Icon(Icons.event_outlined),
                          label: const Text('Schedule'),
                        ),
                      if (booking.status == 'scheduled')
                        FilledButton.tonal(
                          onPressed: () => _status('completed'),
                          child: const Text('Complete'),
                        ),
                      if (const <String>{
                        'requested',
                        'accepted',
                        'scheduled',
                      }.contains(booking.status))
                        OutlinedButton(
                          onPressed: () => _status('cancelled'),
                          child: const Text('Cancel booking'),
                        ),
                      OutlinedButton(
                        onPressed: _message,
                        child: const Text('Send message'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
    ),
  );

  void _reload() => setState(
    () => _future = ref
        .read(marketplaceRepositoryProvider)
        .booking(widget.bookingId),
  );

  Future<void> _status(String status) async {
    try {
      await ref.read(marketplaceRepositoryProvider).updateBooking(
        widget.bookingId,
        <String, dynamic>{'status': status},
      );
      _reload();
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _schedule() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
      initialDate: now.add(const Duration(days: 1)),
      helpText: 'Choose service date',
    );
    if (date == null || !mounted) {
      return;
    }
    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
      helpText: 'Choose start time',
    );
    if (time == null || !mounted) {
      return;
    }
    final duration = TextEditingController(text: '60');
    final minutes = await showDialog<int>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Service duration'),
        content: TextFormField(
          controller: duration,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Minutes'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = int.tryParse(duration.text);
              if (value != null && value > 0) {
                Navigator.pop(dialogContext, value);
              }
            },
            child: const Text('Schedule'),
          ),
        ],
      ),
    );
    duration.dispose();
    if (minutes == null) {
      return;
    }
    final start = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    try {
      await ref
          .read(marketplaceRepositoryProvider)
          .updateBooking(widget.bookingId, <String, dynamic>{
            'status': 'scheduled',
            'scheduled_start_at': start.toUtc().toIso8601String(),
            'scheduled_end_at': start
                .add(Duration(minutes: minutes))
                .toUtc()
                .toIso8601String(),
          });
      _reload();
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _message() async {
    final controller = TextEditingController();
    final body = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Booking message'),
        content: TextField(
          controller: controller,
          maxLength: 2000,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'Message'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.pop(dialogContext, controller.text.trim());
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (body == null) {
      return;
    }
    try {
      await ref
          .read(marketplaceRepositoryProvider)
          .addBookingMessage(widget.bookingId, body);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Message sent.')));
      }
    } on Object catch (error) {
      _show(error);
    }
  }

  void _show(Object error) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }
}

String? _blankToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String? _requiredTwo(String? value) =>
    (value?.trim().length ?? 0) < 2 ? 'Enter at least 2 characters.' : null;

String? _positiveInt(String? value) =>
    (int.tryParse(value ?? '') ?? 0) <= 0 ? 'Enter a positive integer.' : null;

String? _nonNegativeInt(String? value) => (int.tryParse(value ?? '') ?? -1) < 0
    ? 'Enter zero or a positive integer.'
    : null;

String? _slugValidator(String? value) {
  final slug = value?.trim() ?? '';
  return RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(slug) &&
          slug.length >= 3
      ? null
      : 'Use at least 3 lowercase letters, numbers, or hyphens.';
}
