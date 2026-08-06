import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Supported UI locales. Instant switching without app restart.
enum SyloraLocale {
  en('en', 'English', '🇬🇧'),
  uk('uk', 'Українська', '🇺🇦'),
  de('de', 'Deutsch', '🇩🇪'),
  es('es', 'Español', '🇪🇸'),
  fr('fr', 'Français', '🇫🇷'),
  ja('ja', '日本語', '🇯🇵'),
  zh('zh', '中文', '🇨🇳');

  const SyloraLocale(this.code, this.label, this.flag);

  final String code;
  final String label;
  final String flag;

  Locale get flutterLocale => Locale(code);

  static SyloraLocale fromCode(String? code) {
    if (code == null || code.isEmpty) return SyloraLocale.en;
    return SyloraLocale.values.firstWhere(
      (value) => value.code == code || code.startsWith('${value.code}_'),
      orElse: () => SyloraLocale.en,
    );
  }
}

final localeProvider =
    StateNotifierProvider<LocaleController, SyloraLocale>(
  (ref) => LocaleController(),
);

final class LocaleController extends StateNotifier<SyloraLocale> {
  LocaleController() : super(SyloraLocale.en) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('ui.locale');
    if (stored != null) {
      state = SyloraLocale.fromCode(stored);
    }
  }

  Future<void> setLocale(SyloraLocale locale) async {
    state = locale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ui.locale', locale.code);
  }
}

/// Lightweight string table — no codegen, instant locale swap.
abstract final class SyloraStrings {
  static String t(SyloraLocale locale, String key) {
    final table = _tables[locale] ?? _tables[SyloraLocale.en]!;
    return table[key] ?? _tables[SyloraLocale.en]![key] ?? key;
  }

  static String greeting(SyloraLocale locale, String name) {
    final hour = DateTime.now().hour;
    final period = hour < 12
        ? 'morning'
        : hour < 18
        ? 'afternoon'
        : 'evening';
    final template = t(locale, 'greeting_$period');
    final display = name.trim().isEmpty ? t(locale, 'friend') : name.split(' ').first;
    return template.replaceAll('{name}', display);
  }

