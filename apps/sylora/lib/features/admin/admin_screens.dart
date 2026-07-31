import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import 'admin_repository.dart';

@immutable
final class _AdminSnapshot {
  const _AdminSnapshot({
    required this.users,
    required this.flags,
    required this.settings,
    required this.audit,
    required this.analytics,
    required this.health,
    required this.security,
  });

  final CursorPage<AdminUser> users;
  final List<FeatureFlag> flags;
  final List<PlatformSetting> settings;
  final CursorPage<AdminResource> audit;
  final AdminDashboard analytics;
  final List<AdminResource> health;
  final AdminDashboard security;
}

final _adminProvider = FutureProvider.autoDispose<_AdminSnapshot>((ref) async {
  final repository = ref.watch(adminRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.users(),
    repository.featureFlags(),
    repository.settings(),
    repository.audit(),
    repository.analytics(),
    repository.serviceHealth(),
    repository.security(),
  ]);
  return _AdminSnapshot(
    users: values[0] as CursorPage<AdminUser>,
    flags: values[1] as List<FeatureFlag>,
    settings: values[2] as List<PlatformSetting>,
    audit: values[3] as CursorPage<AdminResource>,
    analytics: values[4] as AdminDashboard,
    health: values[5] as List<AdminResource>,
    security: values[6] as AdminDashboard,
  );
});

final class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => LumenPage(
    title: 'Administration',
    subtitle:
        'Role-gated platform operations backed by persisted admin records.',
    child: LumenAsyncView<_AdminSnapshot>(
      value: ref.watch(_adminProvider),
      onRetry: () => ref.invalidate(_adminProvider),
      data: (snapshot) => DefaultTabController(
        length: 6,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const TabBar(
              isScrollable: true,
              tabs: <Tab>[
                Tab(text: 'Analytics'),
                Tab(text: 'Users'),
                Tab(text: 'Feature flags'),
                Tab(text: 'Settings'),
                Tab(text: 'Audit'),
                Tab(text: 'Health & security'),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 760,
              child: TabBarView(
                children: <Widget>[
                  _DashboardView(dashboard: snapshot.analytics),
                  _AdminUsersView(initialPage: snapshot.users),
                  _FeatureFlagsView(
                    flags: snapshot.flags,
                    onChanged: () => ref.invalidate(_adminProvider),
                  ),
                  _PlatformSettingsView(
                    settings: snapshot.settings,
                    onChanged: () => ref.invalidate(_adminProvider),
                  ),
                  _AuditView(initialPage: snapshot.audit),
                  _HealthSecurityView(
                    health: snapshot.health,
                    security: snapshot.security,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

final class _DashboardView extends StatelessWidget {
  const _DashboardView({required this.dashboard});

  final AdminDashboard dashboard;

  @override
  Widget build(BuildContext context) => ListView(
    children: <Widget>[
      if (dashboard.basis != null) Text('Basis: ${dashboard.basis}'),
      for (final section in dashboard.sections.entries)
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                _humanize(section.key),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: <Widget>[
                  for (final metric in section.value.entries)
                    SizedBox(
                      width: 180,
                      child: Text('${_humanize(metric.key)}\n${metric.value}'),
                    ),
                ],
              ),
            ],
          ),
        ),
    ],
  );
}

final class _AdminUsersView extends ConsumerStatefulWidget {
  const _AdminUsersView({required this.initialPage});

  final CursorPage<AdminUser> initialPage;

  @override
  ConsumerState<_AdminUsersView> createState() => _AdminUsersViewState();
}

final class _AdminUsersViewState extends ConsumerState<_AdminUsersView> {
  final _search = TextEditingController();
  late List<AdminUser> _items = widget.initialPage.items.toList();
  late String? _cursor = widget.initialPage.nextCursor;
  String? _status;
  bool _busy = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      Wrap(
        spacing: 10,
        runSpacing: 10,
        children: <Widget>[
          SizedBox(
            width: 280,
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                labelText: 'Search users',
                prefixIcon: Icon(Icons.search_rounded),
              ),
              onSubmitted: (_) => _reload(),
            ),
          ),
          SizedBox(
            width: 180,
            child: DropdownButtonFormField<String?>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: const <DropdownMenuItem<String?>>[
                DropdownMenuItem(value: null, child: Text('All')),
                DropdownMenuItem(value: 'active', child: Text('Active')),
                DropdownMenuItem(value: 'suspended', child: Text('Suspended')),
                DropdownMenuItem(
                  value: 'pending_verification',
                  child: Text('Pending verification'),
                ),
              ],
              onChanged: (value) {
                setState(() => _status = value);
                _reload();
              },
            ),
          ),
          FilledButton.icon(
            onPressed: _busy ? null : _reload,
            icon: const Icon(Icons.tune_rounded),
            label: const Text('Apply'),
          ),
        ],
      ),
      const SizedBox(height: 12),
      Expanded(
        child: _items.isEmpty
            ? LumenEmptyView(
                title: 'No admin users',
                message: 'The user API returned no matching accounts.',
                actionLabel: 'Clear filters',
                onAction: _clear,
                icon: Icons.manage_accounts_outlined,
              )
            : ListView(
                children: <Widget>[
                  for (final user in _items)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.person_outline_rounded),
                        title: Text(user.displayName ?? user.email),
                        subtitle: Text(
                          '${user.email} • ${user.roles.join(', ')}',
                        ),
                        trailing: LumenBadge(label: user.status),
                        onTap: () => context.pushNamed(
                          'admin-user',
                          pathParameters: <String, String>{'id': user.id},
                        ),
                      ),
                    ),
                  if (_cursor != null)
                    Center(
                      child: TextButton.icon(
                        onPressed: _busy ? null : _loadMore,
                        icon: const Icon(Icons.expand_more_rounded),
                        label: const Text('Load more'),
                      ),
                    ),
                ],
              ),
      ),
    ],
  );

  Future<void> _clear() async {
    _search.clear();
    setState(() => _status = null);
    await _reload();
  }

  Future<void> _reload() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(adminRepositoryProvider)
          .users(query: _blank(_search.text), status: _status);
      if (mounted) {
        setState(() {
          _items = page.items.toList();
          _cursor = page.nextCursor;
        });
      }
    } on Object catch (error) {
      _show(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _loadMore() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(adminRepositoryProvider)
          .users(query: _blank(_search.text), status: _status, cursor: _cursor);
      if (mounted) {
        setState(() {
          _items.addAll(page.items);
          _cursor = page.nextCursor;
        });
      }
    } on Object catch (error) {
      _show(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _show(Object error) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(messageFor(error))));
    }
  }
}

