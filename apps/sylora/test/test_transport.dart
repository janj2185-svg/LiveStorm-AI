import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

typedef TransportHandler =
    FutureOr<ResponseBody> Function(RequestOptions options);

final class TestTransport implements HttpClientAdapter {
  TestTransport(this.handler);

  final TransportHandler handler;
  bool _closed = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (_closed) {
      throw StateError('TestTransport is closed.');
    }
    return handler(options);
  }

  @override
  void close({bool force = false}) {
    _closed = true;
  }
}

ResponseBody jsonResponse(Object body, int statusCode) =>
    ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: <String, List<String>>{
        Headers.contentTypeHeader: <String>['application/json'],
      },
    );
