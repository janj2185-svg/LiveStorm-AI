import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'lumen_theme.dart';

/// Living pearl / aether atmosphere used behind immersive entry surfaces.
final class LivingBackground extends StatefulWidget {
  const LivingBackground({
    required this.child,
    super.key,
    this.intensity = 1,
  });

  final Widget child;
  final double intensity;

  @override
  State<LivingBackground> createState() => _LivingBackgroundState();
}

final class _LivingBackgroundState extends State<LivingBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (reduced) {
      _controller.value = 0.2;
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = reduced ? 0.0 : _controller.value * math.pi * 2;
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(
                math.cos(t) * 0.35,
                -0.85 + math.sin(t) * 0.12,
              ),
              end: Alignment(
                -math.cos(t * 0.7) * 0.4,
                0.95 + math.sin(t * 0.85) * 0.08,
              ),
              colors: <Color>[
                const Color(0xFFFFFEFB),
                Color.lerp(
                  const Color(0xFFEAF6FA),
                  const Color(0xFFF3EEFF),
                  (math.sin(t) + 1) / 2,
                )!,
                Color.lerp(
                  const Color(0xFFFFF6E8),
                  const Color(0xFFE8F4FF),
                  (math.cos(t * 0.8) + 1) / 2,
                )!,
                const Color(0xFFF7F5EF),
              ],
              stops: const <double>[0, 0.35, 0.72, 1],
            ),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              CustomPaint(
                painter: _ParticleFieldPainter(
                  progress: reduced ? 0.2 : _controller.value,
                  intensity: widget.intensity,
                ),
              ),
              CustomPaint(
                painter: _OrbitPainter(
                  progress: reduced ? 0.0 : _controller.value,
                  intensity: widget.intensity,
                ),
              ),
              child!,
            ],
          ),
        );
      },
      child: widget.child,
    );
  }
}

final class _ParticleFieldPainter extends CustomPainter {
  const _ParticleFieldPainter({
    required this.progress,
    required this.intensity,
  });

