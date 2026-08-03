import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_theme.dart';
import '../../design/sylora_tokens.dart';
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
    _hotTimer = Timer.periodic(const Duration(milliseconds: 1400), (_) {
      if (!mounted) return;
      setState(() => _hot = (_hot + 1) % _ecosystem.length);
    });
    if (kIsWeb) {
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
    context.goNamed(
      'auth',
      queryParameters: create ? const {'create': '1'} : const {},
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = _elapsed.inMilliseconds / 1000;
    _reducedMotion =
        ref.watch(visualSettingsProvider.select((value) => value.reducedMotion));
    final showHud = _reducedMotion || _field.stage > 0.55;
    final width = MediaQuery.sizeOf(context).width;
    final brandSize = (width * 0.14).clamp(34.0, 72.0);

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
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const SweepGradient(
                                colors: [
                                  SyloraTokens.ion,
                                  SyloraTokens.violet,
                                  SyloraTokens.petal,
                                  SyloraTokens.aqua,
                                  SyloraTokens.ion,
                                ],
                              ),
                              boxShadow: SyloraTokens.glow(SyloraTokens.violet, blur: 16),
                            ),
                            child: Center(
                              child: Container(
                                width: 11,
                                height: 11,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
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
                      Text(
                        'ЄДИНА AI-ЕКОСИСТЕМА',
                        textAlign: TextAlign.center,
                        style: LandingTokens.body(
                          11,
                          color: SyloraTokens.violet,
                          weight: FontWeight.w700,
                        ).copyWith(letterSpacing: 2.4),
                      ),
                      const SizedBox(height: 12),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'SYLORA',
                          maxLines: 1,
                          style: LandingTokens.display(brandSize).copyWith(
                            letterSpacing: brandSize * 0.06,
                            color: SyloraTokens.ink,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 440),
                        child: Text(
                          'Створюйте, спілкуйтеся й розвивайте бізнес у живому цифровому просторі — AI, Live, спільнота і творчість разом.',
                          textAlign: TextAlign.center,
                          style: LandingTokens.body(15),
                        ),
                      ),
                      const SizedBox(height: 22),
                      _AetherButton(
                        label: 'Почати',
                        filled: true,
                        onPressed: () => _goAuth(create: true),
                      ),
                      const Spacer(),
                      Text(
                        'МОДУЛІ ЕКОСИСТЕМИ',
                        style: LandingTokens.body(
                          10,
                          color: SyloraTokens.inkMute,
                          weight: FontWeight.w600,
                        ).copyWith(letterSpacing: 2.2),
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
                                      ? SyloraTokens.ion.withValues(alpha: 0.55)
                                      : SyloraTokens.ink.withValues(alpha: 0.08),
                                ),
                                color: i == _hot
                                    ? SyloraTokens.ion.withValues(alpha: 0.1)
                                    : Colors.white.withValues(alpha: 0.62),
                                boxShadow: i == _hot
                                    ? SyloraTokens.glow(SyloraTokens.ion, blur: 18, opacity: 0.18)
                                    : null,
                              ),
                              child: Text(
                                _ecosystem[i].toUpperCase(),
                                style: LandingTokens.body(
                                  10,
                                  color: SyloraTokens.inkSoft,
                                  weight: FontWeight.w600,
                                ).copyWith(letterSpacing: 1.1),
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
            borderRadius: BorderRadius.circular(999),
            gradient: widget.filled
                ? const LinearGradient(
                    colors: [SyloraTokens.ion, SyloraTokens.violet, SyloraTokens.petal],
                  )
                : null,
            color: widget.filled ? null : Colors.white.withValues(alpha: 0.7),
            border: widget.filled
                ? null
                : Border.all(color: SyloraTokens.ink.withValues(alpha: 0.12)),
            boxShadow: widget.filled
                ? SyloraTokens.glow(SyloraTokens.violet, blur: 22, opacity: 0.28)
                : SyloraTokens.softElevation,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: widget.onPressed,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                child: Text(
                  widget.label,
                  textAlign: TextAlign.center,
                  style: LandingTokens.body(
                    14,
                    color: widget.filled ? Colors.white : SyloraTokens.ink,
                    weight: FontWeight.w700,
                  ).copyWith(letterSpacing: 1.2),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
