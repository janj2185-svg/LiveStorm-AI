// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Ukrainian (`uk`).
class AppLocalizationsUk extends AppLocalizations {
  AppLocalizationsUk([String locale = 'uk']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Твори. Спілкуйся. Ефір.';

  @override
  String get appDescription =>
      'Соціальна платформа для спільноти, подарунків, AI та живих моментів.';

  @override
  String get navHome => 'Головна';

  @override
  String get navFeed => 'Стрічка';

  @override
  String get navLive => 'Ефір';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => 'Подарунки';

  @override
  String get navMessages => 'Повідомлення';

  @override
  String get navProfile => 'Профіль';

  @override
  String get navSettings => 'Налаштування';

  @override
  String get navMore => 'Більше';

  @override
  String get navSearch => 'Пошук';

  @override
  String get navMarket => 'Маркет';

  @override
  String get navCreator => 'Автор';

  @override
  String get navWorkspace => 'Робочий простір';

  @override
  String get navAdmin => 'Адмін';

  @override
  String get authLogin => 'Увійти';

  @override
  String get authRegister => 'Зареєструватися';

  @override
  String get authPassword => 'Пароль';

  @override
  String get authOtp => 'Одноразовий код';

  @override
  String get authBack => 'Назад';

  @override
  String get authBackToWorld => 'Назад до світу';

  @override
  String get authCreateAccount => 'Створити акаунт';

  @override
  String get authContinue => 'Продовжити';

  @override
  String get authContinueWithPhone => 'Продовжити з телефоном';

  @override
  String get authContinueWithEmailOtp => 'Увійти кодом на пошту';

  @override
  String authContinueWithProvider(String provider) {
    return 'Продовжити з $provider';
  }

  @override
  String get authSignInToEcosystem => 'Увійдіть у свою AI-екосистему';

  @override
  String get authPhone => 'Телефон';

  @override
  String get authEmail => 'Електронна пошта';

  @override
  String get authEmailAddress => 'Електронна пошта';

  @override
  String get authPhoneNumber => 'Телефон';

  @override
  String get authSmsCode => 'Код з SMS';

  @override
  String get authEmailCode => 'Код з листа';

  @override
  String get authSendCode => 'Надіслати код';

  @override
  String get authResendCode => 'Надіслати код знову';

  @override
  String authSendAgainIn(int seconds) {
    return 'Надіслати знову через $seconds с';
  }

  @override
  String get authForgotPassword => 'Забули пароль?';

  @override
  String get authVerifyEmailAgain =>
      'Підтвердити пошту або надіслати лист ще раз';

  @override
  String get authDisplayName => 'Ім’я для профілю';

  @override
  String get authPasswordHelper => 'Щонайменше 12 символів';

  @override
  String get authCodeEmailChip => 'Код на пошту';

  @override
  String get authPasswordChip => 'Пароль';

  @override
  String get authPhoneUnavailable => 'Вхід за телефоном тимчасово недоступний.';

  @override
  String get authSmsInstruction => 'Ми надішлемо одноразовий код у SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Ми надішлемо одноразовий код на електронну пошту.';

  @override
  String get authWelcomeEyebrow => 'Ласкаво просимо до екосистеми';

  @override
  String get authWelcomeBody =>
      'Один вхід — у світ AI, Live, спільноти й творчості.';

  @override
  String get authOAuthOpenFailed => 'Не вдалося відкрити сторінку входу.';

  @override
  String get authOAuthProviderUnavailable =>
      'Провайдер недоступний. Спробуйте інший спосіб входу.';

  @override
  String get authMobileSocialPending =>
      'Соціальний вхід у мобільній збірці з’явиться після налаштування deep-link.';

  @override
  String get authReturnToLogin => 'Повернутися до входу';

  @override
  String get authMfaTitle => 'Двофакторна автентифікація';

  @override
  String get authMfaPrompt => 'Введіть код із застосунку-автентифікатора';

  @override
  String get authCode => 'Код';

  @override
  String get authConfirm => 'Підтвердити';

  @override
  String get authEmailVerificationTitle => 'Підтвердження пошти';

  @override
  String get authPasswordResetTitle => 'Скидання пароля';

  @override
  String get authRequestPasswordReset => 'Запросити скидання пароля';

  @override
  String get authRequestVerificationEmail => 'Надіслати лист підтвердження';

  @override
  String get authSendEmail => 'Надіслати лист';

  @override
  String get authVerifyWithToken => 'Підтвердити токеном';

  @override
  String get authSetNewPassword => 'Встановити новий пароль';

  @override
  String get authToken => 'Токен';

  @override
  String get authNewPassword => 'Новий пароль';

  @override
  String get authConfirmEmail => 'Підтвердити пошту';

  @override
  String get authResetPassword => 'Скинути пароль';

  @override
  String get commonOr => 'або';

  @override
  String get commonSave => 'Зберегти';

  @override
  String get commonCancel => 'Скасувати';

  @override
  String get commonRetry => 'Повторити';

  @override
  String get commonLoading => 'Завантаження';

  @override
  String get commonError => 'Помилка';

  @override
  String get commonOffline => 'Офлайн';

  @override
  String get commonTryAgain => 'Спробувати ще раз';

  @override
  String get commonSomethingWentWrong => 'Щось пішло не так';

  @override
  String get auraCompanionLabel => 'Aura · AI-компаньйон';

  @override
  String get auraGreeting => 'Aura готова допомогти.';

  @override
  String get auraListening => 'Aura слухає.';

  @override
  String get auraThinking => 'Aura думає.';

  @override
  String get settingsLanguage => 'Мова';

  @override
  String get settingsLanguageDescription =>
      'Оберіть мову застосунку на цьому пристрої.';

  @override
  String get settingsDisplayAccessibility => 'Вигляд і доступність';

  @override
  String get settingsLanguageEnglish => 'Англійська';

  @override
  String get settingsLanguageUkrainian => 'Українська';

  @override
  String get settingsLanguagePolish => 'Польська';

  @override
  String get settingsLanguageGerman => 'Німецька';

  @override
  String get settingsLanguageSpanish => 'Іспанська';

  @override
  String get settingsLanguageFrench => 'Французька';

  @override
  String get settingsLanguageItalian => 'Італійська';

  @override
  String get settingsLanguagePortuguese => 'Португальська';

  @override
  String get settingsLanguageJapanese => 'Японська';

  @override
  String get settingsLanguageKorean => 'Корейська';

  @override
  String get settingsLanguageChinese => 'Китайська';
}