  final double progress;
  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    final random = math.Random(7);
    for (var i = 0; i < 42; i++) {
      final seedX = random.nextDouble();
      final seedY = random.nextDouble();
      final drift = math.sin((progress + seedX) * math.pi * 2) * 12 * intensity;
      final x = seedX * size.width + drift;
      final y =
          ((seedY + progress * (0.08 + seedX * 0.12)) % 1) * size.height;
      final radius = 1.2 + random.nextDouble() * 2.4;
      final color = Color.lerp(
        LumenColors.aetherBright,
        LumenColors.pulse,
        seedX,
      )!.withValues(alpha: 0.08 + seedY * 0.16);
      canvas.drawCircle(Offset(x, y), radius, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticleFieldPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.intensity != intensity;
}

final class _OrbitPainter extends CustomPainter {
  const _OrbitPainter({required this.progress, required this.intensity});

  final double progress;
  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.38);
    for (var ring = 0; ring < 3; ring++) {
      final radius =
          math.min(size.width, size.height) * (0.18 + ring * 0.08) * intensity;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.1
        ..color = Color.lerp(
          LumenColors.aether,
          LumenColors.bloom,
          ring / 2,
        )!.withValues(alpha: 0.12 - ring * 0.02);
      canvas.drawCircle(center, radius, paint);
      final angle = progress * math.pi * 2 * (ring.isEven ? 1 : -1) + ring;
      final bead = Offset(
        center.dx + math.cos(angle) * radius,
        center.dy + math.sin(angle) * radius,
      );
      canvas.drawCircle(
        bead,
        3.5 - ring * 0.6,
        Paint()
          ..color = const Color(0xFFD4AF37).withValues(alpha: 0.45)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _OrbitPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.intensity != intensity;
}

enum LogoMotionState { rest, thinking, listening }

/// Animated three-lens SYLORA mark with orbits, glow and spectral blend.
final class AnimatedSyloraLogo extends StatefulWidget {
  const AnimatedSyloraLogo({
    super.key,
    this.size = 72,
    this.state = LogoMotionState.thinking,
    this.showWordmark = false,
  });

  final double size;
  final LogoMotionState state;
  final bool showWordmark;

  @override
  State<AnimatedSyloraLogo> createState() => _AnimatedSyloraLogoState();
}

final class _AnimatedSyloraLogoState extends State<AnimatedSyloraLogo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (reduced) {
      _controller.value = 0;
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final mark = AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = reduced ? 0.0 : _controller.value;
        final rotation = switch (widget.state) {
          LogoMotionState.thinking => t * math.pi * 2,
          LogoMotionState.listening => math.sin(t * math.pi * 2) * 0.12,
          LogoMotionState.rest => t * math.pi * 0.15,
        };
        final pulse = switch (widget.state) {
          LogoMotionState.listening => 1 + math.sin(t * math.pi * 4) * 0.06,
          LogoMotionState.thinking => 1 + math.sin(t * math.pi * 2) * 0.04,
          LogoMotionState.rest => 1 + math.sin(t * math.pi * 2) * 0.02,
        };
        return SizedBox.square(
          dimension: widget.size * 1.35,
          child: Stack(
            alignment: Alignment.center,
            children: <Widget>[
              Container(
                width: widget.size * 1.15 * pulse,
                height: widget.size * 1.15 * pulse,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: <Color>[
                      LumenColors.aetherBright.withValues(alpha: 0.22),
                      LumenColors.pulse.withValues(alpha: 0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              CustomPaint(
                size: Size.square(widget.size * 1.3),
                painter: _OrbitRingPainter(progress: t),
              ),
              Transform.rotate(
                angle: rotation,
                child: Transform.scale(
                  scale: pulse,
                  child: CustomPaint(
                    size: Size.square(widget.size),
                    painter: _AnimatedLogoPainter(dark: dark),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
    if (!widget.showWordmark) {
      return Semantics(label: 'SYLORA', image: true, child: mark);
    }
    return Semantics(
      label: 'SYLORA',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          mark,
          const SizedBox(height: 8),
          Text(
            'SYLORA',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontFamily: 'Instrument Serif',
              letterSpacing: 4,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

final class _OrbitRingPainter extends CustomPainter {
  const _OrbitRingPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide * 0.46;
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = LumenColors.aether.withValues(alpha: 0.18),
    );
    final angle = progress * math.pi * 2;
    canvas.drawCircle(
      Offset(
        center.dx + math.cos(angle) * radius,
        center.dy + math.sin(angle) * radius,
      ),
      2.8,
      Paint()..color = const Color(0xFFD4AF37).withValues(alpha: 0.7),
    );
    canvas.drawCircle(
      Offset(
        center.dx + math.cos(angle + 2.1) * radius,
        center.dy + math.sin(angle + 2.1) * radius,
      ),
      2.1,
      Paint()..color = LumenColors.pulse.withValues(alpha: 0.55),
    );
  }

  @override
  bool shouldRepaint(covariant _OrbitRingPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

final class _AnimatedLogoPainter extends CustomPainter {
  const _AnimatedLogoPainter({required this.dark});

  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.saveLayer(Offset.zero & size, Paint());
    final center = Offset(size.width / 2, size.height / 2);
    final construction = size.shortestSide * (7.4 / 48);
    final rx = size.shortestSide * (13.6 / 48);
    final ry = size.shortestSide * (9.2 / 48);
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
    const angles = <double>[-math.pi / 2, math.pi / 6, 5 * math.pi / 6];
    for (var i = 0; i < 3; i++) {
      final cx = center.dx + construction * math.cos(angles[i]);
      final cy = center.dy + construction * math.sin(angles[i]);
      canvas.save();
      canvas.translate(cx, cy);
      canvas.rotate(angles[i]);
      canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2),
        Paint()
          ..color = colors[i].withValues(alpha: dark ? 0.78 : 0.72)
          ..blendMode = dark ? BlendMode.screen : BlendMode.multiply,
      );
      canvas.restore();
    }
    canvas.drawCircle(
      center,
      size.shortestSide * (2.5 / 48),
      Paint()..color = dark ? LumenColors.darkSurface : LumenColors.porcelainSurface,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _AnimatedLogoPainter oldDelegate) =>
      oldDelegate.dark != dark;
}

/// Frosted glass panel for premium overlays and cards that are interactive.
final class GlassPanel extends StatelessWidget {
  const GlassPanel({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(20),
    this.radius = 24,
    this.blur = 18,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final double blur;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(radius),
            color: LumenColors.porcelainSurface.withValues(alpha: 0.72),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.65),
            ),
            boxShadow: const <BoxShadow>[
              BoxShadow(
                color: Color(0x142C405A),
                blurRadius: 28,
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

/// Soft press ripple for interactive surfaces.
final class RippleInk extends StatelessWidget {
  const RippleInk({
    required this.child,
    required this.onTap,
    super.key,
    this.borderRadius = 20,
  });

  final Widget child;
  final VoidCallback onTap;
  final double borderRadius;

  @override
  Widget build(BuildContext context) => Material(
    type: MaterialType.transparency,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(borderRadius),
      splashColor: LumenColors.aether.withValues(alpha: 0.12),
      highlightColor: LumenColors.pulse.withValues(alpha: 0.06),
      child: child,
    ),
  );
}

/// Platform form-factor helpers for Android / iOS / tablet / desktop / web UX.
enum SyloraFormFactor { phone, tablet, desktop }

SyloraFormFactor formFactorFor(Size size) {
  if (size.width >= 1280) return SyloraFormFactor.desktop;
  if (size.width >= 768) return SyloraFormFactor.tablet;
  return SyloraFormFactor.phone;
}

@immutable
final class PlatformChromeHints {
  const PlatformChromeHints({
    required this.formFactor,
    required this.useCupertinoDensity,
    required this.railExtendedPreferred,
    required this.topBarHeight,
    required this.contentMaxWidth,
  });

  factory PlatformChromeHints.of(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final platform = Theme.of(context).platform;
    final factor = formFactorFor(size);
    final cupertino =
        platform == TargetPlatform.iOS || platform == TargetPlatform.macOS;
    return PlatformChromeHints(
      formFactor: factor,
      useCupertinoDensity: cupertino,
      railExtendedPreferred: factor == SyloraFormFactor.desktop,
      topBarHeight: factor == SyloraFormFactor.phone
          ? (cupertino ? 52 : 56)
          : 64,
      contentMaxWidth: switch (factor) {
        SyloraFormFactor.phone => null,
        SyloraFormFactor.tablet => 920,
        SyloraFormFactor.desktop => 1120,
      },
    );
  }

  final SyloraFormFactor formFactor;
  final bool useCupertinoDensity;
  final bool railExtendedPreferred;
  final double topBarHeight;
  final double? contentMaxWidth;
}

final auraOverlayOpenProvider = StateProvider<bool>((ref) => false);
