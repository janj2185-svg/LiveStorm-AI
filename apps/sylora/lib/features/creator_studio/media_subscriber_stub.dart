import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/api.dart';

/// WHEP contribution subscriber for platforms without WebRTC support.
final class MediaContributionSubscriber {
  bool get supported => false;

  ValueListenable<String> get connectionState =>
      const AlwaysStoppedAnimation<String>('unsupported');

  Widget preview() => const AspectRatio(
    aspectRatio: 16 / 9,
    child: ColoredBox(
      color: Colors.black26,
      child: Center(child: Icon(Icons.videocam_off_outlined)),
    ),
  );

  Future<String> subscribeWhep(JsonObject credentials) async {
    throw UnsupportedError('WHEP subscribe is unavailable on this platform.');
  }

  Future<void> stop() async {}

  void dispose() {}
}
