import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/generated/app_localizations.dart';
import 'sylora_aura.dart';
import 'sylora_components.dart';
import 'sylora_tokens.dart';

enum SyloraAuraContextPreset {
  feed,
  friends,
  live,
  ai,
  gifts,
  creatorStudio,
  marketplace,
  business,
  learning,
  creator,
  settings,
  conferences,
}

/// How Aura occupies the UI.
///
/// - [hidden] — not rendered (default product state)
/// - [summon] — tiny non-blocking orb; expands only on tap
/// - [companion] — living conversation presence (AI chat / explicit activate)
enum SyloraAuraPresenceMode { hidden, summon, companion }

final Map<SyloraAuraContextPreset, AuraEmotion> _presetEmotions =
    <SyloraAuraContextPreset, AuraEmotion>{
      SyloraAuraContextPreset.feed: AuraEmotion.greeting,
      SyloraAuraContextPreset.friends: AuraEmotion.amused,
      SyloraAuraContextPreset.conferences: AuraEmotion.listening,
      SyloraAuraContextPreset.live: AuraEmotion.focused,
      SyloraAuraContextPreset.ai: AuraEmotion.greeting,
      SyloraAuraContextPreset.gifts: AuraEmotion.amused,
      SyloraAuraContextPreset.creatorStudio: AuraEmotion.greeting,
      SyloraAuraContextPreset.marketplace: AuraEmotion.amused,
      SyloraAuraContextPreset.business: AuraEmotion.focused,
      SyloraAuraContextPreset.learning: AuraEmotion.listening,
      SyloraAuraContextPreset.creator: AuraEmotion.greeting,
      SyloraAuraContextPreset.settings: AuraEmotion.focused,
    };

String auraTipForPreset(
  AppLocalizations l10n,
  SyloraAuraContextPreset preset,
) =>
    switch (preset) {
      SyloraAuraContextPreset.feed => l10n.auraTipFeed,
      SyloraAuraContextPreset.friends => l10n.auraTipFriends,
      SyloraAuraContextPreset.conferences => l10n.auraTipConferences,
      SyloraAuraContextPreset.live => l10n.auraTipLive,
      SyloraAuraContextPreset.ai => l10n.auraTipAi,
      SyloraAuraContextPreset.gifts => l10n.auraTipGifts,
      SyloraAuraContextPreset.creatorStudio => l10n.auraTipCreatorStudio,
      SyloraAuraContextPreset.marketplace => l10n.auraTipMarketplace,
      SyloraAuraContextPreset.business => l10n.auraTipBusiness,
      SyloraAuraContextPreset.learning => l10n.auraTipLearning,
      SyloraAuraContextPreset.creator => l10n.auraTipCreator,
      SyloraAuraContextPreset.settings => l10n.auraTipSettings,
    };

final class SyloraAuraPresenceController extends ChangeNotifier {
  SyloraAuraPresenceController({
    AuraEmotion emotion = AuraEmotion.greeting,
    String? tip,
    SyloraAuraContextPreset preset = SyloraAuraContextPreset.ai,
    SyloraAuraPresenceMode mode = SyloraAuraPresenceMode.hidden,
  }) : this._(
          emotion: emotion,
          customTip: tip,
          preset: preset,
          mode: mode,
        );

  SyloraAuraPresenceController._({
    required this._emotion,
    required this._customTip,
    required this._preset,
    required this._mode,
  });

  factory SyloraAuraPresenceController.forPreset(
    SyloraAuraContextPreset preset, {
    SyloraAuraPresenceMode mode = SyloraAuraPresenceMode.hidden,
  }) =>
      SyloraAuraPresenceController(
        preset: preset,
        emotion: _presetEmotions[preset] ?? AuraEmotion.greeting,
        mode: mode,
      );

  AuraEmotion get emotion => _emotion;
  SyloraAuraContextPreset get preset => _preset;
  SyloraAuraPresenceMode get mode => _mode;

  /// Localized tip for the current preset, or a one-off custom tip.
  String tipFor(AppLocalizations l10n) =>
      _customTip ?? auraTipForPreset(l10n, _preset);

  /// Backward-compatible raw tip (custom only). Prefer [tipFor].
  String get tip => _customTip ?? '';

