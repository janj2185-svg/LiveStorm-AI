import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:just_audio/just_audio.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';

@immutable
final class MusicTrack {
  const MusicTrack({
    required this.id,
    required this.slug,
    required this.title,
    required this.artistName,
    required this.kind,
    required this.durationSeconds,
    required this.audioUrl,
    required this.licenseLabel,
    required this.isCreatorBgm,
    this.mood,
    this.coverUrl,
  });

  factory MusicTrack.fromJson(JsonObject json) => MusicTrack(
    id: requireString(json, 'id'),
    slug: requireString(json, 'slug'),
    title: requireString(json, 'title'),
    artistName: requireString(json, 'artist_name'),
    kind: requireString(json, 'kind'),
    mood: json['mood'] as String?,
    durationSeconds: requireInt(json, 'duration_seconds'),
    audioUrl: requireString(json, 'audio_url'),
    coverUrl: json['cover_url'] as String?,
    licenseLabel: requireString(json, 'license_label'),
    isCreatorBgm: json['is_creator_bgm'] == true,
  );

  final String id;
  final String slug;
  final String title;
  final String artistName;
  final String kind;
  final String? mood;
  final int durationSeconds;
  final String audioUrl;
  final String? coverUrl;
  final String licenseLabel;
  final bool isCreatorBgm;
}

@immutable
final class MusicPlaylist {
  const MusicPlaylist({
    required this.id,
    required this.title,
    required this.kind,
    required this.isPublic,
    required this.trackCount,
    this.description,
    this.mood,
    this.coverUrl,
  });

  factory MusicPlaylist.fromJson(JsonObject json) => MusicPlaylist(
    id: requireString(json, 'id'),
    title: requireString(json, 'title'),
    description: json['description'] as String?,
    kind: requireString(json, 'kind'),
    mood: json['mood'] as String?,
    coverUrl: json['cover_url'] as String?,
    isPublic: json['is_public'] == true,
    trackCount: requireInt(json, 'track_count'),
  );

  final String id;
  final String title;
  final String? description;
  final String kind;
  final String? mood;
  final String? coverUrl;
  final bool isPublic;
  final int trackCount;
}

@immutable
final class MusicHome {
  const MusicHome({
    required this.recentlyPlayed,
    required this.favorites,
    required this.moodPlaylists,
    required this.royaltyFree,
    required this.creatorBgm,
    required this.aiPlaylists,
    required this.personalPlaylists,
  });

  factory MusicHome.fromJson(JsonObject json) {
    List<MusicTrack> tracks(String key) =>
        ((json[key] as List?) ?? const <Object?>[])
            .map((item) => MusicTrack.fromJson(requireObject(item, key)))
            .toList(growable: false);
    List<MusicPlaylist> playlists(String key) =>
        ((json[key] as List?) ?? const <Object?>[])
            .map((item) => MusicPlaylist.fromJson(requireObject(item, key)))
            .toList(growable: false);
    return MusicHome(
      recentlyPlayed: tracks('recently_played'),
      favorites: tracks('favorites'),
      moodPlaylists: playlists('mood_playlists'),
      royaltyFree: tracks('royalty_free'),
      creatorBgm: tracks('creator_bgm'),
      aiPlaylists: playlists('ai_playlists'),
      personalPlaylists: playlists('personal_playlists'),
    );
  }

  final List<MusicTrack> recentlyPlayed;
  final List<MusicTrack> favorites;
  final List<MusicPlaylist> moodPlaylists;
  final List<MusicTrack> royaltyFree;
  final List<MusicTrack> creatorBgm;
  final List<MusicPlaylist> aiPlaylists;
  final List<MusicPlaylist> personalPlaylists;
}

final class MusicRepository {
  const MusicRepository(this._client);

  final ApiClient _client;

  Future<MusicHome> home() async {
    final response = await _client.request('music/home');
    return MusicHome.fromJson(requireObject(response.data, 'music home'));
  }

  Future<List<MusicTrack>> tracks({String? q}) async {
    final response = await _client.request(
      'music/tracks',
      queryParameters: <String, dynamic>{'q': q},
    );
    final data = requireObject(response.data, 'music tracks');
    return requireList(data, 'items')
        .map((item) => MusicTrack.fromJson(requireObject(item, 'track')))
        .toList(growable: false);
  }

