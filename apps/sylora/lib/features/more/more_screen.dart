import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';

@immutable
final class MoreEntry {
  const MoreEntry({
    required this.label,
    required this.routeName,
    required this.icon,
    this.roles = const <String>{},
  });

  final String label;
  final String routeName;
  final IconData icon;
  final Set<String> roles;
}

const _entries = <MoreEntry>[
  MoreEntry(
    label: 'Learning',
    routeName: 'learning',
    icon: Icons.school_outlined,
  ),
  MoreEntry(
    label: 'Wallet',
    routeName: 'wallet',
    icon: Icons.account_balance_wallet_outlined,
  ),
  MoreEntry(
    label: 'Gifts',
    routeName: 'gifts',
    icon: Icons.card_giftcard_outlined,
  ),
  MoreEntry(label: 'AI', routeName: 'ai', icon: Icons.auto_awesome_outlined),
  MoreEntry(label: 'Live', routeName: 'live', icon: Icons.sensors_outlined),
  MoreEntry(
    label: 'Creator Studio',
    routeName: 'creator-studio',
    icon: Icons.video_camera_front_outlined,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    label: 'Creator',
    routeName: 'creator',
    icon: Icons.edit_note_rounded,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    label: 'Workspace',
    routeName: 'business',
    icon: Icons.business_outlined,
    roles: <String>{'business', 'admin'},
  ),
  MoreEntry(
    label: 'Administration',
    routeName: 'admin',
    icon: Icons.admin_panel_settings_outlined,
    roles: <String>{'admin'},
  ),
  MoreEntry(
    label: 'Settings',
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
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final entries = moreEntriesForRoles(roles);
    return LumenPage(
      title: 'More',
      subtitle:
          'Account tools and role-aware workspaces that do not fit compact navigation.',
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
          return SyloraCard(
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
                Text(
                  entry.label,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
