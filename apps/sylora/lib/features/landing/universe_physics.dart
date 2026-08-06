import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// GPU-friendly CPU particle field that coalesces into the SYLORA petal mark.
final class AetherField {
  AetherField({required this.count}) {
    final rnd = math.Random(42);
    for (var i = 0; i < count; i++) {
      final petal = i % 5;
      final angle = (petal / 5) * math.pi * 2 - math.pi / 2;
      final u = rnd.nextDouble();
      final v = rnd.nextDouble();
      final lx = (u - 0.5) * 0.42;
      final ly = (v * v) * 0.72 - 0.08;
      final ca = math.cos(angle);
      final sa = math.sin(angle);
      final tx = lx * ca - ly * sa;
      final ty = lx * sa + ly * ca;
      final a = rnd.nextDouble() * math.pi * 2;
      final r = 0.55 + rnd.nextDouble() * 1.35;
      particles.add(
        AetherParticle(
          x: math.cos(a) * r,
          y: math.sin(a) * r,
          vx: (rnd.nextDouble() - 0.5) * 0.2,
          vy: (rnd.nextDouble() - 0.5) * 0.2,
          tx: tx,
          ty: ty,
          seed: rnd.nextDouble() * 1000,
          petal: petal,
        ),
      );
    }
  }

  final int count;
  final List<AetherParticle> particles = <AetherParticle>[];
  double stage = 0;
  Offset pointer = Offset.zero;
  bool pointerActive = false;

  void tick(double dt, double t) {
    final form = ((t - 0.35) / 2.6).clamp(0.0, 1.0);
    final ease = form * form * (3 - 2 * form);
    stage = ease;
    for (final p in particles) {
      final wanderX = math.cos(t * 0.7 + p.seed) * 0.35;
      final wanderY = math.sin(t * 0.55 + p.seed * 1.3) * 0.28;
      final gx = p.tx * ease + wanderX * (1 - ease);
      final gy = p.ty * ease + wanderY * (1 - ease);
      var ax = (gx - p.x) * (0.9 + ease * 1.8);
      var ay = (gy - p.y) * (0.9 + ease * 1.8);
      if (pointerActive) {
        final dx = p.x - pointer.dx;
        final dy = p.y - pointer.dy;
        final dist2 = dx * dx + dy * dy + 0.0002;
        final force = 0.07 / dist2;
        ax += dx * force;
        ay += dy * force;
      }
      p.vx = (p.vx + ax * dt) * 0.86;
      p.vy = (p.vy + ay * dt) * 0.86;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
}

final class AetherParticle {
  AetherParticle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.tx,
    required this.ty,
    required this.seed,
    required this.petal,
  });

  double x;
  double y;
  double vx;
  double vy;
  final double tx;
  final double ty;
  final double seed;
  final int petal;
}

final class AetherPainter extends CustomPainter {
  AetherPainter({
    required this.field,
    required this.t,
    required this.reducedMotion,
  });

  final AetherField field;
  final double t;
  final bool reducedMotion;

  static const _palette = <Color>[
    Color(0xFFE6C88B), // gold
    Color(0xFF5EC8FF), // cyan
    Color(0xFF8B7CFF), // violet
    Color(0xFFF5DEB3), // gold light
    Color(0xFFDCEEFF), // soft sky
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width * 0.5;
    final cy = size.height * 0.42;
    final scale = math.min(size.width, size.height) * 0.38;
    final paint = Paint()..blendMode = BlendMode.srcOver;

    // Soft luminous core for Ethereal porcelain canvas
    final wave = Paint()
      ..shader = ui.Gradient.radial(
        Offset(cx, cy),
        scale * 1.8,
        const [
          Color(0x66FFFFFF),
          Color(0x335EC8FF),
          Color(0x00F4F6FA),
        ],
        const [0.0, 0.45, 1.0],
      );
    canvas.drawCircle(Offset(cx, cy), scale * 1.8, wave);

    final n = reducedMotion ? field.particles.length ~/ 3 : field.particles.length;
    for (var i = 0; i < n; i++) {
      final p = field.particles[i];
      final x = cx + p.x * scale;
      final y = cy + p.y * scale * 0.95;
      final pulse = 0.65 + 0.35 * math.sin(t * 2 + p.seed);
      final r = (1.35 + field.stage * 1.5) * pulse * (size.shortestSide / 900);
      paint.color = _palette[p.petal].withValues(alpha: 0.18 + field.stage * 0.42);
      canvas.drawCircle(Offset(x, y), r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant AetherPainter oldDelegate) => true;
}
