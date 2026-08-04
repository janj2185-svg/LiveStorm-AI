import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/config.dart';
import 'package:sylora/features/platform/repositories.dart';

import 'test_transport.dart';

void main() {
  test(
    'community repository browses, searches, and creates via social API',
    () async {
      final requests = <RequestOptions>[];
      final repository = DioSocialRepository(
        _client((options) {
          requests.add(options);
          if (options.method == 'POST') {
            return jsonResponse(_communityJson(), 201);
          }
          return jsonResponse(<String, dynamic>{
            'items': <Map<String, dynamic>>[_communityJson()],
            'page': 1,
            'has_more': false,
          }, 200);
        }),
      );

      final created = await repository.createCommunity(
        slug: 'api-builders',
        name: 'API Builders',
        description: 'Build together',
      );
      final communities = await repository.communities(query: 'builders');

      expect(requests[0].uri.path, '/v1/social/communities');
      expect(requests[0].method, 'POST');
      expect(requests[0].data, <String, dynamic>{
        'slug': 'api-builders',
        'name': 'API Builders',
        'description': 'Build together',
        'visibility': 'public',
      });
      expect(requests[1].uri.queryParameters['q'], 'builders');
      expect(created.status, 'active');
      expect(communities.single.label, 'API Builders');
    },
  );

  test('AI conversation creation sends a distinct domain purpose', () async {
    late RequestOptions captured;
    final repository = DioAiRepository(
      _client((options) {
        captured = options;
        return jsonResponse(_aiConversationJson(), 201);
      }),
    );

    final conversation = await repository.createConversation(
      title: 'Learning Tutor',
      purpose: 'learning_tutor',
    );

    expect(captured.uri.path, '/v1/ai/conversations');
    expect(captured.method, 'POST');
    expect(captured.data, <String, dynamic>{
      'title': 'Learning Tutor',
      'mode': 'copilot',
      'purpose': 'learning_tutor',
    });
    expect(conversation.purpose, 'learning_tutor');
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

Map<String, dynamic> _communityJson() => <String, dynamic>{
  'id': 'community-id',
  'slug': 'api-builders',
  'name': 'API Builders',
  'description': 'Build together',
  'visibility': 'public',
  'viewer_membership_status': 'active',
};

Map<String, dynamic> _aiConversationJson() => <String, dynamic>{
  'id': 'conversation-id',
  'title': 'Learning Tutor',
  'mode': 'copilot',
  'purpose': 'learning_tutor',
  'locale': 'en',
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
