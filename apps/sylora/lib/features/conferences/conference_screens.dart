import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';
import '../creator_studio/media_publisher.dart';
import '../platform/repositories.dart';

@immutable
final class ConferenceRoom {
  const ConferenceRoom({
    required this.id,
    required this.hostId,
    required this.title,
    required this.purpose,
    required this.status,
    required this.joinCode,
    required this.createdAt,
    required this.activeParticipantCount,
    required this.isHost,
    required this.joined,
  });

  factory ConferenceRoom.fromJson(JsonObject json) => ConferenceRoom(
    id: requireString(json, 'id'),
    hostId: requireString(json, 'host_id'),
    title: requireString(json, 'title'),
    purpose: requireString(json, 'purpose'),
    status: requireString(json, 'status'),
    joinCode: requireString(json, 'join_code'),
    createdAt: DateTime.parse(requireString(json, 'created_at')),
    activeParticipantCount: requireInt(json, 'active_participant_count'),
    isHost: json['is_host'] == true,
    joined: json['joined'] == true,
  );

  final String id;
  final String hostId;
  final String title;
  final String purpose;
  final String status;
  final String joinCode;
  final DateTime createdAt;
  final int activeParticipantCount;
  final bool isHost;
  final bool joined;
}

final class ConferenceRepository {
  const ConferenceRepository(this._client);

  final ApiClient _client;

  Future<List<ConferenceRoom>> listMine() async {
    final response = await _client.request('conferences');
    final data = response.data;
    final items = data is List ? data : const <Object?>[];
    return items
        .map(
          (item) => ConferenceRoom.fromJson(requireObject(item, 'conference')),
        )
        .toList(growable: false);
  }

  Future<ConferenceRoom> create({
    required String title,
    required String purpose,
  }) async {
    final response = await _client.request(
      'conferences',
      method: 'POST',
      data: <String, Object>{'title': title, 'purpose': purpose},
    );
    return ConferenceRoom.fromJson(requireObject(response.data, 'conference'));
  }

  Future<ConferenceRoom> get(String id) async {
    final response = await _client.request('conferences/$id');
    return ConferenceRoom.fromJson(requireObject(response.data, 'conference'));
  }

  Future<ConferenceRoom> join(String id) async {
    final response = await _client.request(
      'conferences/$id/join',
      method: 'POST',
    );
    return ConferenceRoom.fromJson(
      requireObject(
        requireObject(response.data, 'join response')['conference'],
        'conference',
      ),
    );
  }

  Future<ConferenceRoom> leave(String id) async {
    final response = await _client.request(
      'conferences/$id/leave',
      method: 'POST',
    );
    return ConferenceRoom.fromJson(
      requireObject(
        requireObject(response.data, 'leave response')['conference'],
        'conference',
      ),
    );
  }

  Future<JsonObject> mediaCredentials(String id) async {
    final response = await _client.request('conferences/$id/media-credentials');
    return requireObject(response.data, 'media credentials');
  }

  Future<JsonObject> askAura(
    String id, {
    required String message,
    String? conversationId,
  }) async {
    final response = await _client.request(
      'conferences/$id/aura/ask',
      method: 'POST',
      data: <String, Object?>{
        'message': message,
        'conversation_id': conversationId,
      },
    );
    return requireObject(response.data, 'aura response');
  }
}

final conferenceRepositoryProvider = Provider<ConferenceRepository>(
  (ref) => ConferenceRepository(ref.watch(apiClientProvider)),
);

final conferenceListProvider = FutureProvider.autoDispose<List<ConferenceRoom>>(
  (ref) => ref.watch(conferenceRepositoryProvider).listMine(),
);

final conferenceRoomProvider = FutureProvider.autoDispose
    .family<ConferenceRoom, String>(
      (ref, id) => ref.watch(conferenceRepositoryProvider).get(id),
    );

