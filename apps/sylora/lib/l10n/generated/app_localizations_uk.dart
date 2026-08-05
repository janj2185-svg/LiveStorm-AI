// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Ukrainian (`uk`).
class AppLocalizationsUk extends AppLocalizations {
  AppLocalizationsUk([String locale = 'uk']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Де AI зустрічає душу';

  @override
  String get appDescription =>
      'Твій світ у гармонії — жива присутність, творчий потік і Aura поруч.';

  @override
  String get navHome => 'Головна';

  @override
  String get navFeed => 'Стрічка';

  @override
  String get navLive => 'Ефір';

  @override
  String get navAi => 'AI';

  @override
  String get navGifts => 'Подарунки';

  @override
  String get navMessages => 'Повідомлення';

  @override
  String get navProfile => 'Профіль';

  @override
  String get navSettings => 'Налаштування';

  @override
  String get navMore => 'Більше';

  @override
  String get navSearch => 'Пошук';

  @override
  String get navMarket => 'Маркет';

  @override
  String get navCreator => 'Автор';

  @override
  String get navWorkspace => 'Робочий простір';

  @override
  String get navAdmin => 'Адмін';

  @override
  String get authLogin => 'Увійти';

  @override
  String get authRegister => 'Зареєструватися';

  @override
  String get authPassword => 'Пароль';

  @override
  String get authOtp => 'Одноразовий код';

  @override
  String get authBack => 'Назад';

  @override
  String get authBackToWorld => 'Назад до світу';

  @override
  String get authCreateAccount => 'Створити акаунт';

  @override
  String get authContinue => 'Почати подорож';

  @override
  String get authContinueWithPhone => 'Продовжити з телефоном';

  @override
  String get authContinueWithEmailOtp => 'Увійти кодом на пошту';

  @override
  String authContinueWithProvider(String provider) {
    return 'Продовжити з $provider';
  }

  @override
  String get authSignInToEcosystem => 'Увійдіть у свою AI-екосистему';

  @override
  String get authPhone => 'Телефон';

  @override
  String get authEmail => 'Електронна пошта';

  @override
  String get authEmailAddress => 'Електронна пошта';

  @override
  String get authPhoneNumber => 'Телефон';

  @override
  String get authSmsCode => 'Код з SMS';

  @override
  String get authEmailCode => 'Код з листа';

  @override
  String get authSendCode => 'Надіслати код';

  @override
  String get authResendCode => 'Надіслати код знову';

  @override
  String authSendAgainIn(int seconds) {
    return 'Надіслати знову через $seconds с';
  }

  @override
  String get authForgotPassword => 'Забули пароль?';

  @override
  String get authVerifyEmailAgain =>
      'Підтвердити пошту або надіслати лист ще раз';

  @override
  String get authDisplayName => 'Ім’я для профілю';

  @override
  String get authPasswordHelper => 'Щонайменше 12 символів';

  @override
  String get authCodeEmailChip => 'Код на пошту';

  @override
  String get authPasswordChip => 'Пароль';

  @override
  String get authPhoneUnavailable => 'Вхід за телефоном тимчасово недоступний.';

  @override
  String get authSmsInstruction => 'Ми надішлемо одноразовий код у SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Ми надішлемо одноразовий код на електронну пошту.';

  @override
  String get authWelcomeEyebrow => 'Увійди у свій AI-світ';

  @override
  String get authWelcomeBody =>
      'Aura чекає — Live, друзі, творчість і один спокійний вхід.';

  @override
  String get authOAuthOpenFailed => 'Не вдалося відкрити сторінку входу.';

  @override
  String get authOAuthProviderUnavailable =>
      'Провайдер недоступний. Спробуйте інший спосіб входу.';

  @override
  String get authMobileSocialPending =>
      'Соціальний вхід у мобільній збірці з’явиться після налаштування deep-link.';

  @override
  String get authReturnToLogin => 'Повернутися до входу';

  @override
  String get authMfaTitle => 'Двофакторна автентифікація';

  @override
  String get authMfaPrompt => 'Введіть код із застосунку-автентифікатора';

  @override
  String get authCode => 'Код';

  @override
  String get authConfirm => 'Підтвердити';

  @override
  String get authEmailVerificationTitle => 'Підтвердження пошти';

  @override
  String get authPasswordResetTitle => 'Скидання пароля';

  @override
  String get authRequestPasswordReset => 'Запросити скидання пароля';

  @override
  String get authRequestVerificationEmail => 'Надіслати лист підтвердження';

  @override
  String get authSendEmail => 'Надіслати лист';

  @override
  String get authVerifyWithToken => 'Підтвердити токеном';

  @override
  String get authSetNewPassword => 'Встановити новий пароль';

  @override
  String get authToken => 'Токен';

  @override
  String get authNewPassword => 'Новий пароль';

  @override
  String get authConfirmEmail => 'Підтвердити пошту';

  @override
  String get authResetPassword => 'Скинути пароль';

  @override
  String get commonOr => 'або';

  @override
  String get commonSave => 'Зберегти';

  @override
  String get commonCancel => 'Скасувати';

  @override
  String get commonRetry => 'Повторити';

  @override
  String get commonLoading => 'Завантаження';

  @override
  String get commonError => 'Помилка';

  @override
  String get commonOffline => 'Офлайн';

  @override
  String get commonTryAgain => 'Спробувати ще раз';

  @override
  String get commonSomethingWentWrong => 'Щось пішло не так';

  @override
  String get auraCompanionLabel => 'Aura · жива супутниця';

  @override
  String get auraGreeting => 'Aura готова допомогти.';

  @override
  String get auraListening => 'Aura слухає.';

  @override
  String get auraThinking => 'Aura думає.';

  @override
  String get settingsLanguage => 'Мова';

  @override
  String get settingsLanguageDescription =>
      'Оберіть мову застосунку на цьому пристрої.';

  @override
  String get settingsDisplayAccessibility => 'Вигляд і доступність';

  @override
  String get settingsLanguageEnglish => 'Англійська';

  @override
  String get settingsLanguageUkrainian => 'Українська';

  @override
  String get settingsLanguagePolish => 'Польська';

  @override
  String get settingsLanguageGerman => 'Німецька';

  @override
  String get settingsLanguageSpanish => 'Іспанська';

  @override
  String get settingsLanguageFrench => 'Французька';

  @override
  String get settingsLanguageItalian => 'Італійська';

  @override
  String get settingsLanguagePortuguese => 'Португальська';

  @override
  String get settingsLanguageJapanese => 'Японська';

  @override
  String get settingsLanguageKorean => 'Корейська';

  @override
  String get settingsLanguageChinese => 'Китайська';

  @override
  String get navFriends => 'Друзі';

  @override
  String get feedTitle => 'Стрічка';

  @override
  String get feedSubtitle =>
      'Живий пульс SYLORA — пости, друзі й творчість в одному потоці.';

  @override
  String get feedEmpty => 'Твій світ чекає';

  @override
  String get feedEmptyMessage =>
      'Поділись першим сигналом — або знайди людей, з якими тобі буде тепло.';

  @override
  String get feedEmptyFindPeople => 'Знайти людей';

  @override
  String get homeGreetingMorning => 'Доброго ранку';

  @override
  String get homeGreetingAfternoon => 'Добрий день';

  @override
  String get homeGreetingEvening => 'Добрий вечір';

  @override
  String homeHeroLineNamed(String greeting, String name) {
    return '$greeting, $name.';
  }

  @override
  String homeHeroLine(String greeting) {
    return '$greeting. Твій світ слухає.';
  }

  @override
  String get homeDiscoverTitle => 'Відкриття';

  @override
  String get homeTalkToAura => 'Поговорити з Aura';

  @override
  String get homeGoLive => 'В ефір';

  @override
  String get aiTalkNow => 'Поговорити з Aura';

  @override
  String get aiContinueChat => 'Продовжити';

  @override
  String get aiStarterQuiet => 'Допоможи знайти спокійну ясність';

  @override
  String get aiStarterCreate => 'Допоможи створити щось прекрасне';

  @override
  String get aiStarterLive => 'Будь моєю співведучою сьогодні';

  @override
  String get aiEmptyConversations => 'Aura готова, коли ти готовий';

  @override
  String get aiEmptyConversationsBody =>
      'Почни розмову як з близькою людиною — вона пам’ятає важливе.';

  @override
  String get aiProviderUnavailable => 'Aura зараз не чує свій голос';

  @override
  String get aiProviderUnavailableBody =>
      'Ми не вигадаємо відповідь. Спробуй ще раз за мить.';

  @override
  String get liveYourStage => 'Твоя сцена';

  @override
  String get liveYourStageBody =>
      'Вийди в ефір одним подихом. Aura може бути співведучою.';

  @override
  String get liveBroadcastSetup => 'Налаштування ефіру';

  @override
  String get liveNoSessionsTitle => 'Сцена тиха';

  @override
  String get liveNoSessionsBody =>
      'Створи сесію і вийди у світло — аудиторія за один дотик.';

  @override
  String get feedRecommendationsUnavailable => 'Рекомендації відпочивають';

  @override
  String get feedRecommended => 'Для тебе';

  @override
  String get feedRecommendationsEmpty =>
      'Підпишись на людей — і тут з’явиться живий ритм.';

  @override
  String get feedCreatePost => 'Створити допис';

  @override
  String get feedLoadMore => 'Завантажити ще дописи';

  @override
  String get feedLoadingPosts => 'Завантаження дописів…';

  @override
  String get feedLoadingMoreReason =>
      'Завантажується наступна сторінка стрічки.';

  @override
  String get feedPostBodyLabel => 'Текстовий допис';

  @override
  String get feedPublishNow => 'Опублікувати зараз';

  @override
  String get feedSaveDraft => 'Зберегти як чернетку';

  @override
  String get feedPublish => 'Опублікувати';

  @override
  String get friendsTitle => 'Друзі';

  @override
  String get friendsRequests => 'Запити';

  @override
  String get friendsSuggestions => 'Пропозиції';

  @override
  String get friendsAccept => 'Прийняти';

  @override
  String get friendsReject => 'Відхилити';

  @override
  String get friendsUnfriend => 'Видалити з друзів';

  @override
  String get friendsAddFriend => 'Додати друга';

  @override
  String get friendsOnly => 'Лише друзі';

  @override
  String get friendsOnline => 'Онлайн';

  @override
  String get friendsMutual => 'Спільні друзі';

  @override
  String get friendsSearchFriends => 'Шукати друзів';

  @override
  String get friendsNoFriends => 'Друзів ще немає';

  @override
  String get friendsPendingIncoming => 'Вхідні запити';

  @override
  String get friendsPendingOutgoing => 'Вихідні запити';

  @override
  String get messagesTitle => 'Повідомлення';

  @override
  String get messagesEmpty => 'Немає розмов';

  @override
  String get messagesEmptyMessage =>
      'Історію розмов не повернено. Почніть розмову з публічним нікнеймом.';

  @override
  String get messagesTypeMessage => 'Повідомлення';

  @override
  String get messagesSend => 'Надіслати повідомлення';

  @override
  String get messagesNewConversation => 'Нова розмова';

  @override
  String get messagesRecipientHandle => 'Нікнейм одержувача';

  @override
  String get messagesStart => 'Почати';

  @override
  String get messagesConversationTitle => 'Розмова';

  @override
  String get messagesAcceptRequest => 'Прийняти запит на повідомлення';

  @override
  String get messagesDeclineRequest => 'Відхилити запит на повідомлення';

  @override
  String get moreTitle => 'Більше';

  @override
  String get moreSubtitle =>
      'Інструменти акаунта й робочі простори за ролями, які не вміщаються в компактну навігацію.';

  @override
  String get moreOpenModule => 'Відкрити модуль';

  @override
  String get moreLearning => 'Навчання';

  @override
  String get moreWallet => 'Гаманець';

  @override
  String get moreGifts => 'Подарунки';

  @override
  String get moreAi => 'AI';

  @override
  String get moreLive => 'Ефір';

  @override
  String get moreCreatorStudio => 'Студія автора';

  @override
  String get moreCreator => 'Автор';

  @override
  String get moreWorkspace => 'Робочий простір';

  @override
  String get moreAdmin => 'Адміністрування';

  @override
  String get moreSettings => 'Налаштування';

  @override
  String get settingsProfile => 'Профіль';

  @override
  String get settingsEditProfile => 'Редагувати профіль';

  @override
  String get settingsNoPublicHandle => 'Немає публічного нікнейма';

  @override
  String get settingsAccountPrivacy => 'Приватність акаунта й пошта';

  @override
  String get settingsProductEmails => 'Продуктові листи';

  @override
  String get settingsMarketingEmails => 'Маркетингові листи';

  @override
  String get settingsSecurityEmails => 'Листи безпеки';

  @override
  String get settingsSecurityEmailDescription =>
      'Бекенд може примусово надсилати критичні сповіщення безпеки.';

  @override
  String get settingsProfileVisibility => 'Видимість профілю';

  @override
  String get settingsProfilePublic => 'Публічний';

  @override
  String get settingsProfilePrivate => 'Приватний';

  @override
  String get settingsSecurity => 'Безпека';

  @override
  String get settingsSessions => 'Сесії';

  @override
  String get settingsSignOut => 'Вийти';

  @override
  String get settingsTheme => 'Тема';

  @override
  String get settingsThemeLight => 'Світла';

  @override
  String get settingsThemeDark => 'Темна';

  @override
  String get settingsThemeSystem => 'Системна';

  @override
  String get settingsNotifications => 'Сповіщення';

  @override
  String get settingsEnableNotifications => 'Увімкнути сповіщення';

  @override
  String get settingsNotificationsDescription =>
      'Підключення нативного push-токена може використовувати це налаштування.';

  @override
  String get settingsHighContrast => 'Висока контрастність';

  @override
  String get settingsReducedMotion => 'Зменшений рух';

  @override
  String settingsTextScale(String scale) {
    return 'Масштаб тексту: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => 'Застосунок-автентифікатор';

  @override
  String get liveShortLabel => 'Ефір';

  @override
  String get aiShortLabel => 'AI';

  @override
  String get giftsShortLabel => 'Подарунки';

  @override
  String get walletShortLabel => 'Гаманець';

  @override
  String get conferencesTitle => 'Конференції';

  @override
  String get conferencesStart => 'Почати конференцію';

  @override
  String get conferencesJoin => 'Приєднатися до конференції';

  @override
  String get conferencesLeave => 'Залишити конференцію';

  @override
  String get conferencesInvite => 'Запросити';

  @override
  String get conferencesAuraAssist => 'Допомога Aura';

  @override
  String get commonPremiumEmpty => 'Преміум-елементів ще немає';

  @override
  String get commonPremiumError => 'Не вдалося завантажити преміум-контент.';

  @override
  String get commonPremiumRetry => 'Повторити преміум';

  @override
  String get homeHeroEyebrow => 'ТВІЙ ЖИВИЙ AI-СВІТ';

  @override
  String get homeHeroBody =>
      'Твори, спілкуйся й розвивайся в одному світловому просторі — AI, Live, друзі та творчість разом.';

  @override
  String get homeModulesLabel => 'ПОРТАЛИ ЕКОСИСТЕМИ';

  @override
  String get homeComposeHint => 'Поділись сигналом із всесвітом…';

  @override
  String get searchTitle => 'Огляд';

  @override
  String get searchSubtitle =>
      'Знайди людей, дописи та спільноти в живій мережі.';

  @override
  String get searchHint => 'Пошук SYLORA';

  @override
  String get searchFindPeople => 'Відкрий мережу';

  @override
  String get searchFindPeopleMessage =>
      'Введи щонайменше два символи, щоб шукати людей, дописи та спільноти.';

  @override
  String get searchFocus => 'У фокус пошуку';

  @override
  String get searchNoResults => 'Нічого не знайдено';

  @override
  String get searchNoResultsMessage =>
      'За цим запитом немає збігів. Спробуй інший нік, слово або спільноту.';

  @override
  String get searchEdit => 'Змінити пошук';

  @override
  String get searchMinChars => 'Введи щонайменше два символи.';

  @override
  String get searchPeople => 'Люди';

  @override
  String get searchPosts => 'Дописи';

  @override
  String get searchCommunities => 'Спільноти';

  @override
  String get searchHeroEyebrow => 'ВІДКРИТТЯ';

  @override
  String get messagesSubtitle => 'Особисті сигнали, запити та живі розмови.';

  @override
  String get messagesHeroEyebrow => 'ВХІДНІ';

  @override
  String get messagesHeroBody =>
      'Приватні чати з кінематографічною присутністю — запити, відповіді та контекст Aura.';

  @override
  String get messagesRequestBadge => 'Запит';

  @override
  String get friendsSubtitle =>
      'Справжня дружба, запити та люди, яких ти можеш знати.';

  @override
  String get profileSubtitle => 'Публічний профіль і керування зв’язками.';

  @override
  String get profileFollow => 'Підписатися';

  @override
  String get profileUnfollow => 'Відписатися';

  @override
  String get profileMessage => 'Написати';

  @override
  String get profileMute => 'Вимкнути';

  @override
  String get profileBlock => 'Заблокувати';

  @override
  String get profileMuted => 'Акаунт вимкнено.';

  @override
  String get notificationsTitle => 'Сповіщення';

  @override
  String get notificationsReadAll => 'Прочитати все';

  @override
  String get notificationsEmpty => 'Немає сповіщень';

  @override
  String get notificationsEmptyMessage =>
      'Коли мережа оживає, сигнали з’являються тут.';

  @override
  String get notificationsMuteType => 'Вимкнути цей тип сповіщень';

  @override
  String get moreHeroEyebrow => 'ТВІЙ ЦЕНТР';

  @override
  String get moreHeroBody =>
      'Гаманець, Live, Aura, навчання та інструменти творця — одна світлова панель.';

  @override
  String get moreQuickActions => 'ШВИДКІ ДІЇ';

  @override
  String get moreConferences => 'Конференції';

  @override
  String get moreGoLive => 'В ефір';

  @override
  String get moreOpenWallet => 'Гаманець';

  @override
  String get moreEditProfile => 'Редагувати профіль';

  @override
  String get liveTitle => 'Live';

  @override
  String get liveSubtitle =>
      'Вийди в ефір одним подихом — Aura може бути співведучою.';

  @override
  String get liveHeroEyebrow => 'СЕРЦЕ SYLORA';

  @override
  String get liveHeroBody => 'Твоя сцена. Твоя аудиторія. Жива співведуча.';

  @override
  String get liveIntegrations => 'Інтеграції';

  @override
  String get liveSessions => 'Сесії';

  @override
  String get liveCreateSession => 'Створити сесію';

  @override
  String get liveNoSessions => 'Немає live-сесій';

  @override
  String get liveNoSessionsMessage =>
      'Створи сесію, щоб отримати одноразовий ключ стріму.';

  @override
  String get liveOpenStudio => 'Відкрити Creator Studio';

  @override
  String get liveGoLive => 'В ефір';

  @override
  String get liveSessionTitle => 'Назва сесії';

  @override
  String get liveCopyStreamKey => 'Скопіюй ключ стріму зараз';

  @override
  String get liveStreamKeyOnce =>
      'Цей секрет показується один раз і не відновлюється. Збережи його в налаштуваннях стрімінгу.';

  @override
  String get liveCopyClose => 'Скопіювати й закрити';

  @override
  String get liveHealthCheck => 'Перевірити стан';

  @override
  String get commonRefresh => 'Оновити';

  @override
  String get commonCreate => 'Створити';

  @override
  String get walletTitle => 'Гаманець';

  @override
  String get walletSubtitle =>
      'Баланси, поповнення, виплати та історія операцій.';

  @override
  String get walletHeroEyebrow => 'ВАРТІСТЬ';

  @override
  String get walletHeroBody =>
      'Доступні кредити та заробіток творця в одному світловому сховищі.';

  @override
  String get walletSpendable => 'Доступно';

  @override
  String get walletCreatorEarnings => 'Заробіток творця';

  @override
  String get walletTopUp => 'Поповнити';

  @override
  String get walletPayout => 'Виплата';

  @override
  String get walletHistory => 'Історія операцій';

  @override
  String get walletNoActivity => 'Немає активності';

  @override
  String get walletNoActivityMessage =>
      'Після поповнення або заробітку записи з’являться тут.';

  @override
  String get giftsTitle => 'Подарунки';

  @override
  String get giftsSubtitle => 'Каталог, інвентар і живі gift-моменти.';

  @override
  String get giftsHeroEyebrow => 'ПОДАРУНКИ';

  @override
  String get giftsHeroBody =>
      'Від rare до ultra-premium — надсилай, збирай і святкуй у русі.';

  @override
  String get giftsCatalog => 'Каталог';

  @override
  String get giftsInventory => 'Інвентар';

  @override
  String get giftsEvents => 'Події';

  @override
  String get giftsPreferences => 'Налаштування подарунків';

  @override
  String get giftsAuthoring => 'Створення подарунків';

  @override
  String get giftsEmpty => 'Подарунків немає';

  @override
  String get giftsEmptyMessage =>
      'Опублікуй READY-подарунки в Gift Studio, щоб заповнити каталог.';

  @override
  String get aiTitle => 'Aura';

  @override
  String get aiSubtitle => 'Жива супутниця по всьому SYLORA.';

  @override
  String get aiHeroEyebrow => 'ЖИВА СУПУТНИЦЯ';

  @override
  String get aiHeroBody =>
      'Говори як з людиною. Aura слухає, пам’ятає і залишається поруч.';

  @override
  String get aiAuraSettings => 'Налаштування Aura';

  @override
  String get aiOnline => 'Aura онлайн';

  @override
  String get aiConsentTitle => 'Aura готова зустріти тебе';

  @override
  String get aiConsentBody =>
      'Починаючи розмову, ти дозволяєш Aura слухати й памʼятати те, чим ділишся.';

  @override
  String get aiGrantConsent => 'Зустріти Aura';

  @override
  String get aiConversations => 'Розмови';

  @override
  String get aiMemory => 'Пам’ять';

  @override
  String get creatorStudioTitle => 'Creator Studio';

  @override
  String get creatorStudioSubtitle =>
      'Публікація з браузера через WHIP; OBS — як супутній шлях.';

  @override
  String get creatorStudioHeroEyebrow => 'СТУДІЯ';

  @override
  String get creatorStudioHeroBody =>
      'Прев’ю, ефір, оверлеї та гості — одна панель керування.';

  @override
  String get creatorStudioOpenLive => 'Відкрити Live';

  @override
  String get settingsHeroEyebrow => 'АКАУНТ';

  @override
  String get settingsHeroBody =>
      'Профіль, приватність, мова й безпека — для кожного пристрою.';

  @override
  String get conferencesSubtitle =>
      'Кімнати для бізнесу й освіти з готовністю медіа та підтримкою Aura.';

  @override
  String get conferencesCreateRoom => 'Створити кімнату';

  @override
  String get conferencesCreateDialogTitle => 'Створити конференц-кімнату';

  @override
  String get conferencesRoomTitleLabel => 'Назва';

  @override
  String get conferencesRoomTitleHint =>
      'Щотижневе планування або студія алгебри';

  @override
  String get conferencesPurposeLabel => 'Призначення';

  @override
  String get conferencesPurposeBusiness => 'Бізнес';

  @override
  String get conferencesPurposeEducation => 'Освіта';

  @override
  String get conferencesPurposeSocial => 'Спілкування';

  @override
  String get conferencesRoomScreenTitle => 'Конференц-кімната';

  @override
  String get conferencesRoomScreenSubtitle =>
      'Приєднуйтеся з прев’ю камери та публікуйте через налаштований медіасервіс.';

  @override
  String get conferencesTranslationActive => 'AI-переклад активний';

  @override
  String get conferencesAiLabel => 'AI';

  @override
  String get conferencesCaptions => 'Субтитри';

  @override
  String get conferencesMediaReady => 'Медіасервіс готовий до публікації WHIP.';

  @override
  String get conferencesMediaWaiting =>
      'Очікуємо налаштований медіасервіс MediaMTX.';

  @override
  String get conferencesPreviewUnavailable =>
      'Прев’ю камери недоступне на цій платформі. Використайте OBS або інший пристрій.';

  @override
  String get conferencesPreviewLive => 'Прев’ю камери й мікрофона активне.';

  @override
  String get conferencesMicrophoneMuted => 'Мікрофон вимкнено.';

  @override
  String get conferencesMicrophoneUnmuted => 'Мікрофон увімкнено.';

  @override
  String get conferencesCameraDisabled => 'Камеру вимкнено.';

  @override
  String get conferencesCameraEnabled => 'Камеру увімкнено.';

  @override
  String get conferencesScreenShareActive => 'Показ екрана транслюється.';

  @override
  String get conferencesScreenShareStopped => 'Показ екрана зупинено.';

  @override
  String get conferencesCaptionsUnavailable =>
      'Субтитри для коротких кліпів використовують MediaRecorder у вебверсії SYLORA. Відкрийте кімнату в браузері, щоб записати й транскрибувати.';

  @override
  String get conferencesCaptionsRecording =>
      'Записуємо короткий аудіокліп… натисніть «Зупинити й транскрибувати», коли будете готові.';

  @override
  String get conferencesCaptionsTranscribing => 'Транскрибуємо записаний кліп…';

  @override
  String get conferencesCaptionsNoSpeech =>
      'У цьому кліпі не виявлено мовлення.';

  @override
  String get conferencesAuraResponded => 'Aura відповіла.';

  @override
  String conferencesActiveParticipants(int count) {
    return 'Активні: $count';
  }

  @override
  String get conferencesOpen => 'Відкрити';

  @override
  String conferencesJoinCode(String code) {
    return 'Код приєднання: $code';
  }

  @override
  String get conferencesMediaPreview => 'Прев’ю медіа';

  @override
  String get conferencesMediaSupported =>
      'Ця збірка підтримує прев’ю камери й мікрофона та публікацію через WHIP, коли MediaMTX готовий.';

  @override
  String get conferencesMediaUnsupported =>
      'Прев’ю камери недоступне в цій збірці. Для публікації використайте OBS або браузер на іншому пристрої.';

  @override
  String conferencesMediaPlane(String reason) {
    return 'Медіасервіс: $reason';
  }

  @override
  String get conferencesStartPreview => 'Запустити прев’ю';

  @override
  String get conferencesPublishWhip => 'Опублікувати WHIP';

  @override
  String get conferencesRefreshMedia => 'Оновити медіа';

  @override
  String get commonReconnectMedia => 'Перепідключити медіа';

  @override
  String get conferencesContributionGallery => 'Галерея учасників';

  @override
  String get conferencesContributionGalleryDescription =>
      'Кожен учасник публікує через окремий шлях WHIP. Інші підписуються через WHEP — це не зведений потік SFU.';

  @override
  String get conferencesRefreshParticipants => 'Оновити учасників';

  @override
  String get conferencesSubscribeWhep => 'Підписатися через WHEP';

  @override
  String get conferencesContributionWhepUnavailable =>
      'WHEP-потік учасника недоступний, доки не налаштовано медіасервіс.';

  @override
  String get conferencesWhepGalleryUnavailable =>
      'Галерея WHEP доступна у вебверсії та нативних збірках із WebRTC.';

  @override
  String conferencesContributionSubscribed(String userId) {
    return 'Підписано на потік учасника $userId';
  }

  @override
  String get conferencesAuraDescription =>
      'Попросіть підсумок зустрічі, навчальні підказки, допомогу з порядком денним або наступними повідомленнями.';

  @override
  String get conferencesAskAura => 'Запитати Aura';

  @override
  String get conferencesAskAuraHint =>
      'Перетвори обговорення на наступні кроки…';

  @override
  String get conferencesEmptyTitle => 'Конференц-кімнат ще немає';

  @override
  String get conferencesEmptyMessage =>
      'Створіть бізнес- або освітню кімнату, щоб почати зосереджену відеосесію.';

  @override
  String get conferencesUnmute => 'Увімкнути звук';

  @override
  String get conferencesMute => 'Вимкнути звук';

  @override
  String get conferencesCameraOn => 'Увімкнути камеру';

  @override
  String get conferencesCameraOff => 'Вимкнути камеру';

  @override
  String get conferencesStopShare => 'Зупинити показ';

  @override
  String get conferencesShareScreen => 'Показати екран';

  @override
  String get conferencesTranslationOn => 'Переклад увімкнено';

  @override
  String get conferencesAiTranslate => 'AI-переклад';

  @override
  String get conferencesStopAndTranscribe => 'Зупинити й транскрибувати';

  @override
  String get conferencesLiveGifts => 'Подарунки наживо';

  @override
  String get conferencesLiveGiftsDescription =>
      'Оберіть подарунок для ведучого, поки конференція активна.';

  @override
  String get conferencesGiftsLoading => 'Завантаження подарунків конференції…';

  @override
  String get conferencesGiftsLoadError => 'Не вдалося завантажити подарунки';

  @override
  String get conferencesGiftsEmpty => 'Подарунків немає';

  @override
  String get conferencesGiftsEmptyMessage =>
      'Конференція готова, але каталог подарунків порожній.';

  @override
  String get conferencesRefreshGifts => 'Оновити подарунки';

  @override
  String conferencesGiftCombo(String name, int count) {
    return '$name · комбо ×$count';
  }

  @override
  String conferencesGiftSent(String name) {
    return '$name надіслано';
  }

  @override
  String conferencesGiftSentToHost(String name) {
    return 'Подарунок $name надіслано ведучому.';
  }

  @override
  String get mediaSettingsSaved =>
      'Налаштування медіа збережено для всіх платформ.';

  @override
  String get mediaSettingsWebNote =>
      'Публікація WHIP доступна в браузері. На комп’ютері використовуйте OBS Companion і Virtual Camera.';

  @override
  String get mediaSettingsNativeNote =>
      'На комп’ютері й мобільному використовуйте OBS Companion і Virtual Camera для професійної публікації.';

  @override
  String get mediaSettingsTitle => 'Камера й аудіо';

  @override
  String get mediaSettingsSubtitle =>
      'Професійний медіастек для ефірів, дзвінків і Creator Studio';

  @override
  String get mediaSettingsHeroEyebrow => 'МЕДІАСТЕК';

  @override
  String get mediaSettingsHeroTitle => 'Готово до ефіру';

  @override
  String get mediaSettingsCameraSection => 'Камера';

  @override
  String get mediaSettingsCameraDevice => 'Пристрій камери';

  @override
  String get mediaSettingsDefaultDevice => 'Типовий';

  @override
  String get mediaSettingsFrontCamera => 'Фронтальна камера';

  @override
  String get mediaSettingsRearCamera => 'Основна камера';

  @override
  String get mediaSettingsVirtualDevice => 'Віртуальний пристрій';

  @override
  String get mediaSettingsResolution => 'Роздільна здатність';

  @override
  String get mediaSettingsMirrorPreview => 'Дзеркальне прев’ю';

  @override
  String get mediaSettingsAudioSection => 'Мікрофон і маршрутизація аудіо';

  @override
  String get mediaSettingsMicrophone => 'Мікрофон';

  @override
  String get mediaSettingsHeadset => 'Гарнітура';

  @override
  String get mediaSettingsUsbMicrophone => 'USB-мікрофон';

  @override
  String get mediaSettingsAudioRoute => 'Аудіомаршрут';

  @override
  String get mediaSettingsStreamMix => 'Мікс ефіру';

  @override
  String get mediaSettingsMonitorMix => 'Мікс моніторингу';

  @override
  String get mediaSettingsVoipPath => 'Маршрут голосового дзвінка';

  @override
  String get mediaSettingsHeadphones => 'Навушники';

  @override
  String get mediaSettingsNoiseSuppression => 'Заглушення шуму';

  @override
  String get mediaSettingsEchoCancellation => 'Приглушення відлуння';

  @override
  String get mediaSettingsObsSection => 'OBS і віртуальна камера';

  @override
  String get mediaSettingsObsConnected => 'OBS Companion підключено';

  @override
  String get mediaSettingsObsConnectedDescription =>
      'Синхронізація сцен і запуск з OBS';

  @override
  String get mediaSettingsVirtualCamera => 'Віртуальна камера SYLORA';

  @override
  String get mediaSettingsVirtualCameraDescription =>
      'Передавати відео в Zoom, Meet або OBS';

  @override
  String get mediaSettingsStreamingSection => 'Трансляція';

  @override
  String get mediaSettingsBitrate => 'Бітрейт (кбіт/с)';

  @override
  String get mediaSettingsLatencyMode => 'Режим затримки';

  @override
  String get mediaSettingsUltraLowLatency => 'Наднизька';

  @override
  String get mediaSettingsLowLatency => 'Низька';

  @override
  String get mediaSettingsNormalLatency => 'Звичайна';

  @override
  String get mediaSettingsRecordingSection => 'Запис';

  @override
  String get mediaSettingsLocalRecording => 'Локальний запис';

  @override
  String get mediaSettingsCloudRecording => 'Хмарний запис';

  @override
  String get mediaSettingsCloudRecordingDescription =>
      'Завантаження до налаштованого сховища об’єктів';

  @override
  String get mediaSettingsSaveProfile => 'Зберегти медіапрофіль';

  @override
  String get earningsTitle => 'Заробіток автора';

  @override
  String get earningsSubtitle =>
      'Подарунки наживо, чайові та виплати — єдиний реєстр екосистеми.';

  @override
  String get earningsHeroEyebrow => 'ЗАРОБІТОК';

  @override
  String get earningsHeroTitle => 'Ваш баланс автора';

  @override
  String get earningsHeroBody =>
      'Чайові та подарунки враховуються лише з ефірів, гостьових ефірів, конференцій із кількома ведучими та голосових кімнат. Gift Shop призначений для купівлі інвентарю, а не надсилання.';

  @override
  String get earningsTotalAvailable => 'Усього доступно';

  @override
  String earningsMinorUnits(int amount) {
    return '$amount мінімальних одиниць';
  }

  @override
  String get earningsAcceptLiveGifts => 'Приймати подарунки наживо';

  @override
  String get earningsAcceptLiveGiftsDescription =>
      'Якщо вимкнено, глядачі не зможуть надсилати подарунки під час ваших ефірів.';

  @override
  String get earningsRecentLedger => 'Останні операції';

  @override
  String get earningsEmptyTitle => 'Заробітку ще немає';

  @override
  String get earningsEmptyMessage =>
      'Вийдіть в ефір, щоб глядачі могли надсилати подарунки.';

  @override
  String get earningsOpenLive => 'Відкрити Live';

  @override
  String get communitiesTitle => 'Спільноти';

  @override
  String get communitiesSubtitle =>
      'Знайдіть людей зі спільними інтересами або створіть власний простір.';

  @override
  String get communitiesCreate => 'Створити спільноту';

  @override
  String get communitiesHeroEyebrow => 'СПІЛЬНОТИ';

  @override
  String get communitiesHeroTitle => 'Знайдіть своїх людей';

  @override
  String get communitiesHeroBody =>
      'Переглядайте публічні простори й спільноти, до яких належите, та переходьте до їхніх каналів.';

  @override
  String get communitiesSearchHint => 'Пошук спільнот';

  @override
  String get communitiesSearch => 'Шукати';

  @override
  String get communitiesClearSearch => 'Очистити пошук';

  @override
  String get communitiesEmptyTitle => 'Спільнот ще немає';

  @override
  String get communitiesNoMatchesTitle => 'Спільнот не знайдено';

  @override
  String get communitiesEmptyMessage =>
      'Створіть першу спільноту, щоб почати збирати людей.';

  @override
  String get communitiesNoMatchesMessage =>
      'Спробуйте іншу назву, опис або slug.';

  @override
  String get communitiesNameLabel => 'Назва';

  @override
  String get communitiesNameRequired => 'Введіть назву спільноти.';

  @override
  String get communitiesSlugLabel => 'Slug';

  @override
  String get communitiesSlugHelper => 'Малі латинські літери, цифри й дефіси.';

  @override
  String get communitiesSlugInvalid =>
      'Використайте щонайменше 3 безпечні для URL малі символи.';

  @override
  String get communitiesDescriptionLabel => 'Опис (необов’язково)';

  @override
  String get communitiesVisibilityLabel => 'Видимість';

  @override
  String get communitiesVisibilityPublic => 'Публічна';

  @override
  String get communitiesVisibilityPrivate =>
      'Приватна — запити потребують схвалення';

  @override
  String get communitiesVisibilityPrivateShort => 'Приватна';

  @override
  String get communitiesVisibilityInviteOnly => 'Лише за запрошенням';

  @override
  String get communitiesJoined => 'Ви учасник';

  @override
  String get communitiesLeave => 'Залишити спільноту';

  @override
  String get communitiesJoin => 'Приєднатися до спільноти';

  @override
  String get communitiesMembershipPending => 'Запит на вступ надіслано.';

  @override
  String communitiesMembershipStatus(String status) {
    return 'Статус участі: $status';
  }

  @override
  String get communitiesChannels => 'Канали';

  @override
  String get communitiesNoChannelsTitle => 'Немає видимих каналів';

  @override
  String get communitiesNoChannelsMessage =>
      'У цій спільноті немає видимих каналів.';

  @override
  String get navMusic => 'Музика';

  @override
  String get navAura => 'Aura';

  @override
  String get navStudio => 'Студія';

  @override
  String get navLearn => 'Навчання';

  @override
  String get navMe => 'Я';

  @override
  String get moreCommunities => 'Спільноти';

  @override
  String get moreEarnings => 'Дохід';

  @override
  String get moreGiftShop => 'Магазин подарунків';

  @override
  String get moreMediaSettings => 'Камера і звук';

  @override
  String get auraTipFeed => 'Привіт — я поруч, поки ти гортаєш стрічку.';

  @override
  String get auraTipFriends => 'Давай знайдемо людей, з якими тобі буде тепло.';

  @override
  String get auraTipConferences => 'Я слухаю зустріч і можу підказати по ходу.';

  @override
  String get auraTipLive =>
      'Тримаю ефір у фокусі — скажи, якщо треба допомога.';

  @override
  String get auraTipAi => 'Я Aura. Пиши як людині — я відповім по-людськи.';

  @override
  String get auraTipGifts => 'Підкажу подарунок, який справді вразить.';

  @override
  String get auraTipCreatorStudio =>
      'Готова допомогти зі студією — крок за кроком.';

  @override
  String get auraTipMarketplace => 'Шукаємо те, що тобі справді підійде.';

  @override
  String get auraTipBusiness => 'Тримаю контекст бізнесу, щоб ти не губився.';

  @override
  String get auraTipLearning => 'Вчуся разом із тобою — питайте що завгодно.';

  @override
  String get auraTipCreator => 'Твій творчий ритм — я підлаштуюсь.';

  @override
  String get auraTipSettings => 'Налаштуємо все зручно, без зайвого шуму.';

  @override
  String get auraTipDefault => 'Я Aura — готова допомогти.';

  @override
  String get auraSummonLabel => 'Викликати Aura';

  @override
  String get auraDismissLabel => 'Сховати Aura';

  @override
  String get liveIntegrationsTitle => 'Інтеграції Live';

  @override
  String get liveIntegrationsBody =>
      'Підключай стрімінгові платформи, щоб Aura була співведучою. Нативний SYLORA Live уже готовий. TikTok LIVE відкриється після офіційного доступу провайдера.';

  @override
  String get liveNativeReady => 'SYLORA Live — готово';

  @override
  String get liveTikTokBlocked => 'TikTok LIVE — очікуємо доступ провайдера';

  @override
  String get liveDestinationsHint =>
      'Напрямки з’являться після підключення офіційної інтеграції.';

  @override
  String get liveGuestInvitations => 'Запрошення гостей';

  @override
  String get liveGuestInvitationsBody =>
      'Прийми запрошення від хоста, опублікуй окремий WHIP-внесок, коли видадуть ключі, або надішли подарунок хосту.';

  @override
  String get liveNoGuestInvites =>
      'Немає вхідних запрошень гостей. Запрошення від хоста з’являться тут.';
}
