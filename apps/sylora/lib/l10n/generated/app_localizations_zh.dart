// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => 'SYLORA UNIFIED';

  @override
  String get appTagline => '创作。连接。开启直播。';

  @override
  String get appDescription => '面向社区、礼物、AI 和直播时刻的社交平台。';

  @override
  String get navHome => '首页';

  @override
  String get navFeed => '动态';

  @override
  String get navLive => '直播';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => '礼物';

  @override
  String get navMessages => '消息';

  @override
  String get navProfile => '个人资料';

  @override
  String get navSettings => '设置';

  @override
  String get navMore => '更多';

  @override
  String get navSearch => '搜索';

  @override
  String get navMarket => '市场';

  @override
  String get navCreator => '创作者';

  @override
  String get navWorkspace => '工作区';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => '登录';

  @override
  String get authRegister => '注册';

  @override
  String get authPassword => '密码';

  @override
  String get authOtp => '一次性代码';

  @override
  String get authBack => '返回';

  @override
  String get authBackToWorld => '返回世界';

  @override
  String get authCreateAccount => '创建账户';

  @override
  String get authContinue => '继续';

  @override
  String get authContinueWithPhone => '使用手机号继续';

  @override
  String get authContinueWithEmailOtp => '使用邮箱代码登录';

  @override
  String authContinueWithProvider(String provider) {
    return '使用 $provider 继续';
  }

  @override
  String get authSignInToEcosystem => '登录你的 AI 生态系统';

  @override
  String get authPhone => '电话';

  @override
  String get authEmail => '邮箱';

  @override
  String get authEmailAddress => '邮箱地址';

  @override
  String get authPhoneNumber => '手机号';

  @override
  String get authSmsCode => '短信代码';

  @override
  String get authEmailCode => '邮箱代码';

  @override
  String get authSendCode => '发送代码';

  @override
  String get authResendCode => '重新发送代码';

  @override
  String authSendAgainIn(int seconds) {
    return '$seconds 秒后重新发送';
  }

  @override
  String get authForgotPassword => '忘记密码？';

  @override
  String get authVerifyEmailAgain => '验证邮箱或重新发送消息';

  @override
  String get authDisplayName => '个人资料显示名称';

  @override
  String get authPasswordHelper => '至少 12 个字符';

  @override
  String get authCodeEmailChip => '邮箱代码';

  @override
  String get authPasswordChip => '密码';

  @override
  String get authPhoneUnavailable => '手机号登录暂时不可用。';

  @override
  String get authSmsInstruction => '我们将通过短信发送一次性代码。';

  @override
  String get authEmailOtpInstruction => '我们将向你的邮箱发送一次性代码。';

  @override
  String get authWelcomeEyebrow => '欢迎来到生态系统';

  @override
  String get authWelcomeBody => '一个登录入口，连接 AI、Live、社区与创作。';

  @override
  String get authOAuthOpenFailed => '无法打开登录页面。';

  @override
  String get authOAuthProviderUnavailable => '此提供商不可用。请尝试其他登录方式。';

  @override
  String get authMobileSocialPending => '移动端版本的社交登录将在深度链接设置后显示。';

  @override
  String get authReturnToLogin => '返回登录';

  @override
  String get authMfaTitle => '双因素认证';

  @override
  String get authMfaPrompt => '请输入身份验证器应用中的代码';

  @override
  String get authCode => '代码';

  @override
  String get authConfirm => '确认';

  @override
  String get authEmailVerificationTitle => '邮箱验证';

  @override
  String get authPasswordResetTitle => '密码重置';

  @override
  String get authRequestPasswordReset => '请求重置密码';

  @override
  String get authRequestVerificationEmail => '发送验证邮件';

  @override
  String get authSendEmail => '发送邮件';

  @override
  String get authVerifyWithToken => '使用令牌验证';

  @override
  String get authSetNewPassword => '设置新密码';

  @override
  String get authToken => '令牌';

  @override
  String get authNewPassword => '新密码';

  @override
  String get authConfirmEmail => '确认邮箱';

  @override
  String get authResetPassword => '重置密码';

  @override
  String get commonOr => '或';

  @override
  String get commonSave => '保存';

  @override
  String get commonCancel => '取消';

  @override
  String get commonRetry => '重试';

  @override
  String get commonLoading => '正在加载';

  @override
  String get commonError => '错误';

  @override
  String get commonOffline => '离线';

  @override
  String get commonTryAgain => '再试一次';

  @override
  String get commonSomethingWentWrong => '出了点问题';

  @override
  String get auraCompanionLabel => 'Aura · AI 伙伴';

  @override
  String get auraGreeting => 'Aura 已准备好提供帮助。';

  @override
  String get auraListening => 'Aura 正在聆听。';

  @override
  String get auraThinking => 'Aura 正在思考。';

  @override
  String get settingsLanguage => '语言';

  @override
  String get settingsLanguageDescription => '选择此设备上使用的应用语言。';

  @override
  String get settingsDisplayAccessibility => '显示与辅助功能';

  @override
  String get settingsLanguageEnglish => '英语';

  @override
  String get settingsLanguageUkrainian => '乌克兰语';

  @override
  String get settingsLanguagePolish => '波兰语';

  @override
  String get settingsLanguageGerman => '德语';

  @override
  String get settingsLanguageSpanish => '西班牙语';

  @override
  String get settingsLanguageFrench => '法语';

  @override
  String get settingsLanguageItalian => '意大利语';

  @override
  String get settingsLanguagePortuguese => '葡萄牙语';

  @override
  String get settingsLanguageJapanese => '日语';

  @override
  String get settingsLanguageKorean => '韩语';

  @override
  String get settingsLanguageChinese => '中文';

  @override
  String get navFriends => '好友';

  @override
  String get feedTitle => '动态';

  @override
  String get feedSubtitle => 'SYLORA 的鲜活脉搏 — 动态、好友与创作同流。';

  @override
  String get feedEmpty => '你的动态很安静';

  @override
  String get feedEmptyMessage => '没有返回已发布的帖子。发布帖子或关注他人来塑造你的动态。';

  @override
  String get feedEmptyFindPeople => 'Find people';

  @override
  String get homeGreetingMorning => 'Good morning';

  @override
  String get homeGreetingAfternoon => 'Good afternoon';

  @override
  String get homeGreetingEvening => 'Good evening';

  @override
  String homeHeroLineNamed(String greeting, String name) {
    return '$greeting, $name.';
  }

  @override
  String homeHeroLine(String greeting) {
    return '$greeting. Your world is listening.';
  }

  @override
  String get homeDiscoverTitle => 'Discover';

  @override
  String get homeTalkToAura => 'Talk to Aura';

  @override
  String get homeGoLive => 'Go Live';

  @override
  String get aiTalkNow => 'Talk with Aura';

  @override
  String get aiContinueChat => 'Continue';

  @override
  String get aiStarterQuiet => 'Help me find calm clarity';

  @override
  String get aiStarterCreate => 'Help me create something beautiful';

  @override
  String get aiStarterLive => 'Be my co-host tonight';

  @override
  String get aiEmptyConversations => 'Aura is ready when you are';

  @override
  String get aiEmptyConversationsBody =>
      'Start a conversation like you would with a trusted friend — she remembers what matters.';

  @override
  String get aiProviderUnavailable => 'Aura cannot reach her voice right now';

  @override
  String get aiProviderUnavailableBody =>
      'We will not invent a reply. Check again in a moment.';

  @override
  String get liveYourStage => 'Your stage';

  @override
  String get liveYourStageBody =>
      'Go live in one breath. Aura can co-host when you are ready.';

  @override
  String get liveBroadcastSetup => 'Broadcast setup';

  @override
  String get liveNoSessionsTitle => 'The stage is quiet';

  @override
  String get liveNoSessionsBody =>
      'Create a session and step into the light — your audience is one tap away.';

  @override
  String get feedRecommendationsUnavailable => '推荐不可用';

  @override
  String get feedRecommended => '推荐';

  @override
  String get feedRecommendationsEmpty => 'API 暂时没有推荐内容。';

  @override
  String get feedCreatePost => '创建帖子';

  @override
  String get feedLoadMore => '加载更多帖子';

  @override
  String get feedLoadingPosts => '正在加载帖子…';

  @override
  String get feedLoadingMoreReason => '正在加载下一页动态。';

  @override
  String get feedPostBodyLabel => '纯文本帖子';

  @override
  String get feedPublishNow => '立即发布';

  @override
  String get feedSaveDraft => '保存为草稿';

  @override
  String get feedPublish => '发布';

  @override
  String get friendsTitle => '好友';

  @override
  String get friendsRequests => '请求';

  @override
  String get friendsSuggestions => '建议';

  @override
  String get friendsAccept => '接受';

  @override
  String get friendsReject => '拒绝';

  @override
  String get friendsUnfriend => '删除好友';

  @override
  String get friendsAddFriend => '添加好友';

  @override
  String get friendsOnly => '仅好友';

  @override
  String get friendsOnline => '在线';

  @override
  String get friendsMutual => '共同好友';

  @override
  String get friendsSearchFriends => '搜索好友';

  @override
  String get friendsNoFriends => '还没有好友';

  @override
  String get friendsPendingIncoming => '收到的请求';

  @override
  String get friendsPendingOutgoing => '发出的请求';

  @override
  String get messagesTitle => '消息';

  @override
  String get messagesEmpty => '没有会话';

  @override
  String get messagesEmptyMessage => '没有返回会话历史。使用公开用户名开始一个会话。';

  @override
  String get messagesTypeMessage => '消息';

  @override
  String get messagesSend => '发送消息';

  @override
  String get messagesNewConversation => '新会话';

  @override
  String get messagesRecipientHandle => '收件人用户名';

  @override
  String get messagesStart => '开始';

  @override
  String get messagesConversationTitle => '会话';

  @override
  String get messagesAcceptRequest => '接受消息请求';

  @override
  String get messagesDeclineRequest => '拒绝消息请求';

  @override
  String get messagesFindPeople => 'Find people';

  @override
  String get messagesStartCall => 'Start a call';

  @override
  String get moreTitle => '更多';

  @override
  String get moreSubtitle => '无法放入紧凑导航中的账户工具和按角色显示的工作区。';

  @override
  String get moreOpenModule => '打开模块';

  @override
  String get moreLearning => '学习';

  @override
  String get moreWallet => '钱包';

  @override
  String get moreGifts => '礼物';

  @override
  String get moreAi => 'AI';

  @override
  String get moreLive => '直播';

  @override
  String get moreCreatorStudio => '创作者工作室';

  @override
  String get moreCreator => '创作者';

  @override
  String get moreWorkspace => '工作区';

  @override
  String get moreAdmin => '管理';

  @override
  String get moreSettings => '设置';

  @override
  String get settingsProfile => '个人资料';

  @override
  String get settingsEditProfile => '编辑个人资料';

  @override
  String get settingsNoPublicHandle => '没有公开用户名';

  @override
  String get settingsAccountPrivacy => '账户隐私与邮箱';

  @override
  String get settingsProductEmails => '产品邮件';

  @override
  String get settingsMarketingEmails => '营销邮件';

  @override
  String get settingsSecurityEmails => '安全邮件';

  @override
  String get settingsSecurityEmailDescription => '后端可能会强制发送重要安全通知。';

  @override
  String get settingsProfileVisibility => '个人资料可见性';

  @override
  String get settingsProfilePublic => '公开';

  @override
  String get settingsProfilePrivate => '私密';

  @override
  String get settingsSecurity => '安全';

  @override
  String get settingsSessions => '会话';

  @override
  String get settingsSignOut => '退出登录';

  @override
  String get settingsTheme => '主题';

  @override
  String get settingsThemeLight => '浅色';

  @override
  String get settingsThemeDark => '深色';

  @override
  String get settingsThemeSystem => '跟随系统';

  @override
  String get settingsNotifications => '通知';

  @override
  String get settingsEnableNotifications => '启用通知';

  @override
  String get settingsNotificationsDescription => '原生推送令牌接入可以使用此偏好设置。';

  @override
  String get settingsHighContrast => '高对比度';

  @override
  String get settingsReducedMotion => '减少动态效果';

  @override
  String settingsTextScale(String scale) {
    return '文字缩放：$scale×';
  }

  @override
  String get settingsAuthenticatorApp => '身份验证器应用';

  @override
  String get liveShortLabel => '直播';

  @override
  String get aiShortLabel => 'AI';

  @override
  String get giftsShortLabel => '礼物';

  @override
  String get walletShortLabel => '钱包';

  @override
  String get conferencesTitle => '会议';

  @override
  String get conferencesStart => '开始会议';

  @override
  String get conferencesJoin => '加入会议';

  @override
  String get conferencesLeave => '离开会议';

  @override
  String get conferencesInvite => '邀请';

  @override
  String get conferencesAuraAssist => 'Aura 协助';

  @override
  String get commonPremiumEmpty => '还没有高级项目';

  @override
  String get commonPremiumError => '无法加载高级内容。';

  @override
  String get commonPremiumRetry => '重试高级内容';

  @override
  String get homeHeroEyebrow => '你的鲜活 AI 世界';

  @override
  String get homeHeroBody => '在同一个光感网络中创造、连接与成长。';

  @override
  String get homeModulesLabel => '生态入口';

  @override
  String get homeComposeHint => '向宇宙发出一个信号…';

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
  String get musicTitle => 'Music';

  @override
  String get musicHeroEyebrow => 'ATMOSPHERE';

  @override
  String get musicHeroTitle => 'Feel the room';

  @override
  String get musicHeroBody =>
      'Music is atmosphere for Live and creation — mood sets, royalty-free BGM, and Aura-built mixes in one luminous player.';

  @override
  String get musicEmptyTitle => 'The room is quiet';

  @override
  String get musicEmptyMessage =>
      'Ask Aura to shape a mix, or play the first track when the catalog is ready.';

  @override
  String get musicPlayFirst => 'Play first track';

  @override
  String get musicTabHome => 'Home';

  @override
  String get musicTabPlaylists => 'Playlists';

  @override
  String get musicTabFavorites => 'Favorites';

  @override
  String get musicTabCreatorBgm => 'Creator BGM';

  @override
  String get musicTabAura => 'Aura AI';

  @override
  String get musicSearchHint => 'Search tracks or artists';

  @override
  String get musicRecentlyPlayed => 'Recently played';

  @override
  String get musicMoodPlaylists => 'Mood playlists';

  @override
  String get musicRoyaltyFree => 'Royalty-free';

  @override
  String get musicNoPlaylists => 'No playlists yet';

  @override
  String get musicNoPlaylistsMessage =>
      'Create a personal playlist or ask Aura.';

  @override
  String get musicNoFavorites => 'No favorites';

  @override
  String get musicNoFavoritesMessage => 'Heart tracks to build your favorites.';

  @override
  String get musicNoCreatorBgm => 'No creator BGM';

  @override
  String get musicNoCreatorBgmMessage =>
      'Royalty-free background music for streams.';

  @override
  String get musicCatalogWarming => 'Catalog warming up';

  @override
  String get musicCatalogWarmingMessage =>
      'Royalty-free tracks will appear here.';

  @override
  String get musicNoTracksFound => 'No tracks found';

  @override
  String get musicNoTracksFoundMessage => 'Try another title or artist.';

  @override
  String get musicCreatePlaylist => 'Create playlist';

  @override
  String get musicPlaying => 'playing';

  @override
  String get musicPaused => 'paused';

  @override
  String get musicStop => 'Stop';

  @override
  String get musicRecentlyEmpty => 'Play something to fill recently played.';

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
  String get giftsDetailTitle => 'Gift detail';

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
  String get aiAuraSettings => 'Aura settings';

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
  String get creatorStudioDirectorGoLive => 'Director go-live';

  @override
  String get creatorStudioDirectorGoLiveBody =>
      'Preview camera, publish WHIP, then return to the session to Start.';

  @override
  String get creatorStudioSession => 'Session';

  @override
  String get creatorStudioNoSessionsMessage =>
      'Create a live session first, then return to Creator Studio.';

  @override
  String get creatorStudioLiveSessionLabel => 'Live session';

  @override
  String get creatorStudioOpenSession => 'Open session';

  @override
  String get creatorStudioOpenSessionToStart => 'Open session to Start';

  @override
  String get creatorStudioCamera => 'Camera';

  @override
  String get creatorStudioMicrophone => 'Microphone';

  @override
  String get creatorStudioRefreshDevices => 'Refresh devices';

  @override
  String get creatorStudioRunPreflight => 'Run preflight';

  @override
  String get creatorStudioConnectObs => 'Connect OBS';

  @override
  String get creatorStudioLiveNow => 'Live now';

  @override
  String get creatorStudioCopyWatchLink => 'Copy watch link';

  @override
  String get creatorStudioSelectSessionFirst => 'Select a live session first.';

  @override
  String get creatorStudioPreflightOnlyBeforeLive =>
      'Preflight is available only before a session is live.';

  @override
  String get creatorStudioPreflightAlreadyRunning =>
      'Preflight is already running.';

  @override
  String get creatorStudioDevicesUnavailable =>
      'Device enumeration is unavailable on this platform.';

  @override
  String get creatorStudioPreviewUnavailable =>
      'Camera preview is unavailable on this platform.';

  @override
  String get creatorStudioWhipUnavailable =>
      'WHIP publishing is unavailable on this platform.';

  @override
  String get creatorStudioStartPreviewFirst =>
      'Start a camera and microphone preview first.';

  @override
  String get creatorStudioRunPreflightFirst =>
      'Run preflight and resolve required checks first.';

  @override
  String get creatorStudioMediaPathNotReady =>
      'The selected media path is not ready.';

  @override
  String get creatorStudioGoLivePreflight => 'Go-live preflight';

  @override
  String get creatorStudioPreflightChecking =>
      'Checking media plane, credentials, and integrations…';

  @override
  String get creatorStudioPreflightPassedConnect =>
      'Preflight passed. Connect a publishing path before going live.';

  @override
  String get creatorStudioPreflightFoundBlockers =>
      'Preflight found blockers. Review the checklist.';

  @override
  String get creatorStudioSessionMustBeDraft =>
      'Session must be draft or preflight to go live.';

  @override
  String get creatorStudioPublishingUnsupported =>
      'Camera publishing is not available on this platform. Use OBS companion with the session ingest path and reveal-once stream key.';

  @override
  String creatorStudioIngestPath(String path) {
    return 'Ingest path: $path';
  }

  @override
  String get creatorStudioPreparingGoLive => 'Preparing go-live…';

  @override
  String get creatorStudioPreflightBlockedGoLive =>
      'Preflight blocked go-live. Fix the checklist items and try again.';

  @override
  String get creatorStudioGoLiveBlocked =>
      'Go-live is blocked until preflight passes and a publishing path is connected.';

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

  @override
  String get liveStartStreaming => 'Start streaming';

  @override
  String get liveStartStreamingBody =>
      'One clear path: open Studio, run preflight, then start the broadcast.';

  @override
  String get liveStepOpenStudio => 'Open Studio';

  @override
  String get liveStepPreflight => 'Preflight';

  @override
  String get liveStepStart => 'Start';

  @override
  String get liveStatusOpenStudio =>
      'Next: open Creator Studio to preview and publish WHIP.';

  @override
  String get liveStatusRunPreflight =>
      'Next: run preflight, then start when checks pass.';

  @override
  String get liveStatusReadyToStart =>
      'Preflight passed — tap Start when your ingest is ready.';

  @override
  String get liveStatusLiveNow => 'You are live. End when the stage is done.';

  @override
  String get liveStatusEnded => 'Session ended.';

  @override
  String get liveStartBroadcast => 'Start';

  @override
  String get liveEndBroadcast => 'End';

  @override
  String get liveStageIngest => 'Stage ingest';

  @override
  String get liveStageIngestHint =>
      'Use OBS with this path, or open Creator Studio for browser WHIP when MediaMTX is ready.';

  @override
  String get liveShareWatchLink => 'Share watch link';

  @override
  String get liveRotateStreamKey => 'Rotate stream key';

  @override
  String get liveWatchLinkCopied =>
      'Watch link copied. Friends open it in a browser.';

  @override
  String get livePreflightPassed => 'Preflight passed.';

  @override
  String get livePreflightNeedsAttention =>
      'Preflight reported checks that need attention.';

  @override
  String get livePreflightRunning => 'Running preflight before start…';

  @override
  String get liveSessionStarted => 'Live session started.';

  @override
  String get liveSessionCreatedNext =>
      'Session ready — open Studio, run preflight, then Start.';

  @override
  String get profileSubtitleOwn =>
      'Your presence, wallet, and tools — without duplicate shortcuts.';

  @override
  String get profileHeroEyebrow => 'YOU';

  @override
  String get profileHeroBody =>
      'Your presence on Sylora — friends, wallet, and tools in one place.';

  @override
  String get profileEmptyBio => 'Add a short bio so people know you.';

  @override
  String get profileTools => 'TOOLS';

  @override
  String get profileOpenFriends => 'Open friends';

  @override
  String get standRoleTitle => 'Test stand · go-live role';

  @override
  String standRoleBody(String roles) {
    return 'Pick creator or streamer before hosting. Current: $roles';
  }

  @override
  String get standRoleNone => 'none';

  @override
  String standRoleSwitching(String role) {
    return 'Switching to $role…';
  }

  @override
  String standRoleSet(String role) {
    return 'Role set to $role. Live tools unlocked.';
  }

  @override
  String get roleCreator => 'Creator';

  @override
  String get roleStreamer => 'Streamer';

  @override
  String get roleViewer => 'Viewer';

  @override
  String get roleUser => 'User';

  @override
  String get settingsSectionAccount => 'Account';

  @override
  String get settingsSectionPrivacy => 'Privacy';

  @override
  String get settingsSectionNotifications => 'Notifications';

  @override
  String get settingsSectionSecurity => 'Security';

  @override
  String get settingsSectionAppearance => 'Appearance';

  @override
  String get settingsSectionLanguage => 'Language';

  @override
  String get settingsSectionAccessibility => 'Accessibility';

  @override
  String get settingsSectionDevices => 'Devices';

  @override
  String get settingsSectionLive => 'Live';

  @override
  String get settingsSectionSafety => 'Safety';

  @override
  String get settingsPushConfigured => 'Configured';

  @override
  String get settingsPushNotConfigured => 'Not configured';

  @override
  String get settingsPushConfiguredBody =>
      'Push delivery is configured for this app build.';

  @override
  String get settingsPushUnavailableBody =>
      'Push is unavailable in this build. In-app notifications still work.';

  @override
  String get settingsSafetyTitle => 'Safety center';

  @override
  String get settingsSafetyProtected => 'Protected';

  @override
  String get settingsSafetyBody =>
      'Report harmful posts from the post menu, or report an account from its profile. Reports go to the moderation queue and the reported person does not see your identity.';

  @override
  String get settingsSafetyReportingTitle => 'Reporting is available';

  @override
  String get settingsSafetyReportingBody =>
      'Choose a reason and add optional context for reviewers.';

  @override
  String get settingsSafetyAppealsTitle => 'Appeals are coming later';

  @override
  String get settingsSafetyAppealsBody =>
      'Appeal submissions are not stored by the current API, so SYLORA does not show a form or claim an appeal was filed.';

  @override
  String get settingsSafetyEmergency =>
      'If someone is in immediate danger, contact local emergency services. In-app reports are not an emergency channel.';

  @override
  String get settingsLiveBody =>
      'Camera, microphone, and broadcast tools for going live.';

  @override
  String get settingsOpenMedia => 'Camera & audio';

  @override
  String get settingsOpenStudio => 'Creator Studio';

  @override
  String get settingsHandle => 'Handle';

  @override
  String get settingsDisplayName => 'Display name';

  @override
  String get settingsBio => 'Bio';

  @override
  String get settingsLocale => 'Locale';

  @override
  String get settingsTimezone => 'Timezone';

  @override
  String get settingsProfileRequired =>
      'Display name, locale, and timezone are required.';

  @override
  String get settingsSessionsTitle => 'Sessions';

  @override
  String get settingsSignOutAll => 'Sign out all';

  @override
  String get settingsNoSessionsTitle => 'No sessions';

  @override
  String get settingsNoSessionsBody => 'No account sessions were returned.';

  @override
  String get settingsSessionRevoked => 'Revoked';

  @override
  String get settingsSessionCurrent => 'Current session';

  @override
  String get settingsSessionActive => 'Active';

  @override
  String get settingsRevokeSession => 'Revoke session';

  @override
  String get settingsTotpTitle => 'Authenticator app';

  @override
  String get settingsTotpSetupTitle => 'Set up authenticator';

  @override
  String get settingsTotpSetupBody =>
      'Generate a secret, add it to your authenticator, then confirm a six-digit code.';

  @override
  String get settingsTotpGenerate => 'Generate setup secret';

  @override
  String get settingsTotpSecret => 'Secret';

  @override
  String get settingsTotpUri => 'Provisioning URI';

  @override
  String get settingsTotpCode => 'Six-digit code';

  @override
  String get settingsTotpConfirm => 'Confirm authenticator';

  @override
  String get settingsTotpRecoveryTitle => 'Recovery codes — save these now';

  @override
  String get settingsTotpDisableTitle => 'Disable authenticator';

  @override
  String get settingsTotpPassword => 'Password (if required)';

  @override
  String get settingsTotpOrRecovery => 'Authenticator or recovery code';

  @override
  String get settingsTotpDisableAction => 'Disable and revoke sessions';

  @override
  String get settingsTotpEnterSix => 'Enter a six-digit code.';

  @override
  String get settingsTotpEnabled => 'Authenticator enabled.';

  @override
  String get settingsTotpEnterRecovery =>
      'Enter an authenticator or recovery code.';

  @override
  String get errorPermissionDenied =>
      'You do not have access to this yet. On the test stand, unlock the creator role from Profile, or open Creator Studio when you are ready to go live.';

  @override
  String get errorOffline => 'You are offline. Connect and try again.';

  @override
  String get errorUnexpectedResponse =>
      'The server returned an unexpected response.';

  @override
  String get errorRequestFailed => 'The request could not be completed.';

  @override
  String get errorSecureStorage =>
      'Secure storage is unavailable on this device.';

  @override
  String get errorNotFound => 'This item could not be found.';

  @override
  String get errorUnauthorized => 'Please sign in again to continue.';

  @override
  String get livePermissionSessions =>
      'Live sessions are not available for your account yet. Unlock creator access on the test stand from Profile, or open Studio when you are ready to host.';

  @override
  String get livePermissionIntegrations =>
      'Broadcast integrations are not available for this account yet.';

  @override
  String get liveGuestInvitesLoadError => 'Guest invitations could not load.';

  @override
  String get liveSessionsLoadError =>
      'Live sessions could not be loaded right now. Try again in a moment.';

  @override
  String get liveIntegrationsLoadError =>
      'Broadcast setup could not be loaded right now.';

  @override
  String get navAnalytics => 'Analytics';

  @override
  String get momentsTitle => 'Moments';

  @override
  String get momentsAdd => 'Add moment';

  @override
  String get momentsEmptyHint => 'Share a moment that lives for 24 hours.';

  @override
  String get momentsCreateTitle => 'New moment';

  @override
  String get momentsCreateHint => 'What is happening right now?';

  @override
  String get momentsShare => 'Share moment';

  @override
  String get momentsViewerClose => 'Close';

  @override
  String get momentsUnavailable => 'Moments could not be loaded right now.';

  @override
  String progressLevel(int level) {
    return 'Level $level';
  }

  @override
  String progressXp(int xp) {
    return '$xp XP';
  }

  @override
  String progressXpToNext(int xp) {
    return '$xp XP to next level';
  }

  @override
  String progressStreak(int days) {
    return '$days-day streak';
  }

  @override
  String get analyticsTitle => 'Your analytics';

  @override
  String get analyticsSubtitle =>
      'XP, achievements, and activity across SYLORA.';

  @override
  String get analyticsAchievements => 'Achievements';

  @override
  String get analyticsActivity => 'Activity';

  @override
  String get analyticsNoAchievements =>
      'No achievements yet — keep exploring SYLORA.';

  @override
  String get analyticsUnavailable => 'Analytics could not be loaded right now.';
}
