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

final class CapturedMediaChunk {
  const CapturedMediaChunk({
    required this.bytes,
    required this.filename,
    required this.contentType,
  });

  final Uint8List bytes;
  final String filename;
  final String contentType;
}

final class CreatorMediaController {
  final ValueNotifier<double> _audioLevel = ValueNotifier<double>(0);
  final ValueNotifier<String> _connectionState = ValueNotifier<String>('idle');

  bool get supported => false;

  bool get screenShareSupported => false;

  bool get captionCaptureSupported => false;

  ValueListenable<double> get audioLevel => _audioLevel;

  ValueListenable<String> get connectionState => _connectionState;

  bool get hasAudioTrack => false;

  bool get hasVideoTrack => false;

  bool get audioEnabled => false;

  bool get videoEnabled => false;

  bool get screenSharing => false;

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

  Future<void> setAudioEnabled(bool enabled) async {
    throw UnsupportedError(
      'Microphone capture is unavailable on this platform.',
    );
  }

  Future<void> setVideoEnabled(bool enabled) async {
    throw UnsupportedError('Camera capture is unavailable on this platform.');
  }

  Future<void> setScreenShareEnabled(bool enabled) async {
    throw UnsupportedError('Screen capture is unavailable on this platform.');
  }

  Future<String> publishWhip(JsonObject credentials) async {
    _connectionState.value = 'failed';
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

  Future<void> startCaptionCapture() async {
    throw UnsupportedError(
      'Short caption recording currently uses browser MediaRecorder. Open this conference on SYLORA web.',
    );
  }

  Future<CapturedMediaChunk> stopCaptionCapture() async {
    throw UnsupportedError(
      'Short caption recording currently uses browser MediaRecorder. Open this conference on SYLORA web.',
    );
  }

  Future<void> stop() async {
    _connectionState.value = 'idle';
  }

  void dispose() {
    _audioLevel.dispose();
    _connectionState.dispose();
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
