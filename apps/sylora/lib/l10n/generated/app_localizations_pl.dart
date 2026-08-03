// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Polish (`pl`).
class AppLocalizationsPl extends AppLocalizations {
  AppLocalizationsPl([String locale = 'pl']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Twórz. Łącz. Nadawaj na żywo.';

  @override
  String get appDescription =>
      'Platforma społecznościowa dla społeczności, prezentów, AI i chwil na żywo.';

  @override
  String get navHome => 'Strona główna';

  @override
  String get navFeed => 'Aktualności';

  @override
  String get navLive => 'Na żywo';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => 'Prezenty';

  @override
  String get navMessages => 'Wiadomości';

  @override
  String get navProfile => 'Profil';

  @override
  String get navSettings => 'Ustawienia';

  @override
  String get navMore => 'Więcej';

  @override
  String get navSearch => 'Szukaj';

  @override
  String get navMarket => 'Rynek';

  @override
  String get navCreator => 'Twórca';

  @override
  String get navWorkspace => 'Obszar roboczy';

  @override
  String get navAdmin => 'Administrator';

  @override
  String get authLogin => 'Zaloguj się';

  @override
  String get authRegister => 'Zarejestruj się';

  @override
  String get authPassword => 'Hasło';

  @override
  String get authOtp => 'Kod jednorazowy';

  @override
  String get authBack => 'Wstecz';

  @override
  String get authBackToWorld => 'Wróć do świata';

  @override
  String get authCreateAccount => 'Utwórz konto';

  @override
  String get authContinue => 'Kontynuuj';

  @override
  String get authContinueWithPhone => 'Kontynuuj przez telefon';

  @override
  String get authContinueWithEmailOtp => 'Zaloguj się kodem e-mail';

  @override
  String authContinueWithProvider(String provider) {
    return 'Kontynuuj z $provider';
  }

  @override
  String get authSignInToEcosystem => 'Zaloguj się do swojego ekosystemu AI';

  @override
  String get authPhone => 'Telefon';

  @override
  String get authEmail => 'E-mail';

  @override
  String get authEmailAddress => 'Adres e-mail';

  @override
  String get authPhoneNumber => 'Telefon';

  @override
  String get authSmsCode => 'Kod SMS';

  @override
  String get authEmailCode => 'Kod e-mail';

  @override
  String get authSendCode => 'Wyślij kod';

  @override
  String get authResendCode => 'Wyślij kod ponownie';

  @override
  String authSendAgainIn(int seconds) {
    return 'Wyślij ponownie za ${seconds}s';
  }

  @override
  String get authForgotPassword => 'Nie pamiętasz hasła?';

  @override
  String get authVerifyEmailAgain =>
      'Zweryfikuj e-mail albo wyślij wiadomość ponownie';

  @override
  String get authDisplayName => 'Nazwa wyświetlana profilu';

  @override
  String get authPasswordHelper => 'Co najmniej 12 znaków';

  @override
  String get authCodeEmailChip => 'Kod e-mail';

  @override
  String get authPasswordChip => 'Hasło';

  @override
  String get authPhoneUnavailable =>
      'Logowanie telefonem jest tymczasowo niedostępne.';

  @override
  String get authSmsInstruction => 'Wyślemy jednorazowy kod SMS-em.';

  @override
  String get authEmailOtpInstruction =>
      'Wyślemy jednorazowy kod na Twój e-mail.';

  @override
  String get authWelcomeEyebrow => 'Witamy w ekosystemie';

  @override
  String get authWelcomeBody =>
      'Jedno logowanie do AI, Live, społeczności i kreatywności.';

  @override
  String get authOAuthOpenFailed => 'Nie można otworzyć strony logowania.';

  @override
  String get authOAuthProviderUnavailable =>
      'Ten dostawca jest niedostępny. Spróbuj innej metody logowania.';

  @override
  String get authMobileSocialPending =>
      'Logowanie społecznościowe w aplikacjach mobilnych pojawi się po konfiguracji deep linków.';

  @override
  String get authReturnToLogin => 'Wróć do logowania';

  @override
  String get authMfaTitle => 'Uwierzytelnianie dwuskładnikowe';

  @override
  String get authMfaPrompt => 'Wpisz kod z aplikacji uwierzytelniającej';

  @override
  String get authCode => 'Kod';

  @override
  String get authConfirm => 'Potwierdź';

  @override
  String get authEmailVerificationTitle => 'Weryfikacja e-maila';

  @override
  String get authPasswordResetTitle => 'Resetowanie hasła';

  @override
  String get authRequestPasswordReset => 'Poproś o reset hasła';

  @override
  String get authRequestVerificationEmail => 'Wyślij e-mail weryfikacyjny';

  @override
  String get authSendEmail => 'Wyślij e-mail';

  @override
  String get authVerifyWithToken => 'Zweryfikuj tokenem';

  @override
  String get authSetNewPassword => 'Ustaw nowe hasło';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'Nowe hasło';

  @override
  String get authConfirmEmail => 'Potwierdź e-mail';

  @override
  String get authResetPassword => 'Zresetuj hasło';

  @override
  String get commonOr => 'lub';

  @override
  String get commonSave => 'Zapisz';

  @override
  String get commonCancel => 'Anuluj';

  @override
  String get commonRetry => 'Ponów';

  @override
  String get commonLoading => 'Ładowanie';

  @override
  String get commonError => 'Błąd';

  @override
  String get commonOffline => 'Offline';

  @override
  String get commonTryAgain => 'Spróbuj ponownie';

  @override
  String get commonSomethingWentWrong => 'Coś poszło nie tak';

  @override
  String get auraCompanionLabel => 'Aura · towarzysz AI';

  @override
  String get auraGreeting => 'Aura jest gotowa pomóc.';

  @override
  String get auraListening => 'Aura słucha.';

  @override
  String get auraThinking => 'Aura myśli.';

  @override
  String get settingsLanguage => 'Język';

  @override
  String get settingsLanguageDescription =>
      'Wybierz język aplikacji używany na tym urządzeniu.';

  @override
  String get settingsDisplayAccessibility => 'Wygląd i dostępność';

  @override
  String get settingsLanguageEnglish => 'Angielski';

  @override
  String get settingsLanguageUkrainian => 'Ukraiński';

  @override
  String get settingsLanguagePolish => 'Polski';

  @override
  String get settingsLanguageGerman => 'Niemiecki';

  @override
  String get settingsLanguageSpanish => 'Hiszpański';

  @override
  String get settingsLanguageFrench => 'Francuski';

  @override
  String get settingsLanguageItalian => 'Włoski';

  @override
  String get settingsLanguagePortuguese => 'Portugalski';

  @override
  String get settingsLanguageJapanese => 'Japoński';

  @override
  String get settingsLanguageKorean => 'Koreański';

  @override
  String get settingsLanguageChinese => 'Chiński';
}
