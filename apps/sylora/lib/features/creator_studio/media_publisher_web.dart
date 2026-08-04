// ignore_for_file: avoid_dynamic_calls, avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:math' as math;
import 'dart:ui_web' as ui_web;

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
  CreatorMediaController()
    : _viewType = 'creator-preview-${DateTime.now().microsecondsSinceEpoch}' {
    _video = html.VideoElement()
      ..autoplay = true
      ..muted = true
      ..controls = true
      ..style.width = '100%'
      ..style.height = '100%'
      ..style.objectFit = 'cover'
      ..style.borderRadius = '18px'
      ..setAttribute('playsinline', 'true');
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (_) => _video);
  }

  late final html.VideoElement _video;
  final String _viewType;
  html.MediaStream? _stream;
  html.MediaStream? _screenStream;
  html.RtcPeerConnection? _peer;
  String? _resourceUrl;
  String? _bearerToken;
  StreamSubscription<html.Event>? _connectionSubscription;
  StreamSubscription<html.Event>? _screenEndedSubscription;
  js.JsObject? _audioContext;
  List<Object?> _audioNodes = const <Object?>[];
  Timer? _meterTimer;
  final ValueNotifier<double> _audioLevel = ValueNotifier<double>(0);
  final ValueNotifier<String> _connectionState = ValueNotifier<String>('idle');
  html.MediaRecorder? _recorder;
  final List<html.Blob> _recordedChunks = <html.Blob>[];
  html.MediaRecorder? _captionRecorder;
  html.MediaStream? _captionStream;
  final List<html.Blob> _captionChunks = <html.Blob>[];
  bool _audioEnabled = true;
  bool _videoEnabled = true;
  bool _screenSharing = false;
  bool _disposed = false;

  bool get supported => html.window.navigator.mediaDevices != null;

  bool get screenShareSupported {
    final mediaDevices = html.window.navigator.mediaDevices;
    return mediaDevices != null &&
        js.JsObject.fromBrowserObject(
          mediaDevices,
        ).hasProperty('getDisplayMedia');
  }

  bool get captionCaptureSupported => supported;

  ValueListenable<double> get audioLevel => _audioLevel;

  ValueListenable<String> get connectionState => _connectionState;

  bool get hasAudioTrack => _stream?.getAudioTracks().isNotEmpty ?? false;

  bool get hasVideoTrack => _stream?.getVideoTracks().isNotEmpty ?? false;

  bool get audioEnabled => _audioEnabled;

  bool get videoEnabled => _videoEnabled;

  bool get screenSharing => _screenSharing;

  Future<List<CreatorMediaDevice>> devices() async {
    final mediaDevices = html.window.navigator.mediaDevices;
    if (mediaDevices == null) {
      return const <CreatorMediaDevice>[];
    }
    final values = (await mediaDevices.enumerateDevices())
        .cast<html.MediaDeviceInfo>();
    return values
        .where((device) {
          final kind = device.kind ?? '';
          return kind == 'audioinput' || kind == 'videoinput';
        })
        .map((device) {
          final kind = device.kind ?? '';
          final label = device.label ?? '';
          return CreatorMediaDevice(
            id: device.deviceId ?? '',
            label: label.isNotEmpty ? label : _fallbackLabel(kind),
            kind: kind,
          );
        })
        .toList(growable: false);
  }

  Widget preview() => AspectRatio(
    aspectRatio: 16 / 9,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: HtmlElementView(viewType: _viewType),
    ),
  );

  Future<void> startPreview({
    String? audioDeviceId,
    String? videoDeviceId,
  }) async {
    final mediaDevices = html.window.navigator.mediaDevices;
    if (mediaDevices == null) {
      throw UnsupportedError('Browser media devices are unavailable.');
    }
    await stop();
    final constraints = <String, Object>{
      'audio': _deviceConstraint(audioDeviceId),
      'video': _deviceConstraint(videoDeviceId),
    };
    _stream = await mediaDevices.getUserMedia(constraints);
    for (final track in _stream!.getAudioTracks()) {
      track.enabled = _audioEnabled;
    }
    for (final track in _stream!.getVideoTracks()) {
      track.enabled = _videoEnabled;
    }
    _video.srcObject = _stream;
    await _video.play();
    _startAudioMeter(_stream!);
  }

  Future<void> setAudioEnabled(bool enabled) async {
    _audioEnabled = enabled;
    for (final track in _stream?.getAudioTracks() ?? const []) {
      track.enabled = enabled;
    }
    if (!enabled) {
      _audioLevel.value = 0;
    }
  }

  Future<void> setVideoEnabled(bool enabled) async {
    _videoEnabled = enabled;
    for (final track in _stream?.getVideoTracks() ?? const []) {
      track.enabled = enabled;
    }
  }

  Future<void> setScreenShareEnabled(bool enabled) async {
    if (enabled == _screenSharing) {
      return;
    }
    if (enabled) {
      await _startScreenShare();
    } else {
      await _stopScreenShare();
    }
  }

  Future<String> publishWhip(JsonObject credentials) async {
    _connectionState.value = 'connecting';
    try {
      final stream = _stream;
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

      await _teardownWhipResource();
      await _connectionSubscription?.cancel();
      _peer?.close();
      final peer = html.RtcPeerConnection(<String, Object>{
        'iceServers': _iceServers(credentials),
      });
      _peer = peer;
      _connectionSubscription = peer.onConnectionStateChange.listen((_) {
        if (_peer != peer || _disposed) {
          return;
        }
        switch (peer.connectionState) {
          case 'connected':
            _connectionState.value = 'connected';
          case 'disconnected':
          case 'failed':
          case 'closed':
            _connectionState.value = 'failed';
        }
      });
      for (final track in stream.getAudioTracks()) {
        peer.addTrack(track, stream);
      }
      final videoStream = _screenStream ?? stream;
      for (final track in videoStream.getVideoTracks()) {
        peer.addTrack(track, videoStream);
      }

      final offer =
          await peer.createOffer(<String, Object>{
                'offerToReceiveAudio': false,
                'offerToReceiveVideo': false,
              })
              as Map<dynamic, dynamic>;
      await peer.setLocalDescription(offer);
      await _waitForIceGathering(peer);

      final local = peer.localDescription;
      final sdp = local == null ? offer['sdp'] : local.sdp;
      final response = await html.HttpRequest.request(
        uri.toString(),
        method: 'POST',
        sendData: sdp,
        requestHeaders: <String, String>{
          'Content-Type': 'application/sdp',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.status == null ||
          response.status! < 200 ||
          response.status! >= 300) {
        throw StateError(
          'MediaMTX WHIP rejected publish with HTTP ${response.status}.',
        );
      }
      final answer = response.responseText;
      if (answer == null || answer.trim().isEmpty) {
        throw StateError('MediaMTX WHIP did not return an SDP answer.');
      }
      final location = response.getResponseHeader('Location');
      if (location != null && location.isNotEmpty) {
        _resourceUrl = uri.resolve(location).toString();
      }
      _bearerToken = token;
      await peer.setRemoteDescription(<String, String>{
        'type': 'answer',
        'sdp': answer,
      });
      _connectionState.value = 'connected';
      return 'Browser WHIP publish connected.';
    } on Object {
      await _connectionSubscription?.cancel();
      _connectionSubscription = null;
      final peer = _peer;
      _peer = null;
      peer?.close();
      await _teardownWhipResource();
      if (!_disposed) {
        _connectionState.value = 'failed';
      }
      rethrow;
    }
  }

  Future<String> startBrowserRecording() async {
    final stream = _stream;
    if (stream == null) {
      throw StateError('Start preview before recording.');
    }
    if (_recorder?.state == 'recording') {
      return 'Browser recording is already running.';
    }
    final recorder = html.MediaRecorder(stream);
    _recordedChunks.clear();
    recorder.addEventListener('dataavailable', (html.Event event) {
      final data = (event as dynamic).data as html.Blob?;
      if (data != null && data.size > 0) {
        _recordedChunks.add(data);
      }
    });
    recorder.start();
    _recorder = recorder;
    return 'Browser recording started.';
  }

  Future<String> stopBrowserRecording() async {
    final recorder = _recorder;
    if (recorder == null || recorder.state != 'recording') {
      return 'Browser recording is not running.';
    }
    final stopped = Completer<void>();
    recorder.addEventListener('stop', (html.Event _) {
      if (!stopped.isCompleted) {
        stopped.complete();
      }
    });
    recorder.stop();
    await stopped.future.timeout(const Duration(seconds: 2), onTimeout: () {});
    final recorderMimeType = recorder.mimeType;
    final mimeType = recorderMimeType == null || recorderMimeType.isEmpty
        ? 'video/webm'
        : recorderMimeType;
    final blob = html.Blob(_recordedChunks, mimeType);
    final url = html.Url.createObjectUrlFromBlob(blob);
    _recordedChunks.clear();
    _recorder = null;
    return 'Browser recording stopped. Preview file: $url';
  }

  Future<void> startCaptionCapture() async {
    if (_captionRecorder?.state == 'recording') {
      return;
    }
    final stream = _stream;
    late final html.MediaStream audioStream;
    if (stream != null && stream.getAudioTracks().isNotEmpty) {
      audioStream = html.MediaStream(stream.getAudioTracks());
    } else {
      final mediaDevices = html.window.navigator.mediaDevices;
      if (mediaDevices == null) {
        throw UnsupportedError('Browser microphone capture is unavailable.');
      }
      audioStream = await mediaDevices.getUserMedia(<String, Object>{
        'audio': true,
        'video': false,
      });
      if (audioStream.getAudioTracks().isEmpty) {
        for (final track in audioStream.getTracks()) {
          track.stop();
        }
        throw StateError('No microphone track was available.');
      }
      _captionStream = audioStream;
    }
    final preferredType =
        html.MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : html.MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : null;
    try {
      final recorder = preferredType == null
          ? html.MediaRecorder(audioStream)
          : html.MediaRecorder(audioStream, <String, Object>{
              'mimeType': preferredType,
            });
      _captionChunks.clear();
      recorder.addEventListener('dataavailable', (html.Event event) {
        final data = (event as dynamic).data as html.Blob?;
        if (data != null && data.size > 0) {
          _captionChunks.add(data);
        }
      });
      recorder.start();
      _captionRecorder = recorder;
    } on Object {
      _disposeCaptionStream();
      rethrow;
    }
  }

  Future<CapturedMediaChunk> stopCaptionCapture() async {
    final recorder = _captionRecorder;
    if (recorder == null || recorder.state != 'recording') {
      throw StateError('No caption clip is currently recording.');
    }
    final stopped = Completer<void>();
    recorder.addEventListener('stop', (html.Event _) {
      if (!stopped.isCompleted) {
        stopped.complete();
      }
    });
    recorder.stop();
    try {
      await stopped.future.timeout(const Duration(seconds: 2));
      final rawType = recorder.mimeType;
      final contentType = rawType == null || rawType.isEmpty
          ? 'audio/webm'
          : rawType.split(';').first;
      final blob = html.Blob(_captionChunks, contentType);
      final reader = html.FileReader()..readAsArrayBuffer(blob);
      await reader.onLoadEnd.first;
      if (reader.error != null) {
        throw StateError(
          'The browser could not read the recorded caption clip.',
        );
      }
      final result = reader.result;
      if (result is! Uint8List) {
        throw StateError(
          'The browser could not read the recorded caption clip.',
        );
      }
      final bytes = result;
      if (bytes.isEmpty) {
        throw StateError('The recorded caption clip was empty.');
      }
      final extension = contentType == 'audio/mp4' ? 'm4a' : 'webm';
      return CapturedMediaChunk(
        bytes: bytes,
        filename: 'caption_${DateTime.now().millisecondsSinceEpoch}.$extension',
        contentType: contentType,
      );
    } finally {
      _captionChunks.clear();
      _captionRecorder = null;
      _disposeCaptionStream();
    }
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
      await html.HttpRequest.request(
        resource,
        method: 'DELETE',
        requestHeaders: <String, String>{
          if (token != null && token.isNotEmpty)
            'Authorization': 'Bearer $token',
        },
      );
    } on Object {
      // Best-effort WHIP resource teardown.
    }
  }

  Future<void> stop() async {
    await _teardownWhipResource();
    await _connectionSubscription?.cancel();
    _connectionSubscription = null;
    _stopAudioMeter();
    if (_recorder?.state == 'recording') {
      _recorder?.stop();
    }
    _recorder = null;
    _recordedChunks.clear();
    if (_captionRecorder?.state == 'recording') {
      _captionRecorder?.stop();
    }
    _captionRecorder = null;
    _captionChunks.clear();
    _disposeCaptionStream();
    _peer?.close();
    _peer = null;
    await _disposeScreenStream();
    final stream = _stream;
    _stream = null;
    if (stream != null) {
      for (final track in stream.getTracks()) {
        track.stop();
      }
    }
    _video.srcObject = null;
    if (!_disposed) {
      _connectionState.value = 'idle';
    }
  }

  void _disposeCaptionStream() {
    final stream = _captionStream;
    _captionStream = null;
    if (stream != null) {
      for (final track in stream.getTracks()) {
        track.stop();
      }
    }
  }

  void dispose() {
    _disposed = true;
    unawaited(stop());
    _audioLevel.dispose();
    _connectionState.dispose();
  }

  Future<void> _startScreenShare() async {
    final mediaDevices = html.window.navigator.mediaDevices;
    if (mediaDevices == null || !screenShareSupported) {
      throw UnsupportedError('Browser screen capture is unavailable.');
    }
    if (_stream == null) {
      throw StateError('Start preview before sharing your screen.');
    }
    final mediaDevicesJs = js.JsObject.fromBrowserObject(mediaDevices);
    final promise = mediaDevicesJs.callMethod('getDisplayMedia', <Object>[
      js.JsObject.jsify(<String, Object>{'audio': false, 'video': true}),
    ]);
    final value = await _jsPromiseValue(promise);
    if (value is! html.MediaStream) {
      throw StateError('Screen capture did not return a media stream.');
    }
    final screenStream = value;
    final videoTracks = screenStream.getVideoTracks();
    if (videoTracks.isEmpty) {
      for (final track in screenStream.getTracks()) {
        track.stop();
      }
      throw StateError('Screen capture did not provide a video track.');
    }
    final screenTrack = videoTracks.first;
    try {
      await _replaceOutgoingVideo(screenTrack);
      _screenStream = screenStream;
      _screenSharing = true;
      _video.srcObject = screenStream;
      await _video.play();
      _screenEndedSubscription = screenTrack.onEnded.listen((_) {
        if (_screenSharing) {
          unawaited(_stopScreenShare());
        }
      });
    } on Object {
      for (final track in screenStream.getTracks()) {
        track.stop();
      }
      rethrow;
    }
  }

  Future<void> _stopScreenShare() async {
    final cameraTracks = _stream?.getVideoTracks() ?? const [];
    await _replaceOutgoingVideo(
      cameraTracks.isEmpty ? null : cameraTracks.first,
    );
    _screenSharing = false;
    _video.srcObject = _stream;
    if (_stream != null) {
      await _video.play();
    }
    await _disposeScreenStream();
  }

  Future<void> _disposeScreenStream() async {
    await _screenEndedSubscription?.cancel();
    _screenEndedSubscription = null;
    final screenStream = _screenStream;
    _screenStream = null;
    _screenSharing = false;
    if (screenStream != null) {
      for (final track in screenStream.getTracks()) {
        track.stop();
      }
    }
  }

  Future<void> _replaceOutgoingVideo(html.MediaStreamTrack? track) async {
    final peer = _peer;
    if (peer == null) {
      return;
    }
    final senders = peer.getSenders();
    html.RtcRtpSender? videoSender;
    for (final sender in senders) {
      if (sender.track?.kind == 'video') {
        videoSender = sender;
        break;
      }
    }
    if (videoSender == null) {
      return;
    }
    final senderJs = js.JsObject.fromBrowserObject(videoSender);
    final promise = senderJs.callMethod('replaceTrack', <Object?>[track]);
    await _jsPromiseValue(promise);
  }

  void _startAudioMeter(html.MediaStream stream) {
    _stopAudioMeter();
    if (stream.getAudioTracks().isEmpty) {
      return;
    }
    try {
      final constructor =
          js.context['AudioContext'] ?? js.context['webkitAudioContext'];
      if (constructor == null) {
        return;
      }
      final context = js.JsObject(constructor as js.JsFunction);
      final analyser = context.callMethod('createAnalyser') as js.JsObject
        ..['fftSize'] = 256
        ..['smoothingTimeConstant'] = 0.65;
      final source =
          context.callMethod('createMediaStreamSource', <Object>[stream])
              as js.JsObject;
      source.callMethod('connect', <Object>[analyser]);
      _audioContext = context;
      _audioNodes = <Object?>[source, analyser];
      final buffer = Uint8List((analyser['fftSize'] as int?) ?? 256);
      _meterTimer = Timer.periodic(const Duration(milliseconds: 120), (_) {
        analyser.callMethod('getByteTimeDomainData', <Object>[buffer]);
        var sum = 0.0;
        for (final value in buffer) {
          final centered = (value - 128) / 128;
          sum += centered * centered;
        }
        _audioLevel.value = math
            .sqrt(sum / buffer.length)
            .clamp(0, 1)
            .toDouble();
      });
    } on Object {
      _audioLevel.value = 0;
    }
  }

  void _stopAudioMeter() {
    _meterTimer?.cancel();
    _meterTimer = null;
    if (_audioNodes.isNotEmpty) {
      _audioNodes = const <Object?>[];
    }
    _audioContext?.callMethod('close');
    _audioContext = null;
    _audioLevel.value = 0;
  }
}

