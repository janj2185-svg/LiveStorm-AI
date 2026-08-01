import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

const bool realtimeSupported = true;
const String? realtimeUnsupportedReason = null;
const bool giftRealtimeSupported = true;

WebSocketChannel openAuthorizedSocket(Uri uri, String accessToken) =>
    IOWebSocketChannel.connect(
      uri,
      headers: <String, dynamic>{'Authorization': 'Bearer $accessToken'},
      pingInterval: const Duration(seconds: 20),
      connectTimeout: const Duration(seconds: 12),
    );

WebSocketChannel openTicketSocket(Uri uri) =>
    IOWebSocketChannel.connect(
      uri,
      pingInterval: const Duration(seconds: 20),
      connectTimeout: const Duration(seconds: 12),
    );
