import 'package:web_socket_channel/web_socket_channel.dart';

/// Browser WebSockets cannot set Authorization headers. Use one-time tickets
/// minted over HTTPS instead (`?ticket=` query parameter).
const bool realtimeSupported = true;
const String? realtimeUnsupportedReason = null;

WebSocketChannel openAuthorizedSocket(Uri uri, String accessToken) {
  // accessToken is ignored on web — callers must mint a ticket and put it on
  // the URI before connecting. Kept for signature parity with IO.
  return WebSocketChannel.connect(uri);
}

WebSocketChannel openTicketSocket(Uri uri) => WebSocketChannel.connect(uri);
