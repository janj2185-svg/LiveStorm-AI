import 'package:flutter/material.dart';

import 'sylora_components.dart';
import 'sylora_tokens.dart';

/// Shared responsive breakpoints for phone / tablet / desktop / store builds.
abstract final class SyloraBreakpoints {
  static const phone = 600.0;
  static const tablet = 768.0;
  static const desktop = 1100.0;
  static const wide = 1280.0;

  static bool isPhone(double width) => width < tablet;
  static bool isTablet(double width) => width >= tablet && width < desktop;
  static bool isDesktop(double width) => width >= desktop;
  static bool isWide(double width) => width >= wide;

  static int gridColumns(double width, {int phone = 1, int tablet = 2, int desktop = 3}) {
    if (width < SyloraBreakpoints.tablet) {
      return phone;
    }
    if (width < SyloraBreakpoints.desktop) {
      return tablet;
    }
    return desktop;
  }
}

/// Staggered entrance used across Home / Friends / elevated tabs.
final class SyloraStaggeredReveal extends StatelessWidget {
  const SyloraStaggeredReveal({
    required this.index,
    required this.child,
    super.key,
    this.maxDelaySlots = 8,
    this.slide = 18,
  });

  final int index;
  final Widget child;
  final int maxDelaySlots;
  final double slide;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) {
      return child;
    }
    final delayMs = (index.clamp(0, maxDelaySlots) * 55);
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: Duration(milliseconds: 520 + delayMs),
      curve: SyloraTokens.curveSnap,
      builder: (context, value, child) {
        final t = Curves.easeOutCubic.transform(value);
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * slide),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

