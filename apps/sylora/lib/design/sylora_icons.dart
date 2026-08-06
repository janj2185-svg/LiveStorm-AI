import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'sylora_tokens.dart';

/// Proprietary SYLORA icon set — soft geometric / orbital marks.
abstract final class SyloraIcons {
  static const IconData home = Icons.home_rounded;
  static const IconData search = Icons.search_rounded;
  static const IconData messages = Icons.forum_rounded;
  static const IconData market = Icons.storefront_rounded;
  static const IconData live = Icons.sensors_rounded;
  static const IconData ai = Icons.auto_awesome_rounded;
  static const IconData community = Icons.groups_rounded;
  static const IconData business = Icons.apartment_rounded;
  static const IconData gifts = Icons.card_giftcard_rounded;
  static const IconData education = Icons.menu_book_rounded;
  static const IconData creator = Icons.brush_rounded;
  static const IconData settings = Icons.tune_rounded;
  static const IconData admin = Icons.shield_moon_rounded;
  static const IconData more = Icons.apps_rounded;
  static const IconData mail = Icons.mail_outline_rounded;
  static const IconData lock = Icons.lock_outline_rounded;
  static const IconData phone = Icons.phone_iphone_rounded;
  static const IconData pin = Icons.pin_outlined;
  static const IconData person = Icons.person_outline_rounded;
  static const IconData back = Icons.arrow_back_rounded;
}

/// Soft glowing glyph used in navigation / empty states.
final class SyloraGlyph extends StatelessWidget {
  const SyloraGlyph({
    required this.icon,
    super.key,
    this.size = 22,
    this.active = false,
    this.color,
  });

  final IconData icon;
  final double size;
  final bool active;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? (active ? SyloraTokens.violet : SyloraTokens.inkSoft);
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: active
            ? SyloraTokens.glow(SyloraTokens.violet, blur: 14, opacity: 0.28)
            : null,
      ),
      child: Icon(icon, size: size, color: c),
    );
  }
}

/// Founder-locked Liquid S — approved Ethereal mockup raster (batch-01 / core).
/// Light breath + shimmer only; geometry is the approved asset, not a redraw.
class SyloraMark extends StatefulWidget {
  const SyloraMark({
    super.key,
    this.size = 48,
    this.animated = true,
    this.hero = false,
  });

  final double size;
  final bool animated;
  /// Use full hero plate (orb + orbits + particles baked in).
  final bool hero;

  static const heroAsset = 'assets/brand/sylora-sigil-hero.png';
  static const miniAsset = 'assets/brand/sylora-sigil-mini.png';

  @override
  State<SyloraMark> createState() => _SyloraMarkState();
}

class _SyloraMarkState extends State<SyloraMark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SyloraTokens.durSigil,
    );
    if (widget.animated) {
      _start();
    } else {
      _controller.value = 0.2;
    }
  }

  void _start() {
    if (WidgetsBinding
        .instance.platformDispatcher.accessibilityFeatures.disableAnimations) {
      _controller.value = 0.25;
      return;
    }
    _controller.repeat();
  }

  @override
  void didUpdateWidget(covariant SyloraMark oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animated && !_controller.isAnimating) {
      _start();
    } else if (!widget.animated && _controller.isAnimating) {
      _controller
        ..stop()
        ..value = 0.2;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asset = widget.hero || widget.size >= 96
        ? SyloraMark.heroAsset
        : SyloraMark.miniAsset;
    return Semantics(
      label: 'SYLORA',
      image: true,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final t = widget.animated ? _controller.value : 0.2;
            final breath = 1 + 0.018 * math.sin(t * math.pi * 2);
            final glow = 0.22 + 0.10 * ((math.sin(t * math.pi * 2) + 1) / 2);
            return Transform.scale(
              scale: breath,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF9BB6FF).withValues(alpha: glow),
                      blurRadius: widget.size * 0.28,
                      spreadRadius: widget.size * 0.02,
                    ),
                    BoxShadow(
                      color: SyloraTokens.gold.withValues(alpha: glow * 0.55),
                      blurRadius: widget.size * 0.18,
                    ),
                  ],
                ),
                child: child,
              ),
            );
          },
          child: Image.asset(
            asset,
            width: widget.size,
            height: widget.size,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
            errorBuilder: (_, __, ___) => Icon(
              Icons.auto_awesome,
              size: widget.size * 0.45,
              color: SyloraTokens.cyan,
            ),
          ),
        ),
      ),
    );
  }
}

/// Spaced wordmark lock: S Y L O R Λ (A → Λ, no crossbar).
class SyloraWordmark extends StatelessWidget {
  const SyloraWordmark({
    super.key,
    this.fontSize = 28,
    this.color,
    this.letterSpacing,
    this.weight = FontWeight.w500,
    this.showUnified = false,
    this.unifiedSize,
    this.center = true,
  });

  final double fontSize;
  final Color? color;
  final double? letterSpacing;
  final FontWeight weight;
  final bool showUnified;
  final double? unifiedSize;
  final bool center;

  static const String text = 'S Y L O R Λ';
  static const String unified = 'UNIFIED';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ink = color ?? scheme.onSurface.withValues(alpha: 0.92);
    final mark = Text(
      text,
      textAlign: center ? TextAlign.center : TextAlign.start,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: fontSize,
        fontWeight: weight,
        letterSpacing: letterSpacing ?? fontSize * 0.42,
        color: ink,
        height: 1.05,
      ),
    );
    if (!showUnified) return mark;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment:
          center ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        mark,
        SizedBox(height: fontSize * 0.12),
        Text(
          unified,
          textAlign: center ? TextAlign.center : TextAlign.start,
          style: TextStyle(
            fontFamily: 'Instrument Sans',
            fontSize: unifiedSize ?? fontSize * 0.42,
            fontWeight: FontWeight.w500,
            letterSpacing: (unifiedSize ?? fontSize * 0.42) * 0.55,
            color: SyloraTokens.goldDeep.withValues(alpha: 0.9),
            height: 1,
          ),
        ),
      ],
    );
  }
}

/// Hero stack — wordmark only (sigil is separate, matching batch-01 comps).
class SyloraHeroWordmark extends StatelessWidget {
  const SyloraHeroWordmark({
    super.key,
    this.syloraSize = 28,
    this.color,
  });

  final double syloraSize;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return SyloraWordmark(
      fontSize: syloraSize,
      letterSpacing: syloraSize * 0.48,
      weight: FontWeight.w600,
      color: color ?? SyloraTokens.ink.withValues(alpha: 0.92),
    );
  }
}

/// Compatibility alias used by older screens.
class SyloraLogoMark extends SyloraMark {
  const SyloraLogoMark({
    super.key,
    super.size = 40,
    super.animated = true,
    this.color,
  });

  final Color? color;
}
