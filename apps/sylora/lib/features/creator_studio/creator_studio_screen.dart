import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../music/music_screens.dart';
import '../platform/repositories.dart';
import 'media_publisher.dart';
import 'media_subscriber.dart';

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
  JsonObject? _serverPreflight;
  String? _status;
  String? _mediaPreferencesError;
  String? _obsCheckError;
  String _selectedSceneName = 'Main';
  String? _sceneStatus;
  String? _recordingMode;
  bool _busy = false;
  bool _preflightBusy = false;
  bool _scenesBusy = false;
  bool _obsScenesAvailable = false;
  bool _obsCompanionExpected = false;
  bool _mediaPreferencesLoaded = false;
  bool _hasSavedMediaProfile = false;
  bool _browserPublishing = false;
  bool _recording = false;
  bool _recordingBusy = false;
  bool _guestsBusy = false;
  bool _bgmBusy = false;
  bool _alertPlaceholderEnabled = true;
  bool _auraDockEnabled = false;
  String _guestRole = 'guest';
  String? _guestsStatus;
  String? _guestsLoadedForSession;
  List<LiveGuestInviteModel> _guests = const <LiveGuestInviteModel>[];
  final Map<String, MediaContributionSubscriber> _guestSubscribers =
      <String, MediaContributionSubscriber>{};

  @override
  void initState() {
    super.initState();
    _publisher = CreatorMediaController();
    _publisher.connectionState.addListener(_handlePublisherConnectionState);
    _aura = SyloraAuraPresenceController.forPreset(
      SyloraAuraContextPreset.creatorStudio,
    );
    _loadMediaPreferences();
    if (_publisher.supported) {
      _loadDevices();
    }
  }

  @override
  void dispose() {
    _lowerThirdText.dispose();
    _guestInviteText.dispose();
    _publisher.connectionState.removeListener(_handlePublisherConnectionState);
    _publisher.dispose();
    for (final subscriber in _guestSubscribers.values) {
      subscriber.dispose();
    }
    _aura.dispose();
    super.dispose();
  }

  void _handlePublisherConnectionState() {
    if (!mounted) {
      return;
    }
    final connectionState = _publisher.connectionState.value;
    if (connectionState == 'connected' && !_browserPublishing) {
      setState(() => _browserPublishing = true);
    } else if (connectionState != 'connected' && _browserPublishing) {
      setState(() => _browserPublishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final sessions = ref.watch(creatorStudioSessionsProvider);
    ref.watch(creatorBgmProvider);
    ref.watch(musicPlayerProvider);
    _syncAuraForSessions(sessions);
    return LumenPage(
      title: l10n.creatorStudioTitle,
      subtitle: l10n.creatorStudioSubtitle,
      intensity: 0.94,
      showAuraPresence: _auraDockEnabled,
      auraPresenceController: _aura,
      auraPresencePreset: SyloraAuraContextPreset.creatorStudio,
      auraPresenceMode: _auraDockEnabled
          ? SyloraAuraPresenceMode.companion
          : SyloraAuraPresenceMode.hidden,
      header: SyloraUniverseHero(
        eyebrow: l10n.creatorStudioHeroEyebrow,
        title: l10n.creatorStudioTitle,
        body: l10n.creatorStudioHeroBody,
        trailing: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            SyloraPortalChip(
              label: l10n.creatorStudioOpenLive,
              icon: Icons.sensors_outlined,
              onTap: () => context.goNamed('live'),
            ),
            SyloraPortalChip(
              label: l10n.liveGoLive,
              icon: Icons.podcasts_rounded,
              onTap: () => context.goNamed('live'),
            ),
          ],
        ),
      ),
      actions: <Widget>[
        IconButton(
          tooltip: l10n.creatorStudioOpenLive,
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
    final l10n = AppLocalizations.of(context);
    final session = _selectedSession(sessions);
    _ensureGuestsLoaded(session);
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
                    l10n.creatorStudioPublishingUnsupported,
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
              Text(
                l10n.creatorStudioSession,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              if (sessions.isEmpty)
                LumenEmptyView(
                  title: l10n.liveNoSessions,
                  message: l10n.creatorStudioNoSessionsMessage,
                  actionLabel: l10n.creatorStudioOpenLive,
                  onAction: () => context.goNamed('live'),
                  icon: Icons.sensors_outlined,
                )
              else
                DropdownButtonFormField<String>(
                  initialValue: session?.id,
                  decoration: InputDecoration(
                    labelText: l10n.creatorStudioLiveSessionLabel,
                  ),
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
                    _serverPreflight = null;
                    _guests = const <LiveGuestInviteModel>[];
                    _guestsLoadedForSession = null;
                    _guestsStatus = null;
                    _obsScenesAvailable = false;
                    _obsCheckError = null;
                    _sceneStatus = null;
                    _browserPublishing = false;
                  }),
                ),
              if (session != null) ...<Widget>[
                const SizedBox(height: 12),
                SelectableText(
                  l10n.creatorStudioIngestPath(session.ingestPath),
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: LumenSecondaryButton(
                    label: l10n.creatorStudioOpenSession,
                    icon: Icons.sensors_rounded,
                    onPressed: () => context.pushNamed(
                      'live-session',
                      pathParameters: <String, String>{'id': session.id},
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Director go-live path first: preview → publish WHIP → status
        SyloraGlass(
          radius: SyloraTokens.radiusXl,
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                l10n.creatorStudioDirectorGoLive,
                style: SyloraTokens.title(20),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.creatorStudioDirectorGoLiveBody,
                style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
              ),
              const SizedBox(height: 14),
              _publisher.preview(),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: <Widget>[
                  SizedBox(
                    width: 280,
                    child: _deviceMenu(
                      label: l10n.creatorStudioCamera,
                      value: _videoDeviceId,
                      devices: videoDevices,
                      onChanged: (value) =>
                          setState(() => _videoDeviceId = value),
                    ),
                  ),
                  SizedBox(
                    width: 280,
                    child: _deviceMenu(
                      label: l10n.creatorStudioMicrophone,
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
                    label: l10n.creatorStudioRefreshDevices,
                    icon: Icons.refresh_rounded,
                    onPressed: _publisher.supported ? _loadDevices : null,
                    disabledReason: l10n.creatorStudioDevicesUnavailable,
                  ),
                  LumenPrimaryButton(
                    label: l10n.conferencesStartPreview,
                    icon: Icons.videocam_rounded,
                    busy: _busy,
                    onPressed: _publisher.supported ? _startPreview : null,
                    disabledReason: l10n.creatorStudioPreviewUnavailable,
                  ),
                  LumenSecondaryButton(
                    label: l10n.creatorStudioRunPreflight,
                    icon: Icons.fact_check_outlined,
                    onPressed: session != null &&
                            {'draft', 'preflight'}.contains(session.state) &&
                            !_preflightBusy
                        ? () => _runGoLivePreflight(session)
                        : null,
                    disabledReason: session == null
                        ? l10n.creatorStudioSelectSessionFirst
                        : l10n.creatorStudioPreflightOnlyBeforeLive,
                  ),
                  LumenPrimaryButton(
                    label: l10n.conferencesPublishWhip,
                    icon: Icons.podcasts_rounded,
                    busy: _busy,
                    onPressed:
                        session != null &&
                            _publisher.supported &&
                            _devicePublishReady
                        ? _publish
                        : null,
                    disabledReason: session == null
                        ? l10n.creatorStudioSelectSessionFirst
                        : !_publisher.supported
                        ? l10n.creatorStudioWhipUnavailable
                        : !_devicePreviewReady
                        ? l10n.creatorStudioStartPreviewFirst
                        : !_corePreflightReady
                        ? l10n.creatorStudioRunPreflightFirst
                        : l10n.creatorStudioMediaPathNotReady,
                  ),
                  LumenSecondaryButton(
                    label: l10n.creatorStudioConnectObs,
                    icon: Icons.desktop_windows_outlined,
                    onPressed: session == null
                        ? null
                        : () => _showObsPath(session),
                    disabledReason: l10n.creatorStudioSelectSessionFirst,
                  ),
                  if (session != null)
                    LumenSecondaryButton(
                      label: l10n.creatorStudioOpenSessionToStart,
                      icon: Icons.play_circle_outline_rounded,
                      onPressed: () => context.pushNamed(
                        'live-session',
                        pathParameters: <String, String>{'id': session.id},
                      ),
                    ),
                  ValueListenableBuilder<String>(
                    valueListenable: _publisher.connectionState,
                    builder: (context, connectionState, _) {
                      if (connectionState != 'failed' || session == null) {
                        return const SizedBox.shrink();
                      }
                      return LumenSecondaryButton(
                        label: l10n.commonReconnectMedia,
                        icon: Icons.sync_problem_rounded,
                        onPressed: _busy
                            ? null
                            : () => _reconnectPublisher(session),
                      );
                    },
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
                Text(
                  _status!,
                  style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        ExpansionTile(
          initiallyExpanded: false,
          tilePadding: EdgeInsets.zero,
          title: Text(
            'Technical checklist',
            style: SyloraTokens.title(18),
          ),
          subtitle: Text(
            _goLiveReady
                ? 'All required checks ready'
                : 'Preflight, credentials, and OBS details',
            style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
          ),
          children: <Widget>[
            _buildPreflightChecklist(session),
            const SizedBox(height: 12),
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    'Capability probe',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Start with this device uses WebRTC WHIP against MediaMTX. Connect OBS keeps the external encoder path and does not claim TikTok/Kick/Facebook publishing.',
                  ),
                  const SizedBox(height: 12),
                  LumenSecondaryButton(
                    label: 'Check media capability',
                    icon: Icons.fact_check_outlined,
                    onPressed: session == null
                        ? null
                        : () => _checkCapability(session),
                    disabledReason: l10n.creatorStudioSelectSessionFirst,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ExpansionTile(
          initiallyExpanded: false,
          tilePadding: EdgeInsets.zero,
          title: Text(
            'Scenes, guests & overlays',
            style: SyloraTokens.title(18),
          ),
          subtitle: Text(
            'Optional director tools',
            style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
          ),
          children: <Widget>[_buildWaveBSections(session)],
        ),
      ],
    );
  }

  bool get _devicePreviewReady =>
      _publisher.hasVideoTrack && _publisher.hasAudioTrack;

  bool get _credentialsReady {
    final credentials = _credentials;
    if (credentials == null || credentials['status'] != 'available') {
      return false;
    }
    final whipUrl = credentials['whip_url'];
    final token = credentials['bearer_token'];
    return whipUrl is String &&
        whipUrl.trim().isNotEmpty &&
        token is String &&
        token.trim().isNotEmpty;
  }

  bool get _serverPreflightReady => _serverPreflight?['ready'] == true;

  bool get _obsRequirementReady =>
      !_obsCompanionExpected || _obsScenesAvailable;

  bool get _corePreflightReady =>
      _mediaPreferencesLoaded &&
      _mediaPreferencesError == null &&
      _serverPreflightReady &&
      _credentialsReady &&
      _obsRequirementReady;

  bool get _devicePublishReady => _corePreflightReady && _devicePreviewReady;

  bool get _goLiveReady =>
      _corePreflightReady && (_browserPublishing || _obsScenesAvailable);

  Widget _buildPreflightChecklist(LiveSessionModel? session) {
    final l10n = AppLocalizations.of(context);
    final obsIsActivePath = _obsScenesAvailable;
    final sessionCanStart =
        session != null && {'draft', 'preflight'}.contains(session.state);
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  l10n.creatorStudioGoLivePreflight,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              LumenBadge(
                label: _goLiveReady ? 'ready' : 'blocked',
                color: _goLiveReady ? LumenColors.verdigris : LumenColors.solar,
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Checks reflect active media tracks and live API responses. Nothing is assumed ready.',
          ),
          const SizedBox(height: 12),
          _PreflightItem(
            label: 'Camera preview ready',
            ready: _publisher.hasVideoTrack
                ? true
                : obsIsActivePath
                ? null
                : false,
            detail: _publisher.hasVideoTrack
                ? 'An active video track is attached.'
                : obsIsActivePath
                ? 'Optional while the verified OBS path is active.'
                : 'Start preview and grant camera access.',
          ),
          _PreflightItem(
            label: 'Microphone ready',
            ready: _publisher.hasAudioTrack
                ? true
                : obsIsActivePath
                ? null
                : false,
            detail: _publisher.hasAudioTrack
                ? 'An active microphone track is attached.'
                : obsIsActivePath
                ? 'Optional while OBS supplies the program mix.'
                : 'Start preview and grant microphone access.',
          ),
          _PreflightItem(
            label: 'Media settings loaded',
            ready: _mediaPreferencesError != null
                ? false
                : _mediaPreferencesLoaded
                ? true
                : null,
            detail:
                _mediaPreferencesError ??
                (_mediaPreferencesLoaded
                    ? _hasSavedMediaProfile
                          ? 'Saved SharedPreferences media profile loaded.'
                          : 'Media defaults loaded; no saved profile exists yet.'
                    : 'Loading SharedPreferences media profile…'),
          ),
          _PreflightItem(
            label: 'OBS companion connected',
            ready: _obsScenesAvailable
                ? true
                : _obsCompanionExpected
                ? false
                : null,
            detail: _obsScenesAvailable
                ? 'OBS responded through the session integration.'
                : _obsCompanionExpected
                ? (_obsCheckError ??
                      'Media settings require OBS; run preflight to verify it.')
                : 'Optional unless OBS is enabled in Media settings.',
          ),
          _PreflightItem(
            label: 'Music BGM',
            ready: ref.read(creatorBgmProvider).selection == null ? null : true,
            detail: _bgmChecklistDetail,
          ),
          _PreflightItem(
            label: 'MediaMTX / WHIP credentials ready',
            ready: _serverPreflightReady && _credentialsReady,
            detail: _mediaPlaneDetail,
          ),
          _PreflightItem(
            label: 'Publishing path connected',
            ready: _browserPublishing || _obsScenesAvailable,
            detail: _browserPublishing
                ? 'This device is publishing to WHIP.'
                : _obsScenesAvailable
                ? 'OBS is the verified publishing path.'
                : 'Publish from this device or verify OBS before going live.',
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              LumenSecondaryButton(
                label: l10n.creatorStudioRunPreflight,
                icon: Icons.fact_check_outlined,
                onPressed: sessionCanStart && !_preflightBusy
                    ? () => _runGoLivePreflight(session)
                    : null,
                disabledReason: session == null
                    ? l10n.creatorStudioSelectSessionFirst
                    : !sessionCanStart
                    ? l10n.creatorStudioPreflightOnlyBeforeLive
                    : l10n.creatorStudioPreflightAlreadyRunning,
              ),
              LumenPrimaryButton(
                label: session?.state == 'live'
                    ? l10n.creatorStudioLiveNow
                    : l10n.liveGoLive,
                icon: Icons.sensors_rounded,
                busy: _busy || _preflightBusy,
                onPressed: session != null &&
                        {'draft', 'preflight'}.contains(session.state) &&
                        !_busy &&
                        !_preflightBusy
                    ? () => _oneTapGoLive(session)
                    : null,
                disabledReason: session == null
                    ? l10n.creatorStudioSelectSessionFirst
                    : l10n.creatorStudioSessionMustBeDraft,
              ),
              if (session?.shareWatchUrl case final shareUrl?)
                LumenSecondaryButton(
                  label: l10n.creatorStudioCopyWatchLink,
                  icon: Icons.ios_share_rounded,
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: shareUrl));
                    if (mounted) {
                      setState(
                        () => _status = l10n.liveWatchLinkCopied,
                      );
                    }
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  String get _mediaPlaneDetail {
    if (!_serverPreflightReady) {
      final checks = _serverPreflight?['checks'];
      if (checks is List) {
        for (final value in checks) {
          if (value is Map && value['ok'] != true) {
            final detail = value['detail'];
            if (detail is String && detail.trim().isNotEmpty) {
              return detail;
            }
          }
        }
      }
      return 'Run preflight to verify the deployment-managed media plane.';
    }
    if (!_credentialsReady) {
      return 'Media ingest passed, but usable WHIP credentials are missing.';
    }
    return 'Media ingest is healthy and usable WHIP credentials were issued.';
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
        SizedBox(width: 420, child: _buildBgmSection()),
        SizedBox(width: 420, child: _buildRecordingSection(session)),
      ],
    );
  }

  String get _bgmChecklistDetail {
    final selection = ref.read(creatorBgmProvider).selection;
    if (selection == null) {
      return 'Optional; choose a track or playlist in the BGM panel.';
    }
    return '${selection.track.title} from ${selection.sourceTitle} is selected.';
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
    final l10n = AppLocalizations.of(context);
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
            'Invite a guest or cohost by user ID or @username. Accepted guests receive a separate WHIP contribution path when MediaMTX is configured. It is not automatically composited with the host feed; use an external mixer until multi-host SFU mixing is available.',
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    ListTile(
                      leading: const Icon(Icons.group_outlined),
                      title: Text(guest.inviteeUserId),
                      subtitle: Text(
                        'Role: ${guest.role} · Contribution: ${guest.mediaStatus}',
                      ),
                      trailing: LumenBadge(
                        label: guest.status,
                        color: _guestStatusColor(guest.status),
                      ),
                    ),
                    if (_guestSubscribers[guest.id]
                        case final subscriber?) ...<Widget>[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: subscriber.preview(),
                      ),
                    ],
                    if (guest.status == 'accepted') ...<Widget>[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: Text(
                          'Separate contribution path — subscribe with WHEP in-studio. Not auto-composited into the host program.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: <Widget>[
                            if (_guestSubscribers[guest.id]
                                case final subscriber?)
                              ValueListenableBuilder<String>(
                                valueListenable: subscriber.connectionState,
                                builder: (context, connectionState, _) =>
                                    LumenSecondaryButton(
                                      label: connectionState == 'failed'
                                          ? l10n.commonReconnectMedia
                                          : 'Refresh WHEP',
                                      icon: connectionState == 'failed'
                                          ? Icons.sync_problem_rounded
                                          : Icons.cast_connected_rounded,
                                      onPressed: _guestsBusy || session == null
                                          ? null
                                          : () => _subscribeGuestWhep(
                                              session,
                                              guest,
                                            ),
                                    ),
                              )
                            else
                              LumenSecondaryButton(
                                label: 'Subscribe WHEP',
                                icon: Icons.cast_connected_rounded,
                                onPressed: _guestsBusy || session == null
                                    ? null
                                    : () => _subscribeGuestWhep(session, guest),
                              ),
                            if (guest.playbackUrl
                                case final playbackUrl?) ...<Widget>[
                              LumenSecondaryButton(
                                label: 'Open playback',
                                icon: Icons.open_in_new_rounded,
                                onPressed: () =>
                                    _openGuestPlayback(playbackUrl),
                              ),
                              LumenSecondaryButton(
                                label: 'Copy playback',
                                icon: Icons.copy_rounded,
                                onPressed: () =>
                                    _copyGuestPlayback(playbackUrl),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                    if (guest.status == 'pending' || guest.status == 'accepted')
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: LumenSecondaryButton(
                            label: 'Revoke guest',
                            icon: Icons.person_off_outlined,
                            onPressed: _guestsBusy || session == null
                                ? null
                                : () => _revokeGuest(session, guest),
                          ),
                        ),
                      ),
                  ],
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

  Widget _buildBgmSection() {
    final selection = ref.read(creatorBgmProvider).selection;
    final player = ref.read(musicPlayerProvider);
    final isCurrent = selection != null && player.isCurrent(selection.track);
    final previewBlocked =
        _publisher.hasAudioTrack || _browserPublishing || _obsScenesAvailable;
    return LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Music BGM',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              LumenBadge(
                label: selection == null
                    ? 'optional'
                    : selection.fromPlaylist
                    ? 'playlist'
                    : 'track',
                color: selection == null
                    ? LumenColors.porcelainMuted
                    : LumenColors.aether,
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Select from the SYLORA music catalog. Selection is saved on the live session for production metadata. Local preview does not mix into WHIP — use OBS for the broadcast mix.',
          ),
          const SizedBox(height: 12),
          if (selection == null)
            const Text('No BGM selected.')
          else
            Card(
              margin: EdgeInsets.zero,
              child: ListTile(
                leading: const Icon(Icons.library_music_rounded),
                title: Text(selection.track.title),
                subtitle: Text(
                  '${selection.track.artistName} · ${selection.sourceTitle}\n'
                  '${selection.track.licenseLabel}',
                ),
                isThreeLine: true,
                trailing: isCurrent
                    ? Icon(
                        player.playing
                            ? Icons.graphic_eq_rounded
                            : Icons.pause_circle_outline_rounded,
                      )
                    : null,
              ),
            ),
          const SizedBox(height: 12),
          if (previewBlocked)
            const Padding(
              padding: EdgeInsets.only(bottom: 10),
              child: Text(
                'Local preview is paused while a microphone or publishing path is active to avoid feedback.',
              ),
            ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              LumenPrimaryButton(
                label: selection == null ? 'Choose BGM' : 'Change BGM',
                icon: Icons.queue_music_rounded,
                busy: _bgmBusy,
                onPressed: _bgmBusy ? null : _chooseBgm,
              ),
              LumenSecondaryButton(
                label: isCurrent && player.playing
                    ? 'Pause preview'
                    : 'Play preview',
                icon: isCurrent && player.playing
                    ? Icons.pause_rounded
                    : Icons.play_arrow_rounded,
                onPressed: selection != null && !previewBlocked && !_bgmBusy
                    ? _toggleBgmPreview
                    : null,
                disabledReason: selection == null
                    ? 'Choose BGM first.'
                    : 'Preview is paused while live audio is active.',
              ),
              if (selection != null)
                LumenSecondaryButton(
                  label: 'Clear',
                  icon: Icons.close_rounded,
                  onPressed: _bgmBusy ? null : _clearBgm,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _chooseBgm() async {
    setState(() => _bgmBusy = true);
    try {
      final home = await ref.read(musicRepositoryProvider).home();
      if (!mounted) return;
      final tracks = <MusicTrack>[];
      final seenTrackIds = <String>{};
      for (final track in <MusicTrack>[
        ...home.creatorBgm,
        ...home.royaltyFree,
      ]) {
        if (seenTrackIds.add(track.id)) tracks.add(track);
      }
      final playlists = <MusicPlaylist>[
        ...home.personalPlaylists,
        ...home.moodPlaylists,
        ...home.aiPlaylists,
      ];
      final choice = await showModalBottomSheet<_BgmChoice>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: SizedBox(
            height: MediaQuery.sizeOf(context).height * 0.72,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: <Widget>[
                Text(
                  'Choose Creator Studio BGM',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 6),
                const Text(
                  'Tracks are selected directly. A playlist uses its first track as the local preview and keeps the playlist as the source.',
                ),
                const SizedBox(height: 18),
                Text(
                  'Creator tracks',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (tracks.isEmpty)
                  const ListTile(title: Text('No creator BGM tracks available'))
                else
                  for (final track in tracks)
                    ListTile(
                      leading: const Icon(Icons.music_note_rounded),
                      title: Text(track.title),
                      subtitle: Text(
                        '${track.artistName} · ${track.licenseLabel}',
                      ),
                      onTap: () =>
                          Navigator.pop(context, _BgmChoice(track: track)),
                    ),
                const Divider(height: 28),
                Text(
                  'Playlists',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (playlists.isEmpty)
                  const ListTile(title: Text('No playlists available'))
                else
                  for (final playlist in playlists)
                    ListTile(
                      leading: const Icon(Icons.queue_music_rounded),
                      title: Text(playlist.title),
                      subtitle: Text('${playlist.trackCount} tracks'),
                      onTap: () => Navigator.pop(
                        context,
                        _BgmChoice(playlist: playlist),
                      ),
                    ),
              ],
            ),
          ),
        ),
      );
      if (choice == null || !mounted) return;
      if (choice.track case final MusicTrack track) {
        ref
            .read(creatorBgmProvider)
            .select(
              CreatorBgmSelection(track: track, sourceTitle: 'Creator BGM'),
            );
        await _persistBgmSelection(trackId: track.id);
        return;
      }
      final playlist = choice.playlist!;
      final playlistTracks = await ref
          .read(musicRepositoryProvider)
          .playlistTracks(playlist.id);
      if (playlistTracks.isEmpty) {
        throw StateError('${playlist.title} has no tracks');
      }
      ref
          .read(creatorBgmProvider)
          .select(
            CreatorBgmSelection(
              track: playlistTracks.first,
              sourceTitle: playlist.title,
              playlistId: playlist.id,
            ),
          );
      await _persistBgmSelection(playlistId: playlist.id);
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _bgmBusy = false);
      }
    }
  }

  Future<void> _toggleBgmPreview() async {
    final selection = ref.read(creatorBgmProvider).selection;
    if (selection == null) return;
    setState(() => _bgmBusy = true);
    final player = ref.read(musicPlayerProvider);
    try {
      if (player.isCurrent(selection.track)) {
        await player.toggle();
      } else {
        await player.play(selection.track);
        final playbackError = player.error;
        if (playbackError != null) {
          throw StateError(playbackError);
        }
        await ref
            .read(musicRepositoryProvider)
            .play(selection.track.id, context: 'creator_studio_bgm');
      }
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _bgmBusy = false);
      }
    }
  }

  Future<void> _persistBgmSelection({
    String? trackId,
    String? playlistId,
  }) async {
    final sessionId = _sessionId;
    if (sessionId == null) {
      setState(() {
        _status =
            'BGM selected locally. Choose a live session to persist production metadata.';
      });
      return;
    }
    try {
      await ref
          .read(liveRepositoryProvider)
          .updateSessionBgm(
            sessionId,
            trackId: trackId,
            playlistId: playlistId,
          );
      if (mounted) {
        setState(() {
          _status =
              'BGM selection saved on the session. Mix audio in OBS — WHIP is unchanged.';
        });
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _subscribeGuestWhep(
    LiveSessionModel session,
    LiveGuestInviteModel guest,
  ) async {
    setState(() => _guestsBusy = true);
    try {
      final credentials = await ref
          .read(liveRepositoryProvider)
          .guestSubscribeCredentials(session.id, guest.id);
      if (credentials['status'] != 'available') {
        throw StateError(
          credentials['reason']?.toString() ??
              'Guest WHEP is awaiting the media plane.',
        );
      }
      final subscriber = _guestSubscribers.putIfAbsent(
        guest.id,
        MediaContributionSubscriber.new,
      );
      if (!subscriber.supported) {
        throw StateError('WHEP gallery requires web or native WebRTC builds.');
      }
      await subscriber.stop();
      await subscriber.subscribeWhep(credentials);
      if (mounted) {
        setState(() {
          _guestsStatus =
              'Subscribed to ${guest.inviteeUserId} contribution (not composited).';
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

  Future<void> _clearBgm() async {
    final selection = ref.read(creatorBgmProvider).selection;
    final player = ref.read(musicPlayerProvider);
    if (selection != null && player.isCurrent(selection.track)) {
      await player.stop();
    }
    ref.read(creatorBgmProvider).clear();
    final sessionId = _sessionId;
    if (sessionId != null) {
      try {
        await ref
            .read(liveRepositoryProvider)
            .updateSessionBgm(sessionId, clear: true);
      } on Object catch (error) {
        _showError(error);
      }
    }
  }

  Future<void> _pauseAppAudioForLiveInput() async {
    final player = ref.read(musicPlayerProvider);
    if (player.playing) {
      await player.toggle();
    }
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
        ? 'Local MediaRecorder fallback'
        : 'Connect OBS or start device WHIP publishing first.';
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
                'Select a session for OBS or start device publishing for MediaRecorder.',
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
      await _pauseAppAudioForLiveInput();
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
        'Start device publishing before MediaRecorder fallback.',
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

  void _ensureGuestsLoaded(LiveSessionModel? session) {
    if (session == null || _guestsLoadedForSession == session.id) return;
    _guestsLoadedForSession = session.id;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _selectedSessionIdMatches(session.id)) {
        _refreshGuests(session);
      }
    });
  }

  bool _selectedSessionIdMatches(String sessionId) =>
      _sessionId == null || _sessionId == sessionId;

  Future<void> _refreshGuests(LiveSessionModel session) async {
    setState(() => _guestsBusy = true);
    try {
      final guests = await ref.read(liveRepositoryProvider).guests(session.id);
      if (mounted) {
        setState(() {
          _guestsLoadedForSession = session.id;
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

  Future<void> _revokeGuest(
    LiveSessionModel session,
    LiveGuestInviteModel guest,
  ) async {
    setState(() => _guestsBusy = true);
    try {
      await ref
          .read(liveRepositoryProvider)
          .revokeGuestInvite(session.id, guest.id);
      final guests = await ref.read(liveRepositoryProvider).guests(session.id);
      if (mounted) {
        setState(() {
          _guests = guests;
          _guestsStatus =
              'Guest ${guest.inviteeUserId} revoked. Contribution path removed.';
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

  Future<void> _openGuestPlayback(String playbackUrl) async {
    try {
      final opened = await launchUrl(
        Uri.parse(playbackUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!opened) {
        throw StateError('No application could open the playback URL.');
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _copyGuestPlayback(String playbackUrl) async {
    await Clipboard.setData(ClipboardData(text: playbackUrl));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Guest contribution playback URL copied.'),
        ),
      );
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

  Future<void> _loadMediaPreferences() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      if (!mounted) {
        return;
      }
      setState(() {
        _obsCompanionExpected = preferences.getBool('media.obs') ?? false;
        _hasSavedMediaProfile =
            preferences.containsKey('media.camera') ||
            preferences.containsKey('media.mic') ||
            preferences.containsKey('media.audio_route') ||
            preferences.containsKey('media.obs');
        _mediaPreferencesLoaded = true;
        _mediaPreferencesError = null;
      });
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _mediaPreferencesLoaded = false;
          _mediaPreferencesError =
              'Media settings could not be loaded: ${messageFor(error)}';
        });
      }
    }
  }

  Future<void> _runGoLivePreflight(LiveSessionModel session) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _preflightBusy = true;
      _serverPreflight = null;
      _credentials = null;
      _obsCheckError = null;
      _status = l10n.creatorStudioPreflightChecking;
    });
    _aura.think('Aura is running the go-live preflight.');
    try {
      await _loadMediaPreferences();
      final repository = ref.read(liveRepositoryProvider);
      final values = await Future.wait<JsonObject>(<Future<JsonObject>>[
        repository.preflight(session.id),
        repository.mediaCapability(session.id),
        repository.publishCredentials(session.id),
      ]);
      JsonObject? obsResponse;
      String? obsError;
      try {
        obsResponse = await repository.obsScenes(session.id);
      } on Object catch (error) {
        obsError = messageFor(error);
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _serverPreflight = values[0];
        _capability = values[1];
        _credentials = values[2];
        _obsCheckError = obsError;
        _obsScenesAvailable = obsResponse != null;
        _status = _serverPreflightReady && _credentialsReady
            ? l10n.creatorStudioPreflightPassedConnect
            : l10n.creatorStudioPreflightFoundBlockers;
      });
      if (obsResponse != null) {
        await _pauseAppAudioForLiveInput();
        _applyObsScenes(obsResponse);
      }
      ref.invalidate(creatorStudioSessionsProvider);
      _aura.focus(
        _serverPreflightReady && _credentialsReady
            ? 'The media plane is ready. Connect your publishing path.'
            : 'Resolve the preflight blockers before going live.',
      );
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _serverPreflight = null;
          _credentials = null;
          _obsScenesAvailable = false;
        });
      }
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _preflightBusy = false);
      }
    }
  }

  Future<void> _goLive(LiveSessionModel session) async {
    final l10n = AppLocalizations.of(context);
    if (!_goLiveReady) {
      setState(() {
        _status = l10n.creatorStudioGoLiveBlocked;
      });
      return;
    }
    setState(() => _busy = true);
    _aura.think('Aura is starting the live session.');
    try {
      final started = await ref.read(liveRepositoryProvider).start(session.id);
      if (!mounted) {
        return;
      }
      setState(() => _status = '${started.title} is ${started.state}.');
      ref.invalidate(creatorStudioSessionsProvider);
      _aura.speak('Your session is live.');
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  /// One-tap path for the public stand: preflight → WHIP publish → start.
  Future<void> _oneTapGoLive(LiveSessionModel session) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _preflightBusy = true;
      _status = l10n.creatorStudioPreparingGoLive;
    });
    _aura.think('Aura is preparing your go-live.');
    try {
      final repository = ref.read(liveRepositoryProvider);
      await _loadMediaPreferences();
      final values = await Future.wait<JsonObject>(<Future<JsonObject>>[
        repository.preflight(session.id),
        repository.mediaCapability(session.id),
        repository.publishCredentials(session.id),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        _serverPreflight = values[0];
        _capability = values[1];
        _credentials = values[2];
      });
      if (!_serverPreflightReady || !_credentialsReady) {
        setState(() {
          _status = l10n.creatorStudioPreflightBlockedGoLive;
        });
        return;
      }
      await _pauseAppAudioForLiveInput();
      if (!_publisher.hasVideoTrack || !_publisher.hasAudioTrack) {
        await _publisher.startPreview(
          audioDeviceId: _audioDeviceId,
          videoDeviceId: _videoDeviceId,
        );
      }
      final credentials = _credentials;
      if (credentials == null) {
        setState(() => _status = 'Publish credentials missing after preflight.');
        return;
      }
      if (!_browserPublishing) {
        final message = await _publisher.publishWhip(credentials);
        if (!mounted) {
          return;
        }
        setState(() {
          _browserPublishing = true;
          _status = message;
        });
      }
      final started = await repository.start(session.id);
      if (!mounted) {
        return;
      }
      final share = started.shareWatchUrl;
      setState(() {
        _status = share == null
            ? '${started.title} is live.'
            : '${started.title} is live. Share: $share';
      });
      ref.invalidate(creatorStudioSessionsProvider);
      _aura.speak('You are live. Share the watch link with friends.');
      if (share != null) {
        await Clipboard.setData(ClipboardData(text: share));
      }
    } on Object catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _preflightBusy = false;
        });
      }
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
      await _pauseAppAudioForLiveInput();
      await _publisher.startPreview(
        audioDeviceId: _audioDeviceId,
        videoDeviceId: _videoDeviceId,
      );
      if (mounted) {
        setState(() => _status = 'Camera and microphone preview is running.');
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

  Future<void> _publish() async {
    final credentials = _credentials;
    if (!_devicePublishReady || credentials == null) {
      setState(() {
        _status =
            'Publishing is blocked until preview and go-live preflight are ready.';
      });
      return;
    }
    setState(() => _busy = true);
    _aura.think('Aura is preparing the WHIP publishing path.');
    try {
      await _pauseAppAudioForLiveInput();
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
        _aura.speak('WHIP publishing is connected.');
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _credentials = null;
          _browserPublishing = false;
        });
      }
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _reconnectPublisher(LiveSessionModel session) async {
    setState(() => _busy = true);
    _aura.think('Aura is reconnecting the WHIP publishing path.');
    try {
      final credentials = await ref
          .read(liveRepositoryProvider)
          .publishCredentials(session.id);
      if (credentials['status'] != 'available') {
        throw StateError(
          credentials['reason']?.toString() ?? 'WHIP media is unavailable.',
        );
      }
      await _pauseAppAudioForLiveInput();
      await _publisher.stop();
      await _publisher.startPreview(
        audioDeviceId: _audioDeviceId,
        videoDeviceId: _videoDeviceId,
      );
      final message = await _publisher.publishWhip(credentials);
      if (mounted) {
        setState(() {
          _credentials = credentials;
          _status = message;
          _browserPublishing = true;
        });
        _aura.speak('WHIP publishing is reconnected.');
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _browserPublishing = false);
      }
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

final class _PreflightItem extends StatelessWidget {
  const _PreflightItem({
    required this.label,
    required this.ready,
    required this.detail,
  });

  final String label;
  final bool? ready;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final color = switch (ready) {
      true => LumenColors.verdigris,
      false => LumenColors.rose,
      null => LumenColors.porcelainMuted,
    };
    final icon = switch (ready) {
      true => Icons.check_circle_rounded,
      false => Icons.cancel_rounded,
      null => Icons.remove_circle_outline_rounded,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(label, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 2),
                Text(detail, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final class _StudioScene {
  const _StudioScene({required this.name, required this.localDraft});

  final String name;
  final bool localDraft;
}

final class _BgmChoice {
  const _BgmChoice({this.track, this.playlist})
    : assert(track != null || playlist != null);

  final MusicTrack? track;
  final MusicPlaylist? playlist;
}
