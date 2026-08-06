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

/// Founder-locked Liquid S: twin ribbons (cyan + gold), soft corona, light shimmer.
class SyloraMark extends StatefulWidget {
  const SyloraMark({
    super.key,
    this.size = 48,
    this.animated = true,
    this.showCorona = true,
  });

  final double size;
  final bool animated;
  final bool showCorona;

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
      _controller.value = 0.12;
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
        ..value = 0.12;
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
                phase: widget.animated ? _controller.value : 0.12,
                showCorona: widget.showCorona,
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Spaced wordmark as on screenshots: S Y L O R Λ
class SyloraWordmark extends StatelessWidget {
  const SyloraWordmark({
    super.key,
    this.fontSize = 28,
    this.color,
    this.letterSpacing,
    this.weight = FontWeight.w500,
  });

  final double fontSize;
  final Color? color;
  final double? letterSpacing;
  final FontWeight weight;

  /// Screenshot lock: Latin A rendered as Greek capital lambda (no crossbar).
  static const String text = 'S Y L O R Λ';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Text(
      text,
      textAlign: TextAlign.center,
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: weight,
        letterSpacing: letterSpacing ?? fontSize * 0.42,
        color: color ?? scheme.onSurface.withValues(alpha: 0.88),
        height: 1.05,
      ),
    );
  }
}

class _LiquidSPainter extends CustomPainter {
  _LiquidSPainter({required this.phase, required this.showCorona});

  final double phase;
  final bool showCorona;

  /// Gold rear ribbon — matches web brand SVG.
  static Path _goldRibbon(double s) {
    final path = Path();
    path.moveTo(s * 0.703, s * 0.234);
    path.cubicTo(
      s * 0.844,
      s * 0.219,
      s * 0.891,
      s * 0.391,
      s * 0.734,
      s * 0.453,
    );
    path.cubicTo(
      s * 0.547,
      s * 0.531,
      s * 0.328,
      s * 0.516,
      s * 0.313,
      s * 0.672,
    );
    path.cubicTo(
      s * 0.297,
      s * 0.844,
      s * 0.531,
      s * 0.922,
      s * 0.750,
      s * 0.844,
    );
    return path;
  }

  /// Cyan front ribbon — intertwined S stroke.
  static Path _cyanRibbon(double s) {
    final path = Path();
    path.moveTo(s * 0.656, s * 0.203);
    path.cubicTo(
      s * 0.500,
      s * 0.109,
      s * 0.266,
      s * 0.141,
      s * 0.250,
      s * 0.313,
    );
    path.cubicTo(
      s * 0.234,
      s * 0.453,
      s * 0.422,
      s * 0.484,
      s * 0.531,
      s * 0.516,
    );
    path.cubicTo(
      s * 0.672,
      s * 0.547,
      s * 0.781,
      s * 0.594,
      s * 0.766,
      s * 0.703,
    );
    path.cubicTo(
      s * 0.750,
      s * 0.844,
      s * 0.516,
      s * 0.891,
      s * 0.328,
      s * 0.781,
    );
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final ox = (size.width - s) / 2;
    final oy = (size.height - s) / 2;
    canvas.translate(ox, oy);

    final cx = s / 2;
    final cy = s / 2;
    final shimmer = (math.sin(phase * math.pi * 2) + 1) / 2;
    final pulse = 0.88 + 0.12 * math.sin(phase * math.pi * 2);

    if (showCorona) {
      final corona = Paint()
        ..shader = ui.Gradient.radial(
          Offset(cx, cy),
          s * 0.55,
          [
            SyloraTokens.cyan.withValues(alpha: 0.22 * pulse),
            SyloraTokens.violet.withValues(alpha: 0.10 * pulse),
            SyloraTokens.gold.withValues(alpha: 0.06),
            Colors.transparent,
          ],
          const [0.0, 0.35, 0.62, 1.0],
        );
      canvas.drawCircle(Offset(cx, cy), s * 0.52, corona);

      final wisps = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.008
        ..color = Colors.white.withValues(alpha: 0.28 + 0.12 * shimmer);
      for (var i = 0; i < 5; i++) {
        final a = phase * math.pi * 2 + i * 1.15;
        final r = s * (0.34 + i * 0.028);
        canvas.drawArc(
          Rect.fromCircle(center: Offset(cx, cy), radius: r),
          a,
          0.55 + i * 0.08,
          false,
          wisps,
        );
      }
    }

    final goldPath = _goldRibbon(s);
    final cyanPath = _cyanRibbon(s);

    // Soft gold bloom
    canvas.drawPath(
      goldPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.12
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = SyloraTokens.gold.withValues(alpha: 0.22)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.04),
    );

    final goldPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.09
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..shader = ui.Gradient.linear(
        Offset(s * 0.2, s * 0.15),
        Offset(s * 0.85, s * 0.9),
        [
          const Color(0xFFFFF4D2),
          SyloraTokens.goldLight,
          SyloraTokens.gold,
          SyloraTokens.goldDeep,
        ],
        const [0.0, 0.28, 0.62, 1.0],
      );
    canvas.drawPath(goldPath, goldPaint);

    // Cyan bloom
    canvas.drawPath(
      cyanPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.11
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = SyloraTokens.cyan.withValues(alpha: 0.2)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, s * 0.035),
    );

    final cyanPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.082
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..shader = ui.Gradient.linear(
        Offset(s * 0.15, s * 0.1),
        Offset(s * 0.8, s * 0.85),
        [
          const Color(0xFFE8FBFF),
          const Color(0xFFA8E4FF),
          SyloraTokens.cyan,
          const Color(0xFF1A8FB5),
        ],
        const [0.0, 0.3, 0.65, 1.0],
      );
    canvas.drawPath(cyanPath, cyanPaint);

    // Traveling light shimmer on cyan ribbon
    final gloss = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s * 0.028
      ..strokeCap = StrokeCap.round
      ..shader = ui.Gradient.linear(
        Offset(s * (0.1 + 0.35 * shimmer), s * 0.08),
        Offset(s * (0.55 + 0.35 * shimmer), s * 0.72),
        [
          Colors.white.withValues(alpha: 0.05),
          Colors.white.withValues(alpha: 0.75),
          Colors.white.withValues(alpha: 0.05),
        ],
        const [0.0, 0.45, 1.0],
      );
    canvas.drawPath(cyanPath, gloss);

    final spark = Paint()
      ..color = Colors.white.withValues(alpha: 0.55 + 0.35 * shimmer);
    canvas.drawCircle(Offset(s * 0.61, s * 0.23), s * 0.028, spark);
    canvas.drawCircle(
      Offset(s * 0.375, s * 0.67),
      s * 0.02,
      spark
        ..color = SyloraTokens.goldLight.withValues(alpha: 0.5 + 0.3 * shimmer),
    );
  }

  @override
  bool shouldRepaint(covariant _LiquidSPainter oldDelegate) {
    return oldDelegate.phase != phase || oldDelegate.showCorona != showCorona;
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
