import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'l10n/sylora_localizations.dart';
import 'lumen_effects.dart';
import 'lumen_theme.dart';

/// Global Aura assistant — accessible from any authenticated screen.
final class AuraOverlay extends ConsumerStatefulWidget {
  const AuraOverlay({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<AuraOverlay> createState() => _AuraOverlayState();
}

final class _AuraOverlayState extends ConsumerState<AuraOverlay>
    with SingleTickerProviderStateMixin {
  bool _expanded = false;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reducedMotion = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    if (reducedMotion && _pulse.isAnimating) {
      _pulse.stop();
    } else if (!reducedMotion && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    }

    final locale = ref.watch(localeProvider);
    final hint = SyloraStrings.t(locale, 'aura_hint');

    return Stack(
      children: <Widget>[
        widget.child,
        Positioned(
          right: 20,
          bottom: 88,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (_expanded)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: LumenVellum(
                    padding: const EdgeInsets.all(16),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 320),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Text(
                            'Aura',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            hint,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: <Widget>[
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: () {
                                    setState(() => _expanded = false);
                                    context.goNamed('ai');
                                  },
                                  icon: const Icon(Icons.chat_rounded, size: 18),
                                  label: const Text('Open'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                onPressed: () => setState(() => _expanded = false),
                                icon: const Icon(Icons.close_rounded),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              _AuraFab(
                pulse: reducedMotion ? 0 : _pulse.value,
                onTap: () {
                  if (_expanded) {
                    context.goNamed('ai');
                  } else {
                    setState(() => _expanded = true);
                  }
                },
                onLongPress: () => context.goNamed('ai'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

final class _AuraFab extends StatelessWidget {
  const _AuraFab({
    required this.pulse,
    required this.onTap,
    required this.onLongPress,
  });

  final double pulse;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final glow = 0.35 + pulse * 0.25;
    return Semantics(
      button: true,
      label: 'Aura AI assistant',
      child: GestureDetector(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: <Color>[
                LumenColors.aether.withValues(alpha: 0.9),
                LumenColors.pulse.withValues(alpha: 0.85),
              ],
            ),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: LumenColors.aether.withValues(alpha: glow),
                blurRadius: 20 + pulse * 12,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Icon(Icons.auto_awesome_rounded, color: Colors.white),
        ),
      ),
    );
  }
}
