import 'dart:math' as math;
import 'dart:ui' as ui;

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
    final glow = SyloraTokens.moduleGlow('home');
    final c = color ?? (active ? SyloraTokens.goldDeep : SyloraTokens.inkSoft);
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: active
            ? SyloraTokens.glow(glow, blur: 14, opacity: 0.28)
            : null,
      ),
      child: Icon(icon, size: size, color: c),
    );
  }
}

/// Coded Liquid S — glass orb, orbits, particles, iridescent S (no raster UI).
/// Geometry matches approved Ethereal batch-01 / core comps.
class SyloraMark extends StatefulWidget {
  const SyloraMark({
    super.key,
    this.size = 48,
    this.animated = true,
    this.hero = false,
  });

  final double size;
  final bool animated;
  final bool hero;

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
      _controller.value = 0.18;
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
        ..value = 0.18;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'SYLORA',
      image: true,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return CustomPaint(
              size: Size.square(widget.size),
              painter: _LiquidSPainter(
                phase: widget.animated ? _controller.value : 0.18,
                rich: widget.hero || widget.size >= 72,
              ),
            );
          },
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

class _LiquidSPainter extends CustomPainter {
  _LiquidSPainter({required this.phase, required this.rich});

  final double phase;
  final bool rich;

  static Path _sigilS(double s) {
    final path = Path();
    path.moveTo(s * 0.633, s * 0.242);
    path.cubicTo(s * 0.733, s * 0.217, s * 0.783, s * 0.325, s * 0.700, s * 0.383);
    path.cubicTo(s * 0.592, s * 0.458, s * 0.408, s * 0.467, s * 0.392, s * 0.575);
    path.cubicTo(s * 0.375, s * 0.700, s * 0.508, s * 0.767, s * 0.650, s * 0.717);
    path.cubicTo(s * 0.725, s * 0.692, s * 0.758, s * 0.617, s * 0.700, s * 0.592);
    path.cubicTo(s * 0.608, s * 0.558, s * 0.508, s * 0.592, s * 0.508, s * 0.533);
    path.cubicTo(s * 0.508, s * 0.450, s * 0.625, s * 0.425, s * 0.700, s * 0.358);
    path.cubicTo(s * 0.775, s * 0.292, s * 0.717, s * 0.200, s * 0.608, s * 0.217);
    path.cubicTo(s * 0.508, s * 0.233, s * 0.450, s * 0.308, s * 0.467, s * 0.358);
    path.cubicTo(s * 0.483, s * 0.408, s * 0.408, s * 0.442, s * 0.375, s * 0.375);
    path.cubicTo(s * 0.333, s * 0.283, s * 0.433, s * 0.192, s * 0.550, s * 0.192);
    path.cubicTo(s * 0.583, s * 0.192, s * 0.613, s * 0.208, s * 0.633, s * 0.242);
    path.close();
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    canvas.translate((size.width - s) / 2, (size.height - s) / 2);
    final c = Offset(s * 0.5, s * 0.5);
    final shimmer = (math.sin(phase * math.pi * 2) + 1) / 2;
    final pulse = 0.92 + 0.08 * math.sin(phase * math.pi * 2);
    final spin = phase * math.pi * 2;

    // Outer aura
    canvas.drawCircle(
      c,
      s * 0.48 * pulse,
      Paint()
        ..shader = ui.Gradient.radial(
          c,
          s * 0.5,
          [
            Colors.white.withValues(alpha: 0.5 * pulse),
            const Color(0xFF9BB6FF).withValues(alpha: 0.22),
            SyloraTokens.gold.withValues(alpha: 0.10),
            Colors.transparent,
          ],
          const [0.0, 0.4, 0.7, 1.0],
        ),
    );

    // Glass orb
    canvas.drawCircle(
      c,
      s * 0.36,
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(s * 0.42, s * 0.36),
          s * 0.4,
          [
            Colors.white.withValues(alpha: 0.72),
            const Color(0xFFE8EEFF).withValues(alpha: 0.38),
            const Color(0xFFC8D4FF).withValues(alpha: 0.16),
            const Color(0xFFB8C8FF).withValues(alpha: 0.0),
          ],
          const [0.0, 0.38, 0.68, 1.0],
        ),
    );
    canvas.drawCircle(
      c,
      s * 0.36,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.006
        ..color = Colors.white.withValues(alpha: 0.72),
    );