final class AdminUserScreen extends ConsumerStatefulWidget {
  const AdminUserScreen({required this.userId, super.key});

  final String userId;

  @override
  ConsumerState<AdminUserScreen> createState() => _AdminUserScreenState();
}

final class _AdminUserScreenState extends ConsumerState<AdminUserScreen> {
  late Future<JsonObject> _future = ref
      .read(adminRepositoryProvider)
      .user(widget.userId);
  String? _message;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Admin user detail')),
    body: FutureBuilder<JsonObject>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(error: snapshot.error!, onRetry: _reload);
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final json = snapshot.data!;
        final user = AdminUser.fromJson(json);
        final sessions = requireList(json, 'sessions');
        final memberships = requireList(json, 'workspace_memberships');
        final actions = requireList(json, 'administration_actions');
        return ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          user.displayName ?? user.email,
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                      LumenBadge(label: user.status),
                    ],
                  ),
                  SelectableText(user.email),
                  Text('Roles: ${user.roles.join(', ')}'),
                  Text(
                    'Created ${DateFormat.yMMMd().format(user.createdAt.toLocal())}',
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    children: <Widget>[
                      LumenSecondaryButton(
                        label: 'Suspend',
                        onPressed: user.status == 'active'
                            ? () => _action('suspend')
                            : null,
                        disabledReason:
                            'Only active accounts can be suspended.',
                        icon: Icons.block_rounded,
                      ),
                      LumenSecondaryButton(
                        label: 'Restore',
                        onPressed: user.status == 'suspended'
                            ? () => _action('restore')
                            : null,
                        disabledReason:
                            'Only suspended accounts can be restored.',
                        icon: Icons.restore_rounded,
                      ),
                    ],
                  ),
                  if (_message != null) ...<Widget>[
                    const SizedBox(height: 10),
                    Text(_message!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            _CountCard(label: 'Sessions', count: sessions.length),
            _CountCard(
              label: 'Workspace memberships',
              count: memberships.length,
            ),
            _CountCard(label: 'Administration actions', count: actions.length),
          ],
        );
      },
    ),
  );

  void _reload() => setState(
    () => _future = ref.read(adminRepositoryProvider).user(widget.userId),
  );

  Future<void> _action(String action) async {
    final controller = TextEditingController();
    final form = GlobalKey<FormState>();
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('${action == 'suspend' ? 'Suspend' : 'Restore'} account'),
        content: Form(
          key: form,
          child: TextFormField(
            controller: controller,
            maxLength: 1000,
            decoration: const InputDecoration(labelText: 'Reason'),
            validator: (value) => (value?.trim().length ?? 0) < 5
                ? 'Enter at least 5 characters.'
                : null,
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (form.currentState!.validate()) {
                Navigator.pop(dialogContext, controller.text.trim());
              }
            },
            child: Text(action == 'suspend' ? 'Suspend' : 'Restore'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null) {
      return;
    }
    try {
      final repository = ref.read(adminRepositoryProvider);
      if (action == 'suspend') {
        await repository.suspendUser(widget.userId, reason);
      } else {
        await repository.restoreUser(widget.userId, reason);
      }
      _reload();
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    }
  }
}

