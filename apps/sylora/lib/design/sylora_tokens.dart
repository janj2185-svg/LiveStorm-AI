import 'package:flutter/material.dart';

/// SYLORA Ethereal — founder-approved design system (SSOT).
///
/// Spec: `docs/design/v2-ethereal/DESIGN-SYSTEM.md`
/// Cool porcelain · glass · gold CTAs · cyan / violet energy accents · Liquid S.
abstract final class SyloraTokens {
  // —— Surfaces ——
  static const canvas = Color(0xFFF4F6FA);
  static const canvasSoft = Color(0xFFEBEEF5);
  static const canvasElevated = Color(0xFFFBFCFF);
  static const pearl = Color(0xFFFBFCFF);
  static const milk = Color(0xFFFFFFF8);
  static const glassFrost = Color(0xE6FFFFFF);
  static const glass = Color(0x8CFFFFFF);
  static const glassStrong = Color(0xC7FFFFFF);
  static const glassSoft = Color(0x59FFFFFF);
  static const glassStroke = Color(0xB8FFFFFF);
  static const strokeSoft = Color(0x66FFFFFF);
  static const ink = Color(0xFF121826);
  static const inkSoft = Color(0xFF5B6574);
  static const inkMute = Color(0xFF8B93A1);
  static const inkInverse = Color(0xFFFFFFFF);

  // —— Brand metal & energy ——
  static const gold = Color(0xFFE6C88B);
  static const goldDeep = Color(0xFFC9A45C);
  static const goldLight = Color(0xFFF5DEB3);
  static const cyan = Color(0xFF5EC8FF);
  static const violet = Color(0xFF8B7CFF);
  static const aqua = Color(0xFF6ED6C5);

  // Compat aliases (legacy Lumen names → Ethereal mapping).
  static const champagne = gold;
  static const champagneDeep = goldDeep;
  static const champagneLight = goldLight;
  static const softSky = Color(0xFFDCEEFF);
  static const softSkyDeep = cyan;
  static const softCoral = Color(0xFFFF8F7A);
  static const softCoralDeep = Color(0xFFE56B58);
  static const ion = cyan;
  static const petal = softCoral;
  static const mist = softSky;
  static const dawn = goldLight;

  // —— Feedback ——
  static const success = Color(0xFF3ECF8E);
  static const warning = Color(0xFFFFB020);
  static const danger = Color(0xFFFF6B6B);
  static const info = cyan;

  // —— Cinema / live stage (module chrome only) ——
  static const night = Color(0xFF0F1720);
  static const nightSoft = Color(0xFF1A2430);

  // —— Radii ——
  static const radiusXs = 8.0;
  static const radiusSm = 12.0;
  static const radiusMd = 16.0;
  static const radiusLg = 24.0;
  static const radiusXl = 32.0;
  static const radiusCta = 20.0;
  static const radiusPill = 999.0; // chips/badges only — not primary CTAs

  // —— Spacing (8pt) ——
  static const space1 = 4.0;
  static const space2 = 8.0;
  static const space3 = 12.0;
  static const space4 = 16.0;
  static const space5 = 24.0;
  static const space6 = 32.0;
  static const space7 = 48.0;
  static const space8 = 64.0;

  // —— Motion ——
  static const durFast = Duration(milliseconds: 140);
  static const durMed = Duration(milliseconds: 320);
  static const durSlow = Duration(milliseconds: 700);
  static const durScene = Duration(milliseconds: 1100);
  static const durSigil = Duration(milliseconds: 6200);
  static const curveSoft = Cubic(0.22, 1, 0.36, 1);
  static const curveSnap = Cubic(0.16, 1, 0.3, 1);

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[
      Color(0xFFFBFCFF),
      Color(0xFFF4F6FA),
      Color(0xFFE8F4FF),
      Color(0xFFF3EEFF),
      Color(0xFFFFF6E8),
    ],
    stops: <double>[0, 0.28, 0.55, 0.78, 1],
  );

  static const primaryCtaGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: <Color>[goldLight, gold, goldDeep],
  );

  static const sigilGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[
      Color(0xFF5EC8FF),
      Color(0xFF8B7CFF),
      Color(0xFFE6C88B),
      Color(0xFFF5DEB3),
    ],
    stops: <double>[0, 0.35, 0.7, 1],
  );

  /// Module under-glow for thin-line icons.
  static Color moduleGlow(String module) {
    switch (module) {
      case 'live':
        return cyan;
      case 'aura':
      case 'ai':
      case 'learning':
        return violet;
      case 'friends':
        return aqua;
      case 'music':
      case 'studio':
      case 'creator':
        return cyan;
      case 'wallet':
      case 'gifts':
      case 'market':
      case 'business':
      case 'home':
      default:
        return gold;
    }
  }

  static List<BoxShadow> glow(Color color, {double blur = 28, double opacity = 0.35}) =>
      <BoxShadow>[
        BoxShadow(
          color: color.withValues(alpha: opacity),
          blurRadius: blur,
          spreadRadius: 0,
        ),
      ];

  static List<BoxShadow> softElevation = const <BoxShadow>[
    BoxShadow(
      color: Color(0x0F121826),
      blurRadius: 28,
      offset: Offset(0, 14),
    ),
    BoxShadow(
      color: Color(0x14E6C88B),
      blurRadius: 36,
      offset: Offset(0, 8),
    ),
  ];

  static List<BoxShadow> glassElevation = const <BoxShadow>[
    BoxShadow(
      color: Color(0x0A121826),
      blurRadius: 24,
      offset: Offset(0, 10),
    ),
    BoxShadow(
      color: Color(0x145EC8FF),
      blurRadius: 32,
      offset: Offset(0, 4),
    ),
  ];

  /// Geometric sans (Instrument Sans ships 400/500/600 — CanvasKit-safe).
  static FontWeight _safeWeight(FontWeight weight) {
    if (weight.value >= FontWeight.w600.value) {
      return FontWeight.w600;
    }
    if (weight.value >= FontWeight.w500.value) {
      return FontWeight.w500;
    }
    return FontWeight.w400;
  }

  static TextStyle display(double size, {Color color = ink, double height = 1.05}) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: height,
        fontWeight: FontWeight.w600,
        letterSpacing: size >= 40 ? -0.4 : -0.2,
        color: color,
      );

  static TextStyle title(double size, {Color color = ink}) => TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.2,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.15,
        color: color,
      );

  static TextStyle body(
    double size, {
    Color color = inkSoft,
    FontWeight weight = FontWeight.w400,
  }) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.45,
        fontWeight: _safeWeight(weight),
        color: color,
      );

  static TextStyle label(double size, {Color color = inkSoft}) => TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.25,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.04,
        color: color,
      );

  static TextStyle wordmark(double size, {Color color = ink}) => TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.1,
        fontWeight: FontWeight.w600,
        letterSpacing: size * 0.28,
        color: color,
      );

  static TextStyle overline(double size, {Color color = inkMute}) => TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.2,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.14 * size,
        color: color,
      );
}
