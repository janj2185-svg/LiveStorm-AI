import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
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
    _slide = Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero)
        .animate(CurvedAnimation(parent: _motion, curve: Curves.easeOutCubic));
    unawaited(_motion.forward());
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
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
                  const SyloraLogo(size: 88),
                  const SizedBox(height: 28),
                  Text(
                    'SYLORA',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Твори. Спілкуйся. Ефір.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Соціальна платформа для спільноти, подарунків і живого ефіру.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: LumenColors.porcelainMuted,
                    ),
                  ),
                  const Spacer(flex: 3),
                  LumenPrimaryButton(
                    label: 'Продовжити',
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
  AuthMethods? _methods;
  String? _methodsError;
  bool _phoneCodeSent = false;
  bool _emailCodeSent = false;
  bool _loadingMethods = true;
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
        _loadingMethods = false;
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
        _loadingMethods = false;
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
        _emailMode = _EmailMode.password;
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
    return Scaffold(
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
                    const SyloraLogo(size: 56),
                    const SizedBox(height: 18),
                    Text(
                      'SYLORA',
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _pane == _AuthPane.chooser
                          ? 'Увійдіть, щоб продовжити'
                          : _pane == _AuthPane.phone
                          ? 'Вхід за номером телефону'
                          : 'Вхід з електронною поштою',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: LumenColors.porcelainMuted,
                      ),
                    ),
                    const SizedBox(height: 22),
                    if (_loadingMethods)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 36),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else
                      FadeTransition(
                        opacity: _paneMotion,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: <Widget>[
                            if (_pane != _AuthPane.chooser)
                              Align(
                                alignment: Alignment.centerLeft,
                                child: TextButton.icon(
                                  onPressed: () => _switchPane(_AuthPane.chooser),
                                  icon: const Icon(Icons.arrow_back_rounded),
                                  label: const Text('Назад'),
                                ),
                              ),
                            if (_pane == _AuthPane.chooser) _chooser(auth),
                            if (_pane == _AuthPane.phone) _phonePane(auth),
                            if (_pane == _AuthPane.email) _emailPane(auth),
                          ],
                        ),
                      ),
                    if (_methodsError != null) ...<Widget>[
                      const SizedBox(height: 12),
                      _MessageBanner(message: _methodsError!, error: true),
                    ],
                    if (auth.error != null) ...<Widget>[
                      const SizedBox(height: 14),
                      _MessageBanner(message: auth.error!, error: true),
                    ],
                    if (auth.notice != null) ...<Widget>[
                      const SizedBox(height: 14),
                      _MessageBanner(message: auth.notice!),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _chooser(AuthState auth) {
    final methods = _methods!;
    // Product order: Google → Apple → Facebook → TikTok. Never GitHub.
    final social = <(String, String, IconData)>[
      if (methods.google) ('google', 'Google', Icons.g_mobiledata_rounded),
      if (methods.apple) ('apple', 'Apple', Icons.apple_rounded),
      if (methods.facebook) ('facebook', 'Facebook', Icons.facebook_rounded),
      if (methods.tiktok) ('tiktok', 'TikTok', Icons.music_note_rounded),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        LumenPrimaryButton(
          label: 'Продовжити з номером телефону',
          icon: Icons.sms_outlined,
          busy: auth.busy,
          onPressed: methods.phone
              ? () => _switchPane(_AuthPane.phone)
              : null,
          disabledReason: methods.phone
              ? null
              : 'Вхід за телефоном тимчасово недоступний.',
        ),
        const SizedBox(height: 12),
        LumenSecondaryButton(
          label: 'Продовжити з електронною поштою',
          icon: Icons.mail_outline_rounded,
          onPressed: methods.email
              ? () => _switchPane(_AuthPane.email)
              : null,
          disabledReason: methods.email
              ? null
              : 'Вхід за електронною поштою недоступний.',
        ),
        if (social.isNotEmpty) ...<Widget>[
          const SizedBox(height: 28),
          const _DividerLabel(label: 'або'),
          const SizedBox(height: 16),
          for (final entry in social) ...<Widget>[
            _oauthButton(entry.$1, entry.$2, entry.$3),
            const SizedBox(height: 10),
          ],
        ],
        if (!kIsWeb) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            'Соціальний вхід у мобільній збірці з’явиться після налаштування deep-link.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ],
    );
  }

  Widget _phonePane(AuthState auth) => Form(
    key: _phoneKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          'Ми надішлемо одноразовий код у SMS.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          autofillHints: const <String>[AutofillHints.telephoneNumber],
          decoration: const InputDecoration(
            labelText: 'Телефон',
            hintText: '+380…',
            prefixIcon: Icon(Icons.phone_iphone_rounded),
          ),
          validator: validatePhone,
        ),
        if (_phoneCodeSent) ...<Widget>[
          const SizedBox(height: 14),
          TextFormField(
            controller: _otp,
            keyboardType: TextInputType.number,
            autofillHints: const <String>[AutofillHints.oneTimeCode],
            decoration: const InputDecoration(
              labelText: 'Код з SMS',
              prefixIcon: Icon(Icons.pin_outlined),
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
                    ? 'Надіслати знову через $_resendSeconds с'
                    : 'Надіслати код знову',
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        LumenPrimaryButton(
          label: _phoneCodeSent ? 'Увійти' : 'Надіслати код',
          busy: auth.busy,
          onPressed: () =>
              _phoneCodeSent ? _verifyPhone(auth) : _startPhone(auth),
        ),
      ],
    ),
  );

  Widget _emailPane(AuthState auth) {
    final methods = _methods!;
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
                  label: const Text('Код на пошту'),
                  selected: _emailMode == _EmailMode.otp,
                  onSelected: (_) => setState(() {
                    _emailMode = _EmailMode.otp;
                    _emailCodeSent = false;
                    _otp.clear();
                  }),
                ),
              if (methods.emailPassword)
                ChoiceChip(
                  label: const Text('Пароль'),
                  selected: _emailMode == _EmailMode.password,
                  onSelected: (_) =>
                      setState(() => _emailMode = _EmailMode.password),
                ),
              if (methods.emailPassword)
                ChoiceChip(
                  label: const Text('Створити акаунт'),
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

  Widget _emailOtpForm(AuthState auth) => Form(
    key: _emailOtpKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          'Ми надішлемо одноразовий код на електронну пошту.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const <String>[AutofillHints.email],
          decoration: const InputDecoration(
            labelText: 'Електронна пошта',
            prefixIcon: Icon(Icons.mail_outline_rounded),
          ),
          validator: validateEmail,
        ),
        if (_emailCodeSent) ...<Widget>[
          const SizedBox(height: 14),
          TextFormField(
            controller: _otp,
            keyboardType: TextInputType.number,
            autofillHints: const <String>[AutofillHints.oneTimeCode],
            decoration: const InputDecoration(
              labelText: 'Код з листа',
              prefixIcon: Icon(Icons.pin_outlined),
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
                    ? 'Надіслати знову через $_resendSeconds с'
                    : 'Надіслати код знову',
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        LumenPrimaryButton(
          label: _emailCodeSent ? 'Увійти' : 'Надіслати код',
          busy: auth.busy,
          onPressed: () =>
              _emailCodeSent ? _verifyEmailOtp(auth) : _startEmailOtp(auth),
        ),
      ],
    ),
  );

  Widget _signInForm(AuthState auth) => Form(
    key: _signInKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        TextFormField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const <String>[AutofillHints.username],
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Електронна пошта',
            prefixIcon: Icon(Icons.mail_outline_rounded),
          ),
          validator: validateEmail,
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _password,
          obscureText: true,
          autofillHints: const <String>[AutofillHints.password],
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Пароль',
            prefixIcon: Icon(Icons.lock_outline_rounded),
          ),
          validator: validatePassword,
          onFieldSubmitted: (_) => _signIn(auth),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => context.pushNamed('password-reset'),
            child: const Text('Забули пароль?'),
          ),
        ),
        LumenPrimaryButton(
          label: 'Увійти',
          icon: Icons.login_rounded,
          busy: auth.busy,
          onPressed: () => _signIn(auth),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => context.pushNamed('email-verification'),
          child: const Text('Підтвердити пошту або надіслати лист ще раз'),
        ),
      ],
    ),
  );

  Widget _registerForm(AuthState auth) => Form(
    key: _registerKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        TextFormField(
          controller: _displayName,
          autofillHints: const <String>[AutofillHints.name],
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Ім’я для профілю',
            prefixIcon: Icon(Icons.person_outline_rounded),
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
          decoration: const InputDecoration(
            labelText: 'Електронна пошта',
            prefixIcon: Icon(Icons.mail_outline_rounded),
          ),
          validator: validateEmail,
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _password,
          obscureText: true,
          autofillHints: const <String>[AutofillHints.newPassword],
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            labelText: 'Пароль',
            helperText: 'Щонайменше 12 символів',
            prefixIcon: Icon(Icons.lock_outline_rounded),
          ),
          validator: (value) => validatePassword(value, registration: true),
          onFieldSubmitted: (_) => _register(auth),
        ),
        const SizedBox(height: 20),
        LumenPrimaryButton(
          label: 'Створити акаунт',
          icon: Icons.person_add_alt_1_rounded,
          busy: auth.busy,
          onPressed: () => _register(auth),
        ),
      ],
    ),
  );

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
    await ref
        .read(authControllerProvider.notifier)
        .register(
          email: _email.text,
          password: _password.text,
          displayName: _displayName.text,
        );
  }

  Future<void> _startPhone(AuthState auth) async {
    if (auth.busy || !_phoneKey.currentState!.validate()) {
      return;
    }
    final ok = await ref
        .read(authControllerProvider.notifier)
        .startPhoneOtp(_phone.text.trim());
    if (ok && mounted) {
      setState(() => _phoneCodeSent = true);
      _startResendCountdown(60);
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
    final ok = await ref
        .read(authControllerProvider.notifier)
        .startEmailOtp(_email.text.trim());
    if (ok && mounted) {
      setState(() => _emailCodeSent = true);
      _startResendCountdown(60);
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
    final reason =
        'Соціальний вхід у цій збірці потребує налаштованого deep-link.';
    return SizedBox(
      width: double.infinity,
      child: LumenSecondaryButton(
        label: 'Продовжити з $label',
        icon: icon,
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
                      const SnackBar(
                        content: Text('Не вдалося відкрити сторінку входу.'),
                      ),
                    );
                  }
                } on Object {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Провайдер недоступний. Спробуйте інший спосіб входу.',
                        ),
                      ),
                    );
                  }
                }
              }
            : null,
        disabledReason: kIsWeb ? null : reason,
      ),
    );
  }
}

