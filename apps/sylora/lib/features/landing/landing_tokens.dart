import 'package:flutter/material.dart';

/// SYLORA Aether — proprietary dark ion palette (not generic neon SaaS).
abstract final class LandingTokens {
  static const voidDeep = Color(0xFF010008);
  static const voidMid = Color(0xFF04020E);
  static const ion = Color(0xFF3CEFFF);
  static const petal = Color(0xFFFF4FD8);
  static const violet = Color(0xFF8B5CFF);
  static const ember = Color(0xFFFFB06B);
  static const mist = Color(0xFFD7C6FF);
  static const ink = Color(0xFFF4F0FF);
  static const inkDim = Color(0x9EF4F0FF);
  static const glass = Color(0x6B120A28);
  static const glassStroke = Color(0x24FFFFFF);

  /// Backward-compatible aliases used by auth screens.
  static const canvas = voidDeep;
  static const mistBg = Color(0xFF0B0618);
  static const pearl = Color(0xFF161028);
  static const champagne = violet;
  static const amberLight = ember;
  static const roseGold = petal;
  static const softClay = mist;
  static const inkSoft = inkDim;
  static const glassFill = glass;

  static const heroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: <Color>[
      Color(0xFF12082A),
      voidMid,
      voidDeep,
    ],
  );

  static TextStyle display(double size, {Color color = ink, double height = 1.05}) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: height,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.14 * size * 0.08,
        color: color,
      );

  static TextStyle body(double size, {Color color = inkDim, FontWeight weight = FontWeight.w400}) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.45,
        fontWeight: weight,
        color: color,
      );
}
