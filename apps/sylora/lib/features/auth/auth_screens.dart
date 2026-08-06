import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../landing/landing_tokens.dart';
import 'auth.dart';

enum _AuthPane { chooser, phone, email }

enum _EmailMode { otp, password, register }

final class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

final class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _motion;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _motion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fade = CurvedAnimation(parent: _motion, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _motion, curve: Curves.easeOutCubic));
    unawaited(_motion.forward());
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: _AuthAtmosphere(
        child: SafeArea(
          child: FadeTransition(
            opacity: _fade,
            child: SlideTransition(
              position: _slide,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 36, 28, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const Spacer(flex: 2),
                    const SyloraLogo(
                      size: 120,
                      showWordmark: true,
                      showUnified: false,
                      wordmarkSize: 22,
                    ),
                    const SizedBox(height: 18),
                    Text(
                      l10n.appTagline,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      l10n.appDescription,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: LumenColors.porcelainMuted,
                      ),
                    ),
                    const Spacer(flex: 3),
                    LumenPrimaryButton(
                      label: l10n.authContinue,
                      onPressed: () => context.goNamed('auth'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key, this.initialCreateAccount = false});

  final bool initialCreateAccount;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

final class _AuthScreenState extends ConsumerState<AuthScreen>
    with SingleTickerProviderStateMixin {
  final _signInKey = GlobalKey<FormState>();
  final _registerKey = GlobalKey<FormState>();
  final _phoneKey = GlobalKey<FormState>();
  final _emailOtpKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _displayName = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  late final AnimationController _paneMotion;
  _AuthPane _pane = _AuthPane.chooser;
  _EmailMode _emailMode = _EmailMode.otp;
  // Optimistic defaults so the form is usable while /auth/methods loads.
  AuthMethods _methods = const AuthMethods(
    phone: false,
    email: true,
    emailPassword: true,
    emailOtp: true,
    tiktok: false,
    facebook: false,
    google: false,
    apple: false,
  );
  String? _methodsError;
  bool _phoneCodeSent = false;
  bool _emailCodeSent = false;
  int _resendSeconds = 0;
  Timer? _resendTimer;

  @override
  void initState() {
    super.initState();
    _paneMotion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    )..value = 1;
    if (widget.initialCreateAccount) {
      _emailMode = _EmailMode.register;
      _pane = _AuthPane.email;
    }
    unawaited(_loadMethods());
  }

  Future<void> _loadMethods() async {
    try {
      final methods = await ref.read(authRepositoryProvider).authMethods();
      if (!mounted) {
        return;
      }
      setState(() {
        _methods = methods;
        _methodsError = null;
        if (!methods.emailOtp && methods.emailPassword) {
          _emailMode = widget.initialCreateAccount
              ? _EmailMode.register
              : _EmailMode.password;
        }
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _methodsError = messageFor(error);
        _methods = const AuthMethods(
          phone: false,
          email: true,
          emailPassword: true,
          emailOtp: false,
          tiktok: false,
          facebook: false,
          google: false,
          apple: false,
        );
        if (!widget.initialCreateAccount) {
          _emailMode = _EmailMode.password;
        }
      });
    }
  }

  void _startResendCountdown(int seconds) {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = seconds);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendSeconds <= 1) {
        timer.cancel();
        setState(() => _resendSeconds = 0);
        return;
      }
      setState(() => _resendSeconds -= 1);
    });
  }

  Future<void> _switchPane(_AuthPane pane) async {
    await _paneMotion.reverse();
    if (!mounted) {
      return;
    }
    setState(() {
      _pane = pane;
      if (pane == _AuthPane.chooser) {
        _phoneCodeSent = false;
        _emailCodeSent = false;
        _otp.clear();
        _resendTimer?.cancel();
        _resendSeconds = 0;
      }
    });
    await _paneMotion.forward();
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _paneMotion.dispose();
    _email.dispose();
    _password.dispose();
    _displayName.dispose();
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final wide = MediaQuery.sizeOf(context).width >= 900;
    return Theme(
      data: ThemeData(
        brightness: Brightness.light,
        colorScheme: const ColorScheme.light(
          primary: SyloraTokens.goldDeep,
          secondary: SyloraTokens.cyan,
          surface: SyloraTokens.pearl,
          onSurface: SyloraTokens.ink,
        ),
        scaffoldBackgroundColor: SyloraTokens.canvas,
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: SyloraTokens.glassStrong,
          labelStyle: SyloraTokens.body(13),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
            borderSide: const BorderSide(color: SyloraTokens.glassStroke),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
            borderSide: const BorderSide(color: SyloraTokens.glassStroke),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(SyloraTokens.radiusMd),
            borderSide: const BorderSide(
              color: SyloraTokens.cyan,
              width: 1.6,
            ),
          ),
        ),
        dividerColor: SyloraTokens.ink.withValues(alpha: 0.1),
        textTheme: TextTheme(
          labelMedium: SyloraTokens.body(12),
          bodyMedium: SyloraTokens.body(14, color: SyloraTokens.ink),
        ),
      ),
      child: SyloraLivingScaffold(
        // Web cold-start: static atmosphere only. Animated world can arm later
        // on native where CanvasKit/WebGL is not the bottleneck.
        intensity: kIsWeb ? 0.35 : 0.75,
        showOrbits: false,
        animate: !kIsWeb,
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: wide ? 920 : 420),
              child: wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(child: _authHero()),
                        const SizedBox(width: 28),
                        Expanded(child: _authPanel(auth)),
                      ],
                    )
                  : Column(
                      children: [
                        _authHero(compact: true),
                        const SizedBox(height: 18),
                        _authPanel(auth),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _authHero({bool compact = false}) {
    final l10n = AppLocalizations.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SyloraMark(size: compact ? 96 : 140, animated: true, hero: true),
        SizedBox(height: compact ? 12 : 20),
        SyloraHeroWordmark(syloraSize: compact ? 22 : 28),
        if (!compact) ...[
          const SizedBox(height: 10),
          Text(
            l10n.authWelcomeBody,
            textAlign: TextAlign.center,
            style: SyloraTokens.body(14),
          ),
        ],
      ],
    );
  }

  Widget _authPanel(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    return SyloraGlass(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const Center(child: SyloraBrandLockup(size: 34, showUnified: false)),
          const SizedBox(height: 12),
          Text(
            _pane == _AuthPane.chooser
                ? l10n.authSignInToEcosystem
                : _pane == _AuthPane.phone
                ? l10n.authPhone
                : l10n.authEmail,
            textAlign: TextAlign.center,
            style: SyloraTokens.body(15, color: SyloraTokens.inkSoft),
          ),
          const SizedBox(height: 18),
          FadeTransition(
            opacity: _paneMotion,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: _pane == _AuthPane.chooser
                        ? () => context.goNamed('welcome')
                        : () => _switchPane(_AuthPane.chooser),
                    child: Text(
                      _pane == _AuthPane.chooser
                          ? '← ${l10n.authBackToWorld}'
                          : '← ${l10n.authBack}',
                      style: SyloraTokens.body(14, color: SyloraTokens.inkMute),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                if (_pane == _AuthPane.chooser) _chooser(auth),
                if (_pane == _AuthPane.phone) _phonePane(auth),
                if (_pane == _AuthPane.email) _emailPane(auth),
              ],
            ),
          ),
          if (_methodsError != null) ...<Widget>[
            const SizedBox(height: 12),
            SyloraBanner(message: _methodsError!, error: true),
          ],
          if (auth.error != null) ...<Widget>[
            const SizedBox(height: 14),
            SyloraBanner(message: auth.error!, error: true),
          ],
          if (auth.notice != null) ...<Widget>[
            const SizedBox(height: 14),
            SyloraBanner(message: auth.notice!),
          ],
        ],
      ),
    );
  }

  Widget _chooser(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    final methods = _methods;
    // Product order: Google → Apple. TikTok/Facebook are Live integrations only.
    final social = <(String, String, IconData)>[
      if (methods.google) ('google', 'Google', Icons.g_mobiledata_rounded),
      if (methods.apple) ('apple', 'Apple', Icons.apple_rounded),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SyloraButton(
          label: l10n.authLogin,
          busy: auth.busy,
          icon: SyloraIcons.lock,
          onPressed: methods.email
              ? () {
                  setState(() => _emailMode = _EmailMode.password);
                  unawaited(_switchPane(_AuthPane.email));
                }
              : null,
        ),
        const SizedBox(height: 12),
        SyloraButton(
          label: l10n.authCreateAccount,
          variant: SyloraButtonVariant.secondary,
          icon: SyloraIcons.person,
          onPressed: methods.email
              ? () {
                  setState(() => _emailMode = _EmailMode.register);
                  unawaited(_switchPane(_AuthPane.email));
                }
              : null,
        ),
        const SizedBox(height: 18),
        SyloraButton(
          label: l10n.authContinueWithPhone,
          variant: SyloraButtonVariant.secondary,
          busy: auth.busy,
          icon: SyloraIcons.phone,
          onPressed: methods.phone ? () => _switchPane(_AuthPane.phone) : null,
        ),
        if (!methods.phone) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            l10n.authPhoneUnavailable,
            textAlign: TextAlign.center,
            style: SyloraTokens.body(13, color: SyloraTokens.inkMute),
          ),
        ],
        const SizedBox(height: 12),
        SyloraButton(
          label: l10n.authContinueWithEmailOtp,
          variant: SyloraButtonVariant.secondary,
          icon: SyloraIcons.mail,
          onPressed: methods.email && methods.emailOtp
              ? () {
                  setState(() => _emailMode = _EmailMode.otp);
                  unawaited(_switchPane(_AuthPane.email));
                }
              : null,
        ),
        if (social.isNotEmpty) ...<Widget>[
          const SizedBox(height: 28),
          _DividerLabel(label: l10n.commonOr),
          const SizedBox(height: 16),
          for (final entry in social) ...<Widget>[
            _oauthButton(entry.$1, entry.$2, entry.$3),
            const SizedBox(height: 10),
          ],
        ],
        if (!kIsWeb) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            l10n.authMobileSocialPending,
            style: LandingTokens.body(
              12,
              color: LandingTokens.ink.withValues(alpha: 0.45),
            ),
          ),
        ],
      ],
    );
  }

  Widget _phonePane(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    return Form(
      key: _phoneKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            l10n.authSmsInstruction,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            autofillHints: const <String>[AutofillHints.telephoneNumber],
            decoration: InputDecoration(
              labelText: l10n.authPhoneNumber,
              hintText: '+380...',
              prefixIcon: const Icon(Icons.phone_iphone_rounded),
            ),
            validator: validatePhone,
          ),
          if (_phoneCodeSent) ...<Widget>[
            const SizedBox(height: 14),
            TextFormField(
              controller: _otp,
              keyboardType: TextInputType.number,
              autofillHints: const <String>[AutofillHints.oneTimeCode],
              decoration: InputDecoration(
                labelText: l10n.authSmsCode,
                prefixIcon: const Icon(Icons.pin_outlined),
              ),
              validator: (value) => (value == null || value.trim().length < 4)
                  ? 'Введіть код із SMS.'
                  : null,
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: auth.busy || _resendSeconds > 0
                    ? null
                    : () => _startPhone(auth),
                child: Text(
                  _resendSeconds > 0
                      ? l10n.authSendAgainIn(_resendSeconds)
                      : l10n.authResendCode,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          SyloraButton(
            label: _phoneCodeSent ? l10n.authLogin : l10n.authSendCode,
            busy: auth.busy,
            onPressed: () =>
                _phoneCodeSent ? _verifyPhone(auth) : _startPhone(auth),
          ),
        ],
      ),
    );
  }

  Widget _emailPane(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    final methods = _methods;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (methods.emailOtp || methods.emailPassword)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              if (methods.emailOtp)
                ChoiceChip(
                  label: Text(l10n.authCodeEmailChip),
                  selected: _emailMode == _EmailMode.otp,
                  onSelected: (_) => setState(() {
                    _emailMode = _EmailMode.otp;
                    _emailCodeSent = false;
                    _otp.clear();
                  }),
                ),
              if (methods.emailPassword)
                ChoiceChip(
                  label: Text(l10n.authPasswordChip),
                  selected: _emailMode == _EmailMode.password,
                  onSelected: (_) =>
                      setState(() => _emailMode = _EmailMode.password),
                ),
              if (methods.emailPassword)
                ChoiceChip(
                  label: Text(l10n.authCreateAccount),
                  selected: _emailMode == _EmailMode.register,
                  onSelected: (_) =>
                      setState(() => _emailMode = _EmailMode.register),
                ),
            ],
          ),
        const SizedBox(height: 18),
        if (_emailMode == _EmailMode.otp) _emailOtpForm(auth),
        if (_emailMode == _EmailMode.password) _signInForm(auth),
        if (_emailMode == _EmailMode.register) _registerForm(auth),
      ],
    );
  }

  Widget _emailOtpForm(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    return Form(
      key: _emailOtpKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            l10n.authEmailOtpInstruction,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const <String>[AutofillHints.email],
            decoration: InputDecoration(
              labelText: l10n.authEmailAddress,
              prefixIcon: const Icon(Icons.mail_outline_rounded),
            ),
            validator: validateEmail,
          ),
          if (_emailCodeSent) ...<Widget>[
            const SizedBox(height: 14),
            TextFormField(
              controller: _otp,
              keyboardType: TextInputType.number,
              autofillHints: const <String>[AutofillHints.oneTimeCode],
              decoration: InputDecoration(
                labelText: l10n.authEmailCode,
                prefixIcon: const Icon(Icons.pin_outlined),
              ),
              validator: (value) => (value == null || value.trim().length < 4)
                  ? 'Введіть код із листа.'
                  : null,
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: auth.busy || _resendSeconds > 0
                    ? null
                    : () => _startEmailOtp(auth),
                child: Text(
                  _resendSeconds > 0
                      ? l10n.authSendAgainIn(_resendSeconds)
                      : l10n.authResendCode,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          _AuthPillButton(
            label: _emailCodeSent ? l10n.authLogin : l10n.authSendCode,
            busy: auth.busy,
            filled: true,
            onPressed: () =>
                _emailCodeSent ? _verifyEmailOtp(auth) : _startEmailOtp(auth),
          ),
        ],
      ),
    );
  }

  Widget _signInForm(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    return Form(
      key: _signInKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const <String>[AutofillHints.username],
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.authEmailAddress,
              prefixIcon: const Icon(Icons.mail_outline_rounded),
            ),
            validator: validateEmail,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _password,
            obscureText: true,
            autofillHints: const <String>[AutofillHints.password],
            textInputAction: TextInputAction.done,
            decoration: InputDecoration(
              labelText: l10n.authPassword,
              prefixIcon: const Icon(Icons.lock_outline_rounded),
            ),
            validator: validatePassword,
            onFieldSubmitted: (_) => _signIn(auth),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => context.pushNamed('password-reset'),
              child: Text(l10n.authForgotPassword),
            ),
          ),
          _AuthPillButton(
            label: l10n.authLogin,
            busy: auth.busy,
            filled: true,
            onPressed: () => _signIn(auth),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => context.pushNamed('email-verification'),
            child: Text(
              l10n.authVerifyEmailAgain,
              style: LandingTokens.body(
                13,
                color: LandingTokens.ink.withValues(alpha: 0.55),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _registerForm(AuthState auth) {
    final l10n = AppLocalizations.of(context);
    return Form(
      key: _registerKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          TextFormField(
            controller: _displayName,
            autofillHints: const <String>[AutofillHints.name],
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.authDisplayName,
              prefixIcon: const Icon(Icons.person_outline_rounded),
            ),
            validator: (value) => (value?.trim().isEmpty ?? true)
                ? 'Вкажіть ім’я для профілю.'
                : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const <String>[AutofillHints.newUsername],
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.authEmailAddress,
              prefixIcon: const Icon(Icons.mail_outline_rounded),
            ),
            validator: validateEmail,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _password,
            obscureText: true,
            autofillHints: const <String>[AutofillHints.newPassword],
            textInputAction: TextInputAction.done,
            decoration: InputDecoration(
              labelText: l10n.authPassword,
              helperText: l10n.authPasswordHelper,
              prefixIcon: const Icon(Icons.lock_outline_rounded),
            ),
            validator: (value) => validatePassword(value, registration: true),
            onFieldSubmitted: (_) => _register(auth),
          ),
          const SizedBox(height: 20),
          _AuthPillButton(
            label: l10n.authCreateAccount,
            busy: auth.busy,
            filled: true,
            onPressed: () => _register(auth),
          ),
        ],
      ),
    );
  }

  Future<void> _signIn(AuthState auth) async {
    if (auth.busy || !_signInKey.currentState!.validate()) {
      return;
    }
    await ref
        .read(authControllerProvider.notifier)
        .login(email: _email.text, password: _password.text);
  }

  Future<void> _register(AuthState auth) async {
    if (auth.busy || !_registerKey.currentState!.validate()) {
      return;
    }
    final result = await ref
        .read(authControllerProvider.notifier)
        .register(
          email: _email.text,
          password: _password.text,
          displayName: _displayName.text,
        );
    if (result != null && mounted) {
      final status = ref.read(authControllerProvider).status;
      if (status != AuthStatus.authenticated) {
        setState(() => _emailMode = _EmailMode.password);
      }
    }
  }

  Future<void> _startPhone(AuthState auth) async {
    if (auth.busy || !_phoneKey.currentState!.validate()) {
      return;
    }
    final result = await ref
        .read(authControllerProvider.notifier)
        .startPhoneOtp(_phone.text.trim());
    if (result != null && mounted) {
      setState(() => _phoneCodeSent = true);
      _startResendCountdown(result.resendAfter);
    }
  }

  Future<void> _verifyPhone(AuthState auth) async {
    if (auth.busy || !_phoneKey.currentState!.validate()) {
      return;
    }
    await ref
        .read(authControllerProvider.notifier)
        .verifyPhoneOtp(phone: _phone.text.trim(), code: _otp.text.trim());
  }

  Future<void> _startEmailOtp(AuthState auth) async {
    if (auth.busy || !_emailOtpKey.currentState!.validate()) {
      return;
    }
    final result = await ref
        .read(authControllerProvider.notifier)
        .startEmailOtp(_email.text.trim());
    if (result != null && mounted) {
      setState(() {
        _emailCodeSent = true;
        if (result.debugCode != null && _otp.text.trim().isEmpty) {
          _otp.text = result.debugCode!;
        }
      });
      _startResendCountdown(result.resendAfter);
    }
  }

  Future<void> _verifyEmailOtp(AuthState auth) async {
    if (auth.busy || !_emailOtpKey.currentState!.validate()) {
      return;
    }
    await ref
        .read(authControllerProvider.notifier)
        .verifyEmailOtp(email: _email.text.trim(), code: _otp.text.trim());
  }

  Widget _oauthButton(String provider, String label, IconData icon) {
    final l10n = AppLocalizations.of(context);
    return _AuthPillButton(
      label: l10n.authContinueWithProvider(label),
      filled: false,
      onPressed: kIsWeb
          ? () async {
              final config = ref.read(appConfigProvider);
              final uri = config.endpoint('auth/oauth/$provider/start');
              try {
                final launched = await launchUrl(
                  uri,
                  webOnlyWindowName: '_self',
                );
                if (!launched && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.authOAuthOpenFailed)),
                  );
                }
              } on Object {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.authOAuthProviderUnavailable)),
                  );
                }
              }
            }
          : null,
    );
  }
}

