import 'package:flutter/material.dart';

/// Warm premium palette for the immersive world entry — not product chrome.
abstract final class LandingTokens {
  static const canvas = Color(0xFFFAF7F2);
  static const mist = Color(0xFFF3EDE4);
  static const pearl = Color(0xFFFFFCF8);
  static const champagne = Color(0xFFE9DCC8);
  static const amberLight = Color(0xFFF0D7A8);
  static const roseGold = Color(0xFFD4A894);
  static const softClay = Color(0xFFC9B8A6);
  static const ink = Color(0xFF2C2621);
  static const inkSoft = Color(0xFF5C534B);
  static const glassFill = Color(0xCCFFFEFB);
  static const glassStroke = Color(0x66FFFFFF);

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[
      Color(0xFFFFFCF8),
      Color(0xFFF7F0E6),
      Color(0xFFEFE4D4),
    ],
  );

  static TextStyle display(double size, {Color color = ink, double height = 1.15}) =>
      TextStyle(
        fontFamily: 'Instrument Serif',
        fontSize: size,
        height: height,
        fontWeight: FontWeight.w400,
        letterSpacing: -0.02 * size,
        color: color,
      );

  static TextStyle body(double size, {Color color = inkSoft, FontWeight weight = FontWeight.w400}) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: 1.45,
        fontWeight: weight,
        color: color,
      );
}
