import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';

/// Production media stack settings — camera, mic, routing, OBS, virtual cam,
/// streaming and recording defaults. Values persist locally and feed Creator Studio.
final class MediaSettingsScreen extends ConsumerStatefulWidget {
  const MediaSettingsScreen({super.key});

  @override
  ConsumerState<MediaSettingsScreen> createState() =>
      _MediaSettingsScreenState();
}

final class _MediaSettingsScreenState
    extends ConsumerState<MediaSettingsScreen> {
  bool _loading = true;
  String _cameraId = 'default';
  String _micId = 'default';
  String _resolution = '1080p';
  bool _mirror = true;
  bool _noiseSuppression = true;
  bool _echoCancel = true;
  bool _virtualCam = false;
  bool _obsConnected = false;
  String _bitrate = '6000';
  String _latencyMode = 'low';
  bool _recordLocal = true;
  bool _recordCloud = true;
  String _audioRoute = 'stream_mix';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _cameraId = prefs.getString('media.camera') ?? 'default';
      _micId = prefs.getString('media.mic') ?? 'default';
      _resolution = prefs.getString('media.resolution') ?? '1080p';
      _mirror = prefs.getBool('media.mirror') ?? true;
      _noiseSuppression = prefs.getBool('media.noise') ?? true;
      _echoCancel = prefs.getBool('media.echo') ?? true;
      _virtualCam = prefs.getBool('media.virtual_cam') ?? false;
      _obsConnected = prefs.getBool('media.obs') ?? false;
      _bitrate = prefs.getString('media.bitrate') ?? '6000';
      _latencyMode = prefs.getString('media.latency') ?? 'low';
      _recordLocal = prefs.getBool('media.record_local') ?? true;
      _recordCloud = prefs.getBool('media.record_cloud') ?? true;
      _audioRoute = prefs.getString('media.audio_route') ?? 'stream_mix';
      _loading = false;
    });
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('media.camera', _cameraId);
    await prefs.setString('media.mic', _micId);
    await prefs.setString('media.resolution', _resolution);
    await prefs.setBool('media.mirror', _mirror);
    await prefs.setBool('media.noise', _noiseSuppression);
    await prefs.setBool('media.echo', _echoCancel);
    await prefs.setBool('media.virtual_cam', _virtualCam);
    await prefs.setBool('media.obs', _obsConnected);
    await prefs.setString('media.bitrate', _bitrate);
    await prefs.setString('media.latency', _latencyMode);
    await prefs.setBool('media.record_local', _recordLocal);
    await prefs.setBool('media.record_cloud', _recordCloud);
    await prefs.setString('media.audio_route', _audioRoute);
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.mediaSettingsSaved)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final webOnlyNote = kIsWeb
        ? l10n.mediaSettingsWebNote
        : l10n.mediaSettingsNativeNote;

    return LumenPage(
      title: l10n.mediaSettingsTitle,
      subtitle: l10n.mediaSettingsSubtitle,
      intensity: 0.88,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.live,
      child: ListView(
        children: <Widget>[
          SyloraUniverseHero(
            eyebrow: l10n.mediaSettingsHeroEyebrow,
            title: l10n.mediaSettingsHeroTitle,
            body: webOnlyNote,
            compactBreakpoint: 720,
          ),
          const SizedBox(height: 16),
          _Section(
            title: l10n.mediaSettingsCameraSection,
            children: <Widget>[
              _DropdownTile(
                label: l10n.mediaSettingsCameraDevice,
                value: _cameraId,
                items: const <String>['default', 'front', 'rear', 'virtual'],
                itemLabels: <String, String>{
                  'default': l10n.mediaSettingsDefaultDevice,
                  'front': l10n.mediaSettingsFrontCamera,
                  'rear': l10n.mediaSettingsRearCamera,
                  'virtual': l10n.mediaSettingsVirtualDevice,
                },
                onChanged: (value) => setState(() => _cameraId = value),
              ),
              _DropdownTile(
                label: l10n.mediaSettingsResolution,
                value: _resolution,
                items: const <String>['720p', '1080p', '1440p', '4k'],
                onChanged: (value) => setState(() => _resolution = value),
              ),
              SwitchListTile(
                title: Text(l10n.mediaSettingsMirrorPreview),
                value: _mirror,
                onChanged: (value) => setState(() => _mirror = value),
              ),
            ],
          ),
          _Section(
            title: l10n.mediaSettingsAudioSection,
            children: <Widget>[
              _DropdownTile(
                label: l10n.mediaSettingsMicrophone,
                value: _micId,
                items: const <String>['default', 'headset', 'usb', 'virtual'],
                itemLabels: <String, String>{
                  'default': l10n.mediaSettingsDefaultDevice,
                  'headset': l10n.mediaSettingsHeadset,
                  'usb': l10n.mediaSettingsUsbMicrophone,
                  'virtual': l10n.mediaSettingsVirtualDevice,
                },
                onChanged: (value) => setState(() => _micId = value),
              ),
              _DropdownTile(
                label: l10n.mediaSettingsAudioRoute,
                value: _audioRoute,
                items: const <String>[
                  'stream_mix',
                  'monitor_mix',
                  'voip_path',
                  'headphones',
                ],
                itemLabels: <String, String>{
                  'stream_mix': l10n.mediaSettingsStreamMix,
                  'monitor_mix': l10n.mediaSettingsMonitorMix,
                  'voip_path': l10n.mediaSettingsVoipPath,
                  'headphones': l10n.mediaSettingsHeadphones,
                },
                onChanged: (value) => setState(() => _audioRoute = value),
              ),
              SwitchListTile(
                title: Text(l10n.mediaSettingsNoiseSuppression),
                value: _noiseSuppression,
                onChanged: (value) => setState(() => _noiseSuppression = value),
              ),
              SwitchListTile(
                title: Text(l10n.mediaSettingsEchoCancellation),
                value: _echoCancel,
                onChanged: (value) => setState(() => _echoCancel = value),
              ),
            ],
          ),
          _Section(
            title: l10n.mediaSettingsObsSection,
            children: <Widget>[
              SwitchListTile(
                title: Text(l10n.mediaSettingsObsConnected),
                subtitle: Text(l10n.mediaSettingsObsConnectedDescription),
                value: _obsConnected,
                onChanged: (value) => setState(() => _obsConnected = value),
              ),
              SwitchListTile(
                title: Text(l10n.mediaSettingsVirtualCamera),
                subtitle: Text(l10n.mediaSettingsVirtualCameraDescription),
                value: _virtualCam,
                onChanged: (value) => setState(() => _virtualCam = value),
              ),
            ],
          ),
          _Section(
            title: l10n.mediaSettingsStreamingSection,
            children: <Widget>[
              _DropdownTile(
                label: l10n.mediaSettingsBitrate,
                value: _bitrate,
                items: const <String>['3000', '4500', '6000', '8000', '12000'],
                onChanged: (value) => setState(() => _bitrate = value),
              ),
              _DropdownTile(
                label: l10n.mediaSettingsLatencyMode,
                value: _latencyMode,
                items: const <String>['ultra_low', 'low', 'normal'],
                itemLabels: <String, String>{
                  'ultra_low': l10n.mediaSettingsUltraLowLatency,
                  'low': l10n.mediaSettingsLowLatency,
                  'normal': l10n.mediaSettingsNormalLatency,
                },
                onChanged: (value) => setState(() => _latencyMode = value),
              ),
            ],
          ),
          _Section(
            title: l10n.mediaSettingsRecordingSection,
            children: <Widget>[
              SwitchListTile(
                title: Text(l10n.mediaSettingsLocalRecording),
                value: _recordLocal,
                onChanged: (value) => setState(() => _recordLocal = value),
              ),
              SwitchListTile(
                title: Text(l10n.mediaSettingsCloudRecording),
                subtitle: Text(l10n.mediaSettingsCloudRecordingDescription),
                value: _recordCloud,
                onChanged: (value) => setState(() => _recordCloud = value),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _save,
            icon: const Icon(Icons.save_rounded),
            label: Text(l10n.mediaSettingsSaveProfile),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

final class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: SyloraGlass(
        radius: SyloraTokens.radiusLg,
        padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Text(title, style: SyloraTokens.title(16)),
            ),
            ...children,
          ],
        ),
      ),
    );
  }
}

final class _DropdownTile extends StatelessWidget {
  const _DropdownTile({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.itemLabels = const <String, String>{},
  });

  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  final Map<String, String> itemLabels;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(label),
      trailing: DropdownButton<String>(
        value: value,
        items: items
            .map(
              (item) => DropdownMenuItem<String>(
                value: item,
                child: Text(itemLabels[item] ?? item),
              ),
            )
            .toList(growable: false),
        onChanged: (next) {
          if (next != null) onChanged(next);
        },
      ),
    );
  }
}
