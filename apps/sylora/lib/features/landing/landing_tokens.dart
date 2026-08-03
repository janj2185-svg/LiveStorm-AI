import 'package:flutter/material.dart';

import '../../design/sylora_tokens.dart';

/// Landing / auth façade over the shared SYLORA Lumen tokens.
abstract final class LandingTokens {
  static const voidDeep = SyloraTokens.night;
  static const voidMid = SyloraTokens.nightSoft;
  static const ion = SyloraTokens.ion;
  static const petal = SyloraTokens.petal;
  static const violet = SyloraTokens.violet;
  static const ember = SyloraTokens.dawn;
  static const mist = SyloraTokens.mist;
  static const ink = SyloraTokens.ink;
  static const inkDim = SyloraTokens.inkSoft;
  static const glass = SyloraTokens.glass;
  static const glassStroke = Color(0x33FFFFFF);

  static const canvas = SyloraTokens.canvas;
  static const mistBg = SyloraTokens.canvasSoft;
  static const pearl = SyloraTokens.pearl;
  static const champagne = SyloraTokens.violet;
  static const amberLight = SyloraTokens.dawn;
  static const roseGold = SyloraTokens.petal;
  static const softClay = SyloraTokens.mist;
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
