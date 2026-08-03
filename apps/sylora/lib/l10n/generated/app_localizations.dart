import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_it.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_ko.dart';
import 'app_localizations_pl.dart';
import 'app_localizations_pt.dart';
import 'app_localizations_uk.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('it'),
    Locale('ja'),
    Locale('ko'),
    Locale('pl'),
    Locale('pt'),
    Locale('uk'),
    Locale('zh'),
  ];

  /// Product name shown in app chrome and window titles.
  ///
  /// In en, this message translates to:
  /// **'SYLORA'**
  String get appTitle;

  /// No description provided for @appTagline.
  ///
  /// In en, this message translates to:
  /// **'Create. Connect. Go live.'**
  String get appTagline;

  /// No description provided for @appDescription.
  ///
  /// In en, this message translates to:
  /// **'A social platform for community, gifts, AI, and live moments.'**
  String get appDescription;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navFeed.
  ///
  /// In en, this message translates to:
  /// **'Feed'**
  String get navFeed;

  /// No description provided for @navLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get navLive;

  /// No description provided for @navAi.
  ///
  /// In en, this message translates to:
  /// **'AI'**
  String get navAi;

  /// No description provided for @navGifts.
  ///
  /// In en, this message translates to:
  /// **'Gifts'**
  String get navGifts;

  /// No description provided for @navMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get navMessages;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @navMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get navMore;

  /// No description provided for @navSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get navSearch;

  /// No description provided for @navMarket.
  ///
  /// In en, this message translates to:
  /// **'Market'**
  String get navMarket;

  /// No description provided for @navCreator.
  ///
  /// In en, this message translates to:
  /// **'Creator'**
  String get navCreator;

  /// No description provided for @navWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Workspace'**
  String get navWorkspace;

  /// No description provided for @navAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get navAdmin;

  /// No description provided for @authLogin.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get authLogin;

  /// No description provided for @authRegister.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get authRegister;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authOtp.
  ///
  /// In en, this message translates to:
  /// **'One-time code'**
  String get authOtp;

  /// No description provided for @authBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get authBack;

  /// No description provided for @authBackToWorld.
  ///
  /// In en, this message translates to:
  /// **'Back to the world'**
  String get authBackToWorld;

  /// No description provided for @authCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get authCreateAccount;

  /// No description provided for @authContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get authContinue;

  /// No description provided for @authContinueWithPhone.
  ///
  /// In en, this message translates to:
  /// **'Continue with phone'**
  String get authContinueWithPhone;

  /// No description provided for @authContinueWithEmailOtp.
  ///
  /// In en, this message translates to:
  /// **'Log in with an email code'**
  String get authContinueWithEmailOtp;

  /// OAuth button label.
  ///
  /// In en, this message translates to:
  /// **'Continue with {provider}'**
  String authContinueWithProvider(String provider);

  /// No description provided for @authSignInToEcosystem.
  ///
  /// In en, this message translates to:
  /// **'Sign in to your AI ecosystem'**
  String get authSignInToEcosystem;

  /// No description provided for @authPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get authPhone;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmail;

  /// No description provided for @authEmailAddress.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get authEmailAddress;

  /// No description provided for @authPhoneNumber.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get authPhoneNumber;

  /// No description provided for @authSmsCode.
  ///
  /// In en, this message translates to:
  /// **'SMS code'**
  String get authSmsCode;

  /// No description provided for @authEmailCode.
  ///
  /// In en, this message translates to:
  /// **'Email code'**
  String get authEmailCode;

  /// No description provided for @authSendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get authSendCode;

  /// No description provided for @authResendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code again'**
  String get authResendCode;

  /// Countdown before another OTP can be requested.
  ///
  /// In en, this message translates to:
  /// **'Send again in {seconds}s'**
  String authSendAgainIn(int seconds);

  /// No description provided for @authForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get authForgotPassword;

  /// No description provided for @authVerifyEmailAgain.
  ///
  /// In en, this message translates to:
  /// **'Verify email or send the message again'**
  String get authVerifyEmailAgain;

  /// No description provided for @authDisplayName.
  ///
  /// In en, this message translates to:
  /// **'Profile display name'**
  String get authDisplayName;

  /// No description provided for @authPasswordHelper.
  ///
  /// In en, this message translates to:
  /// **'At least 12 characters'**
  String get authPasswordHelper;

  /// No description provided for @authCodeEmailChip.
  ///
  /// In en, this message translates to:
  /// **'Email code'**
  String get authCodeEmailChip;

  /// No description provided for @authPasswordChip.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPasswordChip;

  /// No description provided for @authPhoneUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Phone sign-in is temporarily unavailable.'**
  String get authPhoneUnavailable;

  /// No description provided for @authSmsInstruction.
  ///
  /// In en, this message translates to:
  /// **'We will send a one-time code by SMS.'**
  String get authSmsInstruction;

  /// No description provided for @authEmailOtpInstruction.
  ///
  /// In en, this message translates to:
  /// **'We will send a one-time code to your email.'**
  String get authEmailOtpInstruction;

  /// No description provided for @authWelcomeEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Welcome to the ecosystem'**
  String get authWelcomeEyebrow;

  /// No description provided for @authWelcomeBody.
  ///
  /// In en, this message translates to:
  /// **'One sign-in for AI, Live, community, and creativity.'**
  String get authWelcomeBody;

  /// No description provided for @authOAuthOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open the sign-in page.'**
  String get authOAuthOpenFailed;

  /// No description provided for @authOAuthProviderUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This provider is unavailable. Try another sign-in method.'**
  String get authOAuthProviderUnavailable;

  /// No description provided for @authMobileSocialPending.
  ///
  /// In en, this message translates to:
  /// **'Social sign-in in mobile builds will appear after deep-link setup.'**
  String get authMobileSocialPending;

  /// No description provided for @authReturnToLogin.
  ///
  /// In en, this message translates to:
  /// **'Return to sign-in'**
  String get authReturnToLogin;

  /// No description provided for @authMfaTitle.
  ///
  /// In en, this message translates to:
  /// **'Two-factor authentication'**
  String get authMfaTitle;

  /// No description provided for @authMfaPrompt.
  ///
  /// In en, this message translates to:
  /// **'Enter the code from your authenticator app'**
  String get authMfaPrompt;

  /// No description provided for @authCode.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get authCode;

  /// No description provided for @authConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get authConfirm;

  /// No description provided for @authEmailVerificationTitle.
  ///
  /// In en, this message translates to:
  /// **'Email verification'**
  String get authEmailVerificationTitle;

  /// No description provided for @authPasswordResetTitle.
  ///
  /// In en, this message translates to:
  /// **'Password reset'**
  String get authPasswordResetTitle;

  /// No description provided for @authRequestPasswordReset.
  ///
  /// In en, this message translates to:
  /// **'Request password reset'**
  String get authRequestPasswordReset;

  /// No description provided for @authRequestVerificationEmail.
  ///
  /// In en, this message translates to:
  /// **'Send verification email'**
  String get authRequestVerificationEmail;

  /// No description provided for @authSendEmail.
  ///
  /// In en, this message translates to:
  /// **'Send email'**
  String get authSendEmail;

  /// No description provided for @authVerifyWithToken.
  ///
  /// In en, this message translates to:
  /// **'Verify with token'**
  String get authVerifyWithToken;

  /// No description provided for @authSetNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Set a new password'**
  String get authSetNewPassword;

  /// No description provided for @authToken.
  ///
  /// In en, this message translates to:
  /// **'Token'**
  String get authToken;

  /// No description provided for @authNewPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get authNewPassword;

  /// No description provided for @authConfirmEmail.
  ///
  /// In en, this message translates to:
  /// **'Confirm email'**
  String get authConfirmEmail;

  /// No description provided for @authResetPassword.
  ///
  /// In en, this message translates to:
  /// **'Reset password'**
  String get authResetPassword;

  /// No description provided for @commonOr.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get commonOr;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get commonRetry;

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading'**
  String get commonLoading;

  /// No description provided for @commonError.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get commonError;

  /// No description provided for @commonOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline'**
  String get commonOffline;

  /// No description provided for @commonTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get commonTryAgain;

  /// No description provided for @commonSomethingWentWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get commonSomethingWentWrong;

  /// No description provided for @auraCompanionLabel.
  ///
  /// In en, this message translates to:
  /// **'Aura · AI companion'**
  String get auraCompanionLabel;

  /// No description provided for @auraGreeting.
  ///
  /// In en, this message translates to:
  /// **'Aura is ready to help.'**
  String get auraGreeting;

  /// No description provided for @auraListening.
  ///
  /// In en, this message translates to:
  /// **'Aura is listening.'**
  String get auraListening;

  /// No description provided for @auraThinking.
  ///
  /// In en, this message translates to:
  /// **'Aura is thinking.'**
  String get auraThinking;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @settingsLanguageDescription.
  ///
  /// In en, this message translates to:
  /// **'Choose the app language used on this device.'**
  String get settingsLanguageDescription;

  /// No description provided for @settingsDisplayAccessibility.
  ///
  /// In en, this message translates to:
  /// **'Display & accessibility'**
  String get settingsDisplayAccessibility;

  /// No description provided for @settingsLanguageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get settingsLanguageEnglish;

  /// No description provided for @settingsLanguageUkrainian.
  ///
  /// In en, this message translates to:
  /// **'Ukrainian'**
  String get settingsLanguageUkrainian;

  /// No description provided for @settingsLanguagePolish.
  ///
  /// In en, this message translates to:
  /// **'Polish'**
  String get settingsLanguagePolish;

  /// No description provided for @settingsLanguageGerman.
  ///
  /// In en, this message translates to:
  /// **'German'**
  String get settingsLanguageGerman;

  /// No description provided for @settingsLanguageSpanish.
  ///
  /// In en, this message translates to:
  /// **'Spanish'**
  String get settingsLanguageSpanish;

  /// No description provided for @settingsLanguageFrench.
  ///
  /// In en, this message translates to:
  /// **'French'**
  String get settingsLanguageFrench;

  /// No description provided for @settingsLanguageItalian.
  ///
  /// In en, this message translates to:
  /// **'Italian'**
  String get settingsLanguageItalian;

  /// No description provided for @settingsLanguagePortuguese.
  ///
  /// In en, this message translates to:
  /// **'Portuguese'**
  String get settingsLanguagePortuguese;

  /// No description provided for @settingsLanguageJapanese.
  ///
  /// In en, this message translates to:
  /// **'Japanese'**
  String get settingsLanguageJapanese;

  /// No description provided for @settingsLanguageKorean.
  ///
  /// In en, this message translates to:
  /// **'Korean'**
  String get settingsLanguageKorean;

  /// No description provided for @settingsLanguageChinese.
  ///
  /// In en, this message translates to:
  /// **'Chinese'**
  String get settingsLanguageChinese;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'de',
    'en',
    'es',
    'fr',
    'it',
    'ja',
    'ko',
    'pl',
    'pt',
    'uk',
    'zh',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
    case 'it':
      return AppLocalizationsIt();
    case 'ja':
      return AppLocalizationsJa();
    case 'ko':
      return AppLocalizationsKo();
    case 'pl':
      return AppLocalizationsPl();
    case 'pt':
      return AppLocalizationsPt();
    case 'uk':
      return AppLocalizationsUk();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
