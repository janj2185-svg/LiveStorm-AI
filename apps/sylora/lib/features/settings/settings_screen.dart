import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/locale_controller.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../core/push_service.dart';
import '../../design/sylora.dart';
import '../../l10n/generated/app_localizations.dart';
import '../auth/auth.dart';
import '../platform/repositories.dart';

@immutable
final class AccountSnapshot {
  const AccountSnapshot({required this.profile, required this.settings});

  final ProfileModel profile;
  final AccountSettingsModel settings;
}

final accountProvider = FutureProvider.autoDispose<AccountSnapshot>((
  ref,
) async {
  final repository = ref.watch(accountRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.profile(),
    repository.settings(),
  ]);
  return AccountSnapshot(
    profile: values[0] as ProfileModel,
    settings: values[1] as AccountSettingsModel,
  );
});

final sessionsProvider = FutureProvider.autoDispose<List<SessionModel>>(
  (ref) => ref.watch(authRepositoryProvider).sessions(),
);

final pushServiceProvider = StateNotifierProvider<PushService, bool>(
  (ref) => PushService(
    client: ApiPushRegistrationClient(ref.watch(apiClientProvider)),
  ),
);

String _localeLabel(AppLocalizations l10n, Locale locale) =>
    switch (locale.languageCode) {
      'en' => l10n.settingsLanguageEnglish,
      'uk' => l10n.settingsLanguageUkrainian,
      'pl' => l10n.settingsLanguagePolish,
      'de' => l10n.settingsLanguageGerman,
      'es' => l10n.settingsLanguageSpanish,
      'fr' => l10n.settingsLanguageFrench,
      'it' => l10n.settingsLanguageItalian,
      'pt' => l10n.settingsLanguagePortuguese,
      'ja' => l10n.settingsLanguageJapanese,
      'ko' => l10n.settingsLanguageKorean,
      'zh' => l10n.settingsLanguageChinese,
      _ => SyloraLocales.labelFor(locale),
    };

