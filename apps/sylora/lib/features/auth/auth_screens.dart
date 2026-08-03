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

final class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Column(
              children: <Widget>[
                const SyloraLogo(size: 92),
                const SizedBox(height: 28),
                Text(
                  'Яскравіше місце, щоб творити разом.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 16),
                Text(
                  'Спільнота, розмови, подарунки, AI та ефір — у вашому акаунті SYLORA.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 32),
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
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _displayName = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  late final TabController _tabs;
  _AuthPane _pane = _AuthPane.chooser;
  AuthMethods? _methods;
  String? _methodsError;
  bool _phoneCodeSent = false;
  bool _loadingMethods = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialCreateAccount ? 1 : 0,
    );
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
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingMethods = false;
        _methodsError = messageFor(error);
        // Safe defaults: email password always available; social/phone off.
        _methods = const AuthMethods(
          phone: false,
          email: true,
          tiktok: false,
          facebook: false,
          google: false,
          apple: false,
        );
      });
    }
  }

  @override
  void dispose() {
    _tabs.dispose();
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: LumenSurface(
                padding: const EdgeInsets.all(28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: SyloraLogo(size: 54),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Вхід до SYLORA',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Соціальна платформа для спільноти. Оберіть зручний спосіб входу.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 20),
                    if (_loadingMethods)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else ...<Widget>[
                      if (_pane != _AuthPane.chooser)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: () => setState(() {
                              _pane = _AuthPane.chooser;
                              _phoneCodeSent = false;
                            }),
                            icon: const Icon(Icons.arrow_back_rounded),
                            label: const Text('Назад'),
                          ),
                        ),
                      if (_pane == _AuthPane.chooser) _chooser(auth),
                      if (_pane == _AuthPane.phone) _phonePane(auth),
                      if (_pane == _AuthPane.email) _emailPane(auth),
                    ],
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
    final social = <(String, String, IconData)>[
      if (methods.tiktok) ('tiktok', 'TikTok', Icons.music_note_rounded),
      if (methods.facebook) ('facebook', 'Facebook', Icons.facebook_rounded),
      if (methods.google) ('google', 'Google', Icons.g_mobiledata_rounded),
      if (methods.apple) ('apple', 'Apple', Icons.apple_rounded),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        LumenPrimaryButton(
          label: 'Продовжити з номером телефону',
          icon: Icons.sms_outlined,
          busy: auth.busy,
          onPressed: methods.phone
              ? () => setState(() => _pane = _AuthPane.phone)
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
              ? () => setState(() => _pane = _AuthPane.email)
              : null,
          disabledReason: methods.email
              ? null
              : 'Вхід за електронною поштою недоступний.',
        ),
        if (social.isNotEmpty) ...<Widget>[
          const SizedBox(height: 24),
          const _DividerLabel(label: 'або продовжити через'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: <Widget>[
              for (final entry in social)
                _oauthButton(entry.$1, entry.$2, entry.$3),
            ],
          ),
        ],
        if (!kIsWeb) ...<Widget>[
          const SizedBox(height: 12),
          Text(
            'Соціальний вхід у цій збірці вимкнено, доки не налаштовано deep-link.',
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
          'Номер телефону',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
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
            validator: (value) =>
                (value == null || value.trim().length < 4)
                ? 'Введіть код із SMS.'
                : null,
          ),
        ],
        const SizedBox(height: 20),
        LumenPrimaryButton(
          label: _phoneCodeSent ? 'Увійти' : 'Надіслати код',
          busy: auth.busy,
          onPressed: () => _phoneCodeSent ? _verifyPhone(auth) : _startPhone(auth),
        ),
      ],
    ),
  );

  Widget _emailPane(AuthState auth) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      TabBar(
        controller: _tabs,
        tabs: const <Tab>[
          Tab(text: 'Увійти'),
          Tab(text: 'Створити акаунт'),
        ],
      ),
      const SizedBox(height: 20),
      AnimatedBuilder(
        animation: _tabs,
        builder: (context, child) =>
            _tabs.index == 0 ? _signInForm(auth) : _registerForm(auth),
      ),
    ],
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

  Widget _oauthButton(String provider, String label, IconData icon) {
    final reason =
        'Соціальний вхід у цій збірці потребує налаштованого deep-link.';
    return LumenSecondaryButton(
      label: label,
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
    body: Center(
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

  @override
  void initState() {
    super.initState();
    _token = TextEditingController(text: widget.initialToken);
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
      title: Text(
        _verification ? 'Підтвердження пошти' : 'Скидання пароля',
      ),
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
