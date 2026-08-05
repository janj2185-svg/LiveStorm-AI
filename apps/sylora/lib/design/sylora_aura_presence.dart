import 'package:flutter/material.dart';

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
  }) : this._(emotion: emotion, customTip: tip, preset: preset);

  SyloraAuraPresenceController._({
    required this._emotion,
    required this._customTip,
    required this._preset,
  });

  factory SyloraAuraPresenceController.forPreset(
    SyloraAuraContextPreset preset,
  ) =>
      SyloraAuraPresenceController(
        preset: preset,
        emotion: _presetEmotions[preset] ?? AuraEmotion.greeting,
      );

  AuraEmotion get emotion => _emotion;
  SyloraAuraContextPreset get preset => _preset;

  /// Localized tip for the current preset, or a one-off custom tip.
  String tipFor(AppLocalizations l10n) =>
      _customTip ?? auraTipForPreset(l10n, _preset);

  /// Backward-compatible raw tip (custom only). Prefer [tipFor].
  String get tip => _customTip ?? '';

  AuraEmotion _emotion;
  String? _customTip;
  SyloraAuraContextPreset _preset;

  void setPreset(SyloraAuraContextPreset preset) {
    update(
      emotion: _presetEmotions[preset] ?? AuraEmotion.greeting,
      clearTip: true,
      preset: preset,
    );
  }

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
  }) {
    final nextEmotion = emotion ?? _emotion;
    final nextTip = clearTip ? null : (tip ?? _customTip);
    final nextPreset = preset ?? _preset;
    if (nextEmotion == _emotion &&
        nextTip == _customTip &&
        nextPreset == _preset) {
      return;
    }
    _emotion = nextEmotion;
    _customTip = nextTip;
    _preset = nextPreset;
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
    this.alignment = Alignment.bottomRight,
    this.margin = const EdgeInsets.fromLTRB(20, 20, 24, 28),
    this.onAuraTap,
  });

  final SyloraAuraPresenceController? controller;
  final SyloraAuraContextPreset preset;
  final Alignment alignment;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onAuraTap;

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
      _ownedController = SyloraAuraPresenceController.forPreset(widget.preset);
    }
  }

  @override
  void didUpdateWidget(covariant SyloraAuraPresence oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller) {
      _ownedController?.dispose();
      _ownedController = widget.controller == null
          ? SyloraAuraPresenceController.forPreset(widget.preset)
          : null;
      return;
    }
    if (widget.controller == null && widget.preset != oldWidget.preset) {
      _ownedController?.setPreset(widget.preset);
    }
  }

  @override
  void dispose() {
    _ownedController?.dispose();
    super.dispose();
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
              final l10n = AppLocalizations.of(context);
              return _AuraPresenceCard(
                emotion: _controller.emotion,
                tip: _controller.tipFor(l10n),
                reduceMotion: reduceMotion,
                onAuraTap: widget.onAuraTap,
              );
            },
          ),
        ),
      ),
    );
  }
}

final class _AuraPresenceCard extends StatelessWidget {
  const _AuraPresenceCard({
    required this.emotion,
    required this.tip,
    required this.reduceMotion,
    required this.onAuraTap,
  });

  final AuraEmotion emotion;
  final String tip;
  final bool reduceMotion;
  final VoidCallback? onAuraTap;

  @override
  Widget build(BuildContext context) {
    final content = SizedBox(
      width: 214,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomRight,
        children: <Widget>[
          Positioned(
            right: 82,
            bottom: 24,
            child: IgnorePointer(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 150),
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
          RepaintBoundary(
            child: GestureDetector(
              behavior: onAuraTap == null
                  ? HitTestBehavior.deferToChild
                  : HitTestBehavior.opaque,
              onTap: onAuraTap,
              child: Semantics(
                button: onAuraTap != null,
                label: 'Aura presence',
                child: SyloraAura(size: 78, emotion: emotion, label: 'Aura'),
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
          offset: Offset(0, (1 - value) * 10),
          child: child,
        ),
      ),
      child: content,
    );
  }
}
