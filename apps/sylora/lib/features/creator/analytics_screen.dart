import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../creator/creator_repository.dart';

@immutable
final class _AnalyticsSnapshot {
  const _AnalyticsSnapshot({
    this.analytics,
    this.hasCreatorAccount = false,
  });

  final CreatorAnalytics? analytics;
  final bool hasCreatorAccount;
}

final _analyticsProvider = FutureProvider.autoDispose<_AnalyticsSnapshot>((
  ref,
) async {
  final repository = ref.watch(creatorRepositoryProvider);
  try {
    final analytics = await repository.analytics();
    return _AnalyticsSnapshot(analytics: analytics, hasCreatorAccount: true);
  } on ApiProblem catch (error) {
    if (error.code == 'creator_account_required' ||
        error.code == 'creator_not_found' ||
        error.code == 'forbidden' ||
        error.status == 403 ||
        error.status == 404) {
      return const _AnalyticsSnapshot();
    }
    rethrow;
  }
});

/// First-class Analytics surface for the ecosystem rail.
final class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final value = ref.watch(_analyticsProvider);
    final isAdmin = roles.contains('admin') || roles.contains('owner');

    return LumenPage(
      title: l10n.navAnalytics,
      subtitle: l10n.analyticsSubtitle,
      intensity: 0.9,
      showAuraPresence: false,
      auraPresencePreset: SyloraAuraContextPreset.creator,
      actions: <Widget>[
        if (isAdmin)
          TextButton.icon(
            onPressed: () => context.goNamed('admin'),
            icon: const Icon(Icons.admin_panel_settings_outlined),
            label: Text(l10n.navAdmin),
          ),
        TextButton.icon(
          onPressed: () => context.goNamed('earnings'),
          icon: const Icon(Icons.payments_outlined),
          label: Text(l10n.earningsTitle),
        ),
      ],
      child: LumenAsyncView<_AnalyticsSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(_analyticsProvider),
        data: (snapshot) {
          final analytics = snapshot.analytics;
          if (analytics == null) {
            return SyloraGlassTile(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(l10n.analyticsEmptyTitle, style: SyloraTokens.title(22)),
                  const SizedBox(height: 8),
                  Text(
                    l10n.analyticsEmptyBody,
                    style: SyloraTokens.body(15),
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: <Widget>[
                      SyloraButton(
                        label: l10n.navCreator,
                        onPressed: () => context.goNamed('creator'),
                      ),
                      SyloraButton(
                        label: l10n.navStudio,
                        variant: SyloraButtonVariant.secondary,
                        onPressed: () => context.goNamed('creator-studio'),
                      ),
                      SyloraButton(
                        label: l10n.walletTitle,
                        variant: SyloraButtonVariant.secondary,
                        onPressed: () => context.goNamed('wallet'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }

          final currency = NumberFormat.compact();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              SyloraUniverseHero(
                eyebrow: l10n.navAnalytics,
                title: l10n.analyticsHeroTitle,
                body: l10n.analyticsHeroBody,
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: <Widget>[
                  _MetricCard(
                    label: l10n.analyticsContent,
                    value: currency.format(analytics.contentCount),
                  ),
                  _MetricCard(
                    label: l10n.analyticsPublished,
                    value: currency.format(analytics.publishedContentCount),
                  ),
                  _MetricCard(
                    label: l10n.analyticsFollowers,
                    value: currency.format(analytics.followerCount),
                  ),
                  _MetricCard(
                    label: l10n.analyticsSubscriptions,
                    value: currency.format(analytics.activeSubscriptionCount),
                  ),
                  _MetricCard(
                    label: l10n.navGifts,
                    value: currency.format(analytics.giftCount),
                  ),
                  _MetricCard(
                    label: l10n.earningsTitle,
                    value: currency.format(analytics.totalCreatorEarningsMinor),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SyloraGlassTile(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      l10n.analyticsNextActions,
                      style: SyloraTokens.title(18),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: <Widget>[
                        SyloraButton(
                          label: l10n.navStudio,
                          onPressed: () => context.goNamed('creator-studio'),
                        ),
                        SyloraButton(
                          label: l10n.navLive,
                          variant: SyloraButtonVariant.secondary,
                          onPressed: () => context.goNamed('live'),
                        ),
                        SyloraButton(
                          label: l10n.moreGiftShop,
                          variant: SyloraButtonVariant.secondary,
                          onPressed: () => context.goNamed('gifts'),
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
  }
}

final class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 168,
      child: SyloraGlassTile(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(label, style: SyloraTokens.label(12)),
            const SizedBox(height: 8),
            Text(value, style: SyloraTokens.title(24)),
          ],
        ),
      ),
    );
  }
}
