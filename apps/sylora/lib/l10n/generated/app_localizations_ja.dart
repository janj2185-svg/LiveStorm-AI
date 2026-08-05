// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'つくる。つながる。ライブ配信する。';

  @override
  String get appDescription => 'コミュニティ、ギフト、AI、ライブの瞬間のためのソーシャルプラットフォーム。';

  @override
  String get navHome => 'ホーム';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => 'ライブ';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => 'ギフト';

  @override
  String get navMessages => 'メッセージ';

  @override
  String get navProfile => 'プロフィール';

  @override
  String get navSettings => '設定';

  @override
  String get navMore => 'その他';

  @override
  String get navSearch => '検索';

  @override
  String get navMarket => 'マーケット';

  @override
  String get navCreator => 'クリエイター';

  @override
  String get navWorkspace => 'ワークスペース';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'ログイン';

  @override
  String get authRegister => '登録';

  @override
  String get authPassword => 'パスワード';

  @override
  String get authOtp => 'ワンタイムコード';

  @override
  String get authBack => '戻る';

  @override
  String get authBackToWorld => '世界に戻る';

  @override
  String get authCreateAccount => 'アカウントを作成';

  @override
  String get authContinue => '続行';

  @override
  String get authContinueWithPhone => '電話番号で続行';

  @override
  String get authContinueWithEmailOtp => 'メールコードでログイン';

  @override
  String authContinueWithProvider(String provider) {
    return '$providerで続行';
  }

  @override
  String get authSignInToEcosystem => 'あなたのAIエコシステムにサインイン';

  @override
  String get authPhone => '電話';

  @override
  String get authEmail => 'メール';

  @override
  String get authEmailAddress => 'メールアドレス';

  @override
  String get authPhoneNumber => '電話番号';

  @override
  String get authSmsCode => 'SMSコード';

  @override
  String get authEmailCode => 'メールコード';

  @override
  String get authSendCode => 'コードを送信';

  @override
  String get authResendCode => 'コードを再送信';

  @override
  String authSendAgainIn(int seconds) {
    return '$seconds秒後に再送信';
  }

  @override
  String get authForgotPassword => 'パスワードをお忘れですか？';

  @override
  String get authVerifyEmailAgain => 'メールを確認するか、メッセージを再送信してください';

  @override
  String get authDisplayName => 'プロフィール表示名';

  @override
  String get authPasswordHelper => '12文字以上';

  @override
  String get authCodeEmailChip => 'メールコード';

  @override
  String get authPasswordChip => 'パスワード';

  @override
  String get authPhoneUnavailable => '電話番号でのサインインは一時的に利用できません。';

  @override
  String get authSmsInstruction => 'SMSでワンタイムコードを送信します。';

  @override
  String get authEmailOtpInstruction => 'メールにワンタイムコードを送信します。';

  @override
  String get authWelcomeEyebrow => 'エコシステムへようこそ';

  @override
  String get authWelcomeBody => 'AI、Live、コミュニティ、創造性のためのひとつのサインイン。';

  @override
  String get authOAuthOpenFailed => 'サインインページを開けませんでした。';

  @override
  String get authOAuthProviderUnavailable =>
      'このプロバイダーは利用できません。別のサインイン方法をお試しください。';

  @override
  String get authMobileSocialPending =>
      'モバイルビルドでのソーシャルサインインは、ディープリンク設定後に表示されます。';

  @override
  String get authReturnToLogin => 'サインインに戻る';

  @override
  String get authMfaTitle => '2要素認証';

  @override
  String get authMfaPrompt => '認証アプリのコードを入力してください';

  @override
  String get authCode => 'コード';

  @override
  String get authConfirm => '確認';

  @override
  String get authEmailVerificationTitle => 'メール確認';

  @override
  String get authPasswordResetTitle => 'パスワードのリセット';

  @override
  String get authRequestPasswordReset => 'パスワードリセットをリクエスト';

  @override
  String get authRequestVerificationEmail => '確認メールを送信';

  @override
  String get authSendEmail => 'メールを送信';

  @override
  String get authVerifyWithToken => 'トークンで確認';

  @override
  String get authSetNewPassword => '新しいパスワードを設定';

  @override
  String get authToken => 'トークン';

  @override
  String get authNewPassword => '新しいパスワード';

  @override
  String get authConfirmEmail => 'メールを確認';

  @override
  String get authResetPassword => 'パスワードをリセット';

  @override
  String get commonOr => 'または';

  @override
  String get commonSave => '保存';

  @override
  String get commonCancel => 'キャンセル';

  @override
  String get commonRetry => '再試行';

  @override
  String get commonLoading => '読み込み中';

  @override
  String get commonError => 'エラー';

  @override
  String get commonOffline => 'オフライン';

  @override
  String get commonTryAgain => 'もう一度試す';

  @override
  String get commonSomethingWentWrong => '問題が発生しました';

  @override
  String get auraCompanionLabel => 'Aura · AIコンパニオン';

  @override
  String get auraGreeting => 'Auraがお手伝いできます。';

  @override
  String get auraListening => 'Auraが聞いています。';

  @override
  String get auraThinking => 'Auraが考えています。';

  @override
  String get settingsLanguage => '言語';

  @override
  String get settingsLanguageDescription => 'このデバイスで使用するアプリの言語を選択します。';

  @override
  String get settingsDisplayAccessibility => '表示とアクセシビリティ';

  @override
  String get settingsLanguageEnglish => '英語';

  @override
  String get settingsLanguageUkrainian => 'ウクライナ語';

  @override
  String get settingsLanguagePolish => 'ポーランド語';

  @override
  String get settingsLanguageGerman => 'ドイツ語';

  @override
  String get settingsLanguageSpanish => 'スペイン語';

  @override
  String get settingsLanguageFrench => 'フランス語';

  @override
  String get settingsLanguageItalian => 'イタリア語';

  @override
  String get settingsLanguagePortuguese => 'ポルトガル語';

  @override
  String get settingsLanguageJapanese => '日本語';

  @override
  String get settingsLanguageKorean => '韓国語';

  @override
  String get settingsLanguageChinese => '中国語';

  @override
  String get navFriends => '友達';

  @override
  String get feedTitle => 'フィード';

  @override
  String get feedSubtitle => 'SYLORAの生きた鼓動 — 投稿、友だち、創造がひとつに。';

  @override
  String get feedEmpty => 'フィードは静かです';

  @override
  String get feedEmptyMessage =>
      '公開済みの投稿は返されませんでした。投稿するか、ユーザーをフォローしてフィードを整えましょう。';

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
  String get feedRecommendationsUnavailable => 'おすすめを利用できません';

  @override
  String get feedRecommended => 'おすすめ';

  @override
  String get feedRecommendationsEmpty => 'APIにはまだおすすめがありません。';

  @override
  String get feedCreatePost => '投稿を作成';

  @override
  String get feedLoadMore => 'さらに投稿を読み込む';

  @override
  String get feedLoadingPosts => '投稿を読み込み中…';

  @override
  String get feedLoadingMoreReason => '次のフィードページを読み込んでいます。';

  @override
  String get feedPostBodyLabel => 'プレーンテキスト投稿';

  @override
  String get feedPublishNow => '今すぐ公開';

  @override
  String get feedSaveDraft => '下書きとして保存';

  @override
  String get feedPublish => '公開';

  @override
  String get friendsTitle => '友達';

  @override
  String get friendsRequests => 'リクエスト';

  @override
  String get friendsSuggestions => '候補';

  @override
  String get friendsAccept => '承認';

  @override
  String get friendsReject => '拒否';

  @override
  String get friendsUnfriend => '友達から削除';

  @override
  String get friendsAddFriend => '友達を追加';

  @override
  String get friendsOnly => '友達のみ';

  @override
  String get friendsOnline => 'オンライン';

  @override
  String get friendsMutual => '共通の友達';

  @override
  String get friendsSearchFriends => '友達を検索';

  @override
  String get friendsNoFriends => 'まだ友達はいません';

  @override
  String get friendsPendingIncoming => '届いたリクエスト';

  @override
  String get friendsPendingOutgoing => '送信済みリクエスト';

  @override
  String get messagesTitle => 'メッセージ';

  @override
  String get messagesEmpty => '会話はありません';

  @override
  String get messagesEmptyMessage => '会話履歴は返されませんでした。公開ハンドルを使って会話を始めましょう。';

  @override
  String get messagesTypeMessage => 'メッセージ';

  @override
  String get messagesSend => 'メッセージを送信';

  @override
  String get messagesNewConversation => '新しい会話';

  @override
  String get messagesRecipientHandle => '受信者のハンドル';

  @override
  String get messagesStart => '開始';

  @override
  String get messagesConversationTitle => '会話';

  @override
  String get messagesAcceptRequest => 'メッセージリクエストを承認';

  @override
  String get messagesDeclineRequest => 'メッセージリクエストを拒否';

  @override
  String get messagesFindPeople => 'Find people';

  @override
  String get messagesStartCall => 'Start a call';

  @override
  String get moreTitle => 'その他';

  @override
  String get moreSubtitle => 'コンパクトなナビゲーションに収まらないアカウントツールとロール別ワークスペース。';

  @override
  String get moreOpenModule => 'モジュールを開く';

  @override
  String get moreLearning => 'ラーニング';

  @override
  String get moreWallet => 'ウォレット';

  @override
  String get moreGifts => 'ギフト';

  @override
  String get moreAi => 'AI';

  @override
  String get moreLive => 'ライブ';

  @override
  String get moreCreatorStudio => 'クリエイタースタジオ';

  @override
  String get moreCreator => 'クリエイター';

  @override
  String get moreWorkspace => 'ワークスペース';

  @override
  String get moreAdmin => '管理';

  @override
  String get moreSettings => '設定';

  @override
  String get settingsProfile => 'プロフィール';

  @override
  String get settingsEditProfile => 'プロフィールを編集';

  @override
  String get settingsNoPublicHandle => '公開ハンドルなし';

  @override
  String get settingsAccountPrivacy => 'アカウントのプライバシーとメール';

  @override
  String get settingsProductEmails => 'プロダクトメール';

  @override
  String get settingsMarketingEmails => 'マーケティングメール';

  @override
  String get settingsSecurityEmails => 'セキュリティメール';

  @override
  String get settingsSecurityEmailDescription =>
      'バックエンドがセキュリティ上重要なお知らせを強制する場合があります。';

  @override
  String get settingsProfileVisibility => 'プロフィールの公開範囲';

  @override
  String get settingsProfilePublic => '公開';

  @override
  String get settingsProfilePrivate => '非公開';

  @override
  String get settingsSecurity => 'セキュリティ';

  @override
  String get settingsSessions => 'セッション';

  @override
  String get settingsSignOut => 'サインアウト';

  @override
  String get settingsTheme => 'テーマ';

  @override
  String get settingsThemeLight => 'ライト';

  @override
  String get settingsThemeDark => 'ダーク';

  @override
  String get settingsThemeSystem => 'システム';

  @override
  String get settingsNotifications => '通知';

  @override
  String get settingsEnableNotifications => '通知を有効にする';

  @override
  String get settingsNotificationsDescription =>
      'ネイティブのプッシュトークン連携はこの設定を使用できます。';

  @override
  String get settingsHighContrast => '高コントラスト';

  @override
  String get settingsReducedMotion => '動きを減らす';

  @override
  String settingsTextScale(String scale) {
    return 'テキスト倍率: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => '認証アプリ';

  @override
  String get liveShortLabel => 'ライブ';

  @override
  String get aiShortLabel => 'AI';

  @override
  String get giftsShortLabel => 'ギフト';

  @override
  String get walletShortLabel => 'ウォレット';

  @override
  String get conferencesTitle => 'カンファレンス';

  @override
  String get conferencesStart => 'カンファレンスを開始';

  @override
  String get conferencesJoin => 'カンファレンスに参加';

  @override
  String get conferencesLeave => 'カンファレンスを退出';

  @override
  String get conferencesInvite => '招待';

  @override
  String get conferencesAuraAssist => 'Auraアシスト';

  @override
  String get commonPremiumEmpty => 'プレミアム項目はまだありません';

  @override
  String get commonPremiumError => 'プレミアムコンテンツを読み込めませんでした。';

  @override
  String get commonPremiumRetry => 'プレミアムを再試行';

  @override
  String get homeHeroEyebrow => 'あなたの生きたAIワールド';

  @override
  String get homeHeroBody => 'ひとつの光のネットワークで創り、つながり、成長しましょう。';

  @override
  String get homeModulesLabel => 'エコシステムのポータル';

  @override
  String get homeComposeHint => '宇宙にシグナルを届けましょう…';

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
}
