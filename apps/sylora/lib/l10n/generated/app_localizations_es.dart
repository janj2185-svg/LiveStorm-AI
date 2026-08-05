// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Crear. Conectar. Emitir en directo.';

  @override
  String get appDescription =>
      'Una plataforma social para comunidad, regalos, IA y momentos en directo.';

  @override
  String get navHome => 'Inicio';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => 'En directo';

  @override
  String get navAi => 'IA';

  @override
  String get navGifts => 'Regalos';

  @override
  String get navMessages => 'Mensajes';

  @override
  String get navProfile => 'Perfil';

  @override
  String get navSettings => 'Configuración';

  @override
  String get navMore => 'Más';

  @override
  String get navSearch => 'Buscar';

  @override
  String get navMarket => 'Mercado';

  @override
  String get navCreator => 'Creador';

  @override
  String get navWorkspace => 'Espacio de trabajo';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'Iniciar sesión';

  @override
  String get authRegister => 'Registrarse';

  @override
  String get authPassword => 'Contraseña';

  @override
  String get authOtp => 'Código de un solo uso';

  @override
  String get authBack => 'Volver';

  @override
  String get authBackToWorld => 'Volver al mundo';

  @override
  String get authCreateAccount => 'Crear cuenta';

  @override
  String get authContinue => 'Continuar';

  @override
  String get authContinueWithPhone => 'Continuar con teléfono';

  @override
  String get authContinueWithEmailOtp =>
      'Iniciar sesión con un código de correo';

  @override
  String authContinueWithProvider(String provider) {
    return 'Continuar con $provider';
  }

  @override
  String get authSignInToEcosystem => 'Inicia sesión en tu ecosistema de IA';

  @override
  String get authPhone => 'Teléfono';

  @override
  String get authEmail => 'Correo';

  @override
  String get authEmailAddress => 'Correo electrónico';

  @override
  String get authPhoneNumber => 'Teléfono';

  @override
  String get authSmsCode => 'Código SMS';

  @override
  String get authEmailCode => 'Código de correo';

  @override
  String get authSendCode => 'Enviar código';

  @override
  String get authResendCode => 'Enviar código de nuevo';

  @override
  String authSendAgainIn(int seconds) {
    return 'Enviar de nuevo en ${seconds}s';
  }

  @override
  String get authForgotPassword => '¿Has olvidado la contraseña?';

  @override
  String get authVerifyEmailAgain =>
      'Verifica el correo o envía el mensaje de nuevo';

  @override
  String get authDisplayName => 'Nombre visible del perfil';

  @override
  String get authPasswordHelper => 'Al menos 12 caracteres';

  @override
  String get authCodeEmailChip => 'Código de correo';

  @override
  String get authPasswordChip => 'Contraseña';

  @override
  String get authPhoneUnavailable =>
      'El inicio de sesión con teléfono no está disponible temporalmente.';

  @override
  String get authSmsInstruction =>
      'Te enviaremos un código de un solo uso por SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Te enviaremos un código de un solo uso a tu correo.';

  @override
  String get authWelcomeEyebrow => 'Bienvenido al ecosistema';

  @override
  String get authWelcomeBody =>
      'Un solo inicio de sesión para IA, Live, comunidad y creatividad.';

  @override
  String get authOAuthOpenFailed =>
      'No se pudo abrir la página de inicio de sesión.';

  @override
  String get authOAuthProviderUnavailable =>
      'Este proveedor no está disponible. Prueba otro método de inicio de sesión.';

  @override
  String get authMobileSocialPending =>
      'El inicio de sesión social en builds móviles aparecerá tras configurar enlaces profundos.';

  @override
  String get authReturnToLogin => 'Volver al inicio de sesión';

  @override
  String get authMfaTitle => 'Autenticación de dos factores';

  @override
  String get authMfaPrompt =>
      'Introduce el código de tu aplicación de autenticación';

  @override
  String get authCode => 'Código';

  @override
  String get authConfirm => 'Confirmar';

  @override
  String get authEmailVerificationTitle => 'Verificación de correo';

  @override
  String get authPasswordResetTitle => 'Restablecimiento de contraseña';

  @override
  String get authRequestPasswordReset =>
      'Solicitar restablecimiento de contraseña';

  @override
  String get authRequestVerificationEmail => 'Enviar correo de verificación';

  @override
  String get authSendEmail => 'Enviar correo';

  @override
  String get authVerifyWithToken => 'Verificar con token';

  @override
  String get authSetNewPassword => 'Establecer una contraseña nueva';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'Contraseña nueva';

  @override
  String get authConfirmEmail => 'Confirmar correo';

  @override
  String get authResetPassword => 'Restablecer contraseña';

  @override
  String get commonOr => 'o';

  @override
  String get commonSave => 'Guardar';

  @override
  String get commonCancel => 'Cancelar';

  @override
  String get commonRetry => 'Reintentar';

  @override
  String get commonLoading => 'Cargando';

  @override
  String get commonError => 'Error';

  @override
  String get commonOffline => 'Sin conexión';

  @override
  String get commonTryAgain => 'Intentarlo de nuevo';

  @override
  String get commonSomethingWentWrong => 'Algo salió mal';

  @override
  String get auraCompanionLabel => 'Aura · compañera de IA';

  @override
  String get auraGreeting => 'Aura está lista para ayudar.';

  @override
  String get auraListening => 'Aura está escuchando.';

  @override
  String get auraThinking => 'Aura está pensando.';

  @override
  String get settingsLanguage => 'Idioma';

  @override
  String get settingsLanguageDescription =>
      'Elige el idioma de la app en este dispositivo.';

  @override
  String get settingsDisplayAccessibility => 'Pantalla y accesibilidad';

  @override
  String get settingsLanguageEnglish => 'Inglés';

  @override
  String get settingsLanguageUkrainian => 'Ucraniano';

  @override
  String get settingsLanguagePolish => 'Polaco';

  @override
  String get settingsLanguageGerman => 'Alemán';

  @override
  String get settingsLanguageSpanish => 'Español';

  @override
  String get settingsLanguageFrench => 'Francés';

  @override
  String get settingsLanguageItalian => 'Italiano';

  @override
  String get settingsLanguagePortuguese => 'Portugués';

  @override
  String get settingsLanguageJapanese => 'Japonés';

  @override
  String get settingsLanguageKorean => 'Coreano';

  @override
  String get settingsLanguageChinese => 'Chino';

  @override
  String get navFriends => 'Amigos';

  @override
  String get feedTitle => 'Feed';

  @override
  String get feedSubtitle =>
      'El pulso vivo de SYLORA — publicaciones, amigos y creación.';

  @override
  String get feedEmpty => 'Tu feed está silencioso';

  @override
  String get feedEmptyMessage =>
      'No se devolvieron publicaciones publicadas. Publica algo o sigue a personas para dar forma a tu feed.';

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
  String get feedRecommendationsUnavailable => 'Recomendaciones no disponibles';

  @override
  String get feedRecommended => 'Recomendado';

  @override
  String get feedRecommendationsEmpty => 'La API aún no tiene recomendaciones.';

  @override
  String get feedCreatePost => 'Crear publicación';

  @override
  String get feedLoadMore => 'Cargar más publicaciones';

  @override
  String get feedLoadingPosts => 'Cargando publicaciones…';

  @override
  String get feedLoadingMoreReason =>
      'Se está cargando la siguiente página del feed.';

  @override
  String get feedPostBodyLabel => 'Publicación de texto sin formato';

  @override
  String get feedPublishNow => 'Publicar ahora';

  @override
  String get feedSaveDraft => 'Guardar como borrador';

  @override
  String get feedPublish => 'Publicar';

  @override
  String get friendsTitle => 'Amigos';

  @override
  String get friendsRequests => 'Solicitudes';

  @override
  String get friendsSuggestions => 'Sugerencias';

  @override
  String get friendsAccept => 'Aceptar';

  @override
  String get friendsReject => 'Rechazar';

  @override
  String get friendsUnfriend => 'Eliminar amigo';

  @override
  String get friendsAddFriend => 'Añadir amigo';

  @override
  String get friendsOnly => 'Solo amigos';

  @override
  String get friendsOnline => 'En línea';

  @override
  String get friendsMutual => 'Amigos en común';

  @override
  String get friendsSearchFriends => 'Buscar amigos';

  @override
  String get friendsNoFriends => 'Aún no tienes amigos';

  @override
  String get friendsPendingIncoming => 'Solicitudes entrantes';

  @override
  String get friendsPendingOutgoing => 'Solicitudes salientes';

  @override
  String get messagesTitle => 'Mensajes';

  @override
  String get messagesEmpty => 'No hay conversaciones';

  @override
  String get messagesEmptyMessage =>
      'No se devolvió historial de conversaciones. Inicia una con un identificador público.';

  @override
  String get messagesTypeMessage => 'Mensaje';

  @override
  String get messagesSend => 'Enviar mensaje';

  @override
  String get messagesNewConversation => 'Nueva conversación';

  @override
  String get messagesRecipientHandle => 'Identificador del destinatario';

  @override
  String get messagesStart => 'Iniciar';

  @override
  String get messagesConversationTitle => 'Conversación';

  @override
  String get messagesAcceptRequest => 'Aceptar solicitud de mensaje';

  @override
  String get messagesDeclineRequest => 'Rechazar solicitud de mensaje';

  @override
  String get messagesFindPeople => 'Find people';

  @override
  String get messagesStartCall => 'Start a call';

  @override
  String get moreTitle => 'Más';

  @override
  String get moreSubtitle =>
      'Herramientas de cuenta y espacios de trabajo según el rol que no caben en la navegación compacta.';

  @override
  String get moreOpenModule => 'Abrir módulo';

  @override
  String get moreLearning => 'Aprendizaje';

  @override
  String get moreWallet => 'Cartera';

  @override
  String get moreGifts => 'Regalos';

  @override
  String get moreAi => 'IA';

  @override
  String get moreLive => 'En directo';

  @override
  String get moreCreatorStudio => 'Estudio de creador';

  @override
  String get moreCreator => 'Creador';

  @override
  String get moreWorkspace => 'Espacio de trabajo';

  @override
  String get moreAdmin => 'Administración';

  @override
  String get moreSettings => 'Configuración';

  @override
  String get settingsProfile => 'Perfil';

  @override
  String get settingsEditProfile => 'Editar perfil';

  @override
  String get settingsNoPublicHandle => 'Sin identificador público';

  @override
  String get settingsAccountPrivacy => 'Privacidad de la cuenta y correo';

  @override
  String get settingsProductEmails => 'Correos de producto';

  @override
  String get settingsMarketingEmails => 'Correos de marketing';

  @override
  String get settingsSecurityEmails => 'Correos de seguridad';

  @override
  String get settingsSecurityEmailDescription =>
      'El backend puede exigir avisos críticos de seguridad.';

  @override
  String get settingsProfileVisibility => 'Visibilidad del perfil';

  @override
  String get settingsProfilePublic => 'Público';

  @override
  String get settingsProfilePrivate => 'Privado';

  @override
  String get settingsSecurity => 'Seguridad';

  @override
  String get settingsSessions => 'Sesiones';

  @override
  String get settingsSignOut => 'Cerrar sesión';

  @override
  String get settingsTheme => 'Tema';

  @override
  String get settingsThemeLight => 'Claro';

  @override
  String get settingsThemeDark => 'Oscuro';

  @override
  String get settingsThemeSystem => 'Sistema';

  @override
  String get settingsNotifications => 'Notificaciones';

  @override
  String get settingsEnableNotifications => 'Activar notificaciones';

  @override
  String get settingsNotificationsDescription =>
      'La conexión del token push nativo puede usar esta preferencia.';

  @override
  String get settingsHighContrast => 'Alto contraste';

  @override
  String get settingsReducedMotion => 'Movimiento reducido';

  @override
  String settingsTextScale(String scale) {
    return 'Escala del texto: $scale×';
  }

  @override
  String get settingsAuthenticatorApp => 'Aplicación de autenticación';

  @override
  String get liveShortLabel => 'Live';

  @override
  String get aiShortLabel => 'IA';

  @override
  String get giftsShortLabel => 'Regalos';

  @override
  String get walletShortLabel => 'Cartera';

  @override
  String get conferencesTitle => 'Conferencias';

  @override
  String get conferencesStart => 'Iniciar conferencia';

  @override
  String get conferencesJoin => 'Unirse a conferencia';

  @override
  String get conferencesLeave => 'Salir de la conferencia';

  @override
  String get conferencesInvite => 'Invitar';

  @override
  String get conferencesAuraAssist => 'Asistencia de Aura';

  @override
  String get commonPremiumEmpty => 'Aún no hay elementos premium';

  @override
  String get commonPremiumError => 'No se pudo cargar el contenido premium.';

  @override
  String get commonPremiumRetry => 'Reintentar premium';

  @override
  String get homeHeroEyebrow => 'TU MUNDO DE IA VIVO';

  @override
  String get homeHeroBody =>
      'Crea, conecta y crece en una red luminosa — IA, Live, amigos y creación juntos.';

  @override
  String get homeModulesLabel => 'PORTALES DEL ECOSISTEMA';

  @override
  String get homeComposeHint => 'Comparte una señal con el universo…';

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
  String get giftsDetailTitle => 'Gift detail';

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
  String get creatorStudioDirectorGoLive => 'Director go-live';

  @override
  String get creatorStudioDirectorGoLiveBody =>
      'Preview camera, publish WHIP, then return to the session to Start.';

  @override
  String get creatorStudioSession => 'Session';

  @override
  String get creatorStudioNoSessionsMessage =>
      'Create a live session first, then return to Creator Studio.';

  @override
  String get creatorStudioLiveSessionLabel => 'Live session';

  @override
  String get creatorStudioOpenSession => 'Open session';

  @override
  String get creatorStudioOpenSessionToStart => 'Open session to Start';

  @override
  String get creatorStudioCamera => 'Camera';

  @override
  String get creatorStudioMicrophone => 'Microphone';

  @override
  String get creatorStudioRefreshDevices => 'Refresh devices';

  @override
  String get creatorStudioRunPreflight => 'Run preflight';

  @override
  String get creatorStudioConnectObs => 'Connect OBS';

  @override
  String get creatorStudioLiveNow => 'Live now';

  @override
  String get creatorStudioCopyWatchLink => 'Copy watch link';

  @override
  String get creatorStudioSelectSessionFirst => 'Select a live session first.';

  @override
  String get creatorStudioPreflightOnlyBeforeLive =>
      'Preflight is available only before a session is live.';

  @override
  String get creatorStudioPreflightAlreadyRunning =>
      'Preflight is already running.';

  @override
  String get creatorStudioDevicesUnavailable =>
      'Device enumeration is unavailable on this platform.';

  @override
  String get creatorStudioPreviewUnavailable =>
      'Camera preview is unavailable on this platform.';

  @override
  String get creatorStudioWhipUnavailable =>
      'WHIP publishing is unavailable on this platform.';

  @override
  String get creatorStudioStartPreviewFirst =>
      'Start a camera and microphone preview first.';

  @override
  String get creatorStudioRunPreflightFirst =>
      'Run preflight and resolve required checks first.';

  @override
  String get creatorStudioMediaPathNotReady =>
      'The selected media path is not ready.';

  @override
  String get creatorStudioGoLivePreflight => 'Go-live preflight';

  @override
  String get creatorStudioPreflightChecking =>
      'Checking media plane, credentials, and integrations…';

  @override
  String get creatorStudioPreflightPassedConnect =>
      'Preflight passed. Connect a publishing path before going live.';

  @override
  String get creatorStudioPreflightFoundBlockers =>
      'Preflight found blockers. Review the checklist.';

  @override
  String get creatorStudioSessionMustBeDraft =>
      'Session must be draft or preflight to go live.';

  @override
  String get creatorStudioPublishingUnsupported =>
      'Camera publishing is not available on this platform. Use OBS companion with the session ingest path and reveal-once stream key.';

  @override
  String creatorStudioIngestPath(String path) {
    return 'Ingest path: $path';
  }

  @override
  String get creatorStudioPreparingGoLive => 'Preparing go-live…';

  @override
  String get creatorStudioPreflightBlockedGoLive =>
      'Preflight blocked go-live. Fix the checklist items and try again.';

  @override
  String get creatorStudioGoLiveBlocked =>
      'Go-live is blocked until preflight passes and a publishing path is connected.';

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
