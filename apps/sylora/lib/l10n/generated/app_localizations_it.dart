// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Italian (`it`).
class AppLocalizationsIt extends AppLocalizations {
  AppLocalizationsIt([String locale = 'it']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Crea. Connettiti. Vai live.';

  @override
  String get appDescription =>
      'Una piattaforma social per community, regali, AI e momenti live.';

  @override
  String get navHome => 'Home';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => 'Live';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => 'Regali';

  @override
  String get navMessages => 'Messaggi';

  @override
  String get navProfile => 'Profilo';

  @override
  String get navSettings => 'Impostazioni';

  @override
  String get navMore => 'Altro';

  @override
  String get navSearch => 'Cerca';

  @override
  String get navMarket => 'Mercato';

  @override
  String get navCreator => 'Creator';

  @override
  String get navWorkspace => 'Area di lavoro';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'Accedi';

  @override
  String get authRegister => 'Registrati';

  @override
  String get authPassword => 'Password';

  @override
  String get authOtp => 'Codice monouso';

  @override
  String get authBack => 'Indietro';

  @override
  String get authBackToWorld => 'Torna al mondo';

  @override
  String get authCreateAccount => 'Crea account';

  @override
  String get authContinue => 'Continua';

  @override
  String get authContinueWithPhone => 'Continua con telefono';

  @override
  String get authContinueWithEmailOtp => 'Accedi con un codice email';

  @override
  String authContinueWithProvider(String provider) {
    return 'Continua con $provider';
  }

  @override
  String get authSignInToEcosystem => 'Accedi al tuo ecosistema AI';

  @override
  String get authPhone => 'Telefono';

  @override
  String get authEmail => 'Email';

  @override
  String get authEmailAddress => 'Indirizzo email';

  @override
  String get authPhoneNumber => 'Telefono';

  @override
  String get authSmsCode => 'Codice SMS';

  @override
  String get authEmailCode => 'Codice email';

  @override
  String get authSendCode => 'Invia codice';

  @override
  String get authResendCode => 'Invia di nuovo il codice';

  @override
  String authSendAgainIn(int seconds) {
    return 'Invia di nuovo tra ${seconds}s';
  }

  @override
  String get authForgotPassword => 'Hai dimenticato la password?';

  @override
  String get authVerifyEmailAgain =>
      'Verifica l\'email o invia di nuovo il messaggio';

  @override
  String get authDisplayName => 'Nome visualizzato del profilo';

  @override
  String get authPasswordHelper => 'Almeno 12 caratteri';

  @override
  String get authCodeEmailChip => 'Codice email';

  @override
  String get authPasswordChip => 'Password';

  @override
  String get authPhoneUnavailable =>
      'L\'accesso con telefono è temporaneamente non disponibile.';

  @override
  String get authSmsInstruction => 'Ti invieremo un codice monouso via SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Ti invieremo un codice monouso alla tua email.';

  @override
  String get authWelcomeEyebrow => 'Benvenuto nell\'ecosistema';

  @override
  String get authWelcomeBody =>
      'Un solo accesso per AI, Live, community e creatività.';

  @override
  String get authOAuthOpenFailed => 'Impossibile aprire la pagina di accesso.';

  @override
  String get authOAuthProviderUnavailable =>
      'Questo provider non è disponibile. Prova un altro metodo di accesso.';

  @override
  String get authMobileSocialPending =>
      'L\'accesso social nelle build mobile apparirà dopo la configurazione dei deep link.';

  @override
  String get authReturnToLogin => 'Torna all\'accesso';

  @override
  String get authMfaTitle => 'Autenticazione a due fattori';

  @override
  String get authMfaPrompt =>
      'Inserisci il codice della tua app di autenticazione';

  @override
  String get authCode => 'Codice';

  @override
  String get authConfirm => 'Conferma';

  @override
  String get authEmailVerificationTitle => 'Verifica email';

  @override
  String get authPasswordResetTitle => 'Reimpostazione password';

  @override
  String get authRequestPasswordReset => 'Richiedi reimpostazione password';

  @override
  String get authRequestVerificationEmail => 'Invia email di verifica';

  @override
  String get authSendEmail => 'Invia email';

  @override
  String get authVerifyWithToken => 'Verifica con token';

  @override
  String get authSetNewPassword => 'Imposta una nuova password';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'Nuova password';

  @override
  String get authConfirmEmail => 'Conferma email';

  @override
  String get authResetPassword => 'Reimposta password';

  @override
  String get commonOr => 'oppure';

  @override
  String get commonSave => 'Salva';

  @override
  String get commonCancel => 'Annulla';

  @override
  String get commonRetry => 'Riprova';

  @override
  String get commonLoading => 'Caricamento';

  @override
  String get commonError => 'Errore';

  @override
  String get commonOffline => 'Offline';

  @override
  String get commonTryAgain => 'Prova di nuovo';

  @override
  String get commonSomethingWentWrong => 'Qualcosa è andato storto';

  @override
  String get auraCompanionLabel => 'Aura · compagna AI';

  @override
  String get auraGreeting => 'Aura è pronta ad aiutare.';

  @override
  String get auraListening => 'Aura sta ascoltando.';

  @override
  String get auraThinking => 'Aura sta pensando.';

  @override
  String get settingsLanguage => 'Lingua';

  @override
  String get settingsLanguageDescription =>
      'Scegli la lingua dell\'app usata su questo dispositivo.';

  @override
  String get settingsDisplayAccessibility => 'Display e accessibilità';

  @override
  String get settingsLanguageEnglish => 'Inglese';

  @override
  String get settingsLanguageUkrainian => 'Ucraino';

  @override
  String get settingsLanguagePolish => 'Polacco';

  @override
  String get settingsLanguageGerman => 'Tedesco';

  @override
  String get settingsLanguageSpanish => 'Spagnolo';

  @override
  String get settingsLanguageFrench => 'Francese';

  @override
  String get settingsLanguageItalian => 'Italiano';

  @override
  String get settingsLanguagePortuguese => 'Portoghese';

  @override
  String get settingsLanguageJapanese => 'Giapponese';

  @override
  String get settingsLanguageKorean => 'Coreano';

  @override
  String get settingsLanguageChinese => 'Cinese';
}
