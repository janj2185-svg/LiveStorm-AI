import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:just_audio/just_audio.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../core/realtime.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../creator_studio/media_publisher.dart';
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

final aiConversationProvider = FutureProvider.autoDispose
    .family<AiConversationModel, String>(
      (ref, id) => ref.watch(aiRepositoryProvider).conversation(id),
    );

Future<void> openAuraConversation(
  BuildContext context,
  WidgetRef ref, {
  required String purpose,
  required String title,
}) async {
  try {
    final conversation = await ref
        .read(aiRepositoryProvider)
        .createConversation(title: title, purpose: purpose);
    ref.invalidate(aiProvider);
    if (context.mounted) {
      await context.pushNamed(
        'ai-conversation',
        pathParameters: <String, String>{'id': conversation.id},
      );
    }
  } on Object catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }
}

final aiMemoryProvider = FutureProvider.autoDispose<List<NamedResource>>(
  (ref) => ref.watch(aiRepositoryProvider).memory(),
);

@immutable
final class LiveSnapshot {
  const LiveSnapshot({
    required this.sessions,
    required this.integrations,
    this.incomingInvites = const <LiveGuestInviteModel>[],
    this.sessionsError,
    this.integrationsError,
    this.incomingInvitesError,
  });

  final List<LiveSessionModel> sessions;
  final List<NamedResource> integrations;
  final List<LiveGuestInviteModel> incomingInvites;
  final Object? sessionsError;
  final Object? integrationsError;
  final Object? incomingInvitesError;
}

