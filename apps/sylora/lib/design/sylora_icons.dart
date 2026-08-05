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

/// Infinity Core — living brand mark (AI · intellect · connection · infinity).
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
      duration: const Duration(milliseconds: 7200),
    );
    if (widget.animated) {
      unawaitedStart();
    }
  }

  void unawaitedStart() {
    final disable = WidgetsBinding
        .instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    if (disable) {
      _controller.value = 0.35;
      return;
    }
    _controller.repeat();
  }

  @override
  void didUpdateWidget(covariant SyloraMark oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animated && !_controller.isAnimating) {
      unawaitedStart();
    } else if (!widget.animated && _controller.isAnimating) {
      _controller.stop();
      _controller.value = 0.2;
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
            painter: _InfinityCorePainter(
              t: widget.animated ? _controller.value : 0.18,
              living: widget.animated,
            ),
          ),
        ),
      ),
    );
  }
}

final class _InfinityCorePainter extends CustomPainter {
  const _InfinityCorePainter({required this.t, required this.living});

  final double t;
  final bool living;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final c = Offset(size.width / 2, size.height / 2);
    final breath = living ? (0.5 + 0.5 * math.sin(t * math.pi * 2)) : 0.55;
    final spin = living ? t * math.pi * 2 : 0.35;

    // Soft field.
    canvas.drawCircle(
      c,
      s * 0.48,
      Paint()..color = const Color(0xFFFFF7EE),
    );

    // Light wave rings.
    for (var i = 0; i < 3; i++) {
      final phase = (t + i * 0.22) % 1.0;
      final r = s * (0.22 + phase * 0.28);
      final alpha = living ? (1 - phase) * 0.22 : 0.08;
      canvas.drawCircle(
        c,
        r,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = s * 0.012
          ..color = SyloraTokens.champagne.withValues(alpha: alpha),
      );
    }

    // Outer universe orbit.
    canvas.drawCircle(
      c,
      s * 0.41,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.01
        ..color = SyloraTokens.champagneDeep.withValues(alpha: 0.28),
    );
    canvas.save();
    canvas.translate(c.dx, c.dy);
    canvas.rotate(spin * 0.35);
    final dashPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.008
      ..color = SyloraTokens.softSkyDeep.withValues(alpha: 0.28);
    final orbit = Path()
      ..addOval(Rect.fromCircle(center: Offset.zero, radius: s * 0.345));
    canvas.drawPath(
      orbit,
      dashPaint
        ..strokeCap = StrokeCap.round,
    );
    canvas.restore();

    // Infinity ribbon.
    canvas.save();
    canvas.translate(c.dx, c.dy);
    canvas.rotate(spin * 0.12);
    final ribbon = _lemniscatePath(s * 0.27);
    final soft = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.07
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = SyloraTokens.champagne.withValues(alpha: 0.28)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.03);
    canvas.drawPath(ribbon, soft);
    final ribbonPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.038
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..shader = SweepGradient(
        colors: const [
          SyloraTokens.champagneLight,
          SyloraTokens.champagne,
          SyloraTokens.champagneDeep,
          SyloraTokens.softSkyDeep,
          SyloraTokens.champagneLight,
        ],
        transform: GradientRotation(spin),
      ).createShader(Rect.fromCircle(center: Offset.zero, radius: s * 0.35));
    canvas.drawPath(ribbon, ribbonPaint);
    canvas.restore();

    // Neural nodes + orbiting particles.
    final nodes = <Offset>[
      Offset(c.dx - s * 0.27, c.dy),
      Offset(c.dx + s * 0.27, c.dy),
      Offset(c.dx - s * 0.13, c.dy - s * 0.125),
      Offset(c.dx + s * 0.13, c.dy + s * 0.125),
      Offset(c.dx - s * 0.13, c.dy + s * 0.125),
      Offset(c.dx + s * 0.13, c.dy - s * 0.125),
    ];
    for (var i = 0; i < nodes.length; i++) {
      final n = nodes[i];
      canvas.drawCircle(
        n,
        s * (0.012 + (i < 2 ? 0.006 : 0)),
        Paint()
          ..color = SyloraTokens.champagneDeep.withValues(
            alpha: 0.55 + 0.35 * breath,
          ),
      );
    }
    if (living) {
      for (var i = 0; i < 5; i++) {
        final a = spin * (1.1 + i * 0.07) + i * 1.2;
        final rr = s * (0.3 + 0.04 * math.sin(spin * 3 + i));
        final p = Offset(c.dx + math.cos(a) * rr, c.dy + math.sin(a) * rr * 0.62);
        canvas.drawCircle(
          p,
          s * 0.01,
          Paint()
            ..color = Colors.white.withValues(alpha: 0.55 + 0.35 * breath)
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.01),
        );
      }
    }

    // Energy core.
    final coreR = s * (0.085 + 0.012 * breath);
    canvas.drawCircle(
      c,
      coreR * 1.55,
      Paint()
        ..color = SyloraTokens.champagne.withValues(alpha: 0.28 + 0.18 * breath)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.05),
    );
    canvas.drawCircle(
      c,
      coreR * 1.15,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.white,
            SyloraTokens.champagneLight,
            SyloraTokens.champagne,
            SyloraTokens.softSkyDeep.withValues(alpha: 0.65),
          ],
          stops: const [0, 0.35, 0.72, 1],
        ).createShader(Rect.fromCircle(center: c, radius: coreR * 1.15)),
    );
    canvas.drawCircle(c, coreR * 0.42, Paint()..color = Colors.white);
    canvas.drawCircle(
      c,
      coreR * 1.45,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.01
        ..color = SyloraTokens.champagne.withValues(alpha: 0.45),
    );
  }

  Path _lemniscatePath(double scale) {
    final path = Path();
    const steps = 96;
    for (var i = 0; i <= steps; i++) {
      final u = (i / steps) * math.pi * 2;
      // Bernoulli lemniscate parametric form.
      final den = 1 + math.sin(u) * math.sin(u);
      final x = scale * math.cos(u) / den;
      final y = scale * math.sin(u) * math.cos(u) / den;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }

  @override
  bool shouldRepaint(covariant _InfinityCorePainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.living != living;
}
