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

  @override
  String get navFriends => 'Amici';

  @override
  String get feedTitle => 'Feed';

  @override
  String get feedSubtitle =>
      'Il polso vivo di SYLORA — post, amici e creazione.';

  @override
  String get feedEmpty => 'Il tuo feed è silenzioso';

  @override
  String get feedEmptyMessage =>
      'Non sono stati restituiti post pubblicati. Pubblica un post o segui persone per modellare il tuo feed.';

  @override
  String get feedCreatePost => 'Crea un post';

  @override
  String get feedLoadMore => 'Carica altri post';

  @override
  String get feedLoadingPosts => 'Caricamento post…';

  @override
  String get feedLoadingMoreReason =>
      'La pagina successiva del feed è in caricamento.';

  @override
  String get feedRecommended => 'Consigliati';

  @override
  String get feedRecommendationsUnavailable => 'Consigli non disponibili';

  @override
  String get feedRecommendationsEmpty => 'L’API non ha ancora consigli.';

  @override
  String get feedPostBodyLabel => 'Post in testo semplice';

  @override
  String get feedPublishNow => 'Pubblica ora';

  @override
  String get feedSaveDraft => 'Salva come bozza';

  @override
  String get feedPublish => 'Pubblica';

  @override
  String get friendsTitle => 'Amici';

  @override
  String get friendsRequests => 'Richieste';

  @override
  String get friendsSuggestions => 'Suggerimenti';

  @override
  String get friendsAccept => 'Accetta';

  @override
  String get friendsReject => 'Rifiuta';

  @override
  String get friendsUnfriend => 'Rimuovi dagli amici';

  @override
  String get friendsAddFriend => 'Aggiungi amico';

  @override
  String get friendsOnly => 'Solo amici';

  @override
  String get friendsOnline => 'Online';

  @override
  String get friendsMutual => 'Amici in comune';

  @override
  String get friendsSearchFriends => 'Cerca amici';

  @override
  String get friendsNoFriends => 'Ancora nessun amico';

  @override
  String get friendsPendingIncoming => 'Richieste in arrivo';

  @override
  String get friendsPendingOutgoing => 'Richieste inviate';

  @override
  String get messagesTitle => 'Messaggi';

  @override
  String get messagesEmpty => 'Nessuna conversazione';

  @override
  String get messagesEmptyMessage =>
      'Non è stata restituita alcuna cronologia conversazioni. Avviane una con un handle pubblico.';

  @override
  String get messagesTypeMessage => 'Messaggio';

  @override
  String get messagesSend => 'Invia messaggio';

  @override
  String get messagesNewConversation => 'Nuova conversazione';

  @override
  String get messagesRecipientHandle => 'Handle del destinatario';

  @override
  String get messagesStart => 'Avvia';

  @override
  String get messagesConversationTitle => 'Conversazione';

  @override
  String get messagesAcceptRequest => 'Accetta richiesta di messaggio';

  @override
  String get messagesDeclineRequest => 'Rifiuta richiesta di messaggio';

  @override
  String get moreTitle => 'Altro';

  @override
  String get moreSubtitle =>
      'Strumenti account e aree di lavoro basate sui ruoli che non rientrano nella navigazione compatta.';

  @override
  String get moreOpenModule => 'Apri modulo';

  @override
  String get moreLearning => 'Apprendimento';

  @override
  String get moreWallet => 'Portafoglio';

  @override
  String get moreGifts => 'Regali';

  @override
  String get moreAi => 'AI';

  @override
  String get moreLive => 'Live';

  @override
  String get moreCreatorStudio => 'Creator Studio';

  @override
  String get moreCreator => 'Creator';

  @override
  String get moreWorkspace => 'Area di lavoro';

  @override
  String get moreAdmin => 'Amministrazione';

  @override
  String get moreSettings => 'Impostazioni';

  @override
  String get settingsProfile => 'Profilo';

  @override
  String get settingsEditProfile => 'Modifica profilo';

  @override
  String get settingsNoPublicHandle => 'Nessun handle pubblico';

  @override
  String get settingsAccountPrivacy => 'Privacy account ed email';

  @override
  String get settingsProductEmails => 'Email di prodotto';

  @override
  String get settingsMarketingEmails => 'Email di marketing';

  @override
  String get settingsSecurityEmails => 'Email di sicurezza';

  @override
  String get settingsSecurityEmailDescription =>
      'Il backend può imporre avvisi critici per la sicurezza.';

  @override
  String get settingsProfileVisibility => 'Visibilità profilo';

  @override
  String get settingsProfilePublic => 'Pubblico';

  @override
  String get settingsProfilePrivate => 'Privato';

  @override
  String get settingsSecurity => 'Sicurezza';

  @override
  String get settingsSessions => 'Sessioni';

  @override
  String get settingsSignOut => 'Esci';

  @override
  String get settingsTheme => 'Tema';

  @override
  String get settingsThemeLight => 'Chiaro';

  @override
  String get settingsThemeDark => 'Scuro';

  @override
  String get settingsThemeSystem => 'Sistema';

  @override
  String get settingsNotifications => 'Notifiche';

  @override
  String get settingsEnableNotifications => 'Attiva notifiche';

  @override
  String get settingsNotificationsDescription =>
      'Il collegamento del token push nativo può usare questa preferenza.';

  @override
  String get settingsHighContrast => 'Contrasto elevato';

  @override
  String get settingsReducedMotion => 'Movimento ridotto';

  @override
  String settingsTextScale(String scale) {
    return 'Scala testo: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => 'App di autenticazione';

  @override
  String get liveShortLabel => 'Live';

  @override
  String get aiShortLabel => 'AI';

  @override
  String get giftsShortLabel => 'Regali';

  @override
  String get walletShortLabel => 'Portafoglio';

  @override
  String get conferencesTitle => 'Conferenze';

  @override
  String get conferencesStart => 'Avvia conferenza';

  @override
  String get conferencesJoin => 'Partecipa alla conferenza';

  @override
  String get conferencesLeave => 'Lascia conferenza';

  @override
  String get conferencesInvite => 'Invita';

  @override
  String get conferencesAuraAssist => 'Assistenza Aura';

  @override
  String get commonPremiumEmpty => 'Ancora nessun elemento premium';

  @override
  String get commonPremiumError => 'Impossibile caricare i contenuti premium.';

  @override
  String get commonPremiumRetry => 'Riprova premium';

  @override
  String get homeHeroEyebrow => 'IL TUO MONDO IA VIVO';

  @override
  String get homeHeroBody =>
      'Crea, connettiti e cresci in una rete luminosa — IA, Live, amici e creazione.';

  @override
  String get homeModulesLabel => 'PORTALI DELL\'ECOSISTEMA';

  @override
  String get homeComposeHint => 'Condividi un segnale con l\'universo…';

  @override
  String get searchTitle => 'Explore';

  @override
  String get searchSubtitle =>
      'Find people, posts, and communities across the living network.';

  @override
  String get searchHint => 'Search SYLORA';

  @override
  String get searchFindPeople => 'Discover the network';

  @override
  String get searchFindPeopleMessage =>
      'Enter at least two characters to query people, posts, and communities.';

  @override
  String get searchFocus => 'Focus search';

  @override
  String get searchNoResults => 'No results';

  @override
  String get searchNoResultsMessage =>
      'Nothing matched this query. Try another handle, keyword, or community.';

  @override
  String get searchEdit => 'Edit search';

  @override
  String get searchMinChars => 'Enter at least two characters.';

  @override
  String get searchPeople => 'People';

  @override
  String get searchPosts => 'Posts';

  @override
  String get searchCommunities => 'Communities';

  @override
  String get searchHeroEyebrow => 'DISCOVER';

  @override
  String get messagesSubtitle =>
      'Direct signals, requests, and living conversations.';

  @override
  String get messagesHeroEyebrow => 'INBOX';

  @override
  String get messagesHeroBody =>
      'Private threads with cinematic presence — requests, replies, and Aura-ready context.';

  @override
  String get messagesRequestBadge => 'Request';

  @override
  String get friendsSubtitle =>
      'Real friendships, requests, and people you may know.';

  @override
  String get profileSubtitle => 'Public presence and relationship controls.';

  @override
  String get profileFollow => 'Follow';

  @override
  String get profileUnfollow => 'Unfollow';

  @override
  String get profileMessage => 'Message';

  @override
  String get profileMute => 'Mute';

  @override
  String get profileBlock => 'Block';

  @override
  String get profileMuted => 'Account muted.';

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get notificationsReadAll => 'Read all';

  @override
  String get notificationsEmpty => 'No notifications';

  @override
  String get notificationsEmptyMessage =>
      'When the network moves, signals appear here.';

  @override
  String get notificationsMuteType => 'Mute this notification type';

  @override
  String get moreHeroEyebrow => 'YOUR HUB';

  @override
  String get moreHeroBody =>
      'Wallet, Live, Aura, learning, and creator tools — one luminous control surface.';

  @override
  String get moreQuickActions => 'QUICK ACTIONS';

  @override
  String get moreConferences => 'Conferences';

  @override
  String get moreGoLive => 'Go Live';

  @override
  String get moreOpenWallet => 'Wallet';

  @override
  String get moreEditProfile => 'Edit profile';

  @override
  String get liveTitle => 'Live';

  @override
  String get liveSubtitle =>
      'Go live with WHIP, OBS, or studio tools — honest platform integrations only.';

  @override
  String get liveHeroEyebrow => 'BROADCAST';

  @override
  String get liveHeroBody =>
      'Stage a session, open Creator Studio, and keep every integration real.';

  @override
  String get liveIntegrations => 'Integrations';

  @override
  String get liveSessions => 'Sessions';

  @override
  String get liveCreateSession => 'Create session';

  @override
  String get liveNoSessions => 'No live sessions';

  @override
  String get liveNoSessionsMessage =>
      'Create a session to receive a reveal-once stream key.';

  @override
  String get liveOpenStudio => 'Open Creator Studio';

  @override
  String get liveGoLive => 'Go Live';

  @override
  String get liveSessionTitle => 'Session title';

  @override
  String get liveCopyStreamKey => 'Copy your stream key now';

  @override
  String get liveStreamKeyOnce =>
      'This secret is returned once and cannot be recovered. Store it in your streaming software.';

  @override
  String get liveCopyClose => 'Copy and close';

  @override
  String get liveHealthCheck => 'Run health check';

  @override
  String get commonRefresh => 'Refresh';

  @override
  String get commonCreate => 'Create';

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
}