final class OAuthCompleteScreen extends ConsumerStatefulWidget {
  const OAuthCompleteScreen({super.key});

  @override
  ConsumerState<OAuthCompleteScreen> createState() =>
      _OAuthCompleteScreenState();
}

final class _OAuthCompleteScreenState extends ConsumerState<OAuthCompleteScreen> {
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
  Widget build(BuildContext context) => Scaffold(
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
                      label: 'Повернутися до входу',
                      onPressed: () => context.goNamed('auth'),
                    ),
                  ],
                ),
        ),
      ),
    ),
  );
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
    return Scaffold(
      appBar: AppBar(title: const Text('Двофакторна автентифікація')),
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
                      'Введіть код із застосунку-автентифікатора',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _code,
                      autofocus: true,
                      autofillHints: const <String>[AutofillHints.oneTimeCode],
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Код'),
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
                      label: 'Підтвердити',
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
    appBar: AppBar(
      title: Text(_verification ? 'Підтвердження пошти' : 'Скидання пароля'),
    ),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            children: <Widget>[
              LumenSurface(
                child: Form(
                  key: _emailKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Text(
                        _verification
                            ? 'Надіслати новий лист підтвердження'
                            : 'Запросити посилання для скидання',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const <String>[AutofillHints.email],
                        decoration: const InputDecoration(
                          labelText: 'Електронна пошта',
                        ),
                        validator: validateEmail,
                      ),
                      const SizedBox(height: 16),
                      LumenSecondaryButton(
                        label: 'Надіслати лист',
                        icon: Icons.send_outlined,
                        onPressed: _busy ? null : _request,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              LumenSurface(
                child: Form(
                  key: _tokenKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Text(
                        _verification
                            ? 'Підтвердити токеном'
                            : 'Встановити новий пароль',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _token,
                        decoration: const InputDecoration(labelText: 'Токен'),
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
                          decoration: const InputDecoration(
                            labelText: 'Новий пароль',
                          ),
                          validator: (value) =>
                              validatePassword(value, registration: true),
                        ),
                      ],
                      const SizedBox(height: 16),
                      LumenPrimaryButton(
                        label: _verification
                            ? 'Підтвердити пошту'
                            : 'Скинути пароль',
                        busy: _busy,
                        onPressed: _consume,
                      ),
                    ],
                  ),
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
  );

  Future<void> _request() async {
    if (!_emailKey.currentState!.validate()) {
      return;
    }
    await _run(() async {
      final repository = ref.read(authRepositoryProvider);
      if (_verification) {
        await repository.requestEmailVerification(_email.text.trim());
      } else {
        await repository.requestPasswordReset(_email.text.trim());
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
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: dark
              ? const <Color>[
                  Color(0xFF10141A),
                  Color(0xFF16323A),
                  Color(0xFF171A20),
                ]
              : const <Color>[
                  Color(0xFFF4FBFB),
                  Color(0xFFE7F4F1),
                  Color(0xFFF7F5EF),
                ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          Positioned(
            top: -80,
            right: -40,
            child: IgnorePointer(
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: LumenColors.aetherBright.withValues(alpha: 0.16),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -60,
            left: -30,
            child: IgnorePointer(
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: LumenColors.verdigris.withValues(alpha: 0.12),
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
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
  Widget build(BuildContext context) {
    final color = error
        ? Theme.of(context).colorScheme.error
        : LumenColors.verdigris;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(message, style: TextStyle(color: color)),
      ),
    );
  }
}
