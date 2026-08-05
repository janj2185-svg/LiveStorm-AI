import 'package:flutter/material.dart';

import '../../design/sylora_tokens.dart';

/// Landing / auth façade over the shared SYLORA champagne-glass tokens.
abstract final class LandingTokens {
  static const voidDeep = SyloraTokens.night;
  static const voidMid = SyloraTokens.nightSoft;
  static const ion = SyloraTokens.softSkyDeep;
  static const petal = SyloraTokens.softCoral;
  static const violet = SyloraTokens.champagneDeep;
  static const ember = SyloraTokens.champagne;
  static const mist = SyloraTokens.softSky;
  static const ink = SyloraTokens.ink;
  static const inkDim = SyloraTokens.inkSoft;
  static const glass = SyloraTokens.glass;
  static const glassStroke = Color(0x33FFFFFF);

  static const canvas = SyloraTokens.canvas;
  static const mistBg = SyloraTokens.canvasSoft;
  static const pearl = SyloraTokens.pearl;
  static const champagne = SyloraTokens.champagne;
  static const amberLight = SyloraTokens.champagneLight;
  static const roseGold = SyloraTokens.softCoral;
  static const softClay = SyloraTokens.canvasSoft;
  static const inkSoft = SyloraTokens.inkSoft;
  static const glassFill = SyloraTokens.glass;

  static const heroGradient = SyloraTokens.heroGradient;

  static TextStyle display(double size, {Color color = ink, double height = 1.05}) =>
      SyloraTokens.display(size, color: color, height: height);

  static TextStyle body(
    double size, {
    Color color = inkDim,
    FontWeight weight = FontWeight.w400,
  }) => SyloraTokens.body(size, color: color, weight: weight);
}
