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

  @override
  String get navFriends => 'Znajomi';

  @override
  String get feedTitle => 'Aktualności';

  @override
  String get feedSubtitle =>
      'Żywy puls SYLORA — posty, przyjaciele i twórczość w jednym przepływie.';

  @override
  String get feedEmpty => 'W Twoim feedzie jest cicho';

  @override
  String get feedEmptyMessage =>
      'Nie zwrócono opublikowanych postów. Opublikuj post albo obserwuj osoby, aby ukształtować swój feed.';

  @override
  String get feedCreatePost => 'Utwórz post';

  @override
  String get feedLoadMore => 'Załaduj więcej postów';

  @override
  String get feedLoadingPosts => 'Ładowanie postów…';

  @override
  String get feedLoadingMoreReason => 'Ładuje się następna strona feedu.';

  @override
  String get feedRecommended => 'Polecane';

  @override
  String get feedRecommendationsUnavailable => 'Rekomendacje niedostępne';

  @override
  String get feedRecommendationsEmpty => 'API nie ma jeszcze rekomendacji.';

  @override
  String get feedPostBodyLabel => 'Post tekstowy';

  @override
  String get feedPublishNow => 'Opublikuj teraz';

  @override
  String get feedSaveDraft => 'Zapisz jako szkic';

  @override
  String get feedPublish => 'Opublikuj';

  @override
  String get friendsTitle => 'Znajomi';

  @override
  String get friendsRequests => 'Prośby';

  @override
  String get friendsSuggestions => 'Sugestie';

  @override
  String get friendsAccept => 'Akceptuj';

  @override
  String get friendsReject => 'Odrzuć';

  @override
  String get friendsUnfriend => 'Usuń znajomego';

  @override
  String get friendsAddFriend => 'Dodaj znajomego';

  @override
  String get friendsOnly => 'Tylko znajomi';

  @override
  String get friendsOnline => 'Online';

  @override
  String get friendsMutual => 'Wspólni znajomi';

  @override
  String get friendsSearchFriends => 'Szukaj znajomych';

  @override
  String get friendsNoFriends => 'Nie masz jeszcze znajomych';

  @override
  String get friendsPendingIncoming => 'Przychodzące prośby';

  @override
  String get friendsPendingOutgoing => 'Wysłane prośby';

  @override
  String get messagesTitle => 'Wiadomości';

  @override
  String get messagesEmpty => 'Brak rozmów';

  @override
  String get messagesEmptyMessage =>
      'Nie zwrócono historii rozmów. Zacznij rozmowę z publicznym identyfikatorem.';

  @override
  String get messagesTypeMessage => 'Wiadomość';

  @override
  String get messagesSend => 'Wyślij wiadomość';

  @override
  String get messagesNewConversation => 'Nowa rozmowa';

  @override
  String get messagesRecipientHandle => 'Identyfikator odbiorcy';

  @override
  String get messagesStart => 'Rozpocznij';

  @override
  String get messagesConversationTitle => 'Rozmowa';

  @override
  String get messagesAcceptRequest => 'Akceptuj prośbę o wiadomość';

  @override
  String get messagesDeclineRequest => 'Odrzuć prośbę o wiadomość';

  @override
  String get moreTitle => 'Więcej';

  @override
  String get moreSubtitle =>
      'Narzędzia konta i obszary robocze zależne od roli, które nie mieszczą się w kompaktowej nawigacji.';

  @override
  String get moreOpenModule => 'Otwórz moduł';

  @override
  String get moreLearning => 'Nauka';

  @override
  String get moreWallet => 'Portfel';

  @override
  String get moreGifts => 'Prezenty';

  @override
  String get moreAi => 'AI';

  @override
  String get moreLive => 'Na żywo';

  @override
  String get moreCreatorStudio => 'Studio twórcy';

  @override
  String get moreCreator => 'Twórca';

  @override
  String get moreWorkspace => 'Obszar roboczy';

  @override
  String get moreAdmin => 'Administracja';

  @override
  String get moreSettings => 'Ustawienia';

  @override
  String get settingsProfile => 'Profil';

  @override
  String get settingsEditProfile => 'Edytuj profil';

  @override
  String get settingsNoPublicHandle => 'Brak publicznego identyfikatora';

  @override
  String get settingsAccountPrivacy => 'Prywatność konta i e-mail';

  @override
  String get settingsProductEmails => 'E-maile produktowe';

  @override
  String get settingsMarketingEmails => 'E-maile marketingowe';

  @override
  String get settingsSecurityEmails => 'E-maile bezpieczeństwa';

  @override
  String get settingsSecurityEmailDescription =>
      'Backend może wymuszać powiadomienia krytyczne dla bezpieczeństwa.';

  @override
  String get settingsProfileVisibility => 'Widoczność profilu';

  @override
  String get settingsProfilePublic => 'Publiczny';

  @override
  String get settingsProfilePrivate => 'Prywatny';

  @override
  String get settingsSecurity => 'Bezpieczeństwo';

  @override
  String get settingsSessions => 'Sesje';

  @override
  String get settingsSignOut => 'Wyloguj się';

  @override
  String get settingsTheme => 'Motyw';

  @override
  String get settingsThemeLight => 'Jasny';

  @override
  String get settingsThemeDark => 'Ciemny';

  @override
  String get settingsThemeSystem => 'Systemowy';

  @override
  String get settingsNotifications => 'Powiadomienia';

  @override
  String get settingsEnableNotifications => 'Włącz powiadomienia';

  @override
  String get settingsNotificationsDescription =>
      'Natywne powiązanie tokenu push może używać tej preferencji.';

  @override
  String get settingsHighContrast => 'Wysoki kontrast';

  @override
  String get settingsReducedMotion => 'Ograniczony ruch';

  @override
  String settingsTextScale(String scale) {
    return 'Skala tekstu: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => 'Aplikacja uwierzytelniająca';

  @override
  String get liveShortLabel => 'Live';

  @override
  String get aiShortLabel => 'AI';

  @override
  String get giftsShortLabel => 'Prezenty';

  @override
  String get walletShortLabel => 'Portfel';

  @override
  String get conferencesTitle => 'Konferencje';

  @override
  String get conferencesStart => 'Rozpocznij konferencję';

  @override
  String get conferencesJoin => 'Dołącz do konferencji';

  @override
  String get conferencesLeave => 'Opuść konferencję';

  @override
  String get conferencesInvite => 'Zaproś';

  @override
  String get conferencesAuraAssist => 'Pomoc Aura';

  @override
  String get commonPremiumEmpty => 'Nie ma jeszcze elementów premium';

  @override
  String get commonPremiumError => 'Nie udało się załadować treści premium.';

  @override
  String get commonPremiumRetry => 'Ponów premium';

  @override
  String get homeHeroEyebrow => 'TWÓJ ŻYWY ŚWIAT AI';

  @override
  String get homeHeroBody =>
      'Twórz, łącz się i rozwijaj w jednej świetlistej sieci — AI, Live, przyjaciele i twórczość razem.';

  @override
  String get homeModulesLabel => 'PORTALE EKOSYSTEMU';

  @override
  String get homeComposeHint => 'Podziel się sygnałem z wszechświatem…';

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
