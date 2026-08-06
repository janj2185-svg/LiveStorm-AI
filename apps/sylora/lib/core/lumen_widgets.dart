import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/sylora.dart';
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
    return SyloraGlass(
      padding: padding,
      radius: radius.toDouble(),
      child: child,
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
    final button = SyloraButton(
      label: label,
      onPressed: onPressed,
      busy: busy,
      icon: icon ?? Icons.arrow_forward_rounded,
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
    final button = SyloraButton(
      label: label,
      onPressed: onPressed,
      icon: icon ?? Icons.tune_rounded,
      variant: SyloraButtonVariant.secondary,
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
    this.secondaryLabel,
    this.onSecondary,
  });

  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;
  final IconData icon;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) => SyloraStates.empty(
    title: title,
    message: message,
    actionLabel: actionLabel,
    onAction: onAction,
    icon: icon,
    secondaryLabel: secondaryLabel,
    onSecondary: onSecondary,
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
    loading: () => SyloraStates.loading(),
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
      if (width < SyloraBreakpoints.phone) {
        final mobileDestinations = compactDestinations ?? destinations;
        final mobileIndex = compactSelectedIndex ?? selectedIndex;
        // A4 Shorts: floating island dock, icons first (label only when selected).
        return Scaffold(
          backgroundColor: Colors.transparent,
          body: body,
          extendBody: true,
          bottomNavigationBar: SafeArea(
            minimum: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: _SyloraIslandDock(
              destinations: mobileDestinations,
              selectedIndex: mobileIndex.clamp(
                0,
                mobileDestinations.length - 1,
              ),
              onDestinationSelected:
                  onCompactDestinationSelected ?? onDestinationSelected,
            ),
          ),
        );
      }
      final expanded = SyloraBreakpoints.isWide(width);
      final compactRail = width < SyloraBreakpoints.desktop;
      // A4 Cinema: thin icon rail; labels only on wide desktop.
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            DecoratedBox(
              decoration: BoxDecoration(
                color: SyloraTokens.glassStrong.withValues(alpha: 0.92),
                border: Border(
                  right: BorderSide(
                    color: Colors.white.withValues(alpha: 0.55),
                  ),
                ),
                boxShadow: <BoxShadow>[
                  BoxShadow(
            color: SyloraTokens.cyan.withValues(alpha: 0.08),
            blurRadius: 28,
            offset: const Offset(4, 0),
          ),
        ],
      ),
      child: NavigationRail(
        backgroundColor: Colors.transparent,
        extended: expanded,
        minWidth: compactRail ? 76 : 68,
        groupAlignment: -1,
        scrollable: true,
        selectedIndex: selectedIndex.clamp(0, destinations.length - 1),
        onDestinationSelected: onDestinationSelected,
        labelType: expanded
            ? NavigationRailLabelType.none
            : NavigationRailLabelType.selected,
        leading: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: expanded
              ? const SyloraBrandLockup(size: 34, showUnified: false)
              : const SyloraLogo(size: 36),
        ),
                destinations: <NavigationRailDestination>[
                  for (final destination in destinations)
                    NavigationRailDestination(
                      icon: Tooltip(
                        message: destination.label,
                        child: Icon(destination.icon),
                      ),
                      selectedIcon: Tooltip(
                        message: destination.label,
                        child: Icon(destination.selectedIcon),
                      ),
                      label: Text(
                        destination.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                      ),
                    ),
                ],
              ),
            ),
            Expanded(child: body),
            if (expanded && contextPanel != null) ...<Widget>[
              DecoratedBox(
                decoration: BoxDecoration(
                  color: SyloraTokens.glass.withValues(alpha: 0.78),
                  border: Border(
                    left: BorderSide(
                      color: Colors.white.withValues(alpha: 0.58),
                    ),
                  ),
                ),
                child: SizedBox(width: 340, child: contextPanel),
              ),
            ],
          ],
        ),
      );
    },
  );
}

/// A4 phone dock — frosted island, soft pulse on selection, no label clutter.
final class _SyloraIslandDock extends StatelessWidget {
  const _SyloraIslandDock({
    required this.destinations,
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  final List<ShellDestination> destinations;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: SyloraTokens.glassStrong.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: SyloraTokens.ink.withValues(alpha: 0.08),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: SyloraTokens.gold.withValues(alpha: 0.14),
            blurRadius: 36,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            indicatorColor: SyloraTokens.gold.withValues(alpha: 0.22),
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              final selected = states.contains(WidgetState.selected);
              return SyloraTokens.body(
                10.5,
                color: selected ? SyloraTokens.goldDeep : Colors.transparent,
                weight: FontWeight.w600,
              );
            }),
            height: 64,
          ),
          child: NavigationBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            overlayColor: WidgetStatePropertyAll(
              SyloraTokens.gold.withValues(alpha: 0.1),
            ),
            labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
            selectedIndex: selectedIndex,
            onDestinationSelected: onDestinationSelected,
            destinations: <NavigationDestination>[
              for (final destination in destinations)
                NavigationDestination(
                  icon: Icon(destination.icon, size: 24),
                  selectedIcon: Icon(
                    destination.selectedIcon,
                    size: 26,
                    color: SyloraTokens.goldDeep,
                  ),
                  label: destination.label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

final class LumenPage extends StatelessWidget {
  const LumenPage({
    required this.title,
    required this.child,
    super.key,
    this.actions = const <Widget>[],
    this.subtitle,
    this.showAuraDock = false,
    this.auraEmotion = AuraEmotion.idle,
    this.auraLabel = 'Aura',
    this.showAuraPresence = false,
    this.auraPresenceController,
    this.auraPresencePreset = SyloraAuraContextPreset.ai,
    this.auraPresenceMode = SyloraAuraPresenceMode.hidden,
    this.intensity = 0.78,
    this.showOrbits = true,
    this.header,
    this.maxContentWidth = 980,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final bool showAuraDock;
  final AuraEmotion auraEmotion;
  final String auraLabel;
  final bool showAuraPresence;
  final SyloraAuraPresenceController? auraPresenceController;
  final SyloraAuraContextPreset auraPresencePreset;
  final SyloraAuraPresenceMode auraPresenceMode;
  final double intensity;
  final bool showOrbits;
  final Widget? header;
  final double maxContentWidth;

  @override
  Widget build(BuildContext context) => SyloraModuleScaffold(
    title: title,
    subtitle: subtitle,
    actions: actions,
    showAuraDock: showAuraDock,
    auraEmotion: auraEmotion,
    auraLabel: auraLabel,
    showAuraPresence: showAuraPresence,
    auraPresenceController: auraPresenceController,
    auraPresencePreset: auraPresencePreset,
    auraPresenceMode: auraPresenceMode,
    intensity: intensity,
    showOrbits: showOrbits,
    header: header,
    maxContentWidth: maxContentWidth,
    child: child,
  );
}
