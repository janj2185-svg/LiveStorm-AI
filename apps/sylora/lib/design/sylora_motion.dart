import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'sylora_tokens.dart';

/// Shared motion language — travel inside one digital world.
abstract final class SyloraMotion {
  static const curveEnter = SyloraTokens.curveSoft;
  static const curveExit = Cubic(0.4, 0, 1, 1);
  static const curveShared = SyloraTokens.curveSnap;

  /// Soft tab/page travel — noticeable but never sticky.
  static Page<void> worldPage({
    required LocalKey key,
    required Widget child,
    required bool reducedMotion,
  }) {
    if (reducedMotion) {
      return NoTransitionPage<void>(key: key, child: child);
    }
    return CustomTransitionPage<void>(
      key: key,
      child: child,
      transitionDuration: const Duration(milliseconds: 360),
      reverseTransitionDuration: const Duration(milliseconds: 240),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final enter = CurvedAnimation(parent: animation, curve: curveEnter);
        final exit = CurvedAnimation(
          parent: secondaryAnimation,
          curve: curveExit,
        );
        return FadeTransition(
          opacity: Tween<double>(begin: 0, end: 1).animate(enter),
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.018, 0.012),
              end: Offset.zero,
            ).animate(enter),
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.988, end: 1).animate(enter),
              child: FadeTransition(
                opacity: Tween<double>(begin: 1, end: 0.94).animate(exit),
                child: child,
              ),
            ),
          ),
        );
      },
    );
  }
}
