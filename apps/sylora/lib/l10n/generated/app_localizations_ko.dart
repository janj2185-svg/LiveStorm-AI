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
}
