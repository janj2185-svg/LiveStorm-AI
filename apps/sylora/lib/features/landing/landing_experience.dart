import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_theme.dart';
import 'aether_bridge.dart' if (dart.library.html) 'aether_bridge_web.dart' as aether_bridge;
import 'landing_tokens.dart';
import 'universe_physics.dart';

const _ecosystem = <String>[
  'AI',
  'Live',
  'Community',
  'Business',
  'Education',
  'Marketplace',
  'Gifts',
  'Creator Tools',
];

/// Cinematic SYLORA Aether entry — not a marketing page.
final class LandingExperience extends ConsumerStatefulWidget {
  const LandingExperience({super.key});

  @override
  ConsumerState<LandingExperience> createState() => _LandingExperienceState();
}

final class _LandingExperienceState extends ConsumerState<LandingExperience>
    with SingleTickerProviderStateMixin {
  late final AetherField _field;
  late final Ticker _ticker;
  Duration _elapsed = Duration.zero;
  int _hot = 0;
  Timer? _hotTimer;
  Offset? _pointer;
  bool _reducedMotion = false;

  @override
  void initState() {
    super.initState();
    final mobile = !kIsWeb &&
        (defaultTargetPlatform == TargetPlatform.iOS ||
            defaultTargetPlatform == TargetPlatform.android);
    _field = AetherField(count: mobile ? 1400 : 2800);
    _ticker = createTicker((d) {
      final dt = ((_elapsed == Duration.zero ? d : d - _elapsed).inMicroseconds) /
          1e6;
      _elapsed = d;
      if (!_reducedMotion) {
        if (_pointer != null) {
          _field.pointer = _pointer!;
          _field.pointerActive = true;
        } else {
          _field.pointerActive = false;
        }
        _field.tick(dt.clamp(0.0, 0.033), d.inMilliseconds / 1000);
      } else {
        _field.stage = 1;
      }
      if (mounted) setState(() {});
    })..start();
    _hotTimer = Timer.periodic(const Duration(milliseconds: 1400), (_) {
      if (!mounted) return;
      setState(() => _hot = (_hot + 1) % _ecosystem.length);
    });
    if (kIsWeb) {
      // Prefer the instant HTML/WebGL shell when available.
      aether_bridge.revealAetherShell();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    _hotTimer?.cancel();
    if (kIsWeb) aether_bridge.hideAetherShell();
    super.dispose();
  }

  void _goAuth({required bool create}) {
    if (kIsWeb) {
      aether_bridge.enterAetherApp(create: create);
      return;
    }
    context.goNamed('auth', queryParameters: create ? const {'create': '1'} : const {});
  }

  @override
  Widget build(BuildContext context) {
    // On web the HTML aether covers the view; keep a matching Flutter fallback.
    final t = _elapsed.inMilliseconds / 1000;
    _reducedMotion =
        ref.watch(visualSettingsProvider.select((value) => value.reducedMotion));
    final showHud = _reducedMotion || _field.stage > 0.68;

    return Scaffold(
      backgroundColor: LandingTokens.voidDeep,
      body: Listener(
        onPointerHover: (e) => _mapPointer(e.localPosition, context),
        onPointerMove: (e) => _mapPointer(e.localPosition, context),
        onPointerDown: (e) => _mapPointer(e.localPosition, context),
        onPointerUp: (_) => setState(() => _pointer = null),
        onPointerCancel: (_) => setState(() => _pointer = null),
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: const BoxDecoration(gradient: LandingTokens.heroGradient),
            ),
            CustomPaint(
              painter: AetherPainter(
                field: _field,
                t: t,
                reducedMotion: _reducedMotion,
              ),
              size: Size.infinite,
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0, -0.1),
                  radius: 1.15,
                  colors: [
                    Colors.transparent,
                    Color(0x99010008),
                    Color(0xE0010008),
                  ],
                  stops: [0.35, 0.78, 1],
                ),
              ),
            ),
            SafeArea(
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 700),
                opacity: showHud ? 1 : 0,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 18,
                            height: 18,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [
                                  LandingTokens.ion,
                                  LandingTokens.violet,
                                  LandingTokens.petal,
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'SYLORA',
                            style: LandingTokens.body(
                              12,
                              color: LandingTokens.ink,
                              weight: FontWeight.w700,
                            ).copyWith(letterSpacing: 4),
                          ),
                          const Spacer(),
                          TextButton(
                            onPressed: () => _goAuth(create: false),
                            child: Text(
                              'SIGN IN',
                              style: LandingTokens.body(
                                11,
                                color: LandingTokens.mist,
                                weight: FontWeight.w600,
                              ).copyWith(letterSpacing: 2),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Text(
                        'CREATE · CONNECT · ELEVATE',
                        style: LandingTokens.body(
                          11,
                          color: LandingTokens.mist,
                        ).copyWith(letterSpacing: 4),
                      ),
                      const SizedBox(height: 14),
                      ShaderMask(
                        blendMode: BlendMode.srcIn,
                        shaderCallback: (bounds) => const LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.white,
                            LandingTokens.mist,
                            LandingTokens.violet,
                          ],
                        ).createShader(bounds),
                        child: Text(
                          'SYLORA',
                          style: LandingTokens.display(
                            MediaQuery.sizeOf(context).width < 420 ? 54 : 72,
                          ).copyWith(letterSpacing: 10, color: Colors.white),
                        ),
                      ),
                      const SizedBox(height: 14),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Text(
                          'A living digital ecosystem — AI, live presence, community, and creation in one continuum.',
                          textAlign: TextAlign.center,
                          style: LandingTokens.body(15),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        alignment: WrapAlignment.center,
                        children: [
                          _AetherButton(
                            label: 'ENTER SYLORA',
                            filled: true,
                            onPressed: () => _goAuth(create: true),
                          ),
                          _AetherButton(
                            label: 'SIGN IN',
                            filled: false,
                            onPressed: () => _goAuth(create: false),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Text(
                        'ECOSYSTEM CONSTELLATION',
                        style: LandingTokens.body(
                          10,
                          color: LandingTokens.mist.withValues(alpha: 0.55),
                        ).copyWith(letterSpacing: 3),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: [
                          for (var i = 0; i < _ecosystem.length; i++)
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 320),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 7,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(
                                  color: i == _hot
                                      ? LandingTokens.ion.withValues(alpha: 0.7)
                                      : LandingTokens.glassStroke,
                                ),
                                color: i == _hot
                                    ? LandingTokens.ion.withValues(alpha: 0.12)
                                    : LandingTokens.glass,
                              ),
                              child: Text(
                                _ecosystem[i].toUpperCase(),
                                style: LandingTokens.body(
                                  10,
                                  color: i == _hot
                                      ? LandingTokens.ink
                                      : LandingTokens.inkDim,
                                  weight: FontWeight.w600,
                                ).copyWith(letterSpacing: 1.2),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _mapPointer(Offset local, BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final cx = size.width * 0.5;
    final cy = size.height * 0.42;
    final scale = (size.shortestSide * 0.38).clamp(1.0, 10000.0);
    setState(() {
      _pointer = Offset((local.dx - cx) / scale, (local.dy - cy) / (scale * 0.95));
    });
  }
}

final class _AetherButton extends StatefulWidget {
  const _AetherButton({
    required this.label,
    required this.filled,
    required this.onPressed,
  });

  final String label;
  final bool filled;
  final VoidCallback onPressed;

  @override
  State<_AetherButton> createState() => _AetherButtonState();
}

final class _AetherButtonState extends State<_AetherButton> {
  bool _hot = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hot = true),
      onExit: (_) => setState(() => _hot = false),
      child: AnimatedScale(
        scale: _hot ? 1.03 : 1,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: _hot
                  ? LandingTokens.ion.withValues(alpha: 0.75)
                  : LandingTokens.glassStroke,
            ),
            gradient: widget.filled
                ? LinearGradient(
                    colors: [
                      LandingTokens.ion.withValues(alpha: _hot ? 0.28 : 0.16),
                      LandingTokens.petal.withValues(alpha: _hot ? 0.24 : 0.14),
                    ],
                  )
                : null,
            color: widget.filled ? null : LandingTokens.glass,
            boxShadow: _hot
                ? [
                    BoxShadow(
                      color: LandingTokens.violet.withValues(alpha: 0.35),
                      blurRadius: 28,
                    ),
                  ]
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: widget.onPressed,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                child: Text(
                  widget.label,
                  style: LandingTokens.body(
                    12,
                    color: LandingTokens.ink,
                    weight: FontWeight.w700,
                  ).copyWith(letterSpacing: 2),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
