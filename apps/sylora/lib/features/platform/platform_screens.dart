import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../core/realtime.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import 'repositories.dart';

@immutable
final class WalletSnapshot {
  const WalletSnapshot({
    required this.balance,
    required this.earnings,
    required this.transactions,
  });

  final WalletBalance balance;
  final WalletBalance earnings;
  final CursorPage<LedgerTransactionModel> transactions;
}

final walletProvider = FutureProvider.autoDispose<WalletSnapshot>((ref) async {
  final repository = ref.watch(walletRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.balance(),
    repository.creatorEarnings(),
    repository.transactions(),
  ]);
  return WalletSnapshot(
    balance: values[0] as WalletBalance,
    earnings: values[1] as WalletBalance,
    transactions: values[2] as CursorPage<LedgerTransactionModel>,
  );
});

final giftCatalogProvider = FutureProvider.autoDispose<CursorPage<GiftModel>>(
  (ref) => ref.watch(giftRepositoryProvider).catalog(),
);

final giftInventoryProvider =
    FutureProvider.autoDispose<CursorPage<InventoryItemModel>>(
      (ref) => ref.watch(giftRepositoryProvider).inventory(),
    );

final giftEventsProvider =
    FutureProvider.autoDispose<CursorPage<GiftEventModel>>(
      (ref) => ref.watch(giftRepositoryProvider).eventHistory(),
    );

final giftRankingsProvider =
    FutureProvider.autoDispose<GiftRankingResponseModel>(
      (ref) => ref.watch(giftRepositoryProvider).rankings(),
    );

final liveGiftRankingsProvider = FutureProvider.autoDispose
    .family<GiftRankingResponseModel, String>(
      (ref, sessionId) => ref
          .watch(giftRepositoryProvider)
          .rankings(scope: 'live_session', id: sessionId),
    );

final giftProvider = FutureProvider.autoDispose.family<GiftModel, String>(
  (ref, slug) => ref.watch(giftRepositoryProvider).gift(slug),
);

@immutable
final class AiSnapshot {
  const AiSnapshot({
    required this.settings,
    required this.providers,
    required this.conversations,
    required this.usage,
  });

  final AiSettingsModel settings;
  final AiProviderStatus providers;
  final CursorPage<AiConversationModel> conversations;
  final JsonObject usage;
}

final aiProvider = FutureProvider.autoDispose<AiSnapshot>((ref) async {
  final repository = ref.watch(aiRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.settings(),
    repository.providerStatus(),
    repository.conversations(),
    repository.usageSummary(),
  ]);
  return AiSnapshot(
    settings: values[0] as AiSettingsModel,
    providers: values[1] as AiProviderStatus,
    conversations: values[2] as CursorPage<AiConversationModel>,
    usage: values[3] as JsonObject,
  );
});

final aiMessagesProvider = FutureProvider.autoDispose
    .family<CursorPage<AiMessageModel>, String>(
      (ref, id) => ref.watch(aiRepositoryProvider).messages(id),
    );

final aiMemoryProvider = FutureProvider.autoDispose<List<NamedResource>>(
  (ref) => ref.watch(aiRepositoryProvider).memory(),
);

@immutable
final class LiveSnapshot {
  const LiveSnapshot({
    required this.sessions,
    required this.integrations,
    this.integrationsError,
  });

  final List<LiveSessionModel> sessions;
  final List<NamedResource> integrations;
  final Object? integrationsError;
}

final liveProvider = FutureProvider.autoDispose<LiveSnapshot>((ref) async {
  final repository = ref.watch(liveRepositoryProvider);
  final sessions = await repository.sessions();
  try {
    final integrations = await repository.integrations();
    return LiveSnapshot(sessions: sessions, integrations: integrations);
  } on Object catch (error) {
    // Live session management and integration management use separate backend
    // permissions. Keep direct MediaMTX sessions usable when integrations are
    // unavailable to this account.
    return LiveSnapshot(
      sessions: sessions,
      integrations: const <NamedResource>[],
      integrationsError: error,
    );
  }
});

final liveSessionProvider = FutureProvider.autoDispose
    .family<LiveSessionModel, String>(
      (ref, id) => ref.watch(liveRepositoryProvider).session(id),
    );

final liveIntegrationsProvider =
    FutureProvider.autoDispose<List<NamedResource>>(
      (ref) => ref.watch(liveRepositoryProvider).integrations(),
    );

final tiktokControlPanelProvider = FutureProvider.autoDispose<JsonObject>(
  (ref) => ref.watch(liveRepositoryProvider).tiktokControlPanel(),
);

@immutable
final class LiveControlSnapshot {
  const LiveControlSnapshot({
    required this.events,
    required this.actions,
    required this.personas,
    required this.rules,
  });

  final CursorPage<NamedResource> events;
  final CursorPage<NamedResource> actions;
  final List<NamedResource> personas;
  final List<NamedResource> rules;
}

final liveControlsProvider = FutureProvider.autoDispose
    .family<LiveControlSnapshot, String>((ref, sessionId) async {
      final repository = ref.watch(liveRepositoryProvider);
      final values = await Future.wait<Object>(<Future<Object>>[
        repository.events(sessionId),
        repository.actions(sessionId),
        repository.personas(),
        repository.rules(),
      ]);
      return LiveControlSnapshot(
        events: values[0] as CursorPage<NamedResource>,
        actions: values[1] as CursorPage<NamedResource>,
        personas: values[2] as List<NamedResource>,
        rules: values[3] as List<NamedResource>,
      );
    });

final class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

final class _WalletScreenState extends ConsumerState<WalletScreen> {
  String? _operationMessage;
  bool _operationError = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(walletProvider);
    return LumenPage(
      title: l10n.walletTitle,
      subtitle: l10n.walletSubtitle,
      intensity: 0.92,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.gifts,
      header: SyloraUniverseHero(
        eyebrow: l10n.walletHeroEyebrow,
        title: l10n.walletTitle,
        body: l10n.walletHeroBody,
        trailing: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            SyloraPortalChip(
              label: l10n.walletTopUp,
              icon: Icons.add_card_rounded,
              onTap: () => _showPaymentDialog(payout: false),
            ),
            SyloraPortalChip(
              label: l10n.walletPayout,
              icon: Icons.account_balance_outlined,
              onTap: () => _showPaymentDialog(payout: true),
            ),
          ],
        ),
      ),
      child: LumenAsyncView<WalletSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(walletProvider),
        data: (snapshot) {
          var index = 0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Wrap(
                spacing: 16,
                runSpacing: 16,
                children: <Widget>[
                  SyloraStaggeredReveal(
                    index: index++,
                    child: _BalanceCard(
                      label: l10n.walletSpendable,
                      balance: snapshot.balance,
                    ),
                  ),
                  SyloraStaggeredReveal(
                    index: index++,
                    child: _BalanceCard(
                      label: l10n.walletCreatorEarnings,
                      balance: snapshot.earnings,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: <Widget>[
                  LumenPrimaryButton(
                    label: l10n.walletTopUp,
                    icon: Icons.add_card_rounded,
                    onPressed: () => _showPaymentDialog(payout: false),
                  ),
                  LumenSecondaryButton(
                    label: l10n.walletPayout,
                    icon: Icons.account_balance_outlined,
                    onPressed: () => _showPaymentDialog(payout: true),
                  ),
                ],
              ),
              if (_operationMessage != null) ...<Widget>[
                const SizedBox(height: 12),
                _StatusPanel(
                  message: _operationMessage!,
                  error: _operationError,
                ),
              ],
              const SizedBox(height: 28),
              Text(l10n.walletHistory, style: SyloraTokens.title(20)),
              const SizedBox(height: 12),
              if (snapshot.transactions.items.isEmpty)
                LumenEmptyView(
                  title: l10n.walletNoActivity,
                  message: l10n.walletNoActivityMessage,
                  actionLabel: l10n.commonRefresh,
                  onAction: () => ref.invalidate(walletProvider),
                  icon: Icons.receipt_long_outlined,
                )
              else
                for (final transaction in snapshot.transactions.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SyloraStaggeredReveal(
                      index: index++,
                      child: SyloraGlassTile(
                        child: Row(
                          children: <Widget>[
                            const Icon(
                              Icons.receipt_long_outlined,
                              color: SyloraTokens.violet,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    transaction.type,
                                    style: SyloraTokens.title(15),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    DateFormat.yMMMd().add_jm().format(
                                      transaction.createdAt.toLocal(),
                                    ),
                                    style: SyloraTokens.body(
                                      13,
                                      color: SyloraTokens.inkMute,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            LumenBadge(
                              label: transaction.status,
                              color: transaction.status == 'posted'
                                  ? LumenColors.verdigris
                                  : LumenColors.solar,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showPaymentDialog({required bool payout}) async {
    var amountText = '';
    var destinationText = '';
    var returnUrlText = Uri.base.hasScheme && Uri.base.scheme.startsWith('http')
        ? Uri.base.toString()
        : '';
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(payout ? 'Request payout' : 'Create top-up'),
        content: SizedBox(
          width: 480,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextFormField(
                onChanged: (value) => amountText = value,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Amount in minor units',
                  helperText: 'For example, 1000 is 1000 LUMEN units.',
                ),
              ),
              const SizedBox(height: 12),
              if (payout)
                TextFormField(
                  onChanged: (value) => destinationText = value,
                  decoration: const InputDecoration(
                    labelText: 'Provider destination reference',
                  ),
                )
              else
                TextFormField(
                  initialValue: returnUrlText,
                  onChanged: (value) => returnUrlText = value,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    labelText: 'Provider return URL',
                  ),
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
              final parsedAmount = int.tryParse(amountText);
              if (parsedAmount == null ||
                  parsedAmount <= 0 ||
                  (payout
                      ? destinationText.trim().length < 3
                      : Uri.tryParse(returnUrlText)?.isAbsolute != true)) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(content: Text('Enter valid payment details.')),
                );
                return;
              }
              try {
                final repository = ref.read(walletRepositoryProvider);
                final operation = payout
                    ? await repository.payout(
                        amountMinor: parsedAmount,
                        settlementCurrency: 'USD',
                        destinationReference: destinationText.trim(),
                      )
                    : await repository.topUp(
                        amountMinor: parsedAmount,
                        settlementCurrency: 'USD',
                        returnUrl: returnUrlText.trim(),
                      );
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                  setState(() {
                    _operationMessage =
                        '${operation.type} is ${operation.status} via ${operation.provider}.';
                    _operationError = operation.failureCode != null;
                  });
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, false);
                  setState(() {
                    _operationMessage =
                        error is ApiProblem &&
                            error.code == 'payment_provider_unavailable'
                        ? 'Payment provider unavailable: ${error.detail}. '
                              'Local sandbox (not card charges): '
                              'python3 scripts/sandbox_topup.py '
                              '--email user@sylora.dev --amount 25000'
                        : messageFor(error);
                    _operationError = true;
                  });
                }
              }
            },
            child: Text(payout ? 'Request payout' : 'Continue'),
          ),
        ],
      ),
    );
    if (submitted ?? false) {
      ref.invalidate(walletProvider);
    }
  }
}

final class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.label, required this.balance});

  final String label;
  final WalletBalance balance;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 300,
    child: LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 8),
          Text(
            NumberFormat.decimalPattern().format(balance.spendableMinor),
            style: Theme.of(
              context,
            ).textTheme.headlineLarge?.copyWith(fontFamily: 'monospace'),
          ),
          Text(balance.assetCode),
        ],
      ),
    ),
  );
}

