import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/config.dart';
import 'package:sylora/features/music/music_screens.dart';
import 'package:sylora/features/platform/repositories.dart';

import 'test_transport.dart';

void main() {
  test('notifications parse read state and resolve supported deep links', () {
    final notification = AppNotification.fromJson(<String, dynamic>{
      'id': 'notification-id',
      'notification_type': 'comment',
      'actor_user_id': 'actor-id',
      'target_type': 'post',
      'target_id': 'post-id',
      'event_metadata': <String, dynamic>{},
      'created_at': '2026-08-04T12:00:00Z',
      'read_at': null,
      'muted_at': null,
    });

    final destination = notificationDestination(notification);

    expect(notification.isRead, isFalse);
    expect(destination?.routeName, 'post');
    expect(destination?.pathParameters, <String, String>{'id': 'post-id'});
  });

  test(
    'music repository loads playlist tracks from the existing API',
    () async {
      late RequestOptions captured;
      final repository = MusicRepository(
        _client((options) {
          captured = options;
          return jsonResponse(<String, dynamic>{
            'items': <Map<String, dynamic>>[_musicTrackJson()],
          }, 200);
        }),
      );

      final tracks = await repository.playlistTracks('playlist-id');

      expect(captured.uri.path, '/v1/music/playlists/playlist-id/tracks');
      expect(tracks.single.title, 'Live Glow');
      expect(tracks.single.isCreatorBgm, isTrue);
    },
  );

  test('music repository sends playlist management mutations', () async {
    final requests = <RequestOptions>[];
    final repository = MusicRepository(
      _client((options) {
        requests.add(options);
        if (options.method == 'PATCH') {
          return jsonResponse(<String, dynamic>{
            ..._musicPlaylistJson(),
            'title': 'Road Trip',
            'description': 'Favorites for the road.',
          }, 200);
        }
        if (options.method == 'POST') {
          return jsonResponse(_musicTrackJson(), 201);
        }
        return jsonResponse(<String, dynamic>{}, 204);
      }),
    );

    final updated = await repository.updatePlaylist(
      'playlist-id',
      title: 'Road Trip',
      description: 'Favorites for the road.',
    );
    final added = await repository.addTrackToPlaylist(
      'playlist-id',
      'track-id',
    );
    await repository.removeTrackFromPlaylist('playlist-id', 'track-id');
    await repository.deletePlaylist('playlist-id');

    expect(updated.title, 'Road Trip');
    expect(updated.description, 'Favorites for the road.');
    expect(added.id, 'track-id');
    expect(requests.map((request) => request.method), <String>[
      'PATCH',
      'POST',
      'DELETE',
      'DELETE',
    ]);
    expect(requests.map((request) => request.uri.path), <String>[
      '/v1/music/playlists/playlist-id',
      '/v1/music/playlists/playlist-id/tracks',
      '/v1/music/playlists/playlist-id/tracks/track-id',
      '/v1/music/playlists/playlist-id',
    ]);
    expect(requests[0].data, <String, Object?>{
      'title': 'Road Trip',
      'description': 'Favorites for the road.',
    });
    expect(requests[1].data, <String, Object>{'track_id': 'track-id'});
  });
}

Map<String, dynamic> _musicPlaylistJson() => <String, dynamic>{
  'id': 'playlist-id',
  'title': 'Working title',
  'description': null,
  'kind': 'personal',
  'mood': null,
  'cover_url': null,
  'is_public': false,
  'track_count': 1,
};

Map<String, dynamic> _musicTrackJson() => <String, dynamic>{
  'id': 'track-id',
  'slug': 'live-glow',
  'title': 'Live Glow',
  'artist_name': 'SYLORA',
  'kind': 'royalty_free',
  'mood': 'uplifting',
  'duration_seconds': 180,
  'audio_url': 'https://cdn.example.test/live-glow.mp3',
  'cover_url': null,
  'license_label': 'Creator safe',
  'is_creator_bgm': true,
};

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
