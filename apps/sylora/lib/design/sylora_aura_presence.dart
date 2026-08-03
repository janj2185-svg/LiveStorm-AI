import 'package:flutter/material.dart';

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

@immutable
final class SyloraAuraPresetState {
  const SyloraAuraPresetState({required this.emotion, required this.tip});

  final AuraEmotion emotion;
  final String tip;
}

final Map<SyloraAuraContextPreset, SyloraAuraPresetState> _presetStates =
    <SyloraAuraContextPreset, SyloraAuraPresetState>{
      SyloraAuraContextPreset.feed: const SyloraAuraPresetState(
        emotion: AuraEmotion.greeting,
        tip: 'Aura is watching the community pulse.',
      ),
      SyloraAuraContextPreset.friends: const SyloraAuraPresetState(
        emotion: AuraEmotion.amused,
        tip: 'Aura is helping you find meaningful connections.',
      ),
      SyloraAuraContextPreset.conferences: const SyloraAuraPresetState(
        emotion: AuraEmotion.listening,
        tip: 'Aura is ready to assist your meeting.',
      ),
      SyloraAuraContextPreset.live: const SyloraAuraPresetState(
        emotion: AuraEmotion.focused,
        tip: 'Aura is monitoring the live room.',
      ),
      SyloraAuraContextPreset.ai: const SyloraAuraPresetState(
        emotion: AuraEmotion.greeting,
        tip: 'Aura is ready for your next prompt.',
      ),
      SyloraAuraContextPreset.gifts: const SyloraAuraPresetState(
        emotion: AuraEmotion.amused,
        tip: 'Aura can help gift moments feel alive.',
      ),
      SyloraAuraContextPreset.creatorStudio: const SyloraAuraPresetState(
        emotion: AuraEmotion.greeting,
        tip: 'Aura is checking your creator setup.',
      ),
      SyloraAuraContextPreset.marketplace: const SyloraAuraPresetState(
        emotion: AuraEmotion.amused,
        tip: 'Aura is tracking catalog signals.',
      ),
      SyloraAuraContextPreset.business: const SyloraAuraPresetState(
        emotion: AuraEmotion.focused,
        tip: 'Aura is keeping workspace context ready.',
      ),
      SyloraAuraContextPreset.learning: const SyloraAuraPresetState(
        emotion: AuraEmotion.listening,
        tip: 'Aura is following your learning path.',
      ),
      SyloraAuraContextPreset.creator: const SyloraAuraPresetState(
        emotion: AuraEmotion.greeting,
        tip: 'Aura is watching your creator flow.',
      ),
      SyloraAuraContextPreset.settings: const SyloraAuraPresetState(
        emotion: AuraEmotion.focused,
        tip: 'Aura is keeping your preferences tidy.',
      ),
    };

final class SyloraAuraPresenceController extends ChangeNotifier {
  SyloraAuraPresenceController({
    AuraEmotion emotion = AuraEmotion.greeting,
    String tip = 'Aura is ready.',
    SyloraAuraContextPreset preset = SyloraAuraContextPreset.ai,
  }) : this._(emotion: emotion, tip: tip, preset: preset);

  SyloraAuraPresenceController._({
    required this._emotion,
    required this._tip,
    required this._preset,
  });

  factory SyloraAuraPresenceController.forPreset(
    SyloraAuraContextPreset preset,
  ) {
    final state = _presetStates[preset]!;
    return SyloraAuraPresenceController(
      preset: preset,
      emotion: state.emotion,
      tip: state.tip,
    );
  }

  AuraEmotion get emotion => _emotion;
  String get tip => _tip;
  SyloraAuraContextPreset get preset => _preset;

  AuraEmotion _emotion;
  String _tip;
  SyloraAuraContextPreset _preset;

  void setPreset(SyloraAuraContextPreset preset) {
    final state = _presetStates[preset]!;
    update(emotion: state.emotion, tip: state.tip, preset: preset);
  }

  void greet([String? tip]) =>
      update(emotion: AuraEmotion.greeting, tip: tip ?? _tip);

  void listen([String? tip]) =>
      update(emotion: AuraEmotion.listening, tip: tip ?? _tip);

  void think([String? tip]) =>
      update(emotion: AuraEmotion.thinking, tip: tip ?? _tip);

  void focus([String? tip]) =>
      update(emotion: AuraEmotion.focused, tip: tip ?? _tip);

  void speak([String? tip]) =>
      update(emotion: AuraEmotion.speaking, tip: tip ?? _tip);

  void update({
    AuraEmotion? emotion,
    String? tip,
    SyloraAuraContextPreset? preset,
  }) {
    final nextEmotion = emotion ?? _emotion;
    final nextTip = tip ?? _tip;
    final nextPreset = preset ?? _preset;
    if (nextEmotion == _emotion && nextTip == _tip && nextPreset == _preset) {
      return;
    }
    _emotion = nextEmotion;
    _tip = nextTip;
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
            builder: (context, _) => _AuraPresenceCard(
              emotion: _controller.emotion,
              tip: _controller.tip,
              reduceMotion: reduceMotion,
              onAuraTap: widget.onAuraTap,
            ),
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