final class _CountCard extends StatelessWidget {
  const _CountCard({required this.label, required this.count});

  final String label;
  final int count;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      title: Text(label),
      trailing: Text(
        '$count',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
    ),
  );
}

final class _FeatureFlagsView extends ConsumerWidget {
  const _FeatureFlagsView({required this.flags, required this.onChanged});

  final List<FeatureFlag> flags;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) => ListView(
    children: <Widget>[
      Align(
        alignment: Alignment.centerRight,
        child: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add_rounded),
          label: const Text('New flag'),
        ),
      ),
      if (flags.isEmpty)
        const Padding(
          padding: EdgeInsets.all(20),
          child: Text('The feature flag API returned no flags.'),
        )
      else
        for (final flag in flags)
          Card(
            child: ListTile(
              title: Text(flag.key),
              subtitle: Text(
                '${flag.rolloutBps / 100}% • ${flag.environments.join(', ')} '
                '• version ${flag.version}',
              ),
              leading: Switch(
                value: flag.enabled,
                onChanged: (value) => _toggle(context, ref, flag, value),
              ),
              trailing: TextButton(
                onPressed: () => _evaluate(context, ref, flag),
                child: const Text('Evaluate'),
              ),
            ),
          ),
    ],
  );

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final key = TextEditingController();
    final form = GlobalKey<FormState>();
    var environment = 'production';
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create feature flag'),
          content: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  controller: key,
                  decoration: const InputDecoration(labelText: 'Flag key'),
                  validator: (value) =>
                      RegExp(
                        r'^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$',
                      ).hasMatch(value?.trim() ?? '')
                      ? null
                      : 'Enter a lowercase setting key.',
                ),
                DropdownButtonFormField<String>(
                  initialValue: environment,
                  decoration: const InputDecoration(labelText: 'Environment'),
                  items: const <DropdownMenuItem<String>>[
                    DropdownMenuItem(
                      value: 'development',
                      child: Text('Development'),
                    ),
                    DropdownMenuItem(value: 'test', child: Text('Test')),
                    DropdownMenuItem(value: 'staging', child: Text('Staging')),
                    DropdownMenuItem(
                      value: 'production',
                      child: Text('Production'),
                    ),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => environment = value ?? environment),
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) {
                  return;
                }
                try {
                  await ref.read(adminRepositoryProvider).createFeatureFlag(
                    <String, dynamic>{
                      'key': key.text.trim(),
                      'environments': <String>[environment],
                      'enabled': false,
                      'rollout_bps': 0,
                      'allow_subjects': <String>[],
                      'deny_subjects': <String>[],
                    },
                  );
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, true);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    ScaffoldMessenger.of(
                      dialogContext,
                    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
    key.dispose();
    if (result ?? false) {
      onChanged();
    }
  }

  Future<void> _toggle(
    BuildContext context,
    WidgetRef ref,
    FeatureFlag flag,
    bool enabled,
  ) async {
    try {
      await ref.read(adminRepositoryProvider).updateFeatureFlag(
        flag.key,
        <String, dynamic>{'expected_version': flag.version, 'enabled': enabled},
      );
      onChanged();
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  Future<void> _evaluate(
    BuildContext context,
    WidgetRef ref,
    FeatureFlag flag,
  ) async {
    final subject = TextEditingController();
    var environment = flag.environments.firstOrNull ?? 'production';
    final result = await showDialog<JsonObject>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Evaluate ${flag.key}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextField(
                controller: subject,
                decoration: const InputDecoration(labelText: 'Subject'),
              ),
              DropdownButtonFormField<String>(
                initialValue: environment,
                decoration: const InputDecoration(labelText: 'Environment'),
                items: const <DropdownMenuItem<String>>[
                  DropdownMenuItem(
                    value: 'development',
                    child: Text('Development'),
                  ),
                  DropdownMenuItem(value: 'test', child: Text('Test')),
                  DropdownMenuItem(value: 'staging', child: Text('Staging')),
                  DropdownMenuItem(
                    value: 'production',
                    child: Text('Production'),
                  ),
                ],
                onChanged: (value) =>
                    setDialogState(() => environment = value ?? environment),
              ),
            ],
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (subject.text.trim().isEmpty) {
                  return;
                }
                try {
                  final response = await ref
                      .read(adminRepositoryProvider)
                      .evaluateFeatureFlag(
                        flag.key,
                        subject: subject.text.trim(),
                        environment: environment,
                      );
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, response);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    ScaffoldMessenger.of(
                      dialogContext,
                    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                  }
                }
              },
              child: const Text('Evaluate'),
            ),
          ],
        ),
      ),
    );
    subject.dispose();
    if (result != null && context.mounted) {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Feature flag result'),
          content: Text(
            '${result['enabled'] == true ? 'Enabled' : 'Disabled'}\n'
            'Reason: ${result['reason']}\nBucket: ${result['bucket']}',
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }
}

