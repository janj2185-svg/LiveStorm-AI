// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

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
  String get feedCreatePost => '创建帖子';

  @override
  String get feedLoadMore => '加载更多帖子';

  @override
  String get feedLoadingPosts => '正在加载帖子…';

  @override
  String get feedLoadingMoreReason => '正在加载下一页动态。';

  @override
  String get feedRecommended => '推荐';

  @override
  String get feedRecommendationsUnavailable => '推荐不可用';

  @override
  String get feedRecommendationsEmpty => 'API 暂时没有推荐内容。';

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