  AuraEmotion _emotion;
  String? _customTip;
  SyloraAuraContextPreset _preset;
  SyloraAuraPresenceMode _mode;

  void setPreset(SyloraAuraContextPreset preset) {
    update(
      emotion: _presetEmotions[preset] ?? AuraEmotion.greeting,
      clearTip: true,
      preset: preset,
    );
  }

  void setMode(SyloraAuraPresenceMode mode) {
    if (_mode == mode) return;
    _mode = mode;
    notifyListeners();
  }

  void summon() => setMode(SyloraAuraPresenceMode.summon);

  void openCompanion() => setMode(SyloraAuraPresenceMode.companion);

  void dismiss() => setMode(SyloraAuraPresenceMode.hidden);

  void greet([String? tip]) =>
      update(emotion: AuraEmotion.greeting, tip: tip);

  void listen([String? tip]) =>
      update(emotion: AuraEmotion.listening, tip: tip);

  void think([String? tip]) =>
      update(emotion: AuraEmotion.thinking, tip: tip);

  void focus([String? tip]) =>
      update(emotion: AuraEmotion.focused, tip: tip);

  void speak([String? tip]) =>
      update(emotion: AuraEmotion.speaking, tip: tip);

  void update({
    AuraEmotion? emotion,
    String? tip,
    bool clearTip = false,
    SyloraAuraContextPreset? preset,
    SyloraAuraPresenceMode? mode,
  }) {
    final nextEmotion = emotion ?? _emotion;
    final nextTip = clearTip ? null : (tip ?? _customTip);
    final nextPreset = preset ?? _preset;
    final nextMode = mode ?? _mode;
    if (nextEmotion == _emotion &&
        nextTip == _customTip &&
        nextPreset == _preset &&
        nextMode == _mode) {
      return;
    }
    _emotion = nextEmotion;
    _customTip = nextTip;
    _preset = nextPreset;
    _mode = nextMode;
    notifyListeners();
  }
}

final class SyloraAuraPresenceScope
    extends InheritedNotifier<SyloraAuraPresenceController> {
  const SyloraAuraPresenceScope({
    required SyloraAuraPresenceController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static SyloraAuraPresenceController? maybeOf(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<SyloraAuraPresenceScope>()
      ?.notifier;
}

final class SyloraAuraPresence extends StatefulWidget {
  const SyloraAuraPresence({
    super.key,
    this.controller,
    this.preset = SyloraAuraContextPreset.ai,
    this.mode = SyloraAuraPresenceMode.summon,
    this.alignment = Alignment.bottomRight,
    this.margin = const EdgeInsets.fromLTRB(16, 16, 18, 22),
    this.onAuraTap,
    this.openAiOnCompanionTap = true,
  });

  final SyloraAuraPresenceController? controller;
  final SyloraAuraContextPreset preset;
  final SyloraAuraPresenceMode mode;
  final Alignment alignment;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onAuraTap;
  final bool openAiOnCompanionTap;

  @override
  State<SyloraAuraPresence> createState() => _SyloraAuraPresenceState();
}

final class _SyloraAuraPresenceState extends State<SyloraAuraPresence> {
  SyloraAuraPresenceController? _ownedController;

  SyloraAuraPresenceController get _controller =>
      widget.controller ?? _ownedController!;

  @override
  void initState() {
    super.initState();
    if (widget.controller == null) {
      _ownedController = SyloraAuraPresenceController.forPreset(
        widget.preset,
        mode: widget.mode,
      );
    } else if (widget.controller!.mode == SyloraAuraPresenceMode.hidden &&
        widget.mode != SyloraAuraPresenceMode.hidden) {
      widget.controller!.setMode(widget.mode);
    }
  }

  @override
  void didUpdateWidget(covariant SyloraAuraPresence oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller) {
      _ownedController?.dispose();
      _ownedController = widget.controller == null
          ? SyloraAuraPresenceController.forPreset(
              widget.preset,
              mode: widget.mode,
            )
          : null;
      return;
    }
    if (widget.controller == null && widget.preset != oldWidget.preset) {
      _ownedController?.setPreset(widget.preset);
    }
    if (widget.controller == null && widget.mode != oldWidget.mode) {
      _ownedController?.setMode(widget.mode);
    }
  }

  @override
  void dispose() {
    _ownedController?.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (widget.onAuraTap != null) {
      widget.onAuraTap!();
      return;
    }
    final mode = _controller.mode;
    if (mode == SyloraAuraPresenceMode.summon) {
      _controller.openCompanion();
      return;
    }
    if (mode == SyloraAuraPresenceMode.companion &&
        widget.openAiOnCompanionTap) {
      context.pushNamed('ai');
    }
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return Positioned.fill(
      child: Padding(
        padding: widget.margin,
        child: Align(
          alignment: widget.alignment,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final mode = _controller.mode;
              if (mode == SyloraAuraPresenceMode.hidden) {
                return const SizedBox.shrink();
              }
              final l10n = AppLocalizations.of(context);
              if (mode == SyloraAuraPresenceMode.summon) {
                return _AuraSummonOrb(
                  emotion: _controller.emotion,
                  reduceMotion: reduceMotion,
                  semanticsLabel: l10n.auraSummonLabel,
                  onTap: _handleTap,
                );
              }
              return _AuraCompanionCard(
                emotion: _controller.emotion,
                tip: _controller.tipFor(l10n),
                reduceMotion: reduceMotion,
                dismissLabel: l10n.auraDismissLabel,
                onAuraTap: _handleTap,
                onDismiss: _controller.dismiss,
              );
            },
          ),
        ),
      ),
    );
  }
}

