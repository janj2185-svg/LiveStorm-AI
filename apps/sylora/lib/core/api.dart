import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import 'config.dart';

typedef JsonObject = Map<String, dynamic>;

@immutable
final class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory AuthTokens.fromJson(JsonObject json) => AuthTokens(
    accessToken: requireString(json, 'access_token'),
    refreshToken: requireString(json, 'refresh_token'),
    expiresIn: requireInt(json, 'expires_in'),
  );

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
}

abstract interface class TokenStore {
  String? get accessToken;
  Future<String?> readRefreshToken();
  Future<void> save(AuthTokens tokens);
  Future<void> clear();
}

abstract interface class SecureRefreshVault {
  Future<void> write(String value);
  Future<String?> read();
  Future<void> delete();
}

final class LibSecretRefreshVault implements SecureRefreshVault {
  LibSecretRefreshVault({FlutterSecureStorage? secureStorage})
    : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const _refreshKey = 'sylora.refresh_token';
  final FlutterSecureStorage _secureStorage;

  @override
  Future<void> write(String value) =>
      _secureStorage.write(key: _refreshKey, value: value);

  @override
  Future<String?> read() => _secureStorage.read(key: _refreshKey);

  @override
  Future<void> delete() => _secureStorage.delete(key: _refreshKey);
}

final class PlatformTokenStore implements TokenStore {
  PlatformTokenStore({
    FlutterSecureStorage? secureStorage,
    SecureRefreshVault? refreshVault,
  }) : _refreshVault =
           refreshVault ?? LibSecretRefreshVault(secureStorage: secureStorage);

  final SecureRefreshVault _refreshVault;
  String? _accessToken;
  String? _memoryRefreshToken;
  bool _preferMemoryRefresh = false;

  @override
  String? get accessToken => _accessToken;

  @override
  Future<String?> readRefreshToken() async {
    if (kIsWeb || _preferMemoryRefresh) {
      return _memoryRefreshToken;
    }
    try {
      return await _refreshVault.read() ?? _memoryRefreshToken;
    } on Object {
      // Locked/unavailable OS keyrings must not strand an otherwise valid
      // in-memory session (common in CI / headless Linux desktops).
      return _memoryRefreshToken;
    }
  }

  @override
  Future<void> save(AuthTokens tokens) async {
    // Always keep the access token in process memory first so a subsequent
    // authenticated call can proceed even if durable storage fails.
    _accessToken = tokens.accessToken;
    _memoryRefreshToken = tokens.refreshToken;
    if (kIsWeb) {
      _preferMemoryRefresh = true;
      return;
    }
    try {
      await _refreshVault.write(tokens.refreshToken);
      _preferMemoryRefresh = false;
    } on Object {
      _preferMemoryRefresh = true;
    }
  }

  @override
  Future<void> clear() async {
    _accessToken = null;
    _memoryRefreshToken = null;
    _preferMemoryRefresh = false;
    if (kIsWeb) {
      return;
    }
    try {
      await _refreshVault.delete();
    } on Object {
      // Keyring may be locked or unavailable; in-memory state is already cleared.
    }
  }
}

@immutable
final class ApiProblem implements Exception {
  const ApiProblem({
    required this.status,
    required this.code,
    required this.title,
    required this.detail,
    this.type,
    this.instance,
    this.requestId,
    this.invalidFields = const <String>[],
  });

  factory ApiProblem.fromJson(
    JsonObject json, {
    int? fallbackStatus,
    String? responseRequestId,
  }) {
    final invalid = json['invalid_fields'];
    return ApiProblem(
      status: json['status'] is int
          ? json['status'] as int
          : fallbackStatus ?? 0,
      code: json['code'] is String ? json['code'] as String : 'request_failed',
      title: json['title'] is String
          ? json['title'] as String
          : 'Request failed',
      detail: json['detail'] is String
          ? json['detail'] as String
          : 'The request could not be completed.',
      type: json['type'] is String ? json['type'] as String : null,
      instance: json['instance'] is String ? json['instance'] as String : null,
      requestId: json['request_id'] is String
          ? json['request_id'] as String
          : responseRequestId,
      invalidFields: invalid is List
          ? invalid.whereType<String>().toList(growable: false)
          : const <String>[],
    );
  }

