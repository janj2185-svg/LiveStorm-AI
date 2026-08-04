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
  final ValueNotifier<String> _connectionState = ValueNotifier<String>('idle');

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
      throw StateError('WHEP credentials are unavailable for this contribution.');
    }
    final uri = Uri.tryParse(whepUrl);
    if (uri == null ||
        !uri.hasAuthority ||
        (uri.scheme != 'https' && uri.scheme != 'http')) {
      throw StateError('WHEP URL is invalid.');
    }

    await stop();
    _connectionState.value = 'connecting';
    _peer = html.RtcPeerConnection(<String, Object>{
      'iceServers': _iceServers(credentials),
    });
    _peer!.onTrack.listen((html.RtcTrackEvent event) {
      final streams = event.streams;
      if (streams != null && streams.isNotEmpty) {
        _video.srcObject = streams.first;
        unawaited(_video.play());
      }
    });

    final offer =
        await _peer!.createOffer(<String, Object>{
              'offerToReceiveAudio': true,
              'offerToReceiveVideo': true,
            })
            as Map<dynamic, dynamic>;
    await _peer!.setLocalDescription(offer);
    await _waitForIceGathering(_peer!);

    final local = _peer!.localDescription;
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
      _connectionState.value = 'failed';
      throw StateError(
        'MediaMTX WHEP rejected subscribe with HTTP ${response.status}.',
      );
    }
    final location = response.getResponseHeader('Location');
    if (location != null && location.isNotEmpty) {
      _resourceUrl = uri.resolve(location).toString();
    }
    final answer = response.responseText;
    if (answer == null || answer.trim().isEmpty) {
      _connectionState.value = 'failed';
      throw StateError('MediaMTX WHEP did not return an SDP answer.');
    }
    await _peer!.setRemoteDescription(<String, String>{
      'type': 'answer',
      'sdp': answer,
    });
    _connectionState.value = 'connected';
    return 'WHEP contribution subscribed.';
  }

  Future<void> stop() async {
    final resource = _resourceUrl;
    _resourceUrl = null;
    if (resource != null) {
      try {
        await html.HttpRequest.request(resource, method: 'DELETE');
      } on Object {
        // Best-effort WHIP/WHEP resource teardown.
      }
    }
    _peer?.close();
    _peer = null;
    _video.srcObject = null;
    _connectionState.value = 'idle';
  }

  void dispose() {
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
            if (server['credential'] != null) 'credential': server['credential'],
          };
        })
        .toList(growable: false);
  }

  Future<void> _waitForIceGathering(html.RtcPeerConnection peer) async {
    if (peer.iceGatheringState == 'complete') {
      return;
    }
    final done = Completer<void>();
    late StreamSubscription<html.Event> subscription;
    subscription = peer.onIceGatheringStateChange.listen((_) {
      if (peer.iceGatheringState == 'complete' && !done.isCompleted) {
        done.complete();
      }
    });
    try {
      await done.future.timeout(const Duration(seconds: 3), onTimeout: () {});
    } finally {
      await subscription.cancel();
    }
  }
}
