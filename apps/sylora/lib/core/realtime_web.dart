import 'package:web_socket_channel/web_socket_channel.dart';

const bool realtimeSupported = false;
const String realtimeUnsupportedReason =
    'Realtime sockets are unavailable in the browser because the API requires an Authorization header, which the browser WebSocket API cannot set. HTTP history and refresh remain available.';

WebSocketChannel openAuthorizedSocket(Uri uri, String accessToken) =>
    throw UnsupportedError(realtimeUnsupportedReason);
