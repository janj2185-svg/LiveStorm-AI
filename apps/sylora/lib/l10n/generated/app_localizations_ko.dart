// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => '만들고. 연결하고. 라이브하세요.';

  @override
  String get appDescription => '커뮤니티, 선물, AI, 라이브 순간을 위한 소셜 플랫폼.';

  @override
  String get navHome => '홈';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => '라이브';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => '선물';

  @override
  String get navMessages => '메시지';

  @override
  String get navProfile => '프로필';

  @override
  String get navSettings => '설정';

  @override
  String get navMore => '더보기';

  @override
  String get navSearch => '검색';

  @override
  String get navMarket => '마켓';

  @override
  String get navCreator => '크리에이터';

  @override
  String get navWorkspace => '워크스페이스';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => '로그인';

  @override
  String get authRegister => '가입하기';

  @override
  String get authPassword => '비밀번호';

  @override
  String get authOtp => '일회용 코드';

  @override
  String get authBack => '뒤로';

  @override
  String get authBackToWorld => '세계로 돌아가기';

  @override
  String get authCreateAccount => '계정 만들기';

  @override
  String get authContinue => '계속';

  @override
  String get authContinueWithPhone => '전화번호로 계속';

  @override
  String get authContinueWithEmailOtp => '이메일 코드로 로그인';

  @override
  String authContinueWithProvider(String provider) {
    return '$provider로 계속';
  }

  @override
  String get authSignInToEcosystem => '내 AI 생태계에 로그인';

  @override
  String get authPhone => '전화';

  @override
  String get authEmail => '이메일';

  @override
  String get authEmailAddress => '이메일 주소';

  @override
  String get authPhoneNumber => '전화번호';

  @override
  String get authSmsCode => 'SMS 코드';

  @override
  String get authEmailCode => '이메일 코드';

  @override
  String get authSendCode => '코드 보내기';

  @override
  String get authResendCode => '코드 다시 보내기';

  @override
  String authSendAgainIn(int seconds) {
    return '$seconds초 후 다시 보내기';
  }

  @override
  String get authForgotPassword => '비밀번호를 잊으셨나요?';

  @override
  String get authVerifyEmailAgain => '이메일을 확인하거나 메시지를 다시 보내세요';

  @override
  String get authDisplayName => '프로필 표시 이름';

  @override
  String get authPasswordHelper => '최소 12자';

  @override
  String get authCodeEmailChip => '이메일 코드';

  @override
  String get authPasswordChip => '비밀번호';

  @override
  String get authPhoneUnavailable => '전화번호 로그인은 일시적으로 사용할 수 없습니다.';

  @override
  String get authSmsInstruction => 'SMS로 일회용 코드를 보내드립니다.';

  @override
  String get authEmailOtpInstruction => '이메일로 일회용 코드를 보내드립니다.';

  @override
  String get authWelcomeEyebrow => '생태계에 오신 것을 환영합니다';

  @override
  String get authWelcomeBody => 'AI, Live, 커뮤니티, 창작을 위한 하나의 로그인.';

  @override
  String get authOAuthOpenFailed => '로그인 페이지를 열 수 없습니다.';

  @override
  String get authOAuthProviderUnavailable =>
      '이 제공자는 사용할 수 없습니다. 다른 로그인 방법을 시도하세요.';

  @override
  String get authMobileSocialPending => '모바일 빌드의 소셜 로그인은 딥 링크 설정 후 표시됩니다.';

  @override
  String get authReturnToLogin => '로그인으로 돌아가기';

  @override
  String get authMfaTitle => '2단계 인증';

  @override
  String get authMfaPrompt => '인증 앱의 코드를 입력하세요';

  @override
  String get authCode => '코드';

  @override
  String get authConfirm => '확인';

  @override
  String get authEmailVerificationTitle => '이메일 인증';

  @override
  String get authPasswordResetTitle => '비밀번호 재설정';

  @override
  String get authRequestPasswordReset => '비밀번호 재설정 요청';

  @override
  String get authRequestVerificationEmail => '인증 이메일 보내기';

  @override
  String get authSendEmail => '이메일 보내기';

  @override
  String get authVerifyWithToken => '토큰으로 인증';

  @override
  String get authSetNewPassword => '새 비밀번호 설정';

  @override
  String get authToken => '토큰';

  @override
  String get authNewPassword => '새 비밀번호';

  @override
  String get authConfirmEmail => '이메일 확인';

  @override
  String get authResetPassword => '비밀번호 재설정';

  @override
  String get commonOr => '또는';

  @override
  String get commonSave => '저장';

  @override
  String get commonCancel => '취소';

  @override
  String get commonRetry => '다시 시도';

  @override
  String get commonLoading => '로딩 중';

  @override
  String get commonError => '오류';

  @override
  String get commonOffline => '오프라인';

  @override
  String get commonTryAgain => '다시 시도';

  @override
  String get commonSomethingWentWrong => '문제가 발생했습니다';

  @override
  String get auraCompanionLabel => 'Aura · AI 동반자';

  @override
  String get auraGreeting => 'Aura가 도와드릴 준비가 되었습니다.';

  @override
  String get auraListening => 'Aura가 듣고 있습니다.';

  @override
  String get auraThinking => 'Aura가 생각 중입니다.';

  @override
  String get settingsLanguage => '언어';

  @override
  String get settingsLanguageDescription => '이 기기에서 사용할 앱 언어를 선택하세요.';

  @override
  String get settingsDisplayAccessibility => '화면 및 접근성';

  @override
  String get settingsLanguageEnglish => '영어';

  @override
  String get settingsLanguageUkrainian => '우크라이나어';

  @override
  String get settingsLanguagePolish => '폴란드어';

  @override
  String get settingsLanguageGerman => '독일어';

  @override
  String get settingsLanguageSpanish => '스페인어';

  @override
  String get settingsLanguageFrench => '프랑스어';

  @override
  String get settingsLanguageItalian => '이탈리아어';

  @override
  String get settingsLanguagePortuguese => '포르투갈어';

  @override
  String get settingsLanguageJapanese => '일본어';

  @override
  String get settingsLanguageKorean => '한국어';

  @override
  String get settingsLanguageChinese => '중국어';

  @override
  String get navFriends => '친구';

  @override
  String get feedTitle => '피드';

  @override
  String get feedSubtitle => 'SYLORA의 살아있는 맥박 — 게시물, 친구, 창작이 하나로.';

  @override
  String get feedEmpty => '피드가 조용합니다';

  @override
  String get feedEmptyMessage =>
      '게시된 글이 반환되지 않았습니다. 글을 올리거나 사람들을 팔로우해 피드를 만들어 보세요.';

  @override
  String get feedCreatePost => '게시물 작성';

  @override
  String get feedLoadMore => '게시물 더 불러오기';

  @override
  String get feedLoadingPosts => '게시물 로딩 중…';

  @override
  String get feedLoadingMoreReason => '다음 피드 페이지를 불러오는 중입니다.';

  @override
  String get feedRecommended => '추천';

  @override
  String get feedRecommendationsUnavailable => '추천을 사용할 수 없음';

  @override
  String get feedRecommendationsEmpty => 'API에 아직 추천 항목이 없습니다.';

  @override
  String get feedPostBodyLabel => '일반 텍스트 게시물';

  @override
  String get feedPublishNow => '지금 게시';

  @override
  String get feedSaveDraft => '초안으로 저장';

  @override
  String get feedPublish => '게시';

  @override
  String get friendsTitle => '친구';

  @override
  String get friendsRequests => '요청';

  @override
  String get friendsSuggestions => '추천 친구';

  @override
  String get friendsAccept => '수락';

  @override
  String get friendsReject => '거절';

  @override
  String get friendsUnfriend => '친구 삭제';

  @override
  String get friendsAddFriend => '친구 추가';

  @override
  String get friendsOnly => '친구만';

  @override
  String get friendsOnline => '온라인';

  @override
  String get friendsMutual => '함께 아는 친구';

  @override
  String get friendsSearchFriends => '친구 검색';

  @override
  String get friendsNoFriends => '아직 친구가 없습니다';

  @override
  String get friendsPendingIncoming => '받은 요청';

  @override
  String get friendsPendingOutgoing => '보낸 요청';

  @override
  String get messagesTitle => '메시지';

  @override
  String get messagesEmpty => '대화가 없습니다';

  @override
  String get messagesEmptyMessage => '대화 기록이 반환되지 않았습니다. 공개 핸들로 대화를 시작하세요.';

  @override
  String get messagesTypeMessage => '메시지';

  @override
  String get messagesSend => '메시지 보내기';

  @override
  String get messagesNewConversation => '새 대화';

  @override
  String get messagesRecipientHandle => '받는 사람 핸들';

  @override
  String get messagesStart => '시작';

  @override
  String get messagesConversationTitle => '대화';

  @override
  String get messagesAcceptRequest => '메시지 요청 수락';

  @override
  String get messagesDeclineRequest => '메시지 요청 거절';

  @override
  String get moreTitle => '더보기';

  @override
  String get moreSubtitle => '간편 내비게이션에 담기 어려운 계정 도구와 역할별 워크스페이스입니다.';

  @override
  String get moreOpenModule => '모듈 열기';

  @override
  String get moreLearning => '학습';

  @override
  String get moreWallet => '지갑';

  @override
  String get moreGifts => '선물';

  @override
  String get moreAi => 'AI';

  @override
  String get moreLive => '라이브';

  @override
  String get moreCreatorStudio => '크리에이터 스튜디오';

  @override
  String get moreCreator => '크리에이터';

  @override
  String get moreWorkspace => '워크스페이스';

  @override
  String get moreAdmin => '관리';

  @override
  String get moreSettings => '설정';

  @override
  String get settingsProfile => '프로필';

  @override
  String get settingsEditProfile => '프로필 편집';

  @override
  String get settingsNoPublicHandle => '공개 핸들이 없습니다';

  @override
  String get settingsAccountPrivacy => '계정 공개 범위 및 이메일';

  @override
  String get settingsProductEmails => '제품 이메일';

  @override
  String get settingsMarketingEmails => '마케팅 이메일';

  @override
  String get settingsSecurityEmails => '보안 이메일';

  @override
  String get settingsSecurityEmailDescription =>
      '백엔드가 보안상 중요한 알림을 강제로 보낼 수 있습니다.';

  @override
  String get settingsProfileVisibility => '프로필 공개 범위';

  @override
  String get settingsProfilePublic => '공개';

  @override
  String get settingsProfilePrivate => '비공개';

  @override
  String get settingsSecurity => '보안';

  @override
  String get settingsSessions => '세션';

  @override
  String get settingsSignOut => '로그아웃';

  @override
  String get settingsTheme => '테마';

  @override
  String get settingsThemeLight => '라이트';

  @override
  String get settingsThemeDark => '다크';

  @override
  String get settingsThemeSystem => '시스템';

  @override
  String get settingsNotifications => '알림';

  @override
  String get settingsEnableNotifications => '알림 켜기';

  @override
  String get settingsNotificationsDescription =>
      '네이티브 푸시 토큰 연결은 이 설정을 사용할 수 있습니다.';

  @override
  String get settingsHighContrast => '고대비';

  @override
  String get settingsReducedMotion => '움직임 줄이기';

  @override
  String settingsTextScale(String scale) {
    return '텍스트 배율: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => '인증 앱';

  @override
  String get liveShortLabel => '라이브';

  @override
  String get aiShortLabel => 'AI';

  @override
  String get giftsShortLabel => '선물';

  @override
  String get walletShortLabel => '지갑';

  @override
  String get conferencesTitle => '컨퍼런스';

  @override
  String get conferencesStart => '컨퍼런스 시작';

  @override
  String get conferencesJoin => '컨퍼런스 참가';

  @override
  String get conferencesLeave => '컨퍼런스 나가기';

  @override
  String get conferencesInvite => '초대';

  @override
  String get conferencesAuraAssist => 'Aura 지원';

  @override
  String get commonPremiumEmpty => '아직 프리미엄 항목이 없습니다';

  @override
  String get commonPremiumError => '프리미엄 콘텐츠를 불러올 수 없습니다.';

  @override
  String get commonPremiumRetry => '프리미엄 다시 시도';

  @override
  String get homeHeroEyebrow => '살아 있는 AI 월드';

  @override
  String get homeHeroBody => '하나의 빛나는 네트워크에서 만들고, 연결하고, 성장하세요.';

  @override
  String get homeModulesLabel => '생태계 포털';

  @override
  String get homeComposeHint => '우주에 신호를 보내세요…';

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
