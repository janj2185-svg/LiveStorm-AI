import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/app.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/config.dart';
import 'package:sylora/features/business/business_repository.dart';
import 'package:sylora/features/learning/learning_repository.dart';
import 'package:sylora/features/marketplace/marketplace_repository.dart';

import 'test_transport.dart';

void main() {
  test('marketplace checkout sends route, body, and idempotency key', () async {
    late RequestOptions captured;
    final client = _client((options) {
      captured = options;
      return jsonResponse(_orderJson(), 201);
    });
    final repository = DioMarketplaceRepository(client);

    final order = await repository.checkout(
      settlementMethod: 'external',
      returnUrl: 'https://app.example.test/marketplace',
    );

    expect(captured.uri.path, '/v1/marketplace/checkout');
    expect(captured.method, 'POST');
    expect(captured.data, <String, dynamic>{
      'settlement_method': 'external',
      'return_url': 'https://app.example.test/marketplace',
    });
    expect(captured.headers['Idempotency-Key'], isNotEmpty);
    expect(order.buyerDisplayName, 'API Buyer');
    expect(order.lines.single.title, 'Persisted product');
  });

  test('marketplace checkout rejects a malformed successful response', () {
    final json = _orderJson()..remove('buyer_display_name');
    final repository = DioMarketplaceRepository(
      _client((_) => jsonResponse(json, 201)),
    );

    expect(
      () => repository.checkout(settlementMethod: 'credits'),
      throwsA(isA<FormatException>()),
    );
  });

  test('paid course enrollment is idempotent and parses response', () async {
    late RequestOptions captured;
    final repository = DioLearningRepository(
      _client((options) {
        captured = options;
        return jsonResponse(_enrollmentJson(), 201);
      }),
    );
    const course = Course(
      id: 'course-id',
      authorUserId: 'author-id',
      slug: 'api-course',
      category: 'engineering',
      state: 'published',
      settlementMethod: 'credits',
      title: 'API course',
      description: 'Persisted course',
      learningObjectives: <String>['Use the API'],
      priceMinor: 500,
    );

    final enrollment = await repository.enroll(course);

    expect(captured.uri.path, '/v1/learning/enrollments');
    expect(captured.method, 'POST');
    expect(captured.data, <String, dynamic>{
      'course_id': 'course-id',
      'return_url': null,
    });
    expect(captured.headers['Idempotency-Key'], isNotEmpty);
    expect(enrollment.status, 'active');
    expect(enrollment.courseId, 'course-id');
  });

  test(
    'quiz routes record answers without pre-finalization correctness',
    () async {
      final requests = <RequestOptions>[];
      final repository = DioLearningRepository(
        _client((options) {
          requests.add(options);
          if (options.uri.path.endsWith('/learning/quizzes/quiz-id')) {
            return jsonResponse(<String, dynamic>{
              'id': 'quiz-id',
              'title': 'API quiz',
              'attempt_limit': 2,
              'questions': <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': 'question-id',
                  'prompt': 'Which response came from the API?',
                  'position': 0,
                  'options': <Map<String, dynamic>>[
                    <String, dynamic>{
                      'id': 'option-id',
                      'text': 'This one',
                      'position': 0,
                    },
                    <String, dynamic>{
                      'id': 'other-option-id',
                      'text': 'Another one',
                      'position': 1,
                    },
                  ],
                },
              ],
            }, 200);
          }
          if (options.uri.path.endsWith('/attempts') &&
              options.method == 'POST') {
            return jsonResponse(_attemptJson(state: 'in_progress'), 201);
          }
          if (options.uri.path.endsWith('/answers')) {
            return jsonResponse(<String, dynamic>{'status': 'recorded'}, 200);
          }
          return jsonResponse(
            _attemptJson(
              state: 'passed',
              scorePercent: 100,
              correctCount: 1,
              questionCount: 1,
            ),
            200,
          );
        }),
      );

      final quiz = await repository.quiz('quiz-id', 'enrollment-id');
      final attempt = await repository.startQuiz('quiz-id', 'enrollment-id');
      await repository.answerQuiz(attempt.id, 'question-id', 'option-id');
      final finalized = await repository.finalizeQuiz(attempt.id);

      expect(requests[0].uri.queryParameters['enrollment_id'], 'enrollment-id');
      expect(requests[1].data, <String, dynamic>{
        'enrollment_id': 'enrollment-id',
      });
      expect(requests[2].method, 'PUT');
      expect(requests[2].data, <String, dynamic>{
        'question_id': 'question-id',
        'selected_option_id': 'option-id',
      });
      expect(quiz.questions.single.options.first.text, 'This one');
      expect(finalized.scorePercent, 100);
    },
  );

  test('business tenant queries always include workspace_id', () async {
    final requests = <RequestOptions>[];
    final repository = DioBusinessRepository(
      _client((options) {
        requests.add(options);
        if (options.uri.path.endsWith('/business/crm/companies')) {
          return jsonResponse(<String, dynamic>{
            'items': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'company-id',
                'workspace_id': 'workspace-id',
                'name': 'Persisted company',
                'status': 'active',
              },
            ],
            'next_cursor': 'next-page',
          }, 200);
        }
        return jsonResponse(<String, dynamic>{
          'id': 'task-id',
          'workspace_id': 'workspace-id',
          'title': 'Persisted task',
          'status': 'completed',
          'version': 2,
        }, 200);
      }),
    );

    final companies = await repository.companies(
      'workspace-id',
      query: 'persisted',
      cursor: 'cursor-one',
    );
    final task = await repository.completeTask('workspace-id', 'task-id', 1);

    expect(requests[0].uri.path, '/v1/business/crm/companies');
    expect(
      requests[0].uri.queryParameters,
      containsPair('workspace_id', 'workspace-id'),
    );
    expect(requests[0].uri.queryParameters, containsPair('q', 'persisted'));
    expect(
      requests[0].uri.queryParameters,
      containsPair('cursor', 'cursor-one'),
    );
    expect(requests[1].uri.path, '/v1/business/tasks/task-id/complete');
    expect(
      requests[1].uri.queryParameters,
      containsPair('workspace_id', 'workspace-id'),
    );
    expect(requests[1].uri.queryParameters, containsPair('version', '1'));
    expect(companies.items.single.label, 'Persisted company');
    expect(task.status, 'completed');
  });

  test('admin and role-specific route guards deny unprivileged users', () {
    expect(canAccessRoleRoute(const <String>['user'], '/admin'), isFalse);
    expect(
      canAccessRoleRoute(const <String>['business'], '/admin/users/user-id'),
      isFalse,
    );
    expect(
      canAccessRoleRoute(const <String>['admin'], '/admin/users/user-id'),
      isTrue,
    );
    expect(
      canAccessRoleRoute(const <String>['creator'], '/creator/content/item-id'),
      isTrue,
    );
    expect(
      canAccessRoleRoute(const <String>['user'], '/creator/content/item-id'),
      isFalse,
    );
  });
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

