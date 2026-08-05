import 'package:flutter/material.dart';

import 'sylora_tokens.dart';

/// FINAL-12 state templates — empty / loading / error (champagne glass).
abstract final class SyloraStates {
  static Widget empty({
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
    IconData icon = Icons.inbox_outlined,
    String? secondaryLabel,
    VoidCallback? onSecondary,
  }) =>
      _StateCard(
        icon: icon,
        title: title,
        message: message,
        actionLabel: actionLabel,
        onAction: onAction,
        secondaryLabel: secondaryLabel,
        onSecondary: onSecondary,
      );

  static Widget loading({String message = 'Opening SYLORA…'}) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SyloraChampagneSpinner(),
              const SizedBox(height: SyloraTokens.space4),
              Text(
                message,
                textAlign: TextAlign.center,
                style: SyloraTokens.body(15, color: SyloraTokens.inkSoft),
              ),
            ],
          ),
        ),
      );

  static Widget error({
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
    IconData icon = Icons.cloud_off_outlined,
  }) =>
      _StateCard(
        icon: icon,
        title: title,
        message: message,
        actionLabel: actionLabel,
        onAction: onAction,
        accent: SyloraTokens.softCoral,
      );
}

final class SyloraChampagneSpinner extends StatefulWidget {
  const SyloraChampagneSpinner({super.key, this.size = 36});

  final double size;

  @override
  State<SyloraChampagneSpinner> createState() => _SyloraChampagneSpinnerState();
}

final class _SyloraChampagneSpinnerState extends State<SyloraChampagneSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final animate = TickerMode.of(context) &&
        !MediaQuery.disableAnimationsOf(context);
    if (animate) {
      if (!_controller.isAnimating) {
        _controller.repeat();
      }
    } else if (_controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final animate = TickerMode.of(context) &&
        !MediaQuery.disableAnimationsOf(context);
    if (!animate) {
      return SizedBox(
        width: widget.size,
        height: widget.size,
        child: CustomPaint(
          painter: _SpinnerPainter(progress: 0.35),
        ),
      );
    }
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) => CustomPaint(
          painter: _SpinnerPainter(progress: _controller.value),
        ),
      ),
    );
  }
}

final class _SpinnerPainter extends CustomPainter {
  _SpinnerPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.shortestSide * 0.1;
    final rect = Offset.zero & size;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = SyloraTokens.champagne.withValues(alpha: 0.22);
    canvas.drawArc(rect.deflate(stroke), 0, 6.28, false, paint);
    paint.shader = SweepGradient(
      startAngle: 0,
      endAngle: 6.28,
      transform: GradientRotation(progress * 6.28),
      colors: const [
        SyloraTokens.champagneLight,
        SyloraTokens.champagneDeep,
        Colors.transparent,
      ],
    ).createShader(rect);
    canvas.drawArc(rect.deflate(stroke), 0, 4.2, false, paint);
  }

  @override
  bool shouldRepaint(covariant _SpinnerPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

final class _StateCard extends StatelessWidget {
  const _StateCard({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
    this.secondaryLabel,
    this.onSecondary,
    this.accent = SyloraTokens.champagneDeep,
  });

  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(SyloraTokens.space5),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: SyloraTokens.glassStrong,
              borderRadius: BorderRadius.circular(SyloraTokens.radiusXl),
              border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
              boxShadow: SyloraTokens.softElevation,
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: accent.withValues(alpha: 0.12),
                    ),
                    child: Icon(icon, size: 30, color: accent),
                  ),
                  const SizedBox(height: SyloraTokens.space4),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: SyloraTokens.display(26),
                  ),
                  const SizedBox(height: SyloraTokens.space2),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: SyloraTokens.body(15),
                  ),
                  const SizedBox(height: SyloraTokens.space5),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: onAction,
                        borderRadius:
                            BorderRadius.circular(SyloraTokens.radiusPill),
                        child: Ink(
                          decoration: BoxDecoration(
                            borderRadius:
                                BorderRadius.circular(SyloraTokens.radiusPill),
                            gradient: SyloraTokens.primaryCtaGradient,
                            boxShadow: SyloraTokens.glow(
                              SyloraTokens.champagne,
                              blur: 18,
                              opacity: 0.28,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              actionLabel,
                              textAlign: TextAlign.center,
                              style: SyloraTokens.body(
                                15,
                                color: SyloraTokens.ink,
                                weight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (secondaryLabel != null && onSecondary != null) ...[
                    const SizedBox(height: SyloraTokens.space2),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton(
                        onPressed: onSecondary,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: SyloraTokens.inkSoft,
                          side: BorderSide(
                            color: SyloraTokens.ink.withValues(alpha: 0.12),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(SyloraTokens.radiusPill),
                          ),
                        ),
                        child: Text(
                          secondaryLabel!,
                          style: SyloraTokens.body(
                            14.5,
                            color: SyloraTokens.inkSoft,
                            weight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
