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
  String get feedCreatePost => 'Crear publicación';

  @override
  String get feedLoadMore => 'Cargar más publicaciones';

  @override
  String get feedLoadingPosts => 'Cargando publicaciones…';

  @override
  String get feedLoadingMoreReason =>
      'Se está cargando la siguiente página del feed.';

  @override
  String get feedRecommended => 'Recomendado';

  @override
  String get feedRecommendationsUnavailable => 'Recomendaciones no disponibles';

  @override
  String get feedRecommendationsEmpty => 'La API aún no tiene recomendaciones.';

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
}
