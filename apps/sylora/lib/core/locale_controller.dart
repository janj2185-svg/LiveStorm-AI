import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

@immutable
final class SyloraLocaleOption {
  const SyloraLocaleOption({required this.locale, required this.label});

  final Locale locale;
  final String label;
}

abstract final class SyloraLocales {
  static const storageKey = 'locale.languageCode';
  static const fallback = Locale('en');

  static const options = <SyloraLocaleOption>[
    SyloraLocaleOption(locale: Locale('en'), label: 'English'),
    SyloraLocaleOption(locale: Locale('uk'), label: 'Ukrainian'),
    SyloraLocaleOption(locale: Locale('pl'), label: 'Polish'),
    SyloraLocaleOption(locale: Locale('de'), label: 'German'),
    SyloraLocaleOption(locale: Locale('es'), label: 'Spanish'),
    SyloraLocaleOption(locale: Locale('fr'), label: 'French'),
    SyloraLocaleOption(locale: Locale('it'), label: 'Italian'),
    SyloraLocaleOption(locale: Locale('pt'), label: 'Portuguese'),
    SyloraLocaleOption(locale: Locale('ja'), label: 'Japanese'),
    SyloraLocaleOption(locale: Locale('ko'), label: 'Korean'),
    SyloraLocaleOption(locale: Locale('zh'), label: 'Chinese'),
  ];

  static const supported = <Locale>[
    Locale('en'),
    Locale('uk'),
    Locale('pl'),
    Locale('de'),
    Locale('es'),
    Locale('fr'),
    Locale('it'),
    Locale('pt'),
    Locale('ja'),
    Locale('ko'),
    Locale('zh'),
  ];

  static Locale fromLanguageCode(String? languageCode) {
    for (final option in options) {
      if (option.locale.languageCode == languageCode) {
        return option.locale;
      }
    }
    return fallback;
  }

  static bool isSupported(Locale locale) => supported.any(
    (candidate) => candidate.languageCode == locale.languageCode,
  );

  static String labelFor(Locale locale) {
    for (final option in options) {
      if (option.locale.languageCode == locale.languageCode) {
        return option.label;
      }
    }
    return options.first.label;
  }

  /// Reads `lang` from hash query (`#/auth?lang=uk`) or path query.
  static String? languageCodeFromUri(Uri uri) {
    final direct = uri.queryParameters['lang'];
    if (direct != null && direct.isNotEmpty) {
      return direct;
    }
    final fragment = uri.fragment;
    if (fragment.isEmpty) {
      return null;
    }
    final normalized = fragment.startsWith('/') ? fragment : '/$fragment';
    return Uri.tryParse('https://sylora.local$normalized')?.queryParameters['lang'];
  }
}

final class LocaleController extends StateNotifier<Locale> {
  LocaleController({SharedPreferences? preferences})
    : _preferences = preferences,
      super(SyloraLocales.fallback) {
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
    final fromUri = SyloraLocales.languageCodeFromUri(Uri.base);
    if (fromUri != null) {
      final locale = SyloraLocales.fromLanguageCode(fromUri);
      state = locale;
      // Persist landing → app handoff so Settings stays in sync.
      preferences.setString(SyloraLocales.storageKey, locale.languageCode);
      return;
    }
    state = SyloraLocales.fromLanguageCode(
      preferences.getString(SyloraLocales.storageKey),
    );
  }

  Future<void> setLocale(Locale locale) async {
    final normalized = SyloraLocales.fromLanguageCode(locale.languageCode);
    state = normalized;
    final preferences = _preferences ?? await _initialization;
    // Loading persisted values may complete while this update is waiting.
    // The explicit user choice must win that race.
    state = normalized;
    await preferences.setString(
      SyloraLocales.storageKey,
      normalized.languageCode,
    );
  }
}

final localeControllerProvider =
    StateNotifierProvider<LocaleController, Locale>(
      (ref) => LocaleController(),
    );