  Future<void> play(String trackId, {String context = 'player'}) async {
    await _client.request(
      'music/play',
      method: 'POST',
      data: <String, Object>{'track_id': trackId, 'context': context},
    );
  }

  Future<bool> toggleFavorite(String trackId) async {
    final response = await _client.request(
      'music/favorites/$trackId',
      method: 'POST',
    );
    final data = requireObject(response.data, 'favorite');
    return data['favorited'] == true;
  }

  Future<MusicPlaylist> createAiPlaylist(String prompt) async {
    final response = await _client.request(
      'music/ai-playlists',
      method: 'POST',
      data: <String, Object>{'prompt': prompt},
    );
    return MusicPlaylist.fromJson(requireObject(response.data, 'ai playlist'));
  }

  Future<MusicPlaylist> createPlaylist(String title) async {
    final response = await _client.request(
      'music/playlists',
      method: 'POST',
      data: <String, Object>{'title': title, 'kind': 'personal'},
    );
    return MusicPlaylist.fromJson(requireObject(response.data, 'playlist'));
  }

  Future<MusicPlaylist> updatePlaylist(
    String playlistId, {
    required String title,
    String? description,
  }) async {
    final response = await _client.request(
      'music/playlists/$playlistId',
      method: 'PATCH',
      data: <String, Object?>{'title': title, 'description': description},
    );
    return MusicPlaylist.fromJson(
      requireObject(response.data, 'updated playlist'),
    );
  }

  Future<void> deletePlaylist(String playlistId) async {
    await _client.request('music/playlists/$playlistId', method: 'DELETE');
  }

  Future<List<MusicTrack>> playlistTracks(String playlistId) async {
    final response = await _client.request(
      'music/playlists/$playlistId/tracks',
    );
    final data = requireObject(response.data, 'playlist tracks');
    return requireList(data, 'items')
        .map((item) => MusicTrack.fromJson(requireObject(item, 'track')))
        .toList(growable: false);
  }

  Future<MusicTrack> addTrackToPlaylist(
    String playlistId,
    String trackId,
  ) async {
    final response = await _client.request(
      'music/playlists/$playlistId/tracks',
      method: 'POST',
      data: <String, Object>{'track_id': trackId},
    );
    return MusicTrack.fromJson(
      requireObject(response.data, 'added playlist track'),
    );
  }

  Future<void> removeTrackFromPlaylist(
    String playlistId,
    String trackId,
  ) async {
    await _client.request(
      'music/playlists/$playlistId/tracks/$trackId',
      method: 'DELETE',
    );
  }
}

final musicRepositoryProvider = Provider<MusicRepository>((ref) {
  return MusicRepository(ref.watch(apiClientProvider));
});

final musicHomeProvider = FutureProvider.autoDispose<MusicHome>((ref) {
  return ref.watch(musicRepositoryProvider).home();
});

final musicPlaylistTracksProvider = FutureProvider.autoDispose
    .family<List<MusicTrack>, String>((ref, playlistId) {
      return ref.watch(musicRepositoryProvider).playlistTracks(playlistId);
    });

@immutable
final class CreatorBgmSelection {
  const CreatorBgmSelection({
    required this.track,
    required this.sourceTitle,
    this.playlistId,
  });

  final MusicTrack track;
  final String sourceTitle;
  final String? playlistId;

  bool get fromPlaylist => playlistId != null;
}

final class CreatorBgmController extends ChangeNotifier {
  CreatorBgmSelection? _selection;

  CreatorBgmSelection? get selection => _selection;

  void select(CreatorBgmSelection selection) {
    _selection = selection;
    notifyListeners();
  }

  void clear() {
    if (_selection == null) return;
    _selection = null;
    notifyListeners();
  }
}

final creatorBgmProvider = ChangeNotifierProvider<CreatorBgmController>((ref) {
  return CreatorBgmController();
});

final class MusicPlayerController extends ChangeNotifier {
  MusicPlayerController() {
    _player.playerStateStream.listen((_) => notifyListeners());
    _player.positionStream.listen((_) => notifyListeners());
  }

