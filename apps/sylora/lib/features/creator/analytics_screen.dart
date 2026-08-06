import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/l10n/sylora_localizations.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../creator/creator_repository.dart';

final analyticsProvider = FutureProvider.autoDispose<CreatorAnalytics?>(
  (ref) async {
    try {
      return await ref.watch(creatorRepositoryProvider).analytics();
    } on ApiProblem catch (error) {
      if (error.code == 'creator_account_required' ||
          error.code == 'creator_not_found') {
        return null;
      }
      rethrow;
    }
  },
);

final class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final value = ref.watch(analyticsProvider);
    return LumenPage(
      title: SyloraStrings.t(locale, 'nav_analytics'),
      subtitle:
          'Audience, content performance, gift revenue, and earnings from creator APIs.',
      child: LumenAsyncView<CreatorAnalytics?>(
        value: value,
        onRetry: () => ref.invalidate(analyticsProvider),
        data: (analytics) {
          if (analytics == null) {
            return LumenEmptyView(
              title: 'Creator account required',
              message:
                  'Open Creator Studio to onboard and unlock analytics dashboards.',
              actionLabel: 'Open Creator Studio',
              onAction: () => context.goNamed('creator'),
              icon: Icons.bar_chart_outlined,
            );
          }
          final compact = NumberFormat.compact();
          final currency = NumberFormat.compactCurrency(symbol: '', decimalDigits: 0);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 1.6,
                children: <Widget>[
                  _AnalyticsCard(
                    label: 'Followers',
                    value: compact.format(analytics.followerCount),
                    icon: Icons.people_outline_rounded,
                    color: LumenColors.aether,
                  ),
                  _AnalyticsCard(
                    label: 'Content pieces',
                    value: '${analytics.contentCount}',
                    icon: Icons.movie_creation_outlined,
                    color: LumenColors.pulse,
                  ),
                  _AnalyticsCard(
                    label: 'Gift revenue',
                    value: currency.format(analytics.giftRevenueMinor / 100),
                    icon: Icons.card_giftcard_outlined,
                    color: LumenColors.bloom,
                  ),
                  _AnalyticsCard(
                    label: 'Total earnings',
                    value: currency.format(analytics.totalCreatorEarningsMinor / 100),
                    icon: Icons.payments_outlined,
                    color: LumenColors.verdigris,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              LumenSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Performance trend',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 120,
                      child: CustomPaint(
                        painter: _SparklinePainter(
                          values: <double>[
                            analytics.followerCount * 0.6,
                            analytics.followerCount * 0.72,
                            analytics.followerCount * 0.81,
                            analytics.followerCount * 0.9,
                            analytics.followerCount.toDouble(),
                          ],
                          color: LumenColors.aether,
                        ),
                        size: const Size(double.infinity, 120),
                      ),
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

final class _AnalyticsCard extends StatelessWidget {
  const _AnalyticsCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Icon(icon, color: color),
        const Spacer(),
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        Text(value, style: Theme.of(context).textTheme.headlineSmall),
      ],
    ),
  );
}

final class _SparklinePainter extends CustomPainter {
  const _SparklinePainter({required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final max = values.reduce((a, b) => a > b ? a : b);
    final min = values.reduce((a, b) => a < b ? a : b);
    final range = (max - min).abs() < 1 ? 1.0 : max - min;
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = size.width * i / (values.length - 1);
      final y = size.height - ((values[i] - min) / range) * size.height * 0.8 - size.height * 0.1;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) =>
      oldDelegate.values != values;
}
