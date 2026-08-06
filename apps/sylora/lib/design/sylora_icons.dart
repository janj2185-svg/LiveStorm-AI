import 'dart:math' as math;
import 'dart:ui' as ui;

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

/// Founder-locked Liquid S — pearlescent S inside a glowing orb with soft droplets.
/// Matches SYLORA UNIFIED screenshots exactly.
class SyloraMark extends StatefulWidget {
  const SyloraMark({
    super.key,
    this.size = 48,
    this.animated = true,
    this.showOrb = true,
  });

  final double size;
  final bool animated;
  final bool showOrb;

  @override
  State<SyloraMark> createState() => _SyloraMarkState();
}

class _SyloraMarkState extends State<SyloraMark>
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
      _controller.value = 0.18;
    }
  }

  void _start() {
    if (WidgetsBinding
        .instance.platformDispatcher.accessibilityFeatures.disableAnimations) {
      _controller.value = 0.28;
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
        ..value = 0.18;
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
          builder: (context, _) {
            return CustomPaint(
              size: Size.square(widget.size),
              painter: _LiquidSPainter(
                phase: widget.animated ? _controller.value : 0.18,
                showOrb: widget.showOrb,
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Spaced wordmark lock: S Y L O R Λ (A → Λ, no crossbar).
class SyloraWordmark extends StatelessWidget {
  const SyloraWordmark({
    super.key,
    this.fontSize = 28,
    this.color,
    this.letterSpacing,
    this.weight = FontWeight.w500,
    this.showUnified = false,
    this.unifiedSize,
    this.center = true,
  });

  final double fontSize;
  final Color? color;
  final double? letterSpacing;
  final FontWeight weight;
  final bool showUnified;
  final double? unifiedSize;
  final bool center;

  /// Screenshot lock: Latin A rendered as Greek capital lambda (no crossbar).
  static const String text = 'S Y L O R Λ';
  static const String unified = 'UNIFIED';
  static const String lockupLine = 'S Y L O R Λ';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final ink = color ?? scheme.onSurface.withValues(alpha: 0.88);
    final mark = Text(
      text,
      textAlign: center ? TextAlign.center : TextAlign.start,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: fontSize,
        fontWeight: weight,
        letterSpacing: letterSpacing ?? fontSize * 0.42,
        color: ink,
        height: 1.05,
      ),
    );
    if (!showUnified) return mark;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment:
          center ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        mark,
        SizedBox(height: fontSize * 0.12),
        Text(
          unified,
          textAlign: center ? TextAlign.center : TextAlign.start,
          style: TextStyle(
            fontFamily: 'Instrument Sans',
            fontSize: unifiedSize ?? fontSize * 0.42,
            fontWeight: FontWeight.w500,
            letterSpacing: (unifiedSize ?? fontSize * 0.42) * 0.55,
            color: ink.withValues(alpha: 0.72),
            height: 1,
          ),
        ),
      ],
    );
  }
}

/// Hero stack from founder screens: UNIFIED over SYLORΛ.
class SyloraHeroWordmark extends StatelessWidget {
  const SyloraHeroWordmark({
    super.key,
    this.unifiedSize = 18,
    this.syloraSize = 28,
    this.color,
  });

  final double unifiedSize;
  final double syloraSize;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final ink = color ?? SyloraTokens.ink.withValues(alpha: 0.9);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ShaderMask(
          blendMode: BlendMode.srcIn,
          shaderCallback: (bounds) => const LinearGradient(
            colors: [
              Color(0xFF5B8DEF),
              Color(0xFF8B7CFF),
              Color(0xFFB08CFF),
            ],
          ).createShader(bounds),
          child: Text(
            SyloraWordmark.unified,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Instrument Sans',
              fontSize: unifiedSize,
              fontWeight: FontWeight.w700,
              letterSpacing: unifiedSize * 0.55,
              height: 1.1,
              color: Colors.white,
            ),
          ),
        ),
        SizedBox(height: syloraSize * 0.22),
        SyloraWordmark(
          fontSize: syloraSize,
          letterSpacing: syloraSize * 0.48,
          weight: FontWeight.w600,
          color: ink,
        ),
      ],
    );
  }
}

