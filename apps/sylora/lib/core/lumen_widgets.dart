import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'api.dart';
import 'l10n/sylora_localizations.dart';
import 'lumen_effects.dart';
import 'lumen_theme.dart';
import 'shell_navigation.dart';

final class LumenSurface extends StatelessWidget {
  const LumenSurface({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(20),
    this.radius = 20,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(radius),
        border: dark
            ? Border.all(color: Theme.of(context).colorScheme.outlineVariant)
            : null,
        boxShadow: dark
            ? null
            : const <BoxShadow>[
                BoxShadow(
                  color: Color(0x122C405A),
                  blurRadius: 24,
                  offset: Offset(0, 10),
                ),
                BoxShadow(
                  color: Color(0x0D2C405A),
                  blurRadius: 4,
                  offset: Offset(0, 2),
                ),
              ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Material(
          type: MaterialType.transparency,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

final class LumenPrimaryButton extends StatelessWidget {
  const LumenPrimaryButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.icon,
    this.busy = false,
    this.disabledReason,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool busy;
  final String? disabledReason;

  @override
  Widget build(BuildContext context) {
    final button = ElevatedButton.icon(
      onPressed: busy ? null : onPressed,
      icon: busy
          ? const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(icon ?? Icons.arrow_forward_rounded),
      label: Text(label),
    );
    if (onPressed == null && disabledReason != null) {
      return Semantics(
        enabled: false,
        hint: disabledReason,
        child: Tooltip(message: disabledReason, child: button),
      );
    }
    return button;
  }
}

final class LumenSecondaryButton extends StatelessWidget {
  const LumenSecondaryButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.icon,
    this.disabledReason,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final String? disabledReason;

  @override
  Widget build(BuildContext context) {
    final button = OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon ?? Icons.tune_rounded),
      label: Text(label),
    );
    if (onPressed == null && disabledReason != null) {
      return Semantics(
        enabled: false,
        hint: disabledReason,
        child: Tooltip(message: disabledReason, child: button),
      );
    }
    return button;
  }
}

final class LumenBadge extends StatelessWidget {
  const LumenBadge({
    required this.label,
    super.key,
    this.color = LumenColors.aether,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      label,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
    ),
  );
}

final class LumenEmptyView extends StatelessWidget {
  const LumenEmptyView({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
    super.key,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 520),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 48, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            LumenPrimaryButton(
              label: actionLabel,
              icon: Icons.refresh_rounded,
              onPressed: onAction,
            ),
          ],
        ),
      ),
    ),
  );
}

final class LumenOfflineView extends StatelessWidget {
  const LumenOfflineView({required this.onRetry, super.key});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => LumenEmptyView(
    title: 'You’re offline',
    message:
        'SYLORA needs a connection to load current account and community data.',
    actionLabel: 'Try again',
    onAction: onRetry,
    icon: Icons.cloud_off_outlined,
  );
}

final class LumenErrorView extends StatelessWidget {
  const LumenErrorView({required this.error, required this.onRetry, super.key});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (error is OfflineException) {
      return LumenOfflineView(onRetry: onRetry);
    }
    final problem = error is ApiProblem ? error as ApiProblem : null;
    return LumenEmptyView(
      title: problem?.title ?? 'Something went wrong',
      message: problem?.detail ?? 'The request could not be completed.',
      actionLabel: 'Try again',
      onAction: onRetry,
      icon: Icons.error_outline_rounded,
    );
  }
}

final class LumenAsyncView<T> extends StatelessWidget {
  const LumenAsyncView({
    required this.value,
    required this.data,
    required this.onRetry,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T value) data;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => value.when(
    data: data,
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (error, stackTrace) =>
        LumenErrorView(error: error, onRetry: onRetry),
  );
}

@immutable
final class ShellDestination {
  const ShellDestination({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.path,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String path;
}

final class LumenResponsiveShell extends ConsumerWidget {
  const LumenResponsiveShell({
    required this.body,
    required this.navItems,
    required this.selectedIndex,
    required this.onDestinationSelected,
    super.key,
    this.contextPanel,
    this.primaryItems,
    this.primarySelectedIndex,
    this.onPrimaryDestinationSelected,
  });

  final Widget body;
  final List<SyloraNavItem> navItems;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final Widget? contextPanel;
  final List<SyloraNavItem>? primaryItems;
  final int? primarySelectedIndex;
  final ValueChanged<int>? onPrimaryDestinationSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final primary = primaryItems ?? navItems;
    final primaryIndex = primarySelectedIndex ?? selectedIndex;

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : MediaQuery.sizeOf(context).width;
        final isMobile = width < 768;
        final expanded = width >= 1280;

        if (isMobile) {
          return Scaffold(
            drawer: _SyloraDrawer(
              items: navItems,
              locale: locale,
              selectedIndex: selectedIndex,
              onSelected: onDestinationSelected,
            ),
            appBar: SyloraTopBar(locale: locale),
            body: body,
            bottomNavigationBar: NavigationBar(
              selectedIndex: primaryIndex.clamp(0, primary.length - 1),
              onDestinationSelected:
                  onPrimaryDestinationSelected ?? onDestinationSelected,
              destinations: <NavigationDestination>[
                for (final item in primary)
                  NavigationDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.selectedIcon),
                    label: item.label(locale),
                  ),
              ],
            ),
          );
        }