final class ConferencesScreen extends ConsumerWidget {
  const ConferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rooms = ref.watch(conferenceListProvider);
    return SyloraModuleScaffold(
      title: 'Conferences',
      subtitle:
          'Business and education rooms with honest media readiness and Aura support.',
      showAuraDock: true,
      actions: <Widget>[
        FilledButton.icon(
          onPressed: () => _showCreateDialog(context, ref),
          icon: const Icon(Icons.video_call_rounded),
          label: const Text('Create room'),
        ),
      ],
      child: rooms.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => _ErrorPanel(
          message: error.toString(),
          onRetry: () => ref.invalidate(conferenceListProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return _EmptyPanel(onCreate: () => _showCreateDialog(context, ref));
          }
          return Column(
            children: <Widget>[
              for (final room in items) _ConferenceTile(room: room),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final title = TextEditingController();
    var purpose = 'business';
    final created = await showDialog<ConferenceRoom>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create conference room'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: title,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Weekly planning or algebra studio',
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: purpose,
                decoration: const InputDecoration(labelText: 'Purpose'),
                items: const <DropdownMenuItem<String>>[
                  DropdownMenuItem(value: 'business', child: Text('Business')),
                  DropdownMenuItem(
                    value: 'education',
                    child: Text('Education'),
                  ),
                  DropdownMenuItem(value: 'social', child: Text('Social')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setDialogState(() => purpose = value);
                  }
                },
              ),
            ],
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final text = title.text.trim();
                if (text.isEmpty) {
                  return;
                }
                final room = await ref
                    .read(conferenceRepositoryProvider)
                    .create(title: text, purpose: purpose);
                if (context.mounted) {
                  Navigator.pop(context, room);
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
    title.dispose();
    if (created != null && context.mounted) {
      ref.invalidate(conferenceListProvider);
      context.goNamed(
        'conference-room',
        pathParameters: <String, String>{'id': created.id},
      );
    }
  }
}

final class ConferenceRoomScreen extends ConsumerStatefulWidget {
  const ConferenceRoomScreen({required this.conferenceId, super.key});

  final String conferenceId;

  @override
  ConsumerState<ConferenceRoomScreen> createState() =>
      _ConferenceRoomScreenState();
}

final class _ConferenceRoomScreenState
    extends ConsumerState<ConferenceRoomScreen> {
  late final CreatorMediaController _media;
  final TextEditingController _auraText = TextEditingController();
  JsonObject? _credentials;
  String? _status;
  String? _auraConversationId;
  String? _auraAnswer;
  bool _busy = false;
  bool _muted = false;
  bool _cameraOff = false;
  bool _screenShare = false;
  bool _aiTranslation = false;
  String? _translationCaption;
  bool _captionsRecording = false;
  bool _captionsBusy = false;
  String? _captionText;

  @override
  void initState() {
    super.initState();
    _media = CreatorMediaController();
    _loadMedia();
  }

  @override
  void dispose() {
    _auraText.dispose();
    _media.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final roomValue = ref.watch(conferenceRoomProvider(widget.conferenceId));
    return SyloraModuleScaffold(
      title: 'Conference room',
      subtitle:
          'Join with native or web camera preview and publish through the configured media plane.',
      showAuraDock: true,
      auraEmotion: AuraEmotion.focused,
      child: roomValue.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => _ErrorPanel(
          message: error.toString(),
          onRetry: () =>
              ref.invalidate(conferenceRoomProvider(widget.conferenceId)),
        ),
        data: (room) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            _RoomHeader(
              room: room,
              onJoin: _busy ? null : () => _joinOrLeave(join: true),
              onLeave: _busy ? null : () => _joinOrLeave(join: false),
            ),
            const SizedBox(height: 12),
            _CallControlBar(
              muted: _muted,
              cameraOff: _cameraOff,
              screenShare: _screenShare,
              aiTranslation: _aiTranslation,
              captionsRecording: _captionsRecording,
              onMute: _toggleMute,
              onCamera: _toggleCamera,
              onScreenShare: _media.screenShareSupported
                  ? _toggleScreenShare
                  : null,
              onCaptions: _captionsBusy ? null : _toggleCaptions,
              onTranslation: () async {
                setState(() => _aiTranslation = !_aiTranslation);
                if (_aiTranslation) {
                  try {
                    final result = await ref
                        .read(aiRepositoryProvider)
                        .translate('Welcome to this SYLORA call.', 'en', 'uk');
                    setState(
                      () => _translationCaption =
                          (result['translated_text'] as String?) ??
                          (result['text'] as String?) ??
                          'AI translation active',
                    );
                  } on Object catch (error) {
                    setState(() => _translationCaption = error.toString());
                  }
                } else {
                  setState(() => _translationCaption = null);
                }
              },
            ),
            if (_translationCaption != null) ...<Widget>[
              const SizedBox(height: 8),
              SyloraGlass(
                radius: SyloraTokens.radiusMd,
                padding: const EdgeInsets.all(12),
                child: Text(
                  'AI · $_translationCaption',
                  style: SyloraTokens.body(13),
                ),
              ),
            ],
            if (_captionText != null) ...<Widget>[
              const SizedBox(height: 8),
              SyloraGlass(
                radius: SyloraTokens.radiusMd,
                padding: const EdgeInsets.all(12),
                child: Text(
                  'Captions · $_captionText',
                  style: SyloraTokens.body(13),
                ),
              ),
            ],
            const SizedBox(height: 18),
            _MediaPanel(
              media: _media,
              credentials: _credentials,
              status: _status,
              busy: _busy,
              onPreview: _startPreview,
              onPublish: _publish,
              onRefreshCredentials: _loadMedia,
            ),
            const SizedBox(height: 18),
            _ConferenceGiftTray(
              conferenceId: widget.conferenceId,
              hostUserId: room.hostId,
            ),
            const SizedBox(height: 18),
            _AuraAssistPanel(
              controller: _auraText,
              answer: _auraAnswer,
              busy: _busy,
              onAsk: _askAura,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadMedia() async {
    try {
      final credentials = await ref
          .read(conferenceRepositoryProvider)
          .mediaCredentials(widget.conferenceId);
      if (mounted) {
        setState(() {
          _credentials = credentials;
          _status = credentials['status'] == 'available'
              ? 'Media plane is ready for WHIP publishing.'
              : 'Awaiting configured MediaMTX media plane.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = error.toString());
      }
    }
  }

  Future<void> _joinOrLeave({required bool join}) async {
    setState(() => _busy = true);
    try {
      final repo = ref.read(conferenceRepositoryProvider);
      if (join) {
        await repo.join(widget.conferenceId);
      } else {
        await repo.leave(widget.conferenceId);
      }
      ref.invalidate(conferenceRoomProvider(widget.conferenceId));
      ref.invalidate(conferenceListProvider);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _startPreview() async {
    if (!_media.supported) {
      setState(() {
        _status =
            'Camera preview is unavailable on this platform. Use OBS or a companion device.';
      });
      return;
    }
    setState(() => _busy = true);
    try {
      await _media.startPreview();
      setState(() => _status = 'Camera and microphone preview is live.');
    } on Object catch (error) {
      setState(() => _status = error.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _publish() async {
    final credentials = _credentials;
    if (credentials == null) {
      await _loadMedia();
      return;
    }
    setState(() => _busy = true);
    try {
      final result = await _media.publishWhip(credentials);
      setState(() => _status = result);
    } on Object catch (error) {
      setState(() => _status = error.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _toggleMute() async {
    final muted = !_muted;
    try {
      await _media.setAudioEnabled(!muted);
      if (mounted) {
        setState(() {
          _muted = muted;
          _status = muted ? 'Microphone muted.' : 'Microphone unmuted.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    }
  }

  Future<void> _toggleCamera() async {
    final cameraOff = !_cameraOff;
    try {
      await _media.setVideoEnabled(!cameraOff);
      if (mounted) {
        setState(() {
          _cameraOff = cameraOff;
          _status = cameraOff ? 'Camera disabled.' : 'Camera enabled.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    }
  }

  Future<void> _toggleScreenShare() async {
    final screenShare = !_screenShare;
    try {
      await _media.setScreenShareEnabled(screenShare);
      if (mounted) {
        setState(() {
          _screenShare = _media.screenSharing;
          _status = _screenShare
              ? 'Screen share is publishing.'
              : 'Screen share stopped.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _screenShare = _media.screenSharing;
          _status = messageFor(error);
        });
      }
    }
  }

  Future<void> _toggleCaptions() async {
    if (!_media.captionCaptureSupported) {
      setState(() {
        _captionText =
            'Short clip captions use MediaRecorder on SYLORA web. Open this room in a browser to record and transcribe.';
      });
      return;
    }
    setState(() => _captionsBusy = true);
    try {
      if (!_captionsRecording) {
        await _media.startCaptionCapture();
        if (mounted) {
          setState(() {
            _captionsRecording = true;
            _captionText =
                'Recording a short microphone clip… tap “Stop & transcribe” when ready.';
          });
        }
        return;
      }
      final clip = await _media.stopCaptionCapture();
      if (mounted) {
        setState(() {
          _captionsRecording = false;
          _captionText = 'Transcribing the recorded clip…';
        });
      }
      final result = await ref
          .read(aiRepositoryProvider)
          .transcribeAudio(
            clip.bytes,
            filename: clip.filename,
            contentType: clip.contentType,
          );
      if (mounted) {
        final text = optionalString(result, 'text')?.trim();
        setState(() {
          _captionText = text == null || text.isEmpty
              ? 'No speech was detected in that clip.'
              : text;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _captionsRecording = false;
          _captionText = messageFor(error);
        });
      }
    } finally {
      if (mounted) {
        setState(() => _captionsBusy = false);
      }
    }
  }

  Future<void> _askAura() async {
    final message = _auraText.text.trim();
    if (message.isEmpty) {
      return;
    }
    setState(() => _busy = true);
    try {
      final response = await ref
          .read(conferenceRepositoryProvider)
          .askAura(
            widget.conferenceId,
            message: message,
            conversationId: _auraConversationId,
          );
      final answer = requireObject(response['message'], 'aura message');
      setState(() {
        _auraConversationId = optionalString(response, 'conversation_id');
        _auraAnswer = optionalString(answer, 'content') ?? 'Aura responded.';
        _auraText.clear();
      });
    } on Object catch (error) {
      setState(() => _auraAnswer = error.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class _ConferenceTile extends StatelessWidget {
  const _ConferenceTile({required this.room});

  final ConferenceRoom room;

  @override
  Widget build(BuildContext context) => Card(
    elevation: 0,
    color: Colors.white.withValues(alpha: 0.08),
    child: ListTile(
      contentPadding: const EdgeInsets.all(16),
      leading: Icon(_purposeIcon(room.purpose), size: 34),
      title: Text(room.title),
      subtitle: Text(
        '${_label(room.purpose)} • ${room.status} • ${room.activeParticipantCount} active',
      ),
      trailing: FilledButton.tonalIcon(
        onPressed: () => context.goNamed(
          'conference-room',
          pathParameters: <String, String>{'id': room.id},
        ),
        icon: const Icon(Icons.login_rounded),
        label: const Text('Open'),
      ),
    ),
  );
}

final class _RoomHeader extends StatelessWidget {
  const _RoomHeader({
    required this.room,
    required this.onJoin,
    required this.onLeave,
  });

  final ConferenceRoom room;
  final VoidCallback? onJoin;
  final VoidCallback? onLeave;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.spaceBetween,
    children: <Widget>[
      SizedBox(
        width: 460,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(room.title, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 6),
            SelectableText('Join code ${room.joinCode}'),
            const SizedBox(height: 6),
            Text(
              '${_label(room.purpose)} • ${room.status} • ${room.activeParticipantCount} active',
            ),
          ],
        ),
      ),
      Wrap(
        spacing: 8,
        children: <Widget>[
          FilledButton.icon(
            onPressed: room.joined ? null : onJoin,
            icon: const Icon(Icons.video_call_rounded),
            label: const Text('Join'),
          ),
          OutlinedButton.icon(
            onPressed: room.joined && !room.isHost ? onLeave : null,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Leave'),
          ),
        ],
      ),
    ],
  );
}

final class _MediaPanel extends StatelessWidget {
  const _MediaPanel({
    required this.media,
    required this.credentials,
    required this.status,
    required this.busy,
    required this.onPreview,
    required this.onPublish,
    required this.onRefreshCredentials,
  });

  final CreatorMediaController media;
  final JsonObject? credentials;
  final String? status;
  final bool busy;
  final VoidCallback onPreview;
  final VoidCallback onPublish;
  final VoidCallback onRefreshCredentials;

  @override
  Widget build(BuildContext context) {
    final mediaStatus = optionalString(
      credentials ?? const <String, dynamic>{},
      'status',
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text('Media preview', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 10),
        media.preview(),
        const SizedBox(height: 12),
        Text(
          media.supported
              ? 'This build can request camera/microphone preview and publish over WHIP when MediaMTX is ready.'
              : 'Camera preview is unavailable on this build. Use OBS or a companion browser device for publishing.',
        ),
        if (credentials != null) ...<Widget>[
          const SizedBox(height: 8),
          SelectableText(
            mediaStatus == 'available'
                ? 'WHIP: ${credentials!['whip_url']}'
                : 'Media plane: ${credentials!['reason'] ?? 'awaiting_media_plane'}',
          ),
        ],
        if (status != null) ...<Widget>[
          const SizedBox(height: 8),
          Text(status!),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            FilledButton.tonalIcon(
              onPressed: busy ? null : onPreview,
              icon: const Icon(Icons.videocam_rounded),
              label: const Text('Start preview'),
            ),
            FilledButton.icon(
              onPressed: busy || mediaStatus != 'available' ? null : onPublish,
              icon: const Icon(Icons.podcasts_rounded),
              label: const Text('Publish WHIP'),
            ),
            OutlinedButton.icon(
              onPressed: busy ? null : onRefreshCredentials,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh media'),
            ),
          ],
        ),
      ],
    );
  }
}

final class _AuraAssistPanel extends StatelessWidget {
  const _AuraAssistPanel({
    required this.controller,
    required this.answer,
    required this.busy,
    required this.onAsk,
  });

  final TextEditingController controller;
  final String? answer;
  final bool busy;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Text('Aura assist', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 8),
      const Text(
        'Ask for meeting summaries, classroom prompts, agenda help, or follow-up wording.',
      ),
      const SizedBox(height: 12),
      TextField(
        controller: controller,
        minLines: 2,
        maxLines: 5,
        decoration: const InputDecoration(
          labelText: 'Ask Aura',
          hintText: 'Turn this discussion into next steps...',
        ),
      ),
      const SizedBox(height: 10),
      Align(
        alignment: Alignment.centerRight,
        child: FilledButton.icon(
          onPressed: busy ? null : onAsk,
          icon: const Icon(Icons.auto_awesome_rounded),
          label: const Text('Ask Aura'),
        ),
      ),
      if (answer != null) ...<Widget>[
        const SizedBox(height: 12),
        SelectableText(answer!),
      ],
    ],
  );
}

final class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(Icons.video_call_outlined, size: 54),
          const SizedBox(height: 12),
          Text(
            'No conference rooms yet',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          const Text(
            'Create a business or education room to start a focused video session.',
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add_rounded),
            label: const Text('Create room'),
          ),
        ],
      ),
    ),
  );
}

final class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      Text(message, textAlign: TextAlign.center),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh_rounded),
        label: const Text('Retry'),
      ),
    ],
  );
}

IconData _purposeIcon(String purpose) => switch (purpose) {
  'education' => Icons.school_outlined,
  'social' => Icons.groups_2_outlined,
  _ => Icons.business_center_outlined,
};

String _label(String purpose) => switch (purpose) {
  'education' => 'Education',
  'social' => 'Social',
  _ => 'Business',
};

final class _CallControlBar extends StatelessWidget {
  const _CallControlBar({
    required this.muted,
    required this.cameraOff,
    required this.screenShare,
    required this.aiTranslation,
    required this.captionsRecording,
    required this.onMute,
    required this.onCamera,
    required this.onScreenShare,
    required this.onCaptions,
    required this.onTranslation,
  });

  final bool muted;
  final bool cameraOff;
  final bool screenShare;
  final bool aiTranslation;
  final bool captionsRecording;
  final VoidCallback onMute;
  final VoidCallback onCamera;
  final VoidCallback? onScreenShare;
  final VoidCallback? onCaptions;
  final VoidCallback onTranslation;

  @override
  Widget build(BuildContext context) {
    return SyloraGlass(
      radius: SyloraTokens.radiusLg,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.center,
        children: <Widget>[
          _CallChip(
            icon: muted ? Icons.mic_off_rounded : Icons.mic_rounded,
            label: muted ? 'Unmute' : 'Mute',
            active: muted,
            onTap: onMute,
          ),
          _CallChip(
            icon: cameraOff
                ? Icons.videocam_off_rounded
                : Icons.videocam_rounded,
            label: cameraOff ? 'Camera on' : 'Camera off',
            active: cameraOff,
            onTap: onCamera,
          ),
          _CallChip(
            icon: Icons.present_to_all_rounded,
            label: screenShare ? 'Stop share' : 'Share screen',
            active: screenShare,
            onTap: onScreenShare,
          ),
          _CallChip(
            icon: Icons.translate_rounded,
            label: aiTranslation ? 'Translation on' : 'AI translate',
            active: aiTranslation,
            onTap: onTranslation,
          ),
          _CallChip(
            icon: captionsRecording
                ? Icons.stop_circle_outlined
                : Icons.closed_caption_rounded,
            label: captionsRecording ? 'Stop & transcribe' : 'Captions',
            active: captionsRecording,
            onTap: onCaptions,
          ),
        ],
      ),
    );
  }
}

final class _CallChip extends StatelessWidget {
  const _CallChip({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      selected: active,
      onSelected: onTap == null ? null : (_) => onTap!(),
    );
  }
}

final class _ConferenceGiftTray extends ConsumerStatefulWidget {
  const _ConferenceGiftTray({
    required this.conferenceId,
    required this.hostUserId,
  });

  final String conferenceId;
  final String hostUserId;

  @override
  ConsumerState<_ConferenceGiftTray> createState() =>
      _ConferenceGiftTrayState();
}

final class _ConferenceGiftTrayState
    extends ConsumerState<_ConferenceGiftTray> {
  late Future<CursorPage<GiftModel>> _catalog;
  String? _sendingId;
  String? _feedback;
  String? _lastGiftId;
  DateTime? _lastSentAt;
  int _comboCount = 0;
  Timer? _feedbackTimer;

  @override
  void initState() {
    super.initState();
    _catalog = ref.read(giftRepositoryProvider).catalog();
  }

  @override
  void dispose() {
    _feedbackTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<CursorPage<GiftModel>>(
      future: _catalog,
      builder: (context, snapshot) {
        return SyloraGlass(
          radius: SyloraTokens.radiusLg,
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Icon(Icons.card_giftcard_rounded, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Live gifts', style: SyloraTokens.title(15)),
                  ),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: _feedback == null
                        ? const SizedBox.shrink()
                        : Container(
                            key: ValueKey<String>(_feedback!),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(
                                context,
                              ).colorScheme.secondary.withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              _feedback!,
                              style: SyloraTokens.body(12),
                            ),
                          ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Choose a gift for the host while this conference is active.',
                style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
              ),
              const SizedBox(height: 10),
              if (snapshot.connectionState != ConnectionState.done)
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    LinearProgressIndicator(),
                    SizedBox(height: 8),
                    Text('Loading conference gifts…'),
                  ],
                )
              else if (snapshot.hasError)
                _stateMessage(
                  icon: Icons.cloud_off_outlined,
                  title: 'Gifts could not load',
                  message: messageFor(snapshot.error!),
                  actionLabel: 'Try again',
                  onAction: _reloadCatalog,
                )
              else if (snapshot.data?.items.isEmpty ?? true)
                _stateMessage(
                  icon: Icons.redeem_outlined,
                  title: 'No gifts available',
                  message:
                      'The conference is ready, but the gift catalog is empty.',
                  actionLabel: 'Refresh gifts',
                  onAction: _reloadCatalog,
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    for (final gift in (snapshot.data?.items ?? const []).take(
                      6,
                    ))
                      FilledButton.tonalIcon(
                        onPressed: _sendingId == null
                            ? () => _send(gift)
                            : null,
                        icon: _sendingId == gift.id
                            ? const SizedBox.square(
                                dimension: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.card_giftcard_rounded),
                        label: Text(gift.name),
                      ),
                  ],
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _stateMessage({
    required IconData icon,
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Icon(icon, color: SyloraTokens.inkSoft),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 2),
              Text(message),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: Text(actionLabel),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _reloadCatalog() {
    setState(() {
      _catalog = ref.read(giftRepositoryProvider).catalog();
    });
  }

  Future<void> _send(GiftModel gift) async {
    setState(() => _sendingId = gift.id);
    try {
      await ref
          .read(giftRepositoryProvider)
          .send(
            recipientUserId: widget.hostUserId,
            giftDefinitionId: gift.id,
            conferenceId: widget.conferenceId,
            message: 'Conference gift',
          );
      if (!mounted) {
        return;
      }
      final now = DateTime.now();
      final continuesCombo =
          _lastGiftId == gift.id &&
          _lastSentAt != null &&
          now.difference(_lastSentAt!) <= const Duration(seconds: 15);
      setState(() {
        _comboCount = continuesCombo
            ? (_comboCount >= 10 ? 10 : _comboCount + 1)
            : 1;
        _lastGiftId = gift.id;
        _lastSentAt = now;
        _feedback = _comboCount > 1
            ? '${gift.name} · combo ×$_comboCount'
            : '${gift.name} sent';
      });
      _feedbackTimer?.cancel();
      _feedbackTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() => _feedback = null);
        }
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Sent ${gift.name} to the host.')));
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _sendingId = null);
      }
    }
  }
}