  factory ApiProblem.fromResponse(Response<dynamic> response) {
    final data = response.data;
    final json = data is Map
        ? Map<String, dynamic>.from(data)
        : <String, dynamic>{};
    return ApiProblem.fromJson(
      json,
      fallbackStatus: response.statusCode,
      responseRequestId: response.headers.value('x-request-id'),
    );
  }

  final int status;
  final String code;
  final String title;
  final String detail;
  final String? type;
  final String? instance;
  final String? requestId;
  final List<String> invalidFields;

  @override
  String toString() => detail;
}

final class OfflineException implements Exception {
  const OfflineException();

  @override
  String toString() => 'You are offline.';
}

abstract interface class NetworkMonitor {
  Future<bool> get isOffline;
  Stream<bool> get offlineChanges;
}

final class ConnectivityNetworkMonitor implements NetworkMonitor {
  ConnectivityNetworkMonitor({Connectivity? connectivity})
    : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Future<bool> get isOffline async =>
      _isOffline(await _connectivity.checkConnectivity());

  @override
  Stream<bool> get offlineChanges =>
      _connectivity.onConnectivityChanged.map(_isOffline).distinct();

  static bool _isOffline(List<ConnectivityResult> results) =>
      results.isEmpty ||
      results.every((result) => result == ConnectivityResult.none);
}

typedef SessionExpiredCallback = FutureOr<void> Function();

final class ApiClient {
  ApiClient({
    required AppConfig config,
    required this.tokenStore,
    required this.networkMonitor,
    Dio? dio,
    Uuid? uuid,
  }) : _uuid = uuid ?? const Uuid(),
       dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: config.apiV1Uri.toString(),
               connectTimeout: const Duration(seconds: 12),
               sendTimeout: const Duration(seconds: 15),
               receiveTimeout: const Duration(seconds: 25),
               responseType: ResponseType.json,
               headers: const <String, Object>{
                 'Accept': 'application/json, application/problem+json',
               },
             ),
           ) {
    this.dio.interceptors.add(
      InterceptorsWrapper(onRequest: _onRequest, onError: _onError),
    );
  }

  final Dio dio;
  final TokenStore tokenStore;
  final NetworkMonitor networkMonitor;
  final Uuid _uuid;
  Completer<bool>? _refreshCompleter;
  SessionExpiredCallback? onSessionExpired;

  Future<Response<dynamic>> request(
    String path, {
    String method = 'GET',
    Object? data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    ResponseType? responseType,
    bool authentication = true,
    bool refreshOnUnauthorized = true,
  }) async {
    try {
      return await dio.request<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters == null
            ? null
            : Map<String, dynamic>.fromEntries(
                queryParameters.entries.where((entry) => entry.value != null),
              ),
        options: Options(
          method: method,
          headers: headers,
          responseType: responseType,
          extra: <String, dynamic>{
            if (!authentication) 'skipAuthentication': true,
            if (!refreshOnUnauthorized) 'skipRefresh': true,
          },
        ),
      );
    } on DioException catch (error) {
      if (_isNetworkFailure(error)) {
        if (await networkMonitor.isOffline) {
          throw const OfflineException();
        }
        throw ApiProblem(
          status: 0,
          code: 'server_unreachable',
          title: 'Server unreachable',
          detail:
              'SYLORA could not reach the API. Check the server and try again.',
          requestId: error.requestOptions.extra['requestId'] as String?,
        );
      }
      if (error.response != null) {
        throw ApiProblem.fromResponse(error.response!);
      }
      throw const ApiProblem(
        status: 0,
        code: 'request_failed',
        title: 'Request failed',
        detail: 'The request could not be completed.',
      );
    }
  }

  Future<bool> restoreSession() => _refreshAccessToken();

  void _onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final requestId = _uuid.v4();
    options.headers['X-Request-ID'] = requestId;
    options.extra['requestId'] = requestId;
    if (options.extra['skipAuthentication'] != true) {
      final accessToken = tokenStore.accessToken;
      if (accessToken != null) {
        options.headers['Authorization'] = 'Bearer $accessToken';
        options.extra['attachedAccessToken'] = accessToken;
      }
    }
    handler.next(options);
  }

  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    if (error.response?.statusCode != 401 ||
        request.extra['skipRefresh'] == true ||
        request.extra['retriedAfterRefresh'] == true) {
      handler.next(error);
      return;
    }

    final attached = request.extra['attachedAccessToken'] as String?;
    final current = tokenStore.accessToken;
    final refreshed = attached != null && current != null && attached != current
        ? true
        : await _refreshAccessToken();
    if (!refreshed) {
      handler.next(error);
      return;
    }

    try {
      final options = request.copyWith(
        headers: <String, dynamic>{
          ...request.headers,
          'Authorization': 'Bearer ${tokenStore.accessToken}',
        },
        extra: <String, dynamic>{...request.extra, 'retriedAfterRefresh': true},
      );
      handler.resolve(await dio.fetch<dynamic>(options));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  Future<bool> _refreshAccessToken() async {
    final active = _refreshCompleter;
    if (active != null) {
      return active.future;
    }

    final completer = Completer<bool>();
    _refreshCompleter = completer;
    var refreshed = false;
    try {
      final refreshToken = await tokenStore.readRefreshToken();
      if (refreshToken == null) {
        return false;
      }
      late final Response<dynamic> response;
      try {
        response = await dio.post<dynamic>(
          'auth/refresh',
          data: <String, dynamic>{'refresh_token': refreshToken},
          options: Options(
            extra: const <String, dynamic>{
              'skipAuthentication': true,
              'skipRefresh': true,
            },
          ),
        );
      } on DioException catch (error) {
        if (_refreshCredentialsRejected(error)) {
          await _expireSession();
        }
        return false;
      }
      late final AuthTokens tokens;
      try {
        final json = requireObject(response.data, 'refresh response');
        tokens = AuthTokens.fromJson(json);
        await tokenStore.save(tokens);
      } on Object {
        // A successful refresh has already rotated the old credential. If its
        // response cannot be parsed or stored, retaining the old token would
        // trigger reuse detection on the next attempt.
        await _expireSession();
        return false;
      }
      refreshed = true;
      return true;
    } on Object {
      return false;
    } finally {
      if (!completer.isCompleted) {
        completer.complete(refreshed);
      }
      _refreshCompleter = null;
    }
  }

  Future<void> _expireSession() async {
    try {
      await tokenStore.clear();
    } on Object {
      // PlatformTokenStore clears the in-memory access token before awaiting
      // native secure-storage deletion.
    }
    try {
      await onSessionExpired?.call();
    } on Object {
      // A state-listener failure must not strand concurrent refresh callers.
    }
  }

  static bool _refreshCredentialsRejected(DioException error) {
    final response = error.response;
    if (response?.statusCode == 401) {
      return true;
    }
    final data = response?.data;
    if (data is! Map) {
      return false;
    }
    final code = data['code'];
    return code == 'invalid_refresh_token' ||
        code == 'refresh_token_reuse' ||
        code == 'invalid_token';
  }

  static bool _isNetworkFailure(DioException error) =>
      error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.sendTimeout ||
      error.type == DioExceptionType.receiveTimeout;
}

