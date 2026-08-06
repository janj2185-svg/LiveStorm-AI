import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'lumen_theme.dart';

/// Soft pearl / gold / sky / lavender field that never sits still.
final class LivingAtmosphere extends ConsumerStatefulWidget {
  const LivingAtmosphere({
    super.key,
    this.intensity = 1,
    this.child,
  });

  final double intensity;
  final Widget? child;

  @override
  ConsumerState<LivingAtmosphere> createState() => _LivingAtmosphereState();
}

final class _LivingAtmosphereState extends ConsumerState<LivingAtmosphere>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        const ColoredBox(color: LumenColors.porcelainCanvas),
        if (!reduced)
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) => CustomPaint(
              painter: _AtmospherePainter(
                t: _controller.value,
                intensity: widget.intensity,
              ),
            ),
          )
        else
          CustomPaint(
            painter: _AtmospherePainter(
              t: 0.12,
              intensity: widget.intensity * 0.55,
            ),
          ),
        if (widget.child != null) widget.child!,
      ],
    );
  }
}

final class _AtmospherePainter extends CustomPainter {
  const _AtmospherePainter({required this.t, required this.intensity});

  final double t;
  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    final orbs = <(Offset, double, Color)>[
      (
        Offset(
          size.width * (0.18 + 0.04 * math.sin(t * math.pi * 2)),
          size.height * (0.22 + 0.05 * math.cos(t * math.pi * 2)),
        ),
        size.shortestSide * 0.55,
        const Color(0x66B8E4F5),
      ),
      (
        Offset(
          size.width * (0.78 + 0.05 * math.cos(t * math.pi * 2 + 1)),
          size.height * (0.28 + 0.04 * math.sin(t * math.pi * 2 + 0.6)),
        ),
        size.shortestSide * 0.48,
        const Color(0x55D9C7F7),
      ),
      (
        Offset(
          size.width * (0.55 + 0.06 * math.sin(t * math.pi * 2 + 2.1)),
          size.height * (0.72 + 0.05 * math.cos(t * math.pi * 2 + 1.4)),
        ),
        size.shortestSide * 0.62,
        const Color(0x44F0D9A0),
      ),
      (
        Offset(
          size.width * (0.32 + 0.03 * math.cos(t * math.pi * 2 + 3)),
          size.height * (0.58 + 0.04 * math.sin(t * math.pi * 2 + 2.4)),
        ),
        size.shortestSide * 0.36,
        const Color(0x33FFFFFF),
      ),
    ];

    for (final orb in orbs) {
      final paint = Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            orb.$3.withValues(alpha: orb.$3.a * intensity),
            orb.$3.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: orb.$1, radius: orb.$2));
      canvas.drawCircle(orb.$1, orb.$2, paint);
    }

    final wave = Path();
    for (var x = 0.0; x <= size.width; x += 8) {
      final y =
          size.height * 0.42 +
          math.sin((x / size.width) * math.pi * 2 + t * math.pi * 2) *
              18 *
              intensity +
          math.cos((x / size.width) * math.pi * 4 - t * math.pi * 2) *
              8 *
              intensity;
      if (x == 0) {
        wave.moveTo(x, y);
      } else {
        wave.lineTo(x, y);
      }
    }
    canvas.drawPath(
      wave,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..color = const Color(0x33A7C8E8),
    );

    final rng = math.Random(42);
    for (var i = 0; i < 28; i++) {
      final baseX = rng.nextDouble() * size.width;
      final baseY = rng.nextDouble() * size.height;
      final drift = math.sin(t * math.pi * 2 + i) * 10 * intensity;
      canvas.drawCircle(
        Offset(baseX + drift, baseY - drift * 0.6),
        1.2 + (i % 3) * 0.6,
        Paint()
          ..color = Color.lerp(
            const Color(0x88FFFFFF),
            const Color(0x66E8D4A8),
            (i % 5) / 5,
          )!,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _AtmospherePainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.intensity != intensity;
}

/// Frosted liquid-glass panel for interactive surfaces.
final class GlassPanel extends StatelessWidget {
  const GlassPanel({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(20),
    this.radius = 24,
    this.blur = 18,
    this.opacity = 0.72,
    this.border = true,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final double blur;
  final double opacity;
  final bool border;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(radius),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: dark
                  ? <Color>[
                      Colors.white.withValues(alpha: 0.08),
                      Colors.white.withValues(alpha: 0.03),
                    ]
                  : <Color>[
                      Colors.white.withValues(alpha: opacity),
                      const Color(0xFFF8F4FF).withValues(alpha: opacity * 0.85),
                      const Color(0xFFFFF8EC).withValues(alpha: opacity * 0.9),
                    ],
            ),
            border: border
                ? Border.all(
                    color: dark
                        ? Colors.white.withValues(alpha: 0.12)
                        : const Color(0x66FFFFFF),
                  )
                : null,
            boxShadow: dark
                ? null
                : const <BoxShadow>[
                    BoxShadow(
                      color: Color(0x142C405A),
                      blurRadius: 28,
                      offset: Offset(0, 12),
                    ),
                  ],
          ),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(radius),
              splashColor: LumenColors.aether.withValues(alpha: 0.08),
              highlightColor: LumenColors.pulse.withValues(alpha: 0.04),
              child: Padding(padding: padding, child: child),
            ),
          ),
        ),
      ),
    );
  }
}