Map<String, dynamic> _orderJson() => <String, dynamic>{
  'id': 'order-id',
  'buyer_user_id': 'buyer-id',
  'buyer_display_name': 'API Buyer',
  'state': 'pending_payment',
  'settlement_method': 'external',
  'currency': 'USD',
  'subtotal_minor': 1000,
  'fee_minor': 100,
  'total_minor': 1100,
  'safe_provider_data': <String, dynamic>{
    'checkout_url': 'https://pay.example.test/checkout',
  },
  'provider': 'configured-provider',
  'provider_operation_id': 'provider-operation-id',
  'created_at': '2026-07-31T12:00:00Z',
  'lines': <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'line-id',
      'product_id': 'product-id',
      'product_version_id': 'version-id',
      'seller_user_id': 'seller-id',
      'product_kind': 'digital',
      'title_snapshot': 'Persisted product',
      'quantity': 1,
      'line_total_minor': 1000,
    },
  ],
};

Map<String, dynamic> _enrollmentJson() => <String, dynamic>{
  'id': 'enrollment-id',
  'user_id': 'user-id',
  'course_id': 'course-id',
  'course_version_id': 'course-version-id',
  'status': 'active',
  'settlement_method': 'credits',
  'provider': null,
  'provider_operation_id': null,
  'enrolled_at': '2026-07-31T12:00:00Z',
  'completed_at': null,
};

Map<String, dynamic> _attemptJson({
  required String state,
  int? scorePercent,
  int? correctCount,
  int? questionCount,
}) => <String, dynamic>{
  'id': 'attempt-id',
  'enrollment_id': 'enrollment-id',
  'quiz_id': 'quiz-id',
  'attempt_number': 1,
  'state': state,
  'score_percent': scorePercent,
  'correct_count': correctCount,
  'question_count': questionCount,
  'started_at': '2026-07-31T12:00:00Z',
  'finalized_at': state == 'passed' || state == 'failed'
      ? '2026-07-31T12:05:00Z'
      : null,
};

final class _MemoryTokenStore implements TokenStore {
  @override
  String? get accessToken => null;

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