final liveProvider = FutureProvider.autoDispose<LiveSnapshot>((ref) async {
  final repository = ref.watch(liveRepositoryProvider);
  var sessions = const <LiveSessionModel>[];
  var integrations = const <NamedResource>[];
  var incomingInvites = const <LiveGuestInviteModel>[];
  Object? sessionsError;
  Object? integrationsError;
  Object? incomingInvitesError;
  try {
    sessions = await repository.sessions();
  } on Object catch (error) {
    sessionsError = error;
  }
  try {
    integrations = await repository.integrations();
  } on Object catch (error) {
    integrationsError = error;
  }
  try {
    incomingInvites = await repository.incomingGuestInvites();
  } on Object catch (error) {
    incomingInvitesError = error;
  }
  return LiveSnapshot(
    sessions: sessions,
    integrations: integrations,
    incomingInvites: incomingInvites,
    sessionsError: sessionsError,
    integrationsError: integrationsError,
    incomingInvitesError: incomingInvitesError,
  );
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
      showAuraPresence: false,
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
                    child: InkWell(
                      borderRadius: BorderRadius.circular(
                        SyloraTokens.radiusLg,
                      ),
                      onTap: () => context.goNamed('earnings'),
                      child: _BalanceCard(
                        label: l10n.walletCreatorEarnings,
                        balance: snapshot.earnings,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Tap earnings to open Creator Earnings · live gifts only',
                style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
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
                  LumenSecondaryButton(
                    label: 'Earnings',
                    icon: Icons.insights_outlined,
                    onPressed: () => context.goNamed('earnings'),
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

final class _LiveGiftTray extends ConsumerStatefulWidget {
  const _LiveGiftTray({required this.sessionId, required this.hostUserId});

  final String sessionId;
  final String? hostUserId;

  @override
  ConsumerState<_LiveGiftTray> createState() => _LiveGiftTrayState();
}

final class _LiveGiftTrayState extends ConsumerState<_LiveGiftTray> {
  String? _sendingId;
  String? _feedback;
  String? _lastGiftId;
  DateTime? _lastSentAt;
  int _comboCount = 0;
  Timer? _feedbackTimer;

  @override
  void dispose() {
    _feedbackTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventory = ref.watch(giftInventoryProvider);
    final catalog = ref.watch(giftCatalogProvider);
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                Icons.auto_awesome_rounded,
                color: Theme.of(context).colorScheme.secondary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Send a gift', style: SyloraTokens.title(16)),
              ),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                child: _feedback == null
                    ? const SizedBox.shrink()
                    : LumenBadge(
                        key: ValueKey<String>(_feedback!),
                        label: _feedback!,
                        color: LumenColors.verdigris,
                      ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Choose an owned gift or send one from the catalog to this live host.',
            style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
          ),
          const SizedBox(height: 12),
          if (widget.hostUserId == null)
            _notice(
              icon: Icons.person_off_outlined,
              title: 'Live host unavailable',
              message:
                  'The session did not include a host identity, so sending stays disabled.',
              actionLabel: 'Refresh session',
              onAction: () =>
                  ref.invalidate(liveSessionProvider(widget.sessionId)),
            )
          else
            inventory.when(
              loading: () => const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  LinearProgressIndicator(),
                  SizedBox(height: 8),
                  Text('Loading your gift inventory…'),
                ],
              ),
              error: (error, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  _notice(
                    icon: Icons.inventory_2_outlined,
                    title: 'Inventory unavailable',
                    message: messageFor(error),
                    actionLabel: 'Retry inventory',
                    onAction: () => ref.invalidate(giftInventoryProvider),
                  ),
                  const SizedBox(height: 10),
                  _catalogBody(catalog, inventoryUnavailable: true),
                ],
              ),
              data: (page) {
                final items = page.items;
                if (items.isNotEmpty) {
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      for (final item in items.take(8))
                        FilledButton.tonalIcon(
                          onPressed: _sendingId == null
                              ? () => _send(
                                  giftId: item.giftDefinitionId,
                                  giftName: _giftName(
                                    catalog,
                                    item.giftDefinitionId,
                                  ),
                                  inventoryItemId: item.id,
                                )
                              : null,
                          icon: _sendingId == item.id
                              ? const SizedBox.square(
                                  dimension: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.card_giftcard_rounded),
                          label: Text(
                            '${_giftName(catalog, item.giftDefinitionId)} ×${item.quantity}',
                          ),
                        ),
                    ],
                  );
                }
                return _catalogBody(catalog);
              },
            ),
        ],
      ),
    );
  }

  Widget _catalogBody(
    AsyncValue<CursorPage<GiftModel>> catalog, {
    bool inventoryUnavailable = false,
  }) {
    return catalog.when(
      loading: () => const LinearProgressIndicator(),
      error: (error, _) => _notice(
        icon: Icons.cloud_off_outlined,
        title: 'Gifts could not load',
        message: messageFor(error),
        actionLabel: 'Try again',
        onAction: () => ref.invalidate(giftCatalogProvider),
      ),
      data: (gifts) {
        if (gifts.items.isEmpty) {
          return _notice(
            icon: Icons.redeem_outlined,
            title: 'No gifts available yet',
            message:
                'The live session is ready, but the gift catalog is currently empty.',
            actionLabel: 'Refresh gifts',
            onAction: () => ref.invalidate(giftCatalogProvider),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (inventoryUnavailable)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Catalog gifts remain available.',
                  style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
                ),
              ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                for (final gift in gifts.items.take(8))
                  FilledButton.tonalIcon(
                    onPressed: _sendingId == null
                        ? () => _send(
                            giftId: gift.id,
                            giftName: gift.name,
                            giftDefinitionId: gift.id,
                          )
                        : null,
                    icon: _sendingId == gift.id
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome_rounded),
                    label: Text(gift.name),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }

  String _giftName(
    AsyncValue<CursorPage<GiftModel>> catalog,
    String giftDefinitionId,
  ) {
    final items = catalog.asData?.value.items ?? const <GiftModel>[];
    for (final gift in items) {
      if (gift.id == giftDefinitionId) {
        return gift.name;
      }
    }
    return 'Owned gift';
  }

  Widget _notice({
    required IconData icon,
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Icon(icon, color: SyloraTokens.inkSoft),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 2),
              Text(message),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: Text(actionLabel),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _send({
    required String giftId,
    required String giftName,
    String? inventoryItemId,
    String? giftDefinitionId,
  }) async {
    setState(() => _sendingId = inventoryItemId ?? giftDefinitionId);
    try {
      await ref
          .read(giftRepositoryProvider)
          .send(
            recipientUserId: widget.hostUserId!,
            inventoryItemId: inventoryItemId,
            giftDefinitionId: giftDefinitionId,
            liveSessionId: widget.sessionId,
            message: 'Sent during live',
          );
      ref.invalidate(giftInventoryProvider);
      ref.invalidate(liveGiftRankingsProvider(widget.sessionId));
      if (mounted) {
        final now = DateTime.now();
        final continuesCombo =
            _lastGiftId == giftId &&
            _lastSentAt != null &&
            now.difference(_lastSentAt!) <= const Duration(seconds: 15);
        setState(() {
          _comboCount = continuesCombo
              ? (_comboCount >= 10 ? 10 : _comboCount + 1)
              : 1;
          _lastGiftId = giftId;
          _lastSentAt = now;
          _feedback = _comboCount > 1
              ? '$giftName · combo ×$_comboCount'
              : '$giftName sent';
        });
        _feedbackTimer?.cancel();
        _feedbackTimer = Timer(const Duration(seconds: 3), () {
          if (mounted) {
            setState(() => _feedback = null);
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sent $giftName to the live host.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _sendingId = null);
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
                              (gift) =>
                                  _tierFilter == null ||
                                  gift.tier == _tierFilter,
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
                                padding: const EdgeInsets.fromLTRB(
                                  20,
                                  12,
                                  20,
                                  0,
                                ),
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
                                          borderRadius: BorderRadius.circular(
                                            20,
                                          ),
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
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                                const Spacer(),
                                                Row(
                                                  children: <Widget>[
                                                    LumenBadge(
                                                      label: gift.tier,
                                                      color: LumenColors.bloom,
                                                    ),
                                                    const Spacer(),
                                                    Text(
                                                      '${gift.priceMinor} LUMEN',
                                                    ),
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
                              onAction: () =>
                                  ref.invalidate(giftInventoryProvider),
                              icon: Icons.inventory_2_outlined,
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(20),
                              itemCount: page.items.length,
                              itemBuilder: (context, index) {
                                final item = page.items[index];
                                return Card(
                                  child: ListTile(
                                    leading: const Icon(
                                      Icons.card_giftcard_rounded,
                                    ),
                                    title: Text(
                                      'Gift ${item.giftDefinitionId.substring(0, 8)}',
                                    ),
                                    subtitle: Text(
                                      '${item.quantity} available • ${item.unitPriceMinor} LUMEN each\nReady to send during Live / Conference / Voice Rooms',
                                    ),
                                    isThreeLine: true,
                                    trailing: const Chip(
                                      label: Text('In inventory'),
                                    ),
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
                                    onAction: () =>
                                        ref.invalidate(giftEventsProvider),
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
  JsonObject? _presence;
  Object? _presenceError;
  bool _avatarBusy = false;

  @override
  void initState() {
    super.initState();
    _aura = SyloraAuraPresenceController.forPreset(
      SyloraAuraContextPreset.ai,
      mode: SyloraAuraPresenceMode.companion,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPresence());
  }

  Future<void> _loadPresence() async {
    try {
      final presence = await ref.read(aiRepositoryProvider).auraPresence();
      if (mounted) {
        setState(() {
          _presence = presence;
          _presenceError = null;
        });
      }
    } on Object catch (error) {
      if (mounted) setState(() => _presenceError = error);
    }
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
    final mood = _presence?['mood_label'] as String? ?? l10n.aiOnline;
    final personality =
        _presence?['personality'] as String? ??
        'Warm · Curious · Precise · Alive';
    final firstName = personality.split('·').first.trim();
    return LumenPage(
      title: 'Aura',
      subtitle: mood,
      intensity: 0.96,
      showAuraDock: false,
      auraEmotion: AuraEmotion.greeting,
      auraLabel: mood,
      showAuraPresence: true,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.ai,
      auraPresenceMode: SyloraAuraPresenceMode.companion,
      header: SyloraUniverseHero(
        eyebrow: l10n.aiHeroEyebrow,
        title: 'Aura',
        body: l10n.aiHeroBody,
        trailing: SyloraPortalChip(
          label: l10n.aiMemory,
          icon: Icons.psychology_alt_outlined,
          onTap: () => context.pushNamed('ai-memory'),
        ),
        metrics: <Widget>[
          SyloraMetricPill(
            label: firstName.isEmpty ? 'Aura' : firstName,
            value: mood,
            icon: Icons.favorite_border_rounded,
          ),
        ],
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
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                SyloraStaggeredReveal(
                  index: 0,
                  child: SyloraGlass(
                    radius: SyloraTokens.radiusXl,
                    padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
                    child: Column(
                      children: <Widget>[
                        SyloraAura(
                          size: 148,
                          emotion: AuraEmotion.greeting,
                          label: l10n.auraCompanionLabel,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Aura',
                          style: SyloraTokens.display(36),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.aiHeroBody,
                          style: SyloraTokens.body(15, color: SyloraTokens.inkSoft),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 18),
                        SyloraButton(
                          label: l10n.aiTalkNow,
                          icon: Icons.auto_awesome_rounded,
                          onPressed: () => _beginAura(
                            context,
                            ref,
                            purpose: 'general',
                            title: l10n.aiTalkNow,
                            grantConsent: true,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8,
                          runSpacing: 8,
                          children: <Widget>[
                            SyloraPortalChip(
                              label: l10n.aiStarterQuiet,
                              icon: Icons.spa_outlined,
                              onTap: () => _beginAura(
                                context,
                                ref,
                                purpose: 'general',
                                title: l10n.aiStarterQuiet,
                                grantConsent: true,
                                forceNew: true,
                              ),
                            ),
                            SyloraPortalChip(
                              label: l10n.aiStarterCreate,
                              icon: Icons.brush_outlined,
                              onTap: () => _beginAura(
                                context,
                                ref,
                                purpose: 'general',
                                title: l10n.aiStarterCreate,
                                grantConsent: true,
                                forceNew: true,
                              ),
                            ),
                            SyloraPortalChip(
                              label: l10n.aiStarterLive,
                              icon: Icons.podcasts_rounded,
                              onTap: () => _beginAura(
                                context,
                                ref,
                                purpose: 'general',
                                title: l10n.aiStarterLive,
                                grantConsent: true,
                                forceNew: true,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          l10n.aiConsentBody,
                          style: SyloraTokens.body(12.5, color: SyloraTokens.inkMute),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }
          if (!snapshot.providers.chatAvailable) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                _AuraPresencePanel(
                  presence: _presence,
                  error: _presenceError,
                  avatarCapable:
                      snapshot.providers.capabilities['avatar'] == true,
                  avatarBusy: _avatarBusy,
                  onRefresh: _loadPresence,
                  onGenerateAvatar: () => _queueAvatar(),
                ),
                const SizedBox(height: 16),
                LumenEmptyView(
                  title: l10n.aiProviderUnavailable,
                  message: l10n.aiProviderUnavailableBody,
                  actionLabel: l10n.commonRetry,
                  onAction: () => ref.invalidate(aiProvider),
                  icon: Icons.auto_awesome_rounded,
                ),
              ],
            );
          }
          var index = 0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(height: 0),
              SyloraStaggeredReveal(
                index: index++,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    SyloraButton(
                      label: l10n.aiTalkNow,
                      icon: Icons.auto_awesome_rounded,
                      onPressed: () => _createConversation(
                        context,
                        ref,
                        title: l10n.aiTalkNow,
                      ),
                    ),
                    if (snapshot.conversations.items.isNotEmpty)
                      SyloraButton(
                        label: l10n.aiContinueChat,
                        variant: SyloraButtonVariant.secondary,
                        icon: Icons.forum_outlined,
                        onPressed: () => context.pushNamed(
                          'ai-conversation',
                          pathParameters: <String, String>{
                            'id': snapshot.conversations.items.first.id,
                          },
                        ),
                      ),
                    SyloraPortalChip(
                      label: l10n.aiStarterQuiet,
                      icon: Icons.spa_outlined,
                      onTap: () => _beginAura(
                        context,
                        ref,
                        purpose: 'general',
                        title: l10n.aiStarterQuiet,
                        forceNew: true,
                      ),
                    ),
                    SyloraPortalChip(
                      label: l10n.aiStarterCreate,
                      icon: Icons.brush_outlined,
                      onTap: () => _beginAura(
                        context,
                        ref,
                        purpose: 'general',
                        title: l10n.aiStarterCreate,
                        forceNew: true,
                      ),
                    ),
                    SyloraPortalChip(
                      label: l10n.aiStarterLive,
                      icon: Icons.podcasts_rounded,
                      onTap: () => _beginAura(
                        context,
                        ref,
                        purpose: 'general',
                        title: l10n.aiStarterLive,
                        forceNew: true,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text(
                  l10n.aiAuraSettings,
                  style: SyloraTokens.title(16),
                ),
                children: <Widget>[
                  _AuraPresencePanel(
                    presence: _presence,
                    error: _presenceError,
                    avatarCapable:
                        snapshot.providers.capabilities['avatar'] == true,
                    avatarBusy: _avatarBusy,
                    onRefresh: _loadPresence,
                    onGenerateAvatar: () => _queueAvatar(),
                  ),
                  const SizedBox(height: 12),
                  SyloraGlassTile(
                    child: Row(
                      children: <Widget>[
                        const Icon(
                          Icons.data_usage_rounded,
                          color: SyloraTokens.champagneDeep,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            '${snapshot.usage['total_units'] ?? 0}',
                            style: SyloraTokens.title(17),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                l10n.aiConversations,
                style: SyloraTokens.title(20),
              ),
              const SizedBox(height: 12),
              if (snapshot.conversations.items.isEmpty)
                LumenEmptyView(
                  title: l10n.aiEmptyConversations,
                  message: l10n.aiEmptyConversationsBody,
                  actionLabel: l10n.aiTalkNow,
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
                                    '${_aiPurposeLabel(conversation.purpose)} • '
                                    '${conversation.locale}',
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
            emotion: _auraEmotion('${_presence?['emotion'] ?? 'greeting'}'),
            tip:
                '${_presence?['mood_label'] ?? 'Я Aura — пиши як людині, я поруч.'}',
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

  Future<void> _queueAvatar() async {
    final prompt = TextEditingController();
    try {
      final submitted = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Generate Aura avatar'),
          content: SizedBox(
            width: 520,
            child: TextField(
              controller: prompt,
              minLines: 3,
              maxLines: 7,
              maxLength: 8000,
              decoration: const InputDecoration(
                labelText: 'Avatar direction',
                helperText:
                    'Describe visual style and expression. Generation runs only through a configured avatar provider.',
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                if (prompt.text.trim().isNotEmpty) {
                  Navigator.pop(dialogContext, true);
                }
              },
              child: const Text('Queue avatar'),
            ),
          ],
        ),
      );
      if (submitted != true || !mounted) return;
      setState(() => _avatarBusy = true);
      await ref.read(aiRepositoryProvider).createJob(<String, dynamic>{
        'capability': 'avatar',
        'prompt': prompt.text.trim(),
      });
      await _loadPresence();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Aura avatar generation queued.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      prompt.dispose();
      if (mounted) setState(() => _avatarBusy = false);
    }
  }

  static AuraEmotion _auraEmotion(String emotion) => switch (emotion) {
    'idle' => AuraEmotion.idle,
    'listening' => AuraEmotion.listening,
    'thinking' => AuraEmotion.thinking,
    'speaking' => AuraEmotion.speaking,
    'amused' => AuraEmotion.amused,
    'focused' => AuraEmotion.focused,
    'delighted' => AuraEmotion.delighted,
    'thoughtful' => AuraEmotion.thoughtful,
    'supportive' => AuraEmotion.supportive,
    _ => AuraEmotion.greeting,
  };

  static Future<void> _createConversation(
    BuildContext context,
    WidgetRef ref, {
    String purpose = 'general',
    String? title,
  }) {
    final l10n = AppLocalizations.of(context);
    return _beginAura(
      context,
      ref,
      purpose: purpose,
      title: title ?? l10n.aiTalkNow,
    );
  }

  static Future<void> _beginAura(
    BuildContext context,
    WidgetRef ref, {
    required String purpose,
    required String title,
    bool grantConsent = false,
    bool forceNew = false,
  }) async {
    try {
      if (grantConsent) {
        await ref.read(aiRepositoryProvider).updateSettings(
          <String, dynamic>{'consent_granted': true},
        );
        ref.invalidate(aiProvider);
      }
      final existing = ref.read(aiProvider).asData?.value.conversations.items;
      if (!forceNew && existing != null && existing.isNotEmpty) {
        if (context.mounted) {
          await context.pushNamed(
            'ai-conversation',
            pathParameters: <String, String>{'id': existing.first.id},
          );
        }
        return;
      }
      await openAuraConversation(
        context,
        ref,
        purpose: purpose,
        title: title,
      );
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
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

final class _AuraPresencePanel extends StatelessWidget {
  const _AuraPresencePanel({
    required this.presence,
    required this.error,
    required this.avatarCapable,
    required this.avatarBusy,
    required this.onRefresh,
    required this.onGenerateAvatar,
  });

  final JsonObject? presence;
  final Object? error;
  final bool avatarCapable;
  final bool avatarBusy;
  final VoidCallback onRefresh;
  final VoidCallback onGenerateAvatar;

  @override
  Widget build(BuildContext context) {
    final data = presence;
    final emotion = '${data?['emotion'] ?? 'greeting'}';
    final mood = '${data?['mood_label'] ?? 'Checking Aura presence…'}';
    final voiceOutputReady =
        data?['voice_output_ready'] == true || data?['voice_ready'] == true;
    final transcriptionReady =
        data?['voice_input_ready'] == true ||
        data?['transcription_ready'] == true;
    final avatarReady = data?['avatar_ready'] == true && avatarCapable;
    final avatarStatus = data?['avatar_job_status'] as String?;
    final color = _emotionColor(emotion);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0.72, end: 1),
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 620),
                curve: Curves.easeOutBack,
                builder: (context, value, child) => Transform.scale(
                  scale: value,
                  child: Container(
                    width: 86,
                    height: 86,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: <Color>[
                          color.withValues(alpha: 0.24),
                          color.withValues(alpha: 0.04),
                        ],
                      ),
                      border: Border.all(
                        color: color.withValues(alpha: 0.46),
                        width: 1.5,
                      ),
                      boxShadow: <BoxShadow>[
                        BoxShadow(
                          color: color.withValues(alpha: 0.22),
                          blurRadius: 24,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: child,
                  ),
                ),
                child: Center(
                  child: SyloraAura(
                    size: 62,
                    emotion: _AiScreenState._auraEmotion(emotion),
                    showLabel: false,
                    animate: !reduceMotion,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 220),
                            child: Text(
                              mood,
                              key: ValueKey<String>(mood),
                              style: SyloraTokens.title(20),
                            ),
                          ),
                        ),
                        LumenBadge(label: emotion, color: color),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${data?['context_summary'] ?? 'Aura presence metrics are loading from the API.'}',
                      style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
                    ),
                    if (error != null) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(
                        'Presence unavailable: ${messageFor(error!)}',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Refresh Aura presence',
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: <Widget>[
              _AuraSignalCard(
                icon: Icons.psychology_alt_outlined,
                color: LumenColors.pulse,
                title: 'Memory',
                value: '${data?['memory_count'] ?? '—'} remembered',
                detail:
                    'Only enabled after explicit AI consent and your memory setting.',
              ),
              _AuraSignalCard(
                icon: Icons.graphic_eq_rounded,
                color: voiceOutputReady
                    ? LumenColors.verdigris
                    : LumenColors.porcelainMuted,
                title: 'Voice & captions',
                value: voiceOutputReady ? 'Aura can speak' : 'TTS unavailable',
                detail: transcriptionReady
                    ? 'Speech-to-text is configured for recorded caption clips; captions are not continuous live transcription.'
                    : 'Speech-to-text is not configured. The app will not claim captions are available.',
              ),
              _AuraSignalCard(
                icon: Icons.face_retouching_natural_rounded,
                color: avatarReady
                    ? LumenColors.bloom
                    : LumenColors.porcelainMuted,
                title: 'Avatar',
                value: avatarStatus == null
                    ? (avatarReady ? 'Provider ready' : 'Provider offline')
                    : 'Latest job: $avatarStatus',
                detail: avatarReady
                    ? 'Avatar generation is provider-backed and queued as a real AI job.'
                    : 'No configured avatar provider is reporting capability.',
                action: LumenSecondaryButton(
                  label: avatarBusy
                      ? 'Queueing…'
                      : avatarStatus == null
                      ? 'Generate'
                      : 'Generate again',
                  icon: Icons.auto_awesome_rounded,
                  onPressed: avatarReady && !avatarBusy
                      ? onGenerateAvatar
                      : null,
                  disabledReason:
                      'Avatar generation stays disabled until a provider is configured.',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static Color _emotionColor(String emotion) => switch (emotion) {
    'speaking' || 'delighted' || 'amused' => LumenColors.bloom,
    'thinking' || 'thoughtful' || 'focused' => LumenColors.pulse,
    'listening' || 'supportive' => LumenColors.verdigris,
    _ => LumenColors.aether,
  };
}

final class _AuraSignalCard extends StatelessWidget {
  const _AuraSignalCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
    required this.detail,
    this.action,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String value;
  final String detail;
  final Widget? action;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 300,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: SyloraTokens.title(14))),
            ],
          ),
          const SizedBox(height: 10),
          Text(value, style: SyloraTokens.title(17)),
          const SizedBox(height: 4),
          Text(
            detail,
            style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
          ),
          if (action != null) ...<Widget>[const SizedBox(height: 12), action!],
        ],
      ),
    ),
  );
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
  final _media = CreatorMediaController();
  final _voicePlayer = AudioPlayer();
  late final SyloraAuraPresenceController _aura;
  JsonObject? _presence;
  Object? _presenceError;
  bool _sending = false;
  String? _streamingText;
  bool _recording = false;
  bool _voiceBusy = false;
  String? _voiceStatus;
  String? _speakingMessageId;

  @override
  void initState() {
    super.initState();
    _aura = SyloraAuraPresenceController.forPreset(
      SyloraAuraContextPreset.ai,
      mode: SyloraAuraPresenceMode.companion,
    );
    _messageFocus.addListener(_syncAuraForFocus);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadVoicePresence());
  }

  @override
  void dispose() {
    _messageFocus.removeListener(_syncAuraForFocus);
    _aura.dispose();
    _media.dispose();
    _voicePlayer.dispose();
    _message.dispose();
    _messageFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(aiMessagesProvider(widget.conversationId));
    final conversation = ref.watch(
      aiConversationProvider(widget.conversationId),
    );
    final ai = ref.watch(aiProvider);
    final consentGranted = ai.asData?.value.settings.consentGranted == true;
    final transcriptionReady =
        _presence?['voice_input_ready'] == true ||
        _presence?['transcription_ready'] == true;
    final voiceOutputReady =
        _presence?['voice_output_ready'] == true ||
        _presence?['voice_ready'] == true;
    final purpose = conversation.asData?.value.purpose ?? 'general';
    final conversationHeight = (MediaQuery.sizeOf(context).height - 260).clamp(
      420.0,
      820.0,
    );
    return LumenPage(
      title: _aiPurposeTitle(purpose),
      subtitle: _aiPurposeSubtitle(purpose),
      header: SyloraUniverseHero(
        eyebrow: _aiPurposeLabel(purpose).toUpperCase(),
        title: _aiPurposeTitle(purpose),
        body: _aiPurposeSubtitle(purpose),
      ),
      showAuraDock: false,
      auraEmotion: _sending ? AuraEmotion.thinking : AuraEmotion.listening,
      auraLabel: _sending ? 'Думаю…' : 'Слухаю',
      showAuraPresence: true,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.ai,
      auraPresenceMode: SyloraAuraPresenceMode.companion,
      child: SizedBox(
        height: conversationHeight,
        child: Column(
          children: <Widget>[
            _AuraVoiceControls(
              consentGranted: consentGranted,
              transcriptionReady: transcriptionReady,
              voiceOutputReady: voiceOutputReady,
              captureSupported: _media.captionCaptureSupported,
              recording: _recording,
              busy: _voiceBusy || _sending,
              speaking: _speakingMessageId != null,
              status: _voiceStatus,
              presenceError: _presenceError,
              onRecord: () => unawaited(_toggleRecording()),
              onStopSpeaking: () => unawaited(_stopSpeaking()),
              onRefresh: () => unawaited(_loadVoicePresence()),
            ),
            const SizedBox(height: 12),
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
                        itemCount:
                            page.items.length +
                            (_sending || _streamingText != null ? 1 : 0),
                        itemBuilder: (context, index) {
                          if ((_sending || _streamingText != null) &&
                              index == 0) {
                            if (_streamingText case final String streamed
                                when streamed.isNotEmpty) {
                              return _AiMessageBubble(
                                conversationId: widget.conversationId,
                                message: AiMessageModel(
                                  id: 'streaming',
                                  role: 'assistant',
                                  content: streamed,
                                  status: 'streaming',
                                  citations: const <AiCitationModel>[],
                                  proposals: const <AiToolProposalModel>[],
                                ),
                                speaking: false,
                                onSpeak: (_) async {},
                                onChanged: () {},
                              );
                            }
                            return const _AuraTypingBubble();
                          }
                          final messageIndex =
                              (_sending || _streamingText != null)
                              ? index - 1
                              : index;
                          return _AiMessageBubble(
                            conversationId: widget.conversationId,
                            message: page.items[messageIndex],
                            speaking:
                                _speakingMessageId ==
                                page.items[messageIndex].id,
                            onSpeak: _speakReply,
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
    await _sendContent(content, clearComposer: true);
  }

  Future<bool> _sendContent(
    String content, {
    required bool clearComposer,
  }) async {
    if (_sending) {
      return false;
    }
    setState(() {
      _sending = true;
      _streamingText = null;
    });
    _aura.think('Хвилинку — збираю думку…');
    try {
      if (clearComposer) {
        _message.clear();
      }
      var completed = false;
      await for (final event in ref
          .read(aiRepositoryProvider)
          .sendStream(widget.conversationId, content)) {
        if (!mounted) {
          return false;
        }
        if (event.isDelta) {
          final piece = event.text ?? '';
          if (piece.isEmpty) {
            continue;
          }
          setState(() {
            _streamingText = '${_streamingText ?? ''}$piece';
          });
          _aura.speak('Пишу відповідь…');
        } else if (event.isCompleted) {
          completed = true;
          setState(() => _streamingText = null);
          ref.invalidate(aiMessagesProvider(widget.conversationId));
          _aura.speak('Ось що вийшло — якщо треба, уточни.');
        } else if (event.isError) {
          throw event.error ?? StateError('AI stream failed');
        }
      }
      if (!completed) {
        ref.invalidate(aiMessagesProvider(widget.conversationId));
      }
      return true;
    } on Object catch (error) {
      _aura.focus('Ой, щось пішло не так. Спробуй ще раз.');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
          _streamingText = null;
        });
        _syncAuraForFocus();
      }
    }
  }

  Future<void> _loadVoicePresence() async {
    try {
      final presence = await ref.read(aiRepositoryProvider).auraPresence();
      if (mounted) {
        setState(() {
          _presence = presence;
          _presenceError = null;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _presence = null;
          _presenceError = error;
        });
      }
    }
  }

  Future<void> _toggleRecording() async {
    final consentGranted =
        ref.read(aiProvider).asData?.value.settings.consentGranted == true;
    if (!consentGranted) {
      _setVoiceStatus(
        'Grant AI consent before sending microphone audio to Aura.',
      );
      return;
    }
    if (_presence?['voice_input_ready'] != true &&
        _presence?['transcription_ready'] != true) {
      _setVoiceStatus(
        _presenceError == null
            ? 'Speech-to-text is unavailable. You can still type to Aura.'
            : 'Voice readiness could not be verified. Refresh and try again.',
      );
      return;
    }
    if (!_media.captionCaptureSupported) {
      _setVoiceStatus(
        'Record for Aura currently requires SYLORA in a web browser. You can still type your message.',
      );
      return;
    }
    if (_voiceBusy || _sending) {
      return;
    }
    setState(() => _voiceBusy = true);
    try {
      if (!_recording) {
        await _media.startCaptionCapture();
        if (!mounted) return;
        setState(() {
          _recording = true;
          _voiceStatus =
              'Recording a short clip… tap Stop & send when you finish.';
        });
        _aura.listen('Слухаю тебе…');
        return;
      }

      final clip = await _media.stopCaptionCapture();
      if (!mounted) return;
      setState(() {
        _recording = false;
        _voiceStatus = 'Transcribing your clip…';
      });
      _aura.think('Розпізнаю твої слова…');
      final result = await ref
          .read(aiRepositoryProvider)
          .transcribeAudio(
            clip.bytes,
            filename: clip.filename,
            contentType: clip.contentType,
          );
      final transcript = optionalString(result, 'text')?.trim();
      if (transcript == null || transcript.isEmpty) {
        _setVoiceStatus(
          'No speech was detected. Nothing was sent; try a short clear clip.',
        );
        return;
      }
      _setVoiceStatus('Heard: “$transcript” Sending to Aura…');
      final sent = await _sendContent(transcript, clearComposer: false);
      if (sent) {
        _setVoiceStatus('Voice message sent: “$transcript”');
        await _maybeAutoSpeakLatestReply();
      } else {
        _setVoiceStatus(
          'The clip was transcribed, but the message could not be sent.',
        );
      }
    } on Object catch (error) {
      await _media.stop();
      if (mounted) {
        setState(() {
          _recording = false;
          _voiceStatus =
              'Aura did not receive audio: ${messageFor(error)} You can still type your message.';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _voiceBusy = false);
      }
    }
  }

  Future<void> _maybeAutoSpeakLatestReply() async {
    final ttsReady =
        _presence?['voice_output_ready'] == true ||
        _presence?['voice_ready'] == true;
    if (!ttsReady) {
      _setVoiceStatus(
        'Voice message sent. Spoken replies are unavailable — use Speak reply when ready.',
      );
      return;
    }
    try {
      ref.invalidate(aiMessagesProvider(widget.conversationId));
      final page = await ref.read(
        aiMessagesProvider(widget.conversationId).future,
      );
      AiMessageModel? latestAssistant;
      for (final message in page.items.reversed) {
        if (message.role == 'assistant' && message.content.trim().isNotEmpty) {
          latestAssistant = message;
          break;
        }
      }
      if (latestAssistant == null) {
        return;
      }
      _setVoiceStatus('Auto-speaking Aura’s reply to your voice turn…');
      await _speakReply(latestAssistant);
    } on Object catch (error) {
      _setVoiceStatus(
        'Voice turn sent. Auto-speak skipped: ${messageFor(error)}',
      );
    }
  }

  Future<void> _stopSpeaking() async {
    await _voicePlayer.stop();
    if (mounted) {
      setState(() {
        _speakingMessageId = null;
        _voiceStatus = 'Spoken reply stopped.';
      });
    }
  }

  Future<void> _speakReply(AiMessageModel message) async {
    final consentGranted =
        ref.read(aiProvider).asData?.value.settings.consentGranted == true;
    if (!consentGranted) {
      _showVoiceMessage('Grant AI consent before requesting a spoken reply.');
      return;
    }
    if (_presence?['voice_output_ready'] != true &&
        _presence?['voice_ready'] != true) {
      _showVoiceMessage(
        _presenceError == null
            ? 'Aura voice generation is unavailable. The text reply remains available.'
            : 'Voice readiness could not be verified. Refresh and try again.',
      );
      return;
    }
    if (_speakingMessageId != null) {
      return;
    }
    setState(() {
      _speakingMessageId = message.id;
      _voiceStatus = 'Generating Aura’s spoken reply…';
    });
    _aura.think('Готую голосову відповідь…');
    try {
      final repository = ref.read(aiRepositoryProvider);
      var job = await repository.createJob(<String, dynamic>{
        'capability': 'voice',
        'text': message.content,
        'voice': 'alloy',
        'output_format': 'mp3',
      });
      final jobId = requireString(job, 'id');
      for (var attempt = 0; attempt < 30; attempt++) {
        final status = requireString(job, 'status');
        if (status == 'succeeded') {
          break;
        }
        if (status == 'failed' || status == 'cancelled') {
          final failure = optionalString(job, 'failure_code');
          throw StateError(
            failure == null
                ? 'Voice generation ended with status $status.'
                : 'Voice generation failed ($failure).',
          );
        }
        if (attempt == 29) {
          throw StateError(
            'Voice generation is still processing. Try Speak reply again shortly.',
          );
        }
        await Future<void>.delayed(const Duration(milliseconds: 800));
        job = await repository.job(jobId);
      }
      final output = await repository.jobOutput(jobId);
      final playbackUrl = requireString(output, 'playback_url');
      final uri = Uri.tryParse(playbackUrl);
      if (uri == null ||
          !uri.hasAuthority ||
          (uri.scheme != 'https' && uri.scheme != 'http')) {
        throw StateError(
          'The voice provider returned an invalid playback URL.',
        );
      }
      await _voicePlayer.stop();
      await _voicePlayer.setUrl(playbackUrl);
      if (mounted) {
        setState(() => _voiceStatus = 'Aura is speaking this reply.');
      }
      _aura.speak('Озвучую відповідь…');
      await _voicePlayer.play();
      _setVoiceStatus('Spoken reply finished.');
    } on Object catch (error) {
      _setVoiceStatus(
        'Aura could not speak this reply: ${messageFor(error)} The text reply is unchanged.',
      );
      _aura.focus('Голос зараз недоступний — текст відповіді тут.');
    } finally {
      if (mounted) {
        setState(() => _speakingMessageId = null);
        _syncAuraForFocus();
      }
    }
  }

  void _setVoiceStatus(String status) {
    if (mounted) {
      setState(() => _voiceStatus = status);
    }
  }

  void _showVoiceMessage(String message) {
    _setVoiceStatus(message);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
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

final class _AuraVoiceControls extends StatelessWidget {
  const _AuraVoiceControls({
    required this.consentGranted,
    required this.transcriptionReady,
    required this.voiceOutputReady,
    required this.captureSupported,
    required this.recording,
    required this.busy,
    required this.speaking,
    required this.status,
    required this.presenceError,
    required this.onRecord,
    required this.onStopSpeaking,
    required this.onRefresh,
  });

  final bool consentGranted;
  final bool transcriptionReady;
  final bool voiceOutputReady;
  final bool captureSupported;
  final bool recording;
  final bool busy;
  final bool speaking;
  final String? status;
  final Object? presenceError;
  final VoidCallback onRecord;
  final VoidCallback onStopSpeaking;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final inputReady = consentGranted && transcriptionReady && captureSupported;
    final readinessMessage = !consentGranted
        ? 'Voice stays off until AI consent is granted.'
        : presenceError != null
        ? 'Voice readiness unavailable: ${messageFor(presenceError!)}'
        : !transcriptionReady
        ? 'Speech-to-text is not configured. Type a message instead.'
        : !captureSupported
        ? 'Microphone clips are available on SYLORA web. Type a message on this device.'
        : 'Record a short clip; it is transcribed, then sent as a text message.';
    return LumenSurface(
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      radius: 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              const Icon(
                Icons.graphic_eq_rounded,
                color: LumenColors.verdigris,
              ),
              Text('Aura voice', style: SyloraTokens.title(15)),
              LumenBadge(
                label: inputReady ? 'Listening ready' : 'Input unavailable',
                color: inputReady
                    ? LumenColors.verdigris
                    : LumenColors.porcelainMuted,
              ),
              LumenBadge(
                label: voiceOutputReady && consentGranted
                    ? 'Replies ready'
                    : 'Replies unavailable',
                color: voiceOutputReady && consentGranted
                    ? LumenColors.bloom
                    : LumenColors.porcelainMuted,
              ),
            ],
          ),
          const SizedBox(height: 7),
          Text(
            status ?? readinessMessage,
            style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              Expanded(
                child: FilledButton.tonalIcon(
                  onPressed: inputReady && !busy ? onRecord : null,
                  icon: busy
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          recording
                              ? Icons.stop_circle_outlined
                              : Icons.mic_none_rounded,
                        ),
                  label: Text(
                    busy
                        ? (recording ? 'Finishing…' : 'Starting…')
                        : recording
                        ? 'Stop & send'
                        : 'Record for Aura',
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Stop spoken reply',
                onPressed: speaking ? onStopSpeaking : null,
                icon: const Icon(Icons.stop_rounded),
              ),
              IconButton(
                tooltip: 'Refresh voice readiness',
                onPressed: busy ? null : onRefresh,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _aiPurposeLabel(String purpose) => switch (purpose) {
  'business_copilot' => 'Business Copilot',
  'learning_tutor' => 'Learning Tutor',
  _ => 'Copilot',
};

String _aiPurposeTitle(String purpose) => switch (purpose) {
  'business_copilot' => 'Aura Business',
  'learning_tutor' => 'Aura Tutor',
  _ => 'Aura',
};

String _aiPurposeSubtitle(String purpose) => switch (purpose) {
  'business_copilot' =>
    'A decision-focused copilot for planning, operations, and workspace questions.',
  'learning_tutor' =>
    'A patient tutor for explanations, examples, and step-by-step learning.',
  _ => 'Пиши природно — я відповім як живий співрозмовник.',
};

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
    required this.speaking,
    required this.onSpeak,
    required this.onChanged,
  });

  final String conversationId;
  final AiMessageModel message;
  final bool speaking;
  final Future<void> Function(AiMessageModel message) onSpeak;
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
                  if (message.role == 'assistant') ...<Widget>[
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: speaking
                          ? null
                          : () => unawaited(onSpeak(message)),
                      icon: speaking
                          ? const SizedBox.square(
                              dimension: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.volume_up_outlined),
                      label: Text(
                        speaking ? 'Preparing voice…' : 'Speak reply',
                      ),
                    ),
                  ],
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
      showAuraDock: false,
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
        showAuraDock: false,
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
      showAuraPresence: false,
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
        title: l10n.liveYourStage,
        body: l10n.liveYourStageBody,
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
              Text(l10n.liveSessions, style: SyloraTokens.title(22)),
              const SizedBox(height: 10),
              if (snapshot.sessionsError != null)
                SyloraGlassTile(
                  child: Row(
                    children: <Widget>[
                      const Icon(Icons.lock_outline_rounded),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(messageFor(snapshot.sessionsError!)),
                      ),
                    ],
                  ),
                )
              else if (snapshot.sessions.isEmpty)
                SyloraStaggeredReveal(
                  index: index++,
                  child: SyloraGlass(
                    radius: SyloraTokens.radiusXl,
                    padding: const EdgeInsets.fromLTRB(22, 26, 22, 24),
                    child: Column(
                      children: <Widget>[
                        SyloraPulseGlow(
                          color: SyloraTokens.petal,
                          child: SyloraAura(
                            size: 112,
                            emotion: AuraEmotion.listening,
                            label: l10n.auraCompanionLabel,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          l10n.liveNoSessionsTitle,
                          style: SyloraTokens.display(30),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.liveNoSessionsBody,
                          style: SyloraTokens.body(
                            15,
                            color: SyloraTokens.inkSoft,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 18),
                        SyloraButton(
                          label: l10n.liveGoLive,
                          icon: Icons.podcasts_rounded,
                          onPressed: () => _createSession(context, ref),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8,
                          runSpacing: 8,
                          children: <Widget>[
                            SyloraPortalChip(
                              label: l10n.liveOpenStudio,
                              icon: Icons.video_camera_front_outlined,
                              onTap: () => context.goNamed('creator-studio'),
                            ),
                            SyloraPortalChip(
                              label: l10n.aiTalkNow,
                              icon: Icons.auto_awesome_rounded,
                              onTap: () => context.goNamed('ai'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
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
              const SizedBox(height: 24),
              Text(l10n.liveGuestInvitations, style: SyloraTokens.title(20)),
              const SizedBox(height: 6),
              Text(
                l10n.liveGuestInvitationsBody,
                style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
              ),
              const SizedBox(height: 12),
              if (snapshot.incomingInvitesError != null)
                SyloraStaggeredReveal(
                  index: index++,
                  child: _StatusPanel(
                    message:
                        'Guest invitations could not load: ${messageFor(snapshot.incomingInvitesError!)}',
                    error: true,
                  ),
                )
              else if (snapshot.incomingInvites.isEmpty)
                SyloraStaggeredReveal(
                  index: index++,
                  child: SyloraGlassTile(
                    child: Row(
                      children: <Widget>[
                        const Icon(Icons.mark_email_read_outlined),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            l10n.liveNoGuestInvites,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                for (final invite in snapshot.incomingInvites)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: SyloraStaggeredReveal(
                      index: index++,
                      child: _LiveGuestInviteCard(
                        key: ValueKey<String>(invite.id),
                        invite: invite,
                      ),
                    ),
                  ),
              const SizedBox(height: 24),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text(
                  l10n.liveBroadcastSetup,
                  style: SyloraTokens.title(18),
                ),
                subtitle: Text(
                  l10n.liveIntegrationsBody,
                  style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
                ),
                children: <Widget>[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      SyloraPortalChip(
                        label: l10n.liveNativeReady,
                        icon: Icons.check_circle_outline_rounded,
                        onTap: () {},
                      ),
                      SyloraPortalChip(
                        label: l10n.liveTikTokBlocked,
                        icon: Icons.lock_outline_rounded,
                        onTap: () {},
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const _TikTokLiveControlPanel(),
                  const SizedBox(height: 12),

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
                ],
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
    // Stand shortcut: unlock creator if the API rejects live:manage.
    Future<bool> ensureCreator() async {
      try {
        await ref
            .read(apiClientProvider)
            .request('test-stand/assume-role/creator', method: 'POST');
        await ref.read(authControllerProvider.notifier).refreshMe();
        return true;
      } on Object {
        return false;
      }
    }

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
                final message = messageFor(error);
                final denied =
                    message.toLowerCase().contains('permission') ||
                    message.toLowerCase().contains('forbidden');
                if (denied) {
                  final unlocked = await ensureCreator();
                  if (unlocked) {
                    try {
                      final value = await ref
                          .read(liveRepositoryProvider)
                          .createSession(title.text.trim());
                      if (dialogContext.mounted) {
                        Navigator.pop(dialogContext, value);
                      }
                      return;
                    } on Object catch (retryError) {
                      if (dialogContext.mounted) {
                        ScaffoldMessenger.of(dialogContext).showSnackBar(
                          SnackBar(content: Text(messageFor(retryError))),
                        );
                      }
                      return;
                    }
                  }
                }
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(message)));
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

final class _LiveGuestInviteCard extends ConsumerStatefulWidget {
  const _LiveGuestInviteCard({required this.invite, super.key});

  final LiveGuestInviteModel invite;

  @override
  ConsumerState<_LiveGuestInviteCard> createState() =>
      _LiveGuestInviteCardState();
}

final class _LiveGuestInviteCardState
    extends ConsumerState<_LiveGuestInviteCard> {
  late final CreatorMediaController _publisher;
  late String _inviteStatus;
  late String _mediaStatus;
  String? _playbackUrl;
  JsonObject? _credentials;
  String? _message;
  bool _busy = false;
  bool _previewReady = false;
  bool _publishing = false;

  @override
  void initState() {
    super.initState();
    _publisher = CreatorMediaController();
    _inviteStatus = widget.invite.status;
    _mediaStatus = widget.invite.mediaStatus;
    _playbackUrl = widget.invite.playbackUrl;
  }

  @override
  void dispose() {
    _publisher.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accepted = _inviteStatus == 'accepted';
    final ended = widget.invite.sessionState == 'ended';
    final credentialsReady =
        _credentials?['status'] == 'available' &&
        _credentials?['whip_url'] is String &&
        _credentials?['bearer_token'] is String;
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: LumenColors.aether.withValues(alpha: 0.12),
                ),
                child: const Icon(
                  Icons.groups_2_outlined,
                  color: LumenColors.aether,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      widget.invite.sessionTitle ?? 'Live guest invitation',
                      style: SyloraTokens.title(18),
                    ),
                    Text(
                      '${widget.invite.role == 'cohost' ? 'Cohost' : 'Guest'} · '
                      '${widget.invite.sessionState ?? 'session state unknown'}',
                      style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
                    ),
                  ],
                ),
              ),
              LumenBadge(
                label: _inviteStatus,
                color: _inviteStatus == 'accepted'
                    ? LumenColors.verdigris
                    : _inviteStatus == 'declined'
                    ? LumenColors.rose
                    : LumenColors.pulse,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: LumenColors.solar.withValues(alpha: 0.24),
              borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
              border: Border.all(
                color: LumenColors.bloom.withValues(alpha: 0.2),
              ),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(Icons.info_outline_rounded, size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Guest WHIP publishes a separate contribution feed. It is not automatically composited with the host program; until multi-host SFU mixing is available, the host needs an external mixer or production workflow.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (_inviteStatus == 'pending')
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                LumenPrimaryButton(
                  label: 'Accept invitation',
                  icon: Icons.check_circle_outline_rounded,
                  busy: _busy,
                  onPressed: ended || _busy ? null : _accept,
                  disabledReason: ended
                      ? 'This live session has already ended.'
                      : 'Invitation response is in progress.',
                ),
                LumenSecondaryButton(
                  label: 'Decline',
                  icon: Icons.close_rounded,
                  onPressed: _busy ? null : _decline,
                ),
              ],
            ),
          if (accepted) ...<Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    credentialsReady
                        ? 'Contribution ready · $_mediaStatus'
                        : 'Contribution status: $_mediaStatus',
                    style: SyloraTokens.title(15),
                  ),
                ),
                LumenBadge(
                  label: credentialsReady ? 'WHIP ready' : 'not ready',
                  color: credentialsReady
                      ? LumenColors.verdigris
                      : LumenColors.porcelainMuted,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              credentialsReady
                  ? 'Short-lived credentials are loaded for your isolated guest ingest path.'
                  : 'No usable guest credentials are loaded. Retry only issues them when the media provider is configured.',
              style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
            ),
            if (_playbackUrl case final playbackUrl?) ...<Widget>[
              const SizedBox(height: 10),
              Text(
                'Playback is for this separate contribution feed only; it is not the composited host program.',
                style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  LumenSecondaryButton(
                    label: 'Open contribution playback',
                    icon: Icons.open_in_new_rounded,
                    onPressed: () => _openPlayback(playbackUrl),
                  ),
                  LumenSecondaryButton(
                    label: 'Copy playback URL',
                    icon: Icons.copy_rounded,
                    onPressed: () => _copyPlayback(playbackUrl),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            if (_publisher.supported) ...<Widget>[
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _previewReady
                    ? _publisher.preview()
                    : Container(
                        key: const ValueKey<String>('guest-preview-idle'),
                        height: 180,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: Theme.of(
                            context,
                          ).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(
                            SyloraTokens.radiusLg,
                          ),
                        ),
                        child: const Text(
                          'Camera and microphone preview is off.',
                        ),
                      ),
              ),
              const SizedBox(height: 12),
            ],
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                LumenSecondaryButton(
                  label: _busy
                      ? 'Checking…'
                      : credentialsReady
                      ? 'Refresh credentials'
                      : 'Check media access',
                  icon: Icons.refresh_rounded,
                  onPressed: ended || _busy ? null : _loadCredentials,
                  disabledReason: ended
                      ? 'This live session has ended.'
                      : 'Credential check is already running.',
                ),
                LumenSecondaryButton(
                  label: _previewReady ? 'Preview ready' : 'Start preview',
                  icon: Icons.videocam_outlined,
                  onPressed: _publisher.supported && !_previewReady && !_busy
                      ? _startPreview
                      : null,
                  disabledReason: !_publisher.supported
                      ? 'Camera publishing is unavailable on this platform.'
                      : 'Preview is already active.',
                ),
                LumenPrimaryButton(
                  label: _publishing
                      ? 'Publishing guest feed'
                      : 'Publish guest feed',
                  icon: Icons.podcasts_rounded,
                  busy: _busy,
                  onPressed:
                      credentialsReady &&
                          _previewReady &&
                          !_publishing &&
                          !_busy &&
                          !ended
                      ? _publish
                      : null,
                  disabledReason: !credentialsReady
                      ? 'Usable guest WHIP credentials are required.'
                      : !_previewReady
                      ? 'Start camera and microphone preview first.'
                      : ended
                      ? 'This live session has ended.'
                      : 'Guest publishing is already active.',
                ),
              ],
            ),
            if (widget.invite.hostUserId != null) ...<Widget>[
              const SizedBox(height: 16),
              _LiveGiftTray(
                sessionId: widget.invite.sessionId,
                hostUserId: widget.invite.hostUserId,
              ),
            ],
          ],
          if (_message != null) ...<Widget>[
            const SizedBox(height: 12),
            _StatusPanel(
              message: _message!,
              error: _message!.startsWith('Could not'),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _accept() async {
    setState(() => _busy = true);
    try {
      final result = await ref
          .read(liveRepositoryProvider)
          .acceptGuestInvite(widget.invite.sessionId, widget.invite.id);
      _applyGuestResult(result);
      if (mounted) {
        setState(() {
          _inviteStatus = 'accepted';
          _message = _credentials == null
              ? 'Invitation accepted. The media provider is not ready, so publishing remains disabled.'
              : 'Invitation accepted. Start preview when you are ready to contribute.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Could not accept invite: ${messageFor(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _decline() async {
    setState(() => _busy = true);
    try {
      final invite = await ref
          .read(liveRepositoryProvider)
          .declineGuestInvite(widget.invite.sessionId, widget.invite.id);
      if (mounted) {
        setState(() {
          _inviteStatus = invite.status;
          _mediaStatus = invite.mediaStatus;
          _message = 'Invitation declined.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Could not decline invite: ${messageFor(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _loadCredentials() async {
    setState(() => _busy = true);
    try {
      final result = await ref
          .read(liveRepositoryProvider)
          .guestPublishCredentials(widget.invite.id);
      _applyGuestResult(result);
      if (mounted) {
        setState(() {
          _message = _credentials == null
              ? 'The guest media plane is still unavailable. No credentials were issued.'
              : 'Fresh guest WHIP credentials loaded.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(
          () => _message =
              'Could not load guest credentials: ${messageFor(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _applyGuestResult(JsonObject result) {
    final credentials = result['publish_credentials'];
    final typedCredentials = credentials == null
        ? null
        : requireObject(credentials, 'guest publish credentials');
    if (mounted) {
      setState(() {
        _inviteStatus = '${result['status'] ?? _inviteStatus}';
        _mediaStatus = '${result['media_status'] ?? _mediaStatus}';
        _credentials = typedCredentials;
        _playbackUrl =
            optionalString(result, 'playback_url') ??
            (typedCredentials == null
                ? _playbackUrl
                : optionalString(typedCredentials, 'playback_url'));
      });
    }
  }

  Future<void> _openPlayback(String playbackUrl) async {
    try {
      final opened = await launchUrl(
        Uri.parse(playbackUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!opened) {
        throw StateError('No application could open the playback URL.');
      }
    } on Object catch (error) {
      if (mounted) {
        setState(
          () => _message =
              'Could not open contribution playback: ${messageFor(error)}',
        );
      }
    }
  }

  Future<void> _copyPlayback(String playbackUrl) async {
    await Clipboard.setData(ClipboardData(text: playbackUrl));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contribution playback URL copied.')),
      );
    }
  }

  Future<void> _startPreview() async {
    setState(() => _busy = true);
    try {
      await _publisher.startPreview();
      if (mounted) {
        setState(() {
          _previewReady = true;
          _message = 'Camera and microphone preview ready.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Could not start preview: ${messageFor(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _publish() async {
    final credentials = _credentials;
    if (credentials == null) return;
    setState(() => _busy = true);
    try {
      final message = await _publisher.publishWhip(credentials);
      if (mounted) {
        setState(() {
          _publishing = true;
          _message =
              '$message This is your guest contribution feed, not a composited multi-host program.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Could not publish guest feed: ${messageFor(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(liveSessionProvider(widget.sessionId));
    final integrations = ref.watch(liveIntegrationsProvider);
    final controls = ref.watch(liveControlsProvider(widget.sessionId));
    final giftRankings = ref.watch(liveGiftRankingsProvider(widget.sessionId));
    return LumenPage(
      title: l10n.liveTitle,
      subtitle: l10n.liveYourStageBody,
      intensity: 1.0,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.live,
      auraEmotion: AuraEmotion.listening,
      child: value.when(
        loading: () => SyloraStates.loading(message: l10n.commonLoading),
        error: (error, stackTrace) => LumenErrorView(
          error: error,
          onRetry: () => ref.invalidate(liveSessionProvider(widget.sessionId)),
        ),
        data: (session) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            SyloraUniverseHero(
              eyebrow: l10n.liveHeroEyebrow,
              title: session.title,
              body: session.state == 'live'
                  ? l10n.liveYourStageBody
                  : l10n.liveNoSessionsBody,
              trailing: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  SyloraMetricPill(
                    label: l10n.liveTitle,
                    value: session.state,
                    icon: Icons.sensors_rounded,
                  ),
                  SyloraPortalChip(
                    label: l10n.liveOpenStudio,
                    icon: Icons.video_camera_front_outlined,
                    onTap: () => context.goNamed('creator-studio'),
                  ),
                  if ({'draft', 'preflight'}.contains(session.state))
                    SyloraPortalChip(
                      label: l10n.liveGoLive,
                      icon: Icons.play_arrow_rounded,
                      onTap: () async {
                        try {
                          final repo = ref.read(liveRepositoryProvider);
                          if (session.state == 'draft') {
                            setState(
                              () => _status =
                                  'Running preflight before start…',
                            );
                            final result = await repo.preflight(session.id);
                            final ready = result['ready'] == true;
                            if (!ready) {
                              setState(
                                () => _status =
                                    'Preflight reported checks that need attention.',
                              );
                              ref.invalidate(
                                liveSessionProvider(widget.sessionId),
                              );
                              return;
                            }
                          }
                          await repo.start(session.id);
                          setState(() => _status = 'Live session started.');
                          ref.invalidate(
                            liveSessionProvider(widget.sessionId),
                          );
                        } on Object catch (error) {
                          setState(() => _status = messageFor(error));
                        }
                      },
                    ),
                  if (session.state == 'live')
                    SyloraPortalChip(
                      label: 'End',
                      icon: Icons.stop_rounded,
                      onTap: () async {
                        await ref
                            .read(liveRepositoryProvider)
                            .end(session.id);
                        ref.invalidate(
                          liveSessionProvider(widget.sessionId),
                        );
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SyloraGlass(
              radius: SyloraTokens.radiusXl,
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Stage ingest',
                    style: SyloraTokens.title(18),
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    session.ingestPath,
                    style: SyloraTokens.body(13, color: SyloraTokens.inkSoft)
                        .copyWith(fontFamily: 'monospace'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Use OBS with this path, or open Creator Studio for browser WHIP when MediaMTX is ready.',
                    style: SyloraTokens.body(13, color: SyloraTokens.inkMute),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      SyloraPortalChip(
                        label: 'Preflight',
                        icon: Icons.fact_check_outlined,
                        onTap: () async {
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
                      if (session.shareWatchUrl != null)
                        SyloraPortalChip(
                          label: 'Share watch link',
                          icon: Icons.ios_share_rounded,
                          onTap: () async {
                            final url = session.shareWatchUrl!;
                            await Clipboard.setData(ClipboardData(text: url));
                            setState(
                              () => _status =
                                  'Watch link copied. Friends open it in a browser.',
                            );
                          },
                        ),
                      SyloraPortalChip(
                        label: 'Rotate stream key',
                        icon: Icons.key_rounded,
                        onTap: () async {
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
                    Text(
                      _status!,
                      style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
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
