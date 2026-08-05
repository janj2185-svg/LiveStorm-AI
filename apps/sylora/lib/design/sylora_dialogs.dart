import 'package:flutter/material.dart';

import 'sylora_components.dart';
import 'sylora_tokens.dart';

/// FINAL glass dialog — replaces stock Material AlertDialog for product UI.
Future<T?> showSyloraDialog<T>({
  required BuildContext context,
  required String title,
  String? message,
  Widget? body,
  String? primaryLabel,
  VoidCallback? onPrimary,
  String? secondaryLabel,
  VoidCallback? onSecondary,
  bool barrierDismissible = true,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierColor: SyloraTokens.ink.withValues(alpha: 0.28),
    builder: (context) => SyloraDialog(
      title: title,
      message: message,
      body: body,
      primaryLabel: primaryLabel,
      onPrimary: onPrimary,
      secondaryLabel: secondaryLabel,
      onSecondary: onSecondary,
    ),
  );
}

final class SyloraDialog extends StatelessWidget {
  const SyloraDialog({
    required this.title,
    super.key,
    this.message,
    this.body,
    this.primaryLabel,
    this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
  });

  final String title;
  final String? message;
  final Widget? body;
  final String? primaryLabel;
  final VoidCallback? onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: SyloraTokens.pearl.withValues(alpha: 0.96),
            borderRadius: BorderRadius.circular(SyloraTokens.radiusXl),
            border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
            boxShadow: SyloraTokens.softElevation,
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title, style: SyloraTokens.display(28)),
                if (message != null) ...[
                  const SizedBox(height: SyloraTokens.space2),
                  Text(message!, style: SyloraTokens.body(15)),
                ],
                if (body != null) ...[
                  const SizedBox(height: SyloraTokens.space4),
                  body!,
                ],
                if (primaryLabel != null || secondaryLabel != null) ...[
                  const SizedBox(height: SyloraTokens.space5),
                  if (primaryLabel != null)
                    SyloraButton(
                      label: primaryLabel!,
                      onPressed: onPrimary ?? () => Navigator.of(context).pop(true),
                    ),
                  if (secondaryLabel != null) ...[
                    const SizedBox(height: SyloraTokens.space2),
                    SyloraButton(
                      label: secondaryLabel!,
                      variant: SyloraButtonVariant.secondary,
                      onPressed:
                          onSecondary ?? () => Navigator.of(context).pop(false),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Future<T?> showSyloraSheet<T>({
  required BuildContext context,
  required Widget child,
  double heightFactor = 0.88,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: SyloraTokens.ink.withValues(alpha: 0.28),
    builder: (context) {
      final height = MediaQuery.sizeOf(context).height * heightFactor;
      return Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: height, maxWidth: 720),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: SyloraTokens.pearl.withValues(alpha: 0.97),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(SyloraTokens.radiusXl),
              ),
              border: Border.all(color: Colors.white.withValues(alpha: 0.75)),
              boxShadow: SyloraTokens.softElevation,
            ),
            child: Column(
              children: [
                const SizedBox(height: 10),
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: SyloraTokens.ink.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      );
    },
  );
}
