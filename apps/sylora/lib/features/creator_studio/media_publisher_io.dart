import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

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
  CreatorMediaController({Dio? whipClient}) : _whipClient = whipClient ?? Dio();

  final Dio _whipClient;
  final RTCVideoRenderer _renderer = RTCVideoRenderer();
  Future<void>? _rendererReady;
  final ValueNotifier<double> _audioLevel = ValueNotifier<double>(0);

  MediaStream? _cameraStream;
  MediaStream? _screenStream;
  RTCPeerConnection? _peer;
  RTCRtpSender? _videoSender;
  String? _resourceUrl;
  String? _bearerToken;
  Timer? _audioMeterTimer;
  bool _meterSamplePending = false;
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _screenSharing = false;
  bool _disposed = false;

  bool get supported =>
      Platform.isAndroid ||
      Platform.isIOS ||
      Platform.isMacOS ||
      Platform.isWindows ||
      Platform.isLinux;

  bool get screenShareSupported =>
      Platform.isAndroid ||
      Platform.isMacOS ||
      Platform.isWindows ||
      Platform.isLinux;

  bool get captionCaptureSupported => false;

  ValueListenable<double> get audioLevel => _audioLevel;

  bool get hasAudioTrack => _cameraStream?.getAudioTracks().isNotEmpty ?? false;

  bool get hasVideoTrack => _cameraStream?.getVideoTracks().isNotEmpty ?? false;

  bool get audioEnabled => _audioEnabled;

  bool get videoEnabled => _videoEnabled;

  bool get screenSharing => _screenSharing;

  Future<List<CreatorMediaDevice>> devices() async {
    final values = await navigator.mediaDevices.enumerateDevices();
    return values
        .where(
          (device) =>
              device.kind == 'audioinput' || device.kind == 'videoinput',
        )
        .map((device) {
          final kind = device.kind ?? '';
          final label = device.label;
          return CreatorMediaDevice(
            id: device.deviceId,
            label: label.isEmpty ? _fallbackLabel(kind) : label,
            kind: kind,
          );
        })
        .toList(growable: false);
  }

  Widget preview() => AspectRatio(
    aspectRatio: 16 / 9,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: ColoredBox(
        color: Colors.black,
        child: RTCVideoView(
          _renderer,
          mirror: !_screenSharing,
          objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
          placeholderBuilder: (context) => const Center(
            child: Icon(Icons.videocam_off_outlined, color: Colors.white70),
          ),
        ),
      ),
    ),
  );

  Future<void> startPreview({
    String? audioDeviceId,
    String? videoDeviceId,
  }) async {
    _checkNotDisposed();
    await stop();
    await _ensureRenderer();

    final stream = await navigator.mediaDevices.getUserMedia(<String, dynamic>{
      'audio': _deviceConstraint(audioDeviceId),
      'video': _deviceConstraint(videoDeviceId),
    });
    _cameraStream = stream;
    for (final track in stream.getAudioTracks()) {
      track.enabled = _audioEnabled;
    }
    for (final track in stream.getVideoTracks()) {
      track.enabled = _videoEnabled;
    }
    _renderer.srcObject = stream;
  }

  Future<void> setAudioEnabled(bool enabled) async {
    _checkNotDisposed();
    _audioEnabled = enabled;
    for (final track
        in _cameraStream?.getAudioTracks() ?? const <MediaStreamTrack>[]) {
      track.enabled = enabled;
    }
    if (!enabled) {
      _audioLevel.value = 0;
    }
  }

  Future<void> setVideoEnabled(bool enabled) async {
    _checkNotDisposed();
    _videoEnabled = enabled;
    for (final track
        in _cameraStream?.getVideoTracks() ?? const <MediaStreamTrack>[]) {
      track.enabled = enabled;
    }
  }

  Future<void> setScreenShareEnabled(bool enabled) async {
    _checkNotDisposed();
    if (enabled == _screenSharing) {
      return;
    }
    if (enabled) {
      if (!screenShareSupported) {
        throw UnsupportedError(
          'Screen sharing requires a platform screen-capture extension on this device.',
        );
      }
      await _startScreenShare();
    } else {
      await _stopScreenShare();
    }
  }

  Future<String> publishWhip(JsonObject credentials) async {
    _checkNotDisposed();
    final stream = _cameraStream;
    if (stream == null) {
      throw StateError('Start preview before publishing.');
    }
    final whipUrl = optionalString(credentials, 'whip_url');
    final token = optionalString(credentials, 'bearer_token');
    if (whipUrl == null ||
        whipUrl.trim().isEmpty ||
        token == null ||
        token.trim().isEmpty) {
      throw StateError('WHIP credentials are unavailable for this session.');
    }
    final uri = Uri.tryParse(whipUrl);
    if (uri == null ||
        !uri.hasAuthority ||
        (uri.scheme != 'https' && uri.scheme != 'http')) {
      throw StateError('WHIP ingest URL is invalid.');
    }

    await _closePeer();
    final peer = await createPeerConnection(<String, dynamic>{
      'sdpSemantics': 'unified-plan',
      'iceServers': _iceServers(credentials),
    });
    _peer = peer;
    try {
      for (final track in stream.getAudioTracks()) {
        await peer.addTrack(track, stream);
      }
      final activeVideoStream = _screenStream ?? stream;
      final videoTracks = activeVideoStream.getVideoTracks();
      if (videoTracks.isNotEmpty) {
        _videoSender = await peer.addTrack(
          videoTracks.first,
          activeVideoStream,
        );
      }

      final offer = await peer.createOffer(<String, dynamic>{
        'offerToReceiveAudio': false,
        'offerToReceiveVideo': false,
      });
      await peer.setLocalDescription(offer);
      await _waitForIceGathering(peer);
      final local = await peer.getLocalDescription();
      final sdp = local?.sdp;
      if (sdp == null || sdp.trim().isEmpty) {
        throw StateError('WebRTC did not produce a local SDP offer.');
      }

      final response = await _whipClient.post<String>(
        uri.toString(),
        data: sdp,
        options: Options(
          contentType: 'application/sdp',
          responseType: ResponseType.plain,
          followRedirects: false,
          validateStatus: (_) => true,
          headers: <String, String>{'Authorization': 'Bearer $token'},
        ),
      );
      final status = response.statusCode;
      if (status == null || status < 200 || status >= 300) {
        throw StateError(
          'MediaMTX WHIP rejected publish with HTTP ${status ?? 'unknown'}.',
        );
      }
      final answer = response.data;
      if (answer == null || answer.trim().isEmpty) {
        throw StateError('MediaMTX WHIP did not return an SDP answer.');
      }
      final location = response.headers.value('location');
      if (location != null && location.isNotEmpty) {
        _resourceUrl = uri.resolve(location).toString();
      }
      _bearerToken = token;
      await peer.setRemoteDescription(RTCSessionDescription(answer, 'answer'));
      _startAudioMeter();
      return 'Native WHIP publish connected.';
    } on Object {
      await _closePeer();
      rethrow;
    }
  }

  Future<String> startBrowserRecording() async {
    throw UnsupportedError(
      'Local recording is not available in the native publisher. Use the server or OBS recorder.',
    );
  }

  Future<String> stopBrowserRecording() async {
    throw UnsupportedError(
      'Local recording is not available in the native publisher. Use the server or OBS recorder.',
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
    _stopAudioMeter();
    await _closePeer();
    await _disposeScreenStream();
    final stream = _cameraStream;
    _cameraStream = null;
    if (stream != null) {
      for (final track in stream.getTracks()) {
        await track.stop();
      }
      await stream.dispose();
    }
    if (!_disposed && _rendererReady != null) {
      await _rendererReady;
      _renderer.srcObject = null;
    }
  }

  void dispose() {
    if (_disposed) {
      return;
    }
    _disposed = true;
    unawaited(_dispose());
  }

  Future<void> _startScreenShare() async {
    final cameraStream = _cameraStream;
    if (cameraStream == null) {
      throw StateError('Start preview before sharing your screen.');
    }
    final screenStream = await navigator.mediaDevices.getDisplayMedia(
      <String, dynamic>{'audio': false, 'video': true},
    );
    final tracks = screenStream.getVideoTracks();
    if (tracks.isEmpty) {
      await screenStream.dispose();
      throw StateError('Screen capture did not provide a video track.');
    }
    final screenTrack = tracks.first;
    screenTrack.onEnded = () {
      if (!_disposed && _screenSharing) {
        unawaited(_stopScreenShare());
      }
    };
    try {
      await _videoSender?.replaceTrack(screenTrack);
      _screenStream = screenStream;
      _screenSharing = true;
      _renderer.srcObject = screenStream;
    } on Object {
      screenTrack.onEnded = null;
      for (final track in screenStream.getTracks()) {
        await track.stop();
      }
      await screenStream.dispose();
      rethrow;
    }
  }

  Future<void> _stopScreenShare() async {
    final cameraTrack = _cameraStream?.getVideoTracks().firstOrNull;
    await _videoSender?.replaceTrack(cameraTrack);
    _screenSharing = false;
    _renderer.srcObject = _cameraStream;
    await _disposeScreenStream();
  }

  Future<void> _disposeScreenStream() async {
    final stream = _screenStream;
    _screenStream = null;
    _screenSharing = false;
    if (stream == null) {
      return;
    }
    for (final track in stream.getTracks()) {
      track.onEnded = null;
      await track.stop();
    }
    await stream.dispose();
  }

  void _startAudioMeter() {
    _stopAudioMeter();
    _audioMeterTimer = Timer.periodic(const Duration(milliseconds: 180), (_) {
      unawaited(_sampleAudioLevel());
    });
  }

  Future<void> _sampleAudioLevel() async {
    if (_meterSamplePending || !_audioEnabled) {
      return;
    }
    final peer = _peer;
    final track = _cameraStream?.getAudioTracks().firstOrNull;
    if (peer == null || track == null) {
      return;
    }
    _meterSamplePending = true;
    try {
      final reports = await peer.getStats(track);
      for (final report in reports) {
        final raw = report.values['audioLevel'];
        if (raw is num) {
          _audioLevel.value = raw.toDouble().clamp(0, 1);
          return;
        }
      }
    } on Object {
      // Audio-level stats are optional across WebRTC implementations.
    } finally {
      _meterSamplePending = false;
    }
  }

  void _stopAudioMeter() {
    _audioMeterTimer?.cancel();
    _audioMeterTimer = null;
    _audioLevel.value = 0;
  }

  Future<void> _teardownWhipResource() async {
    final resource = _resourceUrl;
    final token = _bearerToken;
    _resourceUrl = null;
    _bearerToken = null;
    if (resource == null) {
      return;
    }
    try {
      await _whipClient.delete<void>(
        resource,
        options: Options(
          headers: <String, String>{
            if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
          },
          validateStatus: (_) => true,
        ),
      );
    } on Object {
      // Best-effort WHIP resource teardown.
    }
  }

  Future<void> _closePeer() async {
    await _teardownWhipResource();

    final peer = _peer;
    _peer = null;
    _videoSender = null;
    if (peer != null) {
      await peer.close();
      await peer.dispose();
    }
  }

  Future<void> _dispose() async {
    await stop();
    if (_rendererReady != null) {
      await _rendererReady;
      await _renderer.dispose();
    }
    _audioLevel.dispose();
  }

  Future<void> _ensureRenderer() => _rendererReady ??= _renderer.initialize();

  void _checkNotDisposed() {
    if (_disposed) {
      throw StateError('Creator media controller is disposed.');
    }
  }
}

