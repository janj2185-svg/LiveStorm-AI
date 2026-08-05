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
  String get commonReconnectMedia => 'Reconnect media';

  @override
  String get conferencesContributionGallery => 'Contribution gallery';

  @override
  String get conferencesContributionGalleryDescription =>
      'Each publisher uses an isolated WHIP path. Peers subscribe with WHEP — not an SFU composite feed.';

  @override
  String get conferencesRefreshParticipants => 'Refresh participants';

  @override
  String get conferencesSubscribeWhep => 'Subscribe WHEP';

  @override
  String get conferencesContributionWhepUnavailable =>
      'Contribution WHEP is unavailable until the media plane is configured.';

  @override
  String get conferencesWhepGalleryUnavailable =>
      'WHEP gallery is available on web and native WebRTC builds.';

  @override
  String conferencesContributionSubscribed(String userId) {
    return 'Subscribed to contribution $userId';
  }

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

  @override
  String get navMusic => 'Music';

  @override
  String get navAura => 'Aura';

  @override
  String get navStudio => 'Studio';

  @override
  String get navLearn => 'Learn';

  @override
  String get navMe => 'Me';

  @override
  String get moreCommunities => 'Communities';

  @override
  String get moreEarnings => 'Earnings';

  @override
  String get moreGiftShop => 'Gift Shop';

  @override
  String get moreMediaSettings => 'Camera & Audio';

  @override
  String get auraTipFeed => 'Hi — I am here while you scroll the feed.';

  @override
  String get auraTipFriends => 'Let us find people who feel warm to you.';

  @override
  String get auraTipConferences =>
      'I am listening to the meeting and can help as it goes.';

  @override
  String get auraTipLive =>
      'Keeping the stream in focus — tell me if you need help.';

  @override
  String get auraTipAi =>
      'I am Aura. Write like a person — I will answer like one.';

  @override
  String get auraTipGifts => 'I can suggest a gift that will truly land.';

  @override
  String get auraTipCreatorStudio =>
      'Ready to help with the studio — step by step.';

  @override
  String get auraTipMarketplace => 'Looking for what actually fits you.';

  @override
  String get auraTipBusiness =>
      'Holding business context so you do not get lost.';

  @override
  String get auraTipLearning => 'Learning with you — ask anything.';

  @override
  String get auraTipCreator => 'Your creative rhythm — I will adapt.';

  @override
  String get auraTipSettings => 'Let us set things up quietly, without noise.';

  @override
  String get auraTipDefault => 'I am Aura — ready to help.';

  @override
  String get auraSummonLabel => 'Summon Aura';

  @override
  String get auraDismissLabel => 'Hide Aura';

  @override
  String get liveIntegrationsTitle => 'Live integrations';

  @override
  String get liveIntegrationsBody =>
      'Connect streaming platforms so Aura can co-host. Native SYLORA Live is ready. TikTok LIVE unlocks after official provider access.';

  @override
  String get liveNativeReady => 'SYLORA Live — ready';

  @override
  String get liveTikTokBlocked => 'TikTok LIVE — awaiting provider access';

  @override
  String get liveDestinationsHint =>
      'Destinations appear after an official integration is connected.';

  @override
  String get liveGuestInvitations => 'Guest invitations';

  @override
  String get liveGuestInvitationsBody =>
      'Accept a real host invite, publish a separate WHIP contribution when credentials are issued, or send a gift to the host.';

  @override
  String get liveNoGuestInvites =>
      'No incoming guest invitations. Host invites will appear here.';
}
