import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/locale_controller.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
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
    var sectionIndex = 0;

    Widget section({
      required String title,
      required List<Widget> children,
    }) {
      final tile = SyloraStaggeredReveal(
        index: sectionIndex++,
        child: SyloraGlassTile(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(title, style: SyloraTokens.title(18)),
              const SizedBox(height: 12),
              ...children,
            ],
          ),
        ),
      );
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: tile,
      );
    }

    return LumenPage(
      title: l10n.navSettings,
      subtitle: l10n.settingsHeroBody,
      intensity: 0.9,
      showAuraPresence: false,
      auraPresencePreset: SyloraAuraContextPreset.settings,
      child: account.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => LumenErrorView(
          error: error,
          onRetry: () => ref.invalidate(accountProvider),
        ),
        data: (snapshot) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            section(
              title: l10n.settingsSectionAccount,
              children: <Widget>[
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
                            maxLines: 2,
                            softWrap: true,
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
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                    Align(
                  alignment: Alignment.centerLeft,
                  child: SyloraButton(
                    label: l10n.settingsEditProfile,
                    variant: SyloraButtonVariant.secondary,
                    expanded: false,
                    icon: Icons.edit_outlined,
                    onPressed: () =>
                        showEditProfileDialog(context, ref, snapshot.profile),
                  ),
                ),
              ],
            ),
            section(
              title: l10n.settingsSectionPrivacy,
              children: <Widget>[
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
              ],
            ),
            section(
              title: l10n.settingsSectionNotifications,
              children: <Widget>[
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    '${l10n.settingsNotifications} · ${nativePushAvailable ? l10n.settingsPushConfigured : l10n.settingsPushNotConfigured}',
                  ),
                  subtitle: Text(
                    nativePushAvailable
                        ? '${l10n.settingsPushConfiguredBody} ${l10n.settingsNotificationsDescription}'
                        : l10n.settingsPushUnavailableBody,
                    softWrap: true,
                  ),
                  value: notificationsEnabled,
                  onChanged: nativePushAvailable
                      ? (value) => unawaited(
                          _setNotifications(context, ref, value),
                        )
                      : null,
                ),
              ],
            ),
            section(
              title: l10n.settingsSectionSecurity,
              children: <Widget>[
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
                const SizedBox(height: 8),
                LumenSecondaryButton(
                  label: l10n.settingsAuthenticatorApp,
                  icon: Icons.security_outlined,
                  onPressed: () => context.pushNamed('totp'),
                ),
              ],
            ),
            section(
              title: l10n.settingsSectionAppearance,
              children: <Widget>[
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
              ],
            ),
            section(
              title: l10n.settingsSectionLanguage,
              children: <Widget>[
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
              ],
            ),
            section(
              title: l10n.settingsSectionAccessibility,
              children: <Widget>[
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
            section(
              title: l10n.settingsSectionDevices,
              children: <Widget>[
                LumenSecondaryButton(
                  label: l10n.settingsSessions,
                  icon: Icons.devices_outlined,
                  onPressed: () => context.pushNamed('sessions'),
                ),
              ],
            ),
            section(
              title: l10n.settingsSectionLive,
              children: <Widget>[
                Text(
                  l10n.settingsLiveBody,
                  style: SyloraTokens.body(14, color: SyloraTokens.inkSoft),
                  softWrap: true,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    LumenSecondaryButton(
                      label: l10n.settingsOpenMedia,
                      icon: Icons.tune_rounded,
                      onPressed: () => context.goNamed('media-settings'),
                    ),
                    LumenSecondaryButton(
                      label: l10n.settingsOpenStudio,
                      icon: Icons.video_camera_front_outlined,
                      onPressed: () => context.goNamed('creator-studio'),
                    ),
                  ],
                ),
              ],
            ),
            section(
              title: l10n.settingsSafetyTitle,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    const Icon(Icons.health_and_safety_outlined),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l10n.settingsSectionSafety,
                        style: SyloraTokens.title(16),
                        softWrap: true,
                      ),
                    ),
                    LumenBadge(label: l10n.settingsSafetyProtected),
                  ],
                ),
                const SizedBox(height: 12),
                Text(l10n.settingsSafetyBody, softWrap: true),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.flag_outlined),
                  title: Text(l10n.settingsSafetyReportingTitle),
                  subtitle: Text(
                    l10n.settingsSafetyReportingBody,
                    softWrap: true,
                  ),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.gavel_outlined),
                  title: Text(l10n.settingsSafetyAppealsTitle),
                  subtitle: Text(
                    l10n.settingsSafetyAppealsBody,
                    softWrap: true,
                  ),
                ),
                Text(
                  l10n.settingsSafetyEmergency,
                  style: SyloraTokens.body(13, color: SyloraTokens.inkMute),
                  softWrap: true,
                ),
              ],
            ),
            LumenPrimaryButton(
              label: l10n.settingsSignOut,
              icon: Icons.logout_rounded,
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).logout(),
            ),
          ],
        ),
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(localizedMessageFor(context, error))),
        );
      }
    }
  }
}