final class _GiftRankingStrip extends StatelessWidget {
  const _GiftRankingStrip({required this.value, required this.title});

  final AsyncValue<GiftRankingResponseModel> value;
  final String title;

  @override
  Widget build(BuildContext context) => value.maybeWhen(
    data: (ranking) {
      if (ranking.items.isEmpty) {
        return const SizedBox.shrink();
      }
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: LumenSurface(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(
                    Icons.leaderboard_rounded,
                    size: 18,
                    color: Theme.of(context).colorScheme.secondary,
                  ),
                  const SizedBox(width: 8),
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: <Widget>[
                    for (final item in ranking.items)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: LumenBadge(
                          label:
                              '#${item.rank} ${_rankingLabel(item)} · ${item.giftCount} gift${item.giftCount == 1 ? '' : 's'}',
                          color: item.rank == 1
                              ? LumenColors.bloom
                              : LumenColors.aether,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    },
    orElse: () => const SizedBox.shrink(),
  );

  static String _rankingLabel(GiftRankingItemModel item) {
    final name = item.displayName?.trim();
    if (name != null && name.isNotEmpty) {
      return name;
    }
    return 'User ${item.senderUserId.substring(0, 8)}';
  }
}

final class _LiveGiftTray extends ConsumerWidget {
  const _LiveGiftTray({required this.sessionId, required this.hostUserId});

  final String sessionId;
  final String? hostUserId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(giftInventoryProvider);
    final catalog = ref.watch(giftCatalogProvider);
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Send a gift', style: SyloraTokens.title(16)),
          const SizedBox(height: 6),
          Text(
            'Gifts fly only during live communication.',
            style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
          ),
          const SizedBox(height: 12),
          if (hostUserId == null)
            const Text('Host identity unavailable for this session.')
          else
            inventory.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text(messageFor(error)),
              data: (page) {
                final items = page.items;
                if (items.isNotEmpty) {
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      for (final item in items.take(8))
                        FilledButton.tonalIcon(
                          onPressed: () => _send(
                            context,
                            ref,
                            hostUserId: hostUserId!,
                            inventoryItemId: item.id,
                          ),
                          icon: const Icon(Icons.card_giftcard_rounded),
                          label: Text('Inv ×${item.quantity}'),
                        ),
                    ],
                  );
                }
                return catalog.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, _) => Text(messageFor(error)),
                  data: (gifts) {
                    if (gifts.items.isEmpty) {
                      return const Text('Gift catalog is empty.');
                    }
                    return Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: <Widget>[
                        for (final gift in gifts.items.take(8))
                          FilledButton.tonalIcon(
                            onPressed: () => _send(
                              context,
                              ref,
                              hostUserId: hostUserId!,
                              giftDefinitionId: gift.id,
                            ),
                            icon: const Icon(Icons.auto_awesome),
                            label: Text(gift.name),
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

  Future<void> _send(
    BuildContext context,
    WidgetRef ref, {
    required String hostUserId,
    String? inventoryItemId,
    String? giftDefinitionId,
  }) async {
    try {
      await ref.read(giftRepositoryProvider).send(
            recipientUserId: hostUserId,
            inventoryItemId: inventoryItemId,
            giftDefinitionId: giftDefinitionId,
            liveSessionId: sessionId,
            message: 'Sent during live',
          );
      ref.invalidate(giftInventoryProvider);
      ref.invalidate(liveGiftRankingsProvider(sessionId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gift sent to the live host.')),
        );
      }
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageFor(error))),
        );
      }
    }
  }
}

final class GiftsScreen extends ConsumerStatefulWidget {
  const GiftsScreen({super.key});

  @override
  ConsumerState<GiftsScreen> createState() => _GiftsScreenState();
}

final class _GiftsScreenState extends ConsumerState<GiftsScreen> {
  StreamSubscription<GiftEventModel>? _eventSubscription;
  String? _tierFilter;

  static const List<String> _officialTiers = <String>[
    'rare',
    'epic',
    'legendary',
    'mythical',
    'ultra_premium',
  ];

