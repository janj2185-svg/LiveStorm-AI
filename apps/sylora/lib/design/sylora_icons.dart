import 'package:flutter/material.dart';

import 'sylora_tokens.dart';

/// Proprietary SYLORA icon set — soft geometric / orbital marks.
abstract final class SyloraIcons {
  static const IconData home = Icons.home_rounded;
  static const IconData search = Icons.search_rounded;
  static const IconData messages = Icons.forum_rounded;
  static const IconData market = Icons.storefront_rounded;
  static const IconData live = Icons.sensors_rounded;
  static const IconData ai = Icons.auto_awesome_rounded;
  static const IconData community = Icons.groups_rounded;
  static const IconData business = Icons.apartment_rounded;
  static const IconData gifts = Icons.card_giftcard_rounded;
  static const IconData education = Icons.menu_book_rounded;
  static const IconData creator = Icons.brush_rounded;
  static const IconData settings = Icons.tune_rounded;
  static const IconData admin = Icons.shield_moon_rounded;
  static const IconData more = Icons.apps_rounded;
  static const IconData mail = Icons.mail_outline_rounded;
  static const IconData lock = Icons.lock_outline_rounded;
  static const IconData phone = Icons.phone_iphone_rounded;
  static const IconData pin = Icons.pin_outlined;
  static const IconData person = Icons.person_outline_rounded;
  static const IconData back = Icons.arrow_back_rounded;
}

/// Soft glowing glyph used in navigation / empty states.
final class SyloraGlyph extends StatelessWidget {
  const SyloraGlyph({
    required this.icon,
    super.key,
    this.size = 22,
    this.active = false,
    this.color,
  });

  final IconData icon;
  final double size;
  final bool active;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ??
        (active ? SyloraTokens.violet : SyloraTokens.inkSoft);
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: active
            ? SyloraTokens.glow(SyloraTokens.violet, blur: 14, opacity: 0.28)
            : null,
      ),
      child: Icon(icon, size: size, color: c),
    );
  }
}

/// Petal-nucleus brand mark.
final class SyloraMark extends StatelessWidget {
  const SyloraMark({super.key, this.size = 36, this.animated = false});

  final double size;
  final bool animated;

  @override
  Widget build(BuildContext context) {
    final mark = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const SweepGradient(
          colors: [
            SyloraTokens.champagneLight,
            SyloraTokens.champagne,
            SyloraTokens.champagneDeep,
            SyloraTokens.softSkyDeep,
            SyloraTokens.champagneLight,
          ],
        ),
        boxShadow: SyloraTokens.glow(SyloraTokens.champagne, blur: size * 0.55, opacity: 0.28),
      ),
      child: Center(
        child: Container(
          width: size * 0.38,
          height: size * 0.38,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFFFFF7EE),
          ),
        ),
      ),
    );
    if (!animated) return mark;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.92, end: 1),
      duration: SyloraTokens.durSlow,
      curve: SyloraTokens.curveSoft,
      builder: (context, value, child) =>
          Transform.scale(scale: value, child: child),
      child: mark,
    );
  }
}