Future<void> showEditProfileDialog(
  BuildContext context,
  WidgetRef ref,
  ProfileModel profile,
) async {
  final l10n = AppLocalizations.of(context);
  final handle = TextEditingController(text: profile.handle);
  final displayName = TextEditingController(text: profile.displayName);
  final bio = TextEditingController(text: profile.bio);
  final locale = TextEditingController(text: profile.locale);
  final timezone = TextEditingController(text: profile.timezone);
  final maxWidth = MediaQuery.sizeOf(context).width;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(l10n.settingsEditProfile),
      content: SizedBox(
        width: maxWidth < 560 ? maxWidth - 48 : 540,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: handle,
                maxLength: 30,
                decoration: InputDecoration(labelText: l10n.settingsHandle),
              ),
              TextField(
                controller: displayName,
                maxLength: 100,
                decoration: InputDecoration(
                  labelText: l10n.settingsDisplayName,
                ),
              ),
              TextField(
                controller: bio,
                maxLength: 2000,
                minLines: 2,
                maxLines: 6,
                decoration: InputDecoration(labelText: l10n.settingsBio),
              ),
              TextField(
                controller: locale,
                decoration: InputDecoration(labelText: l10n.settingsLocale),
              ),
              TextField(
                controller: timezone,
                decoration: InputDecoration(labelText: l10n.settingsTimezone),
              ),
            ],
          ),
        ),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: Text(l10n.commonCancel),
        ),
        FilledButton(
          onPressed: () async {
            if (displayName.text.trim().isEmpty ||
                locale.text.trim().isEmpty ||
                timezone.text.trim().isEmpty) {
              ScaffoldMessenger.of(dialogContext).showSnackBar(
                SnackBar(content: Text(l10n.settingsProfileRequired)),
              );
              return;
            }
            try {
              final patch = <String, dynamic>{
                'display_name': displayName.text.trim(),
                'bio': bio.text.trim().isEmpty ? null : bio.text.trim(),
                'locale': locale.text.trim(),
                'timezone': timezone.text.trim(),
                if (handle.text.trim().isNotEmpty) 'handle': handle.text.trim(),
              };
              await ref.read(accountRepositoryProvider).updateProfile(patch);
              ref.invalidate(accountProvider);
              if (dialogContext.mounted) {
                Navigator.pop(dialogContext);
              }
            } on Object catch (error) {
              if (dialogContext.mounted) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  SnackBar(
                    content: Text(localizedMessageFor(dialogContext, error)),
                  ),
                );
              }
            }
          },
          child: Text(l10n.commonSave),
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

