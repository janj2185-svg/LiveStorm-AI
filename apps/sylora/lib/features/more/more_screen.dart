import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../settings/settings_screen.dart';
import '../social/social_screens.dart';

enum MoreEntryKind {
  communities,
  learning,
  earnings,
  giftShop,
  conferences,
  creatorStudio,
  creator,
  workspace,
  admin,
  mediaSettings,
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

/// Tools that are not already in the compact shell or primary profile actions.
const _entries = <MoreEntry>[
  MoreEntry(
    kind: MoreEntryKind.communities,
    routeName: 'communities',
    icon: Icons.groups_2_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.learning,
    routeName: 'learning',
    icon: Icons.school_outlined,
  ),
  MoreEntry(
    kind: MoreEntryKind.earnings,
    routeName: 'earnings',
    icon: Icons.insights_outlined,
    roles: <String>{'creator', 'admin'},
  ),
  MoreEntry(
    kind: MoreEntryKind.giftShop,
    routeName: 'gifts',
    icon: Icons.storefront_outlined,
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
    final narrow = width < 720;

    return LumenPage(
      title: l10n.navProfile,
      subtitle: l10n.profileSubtitleOwn,
      intensity: 0.92,
      showAuraPresence: false,
      auraPresencePreset: SyloraAuraContextPreset.feed,
      actions: <Widget>[
        IconButton(
          tooltip: l10n.moreSettings,
          onPressed: () => context.goNamed('settings'),
          icon: const Icon(Icons.settings_outlined),
        ),
      ],
      header: account.when(
        loading: () => const SizedBox(
          height: 140,
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (_, _) => SyloraUniverseHero(
          eyebrow: l10n.profileHeroEyebrow,
          title: l10n.navProfile,
          body: l10n.profileHeroBody,
          trailing: _ProfileActions(
            l10n: l10n,
            onEditProfile: () {
              final snapshot = ref.read(accountProvider).asData?.value;
              if (snapshot != null) {
                unawaited(showEditProfileDialog(context, ref, snapshot.profile));
              } else {
                context.goNamed('settings');
              }
            },
          ),
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
          final handle = snapshot.profile.handle;
          final bio = snapshot.profile.bio?.trim();
          return SyloraUniverseHero(
            eyebrow: l10n.profileHeroEyebrow,
            title: snapshot.profile.displayName,
            body: handle == null
                ? (bio == null || bio.isEmpty ? l10n.profileEmptyBio : bio)
                : '@$handle',
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    SyloraAvatarOrb(
                      label: snapshot.profile.displayName,
                      imageUrl: snapshot.profile.avatarUrl,
                      size: narrow ? 72 : 88,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          if (handle != null &&
                              bio != null &&
                              bio.isNotEmpty) ...<Widget>[
                            Text(
                              bio,
                              style: SyloraTokens.body(
                                14,
                                color: SyloraTokens.inkSoft,
                              ),
                              maxLines: 3,
                              softWrap: true,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 10),
                          ] else if (handle == null) ...<Widget>[
                            Text(
                              l10n.settingsNoPublicHandle,
                              style: SyloraTokens.body(
                                13,
                                color: SyloraTokens.inkMute,
                              ),
                            ),
                            const SizedBox(height: 10),
                          ],
                          _ProfileActions(
                            l10n: l10n,
                            onEditProfile: () => unawaited(
                              showEditProfileDialog(
                                context,
                                ref,
                                snapshot.profile,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
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
            ],
            footer: TextButton.icon(
              onPressed: () => context.goNamed('friends'),
              icon: const Icon(Icons.people_outline_rounded, size: 18),
              label: Text(l10n.profileOpenFriends),
            ),
          );
        },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const _TestStandRolePanel(),
          Text(
            l10n.profileTools,
            style: SyloraTokens.label(11, color: SyloraTokens.ion),
          ),
          const SizedBox(height: SyloraTokens.space3),
          LayoutBuilder(
            builder: (context, constraints) {
              final gap = 12.0;
              final tileWidth =
                  (constraints.maxWidth - (columns - 1) * gap) / columns;
              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: <Widget>[
                  for (var i = 0; i < entries.length; i++)
                    SizedBox(
                      width: tileWidth.clamp(132, 420),
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

final class _ProfileActions extends StatelessWidget {
  const _ProfileActions({required this.l10n, required this.onEditProfile});

  final AppLocalizations l10n;
  final VoidCallback onEditProfile;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: <Widget>[
        SyloraPortalChip(
          label: l10n.moreEditProfile,
          icon: Icons.edit_outlined,
          onTap: onEditProfile,
        ),
        SyloraPortalChip(
          label: l10n.moreOpenWallet,
          icon: Icons.account_balance_wallet_outlined,
          onTap: () => context.goNamed('wallet'),
        ),
        SyloraPortalChip(
          label: l10n.notificationsTitle,
          icon: Icons.notifications_outlined,
          onTap: () => context.pushNamed('notifications'),
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
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
                  child: SizedBox(
                    height: 96,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        SyloraPulseGlow(
                          color: SyloraTokens.violet,
                          child: Icon(
                            widget.entry.icon,
                            size: 26,
                            color: SyloraTokens.violet,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          widget.label,
                          style: SyloraTokens.title(15),
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
  MoreEntryKind.communities => l10n.moreCommunities,
  MoreEntryKind.learning => l10n.moreLearning,
  MoreEntryKind.earnings => l10n.moreEarnings,
  MoreEntryKind.giftShop => l10n.moreGiftShop,
  MoreEntryKind.conferences => l10n.moreConferences,
  MoreEntryKind.creatorStudio => l10n.moreCreatorStudio,
  MoreEntryKind.creator => l10n.moreCreator,
  MoreEntryKind.workspace => l10n.moreWorkspace,
  MoreEntryKind.admin => l10n.moreAdmin,
  MoreEntryKind.mediaSettings => l10n.moreMediaSettings,
};

final class _TestStandRolePanel extends ConsumerStatefulWidget {
  const _TestStandRolePanel();

  @override
  ConsumerState<_TestStandRolePanel> createState() =>
      _TestStandRolePanelState();
}

final class _TestStandRolePanelState
    extends ConsumerState<_TestStandRolePanel> {
  bool _standEnabled = false;
  bool _loading = true;
  bool _busy = false;
  String? _status;

  static const _roles = <String>['creator', 'streamer', 'viewer', 'user'];

  @override
  void initState() {
    super.initState();
    unawaited(_loadStand());
  }

  Future<void> _loadStand() async {
    try {
      final response = await ref
          .read(apiClientProvider)
          .request(
            'public/stand-status',
            authentication: false,
            refreshOnUnauthorized: false,
          );
      final body = requireObject(response.data, 'stand status');
      final stand = requireObject(body['stand'], 'stand');
      if (!mounted) {
        return;
      }
      setState(() {
        _standEnabled = stand['enabled'] == true;
        _loading = false;
      });
    } on Object {
      if (mounted) {
        setState(() {
          _standEnabled = false;
          _loading = false;
        });
      }
    }
  }

  String _roleLabel(AppLocalizations l10n, String role) => switch (role) {
    'creator' => l10n.roleCreator,
    'streamer' => l10n.roleStreamer,
    'viewer' => l10n.roleViewer,
    'user' => l10n.roleUser,
    _ => role,
  };

  Future<void> _assume(String role) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _status = l10n.standRoleSwitching(_roleLabel(l10n, role));
    });
    try {
      await ref
          .read(apiClientProvider)
          .request('test-stand/assume-role/$role', method: 'POST');
      await ref.read(authControllerProvider.notifier).refreshMe();
      if (mounted) {
        setState(
          () => _status = l10n.standRoleSet(_roleLabel(l10n, role)),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _status = localizedMessageFor(context, error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || !_standEnabled) {
      return const SizedBox.shrink();
    }
    final l10n = AppLocalizations.of(context);
    final roles =
        ref.watch(authControllerProvider).user?.roles ?? const <String>[];
    final current = roles.isEmpty
        ? l10n.standRoleNone
        : roles.map((role) => _roleLabel(l10n, role)).join(', ');
    return Padding(
      padding: const EdgeInsets.only(bottom: SyloraTokens.space5),
      child: SyloraGlass(
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            initiallyExpanded: false,
            title: Text(l10n.standRoleTitle, style: SyloraTokens.title(16)),
            subtitle: Text(
              l10n.standRoleBody(current),
              style: SyloraTokens.body(13, color: SyloraTokens.inkMute),
              softWrap: true,
            ),
            children: <Widget>[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  for (final role in _roles)
                    LumenSecondaryButton(
                      label: _roleLabel(l10n, role),
                      icon: role == 'creator' || role == 'streamer'
                          ? Icons.podcasts_rounded
                          : Icons.person_outline_rounded,
                      onPressed: _busy ? null : () => _assume(role),
                    ),
                ],
              ),
              if (_status != null) ...<Widget>[
                const SizedBox(height: 8),
                Text(_status!, style: SyloraTokens.body(12), softWrap: true),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