final class _AuraSummonOrb extends StatelessWidget {
  const _AuraSummonOrb({
    required this.emotion,
    required this.reduceMotion,
    required this.semanticsLabel,
    required this.onTap,
  });

  final AuraEmotion emotion;
  final bool reduceMotion;
  final String semanticsLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final orb = Semantics(
      button: true,
      label: semanticsLabel,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Ink(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[
                  SyloraTokens.champagneLight.withValues(alpha: 0.95),
                  SyloraTokens.champagne.withValues(alpha: 0.88),
                  SyloraTokens.softSkyDeep.withValues(alpha: 0.55),
                ],
              ),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: SyloraTokens.champagne.withValues(alpha: 0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.65),
              ),
            ),
            child: Center(
              child: SyloraAura(
                size: 44,
                emotion: emotion,
                showLabel: false,
                label: 'Aura',
              ),
            ),
          ),
        ),
      ),
    );

    if (reduceMotion) return orb;
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: SyloraTokens.durMed,
      curve: SyloraTokens.curveSnap,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.scale(
          scale: 0.86 + (0.14 * value),
          child: child,
        ),
      ),
      child: orb,
    );
  }
}

final class _AuraCompanionCard extends StatelessWidget {
  const _AuraCompanionCard({
    required this.emotion,
    required this.tip,
    required this.reduceMotion,
    required this.dismissLabel,
    required this.onAuraTap,
    required this.onDismiss,
  });

  final AuraEmotion emotion;
  final String tip;
  final bool reduceMotion;
  final String dismissLabel;
  final VoidCallback onAuraTap;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final content = SizedBox(
      width: 236,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomRight,
        children: <Widget>[
          Positioned(
            right: 88,
            bottom: 28,
            child: IgnorePointer(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 148),
                child: SyloraGlass(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  radius: SyloraTokens.radiusMd,
                  child: Text(
                    tip,
                    style: SyloraTokens.body(
                      12,
                      color: SyloraTokens.inkSoft,
                      weight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            right: 0,
            top: -4,
            child: IconButton(
              tooltip: dismissLabel,
              visualDensity: VisualDensity.compact,
              style: IconButton.styleFrom(
                backgroundColor: SyloraTokens.glassStrong.withValues(alpha: 0.9),
                foregroundColor: SyloraTokens.inkSoft,
              ),
              onPressed: onDismiss,
              icon: const Icon(Icons.close_rounded, size: 18),
            ),
          ),
          RepaintBoundary(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onAuraTap,
              child: Semantics(
                button: true,
                label: 'Aura',
                child: SyloraAura(size: 96, emotion: emotion, label: 'Aura'),
              ),
            ),
          ),
        ],
      ),
    );

    if (reduceMotion) {
      return content;
    }
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: SyloraTokens.durMed,
      curve: SyloraTokens.curveSnap,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, (1 - value) * 14),
          child: Transform.scale(
            scale: 0.94 + (0.06 * value),
            child: child,
          ),
        ),
      ),
      child: content,
    );
  }
}
