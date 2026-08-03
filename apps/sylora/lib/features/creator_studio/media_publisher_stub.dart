import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api.dart';

final class CreatorMediaDevice {
  const CreatorMediaDevice({
    required this.id,
    required this.label,
    required this.kind,
  });

  final String id;
  final String label;
  final String kind;
}

final class CreatorMediaController {
  final ValueNotifier<double> _audioLevel = ValueNotifier<double>(0);

  bool get supported => false;

  ValueListenable<double> get audioLevel => _audioLevel;

  bool get hasAudioTrack => false;

  Future<List<CreatorMediaDevice>> devices() async =>
      const <CreatorMediaDevice>[];

  Widget preview() => const _UnsupportedPreview();

  Future<void> startPreview({
    String? audioDeviceId,
    String? videoDeviceId,
  }) async {
    throw UnsupportedError(
      'Browser camera publishing is available only on SYLORA web. Use OBS companion on this device.',
    );
  }

  Future<String> publishWhip(JsonObject credentials) async {
    throw UnsupportedError(
      'WHIP publishing is available only on SYLORA web. Use OBS companion on this device.',
    );
  }

  Future<String> startBrowserRecording() async {
    throw UnsupportedError(
      'Browser recording is available only on SYLORA web. Use OBS companion recording on this device.',
    );
  }

  Future<String> stopBrowserRecording() async {
    throw UnsupportedError(
      'Browser recording is available only on SYLORA web. Use OBS companion recording on this device.',
    );
  }

  Future<void> stop() async {}

  void dispose() {
    _audioLevel.dispose();
  }
}

final class _UnsupportedPreview extends StatelessWidget {
  const _UnsupportedPreview();

  @override
  Widget build(BuildContext context) => AspectRatio(
    aspectRatio: 16 / 9,
    child: DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Camera preview is available in the web Creator Studio. Use OBS companion for desktop/mobile publishing.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    ),
  );
}
