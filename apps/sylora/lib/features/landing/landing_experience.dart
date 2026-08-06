import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/locale_controller.dart';
import '../../core/lumen_theme.dart';
import '../../design/sylora_components.dart';
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
                          const Expanded(
                            child: SyloraBrandLockup(size: 30, showUnified: false),
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
                      SyloraMark(size: markSize, animated: true, hero: true),
                      const SizedBox(height: 18),
                      const SyloraHeroWordmark(syloraSize: 26),
                      const SizedBox(height: 12),
                      Text(
                        'ТЕХНОЛОГІЇ. ГАРМОНІЯ. МАЙБУТНЄ.',
                        textAlign: TextAlign.center,
                        style: LandingTokens.body(
                          11,
                          color: SyloraTokens.goldDeep,
                          weight: FontWeight.w600,
                        ).copyWith(letterSpacing: 1.8, height: 1.45),
                      ),
                      const SizedBox(height: 28),
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
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () => context.goNamed(
                          'auth',
                          queryParameters: const {'learn': '1'},
                        ),
                        child: Text(
                          'Дізнатися більше',
                          style: LandingTokens.body(
                            13,
                            color: SyloraTokens.inkSoft,
                            weight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: <Widget>[
                          for (final option in SyloraLocales.options)
                            _LandingLangChip(
                              code: option.locale.languageCode.toUpperCase(),
                              languageCode: option.locale.languageCode,
                            ),
                        ],
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

final class _LandingLangChip extends ConsumerWidget {
  const _LandingLangChip({
    required this.code,
    required this.languageCode,
  });

  final String code;
  final String languageCode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final active =
        ref.watch(localeControllerProvider).languageCode == languageCode;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
        onTap: () => ref
            .read(localeControllerProvider.notifier)
            .setLocale(Locale(languageCode)),
        child: AnimatedContainer(
          duration: SyloraTokens.durFast,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
            color: active
                ? SyloraTokens.gold.withValues(alpha: 0.28)
                : Colors.white.withValues(alpha: 0.45),
            border: Border.all(
              color: active
                  ? SyloraTokens.goldDeep.withValues(alpha: 0.55)
                  : Colors.white.withValues(alpha: 0.8),
            ),
          ),
          child: Text(
            code,
            style: LandingTokens.body(
              11,
              color: SyloraTokens.ink,
              weight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
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
            gradient: widget.filled
                ? const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0xFFF5DEB3),
                      Color(0xFFE6C88B),
                      Color(0xFFC9A45C),
                    ],
                  )
                : null,
            color: widget.filled ? null : Colors.white.withValues(alpha: 0.55),
            border: Border.all(
              color: widget.filled
                  ? Colors.white.withValues(alpha: 0.55)
                  : Colors.white.withValues(alpha: 0.85),
              width: 1.2,
            ),
            boxShadow: widget.filled
                ? [
                    ...SyloraTokens.glow(SyloraTokens.gold, blur: 26, opacity: 0.42),
                    BoxShadow(
                      color: Colors.white.withValues(alpha: 0.55),
                      blurRadius: 0,
                      spreadRadius: 0,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : [
                    ...SyloraTokens.glassElevation,
                    BoxShadow(
                      color: SyloraTokens.cyan.withValues(alpha: 0.18),
                      blurRadius: 22,
                    ),
                  ],
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
