import 'package:web_socket_channel/web_socket_channel.dart';

/// Browser sockets cannot set Authorization headers. Messaging and live
/// realtime still require bearer auth and remain unavailable on web.
const bool realtimeSupported = false;
const String realtimeUnsupportedReason =
    'Realtime sockets for messaging and live sessions are unavailable in the '
    'browser because those endpoints require an Authorization header, which '
    'the browser WebSocket API cannot set. Gift realtime uses one-time tickets '
    'instead. HTTP history and refresh remain available.';

/// Gift events accept a one-time query ticket on `/ws/gifts`.
const bool giftRealtimeSupported = true;

WebSocketChannel openAuthorizedSocket(Uri uri, String accessToken) =>
    throw UnsupportedError(realtimeUnsupportedReason);

WebSocketChannel openTicketSocket(Uri uri) => WebSocketChannel.connect(uri);