class _LiquidSPainter extends CustomPainter {
  _LiquidSPainter({required this.phase, required this.showOrb});

  final double phase;
  final bool showOrb;

  /// Filled pearlescent S — twin-ribbon silhouette as a closed glyph.
  static Path _sigilS(double s) {
    final path = Path();
    // Outer contour of liquid S (readable, rounded terminals).
    path.moveTo(s * 0.70, s * 0.22);
    path.cubicTo(s * 0.86, s * 0.18, s * 0.90, s * 0.36, s * 0.74, s * 0.42);
    path.cubicTo(s * 0.56, s * 0.49, s * 0.38, s * 0.50, s * 0.36, s * 0.60);
    path.cubicTo(s * 0.34, s * 0.74, s * 0.52, s * 0.80, s * 0.70, s * 0.76);
    path.cubicTo(s * 0.80, s * 0.74, s * 0.84, s * 0.66, s * 0.78, s * 0.64);
    path.cubicTo(s * 0.66, s * 0.61, s * 0.52, s * 0.64, s * 0.52, s * 0.58);
    path.cubicTo(s * 0.52, s * 0.50, s * 0.68, s * 0.48, s * 0.78, s * 0.40);
    path.cubicTo(s * 0.90, s * 0.30, s * 0.82, s * 0.18, s * 0.64, s * 0.20);
    path.cubicTo(s * 0.48, s * 0.22, s * 0.40, s * 0.32, s * 0.42, s * 0.38);
    path.cubicTo(s * 0.44, s * 0.44, s * 0.34, s * 0.48, s * 0.30, s * 0.40);
    path.cubicTo(s * 0.24, s * 0.28, s * 0.36, s * 0.16, s * 0.56, s * 0.16);
    path.cubicTo(s * 0.62, s * 0.16, s * 0.67, s * 0.18, s * 0.70, s * 0.22);
    path.close();
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final ox = (size.width - s) / 2;
    final oy = (size.height - s) / 2;
    canvas.translate(ox, oy);

    final c = Offset(s * 0.5, s * 0.5);
    final shimmer = (math.sin(phase * math.pi * 2) + 1) / 2;
    final pulse = 0.90 + 0.10 * math.sin(phase * math.pi * 2);
    final spin = phase * math.pi * 2;

    if (showOrb) {
      // Outer soft aura
      canvas.drawCircle(
        c,
        s * 0.48 * pulse,
        Paint()
          ..shader = ui.Gradient.radial(
            c,
            s * 0.5,
            [
              const Color(0xFFB8C8FF).withValues(alpha: 0.35 * pulse),
              SyloraTokens.violet.withValues(alpha: 0.12),
              SyloraTokens.cyan.withValues(alpha: 0.06),
              Colors.transparent,
            ],
            const [0.0, 0.4, 0.7, 1.0],
          ),
      );

      // Glass orb body
      canvas.drawCircle(
        c,
        s * 0.38,
        Paint()
          ..shader = ui.Gradient.radial(
            Offset(s * 0.42, s * 0.38),
            s * 0.42,
            [
              Colors.white.withValues(alpha: 0.92),
              const Color(0xFFE8EEFF).withValues(alpha: 0.78),
              const Color(0xFFD4DCFF).withValues(alpha: 0.55),
              const Color(0xFFC5B8FF).withValues(alpha: 0.28),
            ],
            const [0.0, 0.35, 0.7, 1.0],
          ),
      );

      // Nebula swirl inside orb
      canvas.save();
      canvas.clipPath(Path()..addOval(Rect.fromCircle(center: c, radius: s * 0.36)));
      for (var i = 0; i < 3; i++) {
        final a = spin * (0.35 + i * 0.12) + i * 1.7;
        final p = Offset(
          c.dx + math.cos(a) * s * (0.08 + i * 0.04),
          c.dy + math.sin(a * 1.1) * s * (0.06 + i * 0.03),
        );
        canvas.drawCircle(
          p,
          s * (0.16 - i * 0.03),
          Paint()
            ..shader = ui.Gradient.radial(
              p,
              s * 0.18,
              [
                [
                  const Color(0xFF9BB6FF),
                  const Color(0xFFB39CFF),
                  const Color(0xFFE6C88B),
                ][i]
                    .withValues(alpha: 0.28 + 0.1 * shimmer),
                Colors.transparent,
              ],
            )
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.04),
        );
      }
      canvas.restore();

      // Orb rim
      canvas.drawCircle(
        c,
        s * 0.38,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = s * 0.012
          ..shader = ui.Gradient.linear(
            Offset(s * 0.2, s * 0.15),
            Offset(s * 0.85, s * 0.9),
            [
              Colors.white.withValues(alpha: 0.95),
              const Color(0xFFA8B8FF).withValues(alpha: 0.55),
              Colors.white.withValues(alpha: 0.35),
            ],
          ),
      );

      // Floating droplets around orb
      final droplets = <(double, double, double)>[
        (0.18, 0.28, 0.028),
        (0.82, 0.26, 0.022),
        (0.14, 0.62, 0.018),
        (0.86, 0.58, 0.024),
        (0.22, 0.78, 0.016),
        (0.78, 0.80, 0.020),
        (0.50, 0.10, 0.014),
        (0.58, 0.90, 0.015),
      ];
      for (var i = 0; i < droplets.length; i++) {
        final (dx, dy, r) = droplets[i];
        final bob = math.sin(spin + i * 0.9) * s * 0.008;
        final p = Offset(s * dx, s * dy + bob);
        canvas.drawCircle(
          p,
          s * r,
          Paint()
            ..shader = ui.Gradient.radial(
              Offset(p.dx - s * r * 0.3, p.dy - s * r * 0.3),
              s * r * 1.2,
              [
                Colors.white.withValues(alpha: 0.95),
                const Color(0xFFB8C8FF).withValues(alpha: 0.55),
                const Color(0xFF8B7CFF).withValues(alpha: 0.2),
              ],
            ),
        );
        canvas.drawCircle(
          Offset(p.dx - s * r * 0.25, p.dy - s * r * 0.3),
          s * r * 0.28,
          Paint()..color = Colors.white.withValues(alpha: 0.85),
        );
      }
    }

