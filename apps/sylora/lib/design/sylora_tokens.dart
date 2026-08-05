import 'package:flutter/material.dart';

/// SYLORA Lumen — approved FINAL champagne-glass design system.
///
/// Boards: `design/approval-complete-product/sylora-FINAL-01-design-system.png`
/// Visual language: warm ivory · champagne · soft sky · glass frost · deep ink.
abstract final class SyloraTokens {
  // —— Surfaces (light-first champagne glass) ——
  static const canvas = Color(0xFFFFF7EE); // Warm Ivory
  static const canvasSoft = Color(0xFFF6EADF);
  static const pearl = Color(0xFFFFFCF8);
  static const milk = Color(0xFFFFFFF8);
  static const glassFrost = Color(0xFFF2F6FA);
  static const glass = Color(0xCCF2F6FA);
  static const glassStrong = Color(0xE6FFFCF8);
  static const glassStroke = Color(0x66FFFFFF);
  static const ink = Color(0xFF0F1720); // Deep Ink
  static const inkSoft = Color(0xFF4A5560);
  static const inkMute = Color(0xFF7A8490);

  // —— Brand spectrum (FINAL-01) ——
  static const champagne = Color(0xFFE6C88B);
  static const champagneDeep = Color(0xFFC9A45C);
  static const champagneLight = Color(0xFFF5DEB3);
  static const softSky = Color(0xFFDCEEFF);
  static const softSkyDeep = Color(0xFF8EB8D8);
  static const softCoral = Color(0xFFFF8F7A);
  static const softCoralDeep = Color(0xFFE56B58);

  // Compat aliases used across modules (mapped onto FINAL palette).
  static const ion = softSkyDeep;
  static const aqua = Color(0xFF7EC8B8);
  static const violet = champagneDeep;
  static const petal = softCoral;
  static const mist = softSky;
  static const dawn = champagneLight;

  // —— Rare contrast (cinema / live beats only) ——
  static const night = Color(0xFF0F1720);
  static const nightSoft = Color(0xFF1A2430);

  // —— Radii (FINAL 8→32 + pill) ——
  static const radiusXs = 8.0;
  static const radiusSm = 12.0;
  static const radiusMd = 16.0;
  static const radiusLg = 24.0;
  static const radiusXl = 32.0;
  static const radiusPill = 999.0;

  // —— Spacing scale (8pt base) ——
  static const space1 = 4.0;
  static const space2 = 8.0;
  static const space3 = 12.0;
  static const space4 = 16.0;
  static const space5 = 24.0;
  static const space6 = 32.0;
  static const space7 = 48.0;
  static const space8 = 64.0;

  // —— Motion ——
  static const durFast = Duration(milliseconds: 160);
  static const durMed = Duration(milliseconds: 320);
  static const durSlow = Duration(milliseconds: 700);
  static const durScene = Duration(milliseconds: 1100);
  static const curveSoft = Cubic(0.22, 1, 0.36, 1);
  static const curveSnap = Cubic(0.16, 1, 0.3, 1);

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[
      Color(0xFFFFFBF5),
      Color(0xFFFFF7EE),
      Color(0xFFF3E6D4),
      Color(0xFFE8F2FA),
    ],
    stops: <double>[0, 0.35, 0.72, 1],
  );

  static const primaryCtaGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: <Color>[champagneLight, champagne, champagneDeep],
  );

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
      color: Color(0x140F1720),
      blurRadius: 28,
      offset: Offset(0, 14),
    ),
    BoxShadow(
      color: Color(0x14E6C88B),
      blurRadius: 40,
      offset: Offset(0, 8),
    ),
  ];

  /// Static Instrument Sans ships 400/500/600 only (CanvasKit-safe).
  /// CSS aliases this family as Liora UI on web.
  static FontWeight _safeWeight(FontWeight weight) {
    if (weight.value >= FontWeight.w600.value) {
      return FontWeight.w600;
    }
    if (weight.value >= FontWeight.w500.value) {
      return FontWeight.w500;
    }
    return FontWeight.w400;
  }

  /// Aelys Display stand-in (Instrument Serif ships Regular only).
  static TextStyle display(double size, {Color color = ink, double height = 1.02}) =>
      TextStyle(
        fontFamily: 'Instrument Serif',
        fontSize: size,
        height: height,
        fontWeight: FontWeight.w400,
        letterSpacing: size >= 40 ? 0.2 : 0.05,
        color: color,
      );

  static TextStyle title(double size, {Color color = ink}) => TextStyle(
    fontFamily: 'Instrument Sans',
    fontSize: size,
    height: 1.2,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.15,
    color: color,
  );

  static TextStyle body(
    double size, {
    Color color = inkSoft,
    FontWeight weight = FontWeight.w400,
  }) => TextStyle(
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
    letterSpacing: 0.55,
    color: color,
  );
}
