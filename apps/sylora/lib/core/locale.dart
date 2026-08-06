import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

@immutable
final class SyloraLocaleCatalog {
  const SyloraLocaleCatalog._();

  static const supported = <String, String>{
    'uk': 'Українська',
    'en': 'English',
    'pl': 'Polski',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'pt': 'Português',
    'it': 'Italiano',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'tr': 'Türkçe',
    'nl': 'Nederlands',
    'sv': 'Svenska',
    'ro': 'Română',
    'cs': 'Čeština',
  };

  static String labelFor(String code) => supported[code] ?? code;
}

@immutable
final class LocaleBundle {
  const LocaleBundle(this.code);

  final String code;

  String t(String key) => _tables[code]?[key] ?? _tables['en']![key] ?? key;
}

const _tables = <String, Map<String, String>>{
  'en': <String, String>{
    'slogan': 'Intelligence made visible.',
    'tagline':
        'Create, learn, stream, trade, and collaborate in one luminous ecosystem.',
    'sign_in': 'Sign in',
    'create_account': 'Create account',
    'learn_more': 'Learn more',
    'capabilities': 'What SYLORA holds together',
    'language': 'Language',
    'home': 'Home',
    'live': 'Live',
    'aura': 'Aura',
    'messages': 'Messages',
    'friends': 'Friends',
    'market': 'Market',
    'learning': 'Learning',
    'business': 'Business',
    'music': 'Music',
    'creator_studio': 'Creator Studio',
    'gift_shop': 'Gift Shop',
    'wallet': 'Wallet',
    'analytics': 'Analytics',
    'profile': 'Profile',
    'settings': 'Settings',
    'search': 'Search',
    'create': 'Create',
    'notifications': 'Notifications',
    'chat': 'Chat',
    'more': 'More',
    'ask_aura': 'Ask Aura',
    'aura_hint': 'Aura listens across SYLORA — chat, create, translate, plan.',
  },
  'uk': <String, String>{
    'slogan': 'Інтелект, який видно.',
    'tagline':
        'Створюйте, навчайтесь, стрімте, торгуйте й співпрацюйте в одній світлій екосистемі.',
    'sign_in': 'Увійти',
    'create_account': 'Створити акаунт',
    'learn_more': 'Дізнатися більше',
    'capabilities': 'Що обʼєднує SYLORA',
    'language': 'Мова',
    'home': 'Головна',
    'live': 'Live',
    'aura': 'Aura',
    'messages': 'Повідомлення',
    'friends': 'Друзі',
    'market': 'Маркет',
    'learning': 'Навчання',
    'business': 'Бізнес',
    'music': 'Музика',
    'creator_studio': 'Creator Studio',
    'gift_shop': 'Магазин подарунків',
    'wallet': 'Гаманець',
    'analytics': 'Аналітика',
    'profile': 'Профіль',
    'settings': 'Налаштування',
    'search': 'Пошук',
    'create': 'Створити',
    'notifications': 'Сповіщення',
    'chat': 'Чат',
    'more': 'Ще',
    'ask_aura': 'Запитати Aura',
    'aura_hint':
        'Aura доступна з будь-якої сторінки — чат, створення, переклад, бізнес.',
  },
};

final class LocaleController extends StateNotifier<LocaleBundle> {
  LocaleController({SharedPreferences? preferences})
    : _preferences = preferences,
      super(const LocaleBundle('uk')) {
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
    final code = preferences.getString('locale.code') ?? 'uk';
    if (SyloraLocaleCatalog.supported.containsKey(code)) {
      state = LocaleBundle(code);
    }
  }

  Future<void> setLocale(String code) async {
    if (!SyloraLocaleCatalog.supported.containsKey(code)) {
      return;
    }
    state = LocaleBundle(code);
    final preferences = _preferences ?? await _initialization;
    state = LocaleBundle(code);
    await preferences.setString('locale.code', code);
  }
}

final localeControllerProvider =
    StateNotifierProvider<LocaleController, LocaleBundle>(
      (ref) => LocaleController(),
    );
