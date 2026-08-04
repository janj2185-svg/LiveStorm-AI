import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'sylora_tokens.dart';

enum AuraEmotion {
  idle,
  greeting,
  listening,
  thinking,
  speaking,
  amused,
  focused,
  delighted,
  thoughtful,
  supportive,
}

/// SYLORA Aura — animated companion used across the platform.
final class SyloraAura extends StatefulWidget {
  const SyloraAura({
    super.key,
    this.size = 120,
    this.emotion = AuraEmotion.idle,
    this.label = 'Aura',
    this.showLabel = true,
    this.animate = true,
  });

  final double size;
  final AuraEmotion emotion;
  final String label;
  final bool showLabel;
  final bool animate;

  @override
  State<SyloraAura> createState() => _SyloraAuraState();
}

final class _SyloraAuraState extends State<SyloraAura>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  Duration _elapsed = Duration.zero;
  Duration _lastPaint = Duration.zero;
  double _lid = 0;
  double _blinkAt = 0.9;
  double _yaw = 0;
  double _pitch = 0;

  static final Duration _minFrame = Duration(
    milliseconds: kIsWeb ? 40 : 16,
  );

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((d) {
      if (d - _lastPaint < _minFrame) {
        return;
      }
      _lastPaint = d;
      _elapsed = d;
      if (mounted) setState(() {});
    });
    if (!widget.animate) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_ticker.isActive) {
        _ticker.start();
      }
    });
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.animate ? _elapsed.inMilliseconds / 1000 : 0.0;
    if (widget.animate) {
      if (t > _blinkAt) {
        _lid = 1;
        _blinkAt = t + 2.2 + (t % 1.7);
      }
      _lid *= 0.78;
      final targetYaw = math.sin(t * 0.7) * 4;
      final targetPitch = math.cos(t * 0.9) * 2;
      _yaw += (targetYaw - _yaw) * 0.06;
      _pitch += (targetPitch - _pitch) * 0.06;
    }

    return SizedBox(
      width: widget.size,
      height: widget.size + (widget.showLabel ? 22 : 0),
      child: Column(
        children: [
          Expanded(
            child: CustomPaint(
              painter: _AuraPainter(
                t: t,
                emotion: widget.emotion,
                lid: _lid,
                yaw: _yaw,
                pitch: _pitch,
              ),
              size: Size.square(widget.size),
            ),
          ),
          if (widget.showLabel)
            Text(
              widget.label,
              style: SyloraTokens.label(9, color: SyloraTokens.inkMute),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
    );
  }
}

final class _AuraPainter extends CustomPainter {
  _AuraPainter({
    required this.t,
    required this.emotion,
    required this.lid,
    required this.yaw,
    required this.pitch,
  });

  final double t;
  final AuraEmotion emotion;
  final double lid;
  final double yaw;
  final double pitch;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width * 0.5 + yaw;
    final cy = size.height * 0.52 + pitch + math.sin(t * 1.4) * 2;
    final speak = emotion == AuraEmotion.speaking
        ? 0.5 + 0.5 * math.sin(t * 10)
        : 0.0;
    final amused = emotion == AuraEmotion.amused ? 1.0 : 0.0;
    final think = emotion == AuraEmotion.thinking ? math.sin(t * 2.2) * 2 : 0.0;

    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.white.withValues(alpha: 0.9),
          SyloraTokens.violet.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: size.width * 0.48));
    canvas.drawCircle(Offset(cx, cy), size.width * 0.48, glow);

    // Neck
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, cy + size.height * 0.28), width: size.width * 0.16, height: size.height * 0.14),
        const Radius.circular(8),
      ),
      Paint()..color = const Color(0xD8D2E0FF),
    );

    // Head
    final head = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(cx, cy + think * 0.2),
        width: size.width * 0.58,
        height: size.height * 0.62,
      ),
      Radius.circular(size.width * 0.22),
    );
    canvas.drawRRect(
      head,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Color(0xFFD7E4FF)],
        ).createShader(head.outerRect),
    );
    canvas.drawRRect(
      head,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = SyloraTokens.violet.withValues(alpha: 0.22),
    );

    // Face plate
    final plate = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy - size.height * 0.02), width: size.width * 0.4, height: size.height * 0.26),
      Radius.circular(size.width * 0.1),
    );
    canvas.drawRRect(plate, Paint()..color = const Color(0xFF12182F));

    final eyeOpen = math.max(0.12, 1 - lid);
    final eyeY = cy - size.height * 0.03;
    final eyeSpread = size.width * 0.09;
    final eyeW = size.width * 0.055;
    final eyeH = size.height * 0.07 * eyeOpen * (amused > 0 ? 0.75 : 1);

    for (final side in [-1.0, 1.0]) {
      final ex = cx + side * eyeSpread;
      final rect = Rect.fromCenter(center: Offset(ex, eyeY), width: eyeW * 2, height: eyeH * 2);
      canvas.drawOval(
        rect,
        Paint()
          ..shader = const RadialGradient(
            colors: [Color(0xFFDFFFFA), SyloraTokens.violet],
          ).createShader(rect),
      );
    }

    // Mouth
    final mouthW = size.width * (0.07 + speak * 0.06);
    final mouthH = size.height * (0.015 + speak * 0.035 + amused * 0.01);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, cy + size.height * 0.16), width: mouthW, height: mouthH),
        const Radius.circular(4),
      ),
      Paint()..color = SyloraTokens.ion.withValues(alpha: 0.9),
    );

    // Antenna
    final tip = Offset(cx + size.width * 0.12, cy - size.height * 0.42 - math.sin(t * 3) * 2);
    canvas.drawPath(
      Path()
        ..moveTo(cx, cy - size.height * 0.3)
        ..quadraticBezierTo(cx + size.width * 0.06, cy - size.height * 0.38, tip.dx, tip.dy),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = SyloraTokens.violet.withValues(alpha: 0.55),
    );
    canvas.drawCircle(
      tip,
      3.2 + speak,
      Paint()
        ..color = emotion == AuraEmotion.thinking
            ? SyloraTokens.petal
            : SyloraTokens.ion,
    );
  }

  @override
  bool shouldRepaint(covariant _AuraPainter oldDelegate) => true;
}
