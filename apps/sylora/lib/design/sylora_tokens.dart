import 'package:flutter/material.dart';

/// SYLORA Lumen — year-2100 light cosmic design system.
///
/// Use these tokens across landing, auth, and the product shell.
/// Prefer light pearlescent surfaces; dark is only for rare contrast beats.
abstract final class SyloraTokens {
  // —— Surfaces (light-first) ——
  static const canvas = Color(0xFFF3F7FF);
  static const canvasSoft = Color(0xFFEAF1FF);
  static const pearl = Color(0xFFFAFCFF);
  static const milk = Color(0xFFFFFFF8);
  static const glass = Color(0xCCFFFFFF);
  static const glassStrong = Color(0xE6FFFFFF);
  static const glassStroke = Color(0x66FFFFFF);
  static const ink = Color(0xFF161B33);
  static const inkSoft = Color(0xFF4A5378);
  static const inkMute = Color(0xFF7A84A8);

  // —— Spectrum ——
  static const ion = Color(0xFF38B7FF);
  static const aqua = Color(0xFF2ED9C2);
  static const violet = Color(0xFF7B6CFF);
  static const petal = Color(0xFFFF6BCB);
  static const mist = Color(0xFFB8C4FF);
  static const dawn = Color(0xFFFFD0E8);

  // —— Rare contrast (section transitions only) ——
  static const night = Color(0xFF0E1430);
  static const nightSoft = Color(0xFF1A2348);

  // —— Radii ——
  static const radiusXs = 8.0;
  static const radiusSm = 12.0;
  static const radiusMd = 18.0;
  static const radiusLg = 28.0;
  static const radiusXl = 40.0;
  static const radiusPill = 999.0;

  // —— Spacing scale ——
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
      Color(0xFFF8FBFF),
      Color(0xFFE8F0FF),
      Color(0xFFF3E9FF),
      Color(0xFFE7FBFF),
    ],
    stops: <double>[0, 0.35, 0.7, 1],
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
      color: Color(0x140E1430),
      blurRadius: 28,
      offset: Offset(0, 14),
    ),
    BoxShadow(
      color: Color(0x0A7B6CFF),
      blurRadius: 40,
      offset: Offset(0, 8),
    ),
  ];

  /// Static Instrument Sans ships 400/500/600 only (CanvasKit-safe).
  static FontWeight _safeWeight(FontWeight weight) {
    if (weight.value >= FontWeight.w600.value) {
      return FontWeight.w600;
    }
    if (weight.value >= FontWeight.w500.value) {
      return FontWeight.w500;
    }
    return FontWeight.w400;
  }

  static TextStyle display(double size, {Color color = ink, double height = 1.02}) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: height,
        fontWeight: FontWeight.w600,
        letterSpacing: (size * 0.04).clamp(1.0, 8.0),
        color: color,
      );

  static TextStyle title(double size, {Color color = ink}) => TextStyle(
    fontFamily: 'Instrument Sans',
    fontSize: size,
    height: 1.2,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
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
    height: 1.2,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.4,
    color: color,
  );
}
