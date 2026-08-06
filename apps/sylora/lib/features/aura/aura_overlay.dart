import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/locale.dart';
import '../../core/lumen_motion.dart';
import '../../core/lumen_theme.dart';
import '../platform/repositories.dart';

/// Global Aura entry — available from every authenticated surface.
final class AuraFab extends ConsumerWidget {
  const AuraFab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final open = ref.watch(auraOverlayOpenProvider);
    final locale = ref.watch(localeControllerProvider);
    return FloatingActionButton.extended(
      heroTag: 'sylora-aura-fab',
      onPressed: () {
        if (open) {
          return;
        }
        ref.read(auraOverlayOpenProvider.notifier).state = true;
        showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => const AuraSheet(),
        ).whenComplete(() {
          ref.read(auraOverlayOpenProvider.notifier).state = false;
        });
      },
      backgroundColor: LumenColors.porcelainSurface,
      foregroundColor: LumenColors.pulse,
      elevation: 6,
      icon: const AnimatedSyloraLogo(
        size: 28,
        state: LogoMotionState.listening,
      ),
      label: Text(locale.t('ask_aura')),
    );
  }
}

final class AuraSheet extends ConsumerStatefulWidget {
  const AuraSheet({super.key});

  @override
  ConsumerState<AuraSheet> createState() => _AuraSheetState();
}

final class _AuraSheetState extends ConsumerState<AuraSheet> {
  final _controller = TextEditingController();
  String? _conversationId;
  String? _error;
  bool _busy = false;
  final _messages = <_AuraBubble>[];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _ensureConversation(AiRepository repository) async {
    if (_conversationId != null) {
      return;
    }
    final settings = await repository.settings();
    if (!settings.consentGranted) {
      await repository.updateSettings(<String, dynamic>{
        'consent_granted': true,
      });
    }
    final conversation = await repository.createConversation(
      title: 'Aura · quick assist',
    );
    _conversationId = conversation.id;
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _busy) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _messages.add(_AuraBubble(role: 'user', text: text));
      _controller.clear();
    });
    try {
      final repository = ref.read(aiRepositoryProvider);
      await _ensureConversation(repository);
      final reply = await repository.send(_conversationId!, text);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages.add(_AuraBubble(role: 'assistant', text: reply.content));
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeControllerProvider);
    final height = MediaQuery.sizeOf(context).height * 0.78;
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 720, maxHeight: height),
          child: GlassPanel(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    const AnimatedSyloraLogo(
                      size: 36,
                      state: LogoMotionState.listening,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            'Aura',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            locale.t('aura_hint'),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Open full Aura',
                      onPressed: () {
                        Navigator.of(context).pop();
                        context.goNamed('ai');
                      },
                      icon: const Icon(Icons.open_in_full_rounded),
                    ),
                    IconButton(
                      tooltip: 'Close',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    for (final prompt in const <String>[
                      'Help me plan a live',
                      'Draft a post',
                      'Translate this idea',
                      'Business checklist',
                    ])
                      ActionChip(
                        label: Text(prompt),
                        onPressed: _busy
                            ? null
                            : () {
                                _controller.text = prompt;
                                _send();
                              },
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: _messages.isEmpty
                      ? Center(
                          child: Text(
                            locale.t('aura_hint'),
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        )
                      : ListView.builder(
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final message = _messages[index];
                            final mine = message.role == 'user';
                            return Align(
                              alignment: mine
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.symmetric(vertical: 6),
                                padding: const EdgeInsets.all(14),
                                constraints: const BoxConstraints(
                                  maxWidth: 480,
                                ),
                                decoration: BoxDecoration(
                                  color: mine
                                      ? LumenColors.aether.withValues(
                                          alpha: 0.12,
                                        )
                                      : LumenColors.pulse.withValues(
                                          alpha: 0.08,
                                        ),
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: Text(message.text),
                              ),
                            );
                          },
                        ),
                ),
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 8),
                  Text(
                    _error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
                        decoration: InputDecoration(
                          hintText: locale.t('ask_aura'),
                          filled: true,
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    FilledButton(
                      onPressed: _busy ? null : _send,
                      child: _busy
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

@immutable
final class _AuraBubble {
  const _AuraBubble({required this.role, required this.text});

  final String role;
  final String text;
}

/// Top chrome: search, create, notifications, chat, wallet, profile.
final class EcosystemTopBar extends ConsumerWidget
    implements PreferredSizeWidget {
  const EcosystemTopBar({super.key, this.height = 64});

  final double height;

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    return Material(
      color: LumenColors.porcelainSurface.withValues(alpha: 0.88),
      elevation: 0,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: height,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: RippleInk(
                    borderRadius: 16,
                    onTap: () => context.goNamed('search'),
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: LumenColors.porcelainHover,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: <Widget>[
                          const Icon(Icons.search_rounded, size: 20),
                          const SizedBox(width: 10),
                          Text(
                            locale.t('search'),
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: locale.t('create'),
                  onPressed: () => _openCreate(context),
                  icon: const Icon(Icons.add_circle_outline_rounded),
                ),
                IconButton(
                  tooltip: locale.t('notifications'),
                  onPressed: () => context.pushNamed('notifications'),
                  icon: const Icon(Icons.notifications_none_rounded),
                ),
                IconButton(
                  tooltip: locale.t('chat'),
                  onPressed: () => context.goNamed('messages'),
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                ),
                IconButton(
                  tooltip: locale.t('wallet'),
                  onPressed: () => context.goNamed('wallet'),
                  icon: const Icon(Icons.account_balance_wallet_outlined),
                ),
                IconButton(
                  tooltip: locale.t('profile'),
                  onPressed: () => context.goNamed('profile'),
                  icon: const Icon(Icons.person_outline_rounded),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openCreate(BuildContext context) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ListTile(
              leading: const Icon(Icons.edit_note_rounded),
              title: const Text('Post'),
              onTap: () => Navigator.pop(context, 'home'),
            ),
            ListTile(
              leading: const Icon(Icons.sensors_rounded),
              title: const Text('Go Live'),
              onTap: () => Navigator.pop(context, 'live'),
            ),
            ListTile(
              leading: const Icon(Icons.movie_creation_outlined),
              title: const Text('Creator Studio'),
              onTap: () => Navigator.pop(context, 'creator'),
            ),
            ListTile(
              leading: const Icon(Icons.card_giftcard_rounded),
              title: const Text('Gift authoring'),
              onTap: () => Navigator.pop(context, 'gift-authoring'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted || choice == null) {
      return;
    }
    context.goNamed(choice);
  }
}
