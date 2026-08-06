import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../platform/repositories.dart';

@immutable
final class _UserAnalyticsSnapshot {
  const _UserAnalyticsSnapshot({required this.stats, required this.progress});

  final ActivityStatsModel stats;
  final ProgressModel progress;
}

final _userAnalyticsProvider =
    FutureProvider.autoDispose<_UserAnalyticsSnapshot>((ref) async {
      final repository = ref.watch(accountRepositoryProvider);
      final values = await Future.wait<Object>(<Future<Object>>[
        repository.activityStats(),
        repository.progress(),
      ]);
      return _UserAnalyticsSnapshot(
        stats: values[0] as ActivityStatsModel,
        progress: values[1] as ProgressModel,
      );
    });

/// Ethereal glass analytics surface — XP, level, achievements, and activity
/// counts sourced from `/me/activity-stats` and `/me/progress`.
final class UserAnalyticsScreen extends ConsumerWidget {
  const UserAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(_userAnalyticsProvider);
    return LumenPage(
      title: l10n.analyticsTitle,
      subtitle: l10n.analyticsSubtitle,
      intensity: 0.9,
      showAuraPresence: true,
      auraPresenceMode: SyloraAuraPresenceMode.summon,
      auraPresencePreset: SyloraAuraContextPreset.settings,
      child: LumenAsyncView<_UserAnalyticsSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(_userAnalyticsProvider),
        data: (snapshot) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            _ProgressCard(progress: snapshot.progress, l10n: l10n),
            const SizedBox(height: SyloraTokens.space5),
            _AchievementsSection(
              achievements: snapshot.progress.achievements,
              l10n: l10n,
            ),
            const SizedBox(height: SyloraTokens.space5),
            _ActivitySection(stats: snapshot.stats, l10n: l10n),
          ],
        ),
      ),
    );
  }
}

final class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.progress, required this.l10n});

  final ProgressModel progress;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return SyloraGlass(
      radius: SyloraTokens.radiusXl,
      padding: const EdgeInsets.all(SyloraTokens.space5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 56,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: SyloraTokens.primaryCtaGradient,
                  boxShadow: SyloraTokens.glow(
                    SyloraTokens.gold,
                    blur: 18,
                    opacity: 0.3,
                  ),
                ),
                child: Text(
                  '${progress.level}',
                  style: SyloraTokens.title(22, color: SyloraTokens.ink),
                ),
              ),
              const SizedBox(width: SyloraTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      l10n.progressLevel(progress.level),
                      style: SyloraTokens.title(20),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.progressXp(progress.xp),
                      style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: SyloraTokens.space4),
          ClipRRect(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
            child: LinearProgressIndicator(
              value: progress.levelProgress,
              minHeight: 10,
              backgroundColor: SyloraTokens.glassSoft,
              valueColor: const AlwaysStoppedAnimation<Color>(
                SyloraTokens.goldDeep,
              ),
            ),
          ),
          if (progress.xpToNextLevel != null) ...<Widget>[
            const SizedBox(height: 8),
            Text(
              l10n.progressXpToNext(progress.xpToNextLevel!),
              style: SyloraTokens.body(12.5, color: SyloraTokens.inkMute),
            ),
          ],
        ],
      ),
    );
  }
}

final class _AchievementsSection extends StatelessWidget {
  const _AchievementsSection({required this.achievements, required this.l10n});

  final List<ProgressAchievementModel> achievements;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(l10n.analyticsAchievements, style: SyloraTokens.title(18)),
        const SizedBox(height: SyloraTokens.space3),
        if (achievements.isEmpty)
          Text(
            l10n.analyticsNoAchievements,
            style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
          )
        else
          Wrap(
            spacing: SyloraTokens.space2,
            runSpacing: SyloraTokens.space2,
            children: <Widget>[
              for (final achievement in achievements)
                _AchievementChip(achievement: achievement),
            ],
          ),
      ],
    );
  }
}

final class _AchievementChip extends StatelessWidget {
  const _AchievementChip({required this.achievement});

  final ProgressAchievementModel achievement;

  @override
  Widget build(BuildContext context) {
    final earned = achievement.earned;
    return Tooltip(
      message: achievement.description ?? achievement.label,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: earned
              ? SyloraTokens.gold.withValues(alpha: 0.16)
              : SyloraTokens.glassSoft,
          borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
          border: Border.all(
            color: earned
                ? SyloraTokens.goldDeep.withValues(alpha: 0.4)
                : Colors.white.withValues(alpha: 0.6),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              earned ? Icons.workspace_premium_rounded : Icons.lock_outline_rounded,
              size: 16,
              color: earned ? SyloraTokens.goldDeep : SyloraTokens.inkMute,
            ),
            const SizedBox(width: 6),
            Text(
              achievement.label,
              style: SyloraTokens.body(
                13,
                color: earned ? SyloraTokens.ink : SyloraTokens.inkMute,
                weight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _ActivitySection extends StatelessWidget {
  const _ActivitySection({required this.stats, required this.l10n});

  final ActivityStatsModel stats;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final entries = stats.counts.entries.toList(growable: false)
      ..sort((a, b) => b.value.compareTo(a.value));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(l10n.analyticsActivity, style: SyloraTokens.title(18)),
        const SizedBox(height: SyloraTokens.space3),
        if (stats.streakDays > 0) ...<Widget>[
          SyloraMetricPill(
            label: l10n.progressStreak(stats.streakDays),
            value: '${stats.streakDays}',
            icon: Icons.local_fire_department_rounded,
          ),
          const SizedBox(height: SyloraTokens.space3),
        ],
        if (entries.isEmpty)
          Text(
            l10n.analyticsUnavailable,
            style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
          )
        else
          Wrap(
            spacing: SyloraTokens.space2,
            runSpacing: SyloraTokens.space2,
            children: <Widget>[
              for (final entry in entries)
                SyloraMetricPill(
                  label: _humanizeKey(entry.key),
                  value: '${entry.value}',
                  icon: Icons.trending_up_rounded,
                ),
            ],
          ),
      ],
    );
  }

  static String _humanizeKey(String key) {
    final words = key.split(RegExp(r'[_\s]+')).where((w) => w.isNotEmpty);
    return words
        .map((w) => w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }
}
