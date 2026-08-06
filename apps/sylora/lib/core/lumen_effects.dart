import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'lumen_theme.dart';

/// Frosted glass surface matching the Lumen vellum recipe.
final class LumenVellum extends StatelessWidget {
  const LumenVellum({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(20),
    this.radius = 20,
    this.sigma = 18,
    this.opacity = 0.72,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final double sigma;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(radius),
            color: (dark ? LumenColors.darkSurface : Colors.white)
                .withValues(alpha: opacity),
            border: Border.all(
              color: (dark ? LumenColors.darkBorder : Colors.white)
                  .withValues(alpha: dark ? 0.35 : 0.55),
            ),
            boxShadow: dark
                ? null
                : const <BoxShadow>[
                    BoxShadow(
                      color: Color(0x142C405A),
                      blurRadius: 32,
                      offset: Offset(0, 12),
                    ),
                  ],
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// Ambient living gradient field with slow orbital motion.
final class LumenLivingBackground extends StatefulWidget {
  const LumenLivingBackground({
    required this.child,
    super.key,
    this.reducedMotion = false,
  });

  final Widget child;
  final bool reducedMotion;

  @override
  State<LumenLivingBackground> createState() => _LumenLivingBackgroundState();
}

final class _LumenLivingBackgroundState extends State<LumenLivingBackground>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  double _phase = 0;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      if (!widget.reducedMotion && mounted) {
        setState(() => _phase = elapsed.inMilliseconds / 12000);
      }
    });
    if (!widget.reducedMotion) {
      _ticker.start();
    }
  }

  @override
  void didUpdateWidget(covariant LumenLivingBackground oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.reducedMotion) {
      _ticker.stop();
    } else if (!_ticker.isActive) {
      _ticker.start();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        CustomPaint(
          painter: _LumenFieldPainter(phase: _phase, dark: dark),
        ),
        widget.child,
      ],
    );
  }
}

final class _LumenFieldPainter extends CustomPainter {
  const _LumenFieldPainter({required this.phase, required this.dark});

  final double phase;
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final base = dark ? LumenColors.darkCanvas : LumenColors.porcelainCanvas;
    canvas.drawRect(Offset.zero & size, Paint()..color = base);

    final orbs = <_Orb>[
      _Orb(
        color: const Color(0xFF42C6D5),
        cx: 0.18 + math.sin(phase * math.pi * 2) * 0.04,
        cy: 0.22 + math.cos(phase * math.pi * 2) * 0.03,
        radius: size.shortestSide * 0.42,
      ),
      _Orb(
        color: const Color(0xFF9D8BE8),
        cx: 0.78 + math.cos(phase * math.pi * 2 + 1) * 0.05,
        cy: 0.28 + math.sin(phase * math.pi * 2 + 0.5) * 0.04,
        radius: size.shortestSide * 0.38,
      ),
      _Orb(
        color: const Color(0xFFF06AB4),
        cx: 0.52 + math.sin(phase * math.pi * 2 + 2) * 0.03,
        cy: 0.72 + math.cos(phase * math.pi * 2 + 1.2) * 0.04,
        radius: size.shortestSide * 0.45,
      ),
      _Orb(
        color: const Color(0xFFE8C96A),
        cx: 0.35 + math.cos(phase * math.pi * 2 + 0.8) * 0.04,
        cy: 0.55 + math.sin(phase * math.pi * 2 + 1.5) * 0.03,
        radius: size.shortestSide * 0.28,
      ),
    ];

    for (final orb in orbs) {
      final center = Offset(orb.cx * size.width, orb.cy * size.height);
      final paint = Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            orb.color.withValues(alpha: dark ? 0.22 : 0.28),
            orb.color.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: orb.radius));
      canvas.drawCircle(center, orb.radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _LumenFieldPainter oldDelegate) =>
      oldDelegate.phase != phase || oldDelegate.dark != dark;
}

@immutable
final class _Orb {
  const _Orb({
    required this.color,
    required this.cx,
    required this.cy,
    required this.radius,
  });

  final Color color;
  final double cx;
  final double cy;
  final double radius;
}

/// Living SYLORA logo with orbital rings, particles and spectral glow.
final class AnimatedSyloraLogo extends StatefulWidget {
  const AnimatedSyloraLogo({
    super.key,
    this.size = 72,
    this.reducedMotion = false,
    this.intro = false,
  });

