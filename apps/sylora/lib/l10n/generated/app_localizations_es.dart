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
}
