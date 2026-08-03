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
  html.RtcPeerConnection? _peer;
  js.JsObject? _audioContext;
  List<Object?> _audioNodes = const <Object?>[];
  Timer? _meterTimer;
  final ValueNotifier<double> _audioLevel = ValueNotifier<double>(0);
  html.MediaRecorder? _recorder;
  final List<html.Blob> _recordedChunks = <html.Blob>[];

  bool get supported => html.window.navigator.mediaDevices != null;

  ValueListenable<double> get audioLevel => _audioLevel;

  bool get hasAudioTrack => _stream?.getAudioTracks().isNotEmpty ?? false;

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
    _video.srcObject = _stream;
    await _video.play();
    _startAudioMeter(_stream!);
  }

  Future<String> publishWhip(JsonObject credentials) async {
    final stream = _stream;
    if (stream == null) {
      throw StateError('Start preview before publishing.');
    }
    final whipUrl = optionalString(credentials, 'whip_url');
    final token = optionalString(credentials, 'bearer_token');
    if (whipUrl == null || token == null) {
      throw StateError('WHIP credentials are unavailable for this session.');
    }

    _peer?.close();
    _peer = html.RtcPeerConnection(<String, Object>{
      'iceServers': _iceServers(credentials),
    });
    for (final track in stream.getTracks()) {
      _peer!.addTrack(track, stream);
    }

    final offer =
        await _peer!.createOffer(<String, Object>{
              'offerToReceiveAudio': false,
              'offerToReceiveVideo': false,
            })
            as Map<dynamic, dynamic>;
    await _peer!.setLocalDescription(offer);
    await _waitForIceGathering(_peer!);

    final local = _peer!.localDescription;
    final sdp = local == null ? offer['sdp'] : local.sdp;
    final response = await html.HttpRequest.request(
      whipUrl,
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
    await _peer!.setRemoteDescription(<String, String>{
      'type': 'answer',
      'sdp': answer,
    });
    return 'Browser WHIP publish connected.';
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

  Future<void> stop() async {
    _stopAudioMeter();
    if (_recorder?.state == 'recording') {
      _recorder?.stop();
    }
    _recorder = null;
    _recordedChunks.clear();
    _peer?.close();
    _peer = null;
    final stream = _stream;
    _stream = null;
    if (stream != null) {
      for (final track in stream.getTracks()) {
        track.stop();
      }
    }
    _video.srcObject = null;
  }

  void dispose() {
    unawaited(stop());
    _audioLevel.dispose();
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
