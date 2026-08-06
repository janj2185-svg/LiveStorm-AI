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

/// Liquid S Sigil — living Ethereal brand mark.
final class SyloraMark extends StatefulWidget {
  const SyloraMark({
    super.key,
    this.size = 36,
    this.animated = false,
  });

  final double size;
  final bool animated;

  @override
  State<SyloraMark> createState() => _SyloraMarkState();
}

final class _SyloraMarkState extends State<SyloraMark>
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
      _controller.value = 0.22;
    }
  }

  void _start() {
    if (WidgetsBinding
        .instance.platformDispatcher.accessibilityFeatures.disableAnimations) {
      _controller.value = 0.3;
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
        ..value = 0.22;
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
          builder: (context, _) => CustomPaint(
            painter: _LiquidSPainter(
              t: widget.animated ? _controller.value : 0.22,
              living: widget.animated,
            ),
          ),
        ),
      ),
    );
  }
}

final class _LiquidSPainter extends CustomPainter {
  const _LiquidSPainter({required this.t, required this.living});

  final double t;
  final bool living;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final ox = size.width / 2 - s / 2;
    final oy = size.height / 2 - s / 2;
    canvas.translate(ox, oy);

    final breath = living ? 0.5 + 0.5 * math.sin(t * math.pi * 2) : 0.55;
    final shimmer = living ? 0.5 + 0.5 * math.sin(t * math.pi * 2 * 1.35) : 0.5;
    final c = Offset(s * 0.5, s * 0.5);

    // Energy orb wash.
    canvas.drawCircle(
      c,
      s * (0.42 + 0.04 * breath),
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.white.withValues(alpha: 0.55 + 0.2 * breath),
            SyloraTokens.cyan.withValues(alpha: 0.18 + 0.1 * breath),
            SyloraTokens.violet.withValues(alpha: 0.12),
            SyloraTokens.gold.withValues(alpha: 0.08),
            Colors.transparent,
          ],
          stops: const [0, 0.28, 0.5, 0.72, 1],
        ).createShader(Rect.fromCircle(center: c, radius: s * 0.5)),
    );

    // Soft expanding energy rings.
    if (living) {
      for (var i = 0; i < 2; i++) {
        final phase = (t + i * 0.5) % 1.0;
        canvas.drawCircle(
          c,
          s * (0.22 + phase * 0.28),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = s * 0.008
            ..color = Color.lerp(
              SyloraTokens.cyan,
              SyloraTokens.gold,
              phase,
            )!
                .withValues(alpha: (1 - phase) * 0.28),
        );
      }
    }

    // Liquid S path (readable at favicon size).
    final sigil = _liquidS(s);
    final soft = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.12
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = SyloraTokens.violet.withValues(alpha: 0.22 + 0.1 * breath)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.035);
    canvas.drawPath(sigil, soft);

    final shift = living ? shimmer * 0.15 : 0.0;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.085
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..shader = LinearGradient(
        begin: Alignment(-1 + shift, -1),
        end: Alignment(1 + shift, 1),
        colors: const [
          SyloraTokens.cyan,
          SyloraTokens.violet,
          SyloraTokens.gold,
          SyloraTokens.goldLight,
        ],
        stops: const [0, 0.35, 0.7, 1],
      ).createShader(Rect.fromLTWH(0, 0, s, s));
    canvas.drawPath(sigil, paint);

    // Inner highlight filament along S.
    canvas.drawPath(
      sigil,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.028
        ..strokeCap = StrokeCap.round
        ..color = Colors.white.withValues(alpha: 0.55 + 0.25 * shimmer),
    );

    // Core spark at the S mid bend.
    final spark = Offset(s * 0.5, s * 0.5);
    canvas.drawCircle(
      spark,
      s * (0.035 + 0.01 * breath),
      Paint()
        ..color = Colors.white
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.02),
    );
    canvas.drawCircle(
      spark,
      s * 0.02,
      Paint()..color = Colors.white.withValues(alpha: 0.95),
    );

    // Orbiting energy motes.
    if (living) {
      for (var i = 0; i < 5; i++) {
        final a = t * math.pi * 2 * (0.65 + i * 0.07) + i * 1.15;
        final rx = s * (0.3 + 0.05 * math.sin(t * 5 + i));
        final ry = s * (0.34 + 0.04 * math.cos(t * 4 + i));
        final p = Offset(c.dx + math.cos(a) * rx, c.dy + math.sin(a) * ry);
        final hue = i.isEven ? SyloraTokens.cyan : SyloraTokens.gold;
        canvas.drawCircle(
          p,
          s * 0.012,
          Paint()
            ..color = hue.withValues(alpha: 0.4 + 0.4 * breath)
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.01),
        );
      }
    }
  }

  /// Calligraphic S — open, liquid, asymmetric (not a circle/hex/star).
  Path _liquidS(double s) {
    return Path()
      ..moveTo(s * 0.68, s * 0.22)
      ..cubicTo(s * 0.52, s * 0.12, s * 0.28, s * 0.16, s * 0.26, s * 0.32)
      ..cubicTo(s * 0.24, s * 0.46, s * 0.42, s * 0.48, s * 0.52, s * 0.5)
      ..cubicTo(s * 0.66, s * 0.53, s * 0.78, s * 0.58, s * 0.76, s * 0.7)
      ..cubicTo(s * 0.74, s * 0.86, s * 0.5, s * 0.9, s * 0.32, s * 0.8);
  }

  @override
  bool shouldRepaint(covariant _LiquidSPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.living != living;
}

