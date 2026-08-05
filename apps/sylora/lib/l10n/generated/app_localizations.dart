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
  /// **'Where AI meets soul'**
  String get appTagline;

  /// No description provided for @appDescription.
  ///
  /// In en, this message translates to:
  /// **'Your world. In harmony — live presence, creative flow, and Aura by your side.'**
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
  /// **'Begin your journey'**
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
  /// **'Enter your AI world'**
  String get authWelcomeEyebrow;

  /// No description provided for @authWelcomeBody.
  ///
  /// In en, this message translates to:
  /// **'Aura is waiting — Live, friends, creation, and one calm sign-in.'**
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
  /// **'Aura · living companion'**
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

  /// No description provided for @navFriends.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get navFriends;

  /// No description provided for @feedTitle.
  ///
  /// In en, this message translates to:
  /// **'Feed'**
  String get feedTitle;

  /// No description provided for @feedSubtitle.
  ///
  /// In en, this message translates to:
  /// **'The living pulse of SYLORA — posts, friends and creation in one flow.'**
  String get feedSubtitle;

  /// No description provided for @feedEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your world is waiting'**
  String get feedEmpty;

  /// No description provided for @feedEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Share a first signal, or find people whose energy matches yours.'**
  String get feedEmptyMessage;

  /// No description provided for @feedEmptyFindPeople.
  ///
  /// In en, this message translates to:
  /// **'Find people'**
  String get feedEmptyFindPeople;

  /// No description provided for @homeGreetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get homeGreetingMorning;

  /// No description provided for @homeGreetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get homeGreetingAfternoon;

  /// No description provided for @homeGreetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get homeGreetingEvening;

  /// No description provided for @homeHeroLineNamed.
  ///
  /// In en, this message translates to:
  /// **'{greeting}, {name}.'**
  String homeHeroLineNamed(String greeting, String name);

  /// No description provided for @homeHeroLine.
  ///
  /// In en, this message translates to:
  /// **'{greeting}. Your world is listening.'**
  String homeHeroLine(String greeting);

  /// No description provided for @homeDiscoverTitle.
  ///
  /// In en, this message translates to:
  /// **'Discover'**
  String get homeDiscoverTitle;

  /// No description provided for @homeTalkToAura.
  ///
  /// In en, this message translates to:
  /// **'Talk to Aura'**
  String get homeTalkToAura;

  /// No description provided for @homeGoLive.
  ///
  /// In en, this message translates to:
  /// **'Go Live'**
  String get homeGoLive;

  /// No description provided for @aiTalkNow.
  ///
  /// In en, this message translates to:
  /// **'Talk with Aura'**
  String get aiTalkNow;

  /// No description provided for @aiContinueChat.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get aiContinueChat;

  /// No description provided for @aiStarterQuiet.
  ///
  /// In en, this message translates to:
  /// **'Help me find calm clarity'**
  String get aiStarterQuiet;

  /// No description provided for @aiStarterCreate.
  ///
  /// In en, this message translates to:
  /// **'Help me create something beautiful'**
  String get aiStarterCreate;

  /// No description provided for @aiStarterLive.
  ///
  /// In en, this message translates to:
  /// **'Be my co-host tonight'**
  String get aiStarterLive;

  /// No description provided for @aiEmptyConversations.
  ///
  /// In en, this message translates to:
  /// **'Aura is ready when you are'**
  String get aiEmptyConversations;

  /// No description provided for @aiEmptyConversationsBody.
  ///
  /// In en, this message translates to:
  /// **'Start a conversation like you would with a trusted friend — she remembers what matters.'**
  String get aiEmptyConversationsBody;

  /// No description provided for @aiProviderUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Aura cannot reach her voice right now'**
  String get aiProviderUnavailable;

  /// No description provided for @aiProviderUnavailableBody.
  ///
  /// In en, this message translates to:
  /// **'We will not invent a reply. Check again in a moment.'**
  String get aiProviderUnavailableBody;

  /// No description provided for @liveYourStage.
  ///
  /// In en, this message translates to:
  /// **'Your stage'**
  String get liveYourStage;

  /// No description provided for @liveYourStageBody.
  ///
  /// In en, this message translates to:
  /// **'Go live in one breath. Aura can co-host when you are ready.'**
  String get liveYourStageBody;

  /// No description provided for @liveBroadcastSetup.
  ///
  /// In en, this message translates to:
  /// **'Broadcast setup'**
  String get liveBroadcastSetup;

  /// No description provided for @liveNoSessionsTitle.
  ///
  /// In en, this message translates to:
  /// **'The stage is quiet'**
  String get liveNoSessionsTitle;

  /// No description provided for @liveNoSessionsBody.
  ///
  /// In en, this message translates to:
  /// **'Create a session and step into the light — your audience is one tap away.'**
  String get liveNoSessionsBody;

  /// No description provided for @feedRecommendationsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Recommendations are resting'**
  String get feedRecommendationsUnavailable;

  /// No description provided for @feedRecommended.
  ///
  /// In en, this message translates to:
  /// **'For you'**
  String get feedRecommended;

  /// No description provided for @feedRecommendationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Follow people to shape what appears here.'**
  String get feedRecommendationsEmpty;

  /// No description provided for @feedCreatePost.
  ///
  /// In en, this message translates to:
  /// **'Create a post'**
  String get feedCreatePost;

  /// No description provided for @feedLoadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more posts'**
  String get feedLoadMore;

  /// No description provided for @feedLoadingPosts.
  ///
  /// In en, this message translates to:
  /// **'Loading posts…'**
  String get feedLoadingPosts;

  /// No description provided for @feedLoadingMoreReason.
  ///
  /// In en, this message translates to:
  /// **'The next feed page is loading.'**
  String get feedLoadingMoreReason;

  /// No description provided for @feedPostBodyLabel.
  ///
  /// In en, this message translates to:
  /// **'Plain-text post'**
  String get feedPostBodyLabel;

  /// No description provided for @feedPublishNow.
  ///
  /// In en, this message translates to:
  /// **'Publish now'**
  String get feedPublishNow;

  /// No description provided for @feedSaveDraft.
  ///
  /// In en, this message translates to:
  /// **'Save as draft'**
  String get feedSaveDraft;

  /// No description provided for @feedPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get feedPublish;

  /// No description provided for @friendsTitle.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get friendsTitle;

  /// No description provided for @friendsRequests.
  ///
  /// In en, this message translates to:
  /// **'Requests'**
  String get friendsRequests;

  /// No description provided for @friendsSuggestions.
  ///
  /// In en, this message translates to:
  /// **'Suggestions'**
  String get friendsSuggestions;

  /// No description provided for @friendsAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get friendsAccept;

  /// No description provided for @friendsReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get friendsReject;

  /// No description provided for @friendsUnfriend.
  ///
  /// In en, this message translates to:
  /// **'Unfriend'**
  String get friendsUnfriend;

  /// No description provided for @friendsAddFriend.
  ///
  /// In en, this message translates to:
  /// **'Add friend'**
  String get friendsAddFriend;

  /// No description provided for @friendsOnly.
  ///
  /// In en, this message translates to:
  /// **'Friends only'**
  String get friendsOnly;

  /// No description provided for @friendsOnline.
  ///
  /// In en, this message translates to:
  /// **'Online'**
  String get friendsOnline;

  /// No description provided for @friendsMutual.
  ///
  /// In en, this message translates to:
  /// **'Mutual friends'**
  String get friendsMutual;

  /// No description provided for @friendsSearchFriends.
  ///
  /// In en, this message translates to:
  /// **'Search friends'**
  String get friendsSearchFriends;

  /// No description provided for @friendsNoFriends.
  ///
  /// In en, this message translates to:
  /// **'No friends yet'**
  String get friendsNoFriends;

  /// No description provided for @friendsPendingIncoming.
  ///
  /// In en, this message translates to:
  /// **'Incoming requests'**
  String get friendsPendingIncoming;

  /// No description provided for @friendsPendingOutgoing.
  ///
  /// In en, this message translates to:
  /// **'Outgoing requests'**
  String get friendsPendingOutgoing;

  /// No description provided for @messagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get messagesTitle;

  /// No description provided for @messagesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No conversations'**
  String get messagesEmpty;

  /// No description provided for @messagesEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No conversation history was returned. Start one with a public handle.'**
  String get messagesEmptyMessage;

  /// No description provided for @messagesTypeMessage.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get messagesTypeMessage;

  /// No description provided for @messagesSend.
  ///
  /// In en, this message translates to:
  /// **'Send message'**
  String get messagesSend;

  /// No description provided for @messagesNewConversation.
  ///
  /// In en, this message translates to:
  /// **'New conversation'**
  String get messagesNewConversation;

  /// No description provided for @messagesRecipientHandle.
  ///
  /// In en, this message translates to:
  /// **'Recipient handle'**
  String get messagesRecipientHandle;

  /// No description provided for @messagesStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get messagesStart;

  /// No description provided for @messagesConversationTitle.
  ///
  /// In en, this message translates to:
  /// **'Conversation'**
  String get messagesConversationTitle;

  /// No description provided for @messagesAcceptRequest.
  ///
  /// In en, this message translates to:
  /// **'Accept message request'**
  String get messagesAcceptRequest;

  /// No description provided for @messagesDeclineRequest.
  ///
  /// In en, this message translates to:
  /// **'Decline message request'**
  String get messagesDeclineRequest;

  /// No description provided for @moreTitle.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get moreTitle;

  /// No description provided for @moreSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Account tools and role-aware workspaces that do not fit compact navigation.'**
  String get moreSubtitle;

  /// No description provided for @moreOpenModule.
  ///
  /// In en, this message translates to:
  /// **'Open module'**
  String get moreOpenModule;

  /// No description provided for @moreLearning.
  ///
  /// In en, this message translates to:
  /// **'Learning'**
  String get moreLearning;

  /// No description provided for @moreWallet.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get moreWallet;

  /// No description provided for @moreGifts.
  ///
  /// In en, this message translates to:
  /// **'Gifts'**
  String get moreGifts;

  /// No description provided for @moreAi.
  ///
  /// In en, this message translates to:
  /// **'AI'**
  String get moreAi;

  /// No description provided for @moreLive.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get moreLive;

  /// No description provided for @moreCreatorStudio.
  ///
  /// In en, this message translates to:
  /// **'Creator Studio'**
  String get moreCreatorStudio;

  /// No description provided for @moreCreator.
  ///
  /// In en, this message translates to:
  /// **'Creator'**
  String get moreCreator;

  /// No description provided for @moreWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Workspace'**
  String get moreWorkspace;

  /// No description provided for @moreAdmin.
  ///
  /// In en, this message translates to:
  /// **'Administration'**
  String get moreAdmin;

  /// No description provided for @moreSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get moreSettings;

  /// No description provided for @settingsProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get settingsProfile;

  /// No description provided for @settingsEditProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get settingsEditProfile;

  /// No description provided for @settingsNoPublicHandle.
  ///
  /// In en, this message translates to:
  /// **'No public handle'**
  String get settingsNoPublicHandle;

  /// No description provided for @settingsAccountPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Account privacy & email'**
  String get settingsAccountPrivacy;

  /// No description provided for @settingsProductEmails.
  ///
  /// In en, this message translates to:
  /// **'Product emails'**
  String get settingsProductEmails;

  /// No description provided for @settingsMarketingEmails.
  ///
  /// In en, this message translates to:
  /// **'Marketing emails'**
  String get settingsMarketingEmails;

  /// No description provided for @settingsSecurityEmails.
  ///
  /// In en, this message translates to:
  /// **'Security emails'**
  String get settingsSecurityEmails;

  /// No description provided for @settingsSecurityEmailDescription.
  ///
  /// In en, this message translates to:
  /// **'The backend may enforce security-critical notices.'**
  String get settingsSecurityEmailDescription;

  /// No description provided for @settingsProfileVisibility.
  ///
  /// In en, this message translates to:
  /// **'Profile visibility'**
  String get settingsProfileVisibility;

  /// No description provided for @settingsProfilePublic.
  ///
  /// In en, this message translates to:
  /// **'Public'**
  String get settingsProfilePublic;

  /// No description provided for @settingsProfilePrivate.
  ///
  /// In en, this message translates to:
  /// **'Private'**
  String get settingsProfilePrivate;

  /// No description provided for @settingsSecurity.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get settingsSecurity;

  /// No description provided for @settingsSessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get settingsSessions;

  /// No description provided for @settingsSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get settingsSignOut;

  /// No description provided for @settingsTheme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get settingsTheme;

  /// No description provided for @settingsThemeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get settingsThemeLight;

  /// No description provided for @settingsThemeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get settingsThemeDark;

  /// No description provided for @settingsThemeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get settingsThemeSystem;

  /// No description provided for @settingsNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get settingsNotifications;

  /// No description provided for @settingsEnableNotifications.
  ///
  /// In en, this message translates to:
  /// **'Enable notifications'**
  String get settingsEnableNotifications;

  /// No description provided for @settingsNotificationsDescription.
  ///
  /// In en, this message translates to:
  /// **'Native push token wiring can plug into this preference.'**
  String get settingsNotificationsDescription;

  /// No description provided for @settingsHighContrast.
  ///
  /// In en, this message translates to:
  /// **'High contrast'**
  String get settingsHighContrast;

  /// No description provided for @settingsReducedMotion.
  ///
  /// In en, this message translates to:
  /// **'Reduced motion'**
  String get settingsReducedMotion;

  /// No description provided for @settingsTextScale.
  ///
  /// In en, this message translates to:
  /// **'Text scale: {scale}×'**
  String settingsTextScale(String scale);

  /// No description provided for @settingsAuthenticatorApp.
  ///
  /// In en, this message translates to:
  /// **'Authenticator app'**
  String get settingsAuthenticatorApp;

  /// No description provided for @liveShortLabel.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get liveShortLabel;

  /// No description provided for @aiShortLabel.
  ///
  /// In en, this message translates to:
  /// **'AI'**
  String get aiShortLabel;

  /// No description provided for @giftsShortLabel.
  ///
  /// In en, this message translates to:
  /// **'Gifts'**
  String get giftsShortLabel;

  /// No description provided for @walletShortLabel.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get walletShortLabel;

  /// No description provided for @conferencesTitle.
  ///
  /// In en, this message translates to:
  /// **'Conferences'**
  String get conferencesTitle;

  /// No description provided for @conferencesStart.
  ///
  /// In en, this message translates to:
  /// **'Start conference'**
  String get conferencesStart;

  /// No description provided for @conferencesJoin.
  ///
  /// In en, this message translates to:
  /// **'Join conference'**
  String get conferencesJoin;

  /// No description provided for @conferencesLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave conference'**
  String get conferencesLeave;

  /// No description provided for @conferencesInvite.
  ///
  /// In en, this message translates to:
  /// **'Invite'**
  String get conferencesInvite;

  /// No description provided for @conferencesAuraAssist.
  ///
  /// In en, this message translates to:
  /// **'Aura assist'**
  String get conferencesAuraAssist;

  /// No description provided for @commonPremiumEmpty.
  ///
  /// In en, this message translates to:
  /// **'No premium items yet'**
  String get commonPremiumEmpty;

  /// No description provided for @commonPremiumError.
  ///
  /// In en, this message translates to:
  /// **'Premium content could not be loaded.'**
  String get commonPremiumError;

  /// No description provided for @commonPremiumRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry premium'**
  String get commonPremiumRetry;

  /// Home hero: homeHeroEyebrow
  ///
  /// In en, this message translates to:
  /// **'YOUR LIVING AI WORLD'**
  String get homeHeroEyebrow;

  /// Home hero: homeHeroBody
  ///
  /// In en, this message translates to:
  /// **'Create, connect and grow inside one luminous network — AI, Live, friends and creation together.'**
  String get homeHeroBody;

  /// Home hero: homeModulesLabel
  ///
  /// In en, this message translates to:
  /// **'ECOSYSTEM PORTALS'**
  String get homeModulesLabel;

  /// Home hero: homeComposeHint
  ///
  /// In en, this message translates to:
  /// **'Share a signal with the universe…'**
  String get homeComposeHint;

  /// No description provided for @searchTitle.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get searchTitle;

  /// No description provided for @searchSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Find people, posts, and communities across the living network.'**
  String get searchSubtitle;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search SYLORA'**
  String get searchHint;

  /// No description provided for @searchFindPeople.
  ///
  /// In en, this message translates to:
  /// **'Discover the network'**
  String get searchFindPeople;

  /// No description provided for @searchFindPeopleMessage.
  ///
  /// In en, this message translates to:
  /// **'Enter at least two characters to query people, posts, and communities.'**
  String get searchFindPeopleMessage;

  /// No description provided for @searchFocus.
  ///
  /// In en, this message translates to:
  /// **'Focus search'**
  String get searchFocus;

  /// No description provided for @searchNoResults.
  ///
  /// In en, this message translates to:
  /// **'No results'**
  String get searchNoResults;

  /// No description provided for @searchNoResultsMessage.
  ///
  /// In en, this message translates to:
  /// **'Nothing matched this query. Try another handle, keyword, or community.'**
  String get searchNoResultsMessage;

  /// No description provided for @searchEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit search'**
  String get searchEdit;

  /// No description provided for @searchMinChars.
  ///
  /// In en, this message translates to:
  /// **'Enter at least two characters.'**
  String get searchMinChars;

  /// No description provided for @searchPeople.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get searchPeople;

  /// No description provided for @searchPosts.
  ///
  /// In en, this message translates to:
  /// **'Posts'**
  String get searchPosts;

  /// No description provided for @searchCommunities.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get searchCommunities;

  /// No description provided for @searchHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'DISCOVER'**
  String get searchHeroEyebrow;

  /// No description provided for @messagesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Direct signals, requests, and living conversations.'**
  String get messagesSubtitle;

  /// No description provided for @messagesHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'INBOX'**
  String get messagesHeroEyebrow;

  /// No description provided for @messagesHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Private threads with cinematic presence — requests, replies, and Aura-ready context.'**
  String get messagesHeroBody;

  /// No description provided for @messagesRequestBadge.
  ///
  /// In en, this message translates to:
  /// **'Request'**
  String get messagesRequestBadge;

  /// No description provided for @friendsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Real friendships, requests, and people you may know.'**
  String get friendsSubtitle;

  /// No description provided for @profileSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Public presence and relationship controls.'**
  String get profileSubtitle;

  /// No description provided for @profileFollow.
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get profileFollow;

  /// No description provided for @profileUnfollow.
  ///
  /// In en, this message translates to:
  /// **'Unfollow'**
  String get profileUnfollow;

  /// No description provided for @profileMessage.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get profileMessage;

  /// No description provided for @profileMute.
  ///
  /// In en, this message translates to:
  /// **'Mute'**
  String get profileMute;

  /// No description provided for @profileBlock.
  ///
  /// In en, this message translates to:
  /// **'Block'**
  String get profileBlock;

  /// No description provided for @profileMuted.
  ///
  /// In en, this message translates to:
  /// **'Account muted.'**
  String get profileMuted;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsReadAll.
  ///
  /// In en, this message translates to:
  /// **'Read all'**
  String get notificationsReadAll;

  /// No description provided for @notificationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No notifications'**
  String get notificationsEmpty;

  /// No description provided for @notificationsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'When the network moves, signals appear here.'**
  String get notificationsEmptyMessage;

  /// No description provided for @notificationsMuteType.
  ///
  /// In en, this message translates to:
  /// **'Mute this notification type'**
  String get notificationsMuteType;

  /// No description provided for @moreHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'YOUR HUB'**
  String get moreHeroEyebrow;

  /// No description provided for @moreHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Wallet, Live, Aura, learning, and creator tools — one luminous control surface.'**
  String get moreHeroBody;

  /// No description provided for @moreQuickActions.
  ///
  /// In en, this message translates to:
  /// **'QUICK ACTIONS'**
  String get moreQuickActions;

  /// No description provided for @moreConferences.
  ///
  /// In en, this message translates to:
  /// **'Conferences'**
  String get moreConferences;

  /// No description provided for @moreGoLive.
  ///
  /// In en, this message translates to:
  /// **'Go Live'**
  String get moreGoLive;

  /// No description provided for @moreOpenWallet.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get moreOpenWallet;

  /// No description provided for @moreEditProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get moreEditProfile;

  /// No description provided for @liveTitle.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get liveTitle;

  /// No description provided for @liveSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Go live in one breath — Aura can co-host beside you.'**
  String get liveSubtitle;

  /// No description provided for @liveHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'THE HEART OF SYLORA'**
  String get liveHeroEyebrow;

  /// No description provided for @liveHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Your stage. Your audience. Your living co-host.'**
  String get liveHeroBody;

  /// No description provided for @liveIntegrations.
  ///
  /// In en, this message translates to:
  /// **'Integrations'**
  String get liveIntegrations;

  /// No description provided for @liveSessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get liveSessions;

  /// No description provided for @liveCreateSession.
  ///
  /// In en, this message translates to:
  /// **'Create session'**
  String get liveCreateSession;

  /// No description provided for @liveNoSessions.
  ///
  /// In en, this message translates to:
  /// **'No live sessions'**
  String get liveNoSessions;

  /// No description provided for @liveNoSessionsMessage.
  ///
  /// In en, this message translates to:
  /// **'Create a session to receive a reveal-once stream key.'**
  String get liveNoSessionsMessage;

  /// No description provided for @liveOpenStudio.
  ///
  /// In en, this message translates to:
  /// **'Open Creator Studio'**
  String get liveOpenStudio;

  /// No description provided for @liveGoLive.
  ///
  /// In en, this message translates to:
  /// **'Go Live'**
  String get liveGoLive;

  /// No description provided for @liveSessionTitle.
  ///
  /// In en, this message translates to:
  /// **'Session title'**
  String get liveSessionTitle;

  /// No description provided for @liveCopyStreamKey.
  ///
  /// In en, this message translates to:
  /// **'Copy your stream key now'**
  String get liveCopyStreamKey;

  /// No description provided for @liveStreamKeyOnce.
  ///
  /// In en, this message translates to:
  /// **'This secret is returned once and cannot be recovered. Store it in your streaming software.'**
  String get liveStreamKeyOnce;

  /// No description provided for @liveCopyClose.
  ///
  /// In en, this message translates to:
  /// **'Copy and close'**
  String get liveCopyClose;

  /// No description provided for @liveHealthCheck.
  ///
  /// In en, this message translates to:
  /// **'Run health check'**
  String get liveHealthCheck;

  /// No description provided for @commonRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get commonRefresh;

  /// No description provided for @commonCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get commonCreate;

  /// No description provided for @walletTitle.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get walletTitle;

  /// No description provided for @walletSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Balances, top-ups, payouts, and your immutable ledger.'**
  String get walletSubtitle;

  /// No description provided for @walletHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'VALUE'**
  String get walletHeroEyebrow;

  /// No description provided for @walletHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Spendable credits and creator earnings in one luminous vault.'**
  String get walletHeroBody;

  /// No description provided for @walletSpendable.
  ///
  /// In en, this message translates to:
  /// **'Spendable'**
  String get walletSpendable;

  /// No description provided for @walletCreatorEarnings.
  ///
  /// In en, this message translates to:
  /// **'Creator earnings'**
  String get walletCreatorEarnings;

  /// No description provided for @walletTopUp.
  ///
  /// In en, this message translates to:
  /// **'Top up'**
  String get walletTopUp;

  /// No description provided for @walletPayout.
  ///
  /// In en, this message translates to:
  /// **'Payout'**
  String get walletPayout;

  /// No description provided for @walletHistory.
  ///
  /// In en, this message translates to:
  /// **'Transaction history'**
  String get walletHistory;

  /// No description provided for @walletNoActivity.
  ///
  /// In en, this message translates to:
  /// **'No wallet activity'**
  String get walletNoActivity;

  /// No description provided for @walletNoActivityMessage.
  ///
  /// In en, this message translates to:
  /// **'When you top up or earn, ledger entries appear here.'**
  String get walletNoActivityMessage;

  /// No description provided for @giftsTitle.
  ///
  /// In en, this message translates to:
  /// **'Gifts'**
  String get giftsTitle;

  /// No description provided for @giftsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Catalog, inventory, and living gift moments.'**
  String get giftsSubtitle;

  /// No description provided for @giftsHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'GIFTING'**
  String get giftsHeroEyebrow;

  /// No description provided for @giftsHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Rare to ultra-premium — send, collect, and celebrate in motion.'**
  String get giftsHeroBody;

  /// No description provided for @giftsCatalog.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get giftsCatalog;

  /// No description provided for @giftsInventory.
  ///
  /// In en, this message translates to:
  /// **'Inventory'**
  String get giftsInventory;

  /// No description provided for @giftsEvents.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get giftsEvents;

  /// No description provided for @giftsPreferences.
  ///
  /// In en, this message translates to:
  /// **'Gift preferences'**
  String get giftsPreferences;

  /// No description provided for @giftsAuthoring.
  ///
  /// In en, this message translates to:
  /// **'Gift authoring'**
  String get giftsAuthoring;

  /// No description provided for @giftsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No gifts available'**
  String get giftsEmpty;

  /// No description provided for @giftsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Publish READY gifts from Gift Studio to fill the catalog.'**
  String get giftsEmptyMessage;

  /// No description provided for @aiTitle.
  ///
  /// In en, this message translates to:
  /// **'Aura'**
  String get aiTitle;

  /// No description provided for @aiSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your living companion across SYLORA.'**
  String get aiSubtitle;

  /// No description provided for @aiHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'LIVING COMPANION'**
  String get aiHeroEyebrow;

  /// No description provided for @aiHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Talk like a person. Aura listens, remembers, and stays with you.'**
  String get aiHeroBody;

  /// No description provided for @aiAuraSettings.
  ///
  /// In en, this message translates to:
  /// **'Aura settings'**
  String get aiAuraSettings;

  /// No description provided for @aiOnline.
  ///
  /// In en, this message translates to:
  /// **'Aura online'**
  String get aiOnline;

  /// No description provided for @aiConsentTitle.
  ///
  /// In en, this message translates to:
  /// **'Aura is ready to meet you'**
  String get aiConsentTitle;

  /// No description provided for @aiConsentBody.
  ///
  /// In en, this message translates to:
  /// **'By talking, you allow Aura to listen and remember what you choose to share.'**
  String get aiConsentBody;

  /// No description provided for @aiGrantConsent.
  ///
  /// In en, this message translates to:
  /// **'Meet Aura'**
  String get aiGrantConsent;

  /// No description provided for @aiConversations.
  ///
  /// In en, this message translates to:
  /// **'Conversations'**
  String get aiConversations;

  /// No description provided for @aiMemory.
  ///
  /// In en, this message translates to:
  /// **'Memory'**
  String get aiMemory;

  /// No description provided for @creatorStudioTitle.
  ///
  /// In en, this message translates to:
  /// **'Creator Studio'**
  String get creatorStudioTitle;

  /// No description provided for @creatorStudioSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Browser WHIP publishing with OBS as the companion path.'**
  String get creatorStudioSubtitle;

  /// No description provided for @creatorStudioHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'STUDIO'**
  String get creatorStudioHeroEyebrow;

  /// No description provided for @creatorStudioHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Preview, publish, overlays, and guests — one control surface.'**
  String get creatorStudioHeroBody;

  /// No description provided for @creatorStudioOpenLive.
  ///
  /// In en, this message translates to:
  /// **'Open Live'**
  String get creatorStudioOpenLive;

  /// No description provided for @settingsHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'ACCOUNT'**
  String get settingsHeroEyebrow;

  /// No description provided for @settingsHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Profile, privacy, language, and security — tuned for every device.'**
  String get settingsHeroBody;

  /// No description provided for @conferencesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Business and education rooms with media readiness and Aura support.'**
  String get conferencesSubtitle;

  /// No description provided for @conferencesCreateRoom.
  ///
  /// In en, this message translates to:
  /// **'Create room'**
  String get conferencesCreateRoom;

  /// No description provided for @conferencesCreateDialogTitle.
  ///
  /// In en, this message translates to:
  /// **'Create conference room'**
  String get conferencesCreateDialogTitle;

  /// No description provided for @conferencesRoomTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get conferencesRoomTitleLabel;

  /// No description provided for @conferencesRoomTitleHint.
  ///
  /// In en, this message translates to:
  /// **'Weekly planning or algebra studio'**
  String get conferencesRoomTitleHint;

  /// No description provided for @conferencesPurposeLabel.
  ///
  /// In en, this message translates to:
  /// **'Purpose'**
  String get conferencesPurposeLabel;

  /// No description provided for @conferencesPurposeBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get conferencesPurposeBusiness;

  /// No description provided for @conferencesPurposeEducation.
  ///
  /// In en, this message translates to:
  /// **'Education'**
  String get conferencesPurposeEducation;

  /// No description provided for @conferencesPurposeSocial.
  ///
  /// In en, this message translates to:
  /// **'Social'**
  String get conferencesPurposeSocial;

  /// No description provided for @conferencesRoomScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Conference room'**
  String get conferencesRoomScreenTitle;

  /// No description provided for @conferencesRoomScreenSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Join with camera preview and publish through the configured media plane.'**
  String get conferencesRoomScreenSubtitle;

  /// No description provided for @conferencesTranslationActive.
  ///
  /// In en, this message translates to:
  /// **'AI translation active'**
  String get conferencesTranslationActive;

  /// No description provided for @conferencesAiLabel.
  ///
  /// In en, this message translates to:
  /// **'AI'**
  String get conferencesAiLabel;

  /// No description provided for @conferencesCaptions.
  ///
  /// In en, this message translates to:
  /// **'Captions'**
  String get conferencesCaptions;

  /// No description provided for @conferencesMediaReady.
  ///
  /// In en, this message translates to:
  /// **'Media plane is ready for WHIP publishing.'**
  String get conferencesMediaReady;

  /// No description provided for @conferencesMediaWaiting.
  ///
  /// In en, this message translates to:
  /// **'Awaiting the configured MediaMTX media plane.'**
  String get conferencesMediaWaiting;

  /// No description provided for @conferencesPreviewUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Camera preview is unavailable on this platform. Use OBS or a companion device.'**
  String get conferencesPreviewUnavailable;

  /// No description provided for @conferencesPreviewLive.
  ///
  /// In en, this message translates to:
  /// **'Camera and microphone preview is live.'**
  String get conferencesPreviewLive;

  /// No description provided for @conferencesMicrophoneMuted.
  ///
  /// In en, this message translates to:
  /// **'Microphone muted.'**
  String get conferencesMicrophoneMuted;

  /// No description provided for @conferencesMicrophoneUnmuted.
  ///
  /// In en, this message translates to:
  /// **'Microphone unmuted.'**
  String get conferencesMicrophoneUnmuted;

  /// No description provided for @conferencesCameraDisabled.
  ///
  /// In en, this message translates to:
  /// **'Camera disabled.'**
  String get conferencesCameraDisabled;

  /// No description provided for @conferencesCameraEnabled.
  ///
  /// In en, this message translates to:
  /// **'Camera enabled.'**
  String get conferencesCameraEnabled;

  /// No description provided for @conferencesScreenShareActive.
  ///
  /// In en, this message translates to:
  /// **'Screen share is publishing.'**
  String get conferencesScreenShareActive;

  /// No description provided for @conferencesScreenShareStopped.
  ///
  /// In en, this message translates to:
  /// **'Screen share stopped.'**
  String get conferencesScreenShareStopped;

  /// No description provided for @conferencesCaptionsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Short clip captions use MediaRecorder on SYLORA web. Open this room in a browser to record and transcribe.'**
  String get conferencesCaptionsUnavailable;

  /// No description provided for @conferencesCaptionsRecording.
  ///
  /// In en, this message translates to:
  /// **'Recording a short microphone clip… tap “Stop & transcribe” when ready.'**
  String get conferencesCaptionsRecording;

  /// No description provided for @conferencesCaptionsTranscribing.
  ///
  /// In en, this message translates to:
  /// **'Transcribing the recorded clip…'**
  String get conferencesCaptionsTranscribing;

  /// No description provided for @conferencesCaptionsNoSpeech.
  ///
  /// In en, this message translates to:
  /// **'No speech was detected in that clip.'**
  String get conferencesCaptionsNoSpeech;

  /// No description provided for @conferencesAuraResponded.
  ///
  /// In en, this message translates to:
  /// **'Aura responded.'**
  String get conferencesAuraResponded;

  /// No description provided for @conferencesActiveParticipants.
  ///
  /// In en, this message translates to:
  /// **'{count} active'**
  String conferencesActiveParticipants(int count);

  /// No description provided for @conferencesOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get conferencesOpen;

  /// No description provided for @conferencesJoinCode.
  ///
  /// In en, this message translates to:
  /// **'Join code {code}'**
  String conferencesJoinCode(String code);

  /// No description provided for @conferencesMediaPreview.
  ///
  /// In en, this message translates to:
  /// **'Media preview'**
  String get conferencesMediaPreview;

  /// No description provided for @conferencesMediaSupported.
  ///
  /// In en, this message translates to:
  /// **'This build can request camera and microphone preview and publish over WHIP when MediaMTX is ready.'**
  String get conferencesMediaSupported;

  /// No description provided for @conferencesMediaUnsupported.
  ///
  /// In en, this message translates to:
  /// **'Camera preview is unavailable on this build. Use OBS or a companion browser device for publishing.'**
  String get conferencesMediaUnsupported;

  /// No description provided for @conferencesMediaPlane.
  ///
  /// In en, this message translates to:
  /// **'Media plane: {reason}'**
  String conferencesMediaPlane(String reason);

  /// No description provided for @conferencesStartPreview.
  ///
  /// In en, this message translates to:
  /// **'Start preview'**
  String get conferencesStartPreview;

  /// No description provided for @conferencesPublishWhip.
  ///
  /// In en, this message translates to:
  /// **'Publish WHIP'**
  String get conferencesPublishWhip;

  /// No description provided for @conferencesRefreshMedia.
  ///
  /// In en, this message translates to:
  /// **'Refresh media'**
  String get conferencesRefreshMedia;

  /// No description provided for @commonReconnectMedia.
  ///
  /// In en, this message translates to:
  /// **'Reconnect media'**
  String get commonReconnectMedia;

  /// No description provided for @conferencesContributionGallery.
  ///
  /// In en, this message translates to:
  /// **'Contribution gallery'**
  String get conferencesContributionGallery;

  /// No description provided for @conferencesContributionGalleryDescription.
  ///
  /// In en, this message translates to:
  /// **'Each publisher uses an isolated WHIP path. Peers subscribe with WHEP — not an SFU composite feed.'**
  String get conferencesContributionGalleryDescription;

  /// No description provided for @conferencesRefreshParticipants.
  ///
  /// In en, this message translates to:
  /// **'Refresh participants'**
  String get conferencesRefreshParticipants;

  /// No description provided for @conferencesSubscribeWhep.
  ///
  /// In en, this message translates to:
  /// **'Subscribe WHEP'**
  String get conferencesSubscribeWhep;

  /// No description provided for @conferencesContributionWhepUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Contribution WHEP is unavailable until the media plane is configured.'**
  String get conferencesContributionWhepUnavailable;

  /// No description provided for @conferencesWhepGalleryUnavailable.
  ///
  /// In en, this message translates to:
  /// **'WHEP gallery is available on web and native WebRTC builds.'**
  String get conferencesWhepGalleryUnavailable;

  /// No description provided for @conferencesContributionSubscribed.
  ///
  /// In en, this message translates to:
  /// **'Subscribed to contribution {userId}'**
  String conferencesContributionSubscribed(String userId);

  /// No description provided for @conferencesAuraDescription.
  ///
  /// In en, this message translates to:
  /// **'Ask for meeting summaries, classroom prompts, agenda help, or follow-up wording.'**
  String get conferencesAuraDescription;

  /// No description provided for @conferencesAskAura.
  ///
  /// In en, this message translates to:
  /// **'Ask Aura'**
  String get conferencesAskAura;

  /// No description provided for @conferencesAskAuraHint.
  ///
  /// In en, this message translates to:
  /// **'Turn this discussion into next steps…'**
  String get conferencesAskAuraHint;

  /// No description provided for @conferencesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No conference rooms yet'**
  String get conferencesEmptyTitle;

  /// No description provided for @conferencesEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Create a business or education room to start a focused video session.'**
  String get conferencesEmptyMessage;

  /// No description provided for @conferencesUnmute.
  ///
  /// In en, this message translates to:
  /// **'Unmute'**
  String get conferencesUnmute;

  /// No description provided for @conferencesMute.
  ///
  /// In en, this message translates to:
  /// **'Mute'**
  String get conferencesMute;

  /// No description provided for @conferencesCameraOn.
  ///
  /// In en, this message translates to:
  /// **'Camera on'**
  String get conferencesCameraOn;

  /// No description provided for @conferencesCameraOff.
  ///
  /// In en, this message translates to:
  /// **'Camera off'**
  String get conferencesCameraOff;

  /// No description provided for @conferencesStopShare.
  ///
  /// In en, this message translates to:
  /// **'Stop share'**
  String get conferencesStopShare;

  /// No description provided for @conferencesShareScreen.
  ///
  /// In en, this message translates to:
  /// **'Share screen'**
  String get conferencesShareScreen;

  /// No description provided for @conferencesTranslationOn.
  ///
  /// In en, this message translates to:
  /// **'Translation on'**
  String get conferencesTranslationOn;

  /// No description provided for @conferencesAiTranslate.
  ///
  /// In en, this message translates to:
  /// **'AI translate'**
  String get conferencesAiTranslate;

  /// No description provided for @conferencesStopAndTranscribe.
  ///
  /// In en, this message translates to:
  /// **'Stop & transcribe'**
  String get conferencesStopAndTranscribe;

  /// No description provided for @conferencesLiveGifts.
  ///
  /// In en, this message translates to:
  /// **'Live gifts'**
  String get conferencesLiveGifts;

  /// No description provided for @conferencesLiveGiftsDescription.
  ///
  /// In en, this message translates to:
  /// **'Choose a gift for the host while this conference is active.'**
  String get conferencesLiveGiftsDescription;

  /// No description provided for @conferencesGiftsLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading conference gifts…'**
  String get conferencesGiftsLoading;

  /// No description provided for @conferencesGiftsLoadError.
  ///
  /// In en, this message translates to:
  /// **'Gifts could not load'**
  String get conferencesGiftsLoadError;

  /// No description provided for @conferencesGiftsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No gifts available'**
  String get conferencesGiftsEmpty;

  /// No description provided for @conferencesGiftsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'The conference is ready, but the gift catalog is empty.'**
  String get conferencesGiftsEmptyMessage;

  /// No description provided for @conferencesRefreshGifts.
  ///
  /// In en, this message translates to:
  /// **'Refresh gifts'**
  String get conferencesRefreshGifts;

  /// No description provided for @conferencesGiftCombo.
  ///
  /// In en, this message translates to:
  /// **'{name} · combo ×{count}'**
  String conferencesGiftCombo(String name, int count);

  /// No description provided for @conferencesGiftSent.
  ///
  /// In en, this message translates to:
  /// **'{name} sent'**
  String conferencesGiftSent(String name);

  /// No description provided for @conferencesGiftSentToHost.
  ///
  /// In en, this message translates to:
  /// **'Sent {name} to the host.'**
  String conferencesGiftSentToHost(String name);

  /// No description provided for @mediaSettingsSaved.
  ///
  /// In en, this message translates to:
  /// **'Media settings saved for all platforms.'**
  String get mediaSettingsSaved;

  /// No description provided for @mediaSettingsWebNote.
  ///
  /// In en, this message translates to:
  /// **'Browser WHIP publish is available on Web. Desktop uses OBS Companion and Virtual Camera.'**
  String get mediaSettingsWebNote;

  /// No description provided for @mediaSettingsNativeNote.
  ///
  /// In en, this message translates to:
  /// **'On desktop and mobile, use OBS Companion and Virtual Camera for production publishing.'**
  String get mediaSettingsNativeNote;

  /// No description provided for @mediaSettingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Camera & Audio'**
  String get mediaSettingsTitle;

  /// No description provided for @mediaSettingsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Production media stack for Live, Calls, and Creator Studio'**
  String get mediaSettingsSubtitle;

  /// No description provided for @mediaSettingsHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'MEDIA STACK'**
  String get mediaSettingsHeroEyebrow;

  /// No description provided for @mediaSettingsHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Ready for production'**
  String get mediaSettingsHeroTitle;

  /// No description provided for @mediaSettingsCameraSection.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get mediaSettingsCameraSection;

  /// No description provided for @mediaSettingsCameraDevice.
  ///
  /// In en, this message translates to:
  /// **'Camera device'**
  String get mediaSettingsCameraDevice;

  /// No description provided for @mediaSettingsDefaultDevice.
  ///
  /// In en, this message translates to:
  /// **'Default'**
  String get mediaSettingsDefaultDevice;

  /// No description provided for @mediaSettingsFrontCamera.
  ///
  /// In en, this message translates to:
  /// **'Front camera'**
  String get mediaSettingsFrontCamera;

  /// No description provided for @mediaSettingsRearCamera.
  ///
  /// In en, this message translates to:
  /// **'Rear camera'**
  String get mediaSettingsRearCamera;

  /// No description provided for @mediaSettingsVirtualDevice.
  ///
  /// In en, this message translates to:
  /// **'Virtual device'**
  String get mediaSettingsVirtualDevice;

  /// No description provided for @mediaSettingsResolution.
  ///
  /// In en, this message translates to:
  /// **'Resolution'**
  String get mediaSettingsResolution;

  /// No description provided for @mediaSettingsMirrorPreview.
  ///
  /// In en, this message translates to:
  /// **'Mirror preview'**
  String get mediaSettingsMirrorPreview;

  /// No description provided for @mediaSettingsAudioSection.
  ///
  /// In en, this message translates to:
  /// **'Microphone & audio routing'**
  String get mediaSettingsAudioSection;

  /// No description provided for @mediaSettingsMicrophone.
  ///
  /// In en, this message translates to:
  /// **'Microphone'**
  String get mediaSettingsMicrophone;

  /// No description provided for @mediaSettingsHeadset.
  ///
  /// In en, this message translates to:
  /// **'Headset'**
  String get mediaSettingsHeadset;

  /// No description provided for @mediaSettingsUsbMicrophone.
  ///
  /// In en, this message translates to:
  /// **'USB microphone'**
  String get mediaSettingsUsbMicrophone;

  /// No description provided for @mediaSettingsAudioRoute.
  ///
  /// In en, this message translates to:
  /// **'Audio route'**
  String get mediaSettingsAudioRoute;

  /// No description provided for @mediaSettingsStreamMix.
  ///
  /// In en, this message translates to:
  /// **'Stream mix'**
  String get mediaSettingsStreamMix;

  /// No description provided for @mediaSettingsMonitorMix.
  ///
  /// In en, this message translates to:
  /// **'Monitor mix'**
  String get mediaSettingsMonitorMix;

  /// No description provided for @mediaSettingsVoipPath.
  ///
  /// In en, this message translates to:
  /// **'Voice call path'**
  String get mediaSettingsVoipPath;

  /// No description provided for @mediaSettingsHeadphones.
  ///
  /// In en, this message translates to:
  /// **'Headphones'**
  String get mediaSettingsHeadphones;

  /// No description provided for @mediaSettingsNoiseSuppression.
  ///
  /// In en, this message translates to:
  /// **'Noise suppression'**
  String get mediaSettingsNoiseSuppression;

  /// No description provided for @mediaSettingsEchoCancellation.
  ///
  /// In en, this message translates to:
  /// **'Echo cancellation'**
  String get mediaSettingsEchoCancellation;

  /// No description provided for @mediaSettingsObsSection.
  ///
  /// In en, this message translates to:
  /// **'OBS & Virtual Camera'**
  String get mediaSettingsObsSection;

  /// No description provided for @mediaSettingsObsConnected.
  ///
  /// In en, this message translates to:
  /// **'OBS Companion connected'**
  String get mediaSettingsObsConnected;

  /// No description provided for @mediaSettingsObsConnectedDescription.
  ///
  /// In en, this message translates to:
  /// **'Scene sync + start with OBS'**
  String get mediaSettingsObsConnectedDescription;

  /// No description provided for @mediaSettingsVirtualCamera.
  ///
  /// In en, this message translates to:
  /// **'SYLORA Virtual Camera'**
  String get mediaSettingsVirtualCamera;

  /// No description provided for @mediaSettingsVirtualCameraDescription.
  ///
  /// In en, this message translates to:
  /// **'Expose feed to Zoom, Meet, or OBS'**
  String get mediaSettingsVirtualCameraDescription;

  /// No description provided for @mediaSettingsStreamingSection.
  ///
  /// In en, this message translates to:
  /// **'Streaming'**
  String get mediaSettingsStreamingSection;

  /// No description provided for @mediaSettingsBitrate.
  ///
  /// In en, this message translates to:
  /// **'Bitrate (kbps)'**
  String get mediaSettingsBitrate;

  /// No description provided for @mediaSettingsLatencyMode.
  ///
  /// In en, this message translates to:
  /// **'Latency mode'**
  String get mediaSettingsLatencyMode;

  /// No description provided for @mediaSettingsUltraLowLatency.
  ///
  /// In en, this message translates to:
  /// **'Ultra low'**
  String get mediaSettingsUltraLowLatency;

  /// No description provided for @mediaSettingsLowLatency.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get mediaSettingsLowLatency;

  /// No description provided for @mediaSettingsNormalLatency.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get mediaSettingsNormalLatency;

  /// No description provided for @mediaSettingsRecordingSection.
  ///
  /// In en, this message translates to:
  /// **'Recording'**
  String get mediaSettingsRecordingSection;

  /// No description provided for @mediaSettingsLocalRecording.
  ///
  /// In en, this message translates to:
  /// **'Local recording'**
  String get mediaSettingsLocalRecording;

  /// No description provided for @mediaSettingsCloudRecording.
  ///
  /// In en, this message translates to:
  /// **'Cloud recording'**
  String get mediaSettingsCloudRecording;

  /// No description provided for @mediaSettingsCloudRecordingDescription.
  ///
  /// In en, this message translates to:
  /// **'Uploads to configured object storage'**
  String get mediaSettingsCloudRecordingDescription;

  /// No description provided for @mediaSettingsSaveProfile.
  ///
  /// In en, this message translates to:
  /// **'Save media profile'**
  String get mediaSettingsSaveProfile;

  /// No description provided for @earningsTitle.
  ///
  /// In en, this message translates to:
  /// **'Creator Earnings'**
  String get earningsTitle;

  /// No description provided for @earningsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Live gifts, tips, and payouts — one ecosystem ledger.'**
  String get earningsSubtitle;

  /// No description provided for @earningsHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'EARNINGS'**
  String get earningsHeroEyebrow;

  /// No description provided for @earningsHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Your creator balance'**
  String get earningsHeroTitle;

  /// No description provided for @earningsHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Tips and gifts count only from Live Streams, Guest Streams, Multi-host Conferences, and Voice Rooms. Gift Shop is for buying inventory — not sending.'**
  String get earningsHeroBody;

  /// No description provided for @earningsTotalAvailable.
  ///
  /// In en, this message translates to:
  /// **'Total available'**
  String get earningsTotalAvailable;

  /// No description provided for @earningsMinorUnits.
  ///
  /// In en, this message translates to:
  /// **'{amount} minor units'**
  String earningsMinorUnits(int amount);

  /// No description provided for @earningsAcceptLiveGifts.
  ///
  /// In en, this message translates to:
  /// **'Accept live gifts'**
  String get earningsAcceptLiveGifts;

  /// No description provided for @earningsAcceptLiveGiftsDescription.
  ///
  /// In en, this message translates to:
  /// **'When off, viewers cannot send gifts during your live sessions.'**
  String get earningsAcceptLiveGiftsDescription;

  /// No description provided for @earningsRecentLedger.
  ///
  /// In en, this message translates to:
  /// **'Recent ledger'**
  String get earningsRecentLedger;

  /// No description provided for @earningsEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No earnings yet'**
  String get earningsEmptyTitle;

  /// No description provided for @earningsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Go live and let viewers send gifts from the live tray.'**
  String get earningsEmptyMessage;

  /// No description provided for @earningsOpenLive.
  ///
  /// In en, this message translates to:
  /// **'Open Live'**
  String get earningsOpenLive;

  /// No description provided for @communitiesTitle.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get communitiesTitle;

  /// No description provided for @communitiesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Find people around shared interests or start a space of your own.'**
  String get communitiesSubtitle;

  /// No description provided for @communitiesCreate.
  ///
  /// In en, this message translates to:
  /// **'Create community'**
  String get communitiesCreate;

  /// No description provided for @communitiesHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'COMMUNITIES'**
  String get communitiesHeroEyebrow;

  /// No description provided for @communitiesHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Find your people'**
  String get communitiesHeroTitle;

  /// No description provided for @communitiesHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Browse public spaces and communities you belong to, then continue into their existing channels.'**
  String get communitiesHeroBody;

  /// No description provided for @communitiesSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search communities'**
  String get communitiesSearchHint;

  /// No description provided for @communitiesSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get communitiesSearch;

  /// No description provided for @communitiesClearSearch.
  ///
  /// In en, this message translates to:
  /// **'Clear search'**
  String get communitiesClearSearch;

  /// No description provided for @communitiesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No communities yet'**
  String get communitiesEmptyTitle;

  /// No description provided for @communitiesNoMatchesTitle.
  ///
  /// In en, this message translates to:
  /// **'No matching communities'**
  String get communitiesNoMatchesTitle;

  /// No description provided for @communitiesEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Create the first community to begin gathering people.'**
  String get communitiesEmptyMessage;

  /// No description provided for @communitiesNoMatchesMessage.
  ///
  /// In en, this message translates to:
  /// **'Try another name, description, or slug.'**
  String get communitiesNoMatchesMessage;

  /// No description provided for @communitiesNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get communitiesNameLabel;

  /// No description provided for @communitiesNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a community name.'**
  String get communitiesNameRequired;

  /// No description provided for @communitiesSlugLabel.
  ///
  /// In en, this message translates to:
  /// **'Slug'**
  String get communitiesSlugLabel;

  /// No description provided for @communitiesSlugHelper.
  ///
  /// In en, this message translates to:
  /// **'Lowercase letters, numbers, and hyphens.'**
  String get communitiesSlugHelper;

  /// No description provided for @communitiesSlugInvalid.
  ///
  /// In en, this message translates to:
  /// **'Use at least 3 lowercase URL-safe characters.'**
  String get communitiesSlugInvalid;

  /// No description provided for @communitiesDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get communitiesDescriptionLabel;

  /// No description provided for @communitiesVisibilityLabel.
  ///
  /// In en, this message translates to:
  /// **'Visibility'**
  String get communitiesVisibilityLabel;

  /// No description provided for @communitiesVisibilityPublic.
  ///
  /// In en, this message translates to:
  /// **'Public'**
  String get communitiesVisibilityPublic;

  /// No description provided for @communitiesVisibilityPrivate.
  ///
  /// In en, this message translates to:
  /// **'Private — requests require approval'**
  String get communitiesVisibilityPrivate;

  /// No description provided for @communitiesVisibilityPrivateShort.
  ///
  /// In en, this message translates to:
  /// **'Private'**
  String get communitiesVisibilityPrivateShort;

  /// No description provided for @communitiesVisibilityInviteOnly.
  ///
  /// In en, this message translates to:
  /// **'Invite only'**
  String get communitiesVisibilityInviteOnly;

  /// No description provided for @communitiesJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get communitiesJoined;

  /// No description provided for @communitiesLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave community'**
  String get communitiesLeave;

  /// No description provided for @communitiesJoin.
  ///
  /// In en, this message translates to:
  /// **'Join community'**
  String get communitiesJoin;

  /// No description provided for @communitiesMembershipPending.
  ///
  /// In en, this message translates to:
  /// **'Membership request submitted.'**
  String get communitiesMembershipPending;

  /// No description provided for @communitiesMembershipStatus.
  ///
  /// In en, this message translates to:
  /// **'Community membership: {status}'**
  String communitiesMembershipStatus(String status);

  /// No description provided for @communitiesChannels.
  ///
  /// In en, this message translates to:
  /// **'Channels'**
  String get communitiesChannels;

  /// No description provided for @communitiesNoChannelsTitle.
  ///
  /// In en, this message translates to:
  /// **'No visible channels'**
  String get communitiesNoChannelsTitle;

  /// No description provided for @communitiesNoChannelsMessage.
  ///
  /// In en, this message translates to:
  /// **'No channels are visible in this community.'**
  String get communitiesNoChannelsMessage;

  /// No description provided for @navMusic.
  ///
  /// In en, this message translates to:
  /// **'Music'**
  String get navMusic;

  /// No description provided for @navAura.
  ///
  /// In en, this message translates to:
  /// **'Aura'**
  String get navAura;

  /// No description provided for @navStudio.
  ///
  /// In en, this message translates to:
  /// **'Studio'**
  String get navStudio;

  /// No description provided for @navLearn.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get navLearn;

  /// No description provided for @navMe.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get navMe;

  /// No description provided for @moreCommunities.
  ///
  /// In en, this message translates to:
  /// **'Communities'**
  String get moreCommunities;

  /// No description provided for @moreEarnings.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get moreEarnings;

  /// No description provided for @moreGiftShop.
  ///
  /// In en, this message translates to:
  /// **'Gift Shop'**
  String get moreGiftShop;

  /// No description provided for @moreMediaSettings.
  ///
  /// In en, this message translates to:
  /// **'Camera & Audio'**
  String get moreMediaSettings;

  /// No description provided for @auraTipFeed.
  ///
  /// In en, this message translates to:
  /// **'Hi — I am here while you scroll the feed.'**
  String get auraTipFeed;

  /// No description provided for @auraTipFriends.
  ///
  /// In en, this message translates to:
  /// **'Let us find people who feel warm to you.'**
  String get auraTipFriends;

  /// No description provided for @auraTipConferences.
  ///
  /// In en, this message translates to:
  /// **'I am listening to the meeting and can help as it goes.'**
  String get auraTipConferences;

  /// No description provided for @auraTipLive.
  ///
  /// In en, this message translates to:
  /// **'Keeping the stream in focus — tell me if you need help.'**
  String get auraTipLive;

  /// No description provided for @auraTipAi.
  ///
  /// In en, this message translates to:
  /// **'I am Aura. Write like a person — I will answer like one.'**
  String get auraTipAi;

  /// No description provided for @auraTipGifts.
  ///
  /// In en, this message translates to:
  /// **'I can suggest a gift that will truly land.'**
  String get auraTipGifts;

  /// No description provided for @auraTipCreatorStudio.
  ///
  /// In en, this message translates to:
  /// **'Ready to help with the studio — step by step.'**
  String get auraTipCreatorStudio;

  /// No description provided for @auraTipMarketplace.
  ///
  /// In en, this message translates to:
  /// **'Looking for what actually fits you.'**
  String get auraTipMarketplace;

  /// No description provided for @auraTipBusiness.
  ///
  /// In en, this message translates to:
  /// **'Holding business context so you do not get lost.'**
  String get auraTipBusiness;

  /// No description provided for @auraTipLearning.
  ///
  /// In en, this message translates to:
  /// **'Learning with you — ask anything.'**
  String get auraTipLearning;

  /// No description provided for @auraTipCreator.
  ///
  /// In en, this message translates to:
  /// **'Your creative rhythm — I will adapt.'**
  String get auraTipCreator;

  /// No description provided for @auraTipSettings.
  ///
  /// In en, this message translates to:
  /// **'Let us set things up quietly, without noise.'**
  String get auraTipSettings;

  /// No description provided for @auraTipDefault.
  ///
  /// In en, this message translates to:
  /// **'I am Aura — ready to help.'**
  String get auraTipDefault;

  /// No description provided for @auraSummonLabel.
  ///
  /// In en, this message translates to:
  /// **'Summon Aura'**
  String get auraSummonLabel;

  /// No description provided for @auraDismissLabel.
  ///
  /// In en, this message translates to:
  /// **'Hide Aura'**
  String get auraDismissLabel;

  /// No description provided for @liveIntegrationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Live integrations'**
  String get liveIntegrationsTitle;

  /// No description provided for @liveIntegrationsBody.
  ///
  /// In en, this message translates to:
  /// **'Connect streaming platforms so Aura can co-host. Native SYLORA Live is ready. TikTok LIVE unlocks after official provider access.'**
  String get liveIntegrationsBody;

  /// No description provided for @liveNativeReady.
  ///
  /// In en, this message translates to:
  /// **'SYLORA Live — ready'**
  String get liveNativeReady;

  /// No description provided for @liveTikTokBlocked.
  ///
  /// In en, this message translates to:
  /// **'TikTok LIVE — awaiting provider access'**
  String get liveTikTokBlocked;

  /// No description provided for @liveDestinationsHint.
  ///
  /// In en, this message translates to:
  /// **'Destinations appear after an official integration is connected.'**
  String get liveDestinationsHint;

  /// No description provided for @liveGuestInvitations.
  ///
  /// In en, this message translates to:
  /// **'Guest invitations'**
  String get liveGuestInvitations;

  /// No description provided for @liveGuestInvitationsBody.
  ///
  /// In en, this message translates to:
  /// **'Accept a real host invite, publish a separate WHIP contribution when credentials are issued, or send a gift to the host.'**
  String get liveGuestInvitationsBody;

  /// No description provided for @liveNoGuestInvites.
  ///
  /// In en, this message translates to:
  /// **'No incoming guest invitations. Host invites will appear here.'**
  String get liveNoGuestInvites;
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
