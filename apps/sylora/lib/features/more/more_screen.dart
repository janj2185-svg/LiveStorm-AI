import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';

enum MoreEntryKind {
  learning,
  wallet,
  gifts,
  ai,
  live,
  creatorStudio,
  creator,
  workspace,
  admin,
  settings,
}

@immutable
final class MoreEntry {
  const MoreEntry({
    required this.kind,
    required this.routeName,
    required this.icon,
    this.roles = const <String>{},
  });

  final MoreEntryKind kind;
  final String routeName;
  final IconData icon;
  final Set<String> roles;
}

const _entries = <MoreEntry>[
  MoreEntry(
    kind: MoreEntryKind.learning,
    routeName: 'learning',
    icon: Icons.school_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.wallet,
    routeName: 'wallet',
    icon: Icons.account_balance_wallet_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.gifts,
    routeName: 'gifts',
    icon: Icons.card_giftcard_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.ai,
    routeName: 'ai',
    icon: Icons.auto_awesome_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.live,
    routeName: 'live',
    icon: Icons.sensors_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.creatorStudio,
    routeName: 'creator-studio',
    icon: Icons.video_camera_front_outlined,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.creator,
    routeName: 'creator',
    icon: Icons.edit_note_rounded,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.workspace,
    routeName: 'business',
    icon: Icons.business_outlined,
    roles: <String>{'business', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.admin,
    routeName: 'admin',
    icon: Icons.admin_panel_settings_outlined,
    roles: <String>{'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.settings,
    routeName: 'settings',
    icon: Icons.settings_outlined,
  ),
];

List<MoreEntry> moreEntriesForRoles(Iterable<String> roles) {
  final roleSet = roles.toSet();
  return _entries
      .where(
        (entry) => entry.roles.isEmpty || entry.roles.any(roleSet.contains),
      )
      .toList(growable: false);
}

final class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final entries = moreEntriesForRoles(roles);
    return LumenPage(
      title: l10n.moreTitle,
      subtitle: l10n.moreSubtitle,
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 280,
          mainAxisExtent: 140,
          crossAxisSpacing: 14,
          mainAxisSpacing: 14,
        ),
        itemCount: entries.length,
        itemBuilder: (context, index) {
          final entry = entries[index];
          final label = _entryLabel(l10n, entry.kind);
          return Tooltip(
            message: '${l10n.moreOpenModule}: $label',
            child: SyloraCard(
              onTap: () => context.goNamed(entry.routeName),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(
                    entry.icon,
                    size: 32,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const Spacer(),
                  Text(label, style: Theme.of(context).textTheme.titleLarge),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

String _entryLabel(AppLocalizations l10n, MoreEntryKind kind) => switch (kind) {
  MoreEntryKind.learning => l10n.moreLearning,
  MoreEntryKind.wallet => l10n.walletShortLabel,
  MoreEntryKind.gifts => l10n.giftsShortLabel,
  MoreEntryKind.ai => l10n.aiShortLabel,
  MoreEntryKind.live => l10n.liveShortLabel,
  MoreEntryKind.creatorStudio => l10n.moreCreatorStudio,
  MoreEntryKind.creator => l10n.moreCreator,
  MoreEntryKind.workspace => l10n.moreWorkspace,
  MoreEntryKind.admin => l10n.moreAdmin,
  MoreEntryKind.settings => l10n.moreSettings,
};
