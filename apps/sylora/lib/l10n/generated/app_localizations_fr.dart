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

  @override
  String get navFriends => 'Amis';

  @override
  String get feedTitle => 'Fil';

  @override
  String get feedSubtitle =>
      'Le pouls vivant de SYLORA — publications, amis et création.';

  @override
  String get feedEmpty => 'Votre fil est calme';

  @override
  String get feedEmptyMessage =>
      'Aucune publication publiée n’a été renvoyée. Publiez un message ou suivez des personnes pour façonner votre fil.';

  @override
  String get feedCreatePost => 'Créer une publication';

  @override
  String get feedLoadMore => 'Charger plus de publications';

  @override
  String get feedLoadingPosts => 'Chargement des publications…';

  @override
  String get feedLoadingMoreReason =>
      'La page suivante du fil est en cours de chargement.';

  @override
  String get feedRecommended => 'Recommandé';

  @override
  String get feedRecommendationsUnavailable => 'Recommandations indisponibles';

  @override
  String get feedRecommendationsEmpty =>
      'L’API n’a pas encore de recommandations.';

  @override
  String get feedPostBodyLabel => 'Publication en texte brut';

  @override
  String get feedPublishNow => 'Publier maintenant';

  @override
  String get feedSaveDraft => 'Enregistrer comme brouillon';

  @override
  String get feedPublish => 'Publier';

  @override
  String get friendsTitle => 'Amis';

  @override
  String get friendsRequests => 'Demandes';

  @override
  String get friendsSuggestions => 'Suggestions';

  @override
  String get friendsAccept => 'Accepter';

  @override
  String get friendsReject => 'Refuser';

  @override
  String get friendsUnfriend => 'Retirer des amis';

  @override
  String get friendsAddFriend => 'Ajouter un ami';

  @override
  String get friendsOnly => 'Amis uniquement';

  @override
  String get friendsOnline => 'En ligne';

  @override
  String get friendsMutual => 'Amis en commun';

  @override
  String get friendsSearchFriends => 'Rechercher des amis';

  @override
  String get friendsNoFriends => 'Aucun ami pour le moment';

  @override
  String get friendsPendingIncoming => 'Demandes reçues';

  @override
  String get friendsPendingOutgoing => 'Demandes envoyées';

  @override
  String get messagesTitle => 'Messages';

  @override
  String get messagesEmpty => 'Aucune conversation';

  @override
  String get messagesEmptyMessage =>
      'Aucun historique de conversation n’a été renvoyé. Démarrez-en une avec un identifiant public.';

  @override
  String get messagesTypeMessage => 'Message';

  @override
  String get messagesSend => 'Envoyer le message';

  @override
  String get messagesNewConversation => 'Nouvelle conversation';

  @override
  String get messagesRecipientHandle => 'Identifiant du destinataire';

  @override
  String get messagesStart => 'Démarrer';

  @override
  String get messagesConversationTitle => 'Conversation';

  @override
  String get messagesAcceptRequest => 'Accepter la demande de message';

  @override
  String get messagesDeclineRequest => 'Refuser la demande de message';

  @override
  String get moreTitle => 'Plus';

  @override
  String get moreSubtitle =>
      'Outils de compte et espaces de travail selon le rôle qui ne tiennent pas dans la navigation compacte.';

  @override
  String get moreOpenModule => 'Ouvrir le module';

  @override
  String get moreLearning => 'Apprentissage';

  @override
  String get moreWallet => 'Portefeuille';

  @override
  String get moreGifts => 'Cadeaux';

  @override
  String get moreAi => 'IA';

  @override
  String get moreLive => 'En direct';

  @override
  String get moreCreatorStudio => 'Studio créateur';

  @override
  String get moreCreator => 'Créateur';

  @override
  String get moreWorkspace => 'Espace de travail';

  @override
  String get moreAdmin => 'Administration';

  @override
  String get moreSettings => 'Paramètres';

  @override
  String get settingsProfile => 'Profil';

  @override
  String get settingsEditProfile => 'Modifier le profil';

  @override
  String get settingsNoPublicHandle => 'Aucun identifiant public';

  @override
  String get settingsAccountPrivacy => 'Confidentialité du compte et e-mail';

  @override
  String get settingsProductEmails => 'E-mails produit';

  @override
  String get settingsMarketingEmails => 'E-mails marketing';

  @override
  String get settingsSecurityEmails => 'E-mails de sécurité';

  @override
  String get settingsSecurityEmailDescription =>
      'Le backend peut imposer des avis critiques de sécurité.';

  @override
  String get settingsProfileVisibility => 'Visibilité du profil';

  @override
  String get settingsProfilePublic => 'Public';

  @override
  String get settingsProfilePrivate => 'Privé';

  @override
  String get settingsSecurity => 'Sécurité';

  @override
  String get settingsSessions => 'Sessions';

  @override
  String get settingsSignOut => 'Se déconnecter';

  @override
  String get settingsTheme => 'Thème';

  @override
  String get settingsThemeLight => 'Clair';

  @override
  String get settingsThemeDark => 'Sombre';

  @override
  String get settingsThemeSystem => 'Système';

  @override
  String get settingsNotifications => 'Notifications';

  @override
  String get settingsEnableNotifications => 'Activer les notifications';

  @override
  String get settingsNotificationsDescription =>
      'Le raccordement du jeton push natif peut utiliser cette préférence.';

  @override
  String get settingsHighContrast => 'Contraste élevé';

  @override
  String get settingsReducedMotion => 'Mouvement réduit';

  @override
  String settingsTextScale(String scale) {
    return 'Échelle du texte : $scale×';
  }

  @override
  String get settingsAuthenticatorApp => 'Application d’authentification';

  @override
  String get liveShortLabel => 'Live';

  @override
  String get aiShortLabel => 'IA';

  @override
  String get giftsShortLabel => 'Cadeaux';

  @override
  String get walletShortLabel => 'Portefeuille';

  @override
  String get conferencesTitle => 'Conférences';

  @override
  String get conferencesStart => 'Démarrer une conférence';

  @override
  String get conferencesJoin => 'Rejoindre la conférence';

  @override
  String get conferencesLeave => 'Quitter la conférence';

  @override
  String get conferencesInvite => 'Inviter';

  @override
  String get conferencesAuraAssist => 'Assistance Aura';

  @override
  String get commonPremiumEmpty => 'Aucun élément premium pour le moment';

  @override
  String get commonPremiumError => 'Impossible de charger le contenu premium.';

  @override
  String get commonPremiumRetry => 'Réessayer le premium';

  @override
  String get homeHeroEyebrow => 'VOTRE MONDE IA VIVANT';

  @override
  String get homeHeroBody =>
      'Créez, connectez et grandissez dans un réseau lumineux — IA, Live, amis et création.';

  @override
  String get homeModulesLabel => 'PORTAILS DE L\'ÉCOSYSTÈME';

  @override
  String get homeComposeHint => 'Partagez un signal avec l\'univers…';
}
