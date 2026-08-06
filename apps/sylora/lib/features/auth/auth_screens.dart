import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/l10n/sylora_localizations.dart';
import '../../core/lumen_effects.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import 'auth.dart';

final class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final reducedMotion = ref.watch(
      visualSettingsProvider.select((value) => value.reducedMotion),
    );
    return Scaffold(
      body: LumenLivingBackground(
        reducedMotion: reducedMotion,
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 960),
                child: Column(
                  children: <Widget>[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: <Widget>[
                        _LanguageMenu(locale: locale),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SpectralRingLogo(
                      size: 140,
                      intro: true,
                      reducedMotion: reducedMotion,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      SyloraStrings.t(locale, 'app_name'),
                      style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        letterSpacing: 4,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      SyloraStrings.t(locale, 'brand_motto'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: LumenColors.solar,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 12,
                      runSpacing: 12,
                      children: <Widget>[
                        _GoldButton(
                          label: SyloraStrings.t(locale, 'sign_in'),
                          onPressed: () => context.goNamed('auth'),
                        ),
                        LumenSecondaryButton(
                          label: SyloraStrings.t(locale, 'create_account'),
                          onPressed: () => context.goNamed(
                            'auth',
                            queryParameters: <String, String>{'create': '1'},
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      SyloraStrings.t(locale, 'free_tier_note'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 40),
                    _FeaturePillars(locale: locale),
                    const SizedBox(height: 24),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final columns = constraints.maxWidth > 720 ? 2 : 1;
                        return GridView.count(
                          crossAxisCount: columns,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          childAspectRatio: columns == 2 ? 2.4 : 2.8,
                          children: <Widget>[
                            _ValueProp(
                              icon: Icons.sensors_rounded,
                              title: SyloraStrings.t(locale, 'prop_live'),
                              body: SyloraStrings.t(locale, 'prop_live_body'),
                            ),
                            _ValueProp(
                              icon: Icons.auto_awesome_rounded,
                              title: SyloraStrings.t(locale, 'prop_aura'),
                              body: SyloraStrings.t(locale, 'prop_aura_body'),
                            ),
                            _ValueProp(
                              icon: Icons.payments_outlined,
                              title: SyloraStrings.t(locale, 'prop_income'),
                              body: SyloraStrings.t(locale, 'prop_income_body'),
                            ),
                            _ValueProp(
                              icon: Icons.groups_rounded,
                              title: SyloraStrings.t(locale, 'prop_rooms'),
                              body: SyloraStrings.t(locale, 'prop_rooms_body'),
                            ),
                          ],
                        );
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

final class _GoldButton extends StatelessWidget {
  const _GoldButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(999),
      gradient: const LinearGradient(
        colors: <Color>[Color(0xFFE8C96A), Color(0xFFC9A227)],
      ),
      boxShadow: <BoxShadow>[
        BoxShadow(
          color: const Color(0xFFE8C96A).withValues(alpha: 0.4),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ],
    ),
    child: ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.transparent,
        shadowColor: Colors.transparent,
        foregroundColor: const Color(0xFF3D2E00),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
    ),
  );
}

final class _FeaturePillars extends StatelessWidget {
  const _FeaturePillars({required this.locale});

  final SyloraLocale locale;

  @override
  Widget build(BuildContext context) {
    final pillars = <_Pillar>[
      _Pillar(Icons.auto_awesome_rounded, SyloraStrings.t(locale, 'pillar_ai')),
      _Pillar(Icons.sensors_rounded, SyloraStrings.t(locale, 'pillar_live')),
      _Pillar(Icons.payments_rounded, SyloraStrings.t(locale, 'pillar_creator')),
      _Pillar(Icons.public_rounded, SyloraStrings.t(locale, 'pillar_world')),
    ];
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 16,
      runSpacing: 12,
      children: pillars
          .map(
            (pillar) => LumenVellum(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              radius: 16,
              sigma: 12,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Icon(pillar.icon, size: 20, color: LumenColors.aether),
                  const SizedBox(width: 8),
                  Text(pillar.label),
                ],
              ),
            ),
          )
          .toList(growable: false),
    );
  }
}

@immutable
final class _Pillar {
  const _Pillar(this.icon, this.label);
  final IconData icon;
  final String label;
}

final class _ValueProp extends StatelessWidget {
  const _ValueProp({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) => LumenVellum(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Icon(icon, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text(body, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ],
    ),
  );
}

final class _LanguageMenu extends ConsumerWidget {
  const _LanguageMenu({required this.locale});

  final SyloraLocale locale;

  @override
  Widget build(BuildContext context, WidgetRef ref) => PopupMenuButton<SyloraLocale>(
    tooltip: 'Language',
    initialValue: locale,
    onSelected: (value) => ref.read(localeProvider.notifier).setLocale(value),
    itemBuilder: (context) => SyloraLocale.values
        .map(
          (value) => PopupMenuItem<SyloraLocale>(
            value: value,
            child: Text('${value.flag} ${value.label}'),
          ),
        )
        .toList(growable: false),
    child: LumenVellum(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      radius: 999,
      sigma: 10,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(locale.flag),
          const SizedBox(width: 6),
          Text(locale.label, style: Theme.of(context).textTheme.labelLarge),
          const Icon(Icons.expand_more_rounded, size: 18),
        ],
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
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _displayName = TextEditingController();
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialCreateAccount ? 1 : 0,
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    _email.dispose();
    _password.dispose();
    _displayName.dispose();
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
                      'Welcome to SYLORA',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 20),
                    TabBar(
                      controller: _tabs,
                      tabs: const <Tab>[
                        Tab(text: 'Sign in'),
                        Tab(text: 'Create account'),
                      ],
                    ),
                    const SizedBox(height: 20),
                    AnimatedBuilder(
                      animation: _tabs,
                      builder: (context, child) => _tabs.index == 0
                          ? _signInForm(auth)
                          : _registerForm(auth),
                    ),
                    if (auth.error != null) ...<Widget>[
                      const SizedBox(height: 14),
                      _MessageBanner(message: auth.error!, error: true),
                    ],
                    if (auth.notice != null) ...<Widget>[
                      const SizedBox(height: 14),
                      _MessageBanner(message: auth.notice!),
                    ],
                    const SizedBox(height: 24),
                    const _DividerLabel(label: 'or continue with'),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: <Widget>[
                        _oauthButton('google'),
                        _oauthButton('apple'),
                        _oauthButton('github'),
                      ],
                    ),
                    if (!kIsWeb) ...<Widget>[
                      const SizedBox(height: 12),
                      Text(
                        'OAuth is disabled in this native build because an app deep-link callback has not been configured. Email sign-in remains available.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
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
            labelText: 'Email',
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
            labelText: 'Password',
            prefixIcon: Icon(Icons.lock_outline_rounded),
          ),
          validator: validatePassword,
          onFieldSubmitted: (_) => _signIn(auth),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => context.pushNamed('password-reset'),
            child: const Text('Forgot password?'),
          ),
        ),
        LumenPrimaryButton(
          label: 'Sign in',
          icon: Icons.login_rounded,
          busy: auth.busy,
          onPressed: () => _signIn(auth),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => context.pushNamed('email-verification'),
          child: const Text('Verify email or resend link'),
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
            labelText: 'Display name',
            prefixIcon: Icon(Icons.person_outline_rounded),
          ),
          validator: (value) => (value?.trim().isEmpty ?? true)
              ? 'Enter your display name.'
              : null,
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const <String>[AutofillHints.newUsername],
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Email',
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
            labelText: 'Password',
            helperText: 'At least 12 characters',
            prefixIcon: Icon(Icons.lock_outline_rounded),
          ),
          validator: (value) => validatePassword(value, registration: true),
          onFieldSubmitted: (_) => _register(auth),
        ),
        const SizedBox(height: 20),
        LumenPrimaryButton(
          label: 'Create account',
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

  Widget _oauthButton(String provider) {
    final reason =
        'Native OAuth requires a configured deep-link callback for this app.';
    return LumenSecondaryButton(
      label: provider[0].toUpperCase() + provider.substring(1),
      icon: Icons.open_in_browser_rounded,
      onPressed: kIsWeb
          ? () async {
              final config = ref.read(appConfigProvider);
              final uri = config.endpoint('auth/oauth/$provider/start');
              final launched = await launchUrl(uri, webOnlyWindowName: '_self');
              if (!launched && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('The OAuth page could not be opened.'),
                  ),
                );
              }
            }
          : null,
      disabledReason: kIsWeb ? null : reason,
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
    return Scaffold(
      appBar: AppBar(title: const Text('Two-factor authentication')),
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
                      'Enter your authenticator code',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _code,
                      autofocus: true,
                      autofillHints: const <String>[AutofillHints.oneTimeCode],
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Code'),
                      validator: (value) => (value == null || value.length < 6)
                          ? 'Enter a valid code.'
                          : null,
                    ),
                    if (auth.error != null) ...<Widget>[
                      const SizedBox(height: 12),
                      _MessageBanner(message: auth.error!, error: true),
                    ],
                    const SizedBox(height: 20),
                    LumenPrimaryButton(
                      label: 'Verify',
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
      title: Text(_verification ? 'Email verification' : 'Password reset'),
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
                            ? 'Send a new verification link'
                            : 'Request a reset link',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const <String>[AutofillHints.email],
                        decoration: const InputDecoration(labelText: 'Email'),
                        validator: validateEmail,
                      ),
                      const SizedBox(height: 16),
                      LumenSecondaryButton(
                        label: 'Send email',
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
                            ? 'Verify with a token'
                            : 'Set a new password',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _token,
                        decoration: const InputDecoration(labelText: 'Token'),
                        validator: (value) => (value?.length ?? 0) < 32
                            ? 'Enter the token from your email.'
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
                            labelText: 'New password',
                          ),
                          validator: (value) =>
                              validatePassword(value, registration: true),
                        ),
                      ],
                      const SizedBox(height: 16),
                      LumenPrimaryButton(
                        label: _verification
                            ? 'Verify email'
                            : 'Reset password',
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
      return 'If the account is eligible, an email has been sent.';
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
        return 'Email verified. You can now sign in.';
      }
      await repository.consumePasswordReset(_token.text.trim(), _password.text);
      return 'Password reset. You can now sign in.';
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
