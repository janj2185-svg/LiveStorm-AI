import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';
import '../platform/repositories.dart';
import 'media_publisher.dart';

final creatorStudioSessionsProvider =
    FutureProvider.autoDispose<List<LiveSessionModel>>(
      (ref) => ref.watch(liveRepositoryProvider).sessions(),
    );

final class CreatorStudioScreen extends ConsumerStatefulWidget {
  const CreatorStudioScreen({super.key});

  @override
  ConsumerState<CreatorStudioScreen> createState() =>
      _CreatorStudioScreenState();
}

final class _CreatorStudioScreenState
    extends ConsumerState<CreatorStudioScreen> {
  late final CreatorMediaController _publisher;
  late final SyloraAuraPresenceController _aura;
  final TextEditingController _lowerThirdText = TextEditingController(
    text: 'Welcome to SYLORA Live',
  );
  final TextEditingController _guestInviteText = TextEditingController();
  final List<_StudioScene> _scenes = <_StudioScene>[
    const _StudioScene(name: 'Main', localDraft: true),
    const _StudioScene(name: 'Intermission', localDraft: true),
    const _StudioScene(name: 'Q&A', localDraft: true),
  ];
  List<CreatorMediaDevice> _devices = const <CreatorMediaDevice>[];
  String? _sessionId;
  String? _audioDeviceId;
  String? _videoDeviceId;
  JsonObject? _capability;
  JsonObject? _credentials;
  String? _status;
  String _selectedSceneName = 'Main';
  String? _sceneStatus;
  String? _recordingMode;
  bool _busy = false;
  bool _scenesBusy = false;
  bool _obsScenesAvailable = false;
  bool _browserPublishing = false;
  bool _recording = false;
  bool _recordingBusy = false;
  bool _guestsBusy = false;
  bool _alertPlaceholderEnabled = true;
  bool _auraDockEnabled = true;
  String _guestRole = 'guest';
  String? _guestsStatus;
  List<LiveGuestInviteModel> _guests = const <LiveGuestInviteModel>[];

  @override
  void initState() {
    super.initState();
    _publisher = CreatorMediaController();
    _aura = SyloraAuraPresenceController.forPreset(
      SyloraAuraContextPreset.creatorStudio,
    );
    if (_publisher.supported) {
      _loadDevices();
    }
  }

  @override
  void dispose() {
    _lowerThirdText.dispose();
    _guestInviteText.dispose();
    _publisher.dispose();
    _aura.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(creatorStudioSessionsProvider);
    _syncAuraForSessions(sessions);
    return LumenPage(
      title: 'Creator Studio',
      subtitle:
          'Web camera publishing for SYLORA Live through MediaMTX WHIP, with OBS kept as the companion path.',
      showAuraPresence: _auraDockEnabled,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.creatorStudio,
      actions: <Widget>[
        IconButton(
          tooltip: 'Open Live',
          onPressed: () => context.goNamed('live'),
          icon: const Icon(Icons.sensors_outlined),
        ),
      ],
      child: LumenAsyncView<List<LiveSessionModel>>(
        value: sessions,
        onRetry: () => ref.invalidate(creatorStudioSessionsProvider),
        data: _buildStudio,
      ),
    );
  }

  Widget _buildStudio(List<LiveSessionModel> sessions) {
    final session = _selectedSession(sessions);
    final audioDevices = _devices
        .where((device) => device.kind == 'audioinput')
        .toList();
    final videoDevices = _devices
        .where((device) => device.kind == 'videoinput')
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (!_publisher.supported)
          LumenSurface(
            child: Row(
              children: <Widget>[
                const Icon(Icons.videocam_off_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Browser camera publishing is not available on this platform. Use OBS companion with the session ingest path and reveal-once stream key.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ),
        if (!_publisher.supported) const SizedBox(height: 16),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Session', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 12),
              if (sessions.isEmpty)
                LumenEmptyView(
                  title: 'No live sessions',
                  message:
                      'Create a live session first, then return to Creator Studio.',
                  actionLabel: 'Open Live',
                  onAction: () => context.goNamed('live'),
                  icon: Icons.sensors_outlined,
                )
              else
                DropdownButtonFormField<String>(
                  initialValue: session?.id,
                  decoration: const InputDecoration(labelText: 'Live session'),
                  items: <DropdownMenuItem<String>>[
                    for (final item in sessions)
                      DropdownMenuItem<String>(
                        value: item.id,
                        child: Text('${item.title} (${item.state})'),
                      ),
                  ],
                  onChanged: (value) => setState(() {
                    _sessionId = value;
                    _capability = null;
                    _credentials = null;
                    _guests = const <LiveGuestInviteModel>[];
                    _guestsStatus = null;
                    _obsScenesAvailable = false;
                    _sceneStatus = null;
                  }),
                ),
              if (session != null) ...<Widget>[
                const SizedBox(height: 12),
                SelectableText(
                  'Ingest path: ${session.ingestPath}',
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildWaveBSections(session),
        const SizedBox(height: 16),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Preview', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 12),
              _publisher.preview(),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: <Widget>[
                  SizedBox(
                    width: 280,
                    child: _deviceMenu(
                      label: 'Camera',
                      value: _videoDeviceId,
                      devices: videoDevices,
                      onChanged: (value) =>
                          setState(() => _videoDeviceId = value),
                    ),
                  ),
                  SizedBox(
                    width: 280,
                    child: _deviceMenu(
                      label: 'Microphone',
                      value: _audioDeviceId,
                      devices: audioDevices,
                      onChanged: (value) =>
                          setState(() => _audioDeviceId = value),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  LumenSecondaryButton(
                    label: 'Refresh devices',
                    icon: Icons.refresh_rounded,
                    onPressed: _publisher.supported ? _loadDevices : null,
                    disabledReason:
                        'Device enumeration is available only on web.',
                  ),
                  LumenPrimaryButton(
                    label: 'Start preview',
                    icon: Icons.videocam_rounded,
                    busy: _busy,
                    onPressed: _publisher.supported ? _startPreview : null,
                    disabledReason: 'Camera preview is available only on web.',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Publish', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              const Text(
                'Start with browser uses WebRTC WHIP against MediaMTX. Connect OBS keeps the external encoder path and does not claim TikTok/Kick/Facebook publishing.',
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  LumenSecondaryButton(
                    label: 'Check media capability',
                    icon: Icons.fact_check_outlined,
                    onPressed: session == null
                        ? null
                        : () => _checkCapability(session),
                    disabledReason: 'Select a live session first.',
                  ),
                  LumenPrimaryButton(
                    label: 'Start with browser (WHIP)',
                    icon: Icons.podcasts_rounded,
                    busy: _busy,
                    onPressed: session != null && _publisher.supported
                        ? () => _publish(session)
                        : null,
                    disabledReason: _publisher.supported
                        ? 'Select a live session first.'
                        : 'Browser WHIP publishing is available only on web.',
                  ),
                  LumenSecondaryButton(
                    label: 'Connect OBS',
                    icon: Icons.desktop_windows_outlined,
                    onPressed: session == null
                        ? null
                        : () => _showObsPath(session),
                    disabledReason: 'Select a live session first.',
                  ),
                ],
              ),
              if (_capability != null) ...<Widget>[
                const SizedBox(height: 12),
                Text(
                  'Capability: ${_capability!['status']}'
                  '${_capability!['reason'] == null ? '' : ' (${_capability!['reason']})'}',
                ),
              ],
              if (_credentials != null) ...<Widget>[
                const SizedBox(height: 12),
                SelectableText(
                  'WHIP URL: ${_credentials!['whip_url'] ?? 'unavailable'}\n'
                  'Playback URL: ${_credentials!['playback_url'] ?? 'unavailable'}\n'
                  'Token expires in: ${_credentials!['token_expires_in_seconds']}s',
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              ],
              if (_status != null) ...<Widget>[
                const SizedBox(height: 12),
                Text(_status!),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildWaveBSections(LiveSessionModel? session) {
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: <Widget>[
        SizedBox(width: 420, child: _buildScenesSection(session)),
        SizedBox(width: 420, child: _buildOverlaysSection()),
        SizedBox(width: 420, child: _buildGuestsSection(session)),
        SizedBox(width: 420, child: _buildAudioSection()),
        SizedBox(width: 420, child: _buildRecordingSection(session)),
      ],
    );
  }

  Widget _buildScenesSection(LiveSessionModel? session) {
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Scenes',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              LumenBadge(
                label: _obsScenesAvailable ? 'OBS synced' : 'local draft',
                color: _obsScenesAvailable
                    ? LumenColors.aether
                    : LumenColors.solar,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _obsScenesAvailable
                ? 'Selecting an OBS scene updates the connected companion.'
                : 'Local drafts are shown until an OBS destination is connected and synced.',
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              LumenSecondaryButton(
                label: 'Sync OBS',
                icon: Icons.sync_rounded,
                onPressed: session == null || _scenesBusy
                    ? null
                    : () => _syncObsScenes(session),
                disabledReason: 'Select a live session first.',
              ),
              LumenSecondaryButton(
                label: 'Add draft',
                icon: Icons.add_rounded,
                onPressed: _addScene,
              ),
              LumenSecondaryButton(
                label: 'Rename draft',
                icon: Icons.edit_outlined,
                onPressed: _renameSelectedScene,
              ),
            ],
          ),
          if (_sceneStatus != null) ...<Widget>[
            const SizedBox(height: 10),
            Text(_sceneStatus!),
          ],
          const SizedBox(height: 12),
          for (final scene in _scenes)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                selected: scene.name == _selectedSceneName,
                leading: Icon(
                  scene.localDraft
                      ? Icons.edit_note_rounded
                      : Icons.desktop_windows_outlined,
                ),
                title: Text(scene.name),
                subtitle: Text(
                  scene.localDraft ? 'Local draft scene' : 'OBS program scene',
                ),
                trailing: LumenBadge(
                  label: scene.localDraft ? 'local draft' : 'OBS',
                  color: scene.localDraft
                      ? LumenColors.solar
                      : LumenColors.aether,
                ),
                onTap: () => _selectScene(session, scene),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOverlaysSection() {
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text('Overlays', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          const Text(
            'Draft overlay controls for Wave B. OBS source wiring stays explicit when a companion is connected.',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _lowerThirdText,
            decoration: const InputDecoration(
              labelText: 'Lower-third text',
              prefixIcon: Icon(Icons.subtitles_outlined),
            ),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Alert placeholder'),
            subtitle: const Text('Reserve an overlay slot for future alerts.'),
            value: _alertPlaceholderEnabled,
            onChanged: (value) =>
                setState(() => _alertPlaceholderEnabled = value),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Aura cohost dock'),
            subtitle: const Text('Show Aura presence while producing.'),
            value: _auraDockEnabled,
            onChanged: (value) => setState(() => _auraDockEnabled = value),
          ),
        ],
      ),
    );
  }

  Widget _buildGuestsSection(LiveSessionModel? session) {
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Guests',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              LumenBadge(
                label: '${_guests.length} invited',
                color: LumenColors.aether,
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Invite a guest or cohost by user ID or @username. Accepted guests receive a separate WHIP publishing path when MediaMTX is configured.',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _guestInviteText,
            decoration: const InputDecoration(
              labelText: 'User ID or @username',
              prefixIcon: Icon(Icons.person_add_alt_1_outlined),
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _guestRole,
            decoration: const InputDecoration(labelText: 'Role'),
            items: const <DropdownMenuItem<String>>[
              DropdownMenuItem<String>(value: 'guest', child: Text('Guest')),
              DropdownMenuItem<String>(value: 'cohost', child: Text('Cohost')),
            ],
            onChanged: (value) => setState(() => _guestRole = value ?? 'guest'),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              LumenPrimaryButton(
                label: 'Invite guest',
                icon: Icons.person_add_alt_1_rounded,
                busy: _guestsBusy,
                onPressed: session == null ? null : () => _inviteGuest(session),
                disabledReason: 'Select a live session first.',
              ),
              LumenSecondaryButton(
                label: 'Refresh guests',
                icon: Icons.refresh_rounded,
                onPressed: session == null
                    ? null
                    : () => _refreshGuests(session),
                disabledReason: 'Select a live session first.',
              ),
            ],
          ),
          if (_guestsStatus != null) ...<Widget>[
            const SizedBox(height: 10),
            Text(_guestsStatus!),
          ],
          const SizedBox(height: 12),
          if (_guests.isEmpty)
            const Text('No guest invites for this session yet.')
          else
            for (final guest in _guests)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.group_outlined),
                  title: Text(guest.inviteeUserId),
                  subtitle: Text(
                    'Role: ${guest.role} | Media: ${guest.mediaStatus}',
                  ),
                  trailing: LumenBadge(
                    label: guest.status,
                    color: _guestStatusColor(guest.status),
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Color _guestStatusColor(String status) => switch (status) {
    'accepted' => LumenColors.aether,
    'declined' => LumenColors.rose,
    'revoked' => LumenColors.porcelainMuted,
    _ => LumenColors.solar,
  };

  Widget _buildAudioSection() {
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Audio meters',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            _publisher.supported
                ? _publisher.hasAudioTrack
                      ? 'Live microphone analyser from the preview stream.'
                      : 'Start preview with a microphone to activate the analyser.'
                : 'Use OBS companion audio meters on this platform.',
          ),
          const SizedBox(height: 16),
          AnimatedBuilder(
            animation: _publisher.audioLevel,
            builder: (context, _) {
              final level = _publisher.audioLevel.value;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  _audioMeterRow('Mic L', level),
                  const SizedBox(height: 10),
                  _audioMeterRow(
                    'Mic R',
                    (level * 0.86).clamp(0, 1).toDouble(),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _audioMeterRow(String label, double value) {
    return Row(
      children: <Widget>[
        SizedBox(width: 56, child: Text(label)),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(minHeight: 12, value: value),
          ),
        ),
        const SizedBox(width: 10),
        Text('${(value * 100).round()}%'),
      ],
    );
  }

  Widget _buildRecordingSection(LiveSessionModel? session) {
    final canRecord =
        session != null || (_publisher.supported && _browserPublishing);
    final mode = _obsScenesAvailable
        ? 'OBS companion record control'
        : _browserPublishing
        ? 'Browser MediaRecorder fallback'
        : 'Connect OBS or start browser WHIP publishing first.';
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text('Recording', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(mode),
          const SizedBox(height: 16),
          LumenPrimaryButton(
            label: _recording ? 'Stop recording' : 'Start recording',
            icon: _recording
                ? Icons.stop_circle_outlined
                : Icons.fiber_manual_record,
            busy: _recordingBusy,
            onPressed: canRecord ? () => _toggleRecording(session) : null,
            disabledReason:
                'Select a session for OBS or start browser publishing for MediaRecorder.',
          ),
        ],
      ),
    );
  }

  LiveSessionModel? _selectedSession(List<LiveSessionModel> sessions) {
    if (sessions.isEmpty) {
      return null;
    }
    final selected = _sessionId;
    if (selected == null) {
      return sessions.first;
    }
    return sessions.firstWhere(
      (session) => session.id == selected,
      orElse: () => sessions.first,
    );
  }

  Widget _deviceMenu({
    required String label,
    required String? value,
    required List<CreatorMediaDevice> devices,
    required ValueChanged<String?> onChanged,
  }) {
    final effectiveValue = devices.any((device) => device.id == value)
        ? value
        : null;
    return DropdownButtonFormField<String>(
      initialValue: effectiveValue,
      decoration: InputDecoration(labelText: label),
      items: <DropdownMenuItem<String>>[
        const DropdownMenuItem<String>(
          value: '',
          child: Text('Browser default'),
        ),
        for (final device in devices)
          DropdownMenuItem<String>(value: device.id, child: Text(device.label)),
      ],
      onChanged: (value) => onChanged(value?.isEmpty == true ? null : value),
    );
  }

  Future<void> _syncObsScenes(LiveSessionModel session) async {
    setState(() => _scenesBusy = true);
    _aura.think('Aura is syncing OBS scenes.');
    try {
      final response = await ref
          .read(liveRepositoryProvider)
          .obsScenes(session.id);
      if (!mounted) {
        return;
      }
      _applyObsScenes(response);
      if (mounted) {
        setState(() {
          _obsScenesAvailable = true;
          _sceneStatus = 'OBS scenes synced.';
        });
        _aura.speak('OBS scenes are available in Creator Studio.');
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _obsScenesAvailable = false;
          _sceneStatus =
              'OBS unavailable: ${messageFor(error)} Local draft scenes remain active.';
        });
        _aura.focus('Creator Studio is using local draft scenes.');
      }
    } finally {
      if (mounted) {
        setState(() => _scenesBusy = false);
      }
    }
  }

  Future<void> _selectScene(
    LiveSessionModel? session,
    _StudioScene scene,
  ) async {
    setState(() => _selectedSceneName = scene.name);
    if (scene.localDraft || !_obsScenesAvailable || session == null) {
      return;
    }
    try {
      final response = await ref
          .read(liveRepositoryProvider)
          .selectObsScene(session.id, scene.name);
      if (!mounted) {
        return;
      }
      _applyObsScenes(response);
      if (mounted) {
        setState(() => _sceneStatus = 'OBS scene selected: ${scene.name}.');
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _addScene() async {
    final name = await _sceneNameDialog(title: 'Add draft scene');
    if (name == null || !mounted) {
      return;
    }
    final uniqueName = _uniqueSceneName(name);
    setState(() {
      _scenes.add(_StudioScene(name: uniqueName, localDraft: true));
      _selectedSceneName = uniqueName;
      _sceneStatus = 'Local draft scene added.';
    });
  }

  Future<void> _renameSelectedScene() async {
    final index = _scenes.indexWhere(
      (scene) => scene.name == _selectedSceneName,
    );
    if (index < 0) {
      return;
    }
    final scene = _scenes[index];
    if (!scene.localDraft) {
      setState(() {
        _sceneStatus = 'Rename OBS scenes in OBS; Creator Studio mirrors them.';
      });
      return;
    }
    final name = await _sceneNameDialog(
      title: 'Rename draft scene',
      initialValue: scene.name,
    );
    if (name == null || !mounted) {
      return;
    }
    final uniqueName = _uniqueSceneName(name, except: scene.name);
    setState(() {
      _scenes[index] = _StudioScene(name: uniqueName, localDraft: true);
      _selectedSceneName = uniqueName;
      _sceneStatus = 'Local draft scene renamed.';
    });
  }

  Future<void> _toggleRecording(LiveSessionModel? session) async {
    setState(() => _recordingBusy = true);
    try {
      final message = _recording
          ? await _stopRecording(session)
          : await _startRecording(session);
      if (mounted) {
        setState(() => _status = message);
      }
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _recordingBusy = false);
      }
    }
  }

  Future<String> _startRecording(LiveSessionModel? session) async {
    if (session != null) {
      try {
        final response = await ref
            .read(liveRepositoryProvider)
            .startObsRecording(session.id);
        _recordingMode = 'obs';
        _recording = response['active'] == true;
        return 'OBS recording started.';
      } on Object catch (error) {
        if (!_browserPublishing || !_publisher.supported) {
          rethrow;
        }
        setState(() {
          _status =
              'OBS recording unavailable: ${messageFor(error)} Falling back to browser recording.';
        });
      }
    }
    if (!_browserPublishing) {
      throw StateError(
        'Start browser publishing before MediaRecorder fallback.',
      );
    }
    final message = await _publisher.startBrowserRecording();
    _recordingMode = 'browser';
    _recording = true;
    return message;
  }

  Future<String> _stopRecording(LiveSessionModel? session) async {
    if (_recordingMode == 'obs' && session != null) {
      final response = await ref
          .read(liveRepositoryProvider)
          .stopObsRecording(session.id);
      _recording = response['active'] == true;
      _recordingMode = _recording ? 'obs' : null;
      return 'OBS recording stopped.';
    }
    final message = await _publisher.stopBrowserRecording();
    _recording = false;
    _recordingMode = null;
    return message;
  }

  void _applyObsScenes(JsonObject response) {
    final sceneObjects = requireList(
      response,
      'scenes',
    ).map((value) => requireObject(value, 'OBS scene')).toList(growable: false);
    final currentScene = optionalString(response, 'current_scene');
    final obsScenes = sceneObjects
        .map(
          (scene) => _StudioScene(
            name: requireString(scene, 'name'),
            localDraft: false,
          ),
        )
        .toList(growable: false);
    final localDrafts = _scenes
        .where((scene) => scene.localDraft)
        .toList(growable: false);
    setState(() {
      _scenes
        ..clear()
        ..addAll(obsScenes)
        ..addAll(localDrafts);
      _selectedSceneName =
          currentScene ??
          (obsScenes.isNotEmpty ? obsScenes.first.name : _selectedSceneName);
    });
  }

  String _uniqueSceneName(String requested, {String? except}) {
    var name = requested.trim();
    if (name.isEmpty) {
      name = 'Untitled scene';
    }
    final existing = _scenes
        .where((scene) => scene.name != except)
        .map((scene) => scene.name.toLowerCase())
        .toSet();
    if (!existing.contains(name.toLowerCase())) {
      return name;
    }
    var index = 2;
    while (existing.contains('$name $index'.toLowerCase())) {
      index += 1;
    }
    return '$name $index';
  }

  Future<void> _refreshGuests(LiveSessionModel session) async {
    setState(() => _guestsBusy = true);
    try {
      final guests = await ref.read(liveRepositoryProvider).guests(session.id);
      if (mounted) {
        setState(() {
          _guests = guests;
          _guestsStatus = 'Guest list refreshed.';
        });
      }
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _guestsBusy = false);
      }
    }
  }

  Future<void> _inviteGuest(LiveSessionModel session) async {
    final invitee = _guestInviteText.text.trim();
    if (invitee.isEmpty) {
      setState(() => _guestsStatus = 'Enter a user ID or @username to invite.');
      return;
    }
    setState(() => _guestsBusy = true);
    try {
      final invited = await ref
          .read(liveRepositoryProvider)
          .inviteGuest(session.id, invitee: invitee, role: _guestRole);
      final guests = await ref.read(liveRepositoryProvider).guests(session.id);
      if (mounted) {
        setState(() {
          _guestInviteText.clear();
          _guests = guests;
          _guestsStatus =
              'Invite sent to ${invited.inviteeUserId} as ${invited.role}.';
        });
      }
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _guestsBusy = false);
      }
    }
  }

  Future<String?> _sceneNameDialog({
    required String title,
    String initialValue = '',
  }) async {
    final controller = TextEditingController(text: initialValue);
    try {
      return await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Scene name'),
            onSubmitted: (value) => Navigator.pop(
              context,
              value.trim().isEmpty ? null : value.trim(),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final value = controller.text.trim();
                Navigator.pop(context, value.isEmpty ? null : value);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      );
    } finally {
      controller.dispose();
    }
  }

  Future<void> _loadDevices() async {
    _aura.think('Aura is scanning camera and microphone options.');
    try {
      final devices = await _publisher.devices();
      if (mounted) {
        setState(() => _devices = devices);
        _aura.focus('Devices are ready for preview.');
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _startPreview() async {
    setState(() => _busy = true);
    _aura.think('Aura is starting your preview.');
    try {
      await _publisher.startPreview(
        audioDeviceId: _audioDeviceId,
        videoDeviceId: _videoDeviceId,
      );
      if (mounted) {
        setState(() => _status = 'Camera preview is running.');
        _aura.speak('Preview is live in the studio.');
      }
      await _loadDevices();
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _checkCapability(LiveSessionModel session) async {
    _aura.think('Aura is checking media capability.');
    try {
      final capability = await ref
          .read(liveRepositoryProvider)
          .mediaCapability(session.id);
      if (mounted) {
        setState(() => _capability = capability);
        _aura.focus('Capability check returned ${capability['status']}.');
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _publish(LiveSessionModel session) async {
    setState(() => _busy = true);
    _aura.think('Aura is preparing the WHIP publishing path.');
    try {
      final credentials = await ref
          .read(liveRepositoryProvider)
          .publishCredentials(session.id);
      if (credentials['status'] != 'available') {
        setState(() {
          _credentials = credentials;
          _status =
              'WHIP unavailable: ${credentials['reason'] ?? 'unknown_reason'}';
        });
        _aura.focus('WHIP is unavailable for this session.');
        return;
      }
      final message = await _publisher.publishWhip(credentials);
      if (mounted) {
        setState(() {
          _credentials = credentials;
          _status = message;
          _browserPublishing = true;
        });
        _aura.speak('Browser publishing is connected.');
      }
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _showObsPath(LiveSessionModel session) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Connect OBS companion'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text(
              'Use your deployment MediaMTX RTMP/WebRTC ingest endpoint with this path. Stream keys are reveal-once from Live session creation or rotation.',
            ),
            const SizedBox(height: 12),
            SelectableText(
              session.ingestPath,
              style: const TextStyle(fontFamily: 'monospace'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          FilledButton(
            onPressed: () => context.goNamed(
              'live-session',
              pathParameters: <String, String>{'id': session.id},
            ),
            child: const Text('Open session'),
          ),
        ],
      ),
    );
  }

  void _showError(Object error) {
    if (!mounted) {
      return;
    }
    setState(() => _status = messageFor(error));
    _aura.focus('Aura found a studio blocker.');
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
  }

  void _syncAuraForSessions(AsyncValue<List<LiveSessionModel>> sessions) {
    final next = sessions.isLoading
        ? (emotion: AuraEmotion.thinking, tip: 'Aura is loading live sessions.')
        : sessions.hasError
        ? (
            emotion: AuraEmotion.focused,
            tip: 'Aura needs the live session list to recover.',
          )
        : (
            emotion: AuraEmotion.greeting,
            tip: 'Aura is ready to help you publish.',
          );
    if (_aura.emotion == next.emotion && _aura.tip == next.tip) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _aura.update(emotion: next.emotion, tip: next.tip);
      }
    });
  }
}

final class _StudioScene {
  const _StudioScene({required this.name, required this.localDraft});

  final String name;
  final bool localDraft;
}
