import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
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
    final value = ref.watch(earningsProvider);
    final money = NumberFormat.compactCurrency(symbol: '');
    return LumenPage(
      title: 'Creator Earnings',
      subtitle: 'Live gifts, tips, and payouts — one ecosystem ledger.',
      intensity: 0.9,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.live,
      header: SyloraUniverseHero(
        eyebrow: 'EARNINGS',
        title: 'Your creator balance',
        body:
            'Tips and gifts count only from Live Streams, Guest Streams, Multi-host Conferences, and Voice Rooms. Gift Shop is for buying inventory — not sending.',
        trailing: Wrap(
          spacing: 8,
          children: <Widget>[
            SyloraPortalChip(
              label: 'Wallet',
              icon: Icons.account_balance_wallet_outlined,
              onTap: () => context.goNamed('wallet'),
            ),
            SyloraPortalChip(
              label: 'Payout',
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
                    Text('Total available', style: SyloraTokens.label(11)),
                    const SizedBox(height: 8),
                    Text(
                      '${money.format(major)} ${snapshot.earnings.assetCode}',
                      style: SyloraTokens.display(36),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${snapshot.earnings.spendableMinor} minor units',
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
                  title: const Text('Accept live gifts'),
                  subtitle: const Text(
                    'When off, viewers cannot send gifts during your live sessions.',
                  ),
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
              Text('Recent ledger', style: SyloraTokens.title(16)),
              const SizedBox(height: 8),
              if (snapshot.transactions.items.isEmpty)
                LumenEmptyView(
                  title: 'No earnings yet',
                  message:
                      'Go live and let viewers send gifts from the live tray.',
                  actionLabel: 'Open Live',
                  onAction: () => context.goNamed('live'),
                  icon: Icons.insights_outlined,
                )
              else
                ...snapshot.transactions.items.take(20).map(
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
                          const Icon(Icons.bolt_rounded, color: SyloraTokens.ion),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(tx.type, style: SyloraTokens.title(14)),
                                Text(
                                  '${tx.status} · ${DateFormat.yMMMd().add_jm().format(tx.createdAt.toLocal())}',
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
