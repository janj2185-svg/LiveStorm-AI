// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Erstellen. Vernetzen. Live gehen.';

  @override
  String get appDescription =>
      'Eine soziale Plattform für Community, Geschenke, KI und Live-Momente.';

  @override
  String get navHome => 'Startseite';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => 'Live';

  @override
  String get navAi => 'KI';

  @override
  String get navGifts => 'Geschenke';

  @override
  String get navMessages => 'Nachrichten';

  @override
  String get navProfile => 'Profil';

  @override
  String get navSettings => 'Einstellungen';

  @override
  String get navMore => 'Mehr';

  @override
  String get navSearch => 'Suchen';

  @override
  String get navMarket => 'Markt';

  @override
  String get navCreator => 'Creator';

  @override
  String get navWorkspace => 'Arbeitsbereich';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'Anmelden';

  @override
  String get authRegister => 'Registrieren';

  @override
  String get authPassword => 'Passwort';

  @override
  String get authOtp => 'Einmalcode';

  @override
  String get authBack => 'Zurück';

  @override
  String get authBackToWorld => 'Zurück zur Welt';

  @override
  String get authCreateAccount => 'Konto erstellen';

  @override
  String get authContinue => 'Weiter';

  @override
  String get authContinueWithPhone => 'Mit Telefon fortfahren';

  @override
  String get authContinueWithEmailOtp => 'Mit E-Mail-Code anmelden';

  @override
  String authContinueWithProvider(String provider) {
    return 'Mit $provider fortfahren';
  }

  @override
  String get authSignInToEcosystem => 'Melde dich in deinem KI-Ökosystem an';

  @override
  String get authPhone => 'Telefon';

  @override
  String get authEmail => 'E-Mail';

  @override
  String get authEmailAddress => 'E-Mail-Adresse';

  @override
  String get authPhoneNumber => 'Telefon';

  @override
  String get authSmsCode => 'SMS-Code';

  @override
  String get authEmailCode => 'E-Mail-Code';

  @override
  String get authSendCode => 'Code senden';

  @override
  String get authResendCode => 'Code erneut senden';

  @override
  String authSendAgainIn(int seconds) {
    return 'In ${seconds}s erneut senden';
  }

  @override
  String get authForgotPassword => 'Passwort vergessen?';

  @override
  String get authVerifyEmailAgain =>
      'E-Mail verifizieren oder Nachricht erneut senden';

  @override
  String get authDisplayName => 'Anzeigename des Profils';

  @override
  String get authPasswordHelper => 'Mindestens 12 Zeichen';

  @override
  String get authCodeEmailChip => 'E-Mail-Code';

  @override
  String get authPasswordChip => 'Passwort';

  @override
  String get authPhoneUnavailable =>
      'Telefonanmeldung ist vorübergehend nicht verfügbar.';

  @override
  String get authSmsInstruction => 'Wir senden dir einen Einmalcode per SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Wir senden dir einen Einmalcode an deine E-Mail-Adresse.';

  @override
  String get authWelcomeEyebrow => 'Willkommen im Ökosystem';

  @override
  String get authWelcomeBody =>
      'Eine Anmeldung für KI, Live, Community und Kreativität.';

  @override
  String get authOAuthOpenFailed =>
      'Die Anmeldeseite konnte nicht geöffnet werden.';

  @override
  String get authOAuthProviderUnavailable =>
      'Dieser Anbieter ist nicht verfügbar. Probiere eine andere Anmeldemethode.';

  @override
  String get authMobileSocialPending =>
      'Social Sign-in in mobilen Builds erscheint nach der Deep-Link-Einrichtung.';

  @override
  String get authReturnToLogin => 'Zurück zur Anmeldung';

  @override
  String get authMfaTitle => 'Zwei-Faktor-Authentifizierung';

  @override
  String get authMfaPrompt => 'Gib den Code aus deiner Authenticator-App ein';

  @override
  String get authCode => 'Code';

  @override
  String get authConfirm => 'Bestätigen';

  @override
  String get authEmailVerificationTitle => 'E-Mail-Verifizierung';

  @override
  String get authPasswordResetTitle => 'Passwort zurücksetzen';

  @override
  String get authRequestPasswordReset => 'Passwort-Zurücksetzung anfordern';

  @override
  String get authRequestVerificationEmail => 'Verifizierungs-E-Mail senden';

  @override
  String get authSendEmail => 'E-Mail senden';

  @override
  String get authVerifyWithToken => 'Mit Token verifizieren';

  @override
  String get authSetNewPassword => 'Neues Passwort festlegen';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'Neues Passwort';

  @override
  String get authConfirmEmail => 'E-Mail bestätigen';

  @override
  String get authResetPassword => 'Passwort zurücksetzen';

  @override
  String get commonOr => 'oder';

  @override
  String get commonSave => 'Speichern';

  @override
  String get commonCancel => 'Abbrechen';

  @override
  String get commonRetry => 'Erneut versuchen';

  @override
  String get commonLoading => 'Wird geladen';

  @override
  String get commonError => 'Fehler';

  @override
  String get commonOffline => 'Offline';

  @override
  String get commonTryAgain => 'Erneut versuchen';

  @override
  String get commonSomethingWentWrong => 'Etwas ist schiefgelaufen';

  @override
  String get auraCompanionLabel => 'Aura · KI-Begleiter';

  @override
  String get auraGreeting => 'Aura ist bereit zu helfen.';

  @override
  String get auraListening => 'Aura hört zu.';

  @override
  String get auraThinking => 'Aura denkt nach.';

  @override
  String get settingsLanguage => 'Sprache';

  @override
  String get settingsLanguageDescription =>
      'Wähle die App-Sprache für dieses Gerät.';

  @override
  String get settingsDisplayAccessibility => 'Darstellung & Barrierefreiheit';

  @override
  String get settingsLanguageEnglish => 'Englisch';

  @override
  String get settingsLanguageUkrainian => 'Ukrainisch';

  @override
  String get settingsLanguagePolish => 'Polnisch';

  @override
  String get settingsLanguageGerman => 'Deutsch';

  @override
  String get settingsLanguageSpanish => 'Spanisch';

  @override
  String get settingsLanguageFrench => 'Französisch';

  @override
  String get settingsLanguageItalian => 'Italienisch';

  @override
  String get settingsLanguagePortuguese => 'Portugiesisch';

  @override
  String get settingsLanguageJapanese => 'Japanisch';

  @override
  String get settingsLanguageKorean => 'Koreanisch';

  @override
  String get settingsLanguageChinese => 'Chinesisch';
}