final class SyloraMetricPill extends StatelessWidget {
  const SyloraMetricPill({
    required this.label,
    required this.value,
    required this.icon,
    super.key,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SyloraGlass(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    radius: SyloraTokens.radiusMd,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon, color: SyloraTokens.violet, size: 18),
        const SizedBox(width: 10),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                value,
                style: SyloraTokens.title(18),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                label,
                style: SyloraTokens.body(12, color: SyloraTokens.inkMute),
                maxLines: 2,
                softWrap: true,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

final class SyloraPortalChip extends StatefulWidget {
  const SyloraPortalChip({
    required this.label,
    required this.icon,
    required this.onTap,
    super.key,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  State<SyloraPortalChip> createState() => _SyloraPortalChipState();
}

final class _SyloraPortalChipState extends State<SyloraPortalChip> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedContainer(
        duration: SyloraTokens.durFast,
        curve: SyloraTokens.curveSoft,
        transform: Matrix4.translationValues(0, _hover ? -2 : 0, 0),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
            onTap: widget.onTap,
            child: Ink(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: _hover ? 0.92 : 0.72),
                borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
                border: Border.all(
                  color: _hover
                      ? SyloraTokens.ion.withValues(alpha: 0.45)
                      : Colors.white.withValues(alpha: 0.8),
                ),
                boxShadow: _hover
                    ? SyloraTokens.glow(SyloraTokens.ion, blur: 18, opacity: 0.2)
                    : null,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(widget.icon, size: 16, color: SyloraTokens.violet),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        widget.label,
                        style: SyloraTokens.body(
                          13,
                          color: SyloraTokens.ink,
                          weight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Configurable glass hero used across elevated product tabs.
final class SyloraUniverseHero extends StatelessWidget {
  const SyloraUniverseHero({
    required this.eyebrow,
    required this.title,
    required this.body,
    super.key,
    this.trailing,
    this.footer,
    this.metrics = const <Widget>[],
    this.compactBreakpoint = 720,
  });

  final String eyebrow;
  final String title;
  final String body;
  final Widget? trailing;
  final Widget? footer;
  final List<Widget> metrics;
  final double compactBreakpoint;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < compactBreakpoint;
    return SyloraGlass(
      radius: SyloraTokens.radiusXl,
      padding: EdgeInsets.fromLTRB(
        compact ? 18 : 28,
        compact ? 22 : 30,
        compact ? 18 : 28,
        compact ? 20 : 26,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            eyebrow,
            style: SyloraTokens.label(11, color: SyloraTokens.ion),
            maxLines: 2,
            softWrap: true,
          ),
          const SizedBox(height: 10),
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: <Color>[SyloraTokens.night, SyloraTokens.ion],
            ).createShader(bounds),
            child: Text(
              title,
              style: SyloraTokens.display(
                compact ? 34 : 44,
                color: Colors.white,
              ),
              maxLines: 2,
              softWrap: true,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            body,
            style: SyloraTokens.body(
              compact ? 14.5 : 16.5,
              color: SyloraTokens.inkSoft,
              weight: FontWeight.w500,
            ),
          ),
          if (trailing != null) ...<Widget>[
            const SizedBox(height: 20),
            trailing!,
          ],
          if (metrics.isNotEmpty) ...<Widget>[
            const SizedBox(height: 18),
            Wrap(
              spacing: SyloraTokens.space2,
              runSpacing: SyloraTokens.space2,
              children: metrics,
            ),
          ],
          if (footer != null) ...<Widget>[
            const SizedBox(height: 18),
            footer!,
          ],
        ],
      ),
    );
  }
}

final class SyloraAvatarOrb extends StatelessWidget {
  const SyloraAvatarOrb({
    required this.label,
    super.key,
    this.imageUrl,
    this.size = 48,
    this.online = false,
  });

  final String label;
  final String? imageUrl;
  final double size;
  final bool online;

  @override
  Widget build(BuildContext context) {
    final initial = label.trim().isEmpty
        ? '?'
        : label.trim().characters.first.toUpperCase();
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              colors: <Color>[SyloraTokens.ion, SyloraTokens.violet],
            ),
            image: imageUrl == null
                ? null
                : DecorationImage(
                    image: NetworkImage(imageUrl!),
                    fit: BoxFit.cover,
                  ),
            boxShadow: SyloraTokens.glow(
              SyloraTokens.violet,
              blur: 16,
              opacity: 0.22,
            ),
          ),
          child: imageUrl == null
              ? Text(
                  initial,
                  style: SyloraTokens.title(size * 0.36, color: Colors.white),
                )
              : null,
        ),
        if (online)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: size * 0.28,
              height: size * 0.28,
              decoration: BoxDecoration(
                color: SyloraTokens.aqua,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}

final class SyloraGlassTile extends StatefulWidget {
  const SyloraGlassTile({
    required this.child,
    super.key,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  State<SyloraGlassTile> createState() => _SyloraGlassTileState();
}

final class _SyloraGlassTileState extends State<SyloraGlassTile> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final tile = AnimatedContainer(
      duration: SyloraTokens.durFast,
      curve: SyloraTokens.curveSoft,
      transform: Matrix4.translationValues(0, _hover ? -2 : 0, 0),
      child: SyloraGlass(
        padding: widget.padding,
        radius: SyloraTokens.radiusLg,
        child: widget.child,
      ),
    );
    if (widget.onTap == null) {
      return tile;
    }
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
          onTap: widget.onTap,
          child: tile,
        ),
      ),
    );
  }
}

/// Soft breathing glow for brand marks / live indicators.
final class SyloraPulseGlow extends StatefulWidget {
  const SyloraPulseGlow({
    required this.child,
    super.key,
    this.color = SyloraTokens.ion,
  });

  final Widget child;
  final Color color;

  @override
  State<SyloraPulseGlow> createState() => _SyloraPulseGlowState();
}

final class _SyloraPulseGlowState extends State<SyloraPulseGlow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) {
      return widget.child;
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final pulse = 0.82 + (0.18 * _controller.value);
        return DecoratedBox(
          decoration: BoxDecoration(
            boxShadow: SyloraTokens.glow(
              widget.color,
              blur: 22 * pulse,
              opacity: 0.16 * pulse,
            ),
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}
