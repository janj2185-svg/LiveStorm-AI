import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../../core/api.dart';

/// Native WHEP subscriber for one remote contribution path.
final class MediaContributionSubscriber {
  MediaContributionSubscriber({Dio? client}) : _client = client ?? Dio();

  final Dio _client;
  final RTCVideoRenderer _renderer = RTCVideoRenderer();
  Future<void>? _rendererReady;
  RTCPeerConnection? _peer;
  String? _resourceUrl;
  final ValueNotifier<String> _connectionState = ValueNotifier<String>('idle');
  bool _disposed = false;

  bool get supported => true;

  ValueListenable<String> get connectionState => _connectionState;

  Future<void> _ensureRenderer() {
    return _rendererReady ??= _renderer.initialize();
  }

  Widget preview() => AspectRatio(
    aspectRatio: 16 / 9,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: ColoredBox(
        color: Colors.black,
        child: RTCVideoView(
          _renderer,
          objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
          placeholderBuilder: (context) => const Center(
            child: Icon(Icons.videocam_off_outlined, color: Colors.white70),
          ),
        ),
      ),
    ),
  );

  Future<String> subscribeWhep(JsonObject credentials) async {
    await _ensureRenderer();
    final whepUrl =
        optionalString(credentials, 'whep_url') ??
        optionalString(credentials, 'whip_url')?.replaceFirst('/whip', '/whep');
    final token =
        optionalString(credentials, 'subscribe_bearer_token') ??
        optionalString(credentials, 'bearer_token');
    if (whepUrl == null ||
        whepUrl.trim().isEmpty ||
        token == null ||
        token.trim().isEmpty) {
      throw StateError('WHEP credentials are unavailable for this contribution.');
    }

    await stop();
    _connectionState.value = 'connecting';
    _peer = await createPeerConnection(<String, dynamic>{
      'iceServers': _iceServers(credentials),
      'sdpSemantics': 'unified-plan',
    });
    _peer!.onTrack = (RTCTrackEvent event) {
      if (event.streams.isNotEmpty) {
        _renderer.srcObject = event.streams.first;
      }
    };
    await _peer!.addTransceiver(
      kind: RTCRtpMediaType.RTCRtpMediaTypeAudio,
      init: RTCRtpTransceiverInit(direction: TransceiverDirection.RecvOnly),
    );
    await _peer!.addTransceiver(
      kind: RTCRtpMediaType.RTCRtpMediaTypeVideo,
      init: RTCRtpTransceiverInit(direction: TransceiverDirection.RecvOnly),
    );

    final offer = await _peer!.createOffer();
    await _peer!.setLocalDescription(offer);
    await _waitForIceGathering(_peer!);
    final local = await _peer!.getLocalDescription();
    final sdp = local?.sdp ?? offer.sdp;
    if (sdp == null || sdp.isEmpty) {
      _connectionState.value = 'failed';
      throw StateError('Failed to create WHEP offer SDP.');
    }

    final response = await _client.post<String>(
      whepUrl,
      data: sdp,
      options: Options(
        contentType: 'application/sdp',
        headers: <String, dynamic>{'Authorization': 'Bearer $token'},
        responseType: ResponseType.plain,
        validateStatus: (status) => status != null && status < 500,
      ),
    );
    if (response.statusCode == null ||
        response.statusCode! < 200 ||
        response.statusCode! >= 300) {
      _connectionState.value = 'failed';
      throw StateError(
        'MediaMTX WHEP rejected subscribe with HTTP ${response.statusCode}.',
      );
    }
    final location = response.headers.value('location');
    if (location != null && location.isNotEmpty) {
      _resourceUrl = Uri.parse(whepUrl).resolve(location).toString();
    }
    final answer = response.data;
    if (answer == null || answer.trim().isEmpty) {
      _connectionState.value = 'failed';
      throw StateError('MediaMTX WHEP did not return an SDP answer.');
    }
    await _peer!.setRemoteDescription(
      RTCSessionDescription(answer, 'answer'),
    );
    _connectionState.value = 'connected';
    return 'WHEP contribution subscribed.';
  }

  Future<void> stop() async {
    final resource = _resourceUrl;
    _resourceUrl = null;
    if (resource != null) {
      try {
        await _client.delete<void>(resource);
      } on Object {
        // Best-effort teardown.
      }
    }
    await _peer?.close();
    _peer = null;
    _renderer.srcObject = null;
    if (!_disposed) {
      _connectionState.value = 'idle';
    }
  }

  void dispose() {
    _disposed = true;
    unawaited(stop());
    unawaited(_renderer.dispose());
    _connectionState.dispose();
  }

  List<Map<String, dynamic>> _iceServers(JsonObject credentials) {
    final raw = credentials['ice_servers'];
    if (raw is! List) {
      return const <Map<String, dynamic>>[];
    }
    return raw
        .whereType<Map<Object?, Object?>>()
        .map((server) {
          final urls = server['urls'];
          return <String, dynamic>{
            'urls': urls is List ? urls : <Object?>[urls],
            if (server['username'] != null) 'username': server['username'],
            if (server['credential'] != null) 'credential': server['credential'],
          };
        })
        .toList(growable: false);
  }

  Future<void> _waitForIceGathering(RTCPeerConnection peer) async {
    if (peer.iceGatheringState ==
        RTCIceGatheringState.RTCIceGatheringStateComplete) {
      return;
    }
    final done = Completer<void>();
    peer.onIceGatheringState = (RTCIceGatheringState state) {
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete &&
          !done.isCompleted) {
        done.complete();
      }
    };
    await done.future.timeout(const Duration(seconds: 3), onTimeout: () {});
  }
}