Object _deviceConstraint(String? deviceId) {
  if (deviceId == null || deviceId.isEmpty) {
    return true;
  }
  return <String, dynamic>{
    'deviceId': <String, String>{'exact': deviceId},
  };
}

String _fallbackLabel(String kind) => switch (kind) {
  'audioinput' => 'Microphone',
  'videoinput' => 'Camera',
  _ => 'Media device',
};

List<Map<String, dynamic>> _iceServers(JsonObject credentials) {
  final servers = credentials['ice_servers'];
  if (servers is! List) {
    return const <Map<String, dynamic>>[];
  }
  return servers
      .whereType<JsonObject>()
      .map((server) {
        final urls = server['urls'];
        return <String, dynamic>{
          'urls': _iceServerUrls(urls),
          if (server['username'] is String)
            'username': server['username'] as String,
          if (server['credential'] is String)
            'credential': server['credential'] as String,
        };
      })
      .toList(growable: false);
}

Object _iceServerUrls(Object? urls) {
  if (urls is String) {
    return urls;
  }
  if (urls is List<Object?>) {
    return urls.whereType<String>().toList(growable: false);
  }
  return const <String>[];
}

Future<void> _waitForIceGathering(RTCPeerConnection peer) async {
  if (peer.iceGatheringState ==
      RTCIceGatheringState.RTCIceGatheringStateComplete) {
    return;
  }
  final complete = Completer<void>();
  peer.onIceGatheringState = (state) {
    if (state == RTCIceGatheringState.RTCIceGatheringStateComplete &&
        !complete.isCompleted) {
      complete.complete();
    }
  };
  try {
    await complete.future.timeout(const Duration(seconds: 10));
  } on TimeoutException {
    // Send the best complete local description available after the timeout.
  } finally {
    peer.onIceGatheringState = null;
  }
}