    // Orbital rings
    void orbit(double rx, double ry, double rot, double width, double alpha) {
      canvas.save();
      canvas.translate(c.dx, c.dy);
      canvas.rotate(rot + spin * 0.08);
      canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = width
          ..shader = ui.Gradient.linear(
            Offset(-rx, 0),
            Offset(rx, 0),
            [
              Colors.white.withValues(alpha: alpha),
              SyloraTokens.gold.withValues(alpha: alpha * 0.9),
              SyloraTokens.cyan.withValues(alpha: alpha * 0.6),
            ],
          ),
      );
      canvas.restore();
    }

    orbit(s * 0.325, s * 0.217, -0.49, s * 0.005, 0.75);
    orbit(s * 0.300, s * 0.200, 0.31, s * 0.004, 0.55);
    if (rich) {
      orbit(s * 0.275, s * 0.242, -1.08, s * 0.003, 0.42);
    }

    final sigil = _sigilS(s);

    // Soft bloom
    canvas.drawPath(
      sigil,
      Paint()
        ..color = const Color(0xFF8B9CFF).withValues(alpha: 0.26)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.04),
    );

    // Iridescent body
    canvas.drawPath(
      sigil,
      Paint()
        ..shader = ui.Gradient.linear(
          Offset(s * 0.29, s * 0.20),
          Offset(s * 0.73, s * 0.82),
          const [
            Color(0xFFEAF6FF),
            Color(0xFF7EC8FF),
            Color(0xFF8B7CFF),
            Color(0xFFE6C88B),
            Color(0xFFFFF0D2),
          ],
          const [0.0, 0.22, 0.48, 0.72, 1.0],
        ),
    );

    // Specular edge
    canvas.drawPath(
      sigil,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.012
        ..shader = ui.Gradient.linear(
          Offset(s * (0.2 + 0.35 * shimmer), s * 0.15),
          Offset(s * (0.55 + 0.3 * shimmer), s * 0.78),
          [
            Colors.white.withValues(alpha: 0.95),
            Colors.white.withValues(alpha: 0.12),
            const Color(0xFFFFF4D2).withValues(alpha: 0.55),
            Colors.white.withValues(alpha: 0.2),
          ],
          const [0.0, 0.4, 0.7, 1.0],
        ),
    );

    // Ribbon highlight filament
    final ribbon = Path()
      ..moveTo(s * 0.658, s * 0.258)
      ..cubicTo(s * 0.742, s * 0.242, s * 0.767, s * 0.350, s * 0.667, s * 0.400)
      ..cubicTo(s * 0.533, s * 0.467, s * 0.400, s * 0.475, s * 0.392, s * 0.583)
      ..cubicTo(s * 0.383, s * 0.700, s * 0.517, s * 0.750, s * 0.633, s * 0.708);
    canvas.drawPath(
      ribbon,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.014
        ..strokeCap = StrokeCap.round
        ..color = Colors.white.withValues(alpha: 0.45 + 0.2 * shimmer)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.008),
    );

    // Specular sparks
    canvas.drawCircle(
      Offset(s * 0.617, s * 0.267),
      s * 0.018,
      Paint()..color = Colors.white.withValues(alpha: 0.9),
    );
    canvas.drawCircle(
      Offset(s * 0.425, s * 0.617),
      s * 0.012,
      Paint()..color = SyloraTokens.goldLight.withValues(alpha: 0.8),
    );

    if (!rich) return;

    // Floating particles / bubbles
    const droplets = <(double, double, double, Color)>[
      (0.267, 0.325, 0.013, Color(0xFFFFFFFF)),
      (0.742, 0.292, 0.010, Color(0xFFE8EEFF)),
      (0.217, 0.550, 0.009, Color(0xFFC5B8FF)),
      (0.775, 0.533, 0.012, Color(0xFFFFFFFF)),
      (0.300, 0.717, 0.008, Color(0xFFB8C8FF)),
      (0.708, 0.742, 0.010, Color(0xFFFFF0D2)),
      (0.500, 0.192, 0.007, Color(0xFFFFFFFF)),
      (0.550, 0.817, 0.008, Color(0xFFE6C88B)),
      (0.200, 0.417, 0.006, Color(0xFF5EC8FF)),
      (0.800, 0.417, 0.006, Color(0xFF8B7CFF)),
    ];
    for (var i = 0; i < droplets.length; i++) {
      final (dx, dy, r, col) = droplets[i];
      final bob = math.sin(spin * 1.2 + i * 0.85) * s * 0.01;
      final p = Offset(s * dx, s * dy + bob);
      canvas.drawCircle(
        p,
        s * r,
        Paint()
          ..shader = ui.Gradient.radial(
            Offset(p.dx - s * r * 0.3, p.dy - s * r * 0.3),
            s * r * 1.3,
            [
              Colors.white.withValues(alpha: 0.95),
              col.withValues(alpha: 0.7),
              col.withValues(alpha: 0.15),
            ],
          ),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LiquidSPainter oldDelegate) {
    return oldDelegate.phase != phase || oldDelegate.rich != rich;
  }
}

class SyloraLogoMark extends SyloraMark {
  const SyloraLogoMark({
    super.key,
    super.size = 40,
    super.animated = true,
    this.color,
  });

  final Color? color;
}
