import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'sylora_tokens.dart';

/// Living light world used behind every SYLORA surface.
final class SyloraLivingCanvas extends StatefulWidget {
  const SyloraLivingCanvas({
    required this.child,
    super.key,
    this.intensity = 1,
    this.showOrbits = true,
  });

  final Widget child;
  final double intensity;
  final bool showOrbits;

  @override
  State<SyloraLivingCanvas> createState() => _SyloraLivingCanvasState();
}

final class _SyloraLivingCanvasState extends State<SyloraLivingCanvas>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  Duration _elapsed = Duration.zero;
  Offset? _pointer;
  bool _reduced = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((d) {
      _elapsed = d;
      if (mounted) setState(() {});
    })..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _reduced = refReducedMotion(context);
    final t = _elapsed.inMilliseconds / 1000;
    return Listener(
      onPointerHover: (e) => setState(() => _pointer = e.localPosition),
      onPointerMove: (e) => setState(() => _pointer = e.localPosition),
      onPointerUp: (_) => setState(() => _pointer = null),
      onPointerCancel: (_) => setState(() => _pointer = null),
      child: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(gradient: SyloraTokens.heroGradient),
          ),
          CustomPaint(
            painter: _LivingPainter(
              t: t,
              pointer: _pointer,
              reduced: _reduced,
              intensity: widget.intensity,
              showOrbits: widget.showOrbits,
            ),
            size: Size.infinite,
          ),
          widget.child,
        ],
      ),
    );
  }

  bool refReducedMotion(BuildContext context) {
    // Avoid Riverpod dependency here — read MediaQuery / platform.
    return MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.maybeOf(context)?.disableAnimations == true;
  }
}

final class _LivingPainter extends CustomPainter {
  _LivingPainter({
    required this.t,
    required this.pointer,
    required this.reduced,
    required this.intensity,
    required this.showOrbits,
  });

  final double t;
  final Offset? pointer;
  final bool reduced;
  final double intensity;
  final bool showOrbits;

  static const _palette = <Color>[
    SyloraTokens.ion,
    SyloraTokens.violet,
    SyloraTokens.petal,
    SyloraTokens.aqua,
    SyloraTokens.mist,
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width * 0.5 + (pointer?.dx ?? size.width * 0.5 - size.width * 0.5) * 0.02;
    final cy = size.height * 0.42 + ((pointer?.dy ?? size.height * 0.42) - size.height * 0.42) * 0.02;
    final scale = math.min(size.width, size.height);

    // Soft luminous blobs
    final blobs = <(Offset, Color, double)>[
      (Offset(size.width * 0.18, size.height * 0.2), SyloraTokens.ion, 0.34),
      (Offset(size.width * 0.82, size.height * 0.18), SyloraTokens.petal, 0.28),
      (Offset(size.width * 0.55, size.height * 0.78), SyloraTokens.violet, 0.36),
      (Offset(size.width * 0.25, size.height * 0.72), SyloraTokens.aqua, 0.22),
    ];
    for (var i = 0; i < blobs.length; i++) {
      final (origin, color, radiusFactor) = blobs[i];
      final drift = Offset(
        math.sin(t * 0.35 + i) * 18 * intensity,
        math.cos(t * 0.28 + i) * 14 * intensity,
      );
      final paint = Paint()
        ..shader = ui.Gradient.radial(
          origin + drift,
          scale * radiusFactor,
          [
            color.withValues(alpha: 0.18 * intensity),
            color.withValues(alpha: 0),
          ],
        );
      canvas.drawCircle(origin + drift, scale * radiusFactor, paint);
    }

    // Light waves
    if (!reduced) {
      for (var i = 0; i < 3; i++) {
        final y = size.height * (0.28 + i * 0.18) + math.sin(t * 0.5 + i) * 12;
        final path = Path()..moveTo(0, y);
        for (var x = 0.0; x <= size.width; x += 16) {
          path.lineTo(
            x,
            y + math.sin(x * 0.012 + t * (0.7 + i * 0.12) + i) * (8 + i * 3),
          );
        }
        path
          ..lineTo(size.width, y + 70)
          ..lineTo(0, y + 70)
          ..close();
        canvas.drawPath(
          path,
          Paint()
            ..shader = ui.Gradient.linear(
              Offset(0, y),
              Offset(size.width, y + 40),
              [
                SyloraTokens.violet.withValues(alpha: 0.035 * intensity),
                SyloraTokens.aqua.withValues(alpha: 0.04 * intensity),
                SyloraTokens.petal.withValues(alpha: 0.02 * intensity),
              ],
            ),
        );
      }
    }

    // Particles
    final count = reduced ? 28 : (size.shortestSide < 420 ? 54 : 90);
    final rnd = math.Random(7);
    for (var i = 0; i < count; i++) {
      final seed = rnd.nextDouble() * math.pi * 2;
      final orbit = 0.12 + (i % 7) * 0.05;
      final ang = seed + t * (0.15 + (i % 5) * 0.03);
      var x = cx + math.cos(ang) * scale * orbit;
      var y = cy + math.sin(ang) * scale * orbit * 0.62;
      if (pointer != null) {
        final dx = x - pointer!.dx;
        final dy = y - pointer!.dy;
        final d2 = dx * dx + dy * dy + 40;
        x += dx * 120 / d2;
        y += dy * 120 / d2;
      }
      final color = _palette[i % _palette.length];
      canvas.drawCircle(
        Offset(x, y),
        1.2 + (i % 3) * 0.7,
        Paint()..color = color.withValues(alpha: 0.22 + (i % 4) * 0.06),
      );
    }

    if (showOrbits && !reduced) {
      for (var r = 0; r < 3; r++) {
        canvas.drawCircle(
          Offset(cx, cy),
          scale * (0.16 + r * 0.07),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1
            ..color = SyloraTokens.violet.withValues(alpha: 0.08 + r * 0.02),
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _LivingPainter oldDelegate) => true;
}

/// Convenience scaffold with living world + optional safe area.
final class SyloraLivingScaffold extends StatelessWidget {
  const SyloraLivingScaffold({
    required this.child,
    super.key,
    this.safe = true,
    this.intensity = 1,
  });

  final Widget child;
  final bool safe;
  final double intensity;

  @override
  Widget build(BuildContext context) {
    final body = safe ? SafeArea(child: child) : child;
    return Scaffold(
      backgroundColor: SyloraTokens.canvas,
      body: SyloraLivingCanvas(intensity: intensity, child: body),
    );
  }
}
