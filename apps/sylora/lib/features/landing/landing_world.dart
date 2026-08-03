import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import 'landing_tokens.dart';

/// Scroll-driven living world behind the SYLORA core.
final class LandingWorldPainter extends CustomPainter {
  LandingWorldPainter({
    required this.progress,
    required this.time,
    required this.reducedMotion,
    required this.compact,
  });

  final double progress;
  final double time;
  final bool reducedMotion;
  final bool compact;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.42);
    final breath = reducedMotion ? 0.0 : math.sin(time * 1.2) * 0.5 + 0.5;

    _paintFloatingLight(canvas, size, center, breath);
    _paintMotes(canvas, size, center, breath);
    _paintPeople(canvas, size, center);
    _paintConversations(canvas, size, center);
    _paintMemoryThreads(canvas, size, center);
    _paintVoice(canvas, size, center);
    _paintGifts(canvas, size, center);
    _paintCommunity(canvas, size, center);
  }

  double _band(double start, double peak, double end) {
    if (progress < start || progress > end) {
      return 0;
    }
    if (progress <= peak) {
      return ((progress - start) / (peak - start)).clamp(0.0, 1.0);
    }
    return (1 - (progress - peak) / (end - peak)).clamp(0.0, 1.0);
  }

  double get _converge => ((progress - 0.82) / 0.18).clamp(0.0, 1.0);

  void _paintFloatingLight(Canvas canvas, Size size, Offset center, double breath) {
    final glow = Paint()
      ..shader = RadialGradient(
        colors: <Color>[
          LandingTokens.amberLight.withValues(alpha: 0.34 + breath * 0.08),
          LandingTokens.champagne.withValues(alpha: 0.12),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: size.shortestSide * 0.55));
    canvas.drawCircle(center, size.shortestSide * 0.55, glow);

    final secondary = Offset(
      size.width * 0.78,
      size.height * (0.18 + (reducedMotion ? 0 : math.sin(time * 0.7) * 0.02)),
    );
    canvas.drawCircle(
      secondary,
      size.shortestSide * 0.22,
      Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            LandingTokens.roseGold.withValues(alpha: 0.18),
            Colors.transparent,
          ],
        ).createShader(Rect.fromCircle(center: secondary, radius: size.shortestSide * 0.22)),
    );
  }

  void _paintMotes(Canvas canvas, Size size, Offset center, double breath) {
    final appear = _band(0.08, 0.22, 0.95) * (1 - _converge * 0.85);
    if (appear <= 0.01) {
      return;
    }
    final count = compact ? 14 : 22;
    final rng = math.Random(7);
    for (var i = 0; i < count; i++) {
      final angle = rng.nextDouble() * math.pi * 2;
      final dist = size.shortestSide * (0.12 + rng.nextDouble() * 0.38);
      final orbit = reducedMotion ? 0.0 : math.sin(time * 0.9 + i) * 8;
      final pull = 1 - _converge;
      final pos = Offset(
        center.dx + math.cos(angle + time * 0.08) * dist * pull + orbit * 0.2,
        center.dy + math.sin(angle + time * 0.08) * dist * pull,
      );
      final r = (2.0 + rng.nextDouble() * 3.5) * (0.7 + breath * 0.3);
      canvas.drawCircle(
        pos,
        r,
        Paint()..color = LandingTokens.amberLight.withValues(alpha: 0.55 * appear),
      );
    }
  }

  void _paintPeople(Canvas canvas, Size size, Offset center) {
    final appear = _band(0.18, 0.34, 0.92) * (1 - _converge);
    if (appear <= 0.01) {
      return;
    }
    final slots = compact
        ? const <Offset>[Offset(-0.28, -0.08), Offset(0.3, 0.02), Offset(-0.05, 0.22)]
        : const <Offset>[
            Offset(-0.32, -0.1),
            Offset(0.34, -0.04),
            Offset(-0.18, 0.2),
            Offset(0.2, 0.18),
            Offset(0.02, -0.24),
          ];
    for (var i = 0; i < slots.length; i++) {
      final slot = slots[i];
      final pos = Offset(
        center.dx + size.width * slot.dx * (1 - _converge * 0.9),
        center.dy + size.height * slot.dy * (1 - _converge * 0.9),
      );
      final radius = size.shortestSide * 0.045;
      canvas.drawCircle(
        pos,
        radius,
        Paint()..color = LandingTokens.pearl.withValues(alpha: 0.72 * appear),
      );
      canvas.drawCircle(
        pos,
        radius,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = LandingTokens.champagne.withValues(alpha: 0.8 * appear),
      );
      canvas.drawCircle(
        Offset(pos.dx, pos.dy - radius * 0.15),
        radius * 0.28,
        Paint()..color = LandingTokens.softClay.withValues(alpha: 0.55 * appear),
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(pos.dx, pos.dy + radius * 0.35),
            width: radius * 0.9,
            height: radius * 0.45,
          ),
          const Radius.circular(20),
        ),
        Paint()..color = LandingTokens.roseGold.withValues(alpha: 0.35 * appear),
      );
    }
  }

  void _paintConversations(Canvas canvas, Size size, Offset center) {
    final appear = _band(0.3, 0.44, 0.9) * (1 - _converge);
    if (appear <= 0.01) {
      return;
    }
    final bubbles = <(Offset, double)>[
      (Offset(-0.22, -0.16), 0.16),
      (Offset(0.2, -0.12), 0.13),
      (Offset(0.08, 0.14), 0.11),
    ];
    for (final bubble in bubbles) {
      final pos = Offset(
        center.dx + size.width * bubble.$1.dx * (1 - _converge),
        center.dy + size.height * bubble.$1.dy * (1 - _converge),
      );
      final w = size.shortestSide * bubble.$2;
      final h = w * 0.55;
      final rrect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: pos, width: w, height: h),
        Radius.circular(h),
      );
      canvas.drawRRect(
        rrect,
        Paint()..color = LandingTokens.pearl.withValues(alpha: 0.78 * appear),
      );
      canvas.drawRRect(
        rrect,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = LandingTokens.champagne.withValues(alpha: 0.7 * appear),
      );
      final linePaint = Paint()
        ..color = LandingTokens.softClay.withValues(alpha: 0.45 * appear)
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        Offset(pos.dx - w * 0.28, pos.dy - 2),
        Offset(pos.dx + w * 0.22, pos.dy - 2),
        linePaint,
      );
      canvas.drawLine(
        Offset(pos.dx - w * 0.28, pos.dy + 5),
        Offset(pos.dx + w * 0.08, pos.dy + 5),
        linePaint,
      );
    }
  }

  void _paintMemoryThreads(Canvas canvas, Size size, Offset center) {
    final appear = _band(0.4, 0.55, 0.9) * (1 - _converge);
    if (appear <= 0.01) {
      return;
    }
    final nodes = <Offset>[
      Offset(center.dx - size.width * 0.25, center.dy - size.height * 0.12),
      Offset(center.dx + size.width * 0.22, center.dy - size.height * 0.08),
      Offset(center.dx - size.width * 0.1, center.dy + size.height * 0.16),
      Offset(center.dx + size.width * 0.16, center.dy + size.height * 0.12),
    ];
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..color = LandingTokens.roseGold.withValues(alpha: 0.45 * appear);
    for (var i = 0; i < nodes.length; i++) {
      final from = Offset.lerp(nodes[i], center, _converge)!;
      final to = Offset.lerp(nodes[(i + 1) % nodes.length], center, _converge)!;
      final path = Path()
        ..moveTo(from.dx, from.dy)
        ..quadraticBezierTo(
          center.dx + math.sin(i + time) * 12,
          center.dy + math.cos(i + time) * 12,
          to.dx,
          to.dy,
        );
      canvas.drawPath(path, paint);
      canvas.drawCircle(
        from,
        3.5,
        Paint()..color = LandingTokens.amberLight.withValues(alpha: 0.7 * appear),
      );
    }
  }

  void _paintVoice(Canvas canvas, Size size, Offset center) {
    final appear = _band(0.42, 0.58, 0.88) * (1 - _converge);
    if (appear <= 0.01) {
      return;
    }
    final base = Offset(center.dx, center.dy + size.height * 0.2 * (1 - _converge));
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..color = LandingTokens.ink.withValues(alpha: 0.18 * appear);
    final path = Path();
    final width = size.shortestSide * 0.42;
    const steps = 36;
    for (var i = 0; i <= steps; i++) {
      final t = i / steps;
      final x = base.dx - width / 2 + width * t;
      final wave = reducedMotion
          ? math.sin(t * math.pi * 4) * 6
          : math.sin(t * math.pi * 6 + time * 3) * (8 + 4 * math.sin(time + t));
      final y = base.dy + wave * appear;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, paint);
  }

  void _paintGifts(Canvas canvas, Size size, Offset center) {
    final appear = _band(0.58, 0.72, 0.95) * (1 - _converge);
    if (appear <= 0.01) {
      return;
    }
    final gifts = <Offset>[
      Offset(-0.26, 0.1),
      Offset(0.28, 0.06),
      Offset(0.05, 0.22),
    ];
    for (final g in gifts) {
      final pos = Offset(
        center.dx + size.width * g.dx * (1 - _converge),
        center.dy + size.height * g.dy * (1 - _converge),
      );
      final side = size.shortestSide * 0.055;
      final rect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: pos, width: side, height: side),
        const Radius.circular(10),
      );
      canvas.drawRRect(
        rect,
        Paint()..color = LandingTokens.pearl.withValues(alpha: 0.85 * appear),
      );
      canvas.drawRRect(
        rect,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = LandingTokens.roseGold.withValues(alpha: 0.65 * appear),
      );
      canvas.drawLine(
        Offset(pos.dx - side * 0.35, pos.dy),
        Offset(pos.dx + side * 0.35, pos.dy),
        Paint()
          ..color = LandingTokens.amberLight.withValues(alpha: 0.8 * appear)
          ..strokeWidth = 1.6,
      );
      canvas.drawLine(
        Offset(pos.dx, pos.dy - side * 0.35),
        Offset(pos.dx, pos.dy + side * 0.35),
        Paint()
          ..color = LandingTokens.amberLight.withValues(alpha: 0.8 * appear)
          ..strokeWidth = 1.6,
      );
    }
  }

  void _paintCommunity(Canvas canvas, Size size, Offset center) {
    final appear = _band(0.66, 0.8, 0.98) * (1 - _converge * 0.7);
    if (appear <= 0.01) {
      return;
    }
    final ring = size.shortestSide * (0.28 * (1 - _converge * 0.85));
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = LandingTokens.champagne.withValues(alpha: 0.55 * appear);
    canvas.drawCircle(center, ring, paint);
    const nodes = 8;
    for (var i = 0; i < nodes; i++) {
      final angle = (i / nodes) * math.pi * 2 + (reducedMotion ? 0 : time * 0.15);
      final pos = Offset(
        center.dx + math.cos(angle) * ring,
        center.dy + math.sin(angle) * ring,
      );
      canvas.drawCircle(
        pos,
        4,
        Paint()..color = LandingTokens.roseGold.withValues(alpha: 0.65 * appear),
      );
    }
  }

  @override
  bool shouldRepaint(covariant LandingWorldPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.time != time ||
      oldDelegate.reducedMotion != reducedMotion ||
      oldDelegate.compact != compact;
}

