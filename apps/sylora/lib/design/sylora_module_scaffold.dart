import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/generated/app_localizations.dart';
import 'sylora_aura.dart';
import 'sylora_aura_presence.dart';
import 'sylora_components.dart';
import 'sylora_living_canvas.dart';
import 'sylora_tokens.dart';

/// Product-module shell for authenticated SYLORA pages (Ethereal SSOT).
///
/// Glass content rail, living canvas, safe-area handling, optional Aura dock
/// (hidden/minimized by default — never covers the module).
final class SyloraModuleScaffold extends StatelessWidget {
  const SyloraModuleScaffold({
    required this.title,
    required this.child,
    super.key,
    this.subtitle,
    this.actions = const <Widget>[],
    this.showAuraDock = false,
    this.auraEmotion = AuraEmotion.idle,
    this.auraLabel = 'Aura',
    this.showAuraPresence = false,
    this.auraPresenceController,
    this.auraPresencePreset = SyloraAuraContextPreset.ai,
    this.auraPresenceMode = SyloraAuraPresenceMode.hidden,
    this.maxContentWidth = 980,
    this.padding = const EdgeInsets.fromLTRB(20, 16, 20, 40),
    this.railPadding = const EdgeInsets.all(SyloraTokens.space5),
    this.intensity = 0.78,
    this.showOrbits = true,
    this.header,
    this.showGlobalChrome = true,
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
  final double maxContentWidth;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry railPadding;
  final double intensity;
  final bool showOrbits;
  /// Optional hero block rendered above the glass content rail.
  final Widget? header;
  /// Global top chrome — search / create / notifications / messages /
  /// wallet / profile — appended after page-local actions.
  final bool showGlobalChrome;

  /// Aura should never be fully absent once summoned into a page — `hidden`
  /// with [showAuraPresence] true is promoted to a non-blocking summon orb.
  SyloraAuraPresenceMode get _effectiveAuraPresenceMode {
    if (!showAuraPresence) {
      return SyloraAuraPresenceMode.hidden;
    }
    return auraPresenceMode == SyloraAuraPresenceMode.hidden
        ? SyloraAuraPresenceMode.summon
        : auraPresenceMode;
  }

  List<Widget> _resolvedActions(BuildContext context) {
    if (!showGlobalChrome) {
      return actions;
    }
    // Guard against hosts (e.g. isolated widget tests) that mount this
    // scaffold under a bare MaterialApp without the generated localization
    // delegate registered — fall back to plain tooltips instead of crashing.
    final l10n = Localizations.of<AppLocalizations>(
      context,
      AppLocalizations,
    );
    return <Widget>[
      ...actions,
      IconButton(
        tooltip: l10n?.navSearch ?? 'Search',
        onPressed: () => context.goNamed('search'),
        icon: const Icon(Icons.search_rounded),
      ),
      IconButton(
        tooltip: l10n?.feedCreatePost ?? 'Create',
        onPressed: () => context.goNamed(
          'home',
          queryParameters: const <String, String>{'compose': '1'},
        ),
        icon: const Icon(Icons.add_circle_outline_rounded),
      ),
      IconButton(
        tooltip: l10n?.settingsNotifications ?? 'Notifications',
        onPressed: () => context.pushNamed('notifications'),
        icon: const Icon(Icons.notifications_outlined),
      ),
      IconButton(
        tooltip: l10n?.navMessages ?? 'Messages',
        onPressed: () => context.goNamed('messages'),
        icon: const Icon(Icons.chat_bubble_outline_rounded),
      ),
      IconButton(
        tooltip: l10n?.walletTitle ?? 'Wallet',
        onPressed: () => context.goNamed('wallet'),
        icon: const Icon(Icons.account_balance_wallet_outlined),
      ),
      IconButton(
        tooltip: l10n?.navProfile ?? 'Profile',
        onPressed: () => context.goNamed('more'),
        icon: const Icon(Icons.person_outline_rounded),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final effectiveAuraMode = _effectiveAuraPresenceMode;
    return SyloraLivingScaffold(
      safe: false,
      intensity: intensity,
      showOrbits: showOrbits,
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 720;
            final showDock = showAuraDock && constraints.maxWidth >= 1040;
            final stack = Stack(
              children: <Widget>[
                CustomScrollView(
                  slivers: <Widget>[
                    SliverPadding(
                      padding: padding,
                      sliver: SliverToBoxAdapter(
                        child: Center(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: showDock
                                  ? maxContentWidth - 72
                                  : maxContentWidth,
                            ),
                            child: _SyloraModuleEntrance(
                              reduceMotion: reduceMotion,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: <Widget>[
                                  _ModuleHeader(
                                    title: title,
                                    subtitle: subtitle,
                                    actions: _resolvedActions(context),
                                    compact: compact,
                                  ),
                                  if (header != null) ...<Widget>[
                                    const SizedBox(height: SyloraTokens.space4),
                                    header!,
                                  ],
                                  const SizedBox(height: SyloraTokens.space4),
                                  SyloraGlass(
                                    padding: railPadding,
                                    radius: SyloraTokens.radiusXl,
                                    child: child,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (showDock)
                  Positioned(
                    right: SyloraTokens.space6,
                    bottom: SyloraTokens.space5,
                    child: IgnorePointer(
                      child: SyloraGlass(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        radius: SyloraTokens.radiusLg,
                        child: SyloraAura(
                          size: 92,
                          emotion: auraEmotion,
                          label: auraLabel,
                        ),
                      ),
                    ),
                  ),
                if (showAuraPresence)
                  SyloraAuraPresence(
                    controller: auraPresenceController,
                    preset: auraPresencePreset,
                    mode: effectiveAuraMode,
                  ),
              ],
            );
            if (auraPresenceController == null) {
              return stack;
            }
            return SyloraAuraPresenceScope(
              controller: auraPresenceController!,
              child: stack,
            );
          },
        ),
      ),
    );
  }
}

final class _ModuleHeader extends StatelessWidget {
  const _ModuleHeader({
    required this.title,
    required this.subtitle,
    required this.actions,
    required this.compact,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final canPop = ModalRoute.of(context)?.canPop ?? false;
    final text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            if (canPop) ...<Widget>[
              IconButton(
                tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                onPressed: () => Navigator.maybePop(context),
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              const SizedBox(width: SyloraTokens.space2),
            ],
            Expanded(
              child: Text(
                title,
                style: SyloraTokens.display(compact ? 30 : 40),
                maxLines: 2,
                softWrap: true,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        if (subtitle != null) ...<Widget>[
          const SizedBox(height: SyloraTokens.space2),
          Text(
            subtitle!,
            style: SyloraTokens.body(
              compact ? 14.5 : 16,
              color: SyloraTokens.inkSoft,
              weight: FontWeight.w500,
            ),
            softWrap: true,
          ),
        ],
      ],
    );

    final actionBar = actions.isEmpty
        ? const SizedBox.shrink()
        : Wrap(
            spacing: SyloraTokens.space2,
            runSpacing: SyloraTokens.space2,
            alignment: WrapAlignment.end,
            children: actions,
          );

    if (compact) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          text,
          if (actions.isNotEmpty) ...<Widget>[
            const SizedBox(height: SyloraTokens.space3),
            actionBar,
          ],
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(child: text),
        if (actions.isNotEmpty) ...<Widget>[
          const SizedBox(width: SyloraTokens.space4),
          actionBar,
        ],
      ],
    );
  }
}

final class _SyloraModuleEntrance extends StatelessWidget {
  const _SyloraModuleEntrance({
    required this.child,
    required this.reduceMotion,
  });

  final Widget child;
  final bool reduceMotion;

  @override
  Widget build(BuildContext context) {
    if (reduceMotion) {
      return child;
    }
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: SyloraTokens.durSlow,
      curve: SyloraTokens.curveSnap,
      builder: (context, value, child) {
        final curved = Curves.easeOutCubic.transform(value);
        return Opacity(
          opacity: curved,
          child: Transform.translate(
            offset: Offset(0, (1 - curved) * 22),
            child: Transform.scale(
              scale: 0.985 + (0.015 * curved),
              child: child,
            ),
          ),
        );
      },
      child: child,
    );
  }
}
