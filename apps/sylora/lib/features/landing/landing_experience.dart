import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_theme.dart';
import '../../design/sylora_icons.dart';
import '../../design/sylora_tokens.dart';
import 'aether_bridge.dart' if (dart.library.html) 'aether_bridge_web.dart' as aether_bridge;
import 'landing_tokens.dart';
import 'universe_physics.dart';

/// Light Lumen entry — Flutter fallback when the HTML shell is unavailable.
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
  Offset? _pointer;
  bool _reducedMotion = false;

  @override
  void initState() {
    super.initState();
    // On web the HTML aether shell owns Welcome visuals. Keep Flutter idle
    // so background preload does not compete with the landing canvas.
    if (kIsWeb) {
      _field = AetherField(count: 0);
      _ticker = createTicker((_) {})..stop();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) aether_bridge.revealAetherShell();
      });
      return;
    }
    final mobile = defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.android;
    _field = AetherField(count: mobile ? 900 : 1600);
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
  }

  @override
  void dispose() {
    _ticker.dispose();
    // Do not hide the HTML shell here — enterApp/auth owns the handoff.
    super.dispose();
  }

  void _goAuth({required bool create}) {
    if (kIsWeb) {
      aether_bridge.enterAetherApp(create: create);
      return;
    }
    context.goNamed(
      'auth',
      queryParameters: create ? const {'create': '1'} : const {},
    );
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      // Transparent placeholder under the HTML aether overlay.
      return const ColoredBox(color: SyloraTokens.canvas);
    }
    final t = _elapsed.inMilliseconds / 1000;
    _reducedMotion =
        ref.watch(visualSettingsProvider.select((value) => value.reducedMotion));
    final showHud = _reducedMotion || _field.stage > 0.55;
    final width = MediaQuery.sizeOf(context).width;
    final markSize = (width * 0.46).clamp(148.0, 280.0);

    return Scaffold(
      backgroundColor: SyloraTokens.canvas,
      body: Listener(
        onPointerHover: (e) => _mapPointer(e.localPosition, context),
        onPointerMove: (e) => _mapPointer(e.localPosition, context),
        onPointerDown: (e) => _mapPointer(e.localPosition, context),
        onPointerUp: (_) => setState(() => _pointer = null),
        onPointerCancel: (_) => setState(() => _pointer = null),
        child: Stack(
          fit: StackFit.expand,
          children: [
            const DecoratedBox(
              decoration: BoxDecoration(gradient: SyloraTokens.heroGradient),
            ),
            CustomPaint(
              painter: AetherPainter(
                field: _field,
                t: t,
                reducedMotion: _reducedMotion,
              ),
              size: Size.infinite,
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -0.15),
                  radius: 1.2,
                  colors: [
                    Colors.white.withValues(alpha: 0.35),
                    Colors.transparent,
                    SyloraTokens.canvas.withValues(alpha: 0.55),
                  ],
                  stops: const [0.2, 0.62, 1],
                ),
              ),
            ),
            SafeArea(
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 700),
                opacity: showHud ? 1 : 0,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 10, 18, 18),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          SyloraMark(size: 28, animated: true),
                          const SizedBox(width: 10),
                          Flexible(
                            child: Text(
                              'SYLORA',
                              overflow: TextOverflow.ellipsis,
                              style: LandingTokens.body(
                                13,
                                color: LandingTokens.ink,
                                weight: FontWeight.w700,
                              ).copyWith(letterSpacing: 3),
                            ),
                          ),
                          TextButton(
                            onPressed: () => _goAuth(create: false),
                            child: Text(
                              'Увійти',
                              style: LandingTokens.body(
                                13,
                                color: LandingTokens.inkSoft,
                                weight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      SyloraMark(size: markSize, animated: true),
                      const SizedBox(height: 22),
                      Text(
                        'SYLORA',
                        textAlign: TextAlign.center,
                        style: LandingTokens.body(
                          13,
                          color: LandingTokens.ink,
                          weight: FontWeight.w700,
                        ).copyWith(letterSpacing: 4.2),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'ONE WORLD. INFINITE CREATION.',
                        textAlign: TextAlign.center,
                        style: LandingTokens.body(
                          11,
                          color: SyloraTokens.goldDeep,
                          weight: FontWeight.w600,
                        ).copyWith(letterSpacing: 2.2),
                      ),
                      const SizedBox(height: 14),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Text(
                          'Живий ефір, творчість, звʼязок і інтелект — одна преміальна платформа.',
                          textAlign: TextAlign.center,
                          style: LandingTokens.body(15),
                        ),
                      ),
                      const SizedBox(height: 24),
                      _AetherButton(
                        label: 'Увійти',
                        filled: true,
                        onPressed: () => _goAuth(create: false),
                      ),
                      const SizedBox(height: 10),
                      _AetherButton(
                        label: 'Створити акаунт',
                        filled: false,
                        onPressed: () => _goAuth(create: true),
                      ),
                      const Spacer(),
                      const SizedBox(height: 8),
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
    required this.onPressed,
    this.filled = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool filled;

  @override
  State<_AetherButton> createState() => _AetherButtonState();
}

final class _AetherButtonState extends State<_AetherButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedScale(
        scale: _hover ? 1.03 : 1,
        duration: SyloraTokens.durFast,
        curve: SyloraTokens.curveSoft,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusCta),
            gradient: widget.filled ? SyloraTokens.primaryCtaGradient : null,
            color: widget.filled ? null : SyloraTokens.glassStrong,
            border: widget.filled
                ? null
                : Border.all(color: SyloraTokens.glassStroke),
            boxShadow: widget.filled
                ? SyloraTokens.glow(SyloraTokens.gold, blur: 22, opacity: 0.3)
                : SyloraTokens.glassElevation,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(SyloraTokens.radiusCta),
              onTap: widget.onPressed,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                child: Text(
                  widget.label,
                  textAlign: TextAlign.center,
                  style: LandingTokens.body(
                    14,
                    color: SyloraTokens.ink,
                    weight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