  @override
  void initState() {
    super.initState();
    if (realtimeSupported) {
      _eventSubscription = ref.read(giftRepositoryProvider).events().listen((
        event,
      ) {
        ref.invalidate(giftEventsProvider);
        ref.invalidate(giftInventoryProvider);
        ref.invalidate(giftRankingsProvider);
        final comboCount = event.payload['combo_count'];
        if (mounted &&
            event.payload['combo_active'] == true &&
            comboCount is int &&
            comboCount > 1) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Gift combo x$comboCount is live.')),
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final catalog = ref.watch(giftCatalogProvider);
    final inventory = ref.watch(giftInventoryProvider);
    final events = ref.watch(giftEventsProvider);
    final rankings = ref.watch(giftRankingsProvider);
    return DefaultTabController(
      length: 3,
      child: SyloraLivingScaffold(
        intensity: 0.92,
        showOrbits: MediaQuery.sizeOf(context).width < 900,
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: SyloraTokens.glassStrong,
            elevation: 0,
            title: Text(
              'Gift Shop',
              style: SyloraTokens.title(20),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            actions: <Widget>[
              IconButton(
                tooltip: l10n.giftsPreferences,
                onPressed: () => _showGiftPreferences(context, ref),
                icon: const Icon(Icons.tune_rounded),
              ),
              IconButton(
                tooltip: l10n.giftsAuthoring,
                onPressed: () => context.pushNamed('gift-authoring'),
                icon: const Icon(Icons.design_services_outlined),
              ),
            ],
          ),
          body: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: SyloraUniverseHero(
                  eyebrow: 'GIFT SHOP',
                  title: 'Buy & manage gifts',
                  body:
                      'Purchase and organize your gift inventory here. Sending gifts happens only during Live Streams, Guest Streams, Multi-host Conferences, and Voice Rooms.',
                  compactBreakpoint: 720,
                ),
              ),
              MaterialBanner(
                content: const Text(
                  'Send gifts only inside live communication — not from the shop.',
                ),
                actions: <Widget>[
                  TextButton(
                    onPressed: () => context.goNamed('live'),
                    child: const Text('Go Live'),
                  ),
                ],
              ),
              TabBar(
                tabs: <Tab>[
                  Tab(text: l10n.giftsCatalog),
                  Tab(text: l10n.giftsInventory),
                  Tab(text: l10n.giftsEvents),
                ],
              ),
              Expanded(
                child: TabBarView(
          children: <Widget>[
            LumenAsyncView<CursorPage<GiftModel>>(
              value: catalog,
              onRetry: () => ref.invalidate(giftCatalogProvider),
              data: (page) {
                final items = page.items
                    .where(
                      (gift) => _tierFilter == null || gift.tier == _tierFilter,
                    )
                    .toList(growable: false);
                if (page.items.isEmpty) {
                  return LumenEmptyView(
                    title: l10n.giftsEmpty,
                    message: l10n.giftsEmptyMessage,
                    actionLabel: l10n.commonRefresh,
                    onAction: () => ref.invalidate(giftCatalogProvider),
                    icon: Icons.card_giftcard_rounded,
                  );
                }
                return Column(
                  children: <Widget>[
                    SizedBox(
                      height: 52,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                        children: <Widget>[
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: const Text('All'),
                              selected: _tierFilter == null,
                              onSelected: (_) =>
                                  setState(() => _tierFilter = null),
                            ),
                          ),
                          ..._officialTiers.map(
                            (tier) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(tier),
                                selected: _tierFilter == tier,
                                onSelected: (_) =>
                                    setState(() => _tierFilter = tier),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    _GiftRankingStrip(
                      value: rankings,
                      title: 'Today’s gift leaders',
                    ),
                    Expanded(
                      child: items.isEmpty
                          ? LumenEmptyView(
                              title: 'No gifts in this tier',
                              message:
                                  'Try another rarity filter (rare → ultra_premium / Divine).',
                              actionLabel: 'Clear filter',
                              onAction: () =>
                                  setState(() => _tierFilter = null),
                              icon: Icons.filter_alt_off_rounded,
                            )
                          : GridView.builder(
                              padding: const EdgeInsets.all(20),
                              gridDelegate:
                                  const SliverGridDelegateWithMaxCrossAxisExtent(
                                    maxCrossAxisExtent: 360,
                                    mainAxisExtent: 230,
                                    crossAxisSpacing: 16,
                                    mainAxisSpacing: 16,
                                  ),
                              itemCount: items.length,
                              itemBuilder: (context, index) {
                                final gift = items[index];
                                return InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: () => context.pushNamed(
                                    'gift-detail',
                                    pathParameters: <String, String>{
                                      'slug': gift.slug,
                                    },
                                  ),
                                  child: LumenSurface(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: <Widget>[
                                        Icon(
                                          Icons.card_giftcard_rounded,
                                          size: 36,
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.secondary,
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          gift.name,
                                          style: Theme.of(
                                            context,
                                          ).textTheme.headlineSmall,
                                        ),
                                        Text(
                                          gift.description,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const Spacer(),
                                        Row(
                                          children: <Widget>[
                                            LumenBadge(
                                              label: gift.tier,
                                              color: LumenColors.bloom,
                                            ),
                                            const Spacer(),
                                            Text('${gift.priceMinor} LUMEN'),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
            ),
            LumenAsyncView<CursorPage<InventoryItemModel>>(
              value: inventory,
              onRetry: () => ref.invalidate(giftInventoryProvider),
              data: (page) => page.items.isEmpty
                  ? LumenEmptyView(
                      title: 'Your inventory is empty',
                      message:
                          'No gift inventory items were returned. Browse the catalog to purchase one.',
                      actionLabel: 'Refresh inventory',
                      onAction: () => ref.invalidate(giftInventoryProvider),
                      icon: Icons.inventory_2_outlined,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(20),
                      itemCount: page.items.length,
                      itemBuilder: (context, index) {
                        final item = page.items[index];
                        return Card(
                          child: ListTile(
                            leading: const Icon(Icons.card_giftcard_rounded),
                            title: Text(
                              'Gift ${item.giftDefinitionId.substring(0, 8)}',
                            ),
                            subtitle: Text(
                              '${item.quantity} available • ${item.unitPriceMinor} LUMEN each\nReady to send during Live / Conference / Voice Rooms',
                            ),
                            isThreeLine: true,
                            trailing: const Chip(label: Text('In inventory')),
                          ),
                        );
                      },
                    ),
            ),
            Column(
              children: <Widget>[
                if (!realtimeSupported)
                  MaterialBanner(
                    content: Text(realtimeUnsupportedReason!),
                    actions: const <Widget>[SizedBox.shrink()],
                  ),
                Expanded(
                  child: LumenAsyncView<CursorPage<GiftEventModel>>(
                    value: events,
                    onRetry: () => ref.invalidate(giftEventsProvider),
                    data: (page) => page.items.isEmpty
                        ? LumenEmptyView(
                            title: 'No delivered gift events',
                            message:
                                'The event history API returned no events. SYLORA never synthesizes gift deliveries.',
                            actionLabel: 'Refresh events',
                            onAction: () => ref.invalidate(giftEventsProvider),
                            icon: Icons.bolt_outlined,
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(20),
                            itemCount: page.items.length,
                            itemBuilder: (context, index) {
                              final event = page.items[index];
                              return ListTile(
                                leading: const Icon(Icons.bolt_rounded),
                                title: Text(event.event),
                                subtitle: Text(
                                  DateFormat.yMMMd().add_jm().format(
                                    event.occurredAt.toLocal(),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ),
              ],
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


  static Future<void> _showGiftPreferences(
    BuildContext context,
    WidgetRef ref,
  ) async {
    try {
      var values = await ref.read(giftRepositoryProvider).preferences();
      if (!context.mounted) {
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setState) => AlertDialog(
            title: const Text('Gift preferences'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                SwitchListTile(
                  title: const Text('Accept gifts'),
                  value: values['accepts_gifts'] as bool,
                  onChanged: (value) async {
                    values = await ref
                        .read(giftRepositoryProvider)
                        .updatePreferences(<String, dynamic>{
                          'accepts_gifts': value,
                        });
                    setState(() {});
                  },
                ),
                SwitchListTile(
                  title: const Text('Friends only'),
                  value: values['friends_only'] as bool,
                  onChanged: (value) async {
                    values = await ref
                        .read(giftRepositoryProvider)
                        .updatePreferences(<String, dynamic>{
                          'friends_only': value,
                        });
                    setState(() {});
                  },
                ),
                SwitchListTile(
                  title: const Text('Allow gift audio'),
                  value: values['allow_audio'] as bool,
                  onChanged: (value) async {
                    values = await ref
                        .read(giftRepositoryProvider)
                        .updatePreferences(<String, dynamic>{
                          'allow_audio': value,
                        });
                    setState(() {});
                  },
                ),
              ],
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Done'),
              ),
            ],
          ),
        ),
      );
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }
}

final class GiftDetailScreen extends ConsumerWidget {
  const GiftDetailScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(giftProvider(slug));
    return Scaffold(
      appBar: AppBar(title: const Text('Gift detail')),
      body: value.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => LumenErrorView(
          error: error,
          onRetry: () => ref.invalidate(giftProvider(slug)),
        ),
        data: (gift) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Icon(
                    Icons.card_giftcard_rounded,
                    size: 64,
                    color: LumenColors.bloom,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    gift.name,
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(gift.description),
                  const SizedBox(height: 20),
                  Text(
                    '${gift.priceMinor} LUMEN',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Runtime rendering is capability-dependent. This client does not claim to render assets for targets it does not support.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: <Widget>[
                      for (final target in gift.rendererTargets)
                        LumenBadge(label: target),
                    ],
                  ),
                  const SizedBox(height: 24),
                  LumenPrimaryButton(
                    label: 'Purchase',
                    icon: Icons.shopping_bag_outlined,
                    onPressed: () async {
                      try {
                        await ref
                            .read(giftRepositoryProvider)
                            .purchase(gift.id, 1);
                        ref.invalidate(giftInventoryProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Purchase accepted and inventory refreshed.',
                              ),
                            ),
                          );
                        }
                      } on Object catch (error) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(messageFor(error))),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class GiftAuthoringScreen extends ConsumerStatefulWidget {
  const GiftAuthoringScreen({super.key});

  @override
  ConsumerState<GiftAuthoringScreen> createState() =>
      _GiftAuthoringScreenState();
}

final class _GiftAuthoringScreenState
    extends ConsumerState<GiftAuthoringScreen> {
  final _slug = TextEditingController();
  final _name = TextEditingController();
  final _description = TextEditingController();
  String? _result;

  @override
  void dispose() {
    _slug.dispose();
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Gift authoring')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: <Widget>[
        Text(
          'Creator and administration workflow',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: 8),
        const Text(
          'Every authoring, manifest, asset-upload, validation, publishing, retirement, and collection endpoint is represented by the gift authoring repository. API permissions determine access.',
        ),
        const SizedBox(height: 20),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Create category',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _slug,
                decoration: const InputDecoration(labelText: 'URL-safe slug'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                maxLength: 500,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 16),
              LumenPrimaryButton(
                label: 'Create category through API',
                onPressed: _createCategory,
              ),
              if (_result != null) ...<Widget>[
                const SizedBox(height: 12),
                Text(_result!),
              ],
            ],
          ),
        ),
      ],
    ),
  );

  Future<void> _createCategory() async {
    if (_slug.text.trim().length < 3 || _name.text.trim().length < 2) {
      setState(() => _result = 'Enter a valid slug and category name.');
      return;
    }
    try {
      final result = await ref
          .read(giftAuthoringRepositoryProvider)
          .createCategory(<String, dynamic>{
            'slug': _slug.text.trim(),
            'name': _name.text.trim(),
            'description': _description.text.trim().isEmpty
                ? null
                : _description.text.trim(),
          });
      setState(
        () => _result = 'Created category ${requireString(result, 'name')}.',
      );
    } on Object catch (error) {
      setState(() => _result = messageFor(error));
    }
  }
}

final class AiScreen extends ConsumerStatefulWidget {
  const AiScreen({super.key});

  @override
  ConsumerState<AiScreen> createState() => _AiScreenState();
}

final class _AiScreenState extends ConsumerState<AiScreen> {
  late final SyloraAuraPresenceController _aura;

  @override
  void initState() {
    super.initState();
    _aura = SyloraAuraPresenceController.forPreset(SyloraAuraContextPreset.ai);
  }

  @override
  void dispose() {
    _aura.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(aiProvider);
    _syncAura(value);
    final l10n = AppLocalizations.of(context);
    return LumenPage(
      title: l10n.aiTitle,
      subtitle: l10n.aiSubtitle,
      intensity: 0.94,
      showAuraDock: true,
      auraEmotion: AuraEmotion.thinking,
      auraLabel: l10n.aiOnline,
      showAuraPresence: true,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.ai,
      header: SyloraUniverseHero(
        eyebrow: l10n.aiHeroEyebrow,
        title: l10n.aiTitle,
        body: l10n.aiHeroBody,
        trailing: SyloraPortalChip(
          label: l10n.aiMemory,
          icon: Icons.psychology_alt_outlined,
          onTap: () => context.pushNamed('ai-memory'),
        ),
      ),
      actions: <Widget>[
        IconButton(
          tooltip: l10n.aiMemory,
          onPressed: () => context.pushNamed('ai-memory'),
          icon: const Icon(Icons.psychology_alt_outlined),
        ),
      ],
      child: LumenAsyncView<AiSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(aiProvider),
        data: (snapshot) {
          if (!snapshot.settings.consentGranted) {
            return SyloraStaggeredReveal(
              index: 0,
              child: SyloraGlassTile(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Icon(
                      Icons.shield_outlined,
                      size: 44,
                      color: SyloraTokens.violet,
                    ),
                    const SizedBox(height: 16),
                    Text(l10n.aiConsentTitle, style: SyloraTokens.title(22)),
                    const SizedBox(height: 8),
                    Text(l10n.aiConsentBody, softWrap: true),
                    const SizedBox(height: 20),
                    LumenPrimaryButton(
                      label: l10n.aiGrantConsent,
                      icon: Icons.verified_user_outlined,
                      onPressed: () async {
                        await ref.read(aiRepositoryProvider).updateSettings(
                          <String, dynamic>{'consent_granted': true},
                        );
                        ref.invalidate(aiProvider);
                      },
                    ),
                  ],
                ),
              ),
            );
          }
          if (!snapshot.providers.chatAvailable) {
            return LumenEmptyView(
              title: 'AI provider unavailable',
              message:
                  'The backend reports no available chat provider. SYLORA will not fabricate a response.',
              actionLabel: 'Check again',
              onAction: () => ref.invalidate(aiProvider),
              icon: Icons.smart_toy_outlined,
            );
          }
          var index = 0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              SyloraStaggeredReveal(
                index: index++,
                child: SyloraGlassTile(
                  child: Row(
                    children: <Widget>[
                      SyloraPulseGlow(
                        child: const Icon(
                          Icons.data_usage_rounded,
                          color: SyloraTokens.violet,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          '${snapshot.usage['total_units'] ?? 0} units this month',
                          style: SyloraTokens.title(17),
                        ),
                      ),
                      LumenBadge(
                        label:
                            '${snapshot.providers.providerNames.length} provider(s)',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      l10n.aiConversations,
                      style: SyloraTokens.title(20),
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: () => _createConversation(context, ref),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('New'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (snapshot.conversations.items.isEmpty)
                LumenEmptyView(
                  title: 'No AI conversations',
                  message:
                      'The API returned no conversation history. Start one to send a provider-backed request.',
                  actionLabel: 'New conversation',
                  onAction: () => _createConversation(context, ref),
                  icon: Icons.auto_awesome_outlined,
                )
              else
                for (final conversation in snapshot.conversations.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SyloraStaggeredReveal(
                      index: index++,
                      child: SyloraGlassTile(
                        onTap: () => context.pushNamed(
                          'ai-conversation',
                          pathParameters: <String, String>{
                            'id': conversation.id,
                          },
                        ),
                        child: Row(
                          children: <Widget>[
                            const Icon(
                              Icons.auto_awesome_outlined,
                              color: SyloraTokens.violet,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    conversation.title ??
                                        'Untitled conversation',
                                    style: SyloraTokens.title(15),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    '${conversation.mode} • ${conversation.locale}',
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
              const SizedBox(height: 20),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: <Widget>[
                  LumenSecondaryButton(
                    label: l10n.aiMemory,
                    icon: Icons.psychology_alt_outlined,
                    onPressed: () => context.pushNamed('ai-memory'),
                  ),
                  LumenSecondaryButton(
                    label: 'Translation & moderation',
                    icon: Icons.translate_rounded,
                    onPressed: () => _showLanguageTools(context, ref),
                  ),
                  LumenSecondaryButton(
                    label: 'Generation jobs',
                    icon: Icons.work_history_outlined,
                    onPressed:
                        snapshot.providers.capabilities.entries.any(
                          (entry) => entry.key != 'chat' && entry.value,
                        )
                        ? () => context.pushNamed('ai-jobs')
                        : null,
                    disabledReason:
                        'No generation capability is currently available from the backend.',
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  void _syncAura(AsyncValue<AiSnapshot> value) {
    final next = value.isLoading
        ? (
            emotion: AuraEmotion.thinking,
            tip: 'Хвилинку — перевіряю, чи все готове…',
          )
        : value.hasError
        ? (
            emotion: AuraEmotion.focused,
            tip: 'Звʼязок з AI хитається. Спробуй оновити.',
          )
        : (
            emotion: AuraEmotion.greeting,
            tip: 'Я Aura — пиши як людині, я поруч.',
          );
    if (_aura.emotion == next.emotion && _aura.tip == next.tip) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _aura.update(emotion: next.emotion, tip: next.tip);
      }
    });
  }

  static Future<void> _createConversation(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final title = TextEditingController();
    final created = await showDialog<AiConversationModel>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New AI conversation'),
        content: TextField(
          controller: title,
          maxLength: 200,
          decoration: const InputDecoration(labelText: 'Title (optional)'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                final conversation = await ref
                    .read(aiRepositoryProvider)
                    .createConversation(
                      title: title.text.trim().isEmpty
                          ? null
                          : title.text.trim(),
                    );
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
            child: const Text('Create'),
          ),
        ],
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    title.dispose();
    if (created != null && context.mounted) {
      ref.invalidate(aiProvider);
      await context.pushNamed(
        'ai-conversation',
        pathParameters: <String, String>{'id': created.id},
      );
    }
  }

  static Future<void> _showLanguageTools(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final text = TextEditingController();
    String? result;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Translation & moderation'),
          content: SizedBox(
            width: 520,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextField(
                  controller: text,
                  minLines: 3,
                  maxLines: 8,
                  maxLength: 20000,
                  decoration: const InputDecoration(labelText: 'Plain text'),
                ),
                if (result != null) SelectableText(result!),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () async {
                if (text.text.trim().isEmpty) {
                  return;
                }
                try {
                  final value = await ref
                      .read(aiRepositoryProvider)
                      .moderate(text.text.trim());
                  setState(
                    () => result =
                        'Moderation: ${value['recommendation']} (${value['confidence']})',
                  );
                } on Object catch (error) {
                  setState(() => result = messageFor(error));
                }
              },
              child: const Text('Moderate'),
            ),
            FilledButton(
              onPressed: () async {
                if (text.text.trim().isEmpty) {
                  return;
                }
                try {
                  final value = await ref
                      .read(aiRepositoryProvider)
                      .translate(text.text.trim(), 'en', 'es');
                  setState(
                    () => result =
                        'Translation (${value['provider']}): ${value['text']}',
                  );
                } on Object catch (error) {
                  setState(() => result = messageFor(error));
                }
              },
              child: const Text('English → Spanish'),
            ),
          ],
        ),
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    text.dispose();
  }
}

final class AiConversationScreen extends ConsumerStatefulWidget {
  const AiConversationScreen({required this.conversationId, super.key});

  final String conversationId;

  @override
  ConsumerState<AiConversationScreen> createState() =>
      _AiConversationScreenState();
}

final class _AiConversationScreenState
    extends ConsumerState<AiConversationScreen> {
  final _message = TextEditingController();
  final _messageFocus = FocusNode();
  late final SyloraAuraPresenceController _aura;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _aura = SyloraAuraPresenceController.forPreset(SyloraAuraContextPreset.ai);
    _messageFocus.addListener(_syncAuraForFocus);
  }

  @override
  void dispose() {
    _messageFocus.removeListener(_syncAuraForFocus);
    _aura.dispose();
    _message.dispose();
    _messageFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(aiMessagesProvider(widget.conversationId));
    final conversationHeight = (MediaQuery.sizeOf(context).height - 260).clamp(
      420.0,
      820.0,
    );
    return LumenPage(
      title: 'Aura',
      subtitle: 'Пиши природно — я відповім як живий співрозмовник.',
      showAuraDock: true,
      auraEmotion: _sending ? AuraEmotion.thinking : AuraEmotion.listening,
      auraLabel: _sending ? 'Думаю…' : 'Слухаю',
      showAuraPresence: true,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.ai,
      child: SizedBox(
        height: conversationHeight,
        child: Column(
          children: <Widget>[
            Expanded(
              child: LumenAsyncView<CursorPage<AiMessageModel>>(
                value: messages,
                onRetry: () =>
                    ref.invalidate(aiMessagesProvider(widget.conversationId)),
                data: (page) => page.items.isEmpty && !_sending
                    ? LumenEmptyView(
                        title: 'Привіт, я Aura',
                        message:
                            'Можеш писати як другу: коротко чи розгорнуто. '
                            'Я підхоплю думку й відповім по суті.',
                        actionLabel: 'Почати розмову',
                        onAction: _messageFocus.requestFocus,
                        icon: Icons.waving_hand_rounded,
                      )
                    : ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.only(bottom: 12, top: 8),
                        itemCount: page.items.length + (_sending ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_sending && index == 0) {
                            return const _AuraTypingBubble();
                          }
                          final messageIndex = _sending ? index - 1 : index;
                          return _AiMessageBubble(
                            conversationId: widget.conversationId,
                            message: page.items[messageIndex],
                            onChanged: () => ref.invalidate(
                              aiMessagesProvider(widget.conversationId),
                            ),
                          );
                        },
                      ),
              ),
            ),
            const SizedBox(height: 12),
            LumenSurface(
              padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
              radius: 24,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Expanded(
                    child: TextField(
                      controller: _message,
                      focusNode: _messageFocus,
                      minLines: 1,
                      maxLines: 6,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) {
                        if (!_sending) {
                          unawaited(_send());
                        }
                      },
                      decoration: const InputDecoration(
                        hintText: 'Напиши Aura…',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  IconButton.filled(
                    tooltip: 'Надіслати',
                    onPressed: _sending ? null : () => unawaited(_send()),
                    icon: _sending
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.arrow_upward_rounded),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _send() async {
    final content = _message.text.trim();
    if (content.isEmpty) {
      return;
    }
    setState(() => _sending = true);
    _aura.think('Хвилинку — збираю думку…');
    try {
      await ref.read(aiRepositoryProvider).send(widget.conversationId, content);
      _message.clear();
      ref.invalidate(aiMessagesProvider(widget.conversationId));
      _aura.speak('Ось що вийшло — якщо треба, уточни.');
    } on Object catch (error) {
      _aura.focus('Ой, щось пішло не так. Спробуй ще раз.');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _syncAuraForFocus();
      }
    }
  }

  void _syncAuraForFocus() {
    if (_sending) {
      return;
    }
    if (_messageFocus.hasFocus) {
      _aura.listen('Слухаю тебе…');
    } else {
      _aura.greet('Я поруч — пиши, коли будеш готовий.');
    }
  }
}

final class _AuraTypingBubble extends StatefulWidget {
  const _AuraTypingBubble();

  @override
  State<_AuraTypingBubble> createState() => _AuraTypingBubbleState();
}

final class _AuraTypingBubbleState extends State<_AuraTypingBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        child: FadeTransition(
          opacity: Tween<double>(begin: 0.55, end: 1).animate(_pulse),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: SyloraTokens.glassStrong,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomRight: Radius.circular(18),
                bottomLeft: Radius.circular(6),
              ),
              border: Border.all(color: Colors.white.withValues(alpha: 0.65)),
            ),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  SyloraAura(
                    size: 28,
                    emotion: AuraEmotion.thinking,
                    animate: true,
                    showLabel: false,
                  ),
                  SizedBox(width: 10),
                  Text('Aura друкує…'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final class _AiMessageBubble extends ConsumerWidget {
  const _AiMessageBubble({
    required this.conversationId,
    required this.message,
    required this.onChanged,
  });

  final String conversationId;
  final AiMessageModel message;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAssistant = message.role == 'assistant' || message.role == 'system';
    final bubbleColor = isAssistant
        ? SyloraTokens.glassStrong
        : SyloraTokens.ion.withValues(alpha: 0.16);
    return Align(
      alignment: isAssistant ? Alignment.centerLeft : Alignment.centerRight,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 4),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: bubbleColor,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(18),
                topRight: const Radius.circular(18),
                bottomLeft: Radius.circular(isAssistant ? 6 : 18),
                bottomRight: Radius.circular(isAssistant ? 18 : 6),
              ),
              border: Border.all(
                color: Colors.white.withValues(alpha: isAssistant ? 0.65 : 0.4),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  if (isAssistant)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          SyloraAura(
                            size: 22,
                            emotion: AuraEmotion.speaking,
                            animate: false,
                            showLabel: false,
                          ),
                          SizedBox(width: 6),
                          Text('Aura'),
                        ],
                      ),
                    ),
                  SelectableText(message.content),
                  if (message.citations.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 10),
                    Text(
                      'Джерела',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    for (final citation in message.citations)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.link_rounded),
                        title: Text(
                          '${citation.sourceType}: ${citation.sourceId}',
                        ),
                        subtitle: citation.excerpt == null
                            ? null
                            : Text(citation.excerpt!),
                      ),
                  ],
                  for (final proposal in message.proposals) ...<Widget>[
                    const Divider(),
                    Text(
                      'Tool proposal: ${proposal.toolName}',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text('Risk: ${proposal.risk} • State: ${proposal.state}'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: <Widget>[
                        OutlinedButton(
                          onPressed: proposal.state == 'proposed'
                              ? () => _action(ref, proposal.id, 'reject')
                              : null,
                          child: const Text('Reject'),
                        ),
                        FilledButton(
                          onPressed: proposal.state == 'proposed'
                              ? () => _action(ref, proposal.id, 'approve')
                              : null,
                          child: const Text('Approve'),
                        ),
                        FilledButton.tonal(
                          onPressed: proposal.state == 'approved'
                              ? () => _action(ref, proposal.id, 'execute')
                              : null,
                          child: const Text('Execute'),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _action(WidgetRef ref, String proposalId, String action) async {
    await ref
        .read(aiRepositoryProvider)
        .toolAction(conversationId, proposalId, action);
    onChanged();
  }
}

final class AiMemoryScreen extends ConsumerWidget {
  const AiMemoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(aiMemoryProvider);
    return LumenPage(
      title: 'AI memory',
      subtitle: 'Preference memory controlled by persisted AI settings.',
      showAuraDock: true,
      auraEmotion: AuraEmotion.focused,
      auraLabel: 'Memory',
      actions: <Widget>[
        IconButton(
          tooltip: 'Export memory',
          onPressed: () async {
            final exported = await ref
                .read(aiRepositoryProvider)
                .exportMemory();
            if (context.mounted) {
              await showDialog<void>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Memory export'),
                  content: SelectableText(
                    const JsonEncoder.withIndent('  ').convert(exported),
                  ),
                  actions: <Widget>[
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
            }
          },
          icon: const Icon(Icons.download_outlined),
        ),
        IconButton(
          tooltip: 'Add memory',
          onPressed: () => _addMemory(context, ref),
          icon: const Icon(Icons.add_rounded),
        ),
      ],
      child: LumenAsyncView<List<NamedResource>>(
        value: value,
        onRetry: () => ref.invalidate(aiMemoryProvider),
        data: (items) => items.isEmpty
            ? LumenEmptyView(
                title: 'No saved memory',
                message: 'The API returned no active AI memory entries.',
                actionLabel: 'Add memory',
                onAction: () => _addMemory(context, ref),
                icon: Icons.psychology_alt_outlined,
              )
            : Column(
                children: <Widget>[
                  for (final item in items) ...<Widget>[
                    LumenSurface(
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        title: Text(item.label),
                        subtitle: Text(item.status ?? ''),
                        trailing: IconButton(
                          tooltip: 'Delete memory',
                          onPressed: () async {
                            await ref
                                .read(aiRepositoryProvider)
                                .deleteMemory(item.id);
                            ref.invalidate(aiMemoryProvider);
                          },
                          icon: const Icon(Icons.delete_outline_rounded),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ],
              ),
      ),
    );
  }

  static Future<void> _addMemory(BuildContext context, WidgetRef ref) async {
    final content = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Add preference memory'),
        content: TextField(
          controller: content,
          minLines: 2,
          maxLines: 8,
          maxLength: 8000,
          decoration: const InputDecoration(labelText: 'Memory content'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (content.text.trim().isEmpty) {
                return;
              }
              await ref
                  .read(aiRepositoryProvider)
                  .createMemory('preference', content.text.trim());
              ref.invalidate(aiMemoryProvider);
              if (dialogContext.mounted) {
                Navigator.pop(dialogContext);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    content.dispose();
  }
}

final class AiJobsScreen extends ConsumerStatefulWidget {
  const AiJobsScreen({super.key});

  @override
  ConsumerState<AiJobsScreen> createState() => _AiJobsScreenState();
}

final class _AiJobsScreenState extends ConsumerState<AiJobsScreen> {
  late Future<CursorPage<NamedResource>> _jobs;
  late Future<AiProviderStatus> _status;

  @override
  void initState() {
    super.initState();
    _jobs = ref.read(aiRepositoryProvider).jobs();
    _status = ref.read(aiRepositoryProvider).providerStatus();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<AiProviderStatus>(
    future: _status,
    builder: (context, statusSnapshot) {
      final capabilities = statusSnapshot.hasData
          ? _generationCapabilities(statusSnapshot.requireData)
          : const <String>[];
      return LumenPage(
        title: 'AI generation jobs',
        subtitle:
            'Queued provider work for image, video, music, voice, or avatar generation.',
        showAuraDock: true,
        auraEmotion: AuraEmotion.focused,
        auraLabel: 'Jobs',
        actions: <Widget>[
          if (capabilities.isNotEmpty)
            IconButton(
              tooltip: 'Create job',
              onPressed: () => _createJob(capabilities),
              icon: const Icon(Icons.add_rounded),
            ),
        ],
        child: Builder(
          builder: (context) {
            if (statusSnapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (statusSnapshot.hasError) {
              return LumenErrorView(
                error: statusSnapshot.error!,
                onRetry: () => setState(
                  () =>
                      _status = ref.read(aiRepositoryProvider).providerStatus(),
                ),
              );
            }
            if (capabilities.isEmpty) {
              return LumenEmptyView(
                title: 'Generation provider unavailable',
                message:
                    'The backend reports no available image, video, music, voice, or avatar capability.',
                actionLabel: 'Check again',
                onAction: () => setState(
                  () =>
                      _status = ref.read(aiRepositoryProvider).providerStatus(),
                ),
                icon: Icons.work_history_outlined,
              );
            }
            return FutureBuilder<CursorPage<NamedResource>>(
              future: _jobs,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return LumenErrorView(
                    error: snapshot.error!,
                    onRetry: () => setState(
                      () => _jobs = ref.read(aiRepositoryProvider).jobs(),
                    ),
                  );
                }
                final items = snapshot.requireData.items;
                if (items.isEmpty) {
                  return LumenEmptyView(
                    title: 'No generation jobs',
                    message: 'The API returned no generation jobs.',
                    actionLabel: 'Create a job',
                    onAction: () => _createJob(capabilities),
                    icon: Icons.work_history_outlined,
                  );
                }
                return Column(
                  children: <Widget>[
                    for (final item in items) ...<Widget>[
                      LumenSurface(
                        padding: EdgeInsets.zero,
                        child: ListTile(
                          title: Text(item.label),
                          subtitle: Text(item.status ?? ''),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                );
              },
            );
          },
        ),
      );
    },
  );

  List<String> _generationCapabilities(AiProviderStatus status) => status
      .capabilities
      .entries
      .where(
        (entry) =>
            entry.value &&
            const <String>{
              'image',
              'video',
              'music',
              'voice',
              'avatar',
            }.contains(entry.key),
      )
      .map((entry) => entry.key)
      .toList(growable: false);

  Future<void> _createJob(List<String> capabilities) async {
    final prompt = TextEditingController();
    var capability = capabilities.first;
    var voiceName = '';
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Create generation job'),
          content: SizedBox(
            width: 520,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                DropdownButtonFormField<String>(
                  initialValue: capability,
                  decoration: const InputDecoration(labelText: 'Capability'),
                  items: <DropdownMenuItem<String>>[
                    for (final value in capabilities)
                      DropdownMenuItem(value: value, child: Text(value)),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => capability = value);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: prompt,
                  minLines: 2,
                  maxLines: 8,
                  maxLength: capability == 'voice' ? 20000 : 8000,
                  decoration: InputDecoration(
                    labelText: capability == 'voice'
                        ? 'Text to speak'
                        : 'Prompt',
                  ),
                ),
                if (capability == 'voice') ...<Widget>[
                  const SizedBox(height: 12),
                  TextFormField(
                    onChanged: (value) => voiceName = value.trim(),
                    decoration: const InputDecoration(
                      labelText: 'Configured provider voice name',
                    ),
                  ),
                ],
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
                final text = prompt.text.trim();
                if (text.isEmpty ||
                    (capability == 'voice' && voiceName.isEmpty)) {
                  return;
                }
                final payload = switch (capability) {
                  'image' => <String, dynamic>{
                    'capability': 'image',
                    'prompt': text,
                    'size': '1024x1024',
                    'count': 1,
                  },
                  'video' => <String, dynamic>{
                    'capability': 'video',
                    'prompt': text,
                    'duration_seconds': 5,
                    'aspect_ratio': '16:9',
                  },
                  'music' => <String, dynamic>{
                    'capability': 'music',
                    'prompt': text,
                    'duration_seconds': 30,
                    'instrumental': false,
                  },
                  'voice' => <String, dynamic>{
                    'capability': 'voice',
                    'text': text,
                    'voice': voiceName,
                    'output_format': 'mp3',
                  },
                  'avatar' => <String, dynamic>{
                    'capability': 'avatar',
                    'prompt': text,
                  },
                  _ => throw StateError('Unsupported generation capability.'),
                };
                try {
                  await ref.read(aiRepositoryProvider).createJob(payload);
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
              child: const Text('Queue job'),
            ),
          ],
        ),
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    prompt.dispose();
    if (created ?? false) {
      setState(() => _jobs = ref.read(aiRepositoryProvider).jobs());
    }
  }
}

final class LiveScreen extends ConsumerWidget {
  const LiveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(liveProvider);
    return LumenPage(
      title: l10n.liveTitle,
      subtitle: l10n.liveSubtitle,
      intensity: 0.96,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.live,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.liveOpenStudio,
          onPressed: () => context.goNamed('creator-studio'),
          icon: const Icon(Icons.video_camera_front_outlined),
        ),
        IconButton(
          tooltip: l10n.liveCreateSession,
          onPressed: () => _createSession(context, ref),
          icon: const Icon(Icons.add_circle_outline_rounded),
        ),
      ],
      header: SyloraUniverseHero(
        eyebrow: l10n.liveHeroEyebrow,
        title: l10n.liveTitle,
        body: l10n.liveHeroBody,
        trailing: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            SyloraPortalChip(
              label: l10n.liveGoLive,
              icon: Icons.podcasts_rounded,
              onTap: () => _createSession(context, ref),
            ),
            SyloraPortalChip(
              label: l10n.liveOpenStudio,
              icon: Icons.video_camera_front_outlined,
              onTap: () => context.goNamed('creator-studio'),
            ),
          ],
        ),
      ),
      child: LumenAsyncView<LiveSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(liveProvider),
        data: (snapshot) {
          var index = 0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(l10n.liveIntegrations, style: SyloraTokens.title(20)),
              const SizedBox(height: 12),
              SyloraStaggeredReveal(
                index: index++,
                child: const _TikTokLiveControlPanel(),
              ),
              const SizedBox(height: 16),
              if (snapshot.integrationsError != null)
                SyloraStaggeredReveal(
                  index: index++,
                  child: SyloraGlassTile(
                    child: Row(
                      children: <Widget>[
                        Icon(
                          Icons.lock_outline_rounded,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            messageFor(snapshot.integrationsError!),
                            softWrap: true,
                          ),
                        ),
                        TextButton(
                          onPressed: () => ref.invalidate(liveProvider),
                          child: Text(l10n.commonRetry),
                        ),
                      ],
                    ),
                  ),
                )
              else if (snapshot.integrations.isEmpty)
                SyloraStaggeredReveal(
                  index: index++,
                  child: SyloraGlassTile(
                    child: Row(
                      children: <Widget>[
                        const Icon(Icons.link_off_rounded),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(l10n.liveSubtitle, softWrap: true),
                        ),
                        TextButton(
                          onPressed: () => ref.invalidate(liveProvider),
                          child: Text(l10n.commonRefresh),
                        ),
                      ],
                    ),
                  ),
                )
              else
                for (final integration in snapshot.integrations)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SyloraStaggeredReveal(
                      index: index++,
                      child: SyloraGlassTile(
                        child: Row(
                          children: <Widget>[
                            SyloraPulseGlow(
                              child: const Icon(
                                Icons.hub_outlined,
                                color: SyloraTokens.violet,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    integration.label,
                                    style: SyloraTokens.title(16),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (integration.status != null)
                                    Text(
                                      integration.status!,
                                      style: SyloraTokens.body(
                                        13,
                                        color: SyloraTokens.inkMute,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            IconButton(
                              tooltip: l10n.liveHealthCheck,
                              onPressed: () async {
                                final result = await ref
                                    .read(liveRepositoryProvider)
                                    .integrationHealth(integration.id);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('${result['status']}'),
                                    ),
                                  );
                                }
                              },
                              icon: const Icon(
                                Icons.health_and_safety_outlined,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              const SizedBox(height: 24),
              Text(l10n.liveSessions, style: SyloraTokens.title(20)),
              const SizedBox(height: 12),
              if (snapshot.sessions.isEmpty)
                LumenEmptyView(
                  title: l10n.liveNoSessions,
                  message: l10n.liveNoSessionsMessage,
                  actionLabel: l10n.liveCreateSession,
                  onAction: () => _createSession(context, ref),
                  icon: Icons.sensors_outlined,
                )
              else
                for (final session in snapshot.sessions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SyloraStaggeredReveal(
                      index: index++,
                      child: SyloraGlassTile(
                        onTap: () => context.pushNamed(
                          'live-session',
                          pathParameters: <String, String>{'id': session.id},
                        ),
                        child: Row(
                          children: <Widget>[
                            SyloraPulseGlow(
                              color: SyloraTokens.petal,
                              child: const Icon(
                                Icons.sensors_rounded,
                                color: SyloraTokens.petal,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    session.title,
                                    style: SyloraTokens.title(16),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    session.state,
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
          );
        },
      ),
    );
  }

  static Future<void> _createSession(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final l10n = AppLocalizations.of(context);
    final title = TextEditingController();
    final session = await showDialog<LiveSessionModel>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.liveCreateSession),
        content: TextField(
          controller: title,
          maxLength: 200,
          decoration: InputDecoration(labelText: l10n.liveSessionTitle),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () async {
              if (title.text.trim().isEmpty) {
                return;
              }
              try {
                final value = await ref
                    .read(liveRepositoryProvider)
                    .createSession(title.text.trim());
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, value);
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
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    title.dispose();
    if (session == null || !context.mounted) {
      return;
    }
    ref.invalidate(liveProvider);
    await _showStreamKey(context, session);
    if (context.mounted) {
      await context.pushNamed(
        'live-session',
        pathParameters: <String, String>{'id': session.id},
      );
    }
  }

  static Future<void> _showStreamKey(
    BuildContext context,
    LiveSessionModel session,
  ) async {
    final l10n = AppLocalizations.of(context);
    final key = session.streamKeyOnce;
    if (key == null) {
      return;
    }
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(l10n.liveCopyStreamKey),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(l10n.liveStreamKeyOnce),
            const SizedBox(height: 12),
            SelectableText(
              key,
              style: const TextStyle(fontFamily: 'monospace'),
            ),
          ],
        ),
        actions: <Widget>[
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: key));
              if (context.mounted) {
                Navigator.pop(context);
              }
            },
            icon: const Icon(Icons.copy_rounded),
            label: Text(l10n.liveCopyClose),
          ),
        ],
      ),
    );
  }
}

final class LiveSessionScreen extends ConsumerStatefulWidget {
  const LiveSessionScreen({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<LiveSessionScreen> createState() => _LiveSessionScreenState();
}

final class _LiveSessionScreenState extends ConsumerState<LiveSessionScreen> {
  StreamSubscription<JsonObject>? _events;
  JsonObject? _lastEvent;
  String? _status;

  @override
  void initState() {
    super.initState();
    if (realtimeSupported) {
      _events = ref
          .read(liveRepositoryProvider)
          .liveEvents(widget.sessionId)
          .listen((event) => setState(() => _lastEvent = event));
    }
  }

  @override
  void dispose() {
    _events?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(liveSessionProvider(widget.sessionId));
    final integrations = ref.watch(liveIntegrationsProvider);
    final controls = ref.watch(liveControlsProvider(widget.sessionId));
    final giftRankings = ref.watch(liveGiftRankingsProvider(widget.sessionId));
    return Scaffold(
      appBar: AppBar(title: const Text('Live session')),
      body: value.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => LumenErrorView(
          error: error,
          onRetry: () => ref.invalidate(liveSessionProvider(widget.sessionId)),
        ),
        data: (session) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          session.title,
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                      LumenBadge(
                        label: session.state,
                        color: LumenColors.pulse,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'MediaMTX ingest configuration',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    session.ingestPath,
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Use this server-provided path with OBS or open Creator Studio for browser WHIP publishing when MediaMTX is configured.',
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      LumenSecondaryButton(
                        label: 'Creator Studio',
                        icon: Icons.video_camera_front_outlined,
                        onPressed: () => context.goNamed('creator-studio'),
                      ),
                      LumenSecondaryButton(
                        label: 'Preflight',
                        icon: Icons.fact_check_outlined,
                        onPressed: () async {
                          final result = await ref
                              .read(liveRepositoryProvider)
                              .preflight(session.id);
                          setState(
                            () => _status = (result['ready'] as bool)
                                ? 'Preflight passed.'
                                : 'Preflight reported checks that need attention.',
                          );
                          ref.invalidate(liveSessionProvider(widget.sessionId));
                        },
                      ),
                      LumenPrimaryButton(
                        label: 'Start',
                        icon: Icons.play_arrow_rounded,
                        onPressed:
                            {'draft', 'preflight'}.contains(session.state)
                            ? () async {
                                await ref
                                    .read(liveRepositoryProvider)
                                    .start(session.id);
                                ref.invalidate(
                                  liveSessionProvider(widget.sessionId),
                                );
                              }
                            : null,
                        disabledReason:
                            'Start is available only after draft or preflight.',
                      ),
                      LumenSecondaryButton(
                        label: 'End',
                        icon: Icons.stop_rounded,
                        onPressed: session.state == 'live'
                            ? () async {
                                await ref
                                    .read(liveRepositoryProvider)
                                    .end(session.id);
                                ref.invalidate(
                                  liveSessionProvider(widget.sessionId),
                                );
                              }
                            : null,
                        disabledReason: 'Only a live session can be ended.',
                      ),
                      LumenSecondaryButton(
                        label: 'Rotate stream key',
                        icon: Icons.key_rounded,
                        onPressed: () async {
                          final result = await ref
                              .read(liveRepositoryProvider)
                              .rotateStreamKey(session.id);
                          final key = requireString(result, 'stream_key_once');
                          if (context.mounted) {
                            await showDialog<void>(
                              context: context,
                              barrierDismissible: false,
                              builder: (context) => AlertDialog(
                                title: const Text('New reveal-once key'),
                                content: SelectableText(
                                  key,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                actions: <Widget>[
                                  FilledButton.icon(
                                    onPressed: () async {
                                      await Clipboard.setData(
                                        ClipboardData(text: key),
                                      );
                                      if (context.mounted) {
                                        Navigator.pop(context);
                                      }
                                    },
                                    icon: const Icon(Icons.copy_rounded),
                                    label: const Text('Copy and close'),
                                  ),
                                ],
                              ),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                  if (_status != null) ...<Widget>[
                    const SizedBox(height: 12),
                    Text(_status!),
                  ],
                ],
              ),
            ),
            _GiftRankingStrip(value: giftRankings, title: 'Live gift leaders'),
            const SizedBox(height: 16),
            _LiveGiftTray(
              sessionId: session.id,
              hostUserId: session.ownerUserId,
            ),
            const SizedBox(height: 16),
            if (session.replay case final replay?
                when replay.status == 'ready') ...<Widget>[
              LumenSurface(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.movie_creation_outlined),
                  title: const Text('Replay ready'),
                  subtitle: Text(
                    '${_formatReplayDuration(replay.durationSeconds)} • '
                    'Created ${DateFormat.yMMMd().add_jm().format(replay.createdAt.toLocal())}',
                  ),
                  trailing: LumenSecondaryButton(
                    label: 'Open replay',
                    icon: Icons.open_in_new_rounded,
                    onPressed: () => _openReplay(replay.id),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
            LumenSurface(
              child: _EntertainmentDestinations(
                integrations:
                    integrations.asData?.value ?? const <NamedResource>[],
                loading: integrations.isLoading,
                error: integrations.hasError,
              ),
            ),
            const SizedBox(height: 16),
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          'Destinations',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      LumenSecondaryButton(
                        label: 'Add destination',
                        icon: Icons.add_link_rounded,
                        onPressed:
                            integrations.asData?.value.isNotEmpty == true &&
                                {'draft', 'preflight'}.contains(session.state)
                            ? () => _showAddDestination(
                                session,
                                integrations.requireValue,
                              )
                            : null,
                        disabledReason: integrations.isLoading
                            ? 'Integration connections are still loading.'
                            : integrations.hasError
                            ? 'Integration connections could not be loaded.'
                            : integrations.asData?.value.isEmpty == true
                            ? 'Connect an official live integration before adding a destination.'
                            : 'Destinations can be changed only before a session starts.',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (session.destinations.isEmpty)
                    LumenEmptyView(
                      title: 'No live destinations',
                      message: integrations.asData?.value.isEmpty == true
                          ? 'No integration connection is available. Direct MediaMTX ingest remains available.'
                          : 'The API returned no destinations for this session.',
                      actionLabel:
                          integrations.asData?.value.isNotEmpty == true &&
                              {'draft', 'preflight'}.contains(session.state)
                          ? 'Add destination'
                          : 'Refresh integrations',
                      onAction:
                          integrations.asData?.value.isNotEmpty == true &&
                              {'draft', 'preflight'}.contains(session.state)
                          ? () => _showAddDestination(
                              session,
                              integrations.requireValue,
                            )
                          : () => ref.invalidate(liveIntegrationsProvider),
                      icon: Icons.cell_tower_outlined,
                    )
                  else
                    for (final destination in session.destinations)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.cell_tower_rounded),
                        title: Text(
                          'Connection ${destination.connectionId.substring(0, 8)}',
                        ),
                        subtitle: Text(
                          '${destination.state} • ${_destinationCapabilities(destination)}',
                        ),
                        trailing: LumenSecondaryButton(
                          label: 'Remove',
                          icon: Icons.link_off_rounded,
                          onPressed:
                              {'draft', 'preflight'}.contains(session.state)
                              ? () => _removeDestination(destination.id)
                              : null,
                          disabledReason:
                              'Destinations can be changed only before a session starts.',
                        ),
                      ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (!realtimeSupported)
              _StatusPanel(message: realtimeUnsupportedReason!, error: false)
            else
              LumenSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Realtime control events',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _lastEvent == null
                          ? 'Listening for realtime events; no event has arrived.'
                          : const JsonEncoder.withIndent(
                              '  ',
                            ).convert(_lastEvent),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            LumenAsyncView<LiveControlSnapshot>(
              value: controls,
              onRetry: () =>
                  ref.invalidate(liveControlsProvider(widget.sessionId)),
              data: (snapshot) => LumenSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      'Events & automation',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    _LiveResourceSection(
                      title: 'Normalized events',
                      items: snapshot.events.items,
                      emptyMessage: 'The API returned no normalized events.',
                    ),
                    _LiveResourceSection(
                      title: 'Actions',
                      items: snapshot.actions.items,
                      emptyMessage: 'The API returned no live actions.',
                      actionBuilder: (action) => Wrap(
                        spacing: 8,
                        children: <Widget>[
                          LumenSecondaryButton(
                            label: 'Approve',
                            icon: Icons.check_circle_outline_rounded,
                            onPressed:
                                action.status == 'queued' &&
                                    action.raw['requires_approval'] == true &&
                                    action.raw['approved_at'] == null
                                ? () => _runAction(action.id, 'approve')
                                : null,
                            disabledReason:
                                'Only queued, approval-required actions can be approved.',
                          ),
                          LumenSecondaryButton(
                            label: 'Execute',
                            icon: Icons.play_arrow_rounded,
                            onPressed:
                                {'queued', 'retry'}.contains(action.status) &&
                                    (action.raw['requires_approval'] != true ||
                                        action.raw['approved_at'] != null)
                                ? () => _runAction(action.id, 'execute')
                                : null,
                            disabledReason:
                                'Execution requires a queued or retry action and any required human approval.',
                          ),
                        ],
                      ),
                    ),
                    _LiveResourceSection(
                      title: 'Personas',
                      items: snapshot.personas,
                      emptyMessage: 'The API returned no live personas.',
                    ),
                    _LiveResourceSection(
                      title: 'Rules',
                      items: snapshot.rules,
                      emptyMessage: 'The API returned no automation rules.',
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: () => ref.invalidate(
                          liveControlsProvider(widget.sessionId),
                        ),
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Refresh control data'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _destinationCapabilities(LiveDestinationModel destination) {
    final values = <String>[
      if (destination.publishEnabled) 'publish',
      if (destination.chatEnabled) 'chat',
      if (destination.eventsEnabled) 'events',
      if (destination.moderationEnabled) 'moderation',
      if (destination.analyticsEnabled) 'analytics',
    ];
    return values.isEmpty ? 'no enabled capabilities' : values.join(', ');
  }

  static String _formatReplayDuration(int totalSeconds) {
    final duration = Duration(seconds: totalSeconds);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return hours > 0 ? '$hours:$minutes:$seconds' : '$minutes:$seconds';
  }

  Future<void> _openReplay(String replayId) async {
    try {
      final result = await ref
          .read(liveRepositoryProvider)
          .replayPlayback(replayId);
      await launchUrl(
        Uri.parse(requireString(result, 'playback_url')),
        mode: LaunchMode.externalApplication,
      );
    } on Object catch (error) {
      setState(() => _status = 'Replay could not be opened: $error');
    }
  }

  Future<void> _showAddDestination(
    LiveSessionModel session,
    List<NamedResource> integrations,
  ) async {
    var connectionId = integrations.first.id;
    var publish = false;
    var chat = false;
    var events = true;
    var moderation = false;
    var analytics = false;
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add live destination'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  DropdownButtonFormField<String>(
                    initialValue: connectionId,
                    decoration: const InputDecoration(
                      labelText: 'Official integration',
                    ),
                    items: <DropdownMenuItem<String>>[
                      for (final integration in integrations)
                        DropdownMenuItem<String>(
                          value: integration.id,
                          child: Text(
                            '${integration.label} (${integration.status ?? 'unknown'})',
                          ),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => connectionId = value);
                      }
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Publish'),
                    value: publish,
                    onChanged: (value) => setState(() => publish = value),
                  ),
                  SwitchListTile(
                    title: const Text('Chat'),
                    value: chat,
                    onChanged: (value) => setState(() => chat = value),
                  ),
                  SwitchListTile(
                    title: const Text('Events'),
                    value: events,
                    onChanged: (value) => setState(() => events = value),
                  ),
                  SwitchListTile(
                    title: const Text('Moderation'),
                    value: moderation,
                    onChanged: (value) => setState(() => moderation = value),
                  ),
                  SwitchListTile(
                    title: const Text('Analytics'),
                    value: analytics,
                    onChanged: (value) => setState(() => analytics = value),
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
                if (![
                  publish,
                  chat,
                  events,
                  moderation,
                  analytics,
                ].any((value) => value)) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Enable at least one destination capability.',
                      ),
                    ),
                  );
                  return;
                }
                try {
                  await ref
                      .read(liveRepositoryProvider)
                      .addDestination(
                        session.id,
                        connectionId,
                        publishEnabled: publish,
                        chatEnabled: chat,
                        eventsEnabled: events,
                        moderationEnabled: moderation,
                        analyticsEnabled: analytics,
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
              child: const Text('Add destination'),
            ),
          ],
        ),
      ),
    );
    if (created ?? false) {
      ref.invalidate(liveSessionProvider(widget.sessionId));
      ref.invalidate(liveControlsProvider(widget.sessionId));
    }
  }

  Future<void> _removeDestination(String destinationId) async {
    try {
      await ref
          .read(liveRepositoryProvider)
          .removeDestination(widget.sessionId, destinationId);
      ref.invalidate(liveSessionProvider(widget.sessionId));
      ref.invalidate(liveControlsProvider(widget.sessionId));
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  Future<void> _runAction(String actionId, String operation) async {
    try {
      await ref.read(liveRepositoryProvider).action(actionId, operation);
      ref.invalidate(liveControlsProvider(widget.sessionId));
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }
}

final class _EntertainmentDestinations extends StatelessWidget {
  const _EntertainmentDestinations({
    required this.integrations,
    required this.loading,
    required this.error,
  });

  final List<NamedResource> integrations;
  final bool loading;
  final bool error;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Text(
        'Entertainment destinations',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
      const SizedBox(height: 8),
      Text(
        loading
            ? 'Checking connected official integrations...'
            : error
            ? 'Integration status could not be loaded; direct MediaMTX ingest remains available.'
            : 'Official destinations are shown only when real credentials are connected.',
      ),
      const SizedBox(height: 12),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: <Widget>[
          _EntertainmentDestinationChip(
            label: 'YouTube',
            available: _integrationAvailable('youtube', integrations),
          ),
          _EntertainmentDestinationChip(
            label: 'Twitch',
            available: _integrationAvailable('twitch', integrations),
          ),
          const _EntertainmentDestinationChip(
            label: 'TikTok',
            available: false,
            blockedReason: 'Requires provider approval',
          ),
          const _EntertainmentDestinationChip(
            label: 'Kick',
            available: false,
            blockedReason: 'Requires provider approval',
          ),
          const _EntertainmentDestinationChip(
            label: 'Facebook',
            available: false,
            blockedReason: 'Requires provider approval',
          ),
        ],
      ),
    ],
  );
}

final class _EntertainmentDestinationChip extends StatelessWidget {
  const _EntertainmentDestinationChip({
    required this.label,
    required this.available,
    this.blockedReason,
  });

  final String label;
  final bool available;
  final String? blockedReason;

  @override
  Widget build(BuildContext context) => Chip(
    avatar: Icon(
      available ? Icons.check_circle_rounded : Icons.lock_outline_rounded,
      size: 18,
    ),
    label: Text(
      available
          ? '$label available'
          : '$label ${blockedReason ?? 'not connected'}',
    ),
  );
}

bool _integrationAvailable(String platform, List<NamedResource> integrations) {
  return integrations.any((item) {
    if (item.label != platform) {
      return false;
    }
    final state = item.status;
    final credential =
        item.raw['credential_configured'] == true ||
        item.raw['refresh_credential_configured'] == true ||
        item.raw['connection_secret_configured'] == true;
    return credential && (state == 'connected' || state == 'degraded');
  });
}

final class _LiveResourceSection extends StatelessWidget {
  const _LiveResourceSection({
    required this.title,
    required this.items,
    required this.emptyMessage,
    this.actionBuilder,
  });

  final String title;
  final List<NamedResource> items;
  final String emptyMessage;
  final Widget Function(NamedResource item)? actionBuilder;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      const Divider(),
      Text(title, style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 6),
      if (items.isEmpty)
        Text(emptyMessage, style: Theme.of(context).textTheme.bodySmall)
      else
        for (final item in items)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(item.label),
            subtitle: item.status == null ? null : Text(item.status!),
            trailing: actionBuilder?.call(item),
          ),
    ],
  );
}

final class _StatusPanel extends StatelessWidget {
  const _StatusPanel({required this.message, required this.error});

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error
        ? Theme.of(context).colorScheme.error
        : LumenColors.verdigris;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(message, style: TextStyle(color: color)),
      ),
    );
  }
}

final class _TikTokLiveControlPanel extends ConsumerWidget {
  const _TikTokLiveControlPanel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(tiktokControlPanelProvider);
    return LumenSurface(
      child: value.when(
        loading: () => const Text('Loading TikTok LIVE control panel…'),
        error: (error, _) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('TikTok LIVE', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(messageFor(error)),
            TextButton(
              onPressed: () => ref.invalidate(tiktokControlPanelProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
        data: (panel) {
          final status = '${panel['integration_status'] ?? 'unknown'}';
          final adapter = '${panel['adapter_status'] ?? 'unknown'}';
          final limitation = '${panel['limitation'] ?? ''}';
          final personalities =
              (panel['personalities'] as List<dynamic>? ?? const [])
                  .map((item) => '$item')
                  .join(', ');
          final events =
              (panel['supported_events'] as List<dynamic>? ?? const [])
                  .map((item) => '$item')
                  .take(8)
                  .join(', ');
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'TikTok LIVE',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text('Status: $status'),
              Text('Adapter: $adapter'),
              if (limitation.isNotEmpty) ...<Widget>[
                const SizedBox(height: 8),
                Text(limitation),
              ],
              const SizedBox(height: 8),
              Text('Personalities: $personalities'),
              Text('Events (sample): $events'),
              const SizedBox(height: 8),
              Text(
                'Mute AI · Interrupt AI · TTS volume · Host mode · Reconnect · Diagnostics are reserved until an approved provider transport is connected.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => ref.invalidate(tiktokControlPanelProvider),
                  child: const Text('Refresh diagnostics'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
