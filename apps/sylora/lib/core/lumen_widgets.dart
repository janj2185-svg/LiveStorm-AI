import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api.dart';
import 'lumen_theme.dart';

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

final class LumenResponsiveShell extends StatelessWidget {
  const LumenResponsiveShell({
    required this.body,
    required this.destinations,
    required this.selectedIndex,
    required this.onDestinationSelected,
    super.key,
    this.compactDestinations,
    this.compactSelectedIndex,
    this.onCompactDestinationSelected,
    this.contextPanel,
  });

  final Widget body;
  final List<ShellDestination> destinations;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<ShellDestination>? compactDestinations;
  final int? compactSelectedIndex;
  final ValueChanged<int>? onCompactDestinationSelected;
  final Widget? contextPanel;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final width = constraints.maxWidth;
      if (width < 768) {
        final mobileDestinations = compactDestinations ?? destinations;
        final mobileIndex = compactSelectedIndex ?? selectedIndex;
        return Scaffold(
          body: body,
          bottomNavigationBar: NavigationBar(
            selectedIndex: mobileIndex.clamp(0, mobileDestinations.length - 1),
            onDestinationSelected:
                onCompactDestinationSelected ?? onDestinationSelected,
            destinations: <NavigationDestination>[
              for (final destination in mobileDestinations)
                NavigationDestination(
                  icon: Icon(destination.icon),
                  selectedIcon: Icon(destination.selectedIcon),
                  label: destination.label,
                ),
            ],
          ),
        );
      }
      final expanded = width >= 1280;
      return Scaffold(
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            NavigationRail(
              extended: expanded,
              selectedIndex: selectedIndex,
              onDestinationSelected: onDestinationSelected,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: expanded
                    ? const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          SyloraLogo(),
                          SizedBox(width: 12),
                          Text('SYLORA'),
                        ],
                      )
                    : const SyloraLogo(),
              ),
              destinations: <NavigationRailDestination>[
                for (final destination in destinations)
                  NavigationRailDestination(
                    icon: Icon(destination.icon),
                    selectedIcon: Icon(destination.selectedIcon),
                    label: Text(destination.label),
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
