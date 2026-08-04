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
  String? _bearerToken;
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
      throw StateError(
        'WHEP credentials are unavailable for this contribution.',
      );
    }

    await stop();
    _connectionState.value = 'connecting';
    try {
      final peer = await createPeerConnection(<String, dynamic>{
        'iceServers': _iceServers(credentials),
        'sdpSemantics': 'unified-plan',
      });
      _peer = peer;
      peer.onConnectionState = (state) {
        if (_peer != peer || _disposed) {
          return;
        }
        switch (state) {
          case RTCPeerConnectionState.RTCPeerConnectionStateConnected:
            _connectionState.value = 'connected';
          case RTCPeerConnectionState.RTCPeerConnectionStateDisconnected:
          case RTCPeerConnectionState.RTCPeerConnectionStateFailed:
          case RTCPeerConnectionState.RTCPeerConnectionStateClosed:
            _connectionState.value = 'failed';
          case RTCPeerConnectionState.RTCPeerConnectionStateNew:
          case RTCPeerConnectionState.RTCPeerConnectionStateConnecting:
            break;
        }
      };
      peer.onTrack = (RTCTrackEvent event) {
        if (event.streams.isNotEmpty) {
          _renderer.srcObject = event.streams.first;
        }
      };
      await peer.addTransceiver(
        kind: RTCRtpMediaType.RTCRtpMediaTypeAudio,
        init: RTCRtpTransceiverInit(direction: TransceiverDirection.RecvOnly),
      );
      await peer.addTransceiver(
        kind: RTCRtpMediaType.RTCRtpMediaTypeVideo,
        init: RTCRtpTransceiverInit(direction: TransceiverDirection.RecvOnly),
      );

      final offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await _waitForIceGathering(peer);
      final local = await peer.getLocalDescription();
      final sdp = local?.sdp ?? offer.sdp;
      if (sdp == null || sdp.isEmpty) {
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
        throw StateError(
          'MediaMTX WHEP rejected subscribe with HTTP ${response.statusCode}.',
        );
      }
      final location = response.headers.value('location');
      if (location != null && location.isNotEmpty) {
        _resourceUrl = Uri.parse(whepUrl).resolve(location).toString();
      }
      _bearerToken = token;
      final answer = response.data;
      if (answer == null || answer.trim().isEmpty) {
        throw StateError('MediaMTX WHEP did not return an SDP answer.');
      }
      await peer.setRemoteDescription(RTCSessionDescription(answer, 'answer'));
      _connectionState.value = 'connected';
      return 'WHEP contribution subscribed.';
    } on Object {
      final peer = _peer;
      _peer = null;
      if (peer != null) {
        peer.onConnectionState = null;
        await peer.close();
      }
      _renderer.srcObject = null;
      if (!_disposed) {
        _connectionState.value = 'failed';
      }
      rethrow;
    }
  }

  Future<void> stop() async {
    final resource = _resourceUrl;
    _resourceUrl = null;
    if (resource != null) {
      try {
        await _client.delete<void>(
          resource,
          options: Options(
            headers: <String, dynamic>{
              if (_bearerToken != null && _bearerToken!.isNotEmpty)
                'Authorization': 'Bearer $_bearerToken',
            },
            validateStatus: (_) => true,
          ),
        );
      } on Object {
        // Best-effort teardown.
      }
      _bearerToken = null;
    }
    final peer = _peer;
    _peer = null;
    if (peer != null) {
      peer.onConnectionState = null;
      await peer.close();
    }
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
            if (server['credential'] != null)
              'credential': server['credential'],
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
