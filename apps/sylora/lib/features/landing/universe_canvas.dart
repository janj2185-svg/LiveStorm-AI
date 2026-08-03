import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'landing_tokens.dart';
import 'universe_physics.dart';

final class UniverseCanvasPainter extends CustomPainter {
  UniverseCanvasPainter({
    required this.physics,
    required this.progress,
    required this.time,
    required this.reducedMotion,
    required this.camera,
  });

  final UniversePhysics physics;
  final double progress;
  final double time;
  final bool reducedMotion;
  final Offset camera;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.48) - camera;
    final scale = size.shortestSide * 0.92;
    final collapse = _smooth((progress - 0.86) / 0.14);

    _paintDepthVeils(canvas, size, collapse);
    _paintLinks(canvas, center, scale, collapse);
    _paintParticles(canvas, center, scale, collapse);
    _paintMomentSilhouettes(canvas, center, scale, collapse);
    if (collapse > 0.35) {
      _paintEmergingMark(canvas, center, scale, collapse);
    }
  }

  void _paintDepthVeils(Canvas canvas, Size size, double collapse) {
    // Soft parallax discs — depth without cards.
    final layers = <(Offset, double, Color)>[
      (Offset(size.width * 0.2, size.height * 0.25), 140, LandingTokens.champagne),
      (Offset(size.width * 0.8, size.height * 0.3), 120, LandingTokens.roseGold),
      (Offset(size.width * 0.55, size.height * 0.7), 160, LandingTokens.amberLight),
    ];
    for (var i = 0; i < layers.length; i++) {
      final layer = layers[i];
      final parallax = camera * (0.15 + i * 0.08);
      final pos = layer.$1 - parallax;
      final alpha = (0.08 + 0.04 * math.sin(time * 0.6 + i)) * (1 - collapse * 0.7);
      canvas.drawCircle(
        pos,
        layer.$2,
        Paint()
          ..shader = ui.Gradient.radial(
            pos,
            layer.$2,
            <Color>[
              layer.$3.withValues(alpha: alpha),
              layer.$3.withValues(alpha: 0),
            ],
          ),
      );
    }
  }

  void _paintLinks(Canvas canvas, Offset center, double scale, double collapse) {
    if (physics.links.isEmpty) {
      return;
    }
    for (final link in physics.links) {
      final a = physics.particles[link.$1];
      final b = physics.particles[link.$2];
      if (a.energy <= 0.05 || b.energy <= 0.05) {
        continue;
      }
      final p1 = center + a.pos.scale(scale, scale);
      final p2 = center + b.pos.scale(scale, scale);
      final mid = Offset.lerp(p1, p2, 0.5)!;
      final bend = Offset(
        (p2.dy - p1.dy) * 0.08,
        (p1.dx - p2.dx) * 0.08,
      );
      final path = Path()
        ..moveTo(p1.dx, p1.dy)
        ..quadraticBezierTo(
          mid.dx + bend.dx,
          mid.dy + bend.dy,
          p2.dx,
          p2.dy,
        );
      final alpha = link.$3 * 0.35 * (1 - collapse * 0.85) * math.min(a.energy, b.energy);
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.1 + link.$3
          ..strokeCap = StrokeCap.round
          ..color = LandingTokens.roseGold.withValues(alpha: alpha),
      );
    }
  }

  void _paintParticles(Canvas canvas, Offset center, double scale, double collapse) {
    for (final p in physics.particles) {
      if (p.energy <= 0.02) {
        continue;
      }
      final pos = center + p.pos.scale(scale, scale);
      final breath = reducedMotion ? 0.0 : math.sin(time * 1.6 + p.id) * 0.5 + 0.5;
      final radius = p.size * (1.15 + breath * 0.28) * (1 + collapse * 0.55);
      final color = _colorFor(p);
      final glow = radius * (3.8 + breath * 1.2);

      canvas.drawCircle(
        pos,
        glow,
        Paint()
          ..shader = ui.Gradient.radial(
            pos,
            glow,
            <Color>[
              color.withValues(alpha: 0.32 * p.energy),
              color.withValues(alpha: 0.08 * p.energy),
              color.withValues(alpha: 0),
            ],
            const <double>[0, 0.45, 1],
          ),
      );

      if (p.role == ParticleRole.person) {
        _paintPerson(canvas, pos, radius * 2.2, color, p.energy * (1 - collapse * 0.5));
      } else if (p.role == ParticleRole.gift) {
        _paintGift(canvas, pos, radius * 2.4, p.energy * (1 - collapse * 0.6));
      } else {
        canvas.drawCircle(
          pos,
          radius,
          Paint()..color = color.withValues(alpha: 0.55 + p.energy * 0.35),
        );
        canvas.drawCircle(
          pos,
          radius * 0.45,
          Paint()..color = LandingTokens.pearl.withValues(alpha: 0.55 * p.energy),
        );
      }
    }
  }

  void _paintPerson(Canvas canvas, Offset pos, double r, Color color, double energy) {
    if (energy <= 0.05) {
      return;
    }
    canvas.drawCircle(
      pos,
      r,
      Paint()..color = LandingTokens.pearl.withValues(alpha: 0.55 * energy),
    );
    canvas.drawCircle(
      pos,
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = color.withValues(alpha: 0.55 * energy),
    );
    canvas.drawCircle(
      Offset(pos.dx, pos.dy - r * 0.18),
      r * 0.28,
      Paint()..color = LandingTokens.softClay.withValues(alpha: 0.5 * energy),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(pos.dx, pos.dy + r * 0.32),
          width: r * 0.85,
          height: r * 0.42,
        ),
        Radius.circular(r),
      ),
      Paint()..color = LandingTokens.roseGold.withValues(alpha: 0.35 * energy),
    );
  }

  void _paintGift(Canvas canvas, Offset pos, double r, double energy) {
    if (energy <= 0.05) {
      return;
    }
    final rect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: pos, width: r * 1.5, height: r * 1.5),
      Radius.circular(r * 0.35),
    );
    canvas.drawRRect(
      rect,
      Paint()..color = LandingTokens.pearl.withValues(alpha: 0.7 * energy),
    );
    canvas.drawRRect(
      rect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = LandingTokens.roseGold.withValues(alpha: 0.65 * energy),
    );
    final ribbon = Paint()
      ..color = LandingTokens.amberLight.withValues(alpha: 0.85 * energy)
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(pos.dx - r * 0.55, pos.dy), Offset(pos.dx + r * 0.55, pos.dy), ribbon);
    canvas.drawLine(Offset(pos.dx, pos.dy - r * 0.55), Offset(pos.dx, pos.dy + r * 0.55), ribbon);
  }

  void _paintMomentSilhouettes(Canvas canvas, Offset center, double scale, double collapse) {
    // Soft speech petals — not cards, just luminous forms.
    final speak = _smooth((progress - 0.40) / 0.16) * (1 - collapse);
    if (speak > 0.05) {
      for (var i = 0; i < 3; i++) {
        final t = i / 2;
        final wobble = reducedMotion ? 0.0 : math.sin(time * 1.4 + i) * 6;
        final pos = center + Offset((-0.18 + t * 0.2) * scale, (-0.18 + wobble / scale) * scale * 0.15);
        final w = scale * (0.1 + i * 0.02);
        final h = w * 0.55;
        final rrect = RRect.fromRectAndRadius(
          Rect.fromCenter(center: pos, width: w, height: h),
          Radius.circular(h),
        );
        canvas.drawRRect(
          rrect,
          Paint()..color = LandingTokens.pearl.withValues(alpha: 0.35 * speak),
        );
        canvas.drawRRect(
          rrect,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1
            ..color = LandingTokens.champagne.withValues(alpha: 0.45 * speak),
        );
      }
    }

    // Voice ribbon.
    final voice = _smooth((progress - 0.42) / 0.18) * (1 - collapse);
    if (voice > 0.05) {
      final path = Path();
      const steps = 48;
      for (var i = 0; i <= steps; i++) {
        final t = i / steps;
        final x = center.dx + (t - 0.5) * scale * 0.62;
        final wave = math.sin(t * math.pi * 7 + time * 3.2) * 10 * voice;
        final y = center.dy + scale * 0.2 + wave;
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round
          ..color = LandingTokens.ink.withValues(alpha: 0.16 * voice),
      );
    }
  }

  void _paintEmergingMark(Canvas canvas, Offset center, double scale, double collapse) {
    final radius = scale * 0.09 * (0.7 + collapse * 0.5);
    final spread = 0.08 + collapse * 0.04;
    final centers = <Offset>[
      center + Offset(-scale * spread, -scale * spread * 0.55),
      center + Offset(scale * spread, -scale * spread * 0.55),
      center + Offset(0, scale * spread * 0.7),
    ];
    final colors = <Color>[
      const Color(0xFF2BB3B8).withValues(alpha: 0.45 * collapse),
      LandingTokens.roseGold.withValues(alpha: 0.5 * collapse),
      LandingTokens.amberLight.withValues(alpha: 0.55 * collapse),
    ];

    canvas.drawCircle(
      center,
      radius * 2.8,
      Paint()
        ..shader = ui.Gradient.radial(
          center,
          radius * 2.8,
          <Color>[
            LandingTokens.pearl.withValues(alpha: 0.35 * collapse),
            LandingTokens.pearl.withValues(alpha: 0),
          ],
        ),
    );

    canvas.saveLayer(null, Paint());
    for (var i = 0; i < 3; i++) {
      canvas.drawCircle(
        centers[i],
        radius,
        Paint()
          ..color = colors[i]
          ..blendMode = BlendMode.multiply,
      );
    }
    canvas.restore();
  }

  Color _colorFor(UniverseParticle p) {
    return switch (p.role) {
      ParticleRole.spark => Color.lerp(LandingTokens.champagne, LandingTokens.amberLight, p.hue)!,
      ParticleRole.memory => LandingTokens.roseGold,
      ParticleRole.voice => LandingTokens.ink.withValues(alpha: 0.55),
      ParticleRole.person => LandingTokens.softClay,
      ParticleRole.gift => LandingTokens.amberLight,
      ParticleRole.community => const Color(0xFF2BB3B8),
    };
  }

  static double _smooth(double t) {
    final x = t.clamp(0.0, 1.0);
    return x * x * (3 - 2 * x);
  }

  @override
  bool shouldRepaint(covariant UniverseCanvasPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.time != time ||
      oldDelegate.camera != camera ||
      oldDelegate.reducedMotion != reducedMotion ||
      !identical(oldDelegate.physics, physics);
}
