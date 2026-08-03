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
  /// **'Your feed is quiet'**
  String get feedEmpty;

  /// No description provided for @feedEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No published posts were returned. Publish a post or follow people to shape your feed.'**
  String get feedEmptyMessage;

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

  /// No description provided for @feedRecommended.
  ///
  /// In en, this message translates to:
  /// **'Recommended'**
  String get feedRecommended;

  /// No description provided for @feedRecommendationsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Recommendations unavailable'**
  String get feedRecommendationsUnavailable;

  /// No description provided for @feedRecommendationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'The API has no recommendations yet.'**
  String get feedRecommendationsEmpty;

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
  /// **'Go live with WHIP, OBS, or studio tools — honest platform integrations only.'**
  String get liveSubtitle;

  /// No description provided for @liveHeroEyebrow.
  ///
  /// In en, this message translates to:
  /// **'BROADCAST'**
  String get liveHeroEyebrow;

  /// No description provided for @liveHeroBody.
  ///
  /// In en, this message translates to:
  /// **'Stage a session, open Creator Studio, and keep every integration real.'**
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