Object _deviceConstraint(String? deviceId) {
  if (deviceId == null || deviceId.isEmpty) {
    return true;
  }
  return <String, Object>{
    'deviceId': <String, String>{'exact': deviceId},
  };
}

String _fallbackLabel(String? kind) => switch (kind) {
  'audioinput' => 'Microphone',
  'videoinput' => 'Camera',
  _ => 'Media device',
};

List<Map<String, Object>> _iceServers(JsonObject credentials) {
  final servers = credentials['ice_servers'];
  if (servers is! List) {
    return const <Map<String, Object>>[];
  }
  return servers
      .whereType<JsonObject>()
      .map((server) {
        final urls = server['urls'];
        final values = urls is List
            ? urls.whereType<String>().toList()
            : <String>[];
        return <String, Object>{
          'urls': values,
          if (server['username'] is String)
            'username': server['username'] as String,
          if (server['credential'] is String)
            'credential': server['credential'] as String,
        };
      })
      .toList(growable: false);
}

Future<void> _waitForIceGathering(html.RtcPeerConnection peer) async {
  if (peer.iceGatheringState == 'complete') {
    return;
  }
  await Future<void>.delayed(const Duration(seconds: 1));
}

Future<Object?> _jsPromiseValue(Object? promise) {
  if (promise == null) {
    return Future<Object?>.error(
      StateError('The browser media operation did not return a Promise.'),
    );
  }
  final completer = Completer<Object?>();
  final promiseJs = promise is js.JsObject
      ? promise
      : js.JsObject.fromBrowserObject(promise);
  promiseJs.callMethod('then', <Object>[
    (Object? value) {
      if (!completer.isCompleted) {
        completer.complete(value);
      }
    },
    (Object? error) {
      if (!completer.isCompleted) {
        completer.completeError(
          StateError(error?.toString() ?? 'Browser media operation failed.'),
        );
      }
    },
  ]);
  return completer.future;
}
