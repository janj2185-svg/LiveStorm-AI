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
  String get feedCreatePost => '投稿を作成';

  @override
  String get feedLoadMore => 'さらに投稿を読み込む';

  @override
  String get feedLoadingPosts => '投稿を読み込み中…';

  @override
  String get feedLoadingMoreReason => '次のフィードページを読み込んでいます。';

  @override
  String get feedRecommended => 'おすすめ';

  @override
  String get feedRecommendationsUnavailable => 'おすすめを利用できません';

  @override
  String get feedRecommendationsEmpty => 'APIにはまだおすすめがありません。';

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