/// Animated three-lens mark with orbits, particles and soft bloom.
final class LivingSyloraLogo extends ConsumerStatefulWidget {
  const LivingSyloraLogo({
    super.key,
    this.size = 96,
    this.showWordmark = false,
    this.pulse = true,
  });

  final double size;
  final bool showWordmark;
  final bool pulse;

  @override
  ConsumerState<LivingSyloraLogo> createState() => _LivingSyloraLogoState();
}

final class _LivingSyloraLogoState extends ConsumerState<LivingSyloraLogo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    final mark = Semantics(
      label: 'SYLORA',
      image: true,
      child: SizedBox.square(
        dimension: widget.size,
        child: reduced
            ? SyloraLogo(size: widget.size)
            : AnimatedBuilder(
                animation: _controller,
                builder: (context, child) => CustomPaint(
                  painter: _LivingLogoPainter(
                    t: _controller.value,
                    pulse: widget.pulse,
                    dark: Theme.of(context).brightness == Brightness.dark,
                  ),
                ),
              ),
      ),
    );
    if (!widget.showWordmark) return mark;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        mark,
        SizedBox(width: widget.size * 0.18),
        Text(
          'SYLORA',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            letterSpacing: 1.4,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

final class _LivingLogoPainter extends CustomPainter {
  const _LivingLogoPainter({
    required this.t,
    required this.pulse,
    required this.dark,
  });

  final double t;
  final bool pulse;
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final orbitR = size.shortestSide * 0.42;
    final glow =
        size.shortestSide *
        (0.48 + (pulse ? 0.04 * math.sin(t * math.pi * 2) : 0));

    canvas.drawCircle(
      center,
      glow,
      Paint()
        ..shader = RadialGradient(
          colors: const <Color>[
            Color(0x55F0D9A0),
            Color(0x33B8E4F5),
            Color(0x00FFFFFF),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: glow)),
    );

    for (var i = 0; i < 3; i++) {
      final rot = t * math.pi * 2 * (i.isEven ? 1 : -1) + i * 0.9;
      final path = Path();
      for (var a = 0.0; a <= math.pi * 2 + 0.05; a += 0.08) {
        final x = center.dx + math.cos(a + rot) * orbitR * (1 - i * 0.08);
        final y =
            center.dy + math.sin(a + rot) * orbitR * (0.62 + i * 0.08);
        if (a == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = Color.lerp(
            const Color(0x55A7C8E8),
            const Color(0x55D9C7F7),
            i / 2,
          )!.withValues(alpha: 0.45),
      );
      final particleAngle = rot + t * math.pi * 4;
      final px = center.dx + math.cos(particleAngle) * orbitR * (0.9 - i * 0.1);
      final py =
          center.dy + math.sin(particleAngle) * orbitR * (0.55 + i * 0.08);
      canvas.drawCircle(
        Offset(px, py),
        2.2,
        Paint()..color = const Color(0xEEF0D9A0),
      );
    }

    final radius = size.shortestSide * 0.27;
    final centers = <Offset>[
      Offset(size.width * 0.39, size.height * 0.38),
      Offset(size.width * 0.61, size.height * 0.38),
      Offset(size.width * 0.5, size.height * 0.59),
    ];
    final colors = dark
        ? const <Color>[
            LumenColors.aetherBright,
            Color(0xFF9D8BE8),
            Color(0xFFF06AB4),
          ]
        : const <Color>[
            Color(0xFF18A7B5),
            LumenColors.pulse,
            LumenColors.bloom,
          ];
    canvas.saveLayer(Offset.zero & size, Paint());
    for (var index = 0; index < centers.length; index++) {
      canvas.drawCircle(
        centers[index],
        radius,
        Paint()
          ..color = colors[index].withValues(alpha: dark ? 0.75 : 0.7)
          ..blendMode = dark ? BlendMode.screen : BlendMode.multiply,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _LivingLogoPainter oldDelegate) =>
      oldDelegate.t != t ||
      oldDelegate.pulse != pulse ||
      oldDelegate.dark != dark;
}
