// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Créez. Connectez. Passez en direct.';

  @override
  String get appDescription =>
      'Une plateforme sociale pour la communauté, les cadeaux, l’IA et les moments en direct.';

  @override
  String get navHome => 'Accueil';

  @override
  String get navFeed => 'Fil';

  @override
  String get navLive => 'En direct';

  @override
  String get navAi => 'IA';

  @override
  String get navGifts => 'Cadeaux';

  @override
  String get navMessages => 'Messages';

  @override
  String get navProfile => 'Profil';

  @override
  String get navSettings => 'Paramètres';

  @override
  String get navMore => 'Plus';

  @override
  String get navSearch => 'Recherche';

  @override
  String get navMarket => 'Marché';

  @override
  String get navCreator => 'Créateur';

  @override
  String get navWorkspace => 'Espace de travail';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'Se connecter';

  @override
  String get authRegister => 'S’inscrire';

  @override
  String get authPassword => 'Mot de passe';

  @override
  String get authOtp => 'Code à usage unique';

  @override
  String get authBack => 'Retour';

  @override
  String get authBackToWorld => 'Retour au monde';

  @override
  String get authCreateAccount => 'Créer un compte';

  @override
  String get authContinue => 'Continuer';

  @override
  String get authContinueWithPhone => 'Continuer avec le téléphone';

  @override
  String get authContinueWithEmailOtp => 'Se connecter avec un code e-mail';

  @override
  String authContinueWithProvider(String provider) {
    return 'Continuer avec $provider';
  }

  @override
  String get authSignInToEcosystem => 'Connectez-vous à votre écosystème IA';

  @override
  String get authPhone => 'Téléphone';

  @override
  String get authEmail => 'E-mail';

  @override
  String get authEmailAddress => 'Adresse e-mail';

  @override
  String get authPhoneNumber => 'Téléphone';

  @override
  String get authSmsCode => 'Code SMS';

  @override
  String get authEmailCode => 'Code e-mail';

  @override
  String get authSendCode => 'Envoyer le code';

  @override
  String get authResendCode => 'Renvoyer le code';

  @override
  String authSendAgainIn(int seconds) {
    return 'Renvoyer dans ${seconds}s';
  }

  @override
  String get authForgotPassword => 'Mot de passe oublié ?';

  @override
  String get authVerifyEmailAgain => 'Vérifier l’e-mail ou renvoyer le message';

  @override
  String get authDisplayName => 'Nom d’affichage du profil';

  @override
  String get authPasswordHelper => 'Au moins 12 caractères';

  @override
  String get authCodeEmailChip => 'Code e-mail';

  @override
  String get authPasswordChip => 'Mot de passe';

  @override
  String get authPhoneUnavailable =>
      'La connexion par téléphone est temporairement indisponible.';

  @override
  String get authSmsInstruction =>
      'Nous enverrons un code à usage unique par SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Nous enverrons un code à usage unique à votre e-mail.';

  @override
  String get authWelcomeEyebrow => 'Bienvenue dans l’écosystème';

  @override
  String get authWelcomeBody =>
      'Une seule connexion pour l’IA, le Live, la communauté et la créativité.';

  @override
  String get authOAuthOpenFailed => 'Impossible d’ouvrir la page de connexion.';

  @override
  String get authOAuthProviderUnavailable =>
      'Ce fournisseur est indisponible. Essayez une autre méthode de connexion.';

  @override
  String get authMobileSocialPending =>
      'La connexion sociale dans les builds mobiles apparaîtra après la configuration des liens profonds.';

  @override
  String get authReturnToLogin => 'Retour à la connexion';

  @override
  String get authMfaTitle => 'Authentification à deux facteurs';

  @override
  String get authMfaPrompt =>
      'Saisissez le code de votre application d’authentification';

  @override
  String get authCode => 'Code';

  @override
  String get authConfirm => 'Confirmer';

  @override
  String get authEmailVerificationTitle => 'Vérification de l’e-mail';

  @override
  String get authPasswordResetTitle => 'Réinitialisation du mot de passe';

  @override
  String get authRequestPasswordReset =>
      'Demander la réinitialisation du mot de passe';

  @override
  String get authRequestVerificationEmail => 'Envoyer l’e-mail de vérification';

  @override
  String get authSendEmail => 'Envoyer l’e-mail';

  @override
  String get authVerifyWithToken => 'Vérifier avec un token';

  @override
  String get authSetNewPassword => 'Définir un nouveau mot de passe';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'Nouveau mot de passe';

  @override
  String get authConfirmEmail => 'Confirmer l’e-mail';

  @override
  String get authResetPassword => 'Réinitialiser le mot de passe';

  @override
  String get commonOr => 'ou';

  @override
  String get commonSave => 'Enregistrer';

  @override
  String get commonCancel => 'Annuler';

  @override
  String get commonRetry => 'Réessayer';

  @override
  String get commonLoading => 'Chargement';

  @override
  String get commonError => 'Erreur';

  @override
  String get commonOffline => 'Hors ligne';

  @override
  String get commonTryAgain => 'Réessayer';

  @override
  String get commonSomethingWentWrong => 'Un problème est survenu';

  @override
  String get auraCompanionLabel => 'Aura · compagnon IA';

  @override
  String get auraGreeting => 'Aura est prête à aider.';

  @override
  String get auraListening => 'Aura écoute.';

  @override
  String get auraThinking => 'Aura réfléchit.';

  @override
  String get settingsLanguage => 'Langue';

  @override
  String get settingsLanguageDescription =>
      'Choisissez la langue de l’app utilisée sur cet appareil.';

  @override
  String get settingsDisplayAccessibility => 'Affichage et accessibilité';

  @override
  String get settingsLanguageEnglish => 'Anglais';

  @override
  String get settingsLanguageUkrainian => 'Ukrainien';

  @override
  String get settingsLanguagePolish => 'Polonais';

  @override
  String get settingsLanguageGerman => 'Allemand';

  @override
  String get settingsLanguageSpanish => 'Espagnol';

  @override
  String get settingsLanguageFrench => 'Français';

  @override
  String get settingsLanguageItalian => 'Italien';

  @override
  String get settingsLanguagePortuguese => 'Portugais';

  @override
  String get settingsLanguageJapanese => 'Japonais';

  @override
  String get settingsLanguageKorean => 'Coréen';

  @override
  String get settingsLanguageChinese => 'Chinois';
}
