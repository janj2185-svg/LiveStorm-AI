// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

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

  bool get supported => html.window.navigator.mediaDevices != null;

  Future<List<CreatorMediaDevice>> devices() async {
    final mediaDevices = html.window.navigator.mediaDevices;
    if (mediaDevices == null) {
      return const <CreatorMediaDevice>[];
    }
    final values = (await mediaDevices.enumerateDevices()).cast<html.MediaDeviceInfo>();
    return values
        .where((device) {
          final kind = device.kind ?? '';
          return kind == 'audioinput' || kind == 'videoinput';
        })
        .map(
          (device) {
            final kind = device.kind ?? '';
            final label = device.label ?? '';
            return CreatorMediaDevice(
              id: device.deviceId ?? '',
              label: label.isNotEmpty ? label : _fallbackLabel(kind),
              kind: kind,
            );
          },
        )
        .toList(growable: false);
  }

  Widget preview() => AspectRatio(
    aspectRatio: 16 / 9,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: HtmlElementView(viewType: _viewType),
    ),
  );

  Future<void> startPreview({String? audioDeviceId, String? videoDeviceId}) async {
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

    final offer = await _peer!.createOffer(<String, Object>{
      'offerToReceiveAudio': false,
      'offerToReceiveVideo': false,
    }) as Map<dynamic, dynamic>;
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
    if (response.status == null || response.status! < 200 || response.status! >= 300) {
      throw StateError('MediaMTX WHIP rejected publish with HTTP ${response.status}.');
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

  Future<void> stop() async {
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
  return servers.whereType<JsonObject>().map((server) {
    final urls = server['urls'];
    final values = urls is List ? urls.whereType<String>().toList() : <String>[];
    return <String, Object>{
      'urls': values,
      if (server['username'] is String) 'username': server['username'] as String,
      if (server['credential'] is String) 'credential': server['credential'] as String,
    };
  }).toList(growable: false);
}

Future<void> _waitForIceGathering(html.RtcPeerConnection peer) async {
  if (peer.iceGatheringState == 'complete') {
    return;
  }
  await Future<void>.delayed(const Duration(seconds: 1));
}