final class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final account = ref.watch(accountProvider);
    final visual = ref.watch(visualSettingsProvider);
    final locale = ref.watch(localeControllerProvider);
    final notificationsEnabled = ref.watch(pushServiceProvider);
    final nativePushAvailable = ref
        .read(pushServiceProvider.notifier)
        .nativePushAvailable;
    return LumenPage(
      title: l10n.navSettings,
      subtitle: l10n.settingsHeroBody,
      intensity: 0.9,
      showAuraPresence: true,
      auraPresencePreset: SyloraAuraContextPreset.settings,
      header: account.maybeWhen(
        data: (snapshot) => SyloraUniverseHero(
          eyebrow: l10n.settingsHeroEyebrow,
          title: snapshot.profile.displayName,
          body: snapshot.profile.handle == null
              ? l10n.settingsHeroBody
              : '@${snapshot.profile.handle} · ${l10n.settingsHeroBody}',
          trailing: Row(
            children: <Widget>[
              SyloraAvatarOrb(
                label: snapshot.profile.displayName,
                imageUrl: snapshot.profile.avatarUrl,
                size: 56,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SyloraPortalChip(
                  label: l10n.settingsEditProfile,
                  icon: Icons.edit_outlined,
                  onTap: () => _editProfile(context, ref, snapshot.profile),
                ),
              ),
            ],
          ),
        ),
        orElse: () => SyloraUniverseHero(
          eyebrow: l10n.settingsHeroEyebrow,
          title: l10n.navSettings,
          body: l10n.settingsHeroBody,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          account.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stackTrace) => LumenErrorView(
              error: error,
              onRetry: () => ref.invalidate(accountProvider),
            ),
            data: (snapshot) => Column(
              children: <Widget>[
                SyloraStaggeredReveal(
                  index: 0,
                  child: SyloraGlassTile(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Text(
                          l10n.settingsProfile,
                          style: SyloraTokens.title(18),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: <Widget>[
                            SyloraAvatarOrb(
                              label: snapshot.profile.displayName,
                              imageUrl: snapshot.profile.avatarUrl,
                              size: 56,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    snapshot.profile.displayName,
                                    style: SyloraTokens.title(17),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    snapshot.profile.handle == null
                                        ? l10n.settingsNoPublicHandle
                                        : '@${snapshot.profile.handle}',
                                    style: SyloraTokens.body(
                                      13,
                                      color: SyloraTokens.inkMute,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SyloraButton(
                              label: l10n.settingsEditProfile,
                              variant: SyloraButtonVariant.secondary,
                              expanded: false,
                              onPressed: () =>
                                  _editProfile(context, ref, snapshot.profile),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SyloraStaggeredReveal(
                  index: 1,
                  child: SyloraGlassTile(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          l10n.settingsAccountPrivacy,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(l10n.settingsProductEmails),
                          value: snapshot.settings.productEmails,
                          onChanged: (value) => _updateAccount(
                            ref,
                            <String, dynamic>{'product_emails': value},
                          ),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(l10n.settingsMarketingEmails),
                          value: snapshot.settings.marketingEmails,
                          onChanged: (value) => _updateAccount(
                            ref,
                            <String, dynamic>{'marketing_emails': value},
                          ),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(l10n.settingsSecurityEmails),
                          subtitle: Text(l10n.settingsSecurityEmailDescription),
                          value: snapshot.settings.securityEmails,
                          onChanged: (value) => _updateAccount(
                            ref,
                            <String, dynamic>{'security_emails': value},
                          ),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(l10n.settingsNotifications),
                          subtitle: Text(
                            nativePushAvailable
                                ? l10n.settingsNotificationsDescription
                                : 'Push requires FCM configuration. In-app notifications remain available.',
                          ),
                          value: notificationsEnabled,
                          onChanged: nativePushAvailable
                              ? (value) => unawaited(
                                  _setNotifications(context, ref, value),
                                )
                              : null,
                        ),
                        DropdownButtonFormField<String>(
                          initialValue: snapshot.settings.profileVisibility,
                          decoration: InputDecoration(
                            labelText: l10n.settingsProfileVisibility,
                          ),
                          items: <DropdownMenuItem<String>>[
                            DropdownMenuItem(
                              value: 'public',
                              child: Text(l10n.settingsProfilePublic),
                            ),
                            DropdownMenuItem(
                              value: 'private',
                              child: Text(l10n.settingsProfilePrivate),
                            ),
                          ],
                          onChanged: (value) {
                            if (value != null) {
                              _updateAccount(ref, <String, dynamic>{
                                'profile_visibility': value,
                              });
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SyloraStaggeredReveal(
            index: 2,
            child: SyloraGlassTile(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    l10n.settingsDisplayAccessibility,
                    style: SyloraTokens.title(18),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<Locale>(
                    initialValue: locale,
                    decoration: InputDecoration(
                      labelText: l10n.settingsLanguage,
                      helperText: l10n.settingsLanguageDescription,
                    ),
                    items: <DropdownMenuItem<Locale>>[
                      for (final option in SyloraLocales.options)
                        DropdownMenuItem<Locale>(
                          value: option.locale,
                          child: Text(_localeLabel(l10n, option.locale)),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        ref
                            .read(localeControllerProvider.notifier)
                            .setLocale(value);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<LumenThemeMode>(
                    initialValue: visual.themeMode,
                    decoration: InputDecoration(labelText: l10n.settingsTheme),
                    items: <DropdownMenuItem<LumenThemeMode>>[
                      DropdownMenuItem(
                        value: LumenThemeMode.light,
                        child: Text(l10n.settingsThemeLight),
                      ),
                      DropdownMenuItem(
                        value: LumenThemeMode.dark,
                        child: Text(l10n.settingsThemeDark),
                      ),
                      DropdownMenuItem(
                        value: LumenThemeMode.system,
                        child: Text(l10n.settingsThemeSystem),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        ref
                            .read(visualSettingsProvider.notifier)
                            .update(visual.copyWith(themeMode: value));
                      }
                    },
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.settingsHighContrast),
                    value: visual.highContrast,
                    onChanged: (value) => ref
                        .read(visualSettingsProvider.notifier)
                        .update(visual.copyWith(highContrast: value)),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.settingsReducedMotion),
                    value: visual.reducedMotion,
                    onChanged: (value) => ref
                        .read(visualSettingsProvider.notifier)
                        .update(visual.copyWith(reducedMotion: value)),
                  ),
                  Text(
                    l10n.settingsTextScale(visual.textScale.toStringAsFixed(1)),
                  ),
                  Slider(
                    value: visual.textScale,
                    min: 0.8,
                    max: 2,
                    divisions: 6,
                    label: '${visual.textScale.toStringAsFixed(1)}×',
                    onChanged: (value) => ref
                        .read(visualSettingsProvider.notifier)
                        .update(visual.copyWith(textScale: value)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          SyloraStaggeredReveal(
            index: 3,
            child: SyloraGlassTile(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(l10n.settingsSecurity, style: SyloraTokens.title(18)),
                  const SizedBox(height: 12),
                  LumenSecondaryButton(
                    label: l10n.settingsSessions,
                    icon: Icons.devices_outlined,
                    onPressed: () => context.pushNamed('sessions'),
                  ),
                  const SizedBox(height: 8),
                  LumenSecondaryButton(
                    label: l10n.settingsAuthenticatorApp,
                    icon: Icons.security_outlined,
                    onPressed: () => context.pushNamed('totp'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          LumenPrimaryButton(
            label: l10n.settingsSignOut,
            icon: Icons.logout_rounded,
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }

  static Future<void> _updateAccount(WidgetRef ref, JsonObject patch) async {
    await ref.read(accountRepositoryProvider).updateSettings(patch);
    ref.invalidate(accountProvider);
  }

  static Future<void> _setNotifications(
    BuildContext context,
    WidgetRef ref,
    bool enabled,
  ) async {
    try {
      await ref.read(pushServiceProvider.notifier).setEnabled(enabled);
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  static Future<void> _editProfile(
    BuildContext context,
    WidgetRef ref,
    ProfileModel profile,
  ) async {
    final handle = TextEditingController(text: profile.handle);
    final displayName = TextEditingController(text: profile.displayName);
    final bio = TextEditingController(text: profile.bio);
    final locale = TextEditingController(text: profile.locale);
    final timezone = TextEditingController(text: profile.timezone);
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit profile'),
        content: SizedBox(
          width: 540,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextField(
                  controller: handle,
                  maxLength: 30,
                  decoration: const InputDecoration(labelText: 'Handle'),
                ),
                TextField(
                  controller: displayName,
                  maxLength: 100,
                  decoration: const InputDecoration(labelText: 'Display name'),
                ),
                TextField(
                  controller: bio,
                  maxLength: 2000,
                  minLines: 2,
                  maxLines: 6,
                  decoration: const InputDecoration(labelText: 'Bio'),
                ),
                TextField(
                  controller: locale,
                  decoration: const InputDecoration(labelText: 'Locale'),
                ),
                TextField(
                  controller: timezone,
                  decoration: const InputDecoration(labelText: 'Timezone'),
                ),
              ],
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (displayName.text.trim().isEmpty ||
                  locale.text.trim().isEmpty ||
                  timezone.text.trim().isEmpty) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Display name, locale, and timezone are required.',
                    ),
                  ),
                );
                return;
              }
              try {
                final patch = <String, dynamic>{
                  'display_name': displayName.text.trim(),
                  'bio': bio.text.trim().isEmpty ? null : bio.text.trim(),
                  'locale': locale.text.trim(),
                  'timezone': timezone.text.trim(),
                  if (handle.text.trim().isNotEmpty)
                    'handle': handle.text.trim(),
                };
                await ref.read(accountRepositoryProvider).updateProfile(patch);
                ref.invalidate(accountProvider);
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 200));
    handle.dispose();
    displayName.dispose();
    bio.dispose();
    locale.dispose();
    timezone.dispose();
  }
}

final class SessionsScreen extends ConsumerWidget {
  const SessionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(sessionsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sessions'),
        actions: <Widget>[
          TextButton(
            onPressed: () async {
              await ref.read(authRepositoryProvider).logoutAll();
              ref.read(authControllerProvider.notifier).expire();
            },
            child: const Text('Sign out all'),
          ),
        ],
      ),
      body: LumenAsyncView<List<SessionModel>>(
        value: value,
        onRetry: () => ref.invalidate(sessionsProvider),
        data: (sessions) => sessions.isEmpty
            ? LumenEmptyView(
                title: 'No sessions',
                message: 'The API returned no account sessions.',
                actionLabel: 'Refresh',
                onAction: () => ref.invalidate(sessionsProvider),
                icon: Icons.devices_outlined,
              )
            : ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: sessions.length,
                itemBuilder: (context, index) {
                  final session = sessions[index];
                  return Card(
                    child: ListTile(
                      leading: Icon(
                        session.current
                            ? Icons.devices_rounded
                            : Icons.devices_outlined,
                      ),
                      title: Text(session.deviceLabel),
                      subtitle: Text(
                        session.revoked
                            ? 'Revoked'
                            : session.current
                            ? 'Current session'
                            : 'Active',
                      ),
                      trailing: session.revoked
                          ? null
                          : IconButton(
                              tooltip: 'Revoke session',
                              onPressed: () async {
                                await ref
                                    .read(authRepositoryProvider)
                                    .revokeSession(session.id);
                                if (session.current) {
                                  ref
                                      .read(authControllerProvider.notifier)
                                      .expire();
                                } else {
                                  ref.invalidate(sessionsProvider);
                                }
                              },
                              icon: const Icon(Icons.logout_rounded),
                            ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

final class TotpScreen extends ConsumerStatefulWidget {
  const TotpScreen({super.key});

  @override
  ConsumerState<TotpScreen> createState() => _TotpScreenState();
}

final class _TotpScreenState extends ConsumerState<TotpScreen> {
  final _code = TextEditingController();
  final _password = TextEditingController();
  JsonObject? _setup;
  List<String>? _recoveryCodes;
  String? _message;

  @override
  void dispose() {
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Authenticator app')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: <Widget>[
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Set up TOTP',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              const Text(
                'Generate a secret, add it to your authenticator, then confirm a six-digit code.',
              ),
              const SizedBox(height: 16),
              LumenPrimaryButton(
                label: 'Generate setup secret',
                icon: Icons.key_rounded,
                onPressed: _beginSetup,
              ),
              if (_setup != null) ...<Widget>[
                const SizedBox(height: 16),
                const Text('Secret'),
                SelectableText(
                  requireString(_setup!, 'secret'),
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
                const SizedBox(height: 8),
                const Text('Provisioning URI'),
                SelectableText(requireString(_setup!, 'provisioning_uri')),
                const SizedBox(height: 12),
                TextField(
                  controller: _code,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Six-digit code',
                  ),
                ),
                const SizedBox(height: 12),
                LumenPrimaryButton(
                  label: 'Confirm authenticator',
                  icon: Icons.verified_user_outlined,
                  onPressed: _confirm,
                ),
              ],
              if (_recoveryCodes != null) ...<Widget>[
                const SizedBox(height: 16),
                Text(
                  'Recovery codes — save these now',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                for (final code in _recoveryCodes!)
                  SelectableText(
                    code,
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Disable TOTP',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                autofillHints: const <String>[AutofillHints.password],
                decoration: const InputDecoration(
                  labelText: 'Password (if required)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _code,
                decoration: const InputDecoration(
                  labelText: 'Authenticator or recovery code',
                ),
              ),
              const SizedBox(height: 12),
              LumenSecondaryButton(
                label: 'Disable and revoke sessions',
                icon: Icons.no_accounts_outlined,
                onPressed: _disable,
              ),
            ],
          ),
        ),
        if (_message != null) ...<Widget>[
          const SizedBox(height: 12),
          Text(_message!),
        ],
      ],
    ),
  );

  Future<void> _beginSetup() async {
    try {
      final value = await ref.read(authRepositoryProvider).setupTotp();
      setState(() {
        _setup = value;
        _message = null;
      });
    } on Object catch (error) {
      setState(() => _message = messageFor(error));
    }
  }

  Future<void> _confirm() async {
    if (!RegExp(r'^\d{6}$').hasMatch(_code.text.trim())) {
      setState(() => _message = 'Enter a six-digit code.');
      return;
    }
    try {
      final codes = await ref
          .read(authRepositoryProvider)
          .confirmTotp(_code.text.trim());
      setState(() {
        _recoveryCodes = codes;
        _message = 'TOTP enabled.';
      });
    } on Object catch (error) {
      setState(() => _message = messageFor(error));
    }
  }

  Future<void> _disable() async {
    if (_code.text.trim().length < 6) {
      setState(() => _message = 'Enter an authenticator or recovery code.');
      return;
    }
    try {
      await ref
          .read(authRepositoryProvider)
          .disableTotp(
            code: _code.text.trim(),
            password: _password.text.isEmpty ? null : _password.text,
          );
      ref.read(authControllerProvider.notifier).expire();
    } on Object catch (error) {
      setState(() => _message = messageFor(error));
    }
  }
}
