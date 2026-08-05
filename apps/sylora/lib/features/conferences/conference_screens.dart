import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../creator_studio/media_publisher.dart';
import '../creator_studio/media_subscriber.dart';
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

  Future<ConferenceRoom> joinByCode(String joinCode) async {
    final response = await _client.request(
      'conferences/join-by-code',
      method: 'POST',
      data: <String, Object>{'join_code': joinCode.trim()},
    );
    return ConferenceRoom.fromJson(
      requireObject(
        requireObject(response.data, 'join response')['conference'],
        'conference',
      ),
    );
  }

  Future<List<JsonObject>> listParticipants(String id) async {
    final response = await _client.request('conferences/$id/participants');
    final data = response.data;
    final items = data is List ? data : const <Object?>[];
    return items
        .map((item) => requireObject(item, 'participant'))
        .toList(growable: false);
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
    final l10n = AppLocalizations.of(context);
    final rooms = ref.watch(conferenceListProvider);
    return LumenPage(
      title: l10n.conferencesTitle,
      subtitle: l10n.conferencesSubtitle,
      showAuraDock: false,
      maxContentWidth: 1120,
      actions: <Widget>[
        OutlinedButton.icon(
          onPressed: () => _showJoinByCodeDialog(context, ref),
          icon: const Icon(Icons.login_rounded),
          label: Text(l10n.conferencesJoin),
        ),
        FilledButton.icon(
          onPressed: () => _showCreateDialog(context, ref),
          icon: const Icon(Icons.video_call_rounded),
          label: Text(l10n.conferencesCreateRoom),
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
          return LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 760 ? 2 : 1;
              final cardWidth =
                  (constraints.maxWidth - (columns - 1) * 12) / columns;
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: <Widget>[
                  for (final room in items)
                    SizedBox(
                      width: cardWidth,
                      child: _ConferenceTile(room: room),
                    ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showJoinByCodeDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final l10n = AppLocalizations.of(context);
    final code = TextEditingController();
    final joined = await showDialog<ConferenceRoom>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.conferencesJoin),
        content: TextField(
          controller: code,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            labelText: l10n.conferencesJoinCode(''),
            hintText: 'ABCD1234',
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () async {
              final value = code.text.trim();
              if (value.isEmpty) {
                return;
              }
              final room = await ref
                  .read(conferenceRepositoryProvider)
                  .joinByCode(value);
              if (context.mounted) {
                Navigator.pop(context, room);
              }
            },
            child: Text(l10n.conferencesJoin),
          ),
        ],
      ),
    );
    code.dispose();
    if (joined != null && context.mounted) {
      ref.invalidate(conferenceListProvider);
      context.goNamed(
        'conference-room',
        pathParameters: <String, String>{'id': joined.id},
      );
    }
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final title = TextEditingController();
    var purpose = 'business';
    final created = await showDialog<ConferenceRoom>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(l10n.conferencesCreateDialogTitle),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: title,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: l10n.conferencesRoomTitleLabel,
                  hintText: l10n.conferencesRoomTitleHint,
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: purpose,
                decoration: InputDecoration(
                  labelText: l10n.conferencesPurposeLabel,
                ),
                items: <DropdownMenuItem<String>>[
                  DropdownMenuItem(
                    value: 'business',
                    child: Text(l10n.conferencesPurposeBusiness),
                  ),
                  DropdownMenuItem(
                    value: 'education',
                    child: Text(l10n.conferencesPurposeEducation),
                  ),
                  DropdownMenuItem(
                    value: 'social',
                    child: Text(l10n.conferencesPurposeSocial),
                  ),
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
              child: Text(l10n.commonCancel),
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
              child: Text(l10n.commonCreate),
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
  List<JsonObject> _participants = const <JsonObject>[];
  final Map<String, MediaContributionSubscriber> _remoteTiles =
      <String, MediaContributionSubscriber>{};

  @override
  void initState() {
    super.initState();
    _media = CreatorMediaController();
    _loadMedia();
    _loadParticipants();
  }

  @override
  void dispose() {
    _auraText.dispose();
    _media.dispose();
    for (final subscriber in _remoteTiles.values) {
      subscriber.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final roomValue = ref.watch(conferenceRoomProvider(widget.conferenceId));
    return SyloraModuleScaffold(
      title: l10n.conferencesRoomScreenTitle,
      subtitle: l10n.conferencesRoomScreenSubtitle,
      showAuraDock: false,
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
                          l10n.conferencesTranslationActive,
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
                  '${l10n.conferencesAiLabel} · $_translationCaption',
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
                  '${l10n.conferencesCaptions} · $_captionText',
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
              onReconnect: _reconnectMedia,
              onRefreshCredentials: _loadMedia,
            ),
            if (_participants.isNotEmpty) ...<Widget>[
              const SizedBox(height: 18),
              _ContributionGallery(
                participants: _participants,
                subscribers: _remoteTiles,
                onRefresh: _loadParticipants,
                onSubscribe: _subscribeParticipant,
                onReconnect: _reconnectParticipant,
              ),
            ],
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
    final l10n = AppLocalizations.of(context);
    try {
      final credentials = await ref
          .read(conferenceRepositoryProvider)
          .mediaCredentials(widget.conferenceId);
      if (mounted) {
        setState(() {
          _credentials = credentials;
          _status = credentials['status'] == 'available'
              ? l10n.conferencesMediaReady
              : l10n.conferencesMediaWaiting;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = error.toString());
      }
    }
  }

  Future<void> _loadParticipants() async {
    try {
      final people = await ref
          .read(conferenceRepositoryProvider)
          .listParticipants(widget.conferenceId);
      if (!mounted) {
        return;
      }
      setState(() => _participants = people);
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = error.toString());
      }
    }
  }

  Future<void> _subscribeParticipant(JsonObject participant) async {
    final l10n = AppLocalizations.of(context);
    final userId = optionalString(participant, 'user_id');
    final whepUrl = optionalString(participant, 'whep_url');
    if (userId == null || whepUrl == null || whepUrl.isEmpty) {
      setState(() {
        _status = l10n.conferencesContributionWhepUnavailable;
      });
      return;
    }
    final credentials = _credentials;
    final subscriber = _remoteTiles.putIfAbsent(
      userId,
      MediaContributionSubscriber.new,
    );
    if (!subscriber.supported) {
      setState(() {
        _status = l10n.conferencesWhepGalleryUnavailable;
      });
      return;
    }
    setState(() => _busy = true);
    try {
      await subscriber.subscribeWhep(<String, Object?>{
        'whep_url': whepUrl,
        'subscribe_bearer_token':
            optionalString(participant, 'subscribe_bearer_token') ??
            (credentials == null
                ? null
                : optionalString(credentials, 'subscribe_bearer_token')),
        'bearer_token': credentials == null
            ? null
            : optionalString(credentials, 'bearer_token'),
        'ice_servers': credentials?['ice_servers'],
      });
      if (mounted) {
        setState(
          () => _status = l10n.conferencesContributionSubscribed(userId),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _reconnectParticipant(JsonObject participant) async {
    final userId = optionalString(participant, 'user_id');
    if (userId == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      final repository = ref.read(conferenceRepositoryProvider);
      final participants = await repository.listParticipants(
        widget.conferenceId,
      );
      final credentials = await repository.mediaCredentials(
        widget.conferenceId,
      );
      JsonObject? refreshed;
      for (final candidate in participants) {
        if (optionalString(candidate, 'user_id') == userId) {
          refreshed = candidate;
          break;
        }
      }
      if (refreshed == null) {
        throw StateError('Contribution is no longer available.');
      }
      if (!mounted) {
        return;
      }
      await _remoteTiles[userId]?.stop();
      setState(() {
        _participants = participants;
        _credentials = credentials;
        _busy = false;
      });
      await _subscribeParticipant(refreshed);
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
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
      await _loadParticipants();
      await _loadMedia();
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _startPreview() async {
    final l10n = AppLocalizations.of(context);
    if (!_media.supported) {
      setState(() {
        _status = l10n.conferencesPreviewUnavailable;
      });
      return;
    }
    setState(() => _busy = true);
    try {
      await _media.startPreview();
      setState(() => _status = l10n.conferencesPreviewLive);
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

  Future<void> _reconnectMedia() async {
    setState(() => _busy = true);
    try {
      final credentials = await ref
          .read(conferenceRepositoryProvider)
          .mediaCredentials(widget.conferenceId);
      if (credentials['status'] != 'available') {
        throw StateError(
          credentials['reason']?.toString() ?? 'WHIP media is unavailable.',
        );
      }
      await _media.stop();
      await _media.startPreview();
      final result = await _media.publishWhip(credentials);
      if (mounted) {
        setState(() {
          _credentials = credentials;
          _status = result;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _toggleMute() async {
    final l10n = AppLocalizations.of(context);
    final muted = !_muted;
    try {
      await _media.setAudioEnabled(!muted);
      if (mounted) {
        setState(() {
          _muted = muted;
          _status = muted
              ? l10n.conferencesMicrophoneMuted
              : l10n.conferencesMicrophoneUnmuted;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    }
  }

  Future<void> _toggleCamera() async {
    final l10n = AppLocalizations.of(context);
    final cameraOff = !_cameraOff;
    try {
      await _media.setVideoEnabled(!cameraOff);
      if (mounted) {
        setState(() {
          _cameraOff = cameraOff;
          _status = cameraOff
              ? l10n.conferencesCameraDisabled
              : l10n.conferencesCameraEnabled;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = messageFor(error));
      }
    }
  }

  Future<void> _toggleScreenShare() async {
    final l10n = AppLocalizations.of(context);
    final screenShare = !_screenShare;
    try {
      await _media.setScreenShareEnabled(screenShare);
      if (mounted) {
        setState(() {
          _screenShare = _media.screenSharing;
          _status = _screenShare
              ? l10n.conferencesScreenShareActive
              : l10n.conferencesScreenShareStopped;
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
    final l10n = AppLocalizations.of(context);
    if (!_media.captionCaptureSupported) {
      setState(() {
        _captionText = l10n.conferencesCaptionsUnavailable;
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
            _captionText = l10n.conferencesCaptionsRecording;
          });
        }
        return;
      }
      final clip = await _media.stopCaptionCapture();
      if (mounted) {
        setState(() {
          _captionsRecording = false;
          _captionText = l10n.conferencesCaptionsTranscribing;
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
              ? l10n.conferencesCaptionsNoSpeech
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
    final l10n = AppLocalizations.of(context);
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
        _auraAnswer =
            optionalString(answer, 'content') ?? l10n.conferencesAuraResponded;
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
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final compact = MediaQuery.sizeOf(context).width < 620;
    return Card(
      elevation: 0,
      color: Colors.white.withValues(alpha: 0.08),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(_purposeIcon(room.purpose), size: 34),
        title: Text(room.title),
        subtitle: Text(
          '${_label(context, room.purpose)} • ${room.status} • '
          '${l10n.conferencesActiveParticipants(room.activeParticipantCount)}',
        ),
        trailing: compact
            ? IconButton.filledTonal(
                tooltip: l10n.conferencesOpen,
                onPressed: () => context.goNamed(
                  'conference-room',
                  pathParameters: <String, String>{'id': room.id},
                ),
                icon: const Icon(Icons.login_rounded),
              )
            : FilledButton.tonalIcon(
                onPressed: () => context.goNamed(
                  'conference-room',
                  pathParameters: <String, String>{'id': room.id},
                ),
                icon: const Icon(Icons.login_rounded),
                label: Text(l10n.conferencesOpen),
              ),
      ),
    );
  }
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
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      alignment: WrapAlignment.spaceBetween,
      children: <Widget>[
        SizedBox(
          width: 460,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                room.title,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              SelectableText(l10n.conferencesJoinCode(room.joinCode)),
              const SizedBox(height: 6),
              Text(
                '${_label(context, room.purpose)} • ${room.status} • '
                '${l10n.conferencesActiveParticipants(room.activeParticipantCount)}',
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
              label: Text(l10n.conferencesJoin),
            ),
            OutlinedButton.icon(
              onPressed: room.joined && !room.isHost ? onLeave : null,
              icon: const Icon(Icons.logout_rounded),
              label: Text(l10n.conferencesLeave),
            ),
          ],
        ),
      ],
    );
  }
}

final class _MediaPanel extends StatelessWidget {
  const _MediaPanel({
    required this.media,
    required this.credentials,
    required this.status,
    required this.busy,
    required this.onPreview,
    required this.onPublish,
    required this.onReconnect,
    required this.onRefreshCredentials,
  });

  final CreatorMediaController media;
  final JsonObject? credentials;
  final String? status;
  final bool busy;
  final VoidCallback onPreview;
  final VoidCallback onPublish;
  final VoidCallback onReconnect;
  final VoidCallback onRefreshCredentials;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final mediaStatus = optionalString(
      credentials ?? const <String, dynamic>{},
      'status',
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          l10n.conferencesMediaPreview,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 10),
        media.preview(),
        const SizedBox(height: 12),
        Text(
          media.supported
              ? l10n.conferencesMediaSupported
              : l10n.conferencesMediaUnsupported,
        ),
        if (credentials != null) ...<Widget>[
          const SizedBox(height: 8),
          SelectableText(
            mediaStatus == 'available'
                ? 'WHIP: ${credentials!['whip_url']}'
                : l10n.conferencesMediaPlane(
                    '${credentials!['reason'] ?? 'awaiting_media_plane'}',
                  ),
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
              label: Text(l10n.conferencesStartPreview),
            ),
            FilledButton.icon(
              onPressed: busy || mediaStatus != 'available' ? null : onPublish,
              icon: const Icon(Icons.podcasts_rounded),
              label: Text(l10n.conferencesPublishWhip),
            ),
            ValueListenableBuilder<String>(
              valueListenable: media.connectionState,
              builder: (context, connectionState, _) {
                if (connectionState != 'failed') {
                  return const SizedBox.shrink();
                }
                return OutlinedButton.icon(
                  onPressed: busy ? null : onReconnect,
                  icon: const Icon(Icons.sync_problem_rounded),
                  label: Text(l10n.commonReconnectMedia),
                );
              },
            ),
            OutlinedButton.icon(
              onPressed: busy ? null : onRefreshCredentials,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(l10n.conferencesRefreshMedia),
            ),
          ],
        ),
      ],
    );
  }
}

final class _ContributionGallery extends StatelessWidget {
  const _ContributionGallery({
    required this.participants,
    required this.subscribers,
    required this.onRefresh,
    required this.onSubscribe,
    required this.onReconnect,
  });

  final List<JsonObject> participants;
  final Map<String, MediaContributionSubscriber> subscribers;
  final Future<void> Function() onRefresh;
  final Future<void> Function(JsonObject participant) onSubscribe;
  final Future<void> Function(JsonObject participant) onReconnect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                l10n.conferencesContributionGallery,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            IconButton(
              onPressed: () => onRefresh(),
              icon: const Icon(Icons.refresh_rounded),
              tooltip: l10n.conferencesRefreshParticipants,
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          l10n.conferencesContributionGalleryDescription,
          style: SyloraTokens.body(13),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: <Widget>[
            for (final participant in participants)
              SizedBox(
                width: 280,
                child: SyloraGlass(
                  radius: SyloraTokens.radiusMd,
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Text(
                        '${participant['role'] ?? 'participant'} · ${participant['user_id']}',
                        style: SyloraTokens.body(12),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      if (subscribers[participant['user_id'] as String?] !=
                          null)
                        subscribers[participant['user_id'] as String]!.preview()
                      else
                        const AspectRatio(
                          aspectRatio: 16 / 9,
                          child: ColoredBox(
                            color: Colors.black26,
                            child: Center(child: Icon(Icons.person_outline)),
                          ),
                        ),
                      const SizedBox(height: 8),
                      if (subscribers[participant['user_id'] as String?]
                          case final subscriber?)
                        ValueListenableBuilder<String>(
                          valueListenable: subscriber.connectionState,
                          builder: (context, connectionState, _) =>
                              OutlinedButton.icon(
                                onPressed: participant['is_self'] == true
                                    ? null
                                    : () => connectionState == 'failed'
                                          ? onReconnect(participant)
                                          : onSubscribe(participant),
                                icon: Icon(
                                  connectionState == 'failed'
                                      ? Icons.sync_problem_rounded
                                      : Icons.cast_connected_rounded,
                                ),
                                label: Text(
                                  connectionState == 'failed'
                                      ? l10n.commonReconnectMedia
                                      : l10n.conferencesSubscribeWhep,
                                ),
                              ),
                        )
                      else
                        OutlinedButton.icon(
                          onPressed: participant['is_self'] == true
                              ? null
                              : () => onSubscribe(participant),
                          icon: const Icon(Icons.cast_connected_rounded),
                          label: Text(l10n.conferencesSubscribeWhep),
                        ),
                    ],
                  ),
                ),
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
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          l10n.conferencesAuraAssist,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(l10n.conferencesAuraDescription),
        const SizedBox(height: 12),
        TextField(
          controller: controller,
          minLines: 2,
          maxLines: 5,
          decoration: InputDecoration(
            labelText: l10n.conferencesAskAura,
            hintText: l10n.conferencesAskAuraHint,
          ),
        ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            onPressed: busy ? null : onAsk,
            icon: const Icon(Icons.auto_awesome_rounded),
            label: Text(l10n.conferencesAskAura),
          ),
        ),
        if (answer != null) ...<Widget>[
          const SizedBox(height: 12),
          SelectableText(answer!),
        ],
      ],
    );
  }
}

final class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.video_call_outlined, size: 54),
            const SizedBox(height: 12),
            Text(
              l10n.conferencesEmptyTitle,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(l10n.conferencesEmptyMessage),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add_rounded),
              label: Text(l10n.conferencesCreateRoom),
            ),
          ],
        ),
      ),
    );
  }
}

final class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: <Widget>[
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded),
          label: Text(l10n.commonRetry),
        ),
      ],
    );
  }
}

IconData _purposeIcon(String purpose) => switch (purpose) {
  'education' => Icons.school_outlined,
  'social' => Icons.groups_2_outlined,
  _ => Icons.business_center_outlined,
};

String _label(BuildContext context, String purpose) {
  final l10n = AppLocalizations.of(context);
  return switch (purpose) {
    'education' => l10n.conferencesPurposeEducation,
    'social' => l10n.conferencesPurposeSocial,
    _ => l10n.conferencesPurposeBusiness,
  };
}

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
    final l10n = AppLocalizations.of(context);
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
            label: muted ? l10n.conferencesUnmute : l10n.conferencesMute,
            active: muted,
            onTap: onMute,
          ),
          _CallChip(
            icon: cameraOff
                ? Icons.videocam_off_rounded
                : Icons.videocam_rounded,
            label: cameraOff
                ? l10n.conferencesCameraOn
                : l10n.conferencesCameraOff,
            active: cameraOff,
            onTap: onCamera,
          ),
          _CallChip(
            icon: Icons.present_to_all_rounded,
            label: screenShare
                ? l10n.conferencesStopShare
                : l10n.conferencesShareScreen,
            active: screenShare,
            onTap: onScreenShare,
          ),
          _CallChip(
            icon: Icons.translate_rounded,
            label: aiTranslation
                ? l10n.conferencesTranslationOn
                : l10n.conferencesAiTranslate,
            active: aiTranslation,
            onTap: onTranslation,
          ),
          _CallChip(
            icon: captionsRecording
                ? Icons.stop_circle_outlined
                : Icons.closed_caption_rounded,
            label: captionsRecording
                ? l10n.conferencesStopAndTranscribe
                : l10n.conferencesCaptions,
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
    final l10n = AppLocalizations.of(context);
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
                    child: Text(
                      l10n.conferencesLiveGifts,
                      style: SyloraTokens.title(15),
                    ),
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
                l10n.conferencesLiveGiftsDescription,
                style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
              ),
              const SizedBox(height: 10),
              if (snapshot.connectionState != ConnectionState.done)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const LinearProgressIndicator(),
                    const SizedBox(height: 8),
                    Text(l10n.conferencesGiftsLoading),
                  ],
                )
              else if (snapshot.hasError)
                _stateMessage(
                  icon: Icons.cloud_off_outlined,
                  title: l10n.conferencesGiftsLoadError,
                  message: messageFor(snapshot.error!),
                  actionLabel: l10n.commonTryAgain,
                  onAction: _reloadCatalog,
                )
              else if (snapshot.data?.items.isEmpty ?? true)
                _stateMessage(
                  icon: Icons.redeem_outlined,
                  title: l10n.conferencesGiftsEmpty,
                  message: l10n.conferencesGiftsEmptyMessage,
                  actionLabel: l10n.conferencesRefreshGifts,
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
    final l10n = AppLocalizations.of(context);
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
            ? l10n.conferencesGiftCombo(gift.name, _comboCount)
            : l10n.conferencesGiftSent(gift.name);
      });
      _feedbackTimer?.cancel();
      _feedbackTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() => _feedback = null);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.conferencesGiftSentToHost(gift.name))),
      );
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
