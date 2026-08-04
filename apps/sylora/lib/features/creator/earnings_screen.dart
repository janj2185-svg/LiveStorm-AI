import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../platform/repositories.dart';

@immutable
final class _EarningsSnapshot {
  const _EarningsSnapshot({
    required this.earnings,
    required this.transactions,
    required this.giftsEnabled,
  });

  final WalletBalance earnings;
  final CursorPage<LedgerTransactionModel> transactions;
  final bool giftsEnabled;
}

final earningsProvider = FutureProvider.autoDispose<_EarningsSnapshot>((
  ref,
) async {
  final wallet = ref.watch(walletRepositoryProvider);
  final gifts = ref.watch(giftRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    wallet.creatorEarnings(),
    wallet.transactions(),
    gifts.creatorMonetization(),
  ]);
  final monetization = values[2] as JsonObject;
  return _EarningsSnapshot(
    earnings: values[0] as WalletBalance,
    transactions: values[1] as CursorPage<LedgerTransactionModel>,
    giftsEnabled: monetization['gifts_enabled'] == true,
  );
});

/// Creator Earnings — Total, live tips/gifts note, payouts entry, monetization.
final class CreatorEarningsScreen extends ConsumerWidget {
  const CreatorEarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(earningsProvider);
    final money = NumberFormat.compactCurrency(
      symbol: '',
      locale: l10n.localeName,
    );
    return LumenPage(
      title: l10n.earningsTitle,
      subtitle: l10n.earningsSubtitle,
      intensity: 0.9,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.live,
      header: SyloraUniverseHero(
        eyebrow: l10n.earningsHeroEyebrow,
        title: l10n.earningsHeroTitle,
        body: l10n.earningsHeroBody,
        trailing: Wrap(
          spacing: 8,
          children: <Widget>[
            SyloraPortalChip(
              label: l10n.walletShortLabel,
              icon: Icons.account_balance_wallet_outlined,
              onTap: () => context.goNamed('wallet'),
            ),
            SyloraPortalChip(
              label: l10n.walletPayout,
              icon: Icons.payments_outlined,
              onTap: () => context.goNamed('wallet'),
            ),
          ],
        ),
      ),
      child: LumenAsyncView<_EarningsSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(earningsProvider),
        data: (snapshot) {
          final major = snapshot.earnings.spendableMinor / 100.0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              SyloraGlass(
                radius: SyloraTokens.radiusXl,
                padding: const EdgeInsets.all(22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      l10n.earningsTotalAvailable,
                      style: SyloraTokens.label(11),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${money.format(major)} ${snapshot.earnings.assetCode}',
                      style: SyloraTokens.display(36),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      l10n.earningsMinorUnits(snapshot.earnings.spendableMinor),
                      style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SyloraGlass(
                radius: SyloraTokens.radiusLg,
                padding: const EdgeInsets.all(16),
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l10n.earningsAcceptLiveGifts),
                  subtitle: Text(l10n.earningsAcceptLiveGiftsDescription),
                  value: snapshot.giftsEnabled,
                  onChanged: (enabled) async {
                    try {
                      await ref
                          .read(giftRepositoryProvider)
                          .setCreatorMonetization(enabled);
                      ref.invalidate(earningsProvider);
                    } on Object catch (error) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(messageFor(error))),
                        );
                      }
                    }
                  },
                ),
              ),
              const SizedBox(height: 18),
              Text(l10n.earningsRecentLedger, style: SyloraTokens.title(16)),
              const SizedBox(height: 8),
              if (snapshot.transactions.items.isEmpty)
                LumenEmptyView(
                  title: l10n.earningsEmptyTitle,
                  message: l10n.earningsEmptyMessage,
                  actionLabel: l10n.earningsOpenLive,
                  onAction: () => context.goNamed('live'),
                  icon: Icons.insights_outlined,
                )
              else
                ...snapshot.transactions.items
                    .take(20)
                    .map(
                      (tx) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SyloraGlass(
                          radius: SyloraTokens.radiusMd,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          child: Row(
                            children: <Widget>[
                              const Icon(
                                Icons.bolt_rounded,
                                color: SyloraTokens.ion,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text(
                                      tx.type,
                                      style: SyloraTokens.title(14),
                                    ),
                                    Text(
                                      '${tx.status} · ${DateFormat.yMMMd(l10n.localeName).add_jm().format(tx.createdAt.toLocal())}',
                                      style: SyloraTokens.body(
                                        12,
                                        color: SyloraTokens.inkSoft,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                tx.id.substring(0, 8),
                                style: SyloraTokens.label(10),
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
}
