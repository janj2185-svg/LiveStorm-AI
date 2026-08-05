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

/// SYLORA Aura — human companion presence (FINAL boards).
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
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final disable = MediaQuery.disableAnimationsOf(context);
    if (disable || !widget.animate) {
      if (_ticker.isActive) {
        _ticker.stop();
      }
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
    final t = widget.animate ? _elapsed.inMilliseconds / 1000 : 0.0;
    final emotionPulse = switch (widget.emotion) {
      AuraEmotion.speaking => 0.034,
      AuraEmotion.thinking || AuraEmotion.thoughtful => 0.012,
      AuraEmotion.listening => 0.022,
      AuraEmotion.amused || AuraEmotion.delighted => 0.028,
      AuraEmotion.focused || AuraEmotion.supportive => 0.016,
      AuraEmotion.greeting => 0.024,
      AuraEmotion.idle => 0.018,
    };
    final breathe = 1 + math.sin(t * 1.2) * emotionPulse;
    final floatY = math.sin(t * 1.1) * (widget.emotion == AuraEmotion.speaking ? 4.2 : 3.0);
    final glowColor = switch (widget.emotion) {
      AuraEmotion.speaking => SyloraTokens.champagne,
      AuraEmotion.thinking || AuraEmotion.thoughtful => SyloraTokens.inkSoft,
      AuraEmotion.listening || AuraEmotion.supportive => SyloraTokens.softSky,
      AuraEmotion.amused || AuraEmotion.delighted => const Color(0xFFE8C98A),
      AuraEmotion.focused => SyloraTokens.champagneDeep,
      _ => SyloraTokens.champagne,
    };
    final glowOpacity = switch (widget.emotion) {
      AuraEmotion.speaking => 0.48,
      AuraEmotion.thinking || AuraEmotion.thoughtful => 0.22,
      AuraEmotion.focused => 0.4,
      _ => 0.32,
    };

    return SizedBox(
      width: widget.size,
      height: widget.size + (widget.showLabel ? 22 : 0),
      child: Column(
        children: [
          Expanded(
            child: Transform.translate(
              offset: Offset(0, floatY),
              child: Transform.scale(
                scale: breathe,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: SyloraTokens.glow(
                      glowColor,
                      blur: widget.size * (widget.emotion == AuraEmotion.speaking ? 0.42 : 0.35),
                      opacity: glowOpacity,
                    ),
                  ),
                  child: ClipOval(
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ColoredBox(
                          color: SyloraTokens.softSky.withValues(alpha: 0.55),
                        ),
                        Image.asset(
                          'assets/brand/aura-companion.png',
                          fit: BoxFit.cover,
                          alignment: const Alignment(0, -0.35),
                          errorBuilder: (context, error, stackTrace) => CustomPaint(
                            painter: _AuraPainter(
                              t: t,
                              emotion: widget.emotion,
                            ),
                          ),
                        ),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: RadialGradient(
                              colors: [
                                Colors.transparent,
                                glowColor.withValues(alpha: 0.14),
                              ],
                            ),
                          ),
                        ),
                        // Living lids — soft blink cycle
                        IgnorePointer(
                          child: Opacity(
                            opacity: () {
                              final cycle = t % 4.8;
                              if (cycle > 4.55 && cycle < 4.72) {
                                return 0.72;
                              }
                              return 0.0;
                            }(),
                            child: ColoredBox(
                              color: SyloraTokens.canvas.withValues(alpha: 0.82),
                            ),
                          ),
                        ),
                        // Gaze shimmer / life spark
                        IgnorePointer(
                          child: Align(
                            alignment: Alignment(
                              math.sin(t * 0.55) * 0.18,
                              -0.12 + math.cos(t * 0.4) * 0.06,
                            ),
                            child: Container(
                              width: widget.size * 0.14,
                              height: widget.size * 0.06,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(99),
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.white.withValues(alpha: 0.0),
                                    Colors.white.withValues(alpha: 0.35),
                                    Colors.white.withValues(alpha: 0.0),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        // Outer living ring
                        IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: glowColor.withValues(
                                  alpha: 0.22 + 0.12 * (0.5 + 0.5 * math.sin(t * 1.4)),
                                ),
                                width: 1.4,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
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

/// Soft human silhouette fallback when the portrait asset is unavailable.
final class _AuraPainter extends CustomPainter {
  _AuraPainter({required this.t, required this.emotion});

  final double t;
  final AuraEmotion emotion;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width * 0.5;
    final cy = size.height * 0.52;
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.white.withValues(alpha: 0.95),
          SyloraTokens.champagne.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: size.width * 0.48));
    canvas.drawCircle(Offset(cx, cy), size.width * 0.48, glow);

    // Hair halo
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, cy - size.height * 0.02),
        width: size.width * 0.72,
        height: size.height * 0.78,
      ),
      Paint()..color = const Color(0xFFE8D5A8),
    );

    // Face
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, cy),
        width: size.width * 0.48,
        height: size.height * 0.58,
      ),
      Paint()..color = const Color(0xFFF3D7C2),
    );

    // Soft eyes
    final eyeOpen = emotion == AuraEmotion.amused ? 0.55 : 1.0;
    for (final side in [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(cx + side * size.width * 0.1, cy - size.height * 0.04),
          width: size.width * 0.06,
          height: size.height * 0.035 * eyeOpen,
        ),
        Paint()..color = SyloraTokens.ink.withValues(alpha: 0.72),
      );
    }

    // Soft smile
    final smile = Path()
      ..moveTo(cx - size.width * 0.07, cy + size.height * 0.1)
      ..quadraticBezierTo(
        cx,
        cy + size.height * (0.14 + (emotion == AuraEmotion.delighted ? 0.02 : 0)),
        cx + size.width * 0.07,
        cy + size.height * 0.1,
      );
    canvas.drawPath(
      smile,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6
        ..strokeCap = StrokeCap.round
        ..color = SyloraTokens.softCoral.withValues(alpha: 0.7),
    );
  }

  @override
  bool shouldRepaint(covariant _AuraPainter oldDelegate) => true;
}
