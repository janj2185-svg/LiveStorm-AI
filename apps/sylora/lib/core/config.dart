import 'package:flutter/foundation.dart';

@immutable
final class AppConfig {
  AppConfig({required Uri apiBaseUri, bool production = false})
    : apiBaseUri = _validate(apiBaseUri, production);

  factory AppConfig.fromEnvironment({bool? production}) {
    const raw = String.fromEnvironment(
      'SYLORA_API_BASE_URL',
      defaultValue: 'http://localhost:8000',
    );
    return AppConfig(
      apiBaseUri: Uri.parse(raw),
      production: production ?? kReleaseMode,
    );
  }

  final Uri apiBaseUri;

  Uri get apiV1Uri => apiBaseUri.resolve('/v1/');

  Uri endpoint(String path, [Map<String, dynamic>? query]) {
    final normalized = path.startsWith('/') ? path.substring(1) : path;
    final resolved = apiV1Uri.resolve(normalized);
    if (query == null || query.isEmpty) {
      return resolved;
    }
    return resolved.replace(
      queryParameters: {
        for (final entry in query.entries)
          if (entry.value != null) entry.key: entry.value.toString(),
      },
    );
  }

  Uri websocket(String path, [Map<String, dynamic>? query]) {
    final uri = endpoint(path, query);
    return uri.replace(scheme: uri.scheme == 'https' ? 'wss' : 'ws');
  }

  static Uri _validate(Uri uri, bool production) {
    if (!uri.hasScheme ||
        !uri.hasAuthority ||
        !{'http', 'https'}.contains(uri.scheme) ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        (uri.path.isNotEmpty && uri.path != '/') ||
        uri.query.isNotEmpty ||
        uri.fragment.isNotEmpty) {
      throw FormatException(
        'SYLORA_API_BASE_URL must be an absolute credential-free HTTP(S) origin without a path, query, or fragment.',
        uri.toString(),
      );
    }
    if (production && uri.scheme != 'https') {
      throw const FormatException(
        'Production builds require an HTTPS SYLORA_API_BASE_URL.',
      );
    }
    return uri.replace(path: uri.path.replaceFirst(RegExp(r'/$'), ''));
  }
}
