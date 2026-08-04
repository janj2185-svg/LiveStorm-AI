import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
}

final musicRepositoryProvider = Provider<MusicRepository>((ref) {
  return MusicRepository(ref.watch(apiClientProvider));
});

final musicHomeProvider = FutureProvider.autoDispose<MusicHome>((ref) {
  return ref.watch(musicRepositoryProvider).home();
});

final musicPlayerTrackProvider = StateProvider<MusicTrack?>((ref) => null);

final class MusicScreen extends ConsumerStatefulWidget {
  const MusicScreen({super.key});

  @override
  ConsumerState<MusicScreen> createState() => _MusicScreenState();
}

final class _MusicScreenState extends ConsumerState<MusicScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _aiPrompt = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _aiPrompt.dispose();
    super.dispose();
  }

  Future<void> _play(MusicTrack track, {String contextLabel = 'player'}) async {
    ref.read(musicPlayerTrackProvider.notifier).state = track;
    try {
      await ref.read(musicRepositoryProvider).play(track.id, context: contextLabel);
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageFor(error))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final home = ref.watch(musicHomeProvider);
    final nowPlaying = ref.watch(musicPlayerTrackProvider);
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
        body: Column(
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
                      emptyMessage: 'Create a personal playlist or ask Aura.',
                      onCreate: () async {
                        final playlist = await ref
                            .read(musicRepositoryProvider)
                            .createPlaylist(
                              'My Playlist ${DateTime.now().day}',
                            );
                        ref.invalidate(musicHomeProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Created ${playlist.title}')),
                          );
                        }
                      },
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
                      emptyMessage: 'Royalty-free background music for streams.',
                      onPlay: (t) => _play(t, contextLabel: 'creator_bgm'),
                      badge: 'BGM',
                    ),
                    _AuraMusicTab(
                      controller: _aiPrompt,
                      playlists: data.aiPlaylists,
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
            if (nowPlaying != null) _MiniPlayer(track: nowPlaying),
          ],
        ),
      ),
    );
  }
}

final class _MusicHomeTab extends StatelessWidget {
  const _MusicHomeTab({
    required this.data,
    required this.onPlay,
    required this.onFavorite,
  });

  final MusicHome data;
  final Future<void> Function(MusicTrack track) onPlay;
  final Future<void> Function(MusicTrack track) onFavorite;

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
              return SyloraGlass(
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
                        style: SyloraTokens.body(12, color: SyloraTokens.inkSoft),
                      ),
                    ],
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
        actionLabel: 'Refresh',
        onAction: () {},
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
            title: Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(
              [
                track.artistName,
                track.licenseLabel,
                if (badge != null) badge!,
              ].join(' · '),
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
  });

  final List<MusicPlaylist> playlists;
  final String emptyTitle;
  final String emptyMessage;
  final VoidCallback onCreate;

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
        return SyloraGlass(
          radius: SyloraTokens.radiusLg,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(playlist.kind.toUpperCase(), style: SyloraTokens.label(10)),
              const Spacer(),
              Text(playlist.title, style: SyloraTokens.title(16)),
              Text('${playlist.trackCount} tracks'),
            ],
          ),
        );
      },
    );
  }
}

final class _AuraMusicTab extends StatelessWidget {
  const _AuraMusicTab({
    required this.controller,
    required this.playlists,
    required this.onGenerate,
  });

  final TextEditingController controller;
  final List<MusicPlaylist> playlists;
  final VoidCallback onGenerate;

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
          ),
      ],
    );
  }
}

final class _MiniPlayer extends StatelessWidget {
  const _MiniPlayer({required this.track});

  final MusicTrack track;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SyloraTokens.glassStrong,
      elevation: 8,
      child: SafeArea(
        top: false,
        child: ListTile(
          leading: const Icon(Icons.graphic_eq_rounded, color: SyloraTokens.ion),
          title: Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: Text(
            '${track.artistName} · now playing across SYLORA',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: const Icon(Icons.expand_less_rounded),
        ),
      ),
    );
  }
}
