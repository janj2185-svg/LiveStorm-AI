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

  @override
  String get searchTitle => 'Entdecken';

  @override
  String get searchSubtitle =>
      'Finde Menschen, Beiträge und Communities im lebendigen Netzwerk.';

  @override
  String get searchHint => 'SYLORA suchen';

  @override
  String get searchFindPeople => 'Netzwerk entdecken';

  @override
  String get searchFindPeopleMessage =>
      'Gib mindestens zwei Zeichen ein, um zu suchen.';

  @override
  String get searchFocus => 'Suche fokussieren';

  @override
  String get searchNoResults => 'Keine Treffer';

  @override
  String get searchNoResultsMessage =>
      'Nichts gefunden. Versuche einen anderen Begriff.';

  @override
  String get searchEdit => 'Suche bearbeiten';

  @override
  String get searchMinChars => 'Mindestens zwei Zeichen eingeben.';

  @override
  String get searchPeople => 'Menschen';

  @override
  String get searchPosts => 'Beiträge';

  @override
  String get searchCommunities => 'Communities';

  @override
  String get searchHeroEyebrow => 'ENTDECKEN';

  @override
  String get messagesSubtitle => 'Direkte Signale, Anfragen und Gespräche.';

  @override
  String get messagesHeroEyebrow => 'POSTEINGANG';

  @override
  String get messagesHeroBody => 'Private Threads mit cinematic Presence.';

  @override
  String get messagesRequestBadge => 'Anfrage';

  @override
  String get friendsSubtitle =>
      'Echte Freundschaften, Anfragen und Vorschläge.';

  @override
  String get profileSubtitle =>
      'Öffentliches Profil und Beziehungssteuerungen.';

  @override
  String get profileFollow => 'Folgen';

  @override
  String get profileUnfollow => 'Entfolgen';

  @override
  String get profileMessage => 'Nachricht';

  @override
  String get profileMute => 'Stummschalten';

  @override
  String get profileBlock => 'Blockieren';

  @override
  String get profileMuted => 'Konto stummgeschaltet.';

  @override
  String get notificationsTitle => 'Benachrichtigungen';

  @override
  String get notificationsReadAll => 'Alle gelesen';

  @override
  String get notificationsEmpty => 'Keine Benachrichtigungen';

  @override
  String get notificationsEmptyMessage => 'Signale erscheinen hier.';

  @override
  String get notificationsMuteType => 'Diesen Typ stummschalten';

  @override
  String get moreHeroEyebrow => 'DEIN HUB';

  @override
  String get moreHeroBody =>
      'Wallet, Live, Aura, Lernen und Creator-Tools — eine Oberfläche.';

  @override
  String get moreQuickActions => 'SCHNELLAKTIONEN';

  @override
  String get moreConferences => 'Konferenzen';

  @override
  String get moreGoLive => 'Live gehen';

  @override
  String get moreOpenWallet => 'Wallet';

  @override
  String get moreEditProfile => 'Profil bearbeiten';

  @override
  String get liveTitle => 'Live';

  @override
  String get liveSubtitle =>
      'Live mit WHIP, OBS oder Studio — nur echte Integrationen.';

  @override
  String get liveHeroEyebrow => 'BROADCAST';

  @override
  String get liveHeroBody => 'Session starten und Creator Studio öffnen.';

  @override
  String get liveIntegrations => 'Integrationen';

  @override
  String get liveSessions => 'Sessions';

  @override
  String get liveCreateSession => 'Session erstellen';

  @override
  String get liveNoSessions => 'Keine Live-Sessions';

  @override
  String get liveNoSessionsMessage =>
      'Erstelle eine Session für einen einmaligen Stream-Key.';

  @override
  String get liveOpenStudio => 'Creator Studio öffnen';

  @override
  String get liveGoLive => 'Live gehen';

  @override
  String get liveSessionTitle => 'Sessiontitel';

  @override
  String get liveCopyStreamKey => 'Stream-Key jetzt kopieren';

  @override
  String get liveStreamKeyOnce => 'Dieser Schlüssel wird nur einmal angezeigt.';

  @override
  String get liveCopyClose => 'Kopieren und schließen';

  @override
  String get liveHealthCheck => 'Health-Check';

  @override
  String get commonRefresh => 'Aktualisieren';

  @override
  String get commonCreate => 'Erstellen';

  @override
  String get walletTitle => 'Wallet';

  @override
  String get walletSubtitle =>
      'Balances, top-ups, payouts, and your immutable ledger.';

  @override
  String get walletHeroEyebrow => 'VALUE';

  @override
  String get walletHeroBody =>
      'Spendable credits and creator earnings in one luminous vault.';

  @override
  String get walletSpendable => 'Spendable';

  @override
  String get walletCreatorEarnings => 'Creator earnings';

  @override
  String get walletTopUp => 'Top up';

  @override
  String get walletPayout => 'Payout';

  @override
  String get walletHistory => 'Transaction history';

  @override
  String get walletNoActivity => 'No wallet activity';

  @override
  String get walletNoActivityMessage =>
      'When you top up or earn, ledger entries appear here.';

  @override
  String get giftsTitle => 'Gifts';

  @override
  String get giftsSubtitle => 'Catalog, inventory, and living gift moments.';

  @override
  String get giftsHeroEyebrow => 'GIFTING';

  @override
  String get giftsHeroBody =>
      'Rare to ultra-premium — send, collect, and celebrate in motion.';

  @override
  String get giftsCatalog => 'Catalog';

  @override
  String get giftsInventory => 'Inventory';

  @override
  String get giftsEvents => 'Events';

  @override
  String get giftsPreferences => 'Gift preferences';

  @override
  String get giftsAuthoring => 'Gift authoring';

  @override
  String get giftsEmpty => 'No gifts available';

  @override
  String get giftsEmptyMessage =>
      'Publish READY gifts from Gift Studio to fill the catalog.';

  @override
  String get aiTitle => 'AI';

  @override
  String get aiSubtitle =>
      'Aura conversations, memory, moderation, and generation.';

  @override
  String get aiHeroEyebrow => 'AURA';

  @override
  String get aiHeroBody =>
      'Provider-backed intelligence with consent-first privacy.';

  @override
  String get aiOnline => 'Aura online';

  @override
  String get aiConsentTitle => 'AI requires your consent';

  @override
  String get aiConsentBody =>
      'Consent enables provider-backed AI requests. Memory stays off until you enable it.';

  @override
  String get aiGrantConsent => 'Grant AI consent';

  @override
  String get aiConversations => 'Conversations';

  @override
  String get aiMemory => 'Memory';

  @override
  String get creatorStudioTitle => 'Creator Studio';

  @override
  String get creatorStudioSubtitle =>
      'Browser WHIP publishing with OBS as the companion path.';

  @override
  String get creatorStudioHeroEyebrow => 'STUDIO';

  @override
  String get creatorStudioHeroBody =>
      'Preview, publish, overlays, and guests — one control surface.';

  @override
  String get creatorStudioOpenLive => 'Open Live';

  @override
  String get settingsHeroEyebrow => 'ACCOUNT';

  @override
  String get settingsHeroBody =>
      'Profile, privacy, language, and security — tuned for every device.';

  @override
  String get conferencesSubtitle =>
      'Business and education rooms with media readiness and Aura support.';

  @override
  String get conferencesCreateRoom => 'Create room';

  @override
  String get conferencesCreateDialogTitle => 'Create conference room';

  @override
  String get conferencesRoomTitleLabel => 'Title';

  @override
  String get conferencesRoomTitleHint => 'Weekly planning or algebra studio';

  @override
  String get conferencesPurposeLabel => 'Purpose';

  @override
  String get conferencesPurposeBusiness => 'Business';

  @override
  String get conferencesPurposeEducation => 'Education';

  @override
  String get conferencesPurposeSocial => 'Social';

  @override
  String get conferencesRoomScreenTitle => 'Conference room';

  @override
  String get conferencesRoomScreenSubtitle =>
      'Join with camera preview and publish through the configured media plane.';

  @override
  String get conferencesTranslationActive => 'AI translation active';

  @override
  String get conferencesAiLabel => 'AI';

  @override
  String get conferencesCaptions => 'Captions';

  @override
  String get conferencesMediaReady =>
      'Media plane is ready for WHIP publishing.';

  @override
  String get conferencesMediaWaiting =>
      'Awaiting the configured MediaMTX media plane.';

  @override
  String get conferencesPreviewUnavailable =>
      'Camera preview is unavailable on this platform. Use OBS or a companion device.';

  @override
  String get conferencesPreviewLive => 'Camera and microphone preview is live.';

  @override
  String get conferencesMicrophoneMuted => 'Microphone muted.';

  @override
  String get conferencesMicrophoneUnmuted => 'Microphone unmuted.';

  @override
  String get conferencesCameraDisabled => 'Camera disabled.';

  @override
  String get conferencesCameraEnabled => 'Camera enabled.';

  @override
  String get conferencesScreenShareActive => 'Screen share is publishing.';

  @override
  String get conferencesScreenShareStopped => 'Screen share stopped.';

  @override
  String get conferencesCaptionsUnavailable =>
      'Short clip captions use MediaRecorder on SYLORA web. Open this room in a browser to record and transcribe.';

  @override
  String get conferencesCaptionsRecording =>
      'Recording a short microphone clip… tap “Stop & transcribe” when ready.';

  @override
  String get conferencesCaptionsTranscribing =>
      'Transcribing the recorded clip…';

  @override
  String get conferencesCaptionsNoSpeech =>
      'No speech was detected in that clip.';

  @override
  String get conferencesAuraResponded => 'Aura responded.';

  @override
  String conferencesActiveParticipants(int count) {
    return '$count active';
  }

  @override
  String get conferencesOpen => 'Open';

  @override
  String conferencesJoinCode(String code) {
    return 'Join code $code';
  }

  @override
  String get conferencesMediaPreview => 'Media preview';

  @override
  String get conferencesMediaSupported =>
      'This build can request camera and microphone preview and publish over WHIP when MediaMTX is ready.';

  @override
  String get conferencesMediaUnsupported =>
      'Camera preview is unavailable on this build. Use OBS or a companion browser device for publishing.';

  @override
  String conferencesMediaPlane(String reason) {
    return 'Media plane: $reason';
  }

  @override
  String get conferencesStartPreview => 'Start preview';

  @override
  String get conferencesPublishWhip => 'Publish WHIP';

  @override
  String get conferencesRefreshMedia => 'Refresh media';

  @override
  String get conferencesAuraDescription =>
      'Ask for meeting summaries, classroom prompts, agenda help, or follow-up wording.';

  @override
  String get conferencesAskAura => 'Ask Aura';

  @override
  String get conferencesAskAuraHint => 'Turn this discussion into next steps…';

  @override
  String get conferencesEmptyTitle => 'No conference rooms yet';

  @override
  String get conferencesEmptyMessage =>
      'Create a business or education room to start a focused video session.';

  @override
  String get conferencesUnmute => 'Unmute';

  @override
  String get conferencesMute => 'Mute';

  @override
  String get conferencesCameraOn => 'Camera on';

  @override
  String get conferencesCameraOff => 'Camera off';

  @override
  String get conferencesStopShare => 'Stop share';

  @override
  String get conferencesShareScreen => 'Share screen';

  @override
  String get conferencesTranslationOn => 'Translation on';

  @override
  String get conferencesAiTranslate => 'AI translate';

  @override
  String get conferencesStopAndTranscribe => 'Stop & transcribe';

  @override
  String get conferencesLiveGifts => 'Live gifts';

  @override
  String get conferencesLiveGiftsDescription =>
      'Choose a gift for the host while this conference is active.';

  @override
  String get conferencesGiftsLoading => 'Loading conference gifts…';

  @override
  String get conferencesGiftsLoadError => 'Gifts could not load';

  @override
  String get conferencesGiftsEmpty => 'No gifts available';

  @override
  String get conferencesGiftsEmptyMessage =>
      'The conference is ready, but the gift catalog is empty.';

  @override
  String get conferencesRefreshGifts => 'Refresh gifts';

  @override
  String conferencesGiftCombo(String name, int count) {
    return '$name · combo ×$count';
  }

  @override
  String conferencesGiftSent(String name) {
    return '$name sent';
  }

  @override
  String conferencesGiftSentToHost(String name) {
    return 'Sent $name to the host.';
  }

  @override
  String get mediaSettingsSaved => 'Media settings saved for all platforms.';

  @override
  String get mediaSettingsWebNote =>
      'Browser WHIP publish is available on Web. Desktop uses OBS Companion and Virtual Camera.';

  @override
  String get mediaSettingsNativeNote =>
      'On desktop and mobile, use OBS Companion and Virtual Camera for production publishing.';

  @override
  String get mediaSettingsTitle => 'Camera & Audio';

  @override
  String get mediaSettingsSubtitle =>
      'Production media stack for Live, Calls, and Creator Studio';

  @override
  String get mediaSettingsHeroEyebrow => 'MEDIA STACK';

  @override
  String get mediaSettingsHeroTitle => 'Ready for production';

  @override
  String get mediaSettingsCameraSection => 'Camera';

  @override
  String get mediaSettingsCameraDevice => 'Camera device';

  @override
  String get mediaSettingsDefaultDevice => 'Default';

  @override
  String get mediaSettingsFrontCamera => 'Front camera';

  @override
  String get mediaSettingsRearCamera => 'Rear camera';

  @override
  String get mediaSettingsVirtualDevice => 'Virtual device';

  @override
  String get mediaSettingsResolution => 'Resolution';

  @override
  String get mediaSettingsMirrorPreview => 'Mirror preview';

  @override
  String get mediaSettingsAudioSection => 'Microphone & audio routing';

  @override
  String get mediaSettingsMicrophone => 'Microphone';

  @override
  String get mediaSettingsHeadset => 'Headset';

  @override
  String get mediaSettingsUsbMicrophone => 'USB microphone';

  @override
  String get mediaSettingsAudioRoute => 'Audio route';

  @override
  String get mediaSettingsStreamMix => 'Stream mix';

  @override
  String get mediaSettingsMonitorMix => 'Monitor mix';

  @override
  String get mediaSettingsVoipPath => 'Voice call path';

  @override
  String get mediaSettingsHeadphones => 'Headphones';

  @override
  String get mediaSettingsNoiseSuppression => 'Noise suppression';

  @override
  String get mediaSettingsEchoCancellation => 'Echo cancellation';

  @override
  String get mediaSettingsObsSection => 'OBS & Virtual Camera';

  @override
  String get mediaSettingsObsConnected => 'OBS Companion connected';

  @override
  String get mediaSettingsObsConnectedDescription =>
      'Scene sync + start with OBS';

  @override
  String get mediaSettingsVirtualCamera => 'SYLORA Virtual Camera';

  @override
  String get mediaSettingsVirtualCameraDescription =>
      'Expose feed to Zoom, Meet, or OBS';

  @override
  String get mediaSettingsStreamingSection => 'Streaming';

  @override
  String get mediaSettingsBitrate => 'Bitrate (kbps)';

  @override
  String get mediaSettingsLatencyMode => 'Latency mode';

  @override
  String get mediaSettingsUltraLowLatency => 'Ultra low';

  @override
  String get mediaSettingsLowLatency => 'Low';

  @override
  String get mediaSettingsNormalLatency => 'Normal';

  @override
  String get mediaSettingsRecordingSection => 'Recording';

  @override
  String get mediaSettingsLocalRecording => 'Local recording';

  @override
  String get mediaSettingsCloudRecording => 'Cloud recording';

  @override
  String get mediaSettingsCloudRecordingDescription =>
      'Uploads to configured object storage';

  @override
  String get mediaSettingsSaveProfile => 'Save media profile';

  @override
  String get earningsTitle => 'Creator Earnings';

  @override
  String get earningsSubtitle =>
      'Live gifts, tips, and payouts — one ecosystem ledger.';

  @override
  String get earningsHeroEyebrow => 'EARNINGS';

  @override
  String get earningsHeroTitle => 'Your creator balance';

  @override
  String get earningsHeroBody =>
      'Tips and gifts count only from Live Streams, Guest Streams, Multi-host Conferences, and Voice Rooms. Gift Shop is for buying inventory — not sending.';

  @override
  String get earningsTotalAvailable => 'Total available';

  @override
  String earningsMinorUnits(int amount) {
    return '$amount minor units';
  }

  @override
  String get earningsAcceptLiveGifts => 'Accept live gifts';

  @override
  String get earningsAcceptLiveGiftsDescription =>
      'When off, viewers cannot send gifts during your live sessions.';

  @override
  String get earningsRecentLedger => 'Recent ledger';

  @override
  String get earningsEmptyTitle => 'No earnings yet';

  @override
  String get earningsEmptyMessage =>
      'Go live and let viewers send gifts from the live tray.';

  @override
  String get earningsOpenLive => 'Open Live';

  @override
  String get communitiesTitle => 'Communities';

  @override
  String get communitiesSubtitle =>
      'Find people around shared interests or start a space of your own.';

  @override
  String get communitiesCreate => 'Create community';

  @override
  String get communitiesHeroEyebrow => 'COMMUNITIES';

  @override
  String get communitiesHeroTitle => 'Find your people';

  @override
  String get communitiesHeroBody =>
      'Browse public spaces and communities you belong to, then continue into their existing channels.';

  @override
  String get communitiesSearchHint => 'Search communities';

  @override
  String get communitiesSearch => 'Search';

  @override
  String get communitiesClearSearch => 'Clear search';

  @override
  String get communitiesEmptyTitle => 'No communities yet';

  @override
  String get communitiesNoMatchesTitle => 'No matching communities';

  @override
  String get communitiesEmptyMessage =>
      'Create the first community to begin gathering people.';

  @override
  String get communitiesNoMatchesMessage =>
      'Try another name, description, or slug.';

  @override
  String get communitiesNameLabel => 'Name';

  @override
  String get communitiesNameRequired => 'Enter a community name.';

  @override
  String get communitiesSlugLabel => 'Slug';

  @override
  String get communitiesSlugHelper =>
      'Lowercase letters, numbers, and hyphens.';

  @override
  String get communitiesSlugInvalid =>
      'Use at least 3 lowercase URL-safe characters.';

  @override
  String get communitiesDescriptionLabel => 'Description (optional)';

  @override
  String get communitiesVisibilityLabel => 'Visibility';

  @override
  String get communitiesVisibilityPublic => 'Public';

  @override
  String get communitiesVisibilityPrivate =>
      'Private — requests require approval';

  @override
  String get communitiesVisibilityPrivateShort => 'Private';

  @override
  String get communitiesVisibilityInviteOnly => 'Invite only';

  @override
  String get communitiesJoined => 'Joined';

  @override
  String get communitiesLeave => 'Leave community';

  @override
  String get communitiesJoin => 'Join community';

  @override
  String get communitiesMembershipPending => 'Membership request submitted.';

  @override
  String communitiesMembershipStatus(String status) {
    return 'Community membership: $status';
  }

  @override
  String get communitiesChannels => 'Channels';

  @override
  String get communitiesNoChannelsTitle => 'No visible channels';

  @override
  String get communitiesNoChannelsMessage =>
      'No channels are visible in this community.';
}
