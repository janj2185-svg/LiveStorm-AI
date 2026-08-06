import 'package:flutter/material.dart';

import 'l10n/sylora_localizations.dart';

/// Full SYLORA navigation catalog aligned with product specification.
@immutable
final class SyloraNavItem {
  const SyloraNavItem({
    required this.id,
    required this.labelKey,
    required this.icon,
    required this.selectedIcon,
    required this.routeName,
    this.roles = const <String>{},
    this.primary = false,
  });

  final String id;
  final String labelKey;
  final IconData icon;
  final IconData selectedIcon;
  final String routeName;
  final Set<String> roles;
  final bool primary;

  String label(SyloraLocale locale) => SyloraStrings.t(locale, labelKey);
}

const syloraNavCatalog = <SyloraNavItem>[
  SyloraNavItem(
    id: 'home',
    labelKey: 'nav_home',
    icon: Icons.home_outlined,
    selectedIcon: Icons.home_rounded,
    routeName: 'home',
    primary: true,
  ),
  SyloraNavItem(
    id: 'live',
    labelKey: 'nav_live',
    icon: Icons.sensors_outlined,
    selectedIcon: Icons.sensors_rounded,
    routeName: 'live',
    primary: true,
  ),
  SyloraNavItem(
    id: 'aura',
    labelKey: 'nav_aura',
    icon: Icons.auto_awesome_outlined,
    selectedIcon: Icons.auto_awesome_rounded,
    routeName: 'ai',
  ),
  SyloraNavItem(
    id: 'messages',
    labelKey: 'nav_messages',
    icon: Icons.chat_bubble_outline_rounded,
    selectedIcon: Icons.chat_bubble_rounded,
    routeName: 'messages',
    primary: true,
  ),
  SyloraNavItem(
    id: 'friends',
    labelKey: 'nav_friends',
    icon: Icons.people_outline_rounded,
    selectedIcon: Icons.people_rounded,
    routeName: 'friends',
  ),
  SyloraNavItem(
    id: 'market',
    labelKey: 'nav_market',
    icon: Icons.storefront_outlined,
    selectedIcon: Icons.storefront_rounded,
    routeName: 'marketplace',
    primary: true,
  ),
  SyloraNavItem(
    id: 'learning',
    labelKey: 'nav_learning',
    icon: Icons.school_outlined,
    selectedIcon: Icons.school_rounded,
    routeName: 'learning',
  ),
  SyloraNavItem(
    id: 'business',
    labelKey: 'nav_business',
    icon: Icons.business_outlined,
    selectedIcon: Icons.business_rounded,
    routeName: 'business',
    roles: <String>{'business', 'admin'},
  ),
  SyloraNavItem(
    id: 'music',
    labelKey: 'nav_music',
    icon: Icons.music_note_outlined,
    selectedIcon: Icons.music_note_rounded,
    routeName: 'music',
  ),
  SyloraNavItem(
    id: 'creator',
    labelKey: 'nav_creator',
    icon: Icons.movie_creation_outlined,
    selectedIcon: Icons.movie_creation_rounded,
    routeName: 'creator',
    roles: <String>{'creator', 'admin'},
  ),
  SyloraNavItem(
    id: 'gifts',
    labelKey: 'nav_gifts',
    icon: Icons.card_giftcard_outlined,
    selectedIcon: Icons.card_giftcard_rounded,
    routeName: 'gifts',
  ),
  SyloraNavItem(
    id: 'wallet',
    labelKey: 'nav_wallet',
    icon: Icons.account_balance_wallet_outlined,
    selectedIcon: Icons.account_balance_wallet_rounded,
    routeName: 'wallet',
  ),
  SyloraNavItem(
    id: 'analytics',
    labelKey: 'nav_analytics',
    icon: Icons.bar_chart_outlined,
    selectedIcon: Icons.bar_chart_rounded,
    routeName: 'analytics',
  ),
  SyloraNavItem(
    id: 'profile',
    labelKey: 'nav_profile',
    icon: Icons.person_outline_rounded,
    selectedIcon: Icons.person_rounded,
    routeName: 'profile',
    primary: true,
  ),
  SyloraNavItem(
    id: 'settings',
    labelKey: 'nav_settings',
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings_rounded,
    routeName: 'settings',
  ),
  SyloraNavItem(
    id: 'admin',
    labelKey: 'nav_settings',
    icon: Icons.admin_panel_settings_outlined,
    selectedIcon: Icons.admin_panel_settings_rounded,
    routeName: 'admin',
    roles: <String>{'admin'},
  ),
];

List<SyloraNavItem> navItemsForRoles(Iterable<String> roles) {
  final roleSet = roles.toSet();
  return syloraNavCatalog
      .where(
        (item) => item.roles.isEmpty || item.roles.any(roleSet.contains),
      )
      .toList(growable: false);
}

List<SyloraNavItem> primaryNavItemsForRoles(Iterable<String> roles) =>
    navItemsForRoles(roles).where((item) => item.primary).toList(growable: false);

int navIndexForPath(String path, List<SyloraNavItem> items) {
  final routeToPath = <String, String>{
    'home': '/home',
    'search': '/search',
    'messages': '/messages',
    'marketplace': '/marketplace',
    'live': '/live',
    'ai': '/ai',
    'friends': '/friends',
    'learning': '/learning',
    'business': '/business',
    'music': '/music',
    'creator': '/creator',
    'gifts': '/gifts',
    'wallet': '/wallet',
    'analytics': '/analytics',
    'profile': '/profile',
    'settings': '/settings',
    'admin': '/admin',
    'more': '/more',
  };
  var index = items.indexWhere((item) {
    final itemPath = routeToPath[item.routeName] ?? '/${item.routeName}';
    return path == itemPath || path.startsWith('$itemPath/');
  });
  if (index < 0) {
    index = items.indexWhere((item) => item.routeName == 'home');
  }
  return index < 0 ? 0 : index;
}
