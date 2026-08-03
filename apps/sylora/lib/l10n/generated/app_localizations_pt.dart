// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'SYLORA';

  @override
  String get appTagline => 'Crie. Conecte-se. Entre ao vivo.';

  @override
  String get appDescription =>
      'Uma plataforma social para comunidade, presentes, IA e momentos ao vivo.';

  @override
  String get navHome => 'Início';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLive => 'Ao vivo';

  @override
  String get navAi => 'IA';

  @override
  String get navGifts => 'Presentes';

  @override
  String get navMessages => 'Mensagens';

  @override
  String get navProfile => 'Perfil';

  @override
  String get navSettings => 'Configurações';

  @override
  String get navMore => 'Mais';

  @override
  String get navSearch => 'Buscar';

  @override
  String get navMarket => 'Mercado';

  @override
  String get navCreator => 'Criador';

  @override
  String get navWorkspace => 'Área de trabalho';

  @override
  String get navAdmin => 'Admin';

  @override
  String get authLogin => 'Entrar';

  @override
  String get authRegister => 'Cadastrar-se';

  @override
  String get authPassword => 'Senha';

  @override
  String get authOtp => 'Código de uso único';

  @override
  String get authBack => 'Voltar';

  @override
  String get authBackToWorld => 'Voltar ao mundo';

  @override
  String get authCreateAccount => 'Criar conta';

  @override
  String get authContinue => 'Continuar';

  @override
  String get authContinueWithPhone => 'Continuar com telefone';

  @override
  String get authContinueWithEmailOtp => 'Entrar com um código por e-mail';

  @override
  String authContinueWithProvider(String provider) {
    return 'Continuar com $provider';
  }

  @override
  String get authSignInToEcosystem => 'Entre no seu ecossistema de IA';

  @override
  String get authPhone => 'Telefone';

  @override
  String get authEmail => 'Email';

  @override
  String get authEmailAddress => 'Endereço de email';

  @override
  String get authPhoneNumber => 'Telefone';

  @override
  String get authSmsCode => 'Código SMS';

  @override
  String get authEmailCode => 'Código de email';

  @override
  String get authSendCode => 'Enviar código';

  @override
  String get authResendCode => 'Enviar código novamente';

  @override
  String authSendAgainIn(int seconds) {
    return 'Enviar novamente em ${seconds}s';
  }

  @override
  String get authForgotPassword => 'Esqueceu a senha?';

  @override
  String get authVerifyEmailAgain =>
      'Verifique o email ou envie a mensagem novamente';

  @override
  String get authDisplayName => 'Nome de exibição do perfil';

  @override
  String get authPasswordHelper => 'Pelo menos 12 caracteres';

  @override
  String get authCodeEmailChip => 'Código de email';

  @override
  String get authPasswordChip => 'Senha';

  @override
  String get authPhoneUnavailable =>
      'O acesso por telefone está temporariamente indisponível.';

  @override
  String get authSmsInstruction => 'Enviaremos um código de uso único por SMS.';

  @override
  String get authEmailOtpInstruction =>
      'Enviaremos um código de uso único para o seu email.';

  @override
  String get authWelcomeEyebrow => 'Bem-vindo ao ecossistema';

  @override
  String get authWelcomeBody =>
      'Um único acesso para IA, Live, comunidade e criatividade.';

  @override
  String get authOAuthOpenFailed => 'Não foi possível abrir a página de login.';

  @override
  String get authOAuthProviderUnavailable =>
      'Este provedor está indisponível. Tente outro método de login.';

  @override
  String get authMobileSocialPending =>
      'O login social nas versões mobile aparecerá após a configuração de deep links.';

  @override
  String get authReturnToLogin => 'Voltar ao login';

  @override
  String get authMfaTitle => 'Autenticação de dois fatores';

  @override
  String get authMfaPrompt => 'Insira o código do seu app autenticador';

  @override
  String get authCode => 'Código';

  @override
  String get authConfirm => 'Confirmar';

  @override
  String get authEmailVerificationTitle => 'Verificação de email';

  @override
  String get authPasswordResetTitle => 'Redefinição de senha';

  @override
  String get authRequestPasswordReset => 'Solicitar redefinição de senha';

  @override
  String get authRequestVerificationEmail => 'Enviar email de verificação';

  @override
  String get authSendEmail => 'Enviar email';

  @override
  String get authVerifyWithToken => 'Verificar com token';

  @override
  String get authSetNewPassword => 'Definir uma nova senha';

  @override
  String get authToken => 'Token';

  @override
  String get authNewPassword => 'Nova senha';

  @override
  String get authConfirmEmail => 'Confirmar email';

  @override
  String get authResetPassword => 'Redefinir senha';

  @override
  String get commonOr => 'ou';

  @override
  String get commonSave => 'Salvar';

  @override
  String get commonCancel => 'Cancelar';

  @override
  String get commonRetry => 'Tentar novamente';

  @override
  String get commonLoading => 'Carregando';

  @override
  String get commonError => 'Erro';

  @override
  String get commonOffline => 'Offline';

  @override
  String get commonTryAgain => 'Tente novamente';

  @override
  String get commonSomethingWentWrong => 'Algo deu errado';

  @override
  String get auraCompanionLabel => 'Aura · companheira de IA';

  @override
  String get auraGreeting => 'Aura está pronta para ajudar.';

  @override
  String get auraListening => 'Aura está ouvindo.';

  @override
  String get auraThinking => 'Aura está pensando.';

  @override
  String get settingsLanguage => 'Idioma';

  @override
  String get settingsLanguageDescription =>
      'Escolha o idioma do app usado neste dispositivo.';

  @override
  String get settingsDisplayAccessibility => 'Tela e acessibilidade';

  @override
  String get settingsLanguageEnglish => 'Inglês';

  @override
  String get settingsLanguageUkrainian => 'Ucraniano';

  @override
  String get settingsLanguagePolish => 'Polonês';

  @override
  String get settingsLanguageGerman => 'Alemão';

  @override
  String get settingsLanguageSpanish => 'Espanhol';

  @override
  String get settingsLanguageFrench => 'Francês';

  @override
  String get settingsLanguageItalian => 'Italiano';

  @override
  String get settingsLanguagePortuguese => 'Português';

  @override
  String get settingsLanguageJapanese => 'Japonês';

  @override
  String get settingsLanguageKorean => 'Coreano';

  @override
  String get settingsLanguageChinese => 'Chinês';
}