  final AudioPlayer _player = AudioPlayer();
  MusicTrack? _track;
  String? _error;

  MusicTrack? get track => _track;
  String? get error => _error;
  bool get playing => _player.playing;
  bool isCurrent(MusicTrack track) => _track?.id == track.id;
  Duration get position => _player.position;
  Duration? get duration => _player.duration;

  Future<void> play(MusicTrack track) async {
    _track = track;
    _error = null;
    notifyListeners();
    try {
      await _player.setUrl(track.audioUrl);
      await _player.play();
    } on Object catch (error) {
      _error = error.toString();
      notifyListeners();
    }
  }

  Future<void> toggle() async {
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> stop() async {
    await _player.stop();
    _track = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }
}

final musicPlayerProvider = ChangeNotifierProvider<MusicPlayerController>((
  ref,
) {
  final controller = MusicPlayerController();
  ref.onDispose(controller.dispose);
  return controller;
});

final class MusicScreen extends ConsumerStatefulWidget {
  const MusicScreen({super.key});

  @override
  ConsumerState<MusicScreen> createState() => _MusicScreenState();
}

final class _MusicScreenState extends ConsumerState<MusicScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _aiPrompt = TextEditingController();
  final _catalogSearch = TextEditingController();
  List<MusicTrack>? _searchResults;
  String? _searchError;
  bool _searching = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _aiPrompt.dispose();
    _catalogSearch.dispose();
    super.dispose();
  }

  Future<void> _searchCatalog() async {
    final query = _catalogSearch.text.trim();
    if (query.isEmpty) {
      setState(() {
        _searchResults = null;
        _searchError = null;
      });
      return;
    }
    setState(() {
      _searching = true;
      _searchError = null;
    });
    try {
      final results = await ref.read(musicRepositoryProvider).tracks(q: query);
      if (!mounted) return;
      setState(() => _searchResults = results);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _searchError = messageFor(error));
    } finally {
      if (mounted) {
        setState(() => _searching = false);
      }
    }
  }

  Future<void> _play(MusicTrack track, {String contextLabel = 'player'}) async {
    final player = ref.read(musicPlayerProvider);
    await player.play(track);
    try {
      await ref
          .read(musicRepositoryProvider)
          .play(track.id, context: contextLabel);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  Future<void> _createPlaylist() async {
    try {
      final playlist = await ref
          .read(musicRepositoryProvider)
          .createPlaylist('My Playlist ${DateTime.now().day}');
      ref.invalidate(musicHomeProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Created ${playlist.title}')));
      await _openPlaylist(playlist);
    } on Object catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }

  Future<void> _openPlaylist(MusicPlaylist playlist) async {
    final deleted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => FractionallySizedBox(
        heightFactor: 0.92,
        child: _PlaylistDetailSheet(
          playlist: playlist,
          onPlay: (track) => _play(track, contextLabel: 'playlist'),
        ),
      ),
    );
    if (deleted == true && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Playlist deleted.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final home = ref.watch(musicHomeProvider);
    final player = ref.watch(musicPlayerProvider);
    final compact = MediaQuery.sizeOf(context).width < 720;

    return SyloraLivingScaffold(
      intensity: 0.9,
      showOrbits: compact,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: SyloraTokens.glassStrong,
          title: Text('Music', style: SyloraTokens.title(20)),
          bottom: TabBar(
            controller: _tabs,
            isScrollable: true,
            tabs: const <Tab>[
              Tab(text: 'Home'),
              Tab(text: 'Playlists'),
              Tab(text: 'Favorites'),
              Tab(text: 'Creator BGM'),
              Tab(text: 'Aura AI'),
            ],
          ),
        ),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1200),
            child: Column(
              children: <Widget>[
                Expanded(
                  child: LumenAsyncView<MusicHome>(
                    value: home,
                    onRetry: () => ref.invalidate(musicHomeProvider),
                    data: (data) => TabBarView(
                      controller: _tabs,
                      children: <Widget>[
                        _MusicHomeTab(
                          data: data,
                          onPlay: _play,
                          onOpenPlaylist: _openPlaylist,
                          searchController: _catalogSearch,
                          searchResults: _searchResults,
                          searchError: _searchError,
                          searching: _searching,
                          onSearch: _searchCatalog,
                          onFavorite: (track) async {
                            await ref
                                .read(musicRepositoryProvider)
                                .toggleFavorite(track.id);
                            ref.invalidate(musicHomeProvider);
                          },
                        ),
                        _PlaylistGrid(
                          playlists: <MusicPlaylist>[
                            ...data.personalPlaylists,
                            ...data.moodPlaylists,
                            ...data.aiPlaylists,
                          ],
                          emptyTitle: 'No playlists yet',
                          emptyMessage:
                              'Create a personal playlist or ask Aura.',
                          onCreate: _createPlaylist,
                          onOpen: _openPlaylist,
                        ),
                        _TrackList(
                          tracks: data.favorites,
                          emptyTitle: 'No favorites',
                          emptyMessage: 'Heart tracks to build your favorites.',
                          onPlay: _play,
                        ),
                        _TrackList(
                          tracks: data.creatorBgm,
                          emptyTitle: 'No creator BGM',
                          emptyMessage:
                              'Royalty-free background music for streams.',
                          onPlay: (t) => _play(t, contextLabel: 'creator_bgm'),
                          badge: 'BGM',
                        ),
                        _AuraMusicTab(
                          controller: _aiPrompt,
                          playlists: data.aiPlaylists,
                          onOpenPlaylist: _openPlaylist,
                          onGenerate: () async {
                            final prompt = _aiPrompt.text.trim();
                            if (prompt.isEmpty) return;
                            await ref
                                .read(musicRepositoryProvider)
                                .createAiPlaylist(prompt);
                            _aiPrompt.clear();
                            ref.invalidate(musicHomeProvider);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                if (player.track != null) _MiniPlayer(player: player),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final class _MusicHomeTab extends StatelessWidget {
  const _MusicHomeTab({
    required this.data,
    required this.onPlay,
    required this.onOpenPlaylist,
    required this.onFavorite,
    required this.searchController,
    required this.searching,
    required this.onSearch,
    this.searchResults,
    this.searchError,
  });

  final MusicHome data;
  final Future<void> Function(MusicTrack track) onPlay;
  final Future<void> Function(MusicPlaylist playlist) onOpenPlaylist;
  final Future<void> Function(MusicTrack track) onFavorite;
  final TextEditingController searchController;
  final List<MusicTrack>? searchResults;
  final String? searchError;
  final bool searching;
  final Future<void> Function() onSearch;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: <Widget>[
        SyloraUniverseHero(
          eyebrow: 'MUSIC',
          title: 'Feel the room',
          body:
              'Personal playlists, mood sets, royalty-free creator BGM, and Aura-built mixes — one player across SYLORA.',
          compactBreakpoint: 720,
        ),
        const SizedBox(height: 18),
        TextField(
          controller: searchController,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => onSearch(),
          decoration: InputDecoration(
            hintText: 'Search tracks or artists',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: searching
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : IconButton(
                    tooltip: 'Search catalog',
                    onPressed: onSearch,
                    icon: const Icon(Icons.arrow_forward_rounded),
                  ),
            border: const OutlineInputBorder(),
          ),
        ),
        if (searchError != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              searchError!,
              style: SyloraTokens.body(12, color: SyloraTokens.petal),
            ),
          ),
        if (searchResults != null) ...<Widget>[
          const SizedBox(height: 10),
          _SectionTitle('Search results'),
          _TrackList(
            tracks: searchResults!,
            emptyTitle: 'No tracks found',
            emptyMessage: 'Try another title or artist.',
            onPlay: onPlay,
            onFavorite: onFavorite,
            shrinkWrap: true,
          ),
        ],
        _SectionTitle('Recently played'),
        _HorizontalTracks(tracks: data.recentlyPlayed, onPlay: onPlay),
        _SectionTitle('Mood playlists'),
        SizedBox(
          height: 132,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: data.moodPlaylists.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final playlist = data.moodPlaylists[index];
              return InkWell(
                borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
                onTap: () => onOpenPlaylist(playlist),
                child: SyloraGlass(
                  radius: SyloraTokens.radiusLg,
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: 160,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Icon(Icons.graphic_eq_rounded, color: SyloraTokens.ion),
                        const Spacer(),
                        Text(playlist.title, style: SyloraTokens.title(15)),
                        Text(
                          '${playlist.trackCount} tracks',
                          style: SyloraTokens.body(
                            12,
                            color: SyloraTokens.inkSoft,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        _SectionTitle('Royalty-free'),
        _TrackList(
          tracks: data.royaltyFree,
          emptyTitle: 'Catalog warming up',
          emptyMessage: 'Royalty-free tracks will appear here.',
          onPlay: onPlay,
          onFavorite: onFavorite,
          shrinkWrap: true,
        ),
      ],
    );
  }
}

final class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 10),
      child: Text(label, style: SyloraTokens.title(16)),
    );
  }
}

final class _HorizontalTracks extends StatelessWidget {
  const _HorizontalTracks({required this.tracks, required this.onPlay});

  final List<MusicTrack> tracks;
  final Future<void> Function(MusicTrack track) onPlay;

  @override
  Widget build(BuildContext context) {
    if (tracks.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(
          'Play something to fill recently played.',
          style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
        ),
      );
    }
    return SizedBox(
      height: 108,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: tracks.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final track = tracks[index];
          return InkWell(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
            onTap: () => onPlay(track),
            child: SyloraGlass(
              radius: SyloraTokens.radiusLg,
              padding: const EdgeInsets.all(14),
              child: SizedBox(
                width: 200,
                child: Row(
                  children: <Widget>[
                    CircleAvatar(
                      backgroundColor: SyloraTokens.ion.withValues(alpha: 0.2),
                      child: const Icon(Icons.play_arrow_rounded),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: <Widget>[
                          Text(
                            track.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: SyloraTokens.title(14),
                          ),
                          Text(
                            track.artistName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: SyloraTokens.body(
                              12,
                              color: SyloraTokens.inkSoft,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

final class _TrackList extends StatelessWidget {
  const _TrackList({
    required this.tracks,
    required this.emptyTitle,
    required this.emptyMessage,
    required this.onPlay,
    this.onFavorite,
    this.badge,
    this.shrinkWrap = false,
  });

  final List<MusicTrack> tracks;
  final String emptyTitle;
  final String emptyMessage;
  final Future<void> Function(MusicTrack track) onPlay;
  final Future<void> Function(MusicTrack track)? onFavorite;
  final String? badge;
  final bool shrinkWrap;

  @override
  Widget build(BuildContext context) {
    if (tracks.isEmpty) {
      return LumenEmptyView(
        title: emptyTitle,
        message: emptyMessage,
        actionLabel: 'Talk to Aura',
        onAction: () => context.goNamed('ai'),
        icon: Icons.library_music_outlined,
      );
    }
    return ListView.separated(
      shrinkWrap: shrinkWrap,
      physics: shrinkWrap ? const NeverScrollableScrollPhysics() : null,
      padding: shrinkWrap
          ? EdgeInsets.zero
          : const EdgeInsets.fromLTRB(8, 8, 8, 24),
      itemCount: tracks.length,
      separatorBuilder: (_, _) => const SizedBox(height: 6),
      itemBuilder: (context, index) {
        final track = tracks[index];
        return SyloraStaggeredReveal(
          index: index,
          child: ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
            ),
            tileColor: Colors.white.withValues(alpha: 0.55),
            leading: CircleAvatar(
              backgroundColor: SyloraTokens.petal.withValues(alpha: 0.25),
              child: const Icon(Icons.music_note_rounded),
            ),
            title: Text(
              track.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              [track.artistName, track.licenseLabel, ?badge].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (onFavorite != null)
                  IconButton(
                    tooltip: 'Favorite',
                    onPressed: () => onFavorite!(track),
                    icon: const Icon(Icons.favorite_border_rounded),
                  ),
                IconButton.filledTonal(
                  onPressed: () => onPlay(track),
                  icon: const Icon(Icons.play_arrow_rounded),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

final class _PlaylistGrid extends StatelessWidget {
  const _PlaylistGrid({
    required this.playlists,
    required this.emptyTitle,
    required this.emptyMessage,
    required this.onCreate,
    required this.onOpen,
  });

  final List<MusicPlaylist> playlists;
  final String emptyTitle;
  final String emptyMessage;
  final VoidCallback onCreate;
  final Future<void> Function(MusicPlaylist playlist) onOpen;

  @override
  Widget build(BuildContext context) {
    if (playlists.isEmpty) {
      return LumenEmptyView(
        title: emptyTitle,
        message: emptyMessage,
        actionLabel: 'Create playlist',
        onAction: onCreate,
        icon: Icons.queue_music_rounded,
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 280,
        mainAxisExtent: 140,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: playlists.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return InkWell(
            onTap: onCreate,
            borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
            child: SyloraGlass(
              radius: SyloraTokens.radiusLg,
              padding: const EdgeInsets.all(16),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(Icons.add_rounded),
                  Spacer(),
                  Text('New playlist'),
                ],
              ),
            ),
          );
        }
        final playlist = playlists[index - 1];
        return InkWell(
          onTap: () => onOpen(playlist),
          borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
          child: SyloraGlass(
            radius: SyloraTokens.radiusLg,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  playlist.kind.toUpperCase(),
                  style: SyloraTokens.label(10),
                ),
                const Spacer(),
                Text(playlist.title, style: SyloraTokens.title(16)),
                Text('${playlist.trackCount} tracks'),
              ],
            ),
          ),
        );
      },
    );
  }
}

final class _PlaylistDetailSheet extends ConsumerStatefulWidget {
  const _PlaylistDetailSheet({required this.playlist, required this.onPlay});

  final MusicPlaylist playlist;
  final Future<void> Function(MusicTrack track) onPlay;

  @override
  ConsumerState<_PlaylistDetailSheet> createState() =>
      _PlaylistDetailSheetState();
}

final class _PlaylistDetailSheetState
    extends ConsumerState<_PlaylistDetailSheet> {
  late MusicPlaylist _playlist;
  late final TextEditingController _title;
  late final TextEditingController _description;
  final _catalogSearch = TextEditingController();
  List<MusicTrack>? _searchResults;
  String? _error;
  String? _searchError;
  bool _saving = false;
  bool _deleting = false;
  bool _searching = false;
  final Set<String> _trackMutations = <String>{};

  bool get _editable => _playlist.kind == 'personal';

  @override
  void initState() {
    super.initState();
    _playlist = widget.playlist;
    _title = TextEditingController(text: _playlist.title);
    _description = TextEditingController(text: _playlist.description ?? '');
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _catalogSearch.dispose();
    super.dispose();
  }

  void _refreshPlaylist() {
    ref.invalidate(musicHomeProvider);
    ref.invalidate(musicPlaylistTracksProvider(_playlist.id));
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Playlist title cannot be blank.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final description = _description.text.trim();
      final playlist = await ref
          .read(musicRepositoryProvider)
          .updatePlaylist(
            _playlist.id,
            title: title,
            description: description.isEmpty ? null : description,
          );
      if (!mounted) return;
      setState(() => _playlist = playlist);
      ref.invalidate(musicHomeProvider);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Playlist details saved.')));
    } on Object catch (error) {
      if (mounted) setState(() => _error = messageFor(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete playlist?'),
        content: Text(
          '“${_playlist.title}” and its track list will be permanently deleted.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _deleting = true;
      _error = null;
    });
    try {
      await ref.read(musicRepositoryProvider).deletePlaylist(_playlist.id);
      ref.invalidate(musicHomeProvider);
      ref.invalidate(musicPlaylistTracksProvider(_playlist.id));
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _deleting = false;
          _error = messageFor(error);
        });
      }
    }
  }

  Future<void> _searchCatalog() async {
    final query = _catalogSearch.text.trim();
    if (query.isEmpty) {
      setState(() {
        _searchResults = null;
        _searchError = null;
      });
      return;
    }
    setState(() {
      _searching = true;
      _searchError = null;
    });
    try {
      final tracks = await ref.read(musicRepositoryProvider).tracks(q: query);
      if (mounted) setState(() => _searchResults = tracks);
    } on Object catch (error) {
      if (mounted) setState(() => _searchError = messageFor(error));
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _addTrack(MusicTrack track) async {
    setState(() {
      _trackMutations.add(track.id);
      _error = null;
    });
    try {
      await ref
          .read(musicRepositoryProvider)
          .addTrackToPlaylist(_playlist.id, track.id);
      _refreshPlaylist();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Added ${track.title}.')));
      }
    } on Object catch (error) {
      if (mounted) setState(() => _error = messageFor(error));
    } finally {
      if (mounted) {
        setState(() => _trackMutations.remove(track.id));
      }
    }
  }

  Future<void> _removeTrack(MusicTrack track) async {
    setState(() {
      _trackMutations.add(track.id);
      _error = null;
    });
    try {
      await ref
          .read(musicRepositoryProvider)
          .removeTrackFromPlaylist(_playlist.id, track.id);
      _refreshPlaylist();
    } on Object catch (error) {
      if (mounted) setState(() => _error = messageFor(error));
    } finally {
      if (mounted) {
        setState(() => _trackMutations.remove(track.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tracksValue = ref.watch(musicPlaylistTracksProvider(_playlist.id));
    final playlistTrackIds =
        tracksValue.valueOrNull?.map((track) => track.id).toSet() ??
        const <String>{};

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              CircleAvatar(
                backgroundColor: SyloraTokens.ion.withValues(alpha: 0.18),
                child: const Icon(Icons.queue_music_rounded),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(_playlist.title, style: SyloraTokens.title(22)),
                    const SizedBox(height: 4),
                    Text(
                      _editable
                          ? 'Personal playlist · you can edit this mix'
                          : '${_playlist.kind.toUpperCase()} playlist · read only',
                      style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Close playlist',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (_editable) ...<Widget>[
            TextField(
              controller: _title,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: 'Playlist name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _description,
              minLines: 2,
              maxLines: 4,
              maxLength: 2000,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'What belongs in this playlist?',
                alignLabelWithHint: true,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                LumenPrimaryButton(
                  label: 'Save details',
                  icon: Icons.save_rounded,
                  busy: _saving,
                  onPressed: _saving || _deleting ? null : _save,
                ),
                LumenSecondaryButton(
                  label: _deleting ? 'Deleting…' : 'Delete playlist',
                  icon: Icons.delete_outline_rounded,
                  onPressed: _saving || _deleting ? null : _delete,
                  disabledReason: _deleting ? 'Deleting playlist.' : null,
                ),
              ],
            ),
          ] else if ((_playlist.description ?? '').isNotEmpty)
            Text(
              _playlist.description!,
              style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _error!,
                style: SyloraTokens.body(13, color: SyloraTokens.petal),
              ),
            ),
          const Divider(height: 32),
          Text('Tracks', style: SyloraTokens.title(18)),
          const SizedBox(height: 8),
          tracksValue.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(28),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, stackTrace) => ListTile(
              leading: const Icon(Icons.error_outline_rounded),
              title: Text(messageFor(error)),
              trailing: TextButton(
                onPressed: () =>
                    ref.invalidate(musicPlaylistTracksProvider(_playlist.id)),
                child: const Text('Retry'),
              ),
            ),
            data: (tracks) => tracks.isEmpty
                ? const ListTile(
                    leading: Icon(Icons.library_music_outlined),
                    title: Text('No tracks yet'),
                    subtitle: Text('This playlist is currently empty.'),
                  )
                : Column(
                    children: <Widget>[
                      for (final track in tracks)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: SyloraTokens.petal.withValues(
                              alpha: 0.2,
                            ),
                            child: const Icon(Icons.music_note_rounded),
                          ),
                          title: Text(track.title),
                          subtitle: Text(
                            '${track.artistName} · ${track.licenseLabel}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              IconButton(
                                tooltip: 'Play ${track.title}',
                                onPressed: () => widget.onPlay(track),
                                icon: const Icon(Icons.play_arrow_rounded),
                              ),
                              if (_editable)
                                IconButton(
                                  tooltip: 'Remove ${track.title}',
                                  onPressed: _trackMutations.contains(track.id)
                                      ? null
                                      : () => _removeTrack(track),
                                  icon: _trackMutations.contains(track.id)
                                      ? const SizedBox.square(
                                          dimension: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.remove_circle_outline_rounded,
                                        ),
                                ),
                            ],
                          ),
                        ),
                    ],
                  ),
          ),
          if (_editable) ...<Widget>[
            const Divider(height: 32),
            Text('Add from catalog', style: SyloraTokens.title(18)),
            const SizedBox(height: 10),
            TextField(
              controller: _catalogSearch,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _searchCatalog(),
              decoration: InputDecoration(
                hintText: 'Search tracks or artists',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searching
                    ? const Padding(
                        padding: EdgeInsets.all(14),
                        child: SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : IconButton(
                        tooltip: 'Search catalog',
                        onPressed: _searchCatalog,
                        icon: const Icon(Icons.arrow_forward_rounded),
                      ),
                border: const OutlineInputBorder(),
              ),
            ),
            if (_searchError != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  _searchError!,
                  style: SyloraTokens.body(13, color: SyloraTokens.petal),
                ),
              ),
            if (_searchResults case final List<MusicTrack> results) ...<Widget>[
              const SizedBox(height: 8),
              if (results.isEmpty)
                const ListTile(title: Text('No catalog tracks found'))
              else
                for (final track in results)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.album_outlined),
                    title: Text(track.title),
                    subtitle: Text(track.artistName),
                    trailing: playlistTrackIds.contains(track.id)
                        ? const LumenBadge(label: 'Added')
                        : IconButton.filledTonal(
                            tooltip: 'Add ${track.title}',
                            onPressed: _trackMutations.contains(track.id)
                                ? null
                                : () => _addTrack(track),
                            icon: _trackMutations.contains(track.id)
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.add_rounded),
                          ),
                  ),
            ],
          ],
        ],
      ),
    );
  }
}

final class _AuraMusicTab extends StatelessWidget {
  const _AuraMusicTab({
    required this.controller,
    required this.playlists,
    required this.onGenerate,
    required this.onOpenPlaylist,
  });

  final TextEditingController controller;
  final List<MusicPlaylist> playlists;
  final VoidCallback onGenerate;
  final Future<void> Function(MusicPlaylist playlist) onOpenPlaylist;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        SyloraGlass(
          radius: SyloraTokens.radiusLg,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Ask Aura for a playlist', style: SyloraTokens.title(18)),
              const SizedBox(height: 8),
              Text(
                'Describe a mood, stream vibe, or study session. Aura composes a mix from the SYLORA library.',
                style: SyloraTokens.body(13, color: SyloraTokens.inkSoft),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  hintText: 'Calm focus for late-night coding…',
                  border: OutlineInputBorder(),
                ),
                minLines: 2,
                maxLines: 4,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onGenerate,
                icon: const Icon(Icons.auto_awesome_rounded),
                label: const Text('Generate with Aura'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        for (final playlist in playlists)
          ListTile(
            leading: const Icon(Icons.auto_awesome_outlined),
            title: Text(playlist.title),
            subtitle: Text(playlist.description ?? 'Aura playlist'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => onOpenPlaylist(playlist),
          ),
      ],
    );
  }
}

final class _MiniPlayer extends StatelessWidget {
  const _MiniPlayer({required this.player});

  final MusicPlayerController player;

  @override
  Widget build(BuildContext context) {
    final track = player.track!;
    final duration =
        player.duration ?? Duration(seconds: track.durationSeconds);
    final progress = duration.inMilliseconds == 0
        ? 0.0
        : (player.position.inMilliseconds / duration.inMilliseconds).clamp(
            0.0,
            1.0,
          );
    return Material(
      color: SyloraTokens.glassStrong,
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            LinearProgressIndicator(value: progress),
            ListTile(
              leading: IconButton.filledTonal(
                onPressed: player.toggle,
                icon: Icon(
                  player.playing
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                ),
              ),
              title: Text(
                track.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                player.error ??
                    '${track.artistName} · ${player.playing ? 'playing' : 'paused'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: IconButton(
                tooltip: 'Stop',
                onPressed: player.stop,
                icon: const Icon(Icons.close_rounded),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