        return Scaffold(
          appBar: SyloraTopBar(locale: locale, showMenuButton: false),
          body: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              NavigationRail(
                extended: expanded,
                selectedIndex: selectedIndex.clamp(0, navItems.length - 1),
                onDestinationSelected: onDestinationSelected,
                labelType: expanded
                    ? NavigationRailLabelType.none
                    : NavigationRailLabelType.selected,
                leading: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: expanded
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            AnimatedSyloraLogo(
                              size: 36,
                              reducedMotion: ref.watch(
                                visualSettingsProvider.select(
                                  (value) => value.reducedMotion,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              SyloraStrings.t(locale, 'app_name'),
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ],
                        )
                      : AnimatedSyloraLogo(
                          size: 32,
                          reducedMotion: ref.watch(
                            visualSettingsProvider.select(
                              (value) => value.reducedMotion,
                            ),
                          ),
                        ),
                ),
                destinations: <NavigationRailDestination>[
                  for (final item in navItems)
                    NavigationRailDestination(
                      icon: Icon(item.icon),
                      selectedIcon: Icon(item.selectedIcon),
                      label: Text(item.label(locale)),
                    ),
                ],
              ),
              VerticalDivider(
                width: 1,
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              Expanded(child: body),
              if (expanded && contextPanel != null) ...<Widget>[
                VerticalDivider(
                  width: 1,
                  color: Theme.of(context).colorScheme.outlineVariant,
                ),
                SizedBox(width: 340, child: contextPanel),
              ],
            ],
          ),
        );
      },
    );
  }
}

final class SyloraTopBar extends StatelessWidget implements PreferredSizeWidget {
  const SyloraTopBar({
    required this.locale,
    super.key,
    this.showMenuButton = true,
  });

  final SyloraLocale locale;
  final bool showMenuButton;

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppBar(
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: scheme.surface.withValues(alpha: 0.85),
      leading: showMenuButton
          ? Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
            )
          : null,
      title: InkWell(
        onTap: () => context.goNamed('search'),
        borderRadius: BorderRadius.circular(12),
        child: LumenVellum(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          radius: 12,
          sigma: 12,
          child: Row(
            children: <Widget>[
              Icon(Icons.search_rounded, color: scheme.onSurfaceVariant, size: 20),
              const SizedBox(width: 8),
              Text(
                SyloraStrings.t(locale, 'search'),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
      actions: <Widget>[
        IconButton(
          tooltip: SyloraStrings.t(locale, 'create'),
          icon: const Icon(Icons.add_circle_outline_rounded),
          onPressed: () => _showCreateSheet(context),
        ),
        IconButton(
          tooltip: SyloraStrings.t(locale, 'notifications'),
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => context.pushNamed('notifications'),
        ),
        IconButton(
          tooltip: SyloraStrings.t(locale, 'chat'),
          icon: const Icon(Icons.chat_bubble_outline_rounded),
          onPressed: () => context.goNamed('messages'),
        ),
        IconButton(
          tooltip: SyloraStrings.t(locale, 'nav_wallet'),
          icon: const Icon(Icons.account_balance_wallet_outlined),
          onPressed: () => context.goNamed('wallet'),
        ),
        IconButton(
          tooltip: SyloraStrings.t(locale, 'nav_profile'),
          icon: const Icon(Icons.person_outline_rounded),
          onPressed: () => context.goNamed('profile'),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Wrap(
          children: <Widget>[
            ListTile(
              leading: const Icon(Icons.edit_note_rounded),
              title: const Text('New post'),
              onTap: () {
                Navigator.pop(context);
                context.goNamed('home');
              },
            ),
            ListTile(
              leading: const Icon(Icons.sensors_rounded),
              title: const Text('Go live'),
              onTap: () {
                Navigator.pop(context);
                context.goNamed('live');
              },
            ),
            ListTile(
              leading: const Icon(Icons.card_giftcard_outlined),
              title: const Text('Send a gift'),
              onTap: () {
                Navigator.pop(context);
                context.goNamed('gifts');
              },
            ),
            ListTile(
              leading: const Icon(Icons.auto_awesome_rounded),
              title: const Text('Ask Aura'),
              onTap: () {
                Navigator.pop(context);
                context.goNamed('ai');
              },
            ),
          ],
        ),
      ),
    );
  }
}

final class _SyloraDrawer extends StatelessWidget {
  const _SyloraDrawer({
    required this.items,
    required this.locale,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<SyloraNavItem> items;
  final SyloraLocale locale;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) => Drawer(
    child: SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: <Widget>[
                const AnimatedSyloraLogo(size: 40),
                const SizedBox(width: 12),
                Text(
                  SyloraStrings.t(locale, 'app_name'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                return ListTile(
                  selected: index == selectedIndex,
                  leading: Icon(
                    index == selectedIndex ? item.selectedIcon : item.icon,
                  ),
                  title: Text(item.label(locale)),
                  onTap: () {
                    Navigator.pop(context);
                    onSelected(index);
                  },
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}

final class LumenPage extends StatelessWidget {
  const LumenPage({
    required this.title,
    required this.child,
    super.key,
    this.actions = const <Widget>[],
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;

  @override
  Widget build(BuildContext context) => CustomScrollView(
    slivers: <Widget>[
      SliverAppBar.large(pinned: true, title: Text(title), actions: actions),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 40),
        sliver: SliverList.list(
          children: <Widget>[
            if (subtitle != null) ...<Widget>[
              Text(subtitle!, style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 20),
            ],
            child,
          ],
        ),
      ),
    ],
  );
}
