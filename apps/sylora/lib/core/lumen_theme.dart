import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../design/sylora_icons.dart';

enum LumenThemeMode { system, light, dark }

@immutable
final class VisualSettings {
  const VisualSettings({
    this.themeMode = LumenThemeMode.light,
    this.highContrast = false,
    this.reducedMotion = false,
    this.textScale = 1,
  });

  final LumenThemeMode themeMode;
  final bool highContrast;
  final bool reducedMotion;
  final double textScale;

  VisualSettings copyWith({
    LumenThemeMode? themeMode,
    bool? highContrast,
    bool? reducedMotion,
    double? textScale,
  }) => VisualSettings(
    themeMode: themeMode ?? this.themeMode,
    highContrast: highContrast ?? this.highContrast,
    reducedMotion: reducedMotion ?? this.reducedMotion,
    textScale: (textScale ?? this.textScale).clamp(0.8, 2),
  );
}

final class VisualSettingsController extends StateNotifier<VisualSettings> {
  VisualSettingsController({SharedPreferences? preferences})
    : _preferences = preferences,
      super(const VisualSettings()) {
    if (preferences != null) {
      _initialization = SynchronousFuture<SharedPreferences>(preferences);
      _read(preferences);
    } else {
      _initialization = SharedPreferences.getInstance().then((value) {
        _preferences = value;
        _read(value);
        return value;
      });
    }
  }

  SharedPreferences? _preferences;
  late final Future<SharedPreferences> _initialization;

  void _read(SharedPreferences preferences) {
    final storedTheme = preferences.getString('visual.theme');
    final theme = LumenThemeMode.values.where(
      (value) => value.name == storedTheme,
    );
    state = VisualSettings(
      themeMode: theme.isEmpty ? LumenThemeMode.light : theme.first,
      highContrast: preferences.getBool('visual.highContrast') ?? false,
      reducedMotion: preferences.getBool('visual.reducedMotion') ?? false,
      textScale: (preferences.getDouble('visual.textScale') ?? 1).clamp(0.8, 2),
    );
  }

  Future<void> update(VisualSettings value) async {
    state = value;
    final preferences = _preferences ?? await _initialization;
    // Loading persisted values may complete while this update is waiting.
    // The explicit user choice must win that race.
    state = value;
    await Future.wait(<Future<bool>>[
      preferences.setString('visual.theme', value.themeMode.name),
      preferences.setBool('visual.highContrast', value.highContrast),
      preferences.setBool('visual.reducedMotion', value.reducedMotion),
      preferences.setDouble('visual.textScale', value.textScale),
    ]);
  }
}

final visualSettingsProvider =
    StateNotifierProvider<VisualSettingsController, VisualSettings>(
      (ref) => VisualSettingsController(),
    );

abstract final class LumenColors {
  // SYLORA Ethereal — cool porcelain · gold · cyan · violet accents
  static const porcelainCanvas = Color(0xFFF4F6FA);
  static const porcelainSurface = Color(0xFFFBFCFF);
  static const porcelainHover = Color(0xFFEBEEF5);
  static const porcelainBorder = Color(0xFFD5DBE6);
  static const porcelainMuted = Color(0xFF5B6574);
  static const porcelainInk = Color(0xFF121826);

  static const darkCanvas = Color(0xFF0F1720);
  static const darkSurface = Color(0xFF1A2430);
  static const darkRaised = Color(0xFF243040);
  static const darkBorder = Color(0xFF3D4A5A);
  static const darkMuted = Color(0xFFDCEEFF);
  static const darkInk = Color(0xFFFBFCFF);

  static const aether = Color(0xFFC9A45C); // Gold deep (primary CTA)
  static const aetherBright = Color(0xFFE6C88B);
  static const pulse = Color(0xFF5EC8FF); // Cyan energy
  static const bloom = Color(0xFF8B7CFF); // Violet accent
  static const verdigris = Color(0xFF6ED6C5);
  static const solar = Color(0xFFF5DEB3);
  static const rose = Color(0xFFFF6B6B);
}

abstract final class LumenTheme {
  static ThemeData light({bool highContrast = false}) =>
      _build(Brightness.light, highContrast);

  static ThemeData dark({bool highContrast = false}) =>
      _build(Brightness.dark, highContrast);

