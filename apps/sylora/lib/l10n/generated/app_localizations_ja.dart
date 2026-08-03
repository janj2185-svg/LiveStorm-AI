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
}
