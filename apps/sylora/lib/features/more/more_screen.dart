import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../settings/settings_screen.dart';
import '../social/social_screens.dart';

enum MoreEntryKind {
  learning,
  wallet,
  giftShop,
  music,
  ai,
  live,
  conferences,
  creatorStudio,
  creator,
  workspace,
  admin,
  mediaSettings,
  settings,
}

@immutable
final class MoreEntry {
  const MoreEntry({
    required this.kind,
    required this.routeName,
    required this.icon,
    this.roles = const <String>{},
  });

  final MoreEntryKind kind;
  final String routeName;
  final IconData icon;
  final Set<String> roles;
}

const _entries = <MoreEntry>[
  MoreEntry(
    kind: MoreEntryKind.learning,
    routeName: 'learning',
    icon: Icons.school_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.wallet,
    routeName: 'wallet',
    icon: Icons.account_balance_wallet_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.giftShop,
    routeName: 'gifts',
    icon: Icons.storefront_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.music,
    routeName: 'music',
    icon: Icons.library_music_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.ai,
    routeName: 'ai',
    icon: Icons.auto_awesome_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.live,
    routeName: 'live',
    icon: Icons.sensors_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.conferences,
    routeName: 'conferences',
    icon: Icons.video_call_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.creatorStudio,
    routeName: 'creator-studio',
    icon: Icons.video_camera_front_outlined,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.creator,
    routeName: 'creator',
    icon: Icons.edit_note_rounded,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.workspace,
    routeName: 'business',
    icon: Icons.business_outlined,
    roles: <String>{'business', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.admin,
    routeName: 'admin',
    icon: Icons.admin_panel_settings_outlined,
    roles: <String>{'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.mediaSettings,
    routeName: 'media-settings',
    icon: Icons.tune_rounded,
  ),
  MoreEntry(
    kind: MoreEntryKind.settings,
    routeName: 'settings',
    icon: Icons.settings_outlined,
  ),
];

List<MoreEntry> moreEntriesForRoles(Iterable<String> roles) {
  final roleSet = roles.toSet();
  return _entries
      .where(
        (entry) => entry.roles.isEmpty || entry.roles.any(roleSet.contains),
      )
      .toList(growable: false);
}

final class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final entries = moreEntriesForRoles(roles);
    final account = ref.watch(accountProvider);
    final friends = ref.watch(friendsSnapshotProvider);
    final width = MediaQuery.sizeOf(context).width;
    final columns = SyloraBreakpoints.gridColumns(
      width,
      phone: 2,
      tablet: 3,
      desktop: 4,
    );

    return LumenPage(
      title: l10n.moreTitle,
      subtitle: l10n.moreSubtitle,
      intensity: 0.92,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      header: account.when(
        loading: () => const SizedBox(height: 120, child: Center(child: CircularProgressIndicator())),
        error: (_, _) => SyloraUniverseHero(
          eyebrow: l10n.moreHeroEyebrow,
          title: l10n.navProfile,
          body: l10n.moreHeroBody,
          trailing: _QuickActionRow(l10n: l10n),
        ),
        data: (snapshot) {
          final friendCount = friends.maybeWhen(
            data: (value) => value.friends.length,
            orElse: () => 0,
          );
          final onlineCount = friends.maybeWhen(
            data: (value) =>
                value.friends.where((friend) => friend.online).length,
            orElse: () => 0,
          );
          return SyloraUniverseHero(
            eyebrow: l10n.moreHeroEyebrow,
            title: snapshot.profile.displayName,
            body: snapshot.profile.handle == null
                ? l10n.moreHeroBody
                : '@${snapshot.profile.handle} · ${l10n.moreHeroBody}',
            trailing: Row(
              children: <Widget>[
                SyloraAvatarOrb(
                  label: snapshot.profile.displayName,
                  imageUrl: snapshot.profile.avatarUrl,
                  size: 64,
                ),
                const SizedBox(width: 16),
                Expanded(child: _QuickActionRow(l10n: l10n)),
              ],
            ),
            metrics: <Widget>[
              SyloraMetricPill(
                label: l10n.friendsTitle,
                value: '$friendCount',
                icon: Icons.group_rounded,
              ),
              SyloraMetricPill(
                label: l10n.friendsOnline,
                value: '$onlineCount',
                icon: Icons.bolt_rounded,
              ),
              SyloraMetricPill(
                label: l10n.walletShortLabel,
                value: '◈',
                icon: Icons.account_balance_wallet_rounded,
              ),
            ],
          );
        },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            l10n.moreQuickActions,
            style: SyloraTokens.label(11, color: SyloraTokens.ion),
          ),
          const SizedBox(height: SyloraTokens.space3),
          LayoutBuilder(
            builder: (context, constraints) {
              final tileWidth =
                  (constraints.maxWidth - (columns - 1) * 14) / columns;
              return Wrap(
                spacing: 14,
                runSpacing: 14,
                children: <Widget>[
                  for (var i = 0; i < entries.length; i++)
                    SizedBox(
                      width: tileWidth.clamp(140, 420),
                      child: SyloraStaggeredReveal(
                        index: i,
                        child: _MoreModuleTile(
                          entry: entries[i],
                          label: _entryLabel(l10n, entries[i].kind),
                          openHint: l10n.moreOpenModule,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

final class _QuickActionRow extends StatelessWidget {
  const _QuickActionRow({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: <Widget>[
        SyloraPortalChip(
          label: l10n.moreGoLive,
          icon: Icons.podcasts_rounded,
          onTap: () => context.goNamed('live'),
        ),
        SyloraPortalChip(
          label: l10n.moreOpenWallet,
          icon: Icons.account_balance_wallet_outlined,
          onTap: () => context.goNamed('wallet'),
        ),
        SyloraPortalChip(
          label: l10n.moreEditProfile,
          icon: Icons.person_outline_rounded,
          onTap: () => context.goNamed('settings'),
        ),
        SyloraPortalChip(
          label: l10n.aiShortLabel,
          icon: Icons.auto_awesome_rounded,
          onTap: () => context.goNamed('ai'),
        ),
      ],
    );
  }
}

final class _MoreModuleTile extends StatefulWidget {
  const _MoreModuleTile({
    required this.entry,
    required this.label,
    required this.openHint,
  });

  final MoreEntry entry;
  final String label;
  final String openHint;

  @override
  State<_MoreModuleTile> createState() => _MoreModuleTileState();
}

final class _MoreModuleTileState extends State<_MoreModuleTile> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedContainer(
        duration: SyloraTokens.durFast,
        curve: SyloraTokens.curveSoft,
        transform: Matrix4.translationValues(0, _hover ? -4 : 0, 0),
        child: Tooltip(
          message: '${widget.openHint}: ${widget.label}',
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
              onTap: () => context.goNamed(widget.entry.routeName),
              child: Ink(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: <Color>[
                      Colors.white.withValues(alpha: _hover ? 0.92 : 0.78),
                      SyloraTokens.mist.withValues(alpha: _hover ? 0.35 : 0.18),
                    ],
                  ),
                  border: Border.all(
                    color: _hover
                        ? SyloraTokens.ion.withValues(alpha: 0.5)
                        : Colors.white.withValues(alpha: 0.75),
                  ),
                  boxShadow: _hover
                      ? SyloraTokens.glow(
                          SyloraTokens.violet,
                          blur: 22,
                          opacity: 0.22,
                        )
                      : SyloraTokens.softElevation,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: SizedBox(
                    height: 110,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        SyloraPulseGlow(
                          color: SyloraTokens.violet,
                          child: Icon(
                            widget.entry.icon,
                            size: 30,
                            color: SyloraTokens.violet,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          widget.label,
                          style: SyloraTokens.title(17),
                          maxLines: 2,
                          softWrap: true,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _entryLabel(AppLocalizations l10n, MoreEntryKind kind) => switch (kind) {
  MoreEntryKind.learning => l10n.moreLearning,
  MoreEntryKind.wallet => l10n.walletShortLabel,
  MoreEntryKind.giftShop => 'Gift Shop',
  MoreEntryKind.music => 'Music',
  MoreEntryKind.ai => l10n.aiShortLabel,
  MoreEntryKind.live => l10n.liveShortLabel,
  MoreEntryKind.conferences => l10n.moreConferences,
  MoreEntryKind.creatorStudio => l10n.moreCreatorStudio,
  MoreEntryKind.creator => l10n.moreCreator,
  MoreEntryKind.workspace => l10n.moreWorkspace,
  MoreEntryKind.admin => l10n.moreAdmin,
  MoreEntryKind.mediaSettings => 'Camera & Audio',
  MoreEntryKind.settings => l10n.moreSettings,
};
