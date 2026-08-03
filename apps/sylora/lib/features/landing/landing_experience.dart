import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_theme.dart';
import 'landing_tokens.dart';
import 'landing_world.dart';

/// Immersive world-entry experience. Auth is intentionally absent until the finale.
final class LandingExperience extends ConsumerStatefulWidget {
  const LandingExperience({super.key});

  @override
  ConsumerState<LandingExperience> createState() => _LandingExperienceState();
}

final class _LandingExperienceState extends ConsumerState<LandingExperience>
    with SingleTickerProviderStateMixin {
  final _scroll = ScrollController();
  late final Ticker _ticker;
  Duration _elapsed = Duration.zero;
  double _progress = 0;
  bool _heroVisible = true;

  static const _sceneCount = 7.2;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      if (!mounted) {
        return;
      }
      setState(() => _elapsed = elapsed);
    })..start();
    _scroll.addListener(_onScroll);
  }

  void _onScroll() {
    if (!_scroll.hasClients) {
      return;
    }
    final max = _scroll.position.maxScrollExtent;
    final next = max <= 0 ? 0.0 : (_scroll.offset / max).clamp(0.0, 1.0);
    final hero = next < 0.08;
    if (next != _progress || hero != _heroVisible) {
      setState(() {
        _progress = next;
        _heroVisible = hero;
      });
    }
  }

  Future<void> _beginJourney() async {
    if (!_scroll.hasClients) {
      return;
    }
    final reduced = ref.read(visualSettingsProvider).reducedMotion;
    final target = _scroll.position.maxScrollExtent * 0.14;
    if (reduced) {
      _scroll.jumpTo(target);
      return;
    }
    await _scroll.animateTo(
      target,
      duration: const Duration(milliseconds: 1400),
      curve: Curves.easeInOutCubic,
    );
  }

  void _openAuth({required bool create}) {
    context.goNamed(
      'auth',
      queryParameters: create ? const <String, String>{'create': '1'} : const <String, String>{},
    );
  }

  @override
  void dispose() {
    _ticker.dispose();
    _scroll
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final compact = size.width < 720;
    final reduced = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    final time = _elapsed.inMilliseconds / 1000.0;
    final storyOpacity = ((_progress - 0.06) / 0.12).clamp(0.0, 1.0);
    final finale = ((_progress - 0.86) / 0.12).clamp(0.0, 1.0);
    final aiLine = _aiLine((_progress - 0.52).clamp(0.0, 1.0) / 0.18);

    return Scaffold(
      backgroundColor: LandingTokens.canvas,
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          const DecoratedBox(decoration: BoxDecoration(gradient: LandingTokens.heroGradient)),
          CustomPaint(
            painter: LandingWorldPainter(
              progress: _progress,
              time: time,
              reducedMotion: reduced,
              compact: compact,
            ),
          ),
          IgnorePointer(
            child: Center(
              child: Transform.translate(
                offset: Offset(0, -size.height * 0.04 * (1 - finale)),
                child: LandingCore(
                  progress: _progress,
                  time: time,
                  reducedMotion: reduced,
                ),
              ),
            ),
          ),
          NotificationListener<ScrollNotification>(
            onNotification: (_) {
              _onScroll();
              return false;
            },
            child: SingleChildScrollView(
              controller: _scroll,
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              child: SizedBox(
                height: size.height * _sceneCount,
                width: size.width,
                child: Stack(
                  children: <Widget>[
                    _scene(
                      size: size,
                      topFactor: 0.08,
                      opacity: (1 - (_progress / 0.14)).clamp(0.0, 1.0),
                      child: _HeroCopy(onBegin: _beginJourney, compact: compact),
                    ),
                    _scene(
                      size: size,
                      topFactor: 1.05,
                      opacity: _band(0.1, 0.2, 0.32) * storyOpacity,
                      child: _MomentLine(
                        title: 'Спочатку — іскра.',
                        body: 'Ідея з’являється тихо. Світ ще порожній — і вже живий.',
                      ),
                    ),
                    _scene(
                      size: size,
                      topFactor: 2.0,
                      opacity: _band(0.22, 0.34, 0.46),
                      child: _MomentLine(
                        title: 'Потім — люди.',
                        body: 'Обличчя, тепло, присутність. Без стін і без шуму.',
                      ),
                    ),
                    _scene(
                      size: size,
                      topFactor: 2.95,
                      opacity: _band(0.34, 0.46, 0.58),
                      child: _MomentLine(
                        title: 'І розмови між ними.',
                        body: 'Легкі діалоги орбітою навколо спільного центру.',
                      ),
                    ),
                    _scene(
                      size: size,
                      topFactor: 3.9,
                      opacity: _band(0.46, 0.58, 0.7),
                      child: _MomentLine(
                        title: 'Голос. Спогади. Зв’язки.',
                        body: 'Хвиля голосу. Нитки пам’яті. Усе з’єднується природно.',
                      ),
                    ),
                    _scene(
                      size: size,
                      topFactor: 4.85,
                      opacity: _band(0.56, 0.68, 0.8),
                      child: _MomentLine(
                        title: 'Творчість і м’який інтелект.',
                        body: aiLine,
                        emphasizeBody: true,
                      ),
                    ),
                    _scene(
                      size: size,
                      topFactor: 5.75,
                      opacity: _band(0.68, 0.78, 0.9),
                      child: _MomentLine(
                        title: 'Подарунки. Спільноти.',
                        body: 'Один екосистемний світ — теплий, цілісний, живий.',
                      ),
                    ),
                    _scene(
                      size: size,
                      topFactor: 6.45,
                      opacity: finale,
                      child: _Finale(
                        compact: compact,
                        onCreate: () => _openAuth(create: true),
                        onSignIn: () => _openAuth(create: false),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (!_heroVisible && finale < 0.85)
            Positioned(
              top: MediaQuery.paddingOf(context).top + 12,
              left: 0,
              right: 0,
              child: IgnorePointer(
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 400),
                  opacity: 0.9,
                  child: Text(
                    'SYLORA',
                    textAlign: TextAlign.center,
                    style: LandingTokens.body(
                      13,
                      color: LandingTokens.ink.withValues(alpha: 0.45),
                      weight: FontWeight.w600,
                    ).copyWith(letterSpacing: 4),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  double _band(double start, double peak, double end) {
    if (_progress < start || _progress > end) {
      return 0;
    }
    if (_progress <= peak) {
      return ((_progress - start) / (peak - start)).clamp(0.0, 1.0);
    }
    return (1 - (_progress - peak) / (end - peak)).clamp(0.0, 1.0);
  }

  String _aiLine(double t) {
    const full = 'SYLORA думає разом із тобою…';
    if (t <= 0) {
      return '';
    }
    final count = math.max(1, (full.length * t.clamp(0.0, 1.0)).round());
    return full.substring(0, count.clamp(0, full.length));
  }

  Widget _scene({
    required Size size,
    required double topFactor,
    required double opacity,
    required Widget child,
  }) {
    if (opacity <= 0.01) {
      return const SizedBox.shrink();
    }
    return Positioned(
      top: size.height * topFactor,
      left: 0,
      right: 0,
      child: Opacity(
        opacity: opacity,
        child: Transform.translate(
          offset: Offset(0, (1 - opacity) * 18),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: size.width < 720 ? 24 : 48),
            child: child,
          ),
        ),
      ),
    );
  }
}

final class _HeroCopy extends StatelessWidget {
  const _HeroCopy({required this.onBegin, required this.compact});

  final VoidCallback onBegin;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        SizedBox(height: compact ? 56 : 72),
        Text(
          'SYLORA',
          textAlign: TextAlign.center,
          style: LandingTokens.display(compact ? 52 : 72).copyWith(
            fontWeight: FontWeight.w500,
            letterSpacing: compact ? 6 : 10,
          ),
        ),
        const SizedBox(height: 28),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Text(
            'Майбутнє починається не з технологій.\nВоно починається з людей.',
            textAlign: TextAlign.center,
            style: LandingTokens.display(compact ? 26 : 34, height: 1.25),
          ),
        ),
        const SizedBox(height: 14),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Text(
            'Один теплий світ для життя онлайн.',
            textAlign: TextAlign.center,
            style: LandingTokens.body(compact ? 16 : 18),
          ),
        ),
        const SizedBox(height: 36),
        _LandingCta(label: 'Почати', onPressed: onBegin, filled: true),
        const SizedBox(height: 18),
        Text(
          'Прокрутіть, щоб увійти у світ',
          style: LandingTokens.body(13, color: LandingTokens.ink.withValues(alpha: 0.4)),
        ),
      ],
    );
  }
}

final class _MomentLine extends StatelessWidget {
  const _MomentLine({
    required this.title,
    required this.body,
    this.emphasizeBody = false,
  });

  final String title;
  final String body;
  final bool emphasizeBody;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: LandingGlassPanel(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                title,
                textAlign: TextAlign.center,
                style: LandingTokens.display(28),
              ),
              if (body.isNotEmpty) ...<Widget>[
                const SizedBox(height: 10),
                Text(
                  body,
                  textAlign: TextAlign.center,
                  style: emphasizeBody
                      ? LandingTokens.body(
                          17,
                          color: LandingTokens.ink,
                          weight: FontWeight.w500,
                        )
                      : LandingTokens.body(16),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

final class _Finale extends StatelessWidget {
  const _Finale({
    required this.compact,
    required this.onCreate,
    required this.onSignIn,
  });

  final bool compact;
  final VoidCallback onCreate;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        Text(
          'SYLORA',
          textAlign: TextAlign.center,
          style: LandingTokens.display(compact ? 42 : 56).copyWith(letterSpacing: 8),
        ),
        const SizedBox(height: 16),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Text(
            'Усе сходиться тут.\nВаш цифровий світ чекає.',
            textAlign: TextAlign.center,
            style: LandingTokens.display(compact ? 24 : 30, height: 1.25),
          ),
        ),
        const SizedBox(height: 36),
        LandingGlassPanel(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Column(
              children: <Widget>[
                _LandingCta(
                  label: 'Створити акаунт',
                  onPressed: onCreate,
                  filled: true,
                ),
                const SizedBox(height: 12),
                _LandingCta(
                  label: 'Увійти',
                  onPressed: onSignIn,
                  filled: false,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

final class _LandingCta extends StatefulWidget {
  const _LandingCta({
    required this.label,
    required this.onPressed,
    required this.filled,
  });

  final String label;
  final VoidCallback onPressed;
  final bool filled;

  @override
  State<_LandingCta> createState() => _LandingCtaState();
}

final class _LandingCtaState extends State<_LandingCta> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final filled = widget.filled;
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedScale(
        scale: _hover ? 1.02 : 1,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        child: SizedBox(
          width: double.infinity,
          height: 54,
          child: filled
              ? FilledButton(
                  onPressed: widget.onPressed,
                  style: FilledButton.styleFrom(
                    backgroundColor: LandingTokens.ink,
                    foregroundColor: LandingTokens.pearl,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    elevation: 0,
                    textStyle: LandingTokens.body(16, weight: FontWeight.w600, color: LandingTokens.pearl),
                  ),
                  child: Text(widget.label),
                )
              : OutlinedButton(
                  onPressed: widget.onPressed,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: LandingTokens.ink,
                    side: BorderSide(
                      color: LandingTokens.ink.withValues(alpha: 0.22),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    textStyle: LandingTokens.body(16, weight: FontWeight.w600),
                  ),
                  child: Text(widget.label),
                ),
        ),
      ),
    );
  }
}
