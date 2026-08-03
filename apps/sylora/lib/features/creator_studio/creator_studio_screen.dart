import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
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
  ConsumerState<CreatorStudioScreen> createState() => _CreatorStudioScreenState();
}

final class _CreatorStudioScreenState extends ConsumerState<CreatorStudioScreen> {
  late final CreatorMediaController _publisher;
  List<CreatorMediaDevice> _devices = const <CreatorMediaDevice>[];
  String? _sessionId;
  String? _audioDeviceId;
  String? _videoDeviceId;
  JsonObject? _capability;
  JsonObject? _credentials;
  String? _status;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _publisher = CreatorMediaController();
    if (_publisher.supported) {
      _loadDevices();
    }
  }

  @override
  void dispose() {
    _publisher.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(creatorStudioSessionsProvider);
    return LumenPage(
      title: 'Creator Studio',
      subtitle:
          'Web camera publishing for SYLORA Live through MediaMTX WHIP, with OBS kept as the companion path.',
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
    final audioDevices = _devices.where((device) => device.kind == 'audioinput').toList();
    final videoDevices = _devices.where((device) => device.kind == 'videoinput').toList();
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
                  message: 'Create a live session first, then return to Creator Studio.',
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
                      onChanged: (value) => setState(() => _videoDeviceId = value),
                    ),
                  ),
                  SizedBox(
                    width: 280,
                    child: _deviceMenu(
                      label: 'Microphone',
                      value: _audioDeviceId,
                      devices: audioDevices,
                      onChanged: (value) => setState(() => _audioDeviceId = value),
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
                    disabledReason: 'Device enumeration is available only on web.',
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
                    onPressed: session == null ? null : () => _checkCapability(session),
                    disabledReason: 'Select a live session first.',
                  ),
                  LumenPrimaryButton(
                    label: 'Start with browser (WHIP)',
                    icon: Icons.podcasts_rounded,
                    busy: _busy,
                    onPressed:
                        session != null && _publisher.supported ? () => _publish(session) : null,
                    disabledReason: _publisher.supported
                        ? 'Select a live session first.'
                        : 'Browser WHIP publishing is available only on web.',
                  ),
                  LumenSecondaryButton(
                    label: 'Connect OBS',
                    icon: Icons.desktop_windows_outlined,
                    onPressed: session == null ? null : () => _showObsPath(session),
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
    final effectiveValue = devices.any((device) => device.id == value) ? value : null;
    return DropdownButtonFormField<String>(
      initialValue: effectiveValue,
      decoration: InputDecoration(labelText: label),
      items: <DropdownMenuItem<String>>[
        const DropdownMenuItem<String>(value: '', child: Text('Browser default')),
        for (final device in devices)
          DropdownMenuItem<String>(
            value: device.id,
            child: Text(device.label),
          ),
      ],
      onChanged: (value) => onChanged(value?.isEmpty == true ? null : value),
    );
  }

  Future<void> _loadDevices() async {
    try {
      final devices = await _publisher.devices();
      if (mounted) {
        setState(() => _devices = devices);
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _startPreview() async {
    setState(() => _busy = true);
    try {
      await _publisher.startPreview(
        audioDeviceId: _audioDeviceId,
        videoDeviceId: _videoDeviceId,
      );
      if (mounted) {
        setState(() => _status = 'Camera preview is running.');
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
    try {
      final capability = await ref.read(liveRepositoryProvider).mediaCapability(session.id);
      if (mounted) {
        setState(() => _capability = capability);
      }
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _publish(LiveSessionModel session) async {
    setState(() => _busy = true);
    try {
      final credentials = await ref.read(liveRepositoryProvider).publishCredentials(session.id);
      if (credentials['status'] != 'available') {
        setState(() {
          _credentials = credentials;
          _status = 'WHIP unavailable: ${credentials['reason'] ?? 'unknown_reason'}';
        });
        return;
      }
      final message = await _publisher.publishWhip(credentials);
      if (mounted) {
        setState(() {
          _credentials = credentials;
          _status = message;
        });
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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(messageFor(error))),
    );
  }
}