  final double size;
  final bool reducedMotion;
  final bool intro;

  @override
  State<AnimatedSyloraLogo> createState() => _AnimatedSyloraLogoState();
}

final class _AnimatedSyloraLogoState extends State<AnimatedSyloraLogo>
    with TickerProviderStateMixin {
  late final AnimationController _orbit;
  late final AnimationController _pulse;
  late final AnimationController _intro;
  late final Animation<double> _introScale;
  late final Animation<double> _introOpacity;

  @override
  void initState() {
    super.initState();
    _orbit = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    );
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
    _intro = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _introScale = CurvedAnimation(
      parent: _intro,
      curve: const Cubic(0.16, 1, 0.3, 1),
    );
    _introOpacity = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0, 0.6, curve: Curves.easeOut),
    );
    if (!widget.reducedMotion) {
      _orbit.repeat();
      _pulse.repeat(reverse: true);
    }
    if (widget.intro && !widget.reducedMotion) {
      _intro.forward();
    } else {
      _intro.value = 1;
    }
  }

  @override
  void dispose() {
    _orbit.dispose();
    _pulse.dispose();
    _intro.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    return AnimatedBuilder(
      animation: Listenable.merge(<Listenable>[_orbit, _pulse, _intro]),
      builder: (context, child) {
        final scale = widget.intro ? 0.6 + _introScale.value * 0.4 : 1.0;
        final opacity = widget.intro ? _introOpacity.value : 1.0;
        return Opacity(
          opacity: opacity,
          child: Transform.scale(
            scale: scale,
            child: SizedBox(
              width: size * 1.6,
              height: size * 1.6,
              child: CustomPaint(
                painter: _AnimatedLogoPainter(
                  orbit: _orbit.value,
                  pulse: _pulse.value,
                  dark: Theme.of(context).brightness == Brightness.dark,
                ),
                child: Center(child: SyloraLogo(size: size)),
              ),
            ),
          ),
        );
      },
    );
  }
}

final class _AnimatedLogoPainter extends CustomPainter {
  const _AnimatedLogoPainter({
    required this.orbit,
    required this.pulse,
    required this.dark,
  });

  final double orbit;
  final double pulse;
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.shortestSide * 0.38;

    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: <Color>[
          (dark ? LumenColors.aetherBright : LumenColors.aether)
              .withValues(alpha: 0.18 + pulse * 0.12),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: baseRadius * 1.4));
    canvas.drawCircle(center, baseRadius * 1.4, glowPaint);

    for (var ring = 0; ring < 2; ring++) {
      final angle = orbit * math.pi * 2 + ring * math.pi;
      final ringRadius = baseRadius * (0.95 + ring * 0.18);
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = (ring == 0 ? LumenColors.aetherBright : LumenColors.pulse)
            .withValues(alpha: 0.25 + pulse * 0.15);
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(angle);
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset.zero,
          width: ringRadius * 2.2,
          height: ringRadius * 1.1,
        ),
        paint,
      );
      canvas.restore();
    }

    final particleCount = 8;
    for (var i = 0; i < particleCount; i++) {
      final t = orbit + i / particleCount;
      final angle = t * math.pi * 2;
      final dist = baseRadius * (1.05 + 0.12 * math.sin(t * math.pi * 4));
      final pos = center + Offset(math.cos(angle) * dist, math.sin(angle) * dist);
      final colors = dark
          ? const <Color>[LumenColors.aetherBright, Color(0xFF9D8BE8), Color(0xFFF06AB4)]
          : const <Color>[Color(0xFF18A7B5), LumenColors.pulse, LumenColors.bloom];
      canvas.drawCircle(
        pos,
        2 + pulse,
        Paint()..color = colors[i % colors.length].withValues(alpha: 0.7),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _AnimatedLogoPainter oldDelegate) =>
      oldDelegate.orbit != orbit ||
      oldDelegate.pulse != pulse ||
      oldDelegate.dark != dark;
}

/// Premium golden-ring logo from the SYLORA brand reference.
final class SpectralRingLogo extends StatefulWidget {
  const SpectralRingLogo({
    super.key,
    this.size = 120,
    this.reducedMotion = false,
    this.intro = false,
  });

