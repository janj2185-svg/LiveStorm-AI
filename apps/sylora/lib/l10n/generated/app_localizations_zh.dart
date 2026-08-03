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
  String get appTagline => 'Create. Connect. Go live.';

  @override
  String get appDescription =>
      'A social platform for community, gifts, AI, and live moments.';

  @override
  String get navHome => 'Home';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => 'Live';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => 'Gifts';

  @override
  String get navMessages => 'Messages';

  @override
  String get navProfile => 'Profile';

  @override
  String get navSettings => 'Settings';

  @override
  String get navMore => 'More';

  @override
  String get navSearch => 'Search';

  @override
  String get navMarket => 'Market';

  @override
  String get navCreator => 'Creator';

  @override
  String get navWorkspace => 'Workspace';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'Log in';

  @override
  String get authRegister => 'Register';

  @override
  String get authPassword => 'Password';

  @override
  String get authOtp => 'One-time code';

  @override
  String get authBack => 'Back';

  @override
  String get authBackToWorld => 'Back to the world';

  @override
  String get authCreateAccount => 'Create account';

  @override
  String get authContinue => 'Continue';

  @override
  String get authContinueWithPhone => 'Continue with phone';

  @override
  String get authContinueWithEmailOtp => 'Log in with an email code';

  @override
  String authContinueWithProvider(String provider) {
    return 'Continue with $provider';
  }

  @override
  String get authSignInToEcosystem => 'Sign in to your AI ecosystem';

  @override
  String get authPhone => 'Phone';

  @override
  String get authEmail => 'Email';

  @override
  String get authEmailAddress => 'Email address';

  @override
  String get authPhoneNumber => 'Phone';

  @override
  String get authSmsCode => 'SMS code';

  @override
  String get authEmailCode => 'Email code';

  @override
  String get authSendCode => 'Send code';

  @override
  String get authResendCode => 'Send code again';

  @override
  String authSendAgainIn(int seconds) {
    return 'Send again in ${seconds}s';
  }

  @override
  String get authForgotPassword => 'Forgot password?';

  @override
  String get authVerifyEmailAgain => 'Verify email or send the message again';

  @override
  String get authDisplayName => 'Profile display name';

  @override
  String get authPasswordHelper => 'At least 12 characters';

  @override
  String get authCodeEmailChip => 'Email code';

  @override
  String get authPasswordChip => 'Password';

  @override
  String get authPhoneUnavailable =>
      'Phone sign-in is temporarily unavailable.';

  @override
  String get authSmsInstruction => 'We will send a one-time code by SMS.';

  @override
  String get authEmailOtpInstruction =>
      'We will send a one-time code to your email.';

  @override
  String get authWelcomeEyebrow => 'Welcome to the ecosystem';

  @override
  String get authWelcomeBody =>
      'One sign-in for AI, Live, community, and creativity.';

  @override
  String get authOAuthOpenFailed => 'Could not open the sign-in page.';

  @override
  String get authOAuthProviderUnavailable =>
      'This provider is unavailable. Try another sign-in method.';

  @override
  String get authMobileSocialPending =>
      'Social sign-in in mobile builds will appear after deep-link setup.';

  @override
  String get authReturnToLogin => 'Return to sign-in';

  @override
  String get authMfaTitle => 'Two-factor authentication';

  @override
  String get authMfaPrompt => 'Enter the code from your authenticator app';

  @override
  String get authCode => 'Code';

  @override
  String get authConfirm => 'Confirm';

  @override
  String get authEmailVerificationTitle => 'Email verification';

  @override
  String get authPasswordResetTitle => 'Password reset';

  @override
  String get authRequestPasswordReset => 'Request password reset';

  @override
  String get authRequestVerificationEmail => 'Send verification email';

  @override
  String get authSendEmail => 'Send email';

  @override
  String get authVerifyWithToken => 'Verify with token';

  @override
  String get authSetNewPassword => 'Set a new password';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'New password';

  @override
  String get authConfirmEmail => 'Confirm email';

  @override
  String get authResetPassword => 'Reset password';

  @override
  String get commonOr => 'or';

  @override
  String get commonSave => 'Save';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonRetry => 'Retry';

  @override
  String get commonLoading => 'Loading';

  @override
  String get commonError => 'Error';

  @override
  String get commonOffline => 'Offline';

  @override
  String get commonTryAgain => 'Try again';

  @override
  String get commonSomethingWentWrong => 'Something went wrong';

  @override
  String get auraCompanionLabel => 'Aura · AI companion';

  @override
  String get auraGreeting => 'Aura is ready to help.';

  @override
  String get auraListening => 'Aura is listening.';

  @override
  String get auraThinking => 'Aura is thinking.';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsLanguageDescription =>
      'Choose the app language used on this device.';

  @override
  String get settingsDisplayAccessibility => 'Display & accessibility';

  @override
  String get settingsLanguageEnglish => 'English';

  @override
  String get settingsLanguageUkrainian => 'Ukrainian';

  @override
  String get settingsLanguagePolish => 'Polish';

  @override
  String get settingsLanguageGerman => 'German';

  @override
  String get settingsLanguageSpanish => 'Spanish';

  @override
  String get settingsLanguageFrench => 'French';

  @override
  String get settingsLanguageItalian => 'Italian';

  @override
  String get settingsLanguagePortuguese => 'Portuguese';

  @override
  String get settingsLanguageJapanese => 'Japanese';

  @override
  String get settingsLanguageKorean => 'Korean';

  @override
  String get settingsLanguageChinese => 'Chinese';
}