JsonObject requireObject(Object? value, String context) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  throw FormatException('$context must be a JSON object.');
}

List<dynamic> requireList(JsonObject json, String key) {
  final value = json[key];
  if (value is List<dynamic>) {
    return value;
  }
  throw FormatException('$key must be a JSON array.');
}

String requireString(JsonObject json, String key) {
  final value = json[key];
  if (value is String) {
    return value;
  }
  throw FormatException('$key must be a string.');
}

String? optionalString(JsonObject json, String key) {
  final value = json[key];
  if (value == null || value is String) {
    return value as String?;
  }
  throw FormatException('$key must be a string or null.');
}

int requireInt(JsonObject json, String key) {
  final value = json[key];
  if (value is int) {
    return value;
  }
  throw FormatException('$key must be an integer.');
}

bool requireBool(JsonObject json, String key) {
  final value = json[key];
  if (value is bool) {
    return value;
  }
  throw FormatException('$key must be a boolean.');
}

DateTime requireDateTime(JsonObject json, String key) {
  final raw = requireString(json, key);
  final value = DateTime.tryParse(raw);
  if (value == null) {
    throw FormatException('$key must be an ISO-8601 date-time.');
  }
  return value;
}

DateTime? optionalDateTime(JsonObject json, String key) {
  final raw = optionalString(json, key);
  if (raw == null) {
    return null;
  }
  final value = DateTime.tryParse(raw);
  if (value == null) {
    throw FormatException('$key must be an ISO-8601 date-time or null.');
  }
  return value;
}
