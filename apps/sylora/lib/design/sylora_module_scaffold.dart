import 'package:flutter/material.dart';

import 'sylora_aura.dart';
import 'sylora_components.dart';
import 'sylora_living_canvas.dart';
import 'sylora_tokens.dart';

/// Product-module shell for authenticated SYLORA pages.
///
/// Keeps routes visually inside the Lumen world while giving feature modules a
/// predictable glass content rail, safe-area handling, and optional Aura dock.
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
    this.maxContentWidth = 980,
    this.padding = const EdgeInsets.fromLTRB(20, 16, 20, 40),
    this.railPadding = const EdgeInsets.all(SyloraTokens.space5),
    this.intensity = 0.78,
    this.showOrbits = true,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final bool showAuraDock;
  final AuraEmotion auraEmotion;
  final String auraLabel;
  final double maxContentWidth;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry railPadding;
  final double intensity;
  final bool showOrbits;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return SyloraLivingScaffold(
      safe: false,
      intensity: intensity,
      showOrbits: showOrbits,
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 720;
            final showDock = showAuraDock && constraints.maxWidth >= 1040;
            return Stack(
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
                                    actions: actions,
                                    compact: compact,
                                  ),
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
              ],
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
                style: SyloraTokens.display(compact ? 34 : 44),
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
      duration: SyloraTokens.durMed,
      curve: SyloraTokens.curveSnap,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, (1 - value) * 14),
          child: child,
        ),
      ),
      child: child,
    );
  }
}