final class OAuthCompleteScreen extends ConsumerStatefulWidget {
  const OAuthCompleteScreen({super.key});

  @override
  ConsumerState<OAuthCompleteScreen> createState() =>
      _OAuthCompleteScreenState();
}

final class _OAuthCompleteScreenState
    extends ConsumerState<OAuthCompleteScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_complete());
  }

  Future<void> _complete() async {
    try {
      await ref.read(authControllerProvider.notifier).completeOAuthSession();
      if (mounted) {
        context.goNamed('home');
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _error = messageFor(error));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: _AuthAtmosphere(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: _error == null
                ? const CircularProgressIndicator()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      _MessageBanner(message: _error!, error: true),
                      const SizedBox(height: 16),
                      LumenPrimaryButton(
                        label: l10n.authReturnToLogin,
                        onPressed: () => context.goNamed('auth'),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

final class MfaScreen extends ConsumerStatefulWidget {
  const MfaScreen({super.key});

  @override
  ConsumerState<MfaScreen> createState() => _MfaScreenState();
}

final class _MfaScreenState extends ConsumerState<MfaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.authMfaTitle)),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: LumenSurface(
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      l10n.authMfaPrompt,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _code,
                      autofocus: true,
                      autofillHints: const <String>[AutofillHints.oneTimeCode],
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: l10n.authCode),
                      validator: (value) => (value == null || value.length < 6)
                          ? 'Введіть чинний код.'
                          : null,
                    ),
                    if (auth.error != null) ...<Widget>[
                      const SizedBox(height: 12),
                      _MessageBanner(message: auth.error!, error: true),
                    ],
                    const SizedBox(height: 20),
                    LumenPrimaryButton(
                      label: l10n.authConfirm,
                      busy: auth.busy,
                      onPressed: () {
                        if (_formKey.currentState!.validate()) {
                          ref
                              .read(authControllerProvider.notifier)
                              .verifyMfa(_code.text);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum AuthUtilityMode { emailVerification, passwordReset }

final class AuthUtilityScreen extends ConsumerStatefulWidget {
  const AuthUtilityScreen({required this.mode, super.key, this.initialToken});

  final AuthUtilityMode mode;
  final String? initialToken;

  @override
  ConsumerState<AuthUtilityScreen> createState() => _AuthUtilityScreenState();
}

final class _AuthUtilityScreenState extends ConsumerState<AuthUtilityScreen> {
  final _emailKey = GlobalKey<FormState>();
  final _tokenKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  late final TextEditingController _token;
  final _password = TextEditingController();
  bool _busy = false;
  String? _message;
  bool _error = false;
  bool _autoTried = false;

  @override
  void initState() {
    super.initState();
    _token = TextEditingController(text: widget.initialToken);
    if ((widget.initialToken?.length ?? 0) >= 32) {
      unawaited(_autoConsume());
    }
  }

  Future<void> _autoConsume() async {
    if (_autoTried || widget.mode != AuthUtilityMode.emailVerification) {
      return;
    }
    _autoTried = true;
    await _consume();
  }

  @override
  void dispose() {
    _email.dispose();
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _verification => widget.mode == AuthUtilityMode.emailVerification;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: LandingTokens.canvas,
    body: _AuthAtmosphere(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  TextButton(
                    onPressed: () => context.goNamed('auth'),
                    child: Text(
                      '← ${AppLocalizations.of(context).authBack}',
                      style: LandingTokens.body(
                        14,
                        color: LandingTokens.ink.withValues(alpha: 0.55),
                      ),
                    ),
                  ),
                  const Center(
                    child: SyloraWordmark(
                      fontSize: 22,
                      letterSpacing: 7,
                      weight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _verification
                        ? AppLocalizations.of(
                            context,
                          ).authEmailVerificationTitle
                        : AppLocalizations.of(context).authPasswordResetTitle,
                    textAlign: TextAlign.center,
                    style: LandingTokens.body(16),
                  ),
                  const SizedBox(height: 28),
                  Form(
                    key: _emailKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Text(
                          _verification
                              ? AppLocalizations.of(
                                  context,
                                ).authRequestVerificationEmail
                              : AppLocalizations.of(
                                  context,
                                ).authRequestPasswordReset,
                          style: LandingTokens.display(24),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const <String>[AutofillHints.email],
                          decoration: InputDecoration(
                            labelText: AppLocalizations.of(
                              context,
                            ).authEmailAddress,
                          ),
                          validator: validateEmail,
                        ),
                        const SizedBox(height: 16),
                        _AuthPillButton(
                          label: AppLocalizations.of(context).authSendEmail,
                          filled: false,
                          onPressed: _busy ? null : _request,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  Form(
                    key: _tokenKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Text(
                          _verification
                              ? AppLocalizations.of(context).authVerifyWithToken
                              : AppLocalizations.of(context).authSetNewPassword,
                          style: LandingTokens.display(24),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _token,
                          decoration: InputDecoration(
                            labelText: AppLocalizations.of(context).authToken,
                          ),
                          validator: (value) => (value?.length ?? 0) < 32
                              ? 'Введіть токен із листа.'
                              : null,
                        ),
                        if (!_verification) ...<Widget>[
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _password,
                            obscureText: true,
                            autofillHints: const <String>[
                              AutofillHints.newPassword,
                            ],
                            decoration: InputDecoration(
                              labelText: AppLocalizations.of(
                                context,
                              ).authNewPassword,
                            ),
                            validator: (value) =>
                                validatePassword(value, registration: true),
                          ),
                        ],
                        const SizedBox(height: 16),
                        _AuthPillButton(
                          label: _verification
                              ? AppLocalizations.of(context).authConfirmEmail
                              : AppLocalizations.of(context).authResetPassword,
                          busy: _busy,
                          filled: true,
                          onPressed: _consume,
                        ),
                      ],
                    ),
                  ),
                  if (_message != null) ...<Widget>[
                    const SizedBox(height: 16),
                    _MessageBanner(message: _message!, error: _error),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );

  Future<void> _request() async {
    if (!_emailKey.currentState!.validate()) {
      return;
    }
    await _run(() async {
      final repository = ref.read(authRepositoryProvider);
      final hint = _verification
          ? await repository.requestEmailVerification(_email.text.trim())
          : await repository.requestPasswordReset(_email.text.trim());
      if (hint.debugToken != null && mounted) {
        _token.text = hint.debugToken!;
      }
      if (hint.debugToken != null) {
        return _verification
            ? 'Тестовий стенд: токен підтвердження підставлено нижче.'
            : 'Тестовий стенд: токен скидання підставлено нижче. Вкажіть новий пароль і підтвердіть.';
      }
      return 'Якщо акаунт підходить, ми надіслали лист.';
    });
  }

  Future<void> _consume() async {
    if (!_tokenKey.currentState!.validate()) {
      return;
    }
    await _run(() async {
      final repository = ref.read(authRepositoryProvider);
      if (_verification) {
        await repository.consumeEmailVerification(_token.text.trim());
        return 'Пошту підтверджено. Тепер можна увійти.';
      }
      await repository.consumePasswordReset(_token.text.trim(), _password.text);
      return 'Пароль змінено. Тепер можна увійти.';
    });
  }

  Future<void> _run(Future<String> Function() action) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final message = await action();
      if (mounted) {
        setState(() {
          _message = message;
          _error = false;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _message = messageFor(error);
          _error = true;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class _AuthAtmosphere extends StatelessWidget {
  const _AuthAtmosphere({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => SyloraLivingCanvas(
        // Avoid CustomPaint particle loops on web auth utilities.
        animate: !kIsWeb,
        intensity: kIsWeb ? 0.35 : 0.85,
        showOrbits: false,
        child: child,
      );
}

final class _AuthPillButton extends StatelessWidget {
  const _AuthPillButton({
    required this.label,
    required this.onPressed,
    this.filled = false,
    this.busy = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool filled;
  final bool busy;

  @override
  Widget build(BuildContext context) => SyloraButton(
    label: label,
    onPressed: onPressed,
    busy: busy,
    variant: filled
        ? SyloraButtonVariant.primary
        : SyloraButtonVariant.secondary,
  );
}

final class _DividerLabel extends StatelessWidget {
  const _DividerLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      const Expanded(child: Divider()),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Text(label, style: Theme.of(context).textTheme.labelMedium),
      ),
      const Expanded(child: Divider()),
    ],
  );
}

final class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.message, this.error = false});

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: SyloraBanner(message: message, error: error),
  );
}
