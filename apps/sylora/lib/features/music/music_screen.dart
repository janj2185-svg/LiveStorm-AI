import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/sylora_localizations.dart';
import '../../core/models.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../platform/repositories.dart';

final aiProviderStatusProvider = FutureProvider.autoDispose<AiProviderStatus>(
  (ref) => ref.watch(aiRepositoryProvider).providerStatus(),
);

final musicJobsProvider = FutureProvider.autoDispose<List<NamedResource>>(
  (ref) async {
    final page = await ref.watch(aiRepositoryProvider).jobs();
    return page.items
        .where((job) => (job.raw['kind'] as String?) == 'music')
        .toList(growable: false);
  },
);

final class MusicScreen extends ConsumerWidget {
  const MusicScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final status = ref.watch(aiProviderStatusProvider);
    final jobs = ref.watch(musicJobsProvider);

    return LumenPage(
      title: SyloraStrings.t(locale, 'nav_music'),
      subtitle:
          'Discover tracks, live music beds, and Aura-generated compositions.',
      actions: <Widget>[
        FilledButton.icon(
          onPressed: () => context.goNamed('ai-jobs'),
          icon: const Icon(Icons.auto_awesome_outlined, size: 18),
          label: const Text('Generate with Aura'),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          LumenSurface(
            child: status.when(
              data: (providerStatus) {
                final enabled = providerStatus.capabilities['music'] == true;
                return Row(
                  children: <Widget>[
                    Icon(
                      enabled
                          ? Icons.music_note_rounded
                          : Icons.music_off_outlined,
                      color: enabled ? LumenColors.aether : null,
                      size: 32,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        enabled
                            ? 'Aura music generation is available on your account.'
                            : 'Music generation requires provider configuration. Open AI jobs when enabled.',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  ],
                );
              },
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text('$error'),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Your compositions',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          LumenAsyncView<List<NamedResource>>(
            value: jobs,
            onRetry: () => ref.invalidate(musicJobsProvider),
            data: (items) {
              if (items.isEmpty) {
                return LumenEmptyView(
                  title: 'No tracks yet',
                  message:
                      'Generate music with Aura or import from Creator Studio.',
                  actionLabel: 'Open Aura',
                  onAction: () => context.goNamed('ai'),
                  icon: Icons.library_music_outlined,
                );
              }
              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final job = items[index];
                  return LumenSurface(
                    padding: const EdgeInsets.all(16),
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.audiotrack_rounded),
                      title: Text(job.label),
                      subtitle: Text(job.status ?? 'unknown'),
                      trailing: const Icon(Icons.play_circle_outline_rounded),
                      onTap: () => context.goNamed('ai-jobs'),
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 24),
          Text(
            'Discover',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 2.2,
            children: const <Widget>[
              _GenreCard(label: 'Ambient', icon: Icons.waves_rounded),
              _GenreCard(label: 'Live beds', icon: Icons.sensors_rounded),
              _GenreCard(label: 'Creator scores', icon: Icons.edit_note_rounded),
              _GenreCard(label: 'Community mixes', icon: Icons.groups_rounded),
            ],
          ),
        ],
      ),
    );
  }
}

final class _GenreCard extends StatelessWidget {
  const _GenreCard({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Row(
      children: <Widget>[
        Icon(icon, color: LumenColors.pulse),
        const SizedBox(width: 10),
        Expanded(child: Text(label)),
      ],
    ),
  );
}