final class SessionsScreen extends ConsumerWidget {
  const SessionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(sessionsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settingsSessionsTitle),
        actions: <Widget>[
          TextButton(
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logoutAll();
            },
            child: Text(l10n.settingsSignOutAll),
          ),
        ],
      ),
      body: LumenAsyncView<List<SessionModel>>(
        value: value,
        onRetry: () => ref.invalidate(sessionsProvider),
        data: (sessions) => sessions.isEmpty
            ? LumenEmptyView(
                title: l10n.settingsNoSessionsTitle,
                message: l10n.settingsNoSessionsBody,
                actionLabel: l10n.commonRefresh,
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
                      title: Text(
                        session.deviceLabel,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        softWrap: true,
                      ),
                      subtitle: Text(
                        session.revoked
                            ? l10n.settingsSessionRevoked
                            : session.current
                            ? l10n.settingsSessionCurrent
                            : l10n.settingsSessionActive,
                      ),
                      trailing: session.revoked
                          ? null
                          : IconButton(
                              tooltip: l10n.settingsRevokeSession,
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
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.settingsTotpTitle)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: <Widget>[
          LumenSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(
                  l10n.settingsTotpSetupTitle,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(l10n.settingsTotpSetupBody, softWrap: true),
                const SizedBox(height: 16),
                LumenPrimaryButton(
                  label: l10n.settingsTotpGenerate,
                  icon: Icons.key_rounded,
                  onPressed: _beginSetup,
                ),
                if (_setup != null) ...<Widget>[
                  const SizedBox(height: 16),
                  Text(l10n.settingsTotpSecret),
                  SelectableText(
                    requireString(_setup!, 'secret'),
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                  const SizedBox(height: 8),
                  Text(l10n.settingsTotpUri),
                  SelectableText(requireString(_setup!, 'provisioning_uri')),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: l10n.settingsTotpCode,
                    ),
                  ),
                  const SizedBox(height: 12),
                  LumenPrimaryButton(
                    label: l10n.settingsTotpConfirm,
                    icon: Icons.verified_user_outlined,
                    onPressed: _confirm,
                  ),
                ],
                if (_recoveryCodes != null) ...<Widget>[
                  const SizedBox(height: 16),
                  Text(
                    l10n.settingsTotpRecoveryTitle,
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
                  l10n.settingsTotpDisableTitle,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  autofillHints: const <String>[AutofillHints.password],
                  decoration: InputDecoration(
                    labelText: l10n.settingsTotpPassword,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _code,
                  decoration: InputDecoration(
                    labelText: l10n.settingsTotpOrRecovery,
                  ),
                ),
                const SizedBox(height: 12),
                LumenSecondaryButton(
                  label: l10n.settingsTotpDisableAction,
                  icon: Icons.no_accounts_outlined,
                  onPressed: _disable,
                ),
              ],
            ),
          ),
          if (_message != null) ...<Widget>[
            const SizedBox(height: 12),
            Text(_message!, softWrap: true),
          ],
        ],
      ),
    );
  }

  Future<void> _beginSetup() async {
    try {
      final value = await ref.read(authRepositoryProvider).setupTotp();
      setState(() {
        _setup = value;
        _message = null;
      });
    } on Object catch (error) {
      setState(() => _message = localizedMessageFor(context, error));
    }
  }

  Future<void> _confirm() async {
    final l10n = AppLocalizations.of(context);
    if (!RegExp(r'^\d{6}$').hasMatch(_code.text.trim())) {
      setState(() => _message = l10n.settingsTotpEnterSix);
      return;
    }
    try {
      final codes = await ref
          .read(authRepositoryProvider)
          .confirmTotp(_code.text.trim());
      setState(() {
        _recoveryCodes = codes;
        _message = l10n.settingsTotpEnabled;
      });
    } on Object catch (error) {
      setState(() => _message = localizedMessageFor(context, error));
    }
  }

  Future<void> _disable() async {
    final l10n = AppLocalizations.of(context);
    if (_code.text.trim().length < 6) {
      setState(() => _message = l10n.settingsTotpEnterRecovery);
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
      setState(() => _message = localizedMessageFor(context, error));
    }
  }
}