  static ThemeData _build(Brightness brightness, bool highContrast) {
    final dark = brightness == Brightness.dark;
    final canvas = dark ? LumenColors.darkCanvas : LumenColors.porcelainCanvas;
    final surface = dark
        ? LumenColors.darkSurface
        : LumenColors.porcelainSurface;
    final ink = dark ? LumenColors.darkInk : LumenColors.porcelainInk;
    final muted = dark ? LumenColors.darkMuted : LumenColors.porcelainMuted;
    final border = highContrast
        ? (dark ? const Color(0xFF9098A5) : const Color(0xFF636A73))
        : (dark ? LumenColors.darkBorder : LumenColors.porcelainBorder);
    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: dark ? LumenColors.aetherBright : LumenColors.aether,
      onPrimary: dark ? LumenColors.darkCanvas : LumenColors.porcelainInk,
      secondary: LumenColors.pulse,
      onSecondary: LumenColors.porcelainInk,
      error: dark ? const Color(0xFFFF8E86) : LumenColors.rose,
      onError: dark ? LumenColors.darkCanvas : Colors.white,
      surface: surface,
      onSurface: ink,
      outline: border,
      outlineVariant: border.withValues(alpha: 0.65),
      surfaceContainerHighest: dark
          ? LumenColors.darkRaised
          : LumenColors.porcelainHover,
      onSurfaceVariant: muted,
    );
    final baseText = ThemeData(brightness: brightness).textTheme.apply(
      bodyColor: ink,
      displayColor: ink,
      fontFamily: 'Instrument Sans',
    );
    final textTheme = baseText.copyWith(
      displayLarge: _display(76, 78, ink),
      displayMedium: _display(58, 62, ink),
      displaySmall: _display(44, 50, ink),
      headlineLarge: _display(34, 40, ink),
      headlineMedium: _display(27, 33, ink),
      headlineSmall: _display(21, 27, ink),
      titleLarge: _sans(17, 23, FontWeight.w600, ink),
      bodyLarge: _sans(17, 27, FontWeight.w400, ink),
      bodyMedium: _sans(15, 23, FontWeight.w400, ink),
      bodySmall: _sans(13.5, 20, FontWeight.w400, muted),
      labelLarge: _sans(13.5, 16, FontWeight.w600, ink),
      labelMedium: _sans(12, 16, FontWeight.w500, muted),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: canvas,
      canvasColor: canvas,
      fontFamily: 'Instrument Sans',
      textTheme: textTheme,
      dividerColor: border,
      focusColor: colorScheme.primary.withValues(alpha: 0.18),
      splashFactory: InkSparkle.splashFactory,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: FadeForwardsPageTransitionsBuilder(),
        },
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark ? LumenColors.darkRaised : const Color(0xFFFFFFFF),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colorScheme.error),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(44, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          backgroundColor: LumenColors.aether,
          foregroundColor: LumenColors.porcelainInk,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(44, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          side: BorderSide(color: border),
        ),
      ),
      iconButtonTheme: const IconButtonThemeData(
        style: ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(44, 44))),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: colorScheme.primary.withValues(alpha: 0.14),
        height: 72,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: surface,
        indicatorColor: colorScheme.primary.withValues(alpha: 0.14),
        minWidth: 76,
        minExtendedWidth: 244,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: border.withValues(alpha: dark ? 0.6 : 0.35)),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: canvas.withValues(alpha: 0.92),
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: _sans(17, 23, FontWeight.w600, ink),
      ),
    );
  }

  static TextStyle _display(double size, double height, Color color) =>
      TextStyle(
        fontFamily: 'Instrument Sans',
        fontSize: size,
        height: height / size,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.02 * size,
        color: color,
      );

  static TextStyle _sans(
    double size,
    double height,
    FontWeight weight,
    Color color,
  ) => TextStyle(
    fontFamily: 'Instrument Sans',
    fontSize: size,
    height: height / size,
    fontWeight: weight,
    color: color,
  );
}

final class SyloraLogo extends StatelessWidget {
  const SyloraLogo({
    super.key,
    this.size = 42,
    this.showWordmark = false,
    this.showUnified = false,
    this.wordmarkSize,
    this.wordmarkColor,
  });

  final double size;
  final bool showWordmark;
  final bool showUnified;
  final double? wordmarkSize;
  final Color? wordmarkColor;

  @override
  Widget build(BuildContext context) {
    final mark = SyloraMark(size: size, animated: true, hero: size >= 72);
    if (!showWordmark) return mark;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        SizedBox(height: size * 0.14),
        SyloraWordmark(
          fontSize: wordmarkSize ?? size * 0.28,
          color: wordmarkColor,
          showUnified: showUnified,
        ),
      ],
    );
  }
}

