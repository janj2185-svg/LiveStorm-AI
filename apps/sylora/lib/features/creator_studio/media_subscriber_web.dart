// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api.dart';

/// Browser WHEP subscriber for one remote contribution path.
final class MediaContributionSubscriber {
  MediaContributionSubscriber()
    : _viewType = 'whep-preview-${DateTime.now().microsecondsSinceEpoch}' {
    _video = html.VideoElement()
      ..autoplay = true
      ..muted = true
      ..controls = false
      ..style.width = '100%'
      ..style.height = '100%'
      ..style.objectFit = 'cover'
      ..setAttribute('playsinline', 'true');
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (_) => _video);
  }

  late final html.VideoElement _video;
  final String _viewType;
  html.RtcPeerConnection? _peer;
  String? _resourceUrl;
  String? _bearerToken;
  StreamSubscription<html.Event>? _connectionSubscription;
  final ValueNotifier<String> _connectionState = ValueNotifier<String>('idle');
  bool _disposed = false;

  bool get supported => html.window.navigator.mediaDevices != null;

  ValueListenable<String> get connectionState => _connectionState;

  Widget preview() => AspectRatio(
    aspectRatio: 16 / 9,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: HtmlElementView(viewType: _viewType),
    ),
  );

  Future<String> subscribeWhep(JsonObject credentials) async {
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
    final uri = Uri.tryParse(whepUrl);
    if (uri == null ||
        !uri.hasAuthority ||
        (uri.scheme != 'https' && uri.scheme != 'http')) {
      throw StateError('WHEP URL is invalid.');
    }

    await stop();
    _connectionState.value = 'connecting';
    try {
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
      peer.onTrack.listen((html.RtcTrackEvent event) {
        final streams = event.streams;
        if (streams != null && streams.isNotEmpty) {
          _video.srcObject = streams.first;
          unawaited(_video.play());
        }
      });

      final offer =
          await peer.createOffer(<String, Object>{
                'offerToReceiveAudio': true,
                'offerToReceiveVideo': true,
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
          'MediaMTX WHEP rejected subscribe with HTTP ${response.status}.',
        );
      }
      final location = response.getResponseHeader('Location');
      if (location != null && location.isNotEmpty) {
        _resourceUrl = uri.resolve(location).toString();
      }
      _bearerToken = token;
      final answer = response.responseText;
      if (answer == null || answer.trim().isEmpty) {
        throw StateError('MediaMTX WHEP did not return an SDP answer.');
      }
      await peer.setRemoteDescription(<String, String>{
        'type': 'answer',
        'sdp': answer,
      });
      _connectionState.value = 'connected';
      return 'WHEP contribution subscribed.';
    } on Object {
      await _connectionSubscription?.cancel();
      _connectionSubscription = null;
      final peer = _peer;
      _peer = null;
      peer?.close();
      if (!_disposed) {
        _connectionState.value = 'failed';
      }
      rethrow;
    }
  }

  Future<void> stop() async {
    await _connectionSubscription?.cancel();
    _connectionSubscription = null;
    final resource = _resourceUrl;
    _resourceUrl = null;
    if (resource != null) {
      try {
        await html.HttpRequest.request(
          resource,
          method: 'DELETE',
          requestHeaders: <String, String>{
            if (_bearerToken != null && _bearerToken!.isNotEmpty)
              'Authorization': 'Bearer $_bearerToken',
          },
        );
      } on Object {
        // Best-effort WHIP/WHEP resource teardown.
      }
      _bearerToken = null;
    }
    _peer?.close();
    _peer = null;
    _video.srcObject = null;
    if (!_disposed) {
      _connectionState.value = 'idle';
    }
  }

  void dispose() {
    _disposed = true;
    unawaited(stop());
    _connectionState.dispose();
  }

  List<Object> _iceServers(JsonObject credentials) {
    final raw = credentials['ice_servers'];
    if (raw is! List) {
      return const <Object>[];
    }
    return raw
        .whereType<Map<Object?, Object?>>()
        .map((server) {
          final urls = server['urls'];
          return <String, Object?>{
            'urls': urls is List ? urls : <Object?>[urls],
            if (server['username'] != null) 'username': server['username'],
            if (server['credential'] != null)
              'credential': server['credential'],
          };
        })
        .toList(growable: false);
  }

  Future<void> _waitForIceGathering(html.RtcPeerConnection peer) async {
    for (var attempt = 0; attempt < 30; attempt += 1) {
      if (peer.iceGatheringState == 'complete') {
        return;
      }
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
  }
}