/// The morphing center object — soft luminous mark that becomes the brand.
final class LandingCore extends StatelessWidget {
  const LandingCore({
    required this.progress,
    required this.time,
    required this.reducedMotion,
    super.key,
  });

  final double progress;
  final double time;
  final bool reducedMotion;

  @override
  Widget build(BuildContext context) {
    final converge = ((progress - 0.82) / 0.18).clamp(0.0, 1.0);
    final awaken = (progress / 0.2).clamp(0.0, 1.0);
    final pulse = reducedMotion ? 0.0 : math.sin(time * 1.4) * 0.5 + 0.5;
    final scale = 0.85 + awaken * 0.2 + pulse * 0.03 + converge * 0.15;
    final size = 120.0 + converge * 28;

    return Transform.scale(
      scale: scale,
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _CorePainter(
            progress: progress,
            time: time,
            reducedMotion: reducedMotion,
          ),
        ),
      ),
    );
  }
}

final class _CorePainter extends CustomPainter {
  _CorePainter({
    required this.progress,
    required this.time,
    required this.reducedMotion,
  });

  final double progress;
  final double time;
  final bool reducedMotion;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final converge = ((progress - 0.82) / 0.18).clamp(0.0, 1.0);
    final radius = size.shortestSide * 0.28;

    canvas.drawCircle(
      center,
      size.shortestSide * 0.48,
      Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            LandingTokens.amberLight.withValues(alpha: 0.45),
            LandingTokens.champagne.withValues(alpha: 0.12),
            Colors.transparent,
          ],
        ).createShader(Rect.fromCircle(center: center, radius: size.shortestSide * 0.48)),
    );

    // Glass disc
    canvas.drawCircle(
      center,
      size.shortestSide * 0.36,
      Paint()..color = LandingTokens.pearl.withValues(alpha: 0.55),
    );
    canvas.drawCircle(
      center,
      size.shortestSide * 0.36,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = Colors.white.withValues(alpha: 0.75),
    );

    // Morph from single soft orb into three-petal SYLORA mark
    final spread = 0.12 + converge * 0.14;
    final centers = <Offset>[
      Offset(center.dx - size.width * spread * 0.55, center.dy - size.height * spread * 0.35),
      Offset(center.dx + size.width * spread * 0.55, center.dy - size.height * spread * 0.35),
      Offset(center.dx, center.dy + size.height * spread * 0.45),
    ];
    final colors = <Color>[
      Color.lerp(LandingTokens.amberLight, const Color(0xFF2BB3B8), converge)!,
      Color.lerp(LandingTokens.roseGold, const Color(0xFFC9897A), converge)!,
      Color.lerp(LandingTokens.champagne, const Color(0xFFD4A574), converge)!,
    ];

    canvas.saveLayer(Offset.zero & size, Paint());
    for (var i = 0; i < 3; i++) {
      final drift = reducedMotion ? 0.0 : math.sin(time + i) * (1 - converge) * 2;
      canvas.drawCircle(
        centers[i].translate(drift, -drift),
        radius * (0.95 + converge * 0.1),
        Paint()
          ..color = colors[i].withValues(alpha: 0.55 + converge * 0.2)
          ..blendMode = BlendMode.multiply,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _CorePainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.time != time ||
      oldDelegate.reducedMotion != reducedMotion;
}

final class LandingGlassPanel extends StatelessWidget {
  const LandingGlassPanel({
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
    super.key,
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(24),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: LandingTokens.glassFill,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: LandingTokens.glassStroke),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: LandingTokens.ink.withValues(alpha: 0.04),
              blurRadius: 28,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Padding(padding: padding, child: child),
      ),
    ),
  );
}
