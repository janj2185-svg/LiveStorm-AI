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
}
