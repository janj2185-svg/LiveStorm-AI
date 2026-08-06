import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'api.dart';
import 'living_atmosphere.dart';
import 'locale.dart';
import 'lumen_theme.dart';

final class LumenSurface extends StatelessWidget {
  const LumenSurface({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(20),
    this.radius = 20,
    this.glass = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool glass;

  @override
  Widget build(BuildContext context) {
    if (glass) {
      return GlassPanel(padding: padding, radius: radius, child: child);
    }
    final dark = Theme.of(context).brightness == Brightness.dark;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(radius),
        border: dark
            ? Border.all(color: Theme.of(context).colorScheme.outlineVariant)
            : Border.all(color: const Color(0x22C9A227)),
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
    this.group,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String path;
  final String? group;
}

typedef AuraSheetBuilder = Widget Function(BuildContext context);

final class LumenResponsiveShell extends ConsumerWidget {
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
    this.auraSheetBuilder,
    this.onCreate,
  });

  final Widget body;
  final List<ShellDestination> destinations;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<ShellDestination>? compactDestinations;
  final int? compactSelectedIndex;
  final ValueChanged<int>? onCompactDestinationSelected;
  final Widget? contextPanel;
  final AuraSheetBuilder? auraSheetBuilder;
  final VoidCallback? onCreate;

  static const phoneBreakpoint = 600.0;
  static const tabletBreakpoint = 900.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(localeControllerProvider);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        if (width < phoneBreakpoint) {
          return _phoneShell(context, strings);
        }
        final compactRail = width < tabletBreakpoint;
        return _wideShell(context, strings, compactRail: compactRail);
      },
    );
  }

  Widget _phoneShell(BuildContext context, LocaleCatalog strings) {
    final mobileDestinations = compactDestinations ?? destinations;
    final mobileIndex = compactSelectedIndex ?? selectedIndex;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: LivingAtmosphere(
        intensity: 0.55,
        child: Column(
          children: <Widget>[
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: GlassPanel(
                  radius: 18,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  child: Row(
                    children: <Widget>[
                      const LivingSyloraLogo(size: 28, pulse: false),
                      const SizedBox(width: 8),
                      Text(
                        'SYLORA',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          letterSpacing: 1.2,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        tooltip: strings.t('search'),
                        onPressed: () => context.go('/search'),
                        icon: const Icon(Icons.search_rounded),
                      ),
                      IconButton(
                        tooltip: strings.t('notifications'),
                        onPressed: () => context.go('/notifications'),
                        icon: const Icon(Icons.notifications_outlined),
                      ),
                      IconButton(
                        tooltip: strings.t('Wallet'),
                        onPressed: () => context.go('/wallet'),
                        icon: const Icon(
                          Icons.account_balance_wallet_outlined,
                        ),
                      ),
                      IconButton(
                        tooltip: strings.t('Profile'),
                        onPressed: () => context.go('/profile'),
                        icon: const Icon(Icons.person_outline_rounded),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(child: body),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: mobileIndex.clamp(0, mobileDestinations.length - 1),
        onDestinationSelected:
            onCompactDestinationSelected ?? onDestinationSelected,
        destinations: <NavigationDestination>[
          for (final destination in mobileDestinations)
            NavigationDestination(
              icon: Icon(destination.icon),
              selectedIcon: Icon(destination.selectedIcon),
              label: strings.t(destination.label),
            ),
        ],
      ),
      floatingActionButton: _AuraOrbButton(onOpen: () => _openAura(context)),
    );
  }

  Widget _wideShell(
    BuildContext context,
    LocaleCatalog strings, {
    required bool compactRail,
  }) {
    final railWidth = compactRail ? 112.0 : 248.0;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: LivingAtmosphere(
        intensity: 0.55,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            SizedBox(
              width: railWidth,
              child: SafeArea(
                right: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 12, 6, 12),
                  child: GlassPanel(
                    radius: 22,
                    padding: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Padding(
                          padding: EdgeInsets.fromLTRB(
                            compactRail ? 12 : 16,
                            16,
                            compactRail ? 12 : 16,
                            12,
                          ),
                          child: compactRail
                              ? const Center(
                                  child: LivingSyloraLogo(
                                    size: 40,
                                    pulse: false,
                                  ),
                                )
                              : const Row(
                                  children: <Widget>[
                                    LivingSyloraLogo(size: 36, pulse: false),
                                    SizedBox(width: 12),
                                    Text(
                                      'SYLORA',
                                      style: TextStyle(
                                        fontFamily: 'Instrument Serif',
                                        fontSize: 22,
                                        letterSpacing: 1.4,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                            itemCount: destinations.length,
                            itemBuilder: (context, index) {
                              final destination = destinations[index];
                              final selected = index == selectedIndex;
                              return Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 2,
                                ),
                                child: Material(
                                  color: selected
                                      ? LumenColors.aether.withValues(
                                          alpha: 0.12,
                                        )
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(14),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(14),
                                    onTap: () =>
                                        onDestinationSelected(index),
                                    child: Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: compactRail ? 8 : 12,
                                        vertical: 10,
                                      ),
                                      child: Row(
                                        children: <Widget>[
                                          Icon(
                                            selected
                                                ? destination.selectedIcon
                                                : destination.icon,
                                            color: selected
                                                ? LumenColors.aether
                                                : null,
                                          ),
                                          if (!compactRail) ...<Widget>[
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Text(
                                                strings.t(destination.label),
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .labelLarge
                                                    ?.copyWith(
                                                      color: selected
                                                          ? LumenColors.aether
                                                          : null,
                                                    ),
                                              ),
                                            ),
                                          ] else ...<Widget>[
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                strings.t(destination.label),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .labelSmall
                                                    ?.copyWith(
                                                      color: selected
                                                          ? LumenColors.aether
                                                          : null,
                                                    ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  SafeArea(
                    bottom: false,
                    left: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 12, 12, 8),
                      child: GlassPanel(
                        radius: 18,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        child: Row(
                          children: <Widget>[
                            Expanded(
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(
                                  maxWidth: 420,
                                ),
                                child: TextField(
                                  readOnly: true,
                                  onTap: () => context.go('/search'),
                                  decoration: InputDecoration(
                                    hintText: strings.t('search'),
                                    prefixIcon: const Icon(
                                      Icons.search_rounded,
                                    ),
                                    isDense: true,
                                    filled: true,
                                    fillColor: Colors.white.withValues(
                                      alpha: 0.55,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            FilledButton.tonalIcon(
                              onPressed:
                                  onCreate ??
                                  () => context.go('/home?create=1'),
                              icon: const Icon(Icons.add_rounded),
                              label: Text(strings.t('create')),
                            ),
                            IconButton(
                              tooltip: strings.t('notifications'),
                              onPressed: () => context.go('/notifications'),
                              icon: const Icon(Icons.notifications_outlined),
                            ),
                            IconButton(
                              tooltip: strings.t('chat'),
                              onPressed: () => context.go('/messages'),
                              icon: const Icon(
                                Icons.chat_bubble_outline_rounded,
                              ),
                            ),
                            IconButton(
                              tooltip: strings.t('Wallet'),
                              onPressed: () => context.go('/wallet'),
                              icon: const Icon(
                                Icons.account_balance_wallet_outlined,
                              ),
                            ),
                            IconButton(
                              tooltip: strings.t('Profile'),
                              onPressed: () => context.go('/profile'),
                              icon: const Icon(Icons.person_outline_rounded),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Expanded(child: body),
                        if (!compactRail && contextPanel != null) ...<Widget>[
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 320,
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(0, 0, 12, 12),
                              child: GlassPanel(
                                radius: 20,
                                padding: const EdgeInsets.all(16),
                                child: contextPanel!,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: _AuraOrbButton(onOpen: () => _openAura(context)),
    );
  }

  Future<void> _openAura(BuildContext context) async {
    final builder = auraSheetBuilder;
    if (builder == null) {
      if (context.mounted) {
        context.go('/ai');
      }
      return;
    }
    final width = MediaQuery.sizeOf(context).width;
    if (width < phoneBreakpoint) {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (sheetContext) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(sheetContext).bottom,
          ),
          child: builder(sheetContext),
        ),
      );
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520, maxHeight: 640),
          child: builder(dialogContext),
        ),
      ),
    );
  }
}

final class _AuraOrbButton extends StatefulWidget {
  const _AuraOrbButton({required this.onOpen});

  final VoidCallback onOpen;

  @override
  State<_AuraOrbButton> createState() => _AuraOrbButtonState();
}

final class _AuraOrbButtonState extends State<_AuraOrbButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _pulse,
    builder: (context, child) {
      final scale = 1 + (_pulse.value * 0.06);
      return Transform.scale(
        scale: scale,
        child: FloatingActionButton(
          heroTag: 'aura-orb',
          onPressed: widget.onOpen,
          backgroundColor: LumenColors.pearl,
          foregroundColor: LumenColors.aether,
          elevation: 2 + _pulse.value * 4,
          child: child,
        ),
      );
    },
    child: const LivingSyloraLogo(size: 34, pulse: true),
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
      SliverAppBar.large(
        pinned: true,
        backgroundColor: Colors.transparent,
        title: Text(title),
        actions: actions,
      ),
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