  final double size;
  final bool reducedMotion;
  final bool intro;

  @override
  State<SpectralRingLogo> createState() => _SpectralRingLogoState();
}

final class _SpectralRingLogoState extends State<SpectralRingLogo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    );
    if (!widget.reducedMotion) {
      _controller.repeat();
    }
    if (widget.intro) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    builder: (context, child) => CustomPaint(
      size: Size.square(widget.size),
      painter: _SpectralRingPainter(
        phase: _controller.value,
        intro: widget.intro ? _controller.value.clamp(0.0, 1.0) : 1,
      ),
    ),
  );
}

final class _SpectralRingPainter extends CustomPainter {
  const _SpectralRingPainter({required this.phase, required this.intro});

  final double phase;
  final double intro;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide * 0.38;

    final outerGlow = Paint()
      ..shader = RadialGradient(
        colors: <Color>[
          const Color(0xFFE8C96A).withValues(alpha: 0.35 * intro),
          const Color(0xFF42C6D5).withValues(alpha: 0.12 * intro),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 1.8));
    canvas.drawCircle(center, radius * 1.8, outerGlow);

    for (var i = 0; i < 3; i++) {
      final trailAngle = phase * math.pi * 2 + i * 2.1;
      final trailCenter = center +
          Offset(
            math.cos(trailAngle) * radius * 1.15,
            math.sin(trailAngle) * radius * 1.15,
          );
      canvas.drawCircle(
        trailCenter,
        4,
        Paint()
          ..color = const Color(0xFF42C6D5).withValues(alpha: 0.5 * intro),
      );
    }

    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.shortestSide * 0.06
      ..shader = SweepGradient(
        colors: const <Color>[
          Color(0xFFE8C96A),
          Color(0xFFF5E6A8),
          Color(0xFF42C6D5),
          Color(0xFF9D8BE8),
          Color(0xFFE8C96A),
        ],
        transform: GradientRotation(phase * math.pi * 2),
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, ringPaint);

    final innerGlow = Paint()
      ..shader = RadialGradient(
        colors: <Color>[
          Colors.white.withValues(alpha: 0.9 * intro),
          const Color(0xFF42C6D5).withValues(alpha: 0.25 * intro),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 0.7));
    canvas.drawCircle(center, radius * 0.7, innerGlow);

    final textPainter = TextPainter(
      text: TextSpan(
        text: 'S',
        style: TextStyle(
          fontFamily: 'Instrument Serif',
          fontSize: size.shortestSide * 0.34,
          fontWeight: FontWeight.w600,
          foreground: Paint()
            ..shader = LinearGradient(
              colors: const <Color>[
                Color(0xFFE8C96A),
                Color(0xFF42C6D5),
                Color(0xFF9D8BE8),
              ],
            ).createShader(Rect.fromCircle(center: center, radius: radius * 0.5)),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      center - Offset(textPainter.width / 2, textPainter.height / 2 - 2),
    );
  }

  @override
  bool shouldRepaint(covariant _SpectralRingPainter oldDelegate) =>
      oldDelegate.phase != phase || oldDelegate.intro != intro;
}

/// Ripple effect for interactive surfaces.
final class LumenRipple extends StatefulWidget {
  const LumenRipple({
    required this.child,
    required this.onTap,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;

  @override
  State<LumenRipple> createState() => _LumenRippleState();
}

final class _LumenRippleState extends State<LumenRipple> {
  Offset? _origin;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown: widget.onTap == null
        ? null
        : (details) => setState(() => _origin = details.localPosition),
    onTapUp: widget.onTap == null
        ? null
        : (_) {
            widget.onTap?.call();
            Future<void>.delayed(const Duration(milliseconds: 400), () {
              if (mounted) setState(() => _origin = null);
            });
          },
    onTapCancel: () => setState(() => _origin = null),
    child: Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        widget.child,
        if (_origin != null)
          Positioned(
            left: _origin!.dx - 40,
            top: _origin!.dy - 40,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: 1),
              duration: const Duration(milliseconds: 400),
              builder: (context, value, child) => Container(
                width: 80 * value,
                height: 80 * value,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context)
                      .colorScheme
                      .primary
                      .withValues(alpha: 0.15 * (1 - value)),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}
