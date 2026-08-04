import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/config.dart';
import 'package:sylora/features/learning/learning_repository.dart';
import 'package:sylora/features/platform/repositories.dart';

import 'test_transport.dart';

void main() {
  test('enrolled quiz discovery uses the enrollment-scoped route', () async {
    late RequestOptions captured;
    final repository = DioLearningRepository(
      _client((options) {
        captured = options;
        return jsonResponse(<Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'quiz-id',
            'title': 'Discovered quiz',
            'attempt_limit': 2,
            'questions': <Map<String, dynamic>>[],
          },
        ], 200);
      }),
    );

    final quizzes = await repository.quizzes('enrollment-id');

    expect(captured.uri.path, '/v1/learning/enrollments/enrollment-id/quizzes');
    expect(quizzes.single.title, 'Discovered quiz');
  });

  test(
    'social reports send the supported reason and optional evidence',
    () async {
      late RequestOptions captured;
      final repository = DioSocialRepository(
        _client((options) {
          captured = options;
          return jsonResponse(<String, dynamic>{'id': 'report-id'}, 201);
        }),
      );

      final id = await repository.report(
        targetType: 'post',
        targetId: 'post-id',
        reason: 'harassment',
        evidence: 'Repeated abusive replies.',
      );

      expect(captured.uri.path, '/v1/social/reports');
      expect(captured.method, 'POST');
      expect(captured.data, <String, dynamic>{
        'target_type': 'post',
        'target_id': 'post-id',
        'reason': 'harassment',
        'evidence': 'Repeated abusive replies.',
      });
      expect(id, 'report-id');
    },
  );
}

ApiClient _client(TransportHandler handler) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test/v1/'));
  dio.httpClientAdapter = TestTransport(handler);
  return ApiClient(
    config: AppConfig(apiBaseUri: Uri.parse('https://api.example.test')),
    tokenStore: _MemoryTokenStore(),
    networkMonitor: const _OnlineMonitor(),
    dio: dio,
  );
}

final class _MemoryTokenStore implements TokenStore {
  @override
  String? get accessToken => 'access-token';

  @override
  Future<void> clear() async {}

  @override
  Future<String?> readRefreshToken() async => null;

  @override
  Future<void> save(AuthTokens tokens) async {}
}

final class _OnlineMonitor implements NetworkMonitor {
  const _OnlineMonitor();

  @override
  Future<bool> get isOffline async => false;

  @override
  Stream<bool> get offlineChanges => const Stream<bool>.empty();
}
