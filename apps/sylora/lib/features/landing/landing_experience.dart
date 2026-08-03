import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_theme.dart';
import 'landing_tokens.dart';
import 'universe_canvas.dart';
import 'universe_physics.dart';

/// One continuous cinematic universe. Not a landing page.
final class LandingExperience extends ConsumerStatefulWidget {
  const LandingExperience({super.key});

  @override
  ConsumerState<LandingExperience> createState() => _LandingExperienceState();
}

final class _LandingExperienceState extends ConsumerState<LandingExperience>
    with SingleTickerProviderStateMixin {
  final _scroll = ScrollController();
  late final Ticker _ticker;
  late UniversePhysics _physics;

  ui.FragmentShader? _atmosphere;
  Duration _elapsed = Duration.zero;
  Duration _lastTick = Duration.zero;
  double _progress = 0;
  Offset _camera = Offset.zero;
  bool _booted = false;

  static const _travel = 8.5;

  @override
  void initState() {
    super.initState();
    _physics = UniversePhysics(seed: 42);
    _ticker = createTicker(_onTick)..start();
    _scroll.addListener(_syncCamera);
    _loadShader();
  }

  Future<void> _loadShader() async {
    try {
      final program = await ui.FragmentProgram.fromAsset(
        'shaders/universe_atmosphere.frag',
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _atmosphere = program.fragmentShader();
        _booted = true;
      });
    } on Object {
      if (mounted) {
        setState(() => _booted = true);
      }
    }
  }

  void _onTick(Duration elapsed) {
    if (!mounted) {
      return;
    }
    final dtMs = _lastTick == Duration.zero
        ? 16.0
        : (elapsed - _lastTick).inMicroseconds / 1000.0;
    _lastTick = elapsed;
    final dt = (dtMs / 1000.0).clamp(0.0, 0.033);
    final reduced = ref.read(visualSettingsProvider).reducedMotion;
    _physics.tick(reduced ? dt * 0.35 : dt, _progress);

    // Subtle dream-camera drift.
    final breath = reduced ? 0.0 : (elapsed.inMilliseconds / 1000.0);
    final targetCamera = Offset(
      (1 - _progress) * 8 * (reduced ? 0 : 1) +
          (reduced ? 0 : 6 * math.sin(breath * 0.15)),
      _progress * 28 + (reduced ? 0 : 10 * math.cos(breath * 0.11)),
    );
    _camera = Offset.lerp(_camera, targetCamera, 0.06)!;

    setState(() => _elapsed = elapsed);
  }

  void _syncCamera() {
    if (!_scroll.hasClients) {
      return;
    }
    final max = _scroll.position.maxScrollExtent;
    final next = max <= 0 ? 0.0 : (_scroll.offset / max).clamp(0.0, 1.0);
    if ((next - _progress).abs() > 0.0005) {
      setState(() => _progress = next);
    }
  }

  Future<void> _enter() async {
    if (!_scroll.hasClients) {
      return;
    }
    final reduced = ref.read(visualSettingsProvider).reducedMotion;
    final target = _scroll.position.maxScrollExtent * 0.08;
    if (reduced) {
      _scroll.jumpTo(target);
      return;
    }
    await _scroll.animateTo(
      target,
      duration: const Duration(milliseconds: 2200),
      curve: Curves.easeInOutCubic,
    );
  }

  void _openAuth({required bool create}) {
    context.goNamed(
      'auth',
      queryParameters: create
          ? const <String, String>{'create': '1'}
          : const <String, String>{},
    );
  }

  @override
  void dispose() {
    _ticker.dispose();
    _atmosphere?.dispose();
    _scroll
      ..removeListener(_syncCamera)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final reduced = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    final time = _elapsed.inMilliseconds / 1000.0;
    final finale = _smooth((_progress - 0.88) / 0.12);
    final showEnter = _progress < 0.05;

    return Scaffold(
      backgroundColor: LandingTokens.canvas,
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          // Atmosphere shader (soft volumetric light + grain).
          if (_atmosphere != null)
            CustomPaint(
              painter: _AtmospherePainter(
                shader: _atmosphere!,
                time: time,
                progress: _progress,
                camera: _camera,
              ),
            )
          else
            const DecoratedBox(
              decoration: BoxDecoration(gradient: LandingTokens.heroGradient),
            ),

          // Living matter.
          if (_booted)
            CustomPaint(
              painter: UniverseCanvasPainter(
                physics: _physics,
                progress: _progress,
                time: time,
                reducedMotion: reduced,
                camera: _camera,
              ),
            ),

          // Invisible dolly — scroll = camera travel through the dream.
          NotificationListener<ScrollNotification>(
            onNotification: (_) {
              _syncCamera();
              return false;
            },
            child: SingleChildScrollView(
              controller: _scroll,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              child: SizedBox(height: size.height * _travel, width: size.width),
            ),
          ),

          // Almost no text — fleeting titles only.
          IgnorePointer(
            child: _WhisperLayer(progress: _progress, compact: size.width < 720),
          ),

          // Threshold invitation (not a marketing hero block).
          if (showEnter)
            Positioned(
              left: 0,
              right: 0,
              bottom: MediaQuery.paddingOf(context).bottom + 36,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 500),
                opacity: showEnter ? 1 : 0,
                child: Column(
                  children: <Widget>[
                    Text(
                      'SYLORA',
                      style: LandingTokens.display(18).copyWith(
                        letterSpacing: 10,
                        color: LandingTokens.ink.withValues(alpha: 0.55),
                      ),
                    ),
                    const SizedBox(height: 18),
                    _QuietButton(label: 'Увійти у світ', onPressed: _enter),
                  ],
                ),
              ),
            ),

          // Collapse complete — only then identity.
          if (finale > 0.15)
            Positioned.fill(
              child: IgnorePointer(
                ignoring: finale < 0.55,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 400),
                  opacity: finale.clamp(0.0, 1.0),
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                        28,
                        0,
                        28,
                        MediaQuery.paddingOf(context).bottom + 40,
                      ),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 340),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Text(
                              'SYLORA',
                              style: LandingTokens.display(42).copyWith(
                                letterSpacing: 8,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Ваш світ чекає.',
                              style: LandingTokens.body(16),
                            ),
                            const SizedBox(height: 28),
                            _QuietButton(
                              label: 'Створити акаунт',
                              onPressed: () => _openAuth(create: true),
                              filled: true,
                            ),
                            const SizedBox(height: 10),
                            _QuietButton(
                              label: 'Увійти',
                              onPressed: () => _openAuth(create: false),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  static double _smooth(double t) {
    final x = t.clamp(0.0, 1.0);
    return x * x * (3 - 2 * x);
  }
}

final class _AtmospherePainter extends CustomPainter {
  _AtmospherePainter({
    required this.shader,
    required this.time,
    required this.progress,
    required this.camera,
  });

  final ui.FragmentShader shader;
  final double time;
  final double progress;
  final Offset camera;

  @override
  void paint(Canvas canvas, Size size) {
    shader
      ..setFloat(0, size.width)
      ..setFloat(1, size.height)
      ..setFloat(2, time)
      ..setFloat(3, progress)
      ..setFloat(4, camera.dx / 40)
      ..setFloat(5, camera.dy / 40);
    canvas.drawRect(Offset.zero & size, Paint()..shader = shader);
  }

  @override
  bool shouldRepaint(covariant _AtmospherePainter oldDelegate) =>
      oldDelegate.time != time ||
      oldDelegate.progress != progress ||
      oldDelegate.camera != camera;
}

/// Fleeting whispers — never feature cards.
final class _WhisperLayer extends StatelessWidget {
  const _WhisperLayer({required this.progress, required this.compact});

  final double progress;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final whispers = <(double, double, double, String, String?)>[
      (0.06, 0.14, 0.24, 'Спочатку — тиша.', null),
      (0.18, 0.28, 0.38, 'Іскри шукають одна одну.', null),
      (0.32, 0.42, 0.52, 'Спогади з’єднуються.', null),
      (0.44, 0.54, 0.64, 'Хтось говорить.', 'Хтось слухає.'),
      (0.56, 0.66, 0.76, 'З’являються люди.', null),
      (0.68, 0.78, 0.88, 'Спільноти дихають разом.', null),
    ];

    return Stack(
      children: <Widget>[
        for (final w in whispers)
          Positioned(
            left: 28,
            right: 28,
            top: MediaQuery.sizeOf(context).height * (compact ? 0.14 : 0.16),
            child: Opacity(
              opacity: _band(progress, w.$1, w.$2, w.$3),
              child: Column(
                children: <Widget>[
                  Text(
                    w.$4,
                    textAlign: TextAlign.center,
                    style: LandingTokens.display(compact ? 26 : 32).copyWith(
                      color: LandingTokens.ink.withValues(alpha: 0.78),
                    ),
                  ),
                  if (w.$5 != null) ...<Widget>[
                    const SizedBox(height: 8),
                    Text(
                      w.$5!,
                      textAlign: TextAlign.center,
                      style: LandingTokens.body(
                        15,
                        color: LandingTokens.ink.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  static double _band(double p, double a, double b, double c) {
    if (p < a || p > c) {
      return 0;
    }
    if (p <= b) {
      return ((p - a) / (b - a)).clamp(0.0, 1.0);
    }
    return (1 - (p - b) / (c - b)).clamp(0.0, 1.0);
  }
}

final class _QuietButton extends StatefulWidget {
  const _QuietButton({
    required this.label,
    required this.onPressed,
    this.filled = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool filled;

  @override
  State<_QuietButton> createState() => _QuietButtonState();
}

final class _QuietButtonState extends State<_QuietButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedScale(
        scale: _hover ? 1.03 : 1,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        child: SizedBox(
          width: 240,
          height: 52,
          child: widget.filled
              ? FilledButton(
                  onPressed: widget.onPressed,
                  style: FilledButton.styleFrom(
                    backgroundColor: LandingTokens.ink,
                    foregroundColor: LandingTokens.pearl,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(999),
                    ),
                    textStyle: LandingTokens.body(
                      15,
                      weight: FontWeight.w600,
                      color: LandingTokens.pearl,
                    ),
                  ),
                  child: Text(widget.label),
                )
              : TextButton(
                  onPressed: widget.onPressed,
                  style: TextButton.styleFrom(
                    foregroundColor: LandingTokens.ink.withValues(alpha: 0.72),
                    textStyle: LandingTokens.body(15, weight: FontWeight.w500),
                  ),
                  child: Text(widget.label),
                ),
        ),
      ),
    );
  }
}