    final sigil = _sigilS(s);

    // Soft bloom under S
    canvas.drawPath(
      sigil,
      Paint()
        ..color = const Color(0xFF8B9CFF).withValues(alpha: 0.28)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.05),
    );

    // Pearlescent body — cyan → violet → gold
    canvas.drawPath(
      sigil,
      Paint()
        ..shader = ui.Gradient.linear(
          Offset(s * 0.28, s * 0.18),
          Offset(s * 0.78, s * 0.86),
          [
            const Color(0xFFEAF6FF),
            const Color(0xFF7EC8FF),
            const Color(0xFF9B8CFF),
            const Color(0xFFE6C88B),
            const Color(0xFFFFF0D2),
          ],
          const [0.0, 0.28, 0.52, 0.78, 1.0],
        ),
    );

    // Twin-ribbon highlight edge (lighter inner filament)
    canvas.drawPath(
      sigil,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.018
        ..shader = ui.Gradient.linear(
          Offset(s * (0.15 + 0.4 * shimmer), s * 0.12),
          Offset(s * (0.6 + 0.3 * shimmer), s * 0.8),
          [
            Colors.white.withValues(alpha: 0.9),
            Colors.white.withValues(alpha: 0.15),
            Colors.white.withValues(alpha: 0.55),
          ],
          const [0.0, 0.45, 1.0],
        ),
    );

    // Specular spark on upper curve
    canvas.drawCircle(
      Offset(s * 0.62, s * 0.28),
      s * 0.03,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.7 + 0.25 * shimmer)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.01),
    );
  }

  @override
  bool shouldRepaint(covariant _LiquidSPainter oldDelegate) {
    return oldDelegate.phase != phase || oldDelegate.showOrb != showOrb;
  }
}

/// Compatibility alias used by older screens.
class SyloraLogoMark extends SyloraMark {
  const SyloraLogoMark({
    super.key,
    super.size = 40,
    super.animated = true,
    this.color,
  });

  final Color? color;
}
