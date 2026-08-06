import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/l10n/sylora_localizations.dart';
import '../../core/lumen_effects.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import '../creator/creator_repository.dart';
import '../platform/repositories.dart';

final ownedProfileProvider = FutureProvider.autoDispose<ProfileModel>(
  (ref) => ref.watch(accountRepositoryProvider).profile(),
);

final class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final user = ref.watch(authControllerProvider).user;
    final profile = ref.watch(ownedProfileProvider);
    final creatorAnalytics = ref.watch(_profileAnalyticsProvider);

    return LumenPage(
      title: SyloraStrings.t(locale, 'nav_profile'),
      subtitle: 'Your level, achievements, portfolio, and monetization hub.',
      actions: <Widget>[
        IconButton(
          icon: const Icon(Icons.settings_outlined),
          onPressed: () => context.goNamed('settings'),
        ),
      ],
      child: LumenAsyncView<ProfileModel>(
        value: profile,
        onRetry: () => ref.invalidate(ownedProfileProvider),
        data: (owned) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Row(
                children: <Widget>[
                  CircleAvatar(
                    radius: 36,
                    backgroundColor:
                        Theme.of(context).colorScheme.primaryContainer,
                    child: Text(
                      owned.displayName.isNotEmpty
                          ? owned.displayName[0].toUpperCase()
                          : '?',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          owned.displayName,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        Text('@${owned.handle ?? 'me'}'),
                        if (owned.bio != null && owned.bio!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(owned.bio!),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: <Widget>[
                _StatChip(
                  label: 'Level',
                  value: _levelForUser(user?.id ?? owned.userId),
                ),
                _StatChip(label: 'XP', value: _xpForUser(user?.id ?? owned.userId)),
                _StatChip(
                  label: 'Roles',
                  value: (user?.roles ?? const <String>['user']).join(', '),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Quick actions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                _ActionChip(
                  icon: Icons.edit_outlined,
                  label: 'Edit profile',
                  onTap: () => context.goNamed('settings'),
                ),
                _ActionChip(
                  icon: Icons.account_balance_wallet_outlined,
                  label: SyloraStrings.t(locale, 'nav_wallet'),
                  onTap: () => context.goNamed('wallet'),
                ),
                _ActionChip(
                  icon: Icons.card_giftcard_outlined,
                  label: SyloraStrings.t(locale, 'nav_gifts'),
                  onTap: () => context.goNamed('gifts'),
                ),
                _ActionChip(
                  icon: Icons.bar_chart_rounded,
                  label: SyloraStrings.t(locale, 'nav_analytics'),
                  onTap: () => context.goNamed('analytics'),
                ),
                _ActionChip(
                  icon: Icons.edit_note_rounded,
                  label: SyloraStrings.t(locale, 'nav_creator'),
                  onTap: () => context.goNamed('creator'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            creatorAnalytics.when(
              data: (analytics) {
                if (analytics == null) {
                  return LumenSurface(
                    child: Text(
                      'Enable Creator Studio to unlock portfolio analytics and monetization.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  );
                }
                final currency = NumberFormat.compactCurrency(
                  symbol: '',
                  decimalDigits: 0,
                );
                return LumenSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Creator stats',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 16,
                        runSpacing: 12,
                        children: <Widget>[
                          _Metric(
                            label: 'Followers',
                            value: currency.format(analytics.followerCount),
                          ),
                          _Metric(
                            label: 'Content',
                            value: '${analytics.contentCount}',
                          ),
                          _Metric(
                            label: 'Gift revenue',
                            value: currency.format(analytics.giftRevenueMinor / 100),
                          ),
                          _Metric(
                            label: 'Earnings',
                            value: currency.format(
                              analytics.totalCreatorEarningsMinor / 100,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  static String _levelForUser(String id) {
    final hash = id.codeUnits.fold<int>(0, (a, b) => a + b);
    return '${(hash % 40) + 1}';
  }

  static String _xpForUser(String id) {
    final hash = id.codeUnits.fold<int>(0, (a, b) => a + b * 3);
    return '${(hash % 9000) + 1200}';
  }
}

final _profileAnalyticsProvider =
    FutureProvider.autoDispose<CreatorAnalytics?>((ref) async {
  try {
    return await ref.watch(creatorRepositoryProvider).analytics();
  } on ApiProblem catch (error) {
    if (error.code == 'creator_account_required' ||
        error.code == 'creator_not_found') {
      return null;
    }
    rethrow;
  }
});

final class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => LumenSurface(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        Text(value, style: Theme.of(context).textTheme.titleLarge),
      ],
    ),
  );
}

final class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => LumenRipple(
    onTap: onTap,
    child: LumenSurface(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
    ),
  );
}

final class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 140,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: LumenColors.aether,
          ),
        ),
      ],
    ),
  );
}
