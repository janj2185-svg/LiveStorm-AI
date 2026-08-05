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

/// Lumen Gate — living brand mark (twin crescents + filament + diamond core).
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
      duration: const Duration(milliseconds: 6800),
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
            painter: _LumenGatePainter(
              t: widget.animated ? _controller.value : 0.22,
              living: widget.animated,
            ),
          ),
        ),
      ),
    );
  }
}

final class _LumenGatePainter extends CustomPainter {
  const _LumenGatePainter({required this.t, required this.living});

  final double t;
  final bool living;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final ox = size.width / 2 - s / 2;
    final oy = size.height / 2 - s / 2;
    canvas.translate(ox, oy);

    final breath = living ? 0.5 + 0.5 * math.sin(t * math.pi * 2) : 0.55;
    final pulse = living ? 0.5 + 0.5 * math.sin(t * math.pi * 4) : 0.5;
    final gate = living ? 0.5 + 0.5 * math.sin(t * math.pi * 2 * 0.72) : 0.5;
    final open = living ? 1 + 0.028 * gate : 1.0;

    // Soft light wash behind the gate.
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(s * 0.5, s * 0.5),
        width: s * (0.72 + 0.06 * breath),
        height: s * (0.88 + 0.04 * breath),
      ),
      Paint()
        ..color = SyloraTokens.champagne.withValues(alpha: 0.1 + 0.08 * breath)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.08),
    );

    // Expanding light waves (elegant, not busy).
    if (living) {
      for (var i = 0; i < 2; i++) {
        final phase = (t + i * 0.45) % 1.0;
        final w = s * (0.34 + phase * 0.36);
        final h = s * (0.42 + phase * 0.4);
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(s * 0.5, s * 0.5),
            width: w,
            height: h,
          ),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = s * 0.01
            ..color = SyloraTokens.champagne.withValues(alpha: (1 - phase) * 0.22),
        );
      }
    }

    canvas.save();
    canvas.translate(s * 0.5, s * 0.5);
    canvas.scale(open, 1);
    canvas.translate(-s * 0.5, -s * 0.5);

    final left = _leftArc(s);
    final right = _rightArc(s);

    // Soft outer stroke
    final soft = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.07
      ..strokeCap = StrokeCap.round
      ..color = SyloraTokens.champagne.withValues(alpha: 0.22)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.025);
    canvas.drawPath(left, soft);
    canvas.drawPath(right, soft);

    final leftPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.032
      ..strokeCap = StrokeCap.round
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: const [
          SyloraTokens.champagneLight,
          SyloraTokens.champagne,
          SyloraTokens.softSkyDeep,
        ],
      ).createShader(Rect.fromLTWH(0, 0, s, s));
    final rightPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.032
      ..strokeCap = StrokeCap.round
      ..shader = LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: const [
          SyloraTokens.softSky,
          SyloraTokens.champagne,
          SyloraTokens.champagneDeep,
        ],
      ).createShader(Rect.fromLTWH(0, 0, s, s));
    canvas.drawPath(left, leftPaint);
    canvas.drawPath(right, rightPaint);
    canvas.restore();

    // Vertical filament with traveling energy.
    final filament = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.02
      ..strokeCap = StrokeCap.round
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          SyloraTokens.softSkyDeep,
          SyloraTokens.champagneLight,
          Colors.white,
          SyloraTokens.champagne,
          SyloraTokens.champagneDeep,
        ],
        stops: const [0, 0.35, 0.5, 0.72, 1],
      ).createShader(Rect.fromLTWH(s * 0.48, s * 0.12, s * 0.04, s * 0.76));
    canvas.drawLine(
      Offset(s * 0.5, s * 0.14),
      Offset(s * 0.5, s * 0.86),
      filament,
    );
    canvas.drawLine(
      Offset(s * 0.5, s * 0.22),
      Offset(s * 0.5, s * 0.78),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.007
        ..strokeCap = StrokeCap.round
        ..color = Colors.white.withValues(alpha: 0.7 + 0.2 * pulse),
    );

    // Traveling spark along filament.
    if (living) {
      final y = s * (0.2 + 0.6 * ((t * 1.15) % 1.0));
      canvas.drawCircle(
        Offset(s * 0.5, y),
        s * 0.018,
        Paint()
          ..color = Colors.white
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.02),
      );
    }

    // Diamond nucleus.
    final core = s * (0.078 + 0.012 * breath);
    final diamond = Path()
      ..moveTo(s * 0.5, s * 0.5 - core)
      ..lineTo(s * 0.5 + core * 0.72, s * 0.5)
      ..lineTo(s * 0.5, s * 0.5 + core)
      ..lineTo(s * 0.5 - core * 0.72, s * 0.5)
      ..close();
    canvas.drawPath(
      diamond,
      Paint()
        ..color = SyloraTokens.champagne.withValues(alpha: 0.28 + 0.18 * breath)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.04),
    );
    canvas.drawPath(
      diamond,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.white,
            SyloraTokens.champagneLight,
            SyloraTokens.champagne,
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(s * 0.5, s * 0.5), radius: core),
        ),
    );
    final inner = core * 0.38;
    canvas.drawPath(
      Path()
        ..moveTo(s * 0.5, s * 0.5 - inner)
        ..lineTo(s * 0.5 + inner * 0.7, s * 0.5)
        ..lineTo(s * 0.5, s * 0.5 + inner)
        ..lineTo(s * 0.5 - inner * 0.7, s * 0.5)
        ..close(),
      Paint()..color = Colors.white,
    );

    // Endpoint nodes.
    final nodes = <Offset>[
      Offset(s * 0.36, s * 0.17),
      Offset(s * 0.64, s * 0.156),
      Offset(s * 0.41, s * 0.84),
      Offset(s * 0.59, s * 0.86),
    ];
    for (final n in nodes) {
      canvas.drawCircle(
        n,
        s * 0.016,
        Paint()..color = SyloraTokens.champagneLight.withValues(alpha: 0.9),
      );
    }

    // Orbiting motes (sparse).
    if (living) {
      for (var i = 0; i < 4; i++) {
        final a = t * math.pi * 2 * (0.7 + i * 0.08) + i * 1.4;
        final rx = s * (0.28 + 0.04 * math.sin(t * 6 + i));
        final ry = s * (0.36 + 0.03 * math.cos(t * 5 + i));
        final p = Offset(s * 0.5 + math.cos(a) * rx, s * 0.5 + math.sin(a) * ry);
        canvas.drawCircle(
          p,
          s * 0.009,
          Paint()
            ..color = Colors.white.withValues(alpha: 0.45 + 0.35 * breath)
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.008),
        );
      }
    }
  }

  Path _leftArc(double s) {
    return Path()
      ..moveTo(s * 0.36, s * 0.17)
      ..cubicTo(
        s * 0.22,
        s * 0.28,
        s * 0.17,
        s * 0.42,
        s * 0.19,
        s * 0.52,
      )
      ..cubicTo(
        s * 0.2,
        s * 0.64,
        s * 0.28,
        s * 0.76,
        s * 0.41,
        s * 0.84,
      );
  }

  Path _rightArc(double s) {
    return Path()
      ..moveTo(s * 0.64, s * 0.156)
      ..cubicTo(
        s * 0.78,
        s * 0.27,
        s * 0.83,
        s * 0.41,
        s * 0.81,
        s * 0.52,
      )
      ..cubicTo(
        s * 0.8,
        s * 0.66,
        s * 0.7,
        s * 0.78,
        s * 0.59,
        s * 0.86,
      );
  }

  @override
  bool shouldRepaint(covariant _LumenGatePainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.living != living;
}
