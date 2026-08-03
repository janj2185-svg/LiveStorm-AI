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

  @override
  String get navFriends => 'Freunde';

  @override
  String get feedTitle => 'Feed';

  @override
  String get feedSubtitle =>
      'Der lebendige Puls von SYLORA — Beiträge, Freunde und Kreativität.';

  @override
  String get feedEmpty => 'In deinem Feed ist es ruhig';

  @override
  String get feedEmptyMessage =>
      'Es wurden keine veröffentlichten Beiträge zurückgegeben. Veröffentliche einen Beitrag oder folge Personen, um deinen Feed zu gestalten.';

  @override
  String get feedCreatePost => 'Beitrag erstellen';

  @override
  String get feedLoadMore => 'Mehr Beiträge laden';

  @override
  String get feedLoadingPosts => 'Beiträge werden geladen…';

  @override
  String get feedLoadingMoreReason => 'Die nächste Feed-Seite wird geladen.';

  @override
  String get feedRecommended => 'Empfohlen';

  @override
  String get feedRecommendationsUnavailable => 'Empfehlungen nicht verfügbar';

  @override
  String get feedRecommendationsEmpty => 'Die API hat noch keine Empfehlungen.';

  @override
  String get feedPostBodyLabel => 'Textbeitrag';

  @override
  String get feedPublishNow => 'Jetzt veröffentlichen';

  @override
  String get feedSaveDraft => 'Als Entwurf speichern';

  @override
  String get feedPublish => 'Veröffentlichen';

  @override
  String get friendsTitle => 'Freunde';

  @override
  String get friendsRequests => 'Anfragen';

  @override
  String get friendsSuggestions => 'Vorschläge';

  @override
  String get friendsAccept => 'Annehmen';

  @override
  String get friendsReject => 'Ablehnen';

  @override
  String get friendsUnfriend => 'Freund entfernen';

  @override
  String get friendsAddFriend => 'Freund hinzufügen';

  @override
  String get friendsOnly => 'Nur Freunde';

  @override
  String get friendsOnline => 'Online';

  @override
  String get friendsMutual => 'Gemeinsame Freunde';

  @override
  String get friendsSearchFriends => 'Freunde suchen';

  @override
  String get friendsNoFriends => 'Noch keine Freunde';

  @override
  String get friendsPendingIncoming => 'Eingehende Anfragen';

  @override
  String get friendsPendingOutgoing => 'Ausgehende Anfragen';

  @override
  String get messagesTitle => 'Nachrichten';

  @override
  String get messagesEmpty => 'Keine Unterhaltungen';

  @override
  String get messagesEmptyMessage =>
      'Es wurde kein Gesprächsverlauf zurückgegeben. Starte eine Unterhaltung mit einem öffentlichen Handle.';

  @override
  String get messagesTypeMessage => 'Nachricht';

  @override
  String get messagesSend => 'Nachricht senden';

  @override
  String get messagesNewConversation => 'Neue Unterhaltung';

  @override
  String get messagesRecipientHandle => 'Handle des Empfängers';

  @override
  String get messagesStart => 'Starten';

  @override
  String get messagesConversationTitle => 'Unterhaltung';

  @override
  String get messagesAcceptRequest => 'Nachrichtenanfrage annehmen';

  @override
  String get messagesDeclineRequest => 'Nachrichtenanfrage ablehnen';

  @override
  String get moreTitle => 'Mehr';

  @override
  String get moreSubtitle =>
      'Kontowerkzeuge und rollenabhängige Arbeitsbereiche, die nicht in die kompakte Navigation passen.';

  @override
  String get moreOpenModule => 'Modul öffnen';

  @override
  String get moreLearning => 'Lernen';

  @override
  String get moreWallet => 'Wallet';

  @override
  String get moreGifts => 'Geschenke';

  @override
  String get moreAi => 'KI';

  @override
  String get moreLive => 'Live';

  @override
  String get moreCreatorStudio => 'Creator Studio';

  @override
  String get moreCreator => 'Creator';

  @override
  String get moreWorkspace => 'Arbeitsbereich';

  @override
  String get moreAdmin => 'Administration';

  @override
  String get moreSettings => 'Einstellungen';

  @override
  String get settingsProfile => 'Profil';

  @override
  String get settingsEditProfile => 'Profil bearbeiten';

  @override
  String get settingsNoPublicHandle => 'Kein öffentliches Handle';

  @override
  String get settingsAccountPrivacy => 'Kontoprivatsphäre & E-Mail';

  @override
  String get settingsProductEmails => 'Produkt-E-Mails';

  @override
  String get settingsMarketingEmails => 'Marketing-E-Mails';

  @override
  String get settingsSecurityEmails => 'Sicherheits-E-Mails';

  @override
  String get settingsSecurityEmailDescription =>
      'Das Backend kann sicherheitskritische Hinweise erzwingen.';

  @override
  String get settingsProfileVisibility => 'Profilsichtbarkeit';

  @override
  String get settingsProfilePublic => 'Öffentlich';

  @override
  String get settingsProfilePrivate => 'Privat';

  @override
  String get settingsSecurity => 'Sicherheit';

  @override
  String get settingsSessions => 'Sitzungen';

  @override
  String get settingsSignOut => 'Abmelden';

  @override
  String get settingsTheme => 'Design';

  @override
  String get settingsThemeLight => 'Hell';

  @override
  String get settingsThemeDark => 'Dunkel';

  @override
  String get settingsThemeSystem => 'System';

  @override
  String get settingsNotifications => 'Benachrichtigungen';

  @override
  String get settingsEnableNotifications => 'Benachrichtigungen aktivieren';

  @override
  String get settingsNotificationsDescription =>
      'Die native Push-Token-Anbindung kann diese Einstellung verwenden.';

  @override
  String get settingsHighContrast => 'Hoher Kontrast';

  @override
  String get settingsReducedMotion => 'Reduzierte Bewegung';

  @override
  String settingsTextScale(String scale) {
    return 'Textskalierung: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => 'Authenticator-App';

  @override
  String get liveShortLabel => 'Live';

  @override
  String get aiShortLabel => 'KI';

  @override
  String get giftsShortLabel => 'Geschenke';

  @override
  String get walletShortLabel => 'Wallet';

  @override
  String get conferencesTitle => 'Konferenzen';

  @override
  String get conferencesStart => 'Konferenz starten';

  @override
  String get conferencesJoin => 'Konferenz beitreten';

  @override
  String get conferencesLeave => 'Konferenz verlassen';

  @override
  String get conferencesInvite => 'Einladen';

  @override
  String get conferencesAuraAssist => 'Aura-Unterstützung';

  @override
  String get commonPremiumEmpty => 'Noch keine Premium-Elemente';

  @override
  String get commonPremiumError =>
      'Premium-Inhalte konnten nicht geladen werden.';

  @override
  String get commonPremiumRetry => 'Premium erneut versuchen';

  @override
  String get homeHeroEyebrow => 'DEINE LEBENDIGE KI-WELT';

  @override
  String get homeHeroBody =>
      'Erschaffe, verbinde und wachse in einem leuchtenden Netzwerk — KI, Live, Freunde und Kreativität.';

  @override
  String get homeModulesLabel => 'ÖKOSYSTEM-PORTALE';

  @override
  String get homeComposeHint => 'Teile ein Signal mit dem Universum…';
}
