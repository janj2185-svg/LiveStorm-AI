import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  static const porcelainCanvas = Color(0xFFF7F5EF);
  static const porcelainSurface = Color(0xFFFFFEFB);
  static const porcelainHover = Color(0xFFF0F1EF);
  static const porcelainBorder = Color(0xFFCACDD0);
  static const porcelainMuted = Color(0xFF5C626B);
  static const porcelainInk = Color(0xFF20242C);

  static const darkCanvas = Color(0xFF171A20);
  static const darkSurface = Color(0xFF20242C);
  static const darkRaised = Color(0xFF282D36);
  static const darkBorder = Color(0xFF4D5562);
  static const darkMuted = Color(0xFFC0C6D0);
  static const darkInk = Color(0xFFF9F8F4);

  static const aether = Color(0xFF087F91);
  static const aetherBright = Color(0xFF42C6D5);
  static const pulse = Color(0xFF6C55B8);
  static const bloom = Color(0xFFB93886);
  static const verdigris = Color(0xFF247B51);
  static const solar = Color(0xFF8A6512);
  static const rose = Color(0xFFB4453D);
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
      onPrimary: dark ? LumenColors.darkCanvas : Colors.white,
      secondary: LumenColors.pulse,
      onSecondary: Colors.white,
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
        fillColor: dark ? LumenColors.darkCanvas : const Color(0xFFF2F1EC),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colorScheme.error),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(44, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(44, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
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
          side: dark
              ? BorderSide(color: border.withValues(alpha: 0.6))
              : BorderSide.none,
        ),
      ),
    );
  }

  static TextStyle _display(double size, double height, Color color) =>
      TextStyle(
        fontFamily: 'Instrument Serif',
        fontSize: size,
        height: height / size,
        fontWeight: FontWeight.w400,
        letterSpacing: -0.012 * size,
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
  const SyloraLogo({super.key, this.size = 42});

  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'SYLORA',
    image: true,
    child: CustomPaint(
      size: Size.square(size),
      painter: _SyloraLogoPainter(
        dark: Theme.of(context).brightness == Brightness.dark,
      ),
    ),
  );
}

final class _SyloraLogoPainter extends CustomPainter {
  const _SyloraLogoPainter({required this.dark});

  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.saveLayer(Offset.zero & size, Paint());
    final radius = size.shortestSide * 0.27;
    final centers = <Offset>[
      Offset(size.width * 0.39, size.height * 0.38),
      Offset(size.width * 0.61, size.height * 0.38),
      Offset(size.width * 0.5, size.height * 0.59),
    ];
    final colors = dark
        ? const <Color>[
            LumenColors.aetherBright,
            Color(0xFF9D8BE8),
            Color(0xFFF06AB4),
          ]
        : const <Color>[
            Color(0xFF18A7B5),
            LumenColors.pulse,
            LumenColors.bloom,
          ];
    for (var index = 0; index < centers.length; index++) {
      canvas.drawCircle(
        centers[index],
        radius,
        Paint()
          ..color = colors[index].withValues(alpha: dark ? 0.75 : 0.7)
          ..blendMode = dark ? BlendMode.screen : BlendMode.multiply,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SyloraLogoPainter oldDelegate) =>
      oldDelegate.dark != dark;
}