  static const _tables = <SyloraLocale, Map<String, String>>{
    SyloraLocale.en: <String, String>{
      'app_name': 'SYLORA',
      'brand_motto': 'ONE WORLD. INFINITE CREATION.',
      'tagline': 'A brighter place to create together.',
      'tagline_long':
          'Live, social, learning and income — one luminous ecosystem.',
      'welcome_lede':
          'Broadcast-grade streaming, chronological feeds, Aura AI grounded in your analytics, and payouts that clear in three days.',
      'sign_in': 'Sign in',
      'create_account': 'Create account',
      'learn_more': 'Learn more',
      'continue': 'Continue',
      'free_tier_note':
          'Free below 1,000 followers. No card up front, export any time.',
      'nav_home': 'Home',
      'nav_live': 'Live',
      'nav_aura': 'Aura',
      'nav_messages': 'Messages',
      'nav_friends': 'Friends',
      'nav_market': 'Market',
      'nav_learning': 'Learning',
      'nav_business': 'Business',
      'nav_music': 'Music',
      'nav_creator': 'Creator Studio',
      'nav_gifts': 'Gift Shop',
      'nav_wallet': 'Wallet',
      'nav_analytics': 'Analytics',
      'nav_profile': 'Profile',
      'nav_settings': 'Settings',
      'search': 'Search',
      'create': 'Create',
      'notifications': 'Notifications',
      'chat': 'Chat',
      'aura_hint': 'Ask Aura anything…',
      'prop_live': 'Sub-second live',
      'prop_live_body':
          '1080p60 from the browser at 400ms glass-to-glass with multi-cam built in.',
      'prop_aura': 'Aura with sources',
      'prop_aura_body':
          'Every claim cites the broadcast, encoder log or ledger entry it came from.',
      'prop_income': 'Three income streams',
      'prop_income_body':
          'Gifts, memberships and marketplace settle together in three days.',
      'prop_rooms': 'Rooms, not threads',
      'prop_rooms_body':
          'Spaces with real moderation and a timeline nobody quietly reorders.',
      'greeting_morning': 'Good morning, {name}!',
      'greeting_afternoon': 'Good afternoon, {name}!',
      'greeting_evening': 'Good evening, {name}!',
      'friend': 'friend',
      'home_subtitle': 'Your luminous creator command center.',
      'home_modules': 'Explore SYLORA',
      'popular_live': 'Popular LIVE',
      'see_all': 'See all',
      'home_feed': 'Your feed',
      'write_post': 'Write post',
      'feed_empty_title': 'Your feed is quiet',
      'feed_empty_message':
          'Publish a post or follow people to shape your feed.',
      'online': 'Online',
      'aura_home_hint': 'Your AI co-host — grounded in your data.',
      'talk': 'Talk',
      'pillar_ai': 'AI',
      'pillar_live': 'Live Streams',
      'pillar_creator': 'Creator Economy',
      'pillar_world': 'Infinite World',
      'level': 'Level',
      'gifts_tab_popular': 'Popular',
      'gifts_tab_inventory': 'Inventory',
      'gifts_tab_events': 'Events',
    },
    SyloraLocale.uk: <String, String>{
      'app_name': 'SYLORA',
      'brand_motto': 'ОДИН СВІТ. БЕЗМЕЖНЕ ТВОРЕННЯ.',
      'tagline': 'Світліше місце, щоб творити разом.',
      'tagline_long':
          'Ефіри, соцмережа, навчання та дохід — одна сяюча екосистема.',
      'welcome_lede':
          'Стрімінг студійної якості, хронологічна стрічка, Aura AI на основі вашої аналітики та виплати за три дні.',
      'sign_in': 'Увійти',
      'create_account': 'Створити акаунт',
      'learn_more': 'Дізнатися більше',
      'continue': 'Продовжити',
      'free_tier_note':
          'Безкоштовно до 1 000 підписників. Без картки наперед, експорт у будь-який час.',
      'nav_home': 'Головна',
      'nav_live': 'Live',
      'nav_aura': 'Aura',
      'nav_messages': 'Повідомлення',
      'nav_friends': 'Друзі',
      'nav_market': 'Маркет',
      'nav_learning': 'Навчання',
      'nav_business': 'Бізнес',
      'nav_music': 'Музика',
      'nav_creator': 'Creator Studio',
      'nav_gifts': 'Магазин подарунків',
      'nav_wallet': 'Гаманець',
      'nav_analytics': 'Аналітика',
      'nav_profile': 'Профіль',
      'nav_settings': 'Налаштування',
      'search': 'Пошук',
      'create': 'Створити',
      'notifications': 'Сповіщення',
      'chat': 'Чат',
      'aura_hint': 'Запитайте Aura будь-що…',
      'prop_live': 'Ефір без затримки',
      'prop_live_body':
          '1080p60 з браузера за 400 мс glass-to-glass з мультикамерою.',
      'prop_aura': 'Aura з джерелами',
      'prop_aura_body':
          'Кожна відповідь посилається на ефір, лог енкодера або запис у гаманці.',
      'prop_income': 'Три потоки доходу',
      'prop_income_body':
          'Подарунки, підписки та маркетплейс — одна виплата за три дні.',
      'prop_rooms': 'Кімнати, не треди',
      'prop_rooms_body':
          'Простори з модерацією та хронологією, яку ніхто не переставляє.',
      'greeting_morning': 'Доброго ранку, {name}!',
      'greeting_afternoon': 'Добрий день, {name}!',
      'greeting_evening': 'Добрий вечір, {name}!',
      'friend': 'друже',
      'home_subtitle': 'Ваш сяючий центр керування для творців.',
      'home_modules': 'Дослідити SYLORA',
      'popular_live': 'Популярні LIVE',
      'see_all': 'Дивитись усі',
      'home_feed': 'Ваша стрічка',
      'write_post': 'Написати пост',
      'feed_empty_title': 'Стрічка порожня',
      'feed_empty_message':
          'Опублікуйте пост або підпишіться на людей, щоб наповнити стрічку.',
      'online': 'Онлайн',
      'aura_home_hint': 'Ваш AI співведучий — на основі ваших даних.',
      'talk': 'Говорити',
      'pillar_ai': 'AI',
      'pillar_live': 'Live ефіри',
      'pillar_creator': 'Економіка творців',
      'pillar_world': 'Безмежний світ',
      'level': 'Рівень',
      'gifts_tab_popular': 'Популярні',
      'gifts_tab_inventory': 'Інвентар',
      'gifts_tab_events': 'Події',
    },
    SyloraLocale.de: <String, String>{
      'app_name': 'SYLORA',
      'tagline': 'Ein hellerer Ort, um gemeinsam zu erschaffen.',
      'sign_in': 'Anmelden',
      'create_account': 'Konto erstellen',
      'nav_home': 'Start',
      'nav_live': 'Live',
      'nav_aura': 'Aura',
      'nav_messages': 'Nachrichten',
      'nav_friends': 'Freunde',
      'nav_market': 'Markt',
      'nav_learning': 'Lernen',
      'nav_business': 'Business',
      'nav_music': 'Musik',
      'nav_creator': 'Creator Studio',
      'nav_gifts': 'Geschenkshop',
      'nav_wallet': 'Wallet',
      'nav_analytics': 'Analytik',
      'nav_profile': 'Profil',
      'nav_settings': 'Einstellungen',
    },
    SyloraLocale.es: <String, String>{
      'app_name': 'SYLORA',
      'tagline': 'Un lugar más luminoso para crear juntos.',
      'sign_in': 'Iniciar sesión',
      'create_account': 'Crear cuenta',
      'nav_home': 'Inicio',
      'nav_live': 'En vivo',
      'nav_aura': 'Aura',
      'nav_messages': 'Mensajes',
      'nav_friends': 'Amigos',
      'nav_market': 'Mercado',
      'nav_learning': 'Aprendizaje',
      'nav_business': 'Negocios',
      'nav_music': 'Música',
      'nav_creator': 'Creator Studio',
      'nav_gifts': 'Tienda de regalos',
      'nav_wallet': 'Billetera',
      'nav_analytics': 'Analítica',
      'nav_profile': 'Perfil',
      'nav_settings': 'Ajustes',
    },
    SyloraLocale.fr: <String, String>{
      'app_name': 'SYLORA',
      'tagline': 'Un lieu plus lumineux pour créer ensemble.',
      'sign_in': 'Se connecter',
      'create_account': 'Créer un compte',
      'nav_home': 'Accueil',
      'nav_live': 'Live',
      'nav_aura': 'Aura',
      'nav_messages': 'Messages',
      'nav_friends': 'Amis',
      'nav_market': 'Marché',
      'nav_learning': 'Formation',
      'nav_business': 'Business',
      'nav_music': 'Musique',
      'nav_creator': 'Creator Studio',
      'nav_gifts': 'Boutique cadeaux',
      'nav_wallet': 'Portefeuille',
      'nav_analytics': 'Analytique',
      'nav_profile': 'Profil',
      'nav_settings': 'Paramètres',
    },
    SyloraLocale.ja: <String, String>{
      'app_name': 'SYLORA',
      'tagline': '一緒に創る、もっと明るい場所。',
      'sign_in': 'ログイン',
      'create_account': 'アカウント作成',
      'nav_home': 'ホーム',
      'nav_live': 'ライブ',
      'nav_aura': 'Aura',
      'nav_messages': 'メッセージ',
      'nav_friends': 'フレンド',
      'nav_market': 'マーケット',
      'nav_learning': '学習',
      'nav_business': 'ビジネス',
      'nav_music': '音楽',
      'nav_creator': 'Creator Studio',
      'nav_gifts': 'ギフトショップ',
      'nav_wallet': 'ウォレット',
      'nav_analytics': '分析',
      'nav_profile': 'プロフィール',
      'nav_settings': '設定',
    },
    SyloraLocale.zh: <String, String>{
      'app_name': 'SYLORA',
      'tagline': '一起创作的更明亮之地。',
      'sign_in': '登录',
      'create_account': '创建账户',
      'nav_home': '首页',
      'nav_live': '直播',
      'nav_aura': 'Aura',
      'nav_messages': '消息',
      'nav_friends': '好友',
      'nav_market': '市场',
      'nav_learning': '学习',
      'nav_business': '商业',
      'nav_music': '音乐',
      'nav_creator': 'Creator Studio',
      'nav_gifts': '礼物商店',
      'nav_wallet': '钱包',
      'nav_analytics': '分析',
      'nav_profile': '个人资料',
      'nav_settings': '设置',
    },
  };
}

extension SyloraLocaleX on WidgetRef {
  String s(String key) => SyloraStrings.t(read(localeProvider), key);
}
