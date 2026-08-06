import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'sylora_icons.dart';
import 'sylora_tokens.dart';

enum SyloraButtonVariant { primary, secondary, ghost }

final class SyloraButton extends StatefulWidget {
  const SyloraButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.variant = SyloraButtonVariant.primary,
    this.busy = false,
    this.icon,
    this.expanded = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final SyloraButtonVariant variant;
  final bool busy;
  final IconData? icon;
  final bool expanded;

  @override
  State<SyloraButton> createState() => _SyloraButtonState();
}

final class _SyloraButtonState extends State<SyloraButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.busy;
    final child = widget.busy
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: SyloraTokens.ink,
            ),
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, size: 18),
                const SizedBox(width: 8),
              ],
              Flexible(child: Text(widget.label, overflow: TextOverflow.ellipsis)),
            ],
          );

    final button = MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedScale(
        scale: _hover && enabled ? 1.02 : 1,
        duration: SyloraTokens.durFast,
        curve: SyloraTokens.curveSoft,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: enabled ? widget.onPressed : null,
            borderRadius: BorderRadius.circular(SyloraTokens.radiusCta),
            child: Ink(
              height: 52,
              decoration: _decoration(enabled),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: DefaultTextStyle(
                    style: SyloraTokens.body(
                      15,
                      color: SyloraTokens.ink,
                      weight: FontWeight.w600,
                    ),
                    child: IconTheme(
                      data: const IconThemeData(color: SyloraTokens.ink),
                      child: child,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    return widget.expanded ? SizedBox(width: double.infinity, child: button) : button;
  }

  BoxDecoration _decoration(bool enabled) {
    switch (widget.variant) {
      case SyloraButtonVariant.primary:
        return BoxDecoration(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusCta),
          gradient: LinearGradient(
            colors: enabled
                ? const [
                    SyloraTokens.goldLight,
                    SyloraTokens.gold,
                    SyloraTokens.goldDeep,
                  ]
                : [
                    SyloraTokens.gold.withValues(alpha: 0.35),
                    SyloraTokens.goldDeep.withValues(alpha: 0.25),
                  ],
          ),
          boxShadow: enabled
              ? SyloraTokens.glow(SyloraTokens.gold, blur: 22, opacity: 0.32)
              : null,
        );
      case SyloraButtonVariant.secondary:
        return BoxDecoration(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusCta),
          color: SyloraTokens.glassStrong,
          border: Border.all(color: SyloraTokens.glassStroke),
          boxShadow: SyloraTokens.glassElevation,
        );
      case SyloraButtonVariant.ghost:
        return BoxDecoration(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusCta),
          color: Colors.transparent,
        );
    }
  }
}

final class SyloraGlass extends StatelessWidget {
  const SyloraGlass({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(SyloraTokens.space5),
    this.radius = SyloraTokens.radiusLg,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final panel = DecoratedBox(
      decoration: BoxDecoration(
        color: SyloraTokens.glassStrong,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: SyloraTokens.glassStroke),
        boxShadow: SyloraTokens.glassElevation,
      ),
      child: Padding(padding: padding, child: child),
    );
    // Backdrop blur is the Ethereal glass signature; keep web light to avoid jank.
    if (kIsWeb) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: panel,
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
        child: panel,
      ),
    );
  }
}

final class SyloraCard extends StatefulWidget {
  const SyloraCard({
    required this.child,
    super.key,
    this.onTap,
    this.padding = const EdgeInsets.all(SyloraTokens.space5),
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  State<SyloraCard> createState() => _SyloraCardState();
}

final class _SyloraCardState extends State<SyloraCard> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedContainer(
        duration: SyloraTokens.durMed,
        curve: SyloraTokens.curveSoft,
        transform: Matrix4.identity()
          ..setEntry(3, 2, 0.001)
          ..rotateX(_hover ? -0.02 : 0)
          ..rotateY(_hover ? 0.015 : 0),
        transformAlignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.78),
          borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
          border: Border.all(
            color: _hover
                ? SyloraTokens.ion.withValues(alpha: 0.35)
                : Colors.white.withValues(alpha: 0.7),
          ),
          boxShadow: _hover
              ? SyloraTokens.glow(SyloraTokens.violet, blur: 28, opacity: 0.18)
              : SyloraTokens.softElevation,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusLg),
            onTap: widget.onTap,
            child: Padding(padding: widget.padding, child: widget.child),
          ),
        ),
      ),
    );
  }
}

final class SyloraTextField extends StatelessWidget {
  const SyloraTextField({
    required this.controller,
    super.key,
    this.label,
    this.hint,
    this.prefixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.validator,
    this.onFieldSubmitted,
    this.minLines,
    this.maxLines = 1,
    this.maxLength,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final IconData? prefixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onFieldSubmitted;
  final int? minLines;
  final int? maxLines;
  final int? maxLength;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      autofillHints: autofillHints,
      validator: validator,
      onFieldSubmitted: onFieldSubmitted,
      minLines: minLines,
      maxLines: obscureText ? 1 : maxLines,
      maxLength: maxLength,
      autofocus: autofocus,
      style: SyloraTokens.body(15, color: SyloraTokens.ink),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: (minLines ?? 1) > 1,
        prefixIcon: prefixIcon == null ? null : Icon(prefixIcon, color: SyloraTokens.inkMute),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.86),
        labelStyle: SyloraTokens.body(13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
          borderSide: BorderSide(color: SyloraTokens.ink.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
          borderSide: BorderSide(color: SyloraTokens.ink.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
          borderSide: const BorderSide(color: SyloraTokens.champagneDeep, width: 1.6),
        ),
      ),
    );
  }
}

final class SyloraBanner extends StatelessWidget {
  const SyloraBanner({
    required this.message,
    super.key,
    this.error = false,
  });

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error ? SyloraTokens.petal : SyloraTokens.ion;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Text(
          message,
          style: SyloraTokens.body(13.5, color: SyloraTokens.ink, weight: FontWeight.w500),
        ),
      ),
    );
  }
}

final class SyloraChip extends StatelessWidget {
  const SyloraChip({
    required this.label,
    required this.selected,
    required this.onSelected,
    super.key,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: false,
      selectedColor: SyloraTokens.champagne.withValues(alpha: 0.22),
      checkmarkColor: SyloraTokens.champagneDeep,
      backgroundColor: Colors.white.withValues(alpha: 0.7),
      side: BorderSide(
        color: selected
            ? SyloraTokens.champagneDeep.withValues(alpha: 0.55)
            : SyloraTokens.ink.withValues(alpha: 0.12),
      ),
      labelStyle: SyloraTokens.body(
        13,
        color: selected ? SyloraTokens.champagneDeep : SyloraTokens.inkSoft,
        weight: FontWeight.w600,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(SyloraTokens.radiusPill),
      ),
    );
  }
}

final class SyloraBrandLockup extends StatelessWidget {
  const SyloraBrandLockup({
    super.key,
    this.size = 28,
    this.showUnified = true,
    this.animated = true,
  });

  final double size;
  final bool showUnified;
  final bool animated;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SyloraMark(size: size, animated: animated),
        SizedBox(width: size * 0.28),
        Flexible(
          child: SyloraWordmark(
            fontSize: size * 0.48,
            letterSpacing: size * 0.2,
            weight: FontWeight.w600,
            showUnified: showUnified,
            unifiedSize: size * 0.22,
            center: false,
          ),
        ),
      ],
    );
  }
}