final class _PlatformSettingsView extends ConsumerWidget {
  const _PlatformSettingsView({
    required this.settings,
    required this.onChanged,
  });

  final List<PlatformSetting> settings;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) => settings.isEmpty
      ? LumenEmptyView(
          title: 'No platform settings',
          message: 'The settings API returned no configuration records.',
          actionLabel: 'Reload',
          onAction: onChanged,
          icon: Icons.settings_outlined,
        )
      : ListView(
          children: <Widget>[
            for (final setting in settings)
              Card(
                child: ListTile(
                  leading: Icon(
                    setting.secret
                        ? Icons.lock_outline_rounded
                        : Icons.settings_outlined,
                  ),
                  title: Text(setting.key),
                  subtitle: Text(
                    setting.secret
                        ? setting.configured
                              ? 'Secret configured • value hidden'
                              : 'Secret not configured • value hidden'
                        : 'Version ${setting.version} • '
                              '${setting.value?.entries.map((entry) => '${entry.key}=${entry.value}').join(', ') ?? 'no value'}',
                  ),
                  trailing: TextButton(
                    onPressed: () => _update(context, ref, setting),
                    child: const Text('Update'),
                  ),
                ),
              ),
          ],
        );

  Future<void> _update(
    BuildContext context,
    WidgetRef ref,
    PlatformSetting setting,
  ) async {
    final valueKey = TextEditingController();
    final value = TextEditingController();
    final form = GlobalKey<FormState>();
    final updated = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Update ${setting.key}'),
        content: Form(
          key: form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (setting.secret)
                const Text(
                  'The existing secret is never returned. Submitting replaces it.',
                ),
              TextFormField(
                controller: valueKey,
                decoration: const InputDecoration(labelText: 'Value field key'),
                validator: _required,
              ),
              TextFormField(
                controller: value,
                obscureText: setting.secret,
                decoration: InputDecoration(
                  labelText: setting.secret ? 'New secret value' : 'Value',
                ),
                validator: _required,
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!form.currentState!.validate()) {
                return;
              }
              try {
                await ref
                    .read(adminRepositoryProvider)
                    .updateSetting(
                      setting.key,
                      value: <String, dynamic>{
                        valueKey.text.trim(): value.text,
                      },
                      secret: setting.secret,
                      expectedVersion: setting.version,
                    );
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
    valueKey.dispose();
    value.dispose();
    if (updated ?? false) {
      onChanged();
    }
  }
}

final class _AuditView extends ConsumerStatefulWidget {
  const _AuditView({required this.initialPage});

  final CursorPage<AdminResource> initialPage;

  @override
  ConsumerState<_AuditView> createState() => _AuditViewState();
}

final class _AuditViewState extends ConsumerState<_AuditView> {
  final _action = TextEditingController();
  final _workspaceId = TextEditingController();
  late List<AdminResource> _items = widget.initialPage.items.toList();
  late String? _cursor = widget.initialPage.nextCursor;
  bool _busy = false;

  @override
  void dispose() {
    _action.dispose();
    _workspaceId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      Wrap(
        spacing: 10,
        runSpacing: 10,
        children: <Widget>[
          SizedBox(
            width: 220,
            child: TextField(
              controller: _action,
              decoration: const InputDecoration(labelText: 'Action filter'),
            ),
          ),
          SizedBox(
            width: 260,
            child: TextField(
              controller: _workspaceId,
              decoration: const InputDecoration(labelText: 'Workspace ID'),
            ),
          ),
          FilledButton(
            onPressed: _busy ? null : _reload,
            child: const Text('Apply'),
          ),
        ],
      ),
      const SizedBox(height: 12),
      Expanded(
        child: _items.isEmpty
            ? LumenEmptyView(
                title: 'No audit events',
                message: 'The audit API returned no matching persisted events.',
                actionLabel: 'Clear filters',
                onAction: _clear,
                icon: Icons.history_rounded,
              )
            : ListView(
                children: <Widget>[
                  for (final item in _items)
                    Card(
                      child: ListTile(
                        title: Text(item.label),
                        subtitle: Text(
                          item.summary.entries
                              .take(5)
                              .map((entry) => '${entry.key}: ${entry.value}')
                              .join(' • '),
                        ),
                        leading: item.status == null
                            ? const Icon(Icons.history_rounded)
                            : LumenBadge(label: item.status!),
                      ),
                    ),
                  if (_cursor != null)
                    Center(
                      child: TextButton.icon(
                        onPressed: _busy ? null : _loadMore,
                        icon: const Icon(Icons.expand_more_rounded),
                        label: const Text('Load more'),
                      ),
                    ),
                ],
              ),
      ),
    ],
  );

  Future<void> _clear() async {
    _action.clear();
    _workspaceId.clear();
    await _reload();
  }

  Future<void> _reload() => _fetch(cursor: null, append: false);

  Future<void> _loadMore() => _fetch(cursor: _cursor, append: true);

  Future<void> _fetch({required String? cursor, required bool append}) async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(adminRepositoryProvider)
          .audit(
            action: _blank(_action.text),
            workspaceId: _blank(_workspaceId.text),
            cursor: cursor,
          );
      if (mounted) {
        setState(() {
          if (!append) {
            _items = page.items.toList();
          } else {
            _items.addAll(page.items);
          }
          _cursor = page.nextCursor;
        });
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class _HealthSecurityView extends StatelessWidget {
  const _HealthSecurityView({required this.health, required this.security});

  final List<AdminResource> health;
  final AdminDashboard security;

  @override
  Widget build(BuildContext context) => ListView(
    children: <Widget>[
      Text('Service health', style: Theme.of(context).textTheme.headlineSmall),
      if (health.isEmpty)
        const Text(
          'No application-submitted health reports are available. This endpoint is not a Prometheus replacement.',
        )
      else
        for (final report in health)
          Card(
            child: ListTile(
              title: Text(report.label),
              subtitle: Text(
                report.summary.entries
                    .take(4)
                    .map((entry) => '${entry.key}: ${entry.value}')
                    .join(' • '),
              ),
              trailing: report.status == null
                  ? null
                  : LumenBadge(label: report.status!),
            ),
          ),
      const SizedBox(height: 20),
      Text(
        'Security dashboard',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
      _DashboardView(dashboard: security),
    ],
  );
}

String _humanize(String value) => value
    .replaceAll('_', ' ')
    .split(' ')
    .map((word) {
      if (word.isEmpty) {
        return word;
      }
      return '${word[0].toUpperCase()}${word.substring(1)}';
    })
    .join(' ');

String? _blank(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String? _required(String? value) =>
    value?.trim().isEmpty ?? true ? 'This field is required.' : null;
