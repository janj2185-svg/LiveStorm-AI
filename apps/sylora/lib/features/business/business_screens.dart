import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';
import '../platform/platform_screens.dart';
import 'business_repository.dart';

final _workspacesProvider = FutureProvider.autoDispose<List<Workspace>>(
  (ref) => ref.watch(businessRepositoryProvider).workspaces(),
);

final class BusinessScreen extends ConsumerWidget {
  const BusinessScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => LumenPage(
    title: 'Workspaces',
    subtitle:
        'Select a tenant before opening CRM, operations, documents, or finance.',
    showAuraPresence: false,
    auraPresencePreset: SyloraAuraContextPreset.business,
    header: SyloraUniverseHero(
      eyebrow: 'BUSINESS',
      title: 'Workspace hub',
      body:
          'CRM, operations, documents, and finance — with Aura as your business co-pilot.',
      trailing: SyloraPortalChip(
        label: 'Aura Business',
        icon: Icons.auto_awesome_rounded,
        onTap: () => openAuraConversation(
          context,
          ref,
          purpose: 'business_copilot',
          title: 'Business Copilot',
        ),
      ),
    ),
    actions: <Widget>[
      IconButton(
        tooltip: 'Create workspace',
        onPressed: () => _createWorkspace(context, ref),
        icon: const Icon(Icons.add_business_rounded),
      ),
    ],
    child: LumenAsyncView<List<Workspace>>(
      value: ref.watch(_workspacesProvider),
      onRetry: () => ref.invalidate(_workspacesProvider),
      data: (workspaces) => workspaces.isEmpty
          ? SyloraStaggeredReveal(
              index: 0,
              child: SyloraGlass(
                radius: SyloraTokens.radiusXl,
                padding: const EdgeInsets.fromLTRB(22, 26, 22, 24),
                child: Column(
                  children: <Widget>[
                    SyloraPulseGlow(
                      color: SyloraTokens.petal,
                      child: SyloraAura(
                        size: 112,
                        emotion: AuraEmotion.listening,
                        label: 'Aura',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No workspaces yet',
                      style: SyloraTokens.display(28),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Create a tenant workspace for CRM, ops, and finance — or ask Aura as your business co-pilot.',
                      style: SyloraTokens.body(15, color: SyloraTokens.inkSoft),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 18),
                    SyloraButton(
                      label: 'Create workspace',
                      icon: Icons.add_business_rounded,
                      onPressed: () => _createWorkspace(context, ref),
                    ),
                    const SizedBox(height: 10),
                    SyloraPortalChip(
                      label: 'Talk to Aura Business',
                      icon: Icons.auto_awesome_rounded,
                      onTap: () => openAuraConversation(
                        context,
                        ref,
                        purpose: 'business_copilot',
                        title: 'Business Copilot',
                      ),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: <Widget>[
                for (var i = 0; i < workspaces.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SyloraStaggeredReveal(
                      index: i,
                      child: SyloraGlassTile(
                        onTap: () =>
                            _openWorkspace(context, ref, workspaces[i]),
                        child: Row(
                          children: <Widget>[
                            const Icon(
                              Icons.business_outlined,
                              color: SyloraTokens.violet,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    workspaces[i].name,
                                    style: SyloraTokens.title(16),
                                  ),
                                  Text(
                                    '/${workspaces[i].slug} • ${workspaces[i].type} • ${workspaces[i].currency}',
                                    style: SyloraTokens.body(
                                      13,
                                      color: SyloraTokens.inkMute,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            LumenBadge(label: workspaces[i].status),
                            const Icon(Icons.chevron_right_rounded),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
    ),
  );

  Future<void> _openWorkspace(
    BuildContext context,
    WidgetRef ref,
    Workspace workspace,
  ) async {
    try {
      await ref.read(businessRepositoryProvider).switchWorkspace(workspace.id);
      if (context.mounted) {
        await context.pushNamed(
          'business-workspace',
          pathParameters: <String, String>{'workspaceId': workspace.id},
        );
      }
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }

  Future<void> _createWorkspace(BuildContext context, WidgetRef ref) async {
    final values = await showBusinessForm(
      context,
      'Create workspace',
      const <BusinessFormField>[
        BusinessFormField('slug', 'Slug', validator: _slugValidator),
        BusinessFormField('name', 'Name', validator: _required),
        BusinessFormField(
          'type',
          'Type (company, agency, team)',
          initial: 'company',
          validator: _workspaceType,
        ),
        BusinessFormField('locale', 'Locale', initial: 'en'),
        BusinessFormField('timezone', 'Timezone', initial: 'UTC'),
        BusinessFormField(
          'currency',
          'Currency',
          initial: 'USD',
          validator: _currency,
        ),
      ],
    );
    if (values == null) {
      return;
    }
    try {
      await ref.read(businessRepositoryProvider).createWorkspace(
        <String, dynamic>{...values, 'settings': <String, dynamic>{}},
      );
      ref.invalidate(_workspacesProvider);
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(messageFor(error))));
      }
    }
  }
}

final class BusinessWorkspaceScreen extends ConsumerStatefulWidget {
  const BusinessWorkspaceScreen({required this.workspaceId, super.key});

  final String workspaceId;

  @override
  ConsumerState<BusinessWorkspaceScreen> createState() =>
      _BusinessWorkspaceScreenState();
}

final class _BusinessWorkspaceScreenState
    extends ConsumerState<BusinessWorkspaceScreen> {
  late Future<WorkspaceContext> _future = ref
      .read(businessRepositoryProvider)
      .switchWorkspace(widget.workspaceId);

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Workspace',
    subtitle: 'Tenant overview, permissions, and operational areas.',
    showAuraPresence: false,
    auraPresencePreset: SyloraAuraContextPreset.business,
    maxContentWidth: 1120,
    actions: <Widget>[
      IconButton(
        tooltip: 'Aura Business',
        onPressed: () => openAuraConversation(
          context,
          ref,
          purpose: 'business_copilot',
          title: 'Business Copilot',
        ),
        icon: const Icon(Icons.auto_awesome_rounded),
      ),
    ],
    child: FutureBuilder<WorkspaceContext>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(
            error: snapshot.error!,
            onRetry: () => setState(
              () => _future = ref
                  .read(businessRepositoryProvider)
                  .switchWorkspace(widget.workspaceId),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final workspace = snapshot.data!;
        const areas = <(String, String, IconData)>[
          ('people', 'Members, invitations & teams', Icons.groups_outlined),
          ('crm', 'CRM', Icons.handshake_outlined),
          ('tasks', 'Tasks', Icons.task_alt_outlined),
          ('calendar', 'Calendar', Icons.calendar_month_outlined),
          ('documents', 'Documents', Icons.folder_outlined),
          ('finance', 'Finance', Icons.account_balance_outlined),
        ];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    workspace.workspace.name,
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  Text(
                    '${workspace.role} • ${workspace.workspace.timezone} • '
                    '${workspace.workspace.currency}',
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: <Widget>[
                      for (final permission
                          in workspace.permissions.entries
                              .where((entry) => entry.value)
                              .take(12))
                        LumenBadge(label: permission.key),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _WorkspaceModuleNavigation(
              workspaceId: widget.workspaceId,
              currentArea: 'workspace',
            ),
            const SizedBox(height: 16),
            for (final (area, label, icon) in areas)
              Card(
                child: ListTile(
                  leading: Icon(icon),
                  title: Text(label),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.pushNamed(
                    'business-area',
                    pathParameters: <String, String>{
                      'workspaceId': widget.workspaceId,
                      'area': area,
                    },
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}

@immutable
final class _BusinessAreaData {
  const _BusinessAreaData({
    required this.sections,
    this.nextCursors = const <String, String?>{},
    this.report,
  });

  final Map<String, List<BusinessResource>> sections;
  final Map<String, String?> nextCursors;
  final FinanceReport? report;
}

final class BusinessAreaScreen extends ConsumerStatefulWidget {
  const BusinessAreaScreen({
    required this.workspaceId,
    required this.area,
    super.key,
  });

  final String workspaceId;
  final String area;

  @override
  ConsumerState<BusinessAreaScreen> createState() => _BusinessAreaScreenState();
}

final class _BusinessAreaScreenState extends ConsumerState<BusinessAreaScreen> {
  late Future<_BusinessAreaData> _future = _load();
  bool _integrationBusy = false;
  String? _integrationMessage;

  @override
  void didUpdateWidget(covariant BusinessAreaScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.workspaceId != widget.workspaceId ||
        oldWidget.area != widget.area) {
      _integrationMessage = null;
      _future = _load();
    }
  }

  Future<_BusinessAreaData> _load() async {
    final repository = ref.read(businessRepositoryProvider);
    switch (widget.area) {
      case 'people':
        final values = await Future.wait<List<BusinessResource>>(
          <Future<List<BusinessResource>>>[
            repository.members(widget.workspaceId),
            repository.invitations(widget.workspaceId),
            repository.teams(widget.workspaceId),
          ],
        );
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{
            'Members': values[0],
            'Invitations': values[1],
            'Teams': values[2],
          },
        );
      case 'crm':
        final values = await Future.wait<Object>(<Future<Object>>[
          repository.companies(widget.workspaceId),
          repository.contacts(widget.workspaceId),
          repository.pipelineStages(widget.workspaceId),
          repository.deals(widget.workspaceId),
        ]);
        final companies = values[0] as CursorPage<BusinessResource>;
        final contacts = values[1] as CursorPage<BusinessResource>;
        final deals = values[3] as CursorPage<BusinessResource>;
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{
            'Companies': companies.items,
            'Contacts': contacts.items,
            'Pipeline stages': values[2] as List<BusinessResource>,
            'Deals': deals.items,
          },
          nextCursors: <String, String?>{
            'Companies': companies.nextCursor,
            'Contacts': contacts.nextCursor,
            'Deals': deals.nextCursor,
          },
        );
      case 'contacts':
        final page = await repository.contacts(widget.workspaceId);
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{'Contacts': page.items},
          nextCursors: <String, String?>{'Contacts': page.nextCursor},
        );
      case 'deals':
        final values = await Future.wait<Object>(<Future<Object>>[
          repository.pipelineStages(widget.workspaceId),
          repository.deals(widget.workspaceId),
        ]);
        final deals = values[1] as CursorPage<BusinessResource>;
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{
            'Pipeline stages': values[0] as List<BusinessResource>,
            'Deals': deals.items,
          },
          nextCursors: <String, String?>{'Deals': deals.nextCursor},
        );
      case 'tasks':
        final page = await repository.tasks(widget.workspaceId);
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{'Tasks': page.items},
          nextCursors: <String, String?>{'Tasks': page.nextCursor},
        );
      case 'calendar':
        final now = DateTime.now().toUtc();
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{
            'Events': await repository.calendar(
              widget.workspaceId,
              start: now.subtract(const Duration(days: 30)),
              end: now.add(const Duration(days: 90)),
            ),
          },
        );
      case 'documents':
        final values = await Future.wait<List<BusinessResource>>(
          <Future<List<BusinessResource>>>[
            repository.folders(widget.workspaceId),
            repository.documents(widget.workspaceId),
          ],
        );
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{
            'Folders': values[0],
            'Documents': values[1],
          },
        );
      case 'finance':
        final values = await Future.wait<Object>(<Future<Object>>[
          repository.budgets(widget.workspaceId),
          repository.expenses(widget.workspaceId),
          repository.invoices(widget.workspaceId),
          repository.financeReport(widget.workspaceId),
        ]);
        return _BusinessAreaData(
          sections: <String, List<BusinessResource>>{
            'Budgets': values[0] as List<BusinessResource>,
            'Expenses': values[1] as List<BusinessResource>,
            'Invoices': values[2] as List<BusinessResource>,
          },
          report: values[3] as FinanceReport,
        );
      default:
        throw ArgumentError.value(widget.area, 'area', 'Unknown business area');
    }
  }

  @override
  Widget build(BuildContext context) => LumenPage(
    title: _areaTitle(widget.area),
    subtitle: 'Persisted workspace records and actions for this area.',
    showAuraPresence: false,
    auraPresencePreset: SyloraAuraContextPreset.business,
    maxContentWidth: 1120,
    actions: <Widget>[
      IconButton(
        tooltip: 'Aura Business',
        onPressed: () => openAuraConversation(
          context,
          ref,
          purpose: 'business_copilot',
          title: 'Business Copilot',
        ),
        icon: const Icon(Icons.auto_awesome_rounded),
      ),
    ],
    child: FutureBuilder<_BusinessAreaData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(error: snapshot.error!, onRetry: _refresh);
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            _WorkspaceModuleNavigation(
              workspaceId: widget.workspaceId,
              currentArea: widget.area,
            ),
            const SizedBox(height: 18),
            for (final section in data.sections.entries) ...<Widget>[
              _BusinessSection(
                workspaceId: widget.workspaceId,
                area: widget.area,
                title: section.key,
                items: section.value,
                nextCursor: data.nextCursors[section.key],
                pipelineStages:
                    data.sections['Pipeline stages'] ??
                    const <BusinessResource>[],
                onChanged: _refresh,
              ),
              const SizedBox(height: 18),
            ],
            if (widget.area == 'finance') ...<Widget>[
              _ProviderBoundaryCard(
                icon: Icons.account_balance_outlined,
                title: 'Accounting export',
                message:
                    _integrationMessage ??
                    'Exports are queued only through a real accounting provider. '
                        'If this deployment is not configured, nothing is exported.',
                actionLabel: _integrationBusy
                    ? 'Checking provider…'
                    : 'Export finance records',
                busy: _integrationBusy,
                onAction: _integrationBusy ? null : _exportAccounting,
              ),
              const SizedBox(height: 18),
            ],
            if (data.report != null) _FinanceReportView(report: data.report!),
          ],
        );
      },
    ),
  );

  void _refresh() => setState(() => _future = _load());

  Future<void> _exportAccounting() async {
    setState(() {
      _integrationBusy = true;
      _integrationMessage = null;
    });
    try {
      final result = await ref
          .read(businessRepositoryProvider)
          .exportToAccounting(widget.workspaceId);
      if (mounted) {
        setState(() {
          _integrationMessage =
              'Accounting export ${result['status']} as operation '
              '${result['provider_operation_id']}.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _integrationMessage =
              error is ApiProblem &&
                  error.code == 'accounting_provider_unavailable'
              ? 'Accounting export unavailable: ${error.detail} No export was queued.'
              : messageFor(error);
        });
      }
    } finally {
      if (mounted) {
        setState(() => _integrationBusy = false);
      }
    }
  }
}

final class _WorkspaceModuleNavigation extends StatelessWidget {
  const _WorkspaceModuleNavigation({
    required this.workspaceId,
    required this.currentArea,
  });

  final String workspaceId;
  final String currentArea;

  @override
  Widget build(BuildContext context) {
    const modules = <(String, String, IconData)>[
      ('crm', 'CRM overview', Icons.handshake_outlined),
      ('contacts', 'Contacts', Icons.contacts_outlined),
      ('deals', 'Deals', Icons.trending_up_rounded),
      ('tasks', 'Tasks', Icons.task_alt_outlined),
      ('calendar', 'Calendar', Icons.calendar_month_outlined),
      ('documents', 'Documents', Icons.folder_outlined),
      ('finance', 'Finance', Icons.account_balance_outlined),
    ];
    return LumenSurface(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Workspace modules',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final (area, label, icon) in modules)
                FilterChip(
                  avatar: Icon(icon, size: 18),
                  label: Text(label),
                  selected: currentArea == area,
                  onSelected: (_) {
                    if (currentArea != area) {
                      context.goNamed(
                        'business-area',
                        pathParameters: <String, String>{
                          'workspaceId': workspaceId,
                          'area': area,
                        },
                      );
                    }
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }
}

final class _ProviderBoundaryCard extends StatelessWidget {
  const _ProviderBoundaryCard({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.busy,
    required this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final bool busy;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(icon),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            const LumenBadge(label: 'Provider-backed'),
          ],
        ),
        const SizedBox(height: 8),
        Text(message),
        const SizedBox(height: 14),
        LumenPrimaryButton(
          label: actionLabel,
          busy: busy,
          onPressed: onAction,
          icon: Icons.open_in_new_rounded,
        ),
      ],
    ),
  );
}

final class _BusinessSection extends ConsumerStatefulWidget {
  const _BusinessSection({
    required this.workspaceId,
    required this.area,
    required this.title,
    required this.items,
    required this.nextCursor,
    required this.pipelineStages,
    required this.onChanged,
  });

  final String workspaceId;
  final String area;
  final String title;
  final List<BusinessResource> items;
  final String? nextCursor;
  final List<BusinessResource> pipelineStages;
  final VoidCallback onChanged;

  @override
  ConsumerState<_BusinessSection> createState() => _BusinessSectionState();
}

final class _BusinessSectionState extends ConsumerState<_BusinessSection> {
  late List<BusinessResource> _items = widget.items.toList();
  late String? _cursor = widget.nextCursor;
  bool _busy = false;

  @override
  void didUpdateWidget(covariant _BusinessSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.items != widget.items ||
        oldWidget.nextCursor != widget.nextCursor) {
      _items = widget.items.toList();
      _cursor = widget.nextCursor;
    }
  }

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                widget.title,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            if (_canCreate(widget.title))
              IconButton(
                tooltip: 'Create ${widget.title.toLowerCase()}',
                onPressed:
                    _busy ||
                        (widget.title == 'Deals' &&
                            widget.pipelineStages.isEmpty)
                    ? null
                    : _create,
                icon: const Icon(Icons.add_rounded),
              ),
          ],
        ),
        if (_items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 18),
            child: Column(
              children: <Widget>[
                Icon(
                  _emptyIcon(widget.title),
                  size: 42,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 12),
                Text(
                  _emptyTitle(widget.title),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 6),
                Text(_emptyMessage(widget.title), textAlign: TextAlign.center),
                if (_canCreate(widget.title)) ...<Widget>[
                  const SizedBox(height: 14),
                  LumenPrimaryButton(
                    label:
                        widget.title == 'Deals' && widget.pipelineStages.isEmpty
                        ? 'Pipeline stage required'
                        : _createLabel(widget.title),
                    onPressed:
                        _busy ||
                            (widget.title == 'Deals' &&
                                widget.pipelineStages.isEmpty)
                        ? null
                        : _create,
                    disabledReason:
                        widget.title == 'Deals' && widget.pipelineStages.isEmpty
                        ? 'Create a pipeline stage before adding a deal.'
                        : null,
                    icon: Icons.add_rounded,
                  ),
                ],
              ],
            ),
          )
        else
          for (final item in _items)
            Card(
              child: ListTile(
                title: Text(item.label),
                subtitle: Text(
                  item.summary.entries
                      .take(3)
                      .map((entry) => '${entry.key}: ${entry.value}')
                      .join(' • '),
                ),
                leading: item.status == null
                    ? const Icon(Icons.data_object_rounded)
                    : LumenBadge(label: item.status!),
                trailing: _actionFor(item),
                onTap: widget.title == 'Documents'
                    ? () => context.pushNamed(
                        'business-document',
                        pathParameters: <String, String>{
                          'workspaceId': widget.workspaceId,
                          'documentId': item.id,
                        },
                      )
                    : null,
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
  );

  Widget? _actionFor(BusinessResource item) {
    if (widget.title == 'Tasks') {
      final version = int.tryParse(item.summary['version'] ?? '');
      return LumenSecondaryButton(
        label: 'Complete',
        onPressed: item.status == 'completed' || version == null
            ? null
            : () => _completeTask(item, version),
        disabledReason: item.status == 'completed'
            ? 'This task is already completed.'
            : 'The task response did not include a concurrency version.',
        icon: Icons.check_rounded,
      );
    }
    if (widget.title == 'Deals') {
      return IconButton(
        tooltip: 'Move deal to stage',
        onPressed: () => _transitionDeal(item),
        icon: const Icon(Icons.move_down_rounded),
      );
    }
    if (widget.title == 'Expenses') {
      return LumenSecondaryButton(
        label: 'Submit',
        onPressed: item.status == 'draft' ? () => _submitExpense(item) : null,
        disabledReason: 'Only draft expenses can be submitted.',
        icon: Icons.send_outlined,
      );
    }
    if (widget.title == 'Invoices') {
      return LumenSecondaryButton(
        label: 'Send',
        onPressed: item.status == 'draft' ? () => _sendInvoice(item) : null,
        disabledReason: 'Only draft invoices can be sent.',
        icon: Icons.send_outlined,
      );
    }
    return null;
  }

  Future<void> _create() async {
    final repository = ref.read(businessRepositoryProvider);
    Map<String, String>? values;
    Future<Object>? request;
    switch (widget.title) {
      case 'Invitations':
        values = await showBusinessForm(
          context,
          'Invite workspace member',
          const <BusinessFormField>[
            BusinessFormField('email', 'Email', validator: _email),
            BusinessFormField(
              'role',
              'Role (admin, manager, member, viewer)',
              initial: 'member',
              validator: _workspaceRole,
            ),
          ],
        );
        if (values != null) {
          request = repository.invite(widget.workspaceId, <String, dynamic>{
            ...values,
            'permission_overrides': <String, bool>{},
            'expires_in_hours': 72,
          });
        }
      case 'Teams':
        values = await showBusinessForm(
          context,
          'Create team',
          const <BusinessFormField>[
            BusinessFormField('name', 'Name', validator: _required),
            BusinessFormField('description', 'Description', required: false),
          ],
        );
        if (values != null) {
          request = repository.createTeam(widget.workspaceId, values);
        }
      case 'Companies':
        values = await showBusinessForm(
          context,
          'Create company',
          const <BusinessFormField>[
            BusinessFormField('name', 'Name', validator: _required),
            BusinessFormField('domain', 'Domain', required: false),
            BusinessFormField('phone', 'Phone', required: false),
            BusinessFormField('job_title', 'Job title', required: false),
            BusinessFormField('source', 'Source', required: false),
          ],
        );
        if (values != null) {
          request = repository
              .createCompany(widget.workspaceId, <String, dynamic>{
                ...values,
                'domain': _empty(values['domain']),
                'phone': _empty(values['phone']),
                'tags': <String>[],
                'custom_fields': <String, dynamic>{},
                'owner_user_id': null,
                'source': null,
              });
        }
      case 'Contacts':
        values = await showBusinessForm(
          context,
          'Create contact',
          const <BusinessFormField>[
            BusinessFormField('first_name', 'First name', validator: _required),
            BusinessFormField('last_name', 'Last name', validator: _required),
            BusinessFormField(
              'email',
              'Email',
              required: false,
              validator: _optionalEmail,
            ),
            BusinessFormField('phone', 'Phone', required: false),
          ],
        );
        if (values != null) {
          request = repository
              .createContact(widget.workspaceId, <String, dynamic>{
                ...values,
                'email': _empty(values['email']),
                'phone': _empty(values['phone']),
                'company_id': null,
                'job_title': _empty(values['job_title']),
                'tags': <String>[],
                'custom_fields': <String, dynamic>{},
                'owner_user_id': null,
                'assignee_user_id': null,
                'consent_status': 'unknown',
                'source': _empty(values['source']),
              });
        }
      case 'Pipeline stages':
        values = await showBusinessForm(
          context,
          'Create pipeline stage',
          const <BusinessFormField>[
            BusinessFormField('key', 'Key', validator: _slugValidator),
            BusinessFormField('name', 'Name', validator: _required),
            BusinessFormField(
              'position',
              'Position',
              initial: '0',
              numeric: true,
            ),
            BusinessFormField(
              'probability_bps',
              'Probability basis points',
              initial: '0',
              numeric: true,
            ),
          ],
        );
        if (values != null) {
          request = repository
              .createPipelineStage(widget.workspaceId, <String, dynamic>{
                'key': values['key'],
                'name': values['name'],
                'position': int.parse(values['position']!),
                'probability_bps': int.parse(values['probability_bps']!),
                'active': true,
              });
        }
      case 'Deals':
        values = await showBusinessForm(
          context,
          'Create deal',
          <BusinessFormField>[
            const BusinessFormField('name', 'Name', validator: _required),
            BusinessFormField(
              'stage_id',
              'Pipeline stage',
              options: <String, String>{
                for (final stage in widget.pipelineStages)
                  stage.id: stage.label,
              },
              validator: _required,
            ),
            const BusinessFormField(
              'value_minor',
              'Value in minor units',
              initial: '0',
              numeric: true,
            ),
            const BusinessFormField(
              'currency',
              'Currency',
              initial: 'USD',
              validator: _currency,
            ),
          ],
        );
        if (values != null) {
          request = repository.createDeal(widget.workspaceId, <String, dynamic>{
            'name': values['name'],
            'stage_id': values['stage_id'],
            'value_minor': int.parse(values['value_minor']!),
            'currency': values['currency'],
            'contact_id': null,
            'company_id': null,
            'assignee_user_id': null,
            'probability_bps': null,
            'expected_close_at': null,
            'status': 'open',
          });
        }
      case 'Tasks':
        values = await showBusinessForm(
          context,
          'Create task',
          const <BusinessFormField>[
            BusinessFormField('title', 'Title', validator: _required),
            BusinessFormField('description', 'Description', required: false),
            BusinessFormField(
              'priority',
              'Priority (low, normal, high, urgent)',
              initial: 'normal',
              validator: _taskPriority,
            ),
            BusinessFormField(
              'due_at',
              'Due date (ISO-8601)',
              required: false,
              validator: _optionalDate,
            ),
          ],
        );
        if (values != null) {
          request = repository.createTask(widget.workspaceId, <String, dynamic>{
            'title': values['title'],
            'description': _empty(values['description']),
            'status': 'todo',
            'priority': values['priority'],
            'assignee_user_id': null,
            'team_id': null,
            'parent_id': null,
            'starts_at': null,
            'due_at': _empty(values['due_at']),
          });
        }
      case 'Events':
        final now = DateTime.now().toUtc().add(const Duration(hours: 1));
        values = await showBusinessForm(
          context,
          'Create calendar event',
          <BusinessFormField>[
            const BusinessFormField('title', 'Title', validator: _required),
            const BusinessFormField(
              'description',
              'Description',
              required: false,
            ),
            BusinessFormField(
              'starts_at',
              'Starts at (ISO-8601)',
              initial: now.toIso8601String(),
              validator: _date,
            ),
            BusinessFormField(
              'ends_at',
              'Ends at (ISO-8601)',
              initial: now.add(const Duration(hours: 1)).toIso8601String(),
              validator: _date,
            ),
            const BusinessFormField('timezone', 'Timezone', initial: 'UTC'),
          ],
        );
        if (values != null) {
          request = repository.createCalendarEvent(
            widget.workspaceId,
            <String, dynamic>{
              ...values,
              'description': _empty(values['description']),
              'attendees': <String>[],
              'recurrence_rule': null,
              'reminders': <int>[15],
            },
          );
        }
      case 'Folders':
        values = await showBusinessForm(
          context,
          'Create folder',
          const <BusinessFormField>[
            BusinessFormField('name', 'Name', validator: _required),
            BusinessFormField('parent_id', 'Parent folder ID', required: false),
          ],
        );
        if (values != null) {
          request = repository.createFolder(
            widget.workspaceId,
            <String, dynamic>{
              'name': values['name'],
              'parent_id': _empty(values['parent_id']),
            },
          );
        }
      case 'Documents':
        values = await showBusinessForm(
          context,
          'Create document',
          const <BusinessFormField>[
            BusinessFormField('title', 'Title', validator: _required),
            BusinessFormField('folder_id', 'Folder ID', required: false),
            BusinessFormField(
              'classification',
              'Classification (public, internal, confidential, restricted)',
              initial: 'internal',
              validator: _documentClassification,
            ),
          ],
        );
        if (values != null) {
          request = repository
              .createDocument(widget.workspaceId, <String, dynamic>{
                'title': values['title'],
                'folder_id': _empty(values['folder_id']),
                'classification': values['classification'],
                'owner_user_id': null,
              });
        }
      case 'Budgets':
        final start = DateTime.now().toUtc();
        values = await showBusinessForm(
          context,
          'Create budget',
          <BusinessFormField>[
            const BusinessFormField('name', 'Name', validator: _required),
            const BusinessFormField(
              'amount_minor',
              'Amount in minor units',
              numeric: true,
            ),
            const BusinessFormField(
              'currency',
              'Currency',
              initial: 'USD',
              validator: _currency,
            ),
            BusinessFormField(
              'period_start',
              'Period start (ISO-8601)',
              initial: start.toIso8601String(),
              validator: _date,
            ),
            BusinessFormField(
              'period_end',
              'Period end (ISO-8601)',
              initial: start.add(const Duration(days: 30)).toIso8601String(),
              validator: _date,
            ),
          ],
        );
        if (values != null) {
          request = repository
              .createBudget(widget.workspaceId, <String, dynamic>{
                'name': values['name'],
                'amount_minor': int.parse(values['amount_minor']!),
                'currency': values['currency'],
                'period_start': values['period_start'],
                'period_end': values['period_end'],
                'status': 'draft',
              });
        }
      case 'Expenses':
        values = await showBusinessForm(
          context,
          'Create expense',
          <BusinessFormField>[
            const BusinessFormField('vendor', 'Vendor', validator: _required),
            const BusinessFormField(
              'description',
              'Description',
              required: false,
            ),
            const BusinessFormField(
              'amount_minor',
              'Amount in minor units',
              numeric: true,
            ),
            const BusinessFormField(
              'currency',
              'Currency',
              initial: 'USD',
              validator: _currency,
            ),
            BusinessFormField(
              'incurred_at',
              'Incurred at (ISO-8601)',
              initial: DateTime.now().toUtc().toIso8601String(),
              validator: _date,
            ),
          ],
        );
        if (values != null) {
          request = repository
              .createExpense(widget.workspaceId, <String, dynamic>{
                ...values,
                'description': _empty(values['description']),
                'amount_minor': int.parse(values['amount_minor']!),
                'category_id': null,
                'receipt_object_key': null,
              });
        }
      case 'Invoices':
        values = await showBusinessForm(
          context,
          'Create invoice',
          const <BusinessFormField>[
            BusinessFormField('number', 'Invoice number', validator: _required),
            BusinessFormField(
              'currency',
              'Currency',
              initial: 'USD',
              validator: _currency,
            ),
            BusinessFormField(
              'line_description',
              'Line description',
              validator: _required,
            ),
            BusinessFormField(
              'quantity',
              'Quantity',
              initial: '1',
              numeric: true,
            ),
            BusinessFormField(
              'unit_amount_minor',
              'Unit amount in minor units',
              numeric: true,
            ),
            BusinessFormField(
              'tax_minor',
              'Tax in minor units',
              initial: '0',
              numeric: true,
            ),
            BusinessFormField(
              'due_at',
              'Due at (ISO-8601)',
              required: false,
              validator: _optionalDate,
            ),
          ],
        );
        if (values != null) {
          request = repository.createInvoice(
            widget.workspaceId,
            <String, dynamic>{
              'number': values['number'],
              'contact_id': null,
              'company_id': null,
              'currency': values['currency'],
              'tax_minor': int.parse(values['tax_minor']!),
              'due_at': _empty(values['due_at']),
              'lines': <JsonObject>[
                <String, dynamic>{
                  'description': values['line_description'],
                  'quantity': int.parse(values['quantity']!),
                  'unit_amount_minor': int.parse(values['unit_amount_minor']!),
                },
              ],
            },
          );
        }
    }
    if (request == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      await request;
      widget.onChanged();
    } on Object catch (error) {
      _show(error);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _completeTask(BusinessResource task, int version) async {
    try {
      await ref
          .read(businessRepositoryProvider)
          .completeTask(widget.workspaceId, task.id, version);
      widget.onChanged();
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _transitionDeal(BusinessResource deal) async {
    final values = await showBusinessForm(
      context,
      'Move deal',
      <BusinessFormField>[
        BusinessFormField(
          'stage_id',
          'Pipeline stage',
          options: <String, String>{
            for (final stage in widget.pipelineStages) stage.id: stage.label,
          },
          validator: _required,
        ),
        const BusinessFormField('note', 'Note', required: false),
      ],
    );
    if (values == null) {
      return;
    }
    try {
      await ref
          .read(businessRepositoryProvider)
          .transitionDeal(
            widget.workspaceId,
            deal.id,
            values['stage_id']!,
            note: _empty(values['note']),
          );
      widget.onChanged();
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _submitExpense(BusinessResource expense) async {
    try {
      await ref
          .read(businessRepositoryProvider)
          .submitExpense(widget.workspaceId, expense.id);
      widget.onChanged();
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _sendInvoice(BusinessResource invoice) async {
    try {
      await ref
          .read(businessRepositoryProvider)
          .sendInvoice(widget.workspaceId, invoice.id);
      widget.onChanged();
    } on Object catch (error) {
      _show(error);
    }
  }

  Future<void> _loadMore() async {
    final repository = ref.read(businessRepositoryProvider);
    setState(() => _busy = true);
    try {
      late final CursorPage<BusinessResource> page;
      switch (widget.title) {
        case 'Companies':
          page = await repository.companies(
            widget.workspaceId,
            cursor: _cursor,
          );
        case 'Contacts':
          page = await repository.contacts(widget.workspaceId, cursor: _cursor);
        case 'Deals':
          page = await repository.deals(widget.workspaceId, cursor: _cursor);
        case 'Tasks':
          page = await repository.tasks(widget.workspaceId, cursor: _cursor);
        default:
          return;
      }
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

final class _FinanceReportView extends StatelessWidget {
  const _FinanceReportView({required this.report});

  final FinanceReport report;

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'Finance report',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        Text('Basis: ${report.basis}'),
        for (final section in <String, List<Map<String, String>>>{
          'Budgets': report.budgets,
          'Expenses': report.expenses,
          'Invoices': report.invoices,
        }.entries)
          Material(
            type: MaterialType.transparency,
            child: ExpansionTile(
              title: Text('${section.key} (${section.value.length})'),
              children: <Widget>[
                if (section.value.isEmpty)
                  const ListTile(title: Text('No report rows.'))
                else
                  for (final row in section.value)
                    ListTile(
                      title: Text(
                        row.entries
                            .take(4)
                            .map((entry) => '${entry.key}: ${entry.value}')
                            .join(' • '),
                      ),
                    ),
              ],
            ),
          ),
      ],
    ),
  );
}

final class BusinessDocumentScreen extends ConsumerStatefulWidget {
  const BusinessDocumentScreen({
    required this.workspaceId,
    required this.documentId,
    super.key,
  });

  final String workspaceId;
  final String documentId;

  @override
  ConsumerState<BusinessDocumentScreen> createState() =>
      _BusinessDocumentScreenState();
}

final class _BusinessDocumentScreenState
    extends ConsumerState<BusinessDocumentScreen> {
  late Future<JsonObject> _future = _load();
  String? _message;
  String? _signatureMessage;
  bool _signatureBusy = false;

  Future<JsonObject> _load() => ref
      .read(businessRepositoryProvider)
      .document(widget.workspaceId, widget.documentId);

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Business document',
    subtitle: 'Document versions, upload capability, and approvals.',
    showAuraPresence: false,
    auraPresencePreset: SyloraAuraContextPreset.business,
    maxContentWidth: 1120,
    actions: <Widget>[
      IconButton(
        tooltip: 'Aura Business',
        onPressed: () => openAuraConversation(
          context,
          ref,
          purpose: 'business_copilot',
          title: 'Business Copilot',
        ),
        icon: const Icon(Icons.auto_awesome_rounded),
      ),
    ],
    child: FutureBuilder<JsonObject>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(error: snapshot.error!, onRetry: _refresh);
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final document = snapshot.data!;
        final versions = requireList(document, 'versions')
            .map((value) => requireObject(value, 'document version'))
            .toList(growable: false);
        final approvals = document['approvals'] is List
            ? (document['approvals']! as List<dynamic>)
                  .map((value) => requireObject(value, 'document approval'))
                  .toList(growable: false)
            : const <JsonObject>[];
        final currentVersionId = document['current_version_id'] as String?;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    requireString(document, 'title'),
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  Text('${document['classification']} • ${document['state']}'),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    children: <Widget>[
                      FilledButton.icon(
                        onPressed: _upload,
                        icon: const Icon(Icons.upload_file_outlined),
                        label: const Text('Request upload'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _download,
                        icon: const Icon(Icons.download_outlined),
                        label: const Text('Download'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _requestApproval,
                        icon: const Icon(Icons.approval_outlined),
                        label: const Text('Request approval'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _decideById,
                        icon: const Icon(Icons.how_to_reg_outlined),
                        label: const Text('Decide approval'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _ProviderBoundaryCard(
              icon: Icons.draw_outlined,
              title: 'E-signatures',
              message:
                  _signatureMessage ??
                  (currentVersionId == null
                      ? 'Verify a document version before requesting signatures. '
                            'No provider request can be made yet.'
                      : 'Signature requests use only a configured real provider. '
                            'An unconfigured deployment returns unavailable and '
                            'does not create a simulated request.'),
              actionLabel: _signatureBusy
                  ? 'Checking provider…'
                  : 'Request e-signatures',
              busy: _signatureBusy,
              onAction: _signatureBusy || currentVersionId == null
                  ? null
                  : _requestSignature,
            ),
            if (_message != null) ...<Widget>[
              const SizedBox(height: 12),
              LumenSurface(child: SelectableText(_message!)),
            ],
            const SizedBox(height: 16),
            Text('Versions', style: Theme.of(context).textTheme.headlineSmall),
            if (versions.isEmpty)
              const Text('The document API returned no versions.')
            else
              for (final version in versions)
                Card(
                  child: ListTile(
                    title: Text('Version ${version['version_number']}'),
                    subtitle: Text('${version['upload_state']}'),
                    trailing: version['upload_state'] == 'pending'
                        ? TextButton(
                            onPressed: () =>
                                _verify(requireString(version, 'id')),
                            child: const Text('Verify upload'),
                          )
                        : null,
                  ),
                ),
            const SizedBox(height: 16),
            Text('Approvals', style: Theme.of(context).textTheme.headlineSmall),
            if (approvals.isEmpty)
              const Text('The document API returned no approval requests.')
            else
              for (final approval in approvals)
                Card(
                  child: ListTile(
                    title: Text('${approval['approver_user_id']}'),
                    subtitle: Text('${approval['status']}'),
                    trailing: approval['status'] == 'pending'
                        ? PopupMenuButton<String>(
                            onSelected: (decision) => _decide(
                              requireString(approval, 'id'),
                              decision,
                            ),
                            itemBuilder: (context) =>
                                const <PopupMenuEntry<String>>[
                                  PopupMenuItem(
                                    value: 'approved',
                                    child: Text('Approve'),
                                  ),
                                  PopupMenuItem(
                                    value: 'rejected',
                                    child: Text('Reject'),
                                  ),
                                ],
                          )
                        : null,
                  ),
                ),
          ],
        );
      },
    ),
  );

  void _refresh() => setState(() => _future = _load());

  Future<void> _requestSignature() async {
    final values = await showBusinessForm(
      context,
      'Request e-signatures',
      const <BusinessFormField>[
        BusinessFormField(
          'signer_emails',
          'Signer emails (comma separated)',
          validator: _emailList,
        ),
      ],
    );
    if (values == null) {
      return;
    }
    final signerEmails = values['signer_emails']!
        .split(',')
        .map((email) => email.trim())
        .where((email) => email.isNotEmpty)
        .toList(growable: false);
    setState(() {
      _signatureBusy = true;
      _signatureMessage = null;
    });
    try {
      final result = await ref
          .read(businessRepositoryProvider)
          .requestESignature(
            widget.workspaceId,
            widget.documentId,
            signerEmails,
          );
      if (mounted) {
        setState(() {
          _signatureMessage =
              'E-signature request ${result['status']} as operation '
              '${result['provider_operation_id']}.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _signatureMessage =
              error is ApiProblem &&
                  error.code == 'esignature_provider_unavailable'
              ? 'E-signature unavailable: ${error.detail} No signature request was queued.'
              : messageFor(error);
        });
      }
    } finally {
      if (mounted) {
        setState(() => _signatureBusy = false);
      }
    }
  }

  Future<void> _upload() async {
    final values = await showBusinessForm(
      context,
      'Request document upload',
      const <BusinessFormField>[
        BusinessFormField(
          'content_type',
          'Content type',
          validator: _contentType,
        ),
        BusinessFormField('byte_size', 'Byte size', numeric: true),
        BusinessFormField('sha256', 'SHA-256', validator: _sha256),
        BusinessFormField(
          'rights_declaration',
          'Rights declaration',
          validator: _rights,
        ),
      ],
    );
    if (values == null) {
      return;
    }
    try {
      final result = await ref
          .read(businessRepositoryProvider)
          .requestDocumentUpload(
            widget.workspaceId,
            widget.documentId,
            <String, dynamic>{
              ...values,
              'byte_size': int.parse(values['byte_size']!),
            },
          );
      if (mounted) {
        setState(() {
          final headers = requireObject(
            result['headers'],
            'document upload headers',
          ).entries.map((entry) => '${entry.key}: ${entry.value}').join('\n');
          _message =
              'Upload capability for version ${result['version_id']} expires '
              'in ${result['expires_in_seconds']} seconds.\n'
              '${result['upload_url']}\n$headers';
        });
      }
    } on Object catch (error) {
      _setError(error);
    }
  }

  Future<void> _verify(String versionId) async {
    try {
      await ref
          .read(businessRepositoryProvider)
          .verifyDocumentVersion(
            widget.workspaceId,
            widget.documentId,
            versionId,
          );
      _refresh();
    } on Object catch (error) {
      _setError(error);
    }
  }

  Future<void> _download() async {
    try {
      final result = await ref
          .read(businessRepositoryProvider)
          .downloadDocument(widget.workspaceId, widget.documentId);
      await launchUrl(
        Uri.parse(requireString(result, 'download_url')),
        mode: LaunchMode.externalApplication,
      );
    } on Object catch (error) {
      _setError(error);
    }
  }

  Future<void> _requestApproval() async {
    final values = await showBusinessForm(
      context,
      'Request document approval',
      const <BusinessFormField>[
        BusinessFormField(
          'approver_user_id',
          'Approver user ID',
          validator: _required,
        ),
        BusinessFormField('note', 'Note', required: false),
      ],
    );
    if (values == null) {
      return;
    }
    try {
      final approval = await ref
          .read(businessRepositoryProvider)
          .requestDocumentApproval(
            widget.workspaceId,
            widget.documentId,
            <String, dynamic>{
              'approver_user_id': values['approver_user_id'],
              'note': _empty(values['note']),
            },
          );
      if (mounted) {
        setState(() {
          _message =
              'Approval request ${approval.id} is '
              '${approval.status ?? 'pending'}.';
        });
      }
    } on Object catch (error) {
      _setError(error);
    }
  }

  Future<void> _decideById() async {
    final values = await showBusinessForm(
      context,
      'Decide document approval',
      const <BusinessFormField>[
        BusinessFormField(
          'approval_id',
          'Approval request ID',
          validator: _required,
        ),
        BusinessFormField(
          'decision',
          'Decision (approved or rejected)',
          validator: _approvalDecision,
        ),
        BusinessFormField('note', 'Note', required: false),
      ],
    );
    if (values == null) {
      return;
    }
    try {
      await ref.read(businessRepositoryProvider).decideDocumentApproval(
        widget.workspaceId,
        widget.documentId,
        values['approval_id']!,
        <String, dynamic>{
          'decision': values['decision'],
          'note': _empty(values['note']),
        },
      );
      if (mounted) {
        setState(() => _message = 'Approval decision recorded.');
      }
    } on Object catch (error) {
      _setError(error);
    }
  }

  Future<void> _decide(String approvalId, String decision) async {
    try {
      await ref.read(businessRepositoryProvider).decideDocumentApproval(
        widget.workspaceId,
        widget.documentId,
        approvalId,
        <String, dynamic>{'decision': decision, 'note': null},
      );
      _refresh();
    } on Object catch (error) {
      _setError(error);
    }
  }

  void _setError(Object error) {
    if (mounted) {
      setState(() => _message = messageFor(error));
    }
  }
}

@immutable
final class BusinessFormField {
  const BusinessFormField(
    this.key,
    this.label, {
    this.initial = '',
    this.required = true,
    this.numeric = false,
    this.validator,
    this.options = const <String, String>{},
  });

  final String key;
  final String label;
  final String initial;
  final bool required;
  final bool numeric;
  final FormFieldValidator<String>? validator;
  final Map<String, String> options;
}

Future<Map<String, String>?> showBusinessForm(
  BuildContext context,
  String title,
  List<BusinessFormField> fields,
) async {
  final form = GlobalKey<FormState>();
  final controllers = <String, TextEditingController>{
    for (final field in fields)
      field.key: TextEditingController(text: field.initial),
  };
  final result = await showDialog<Map<String, String>>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title),
      content: SizedBox(
        width: 540,
        child: Form(
          key: form,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                for (final field in fields) ...<Widget>[
                  if (field.options.isNotEmpty)
                    DropdownButtonFormField<String>(
                      initialValue: field.initial.isEmpty
                          ? null
                          : field.initial,
                      decoration: InputDecoration(labelText: field.label),
                      items: <DropdownMenuItem<String>>[
                        for (final option in field.options.entries)
                          DropdownMenuItem<String>(
                            value: option.key,
                            child: Text(option.value),
                          ),
                      ],
                      onChanged: (value) =>
                          controllers[field.key]!.text = value ?? '',
                      validator:
                          field.validator ??
                          (value) => field.required && value == null
                              ? 'Select ${field.label.toLowerCase()}.'
                              : null,
                    )
                  else
                    TextFormField(
                      controller: controllers[field.key],
                      keyboardType: field.numeric ? TextInputType.number : null,
                      decoration: InputDecoration(labelText: field.label),
                      validator:
                          field.validator ??
                          (value) {
                            if (field.required &&
                                (value?.trim().isEmpty ?? true)) {
                              return 'Enter ${field.label.toLowerCase()}.';
                            }
                            if (field.numeric &&
                                int.tryParse(value?.trim() ?? '') == null) {
                              return 'Enter an integer.';
                            }
                            return null;
                          },
                    ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
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
              Navigator.pop(dialogContext, <String, String>{
                for (final entry in controllers.entries)
                  entry.key: entry.value.text.trim(),
              });
            }
          },
          child: const Text('Submit'),
        ),
      ],
    ),
  );
  await Future<void>.delayed(const Duration(milliseconds: 200));
  for (final controller in controllers.values) {
    controller.dispose();
  }
  return result;
}

bool _canCreate(String title) => const <String>{
  'Invitations',
  'Teams',
  'Companies',
  'Contacts',
  'Pipeline stages',
  'Deals',
  'Tasks',
  'Events',
  'Folders',
  'Documents',
  'Budgets',
  'Expenses',
  'Invoices',
}.contains(title);

String _areaTitle(String area) => switch (area) {
  'people' => 'Members, invitations & teams',
  'crm' => 'CRM',
  'contacts' => 'Contacts',
  'deals' => 'Deals',
  'tasks' => 'Tasks',
  'calendar' => 'Calendar',
  'documents' => 'Documents',
  'finance' => 'Finance',
  _ => 'Workspace',
};

String _emptyTitle(String title) => switch (title) {
  'Contacts' => 'No contacts yet',
  'Deals' => 'No deals in this pipeline',
  'Tasks' => 'No tasks to work through',
  'Pipeline stages' => 'No pipeline stages',
  _ => 'No ${title.toLowerCase()} yet',
};

String _emptyMessage(String title) => switch (title) {
  'Contacts' =>
    'Create a contact to keep customer details and CRM context together.',
  'Deals' =>
    'Add a deal to track value and progress through your pipeline stages.',
  'Tasks' => 'Create a task to give the workspace a clear next action.',
  'Pipeline stages' =>
    'Create the first stage before adding deals to this pipeline.',
  _ => 'This workspace has no ${title.toLowerCase()} records yet.',
};

String _createLabel(String title) => switch (title) {
  'Contacts' => 'Create first contact',
  'Deals' => 'Create first deal',
  'Tasks' => 'Create first task',
  'Pipeline stages' => 'Create pipeline stage',
  _ => 'Create ${title.toLowerCase()}',
};

IconData _emptyIcon(String title) => switch (title) {
  'Contacts' => Icons.contacts_outlined,
  'Deals' => Icons.trending_up_rounded,
  'Tasks' => Icons.task_alt_outlined,
  'Pipeline stages' => Icons.account_tree_outlined,
  _ => Icons.inbox_outlined,
};

String? _empty(String? value) {
  final trimmed = value?.trim() ?? '';
  return trimmed.isEmpty ? null : trimmed;
}

String? _required(String? value) =>
    value?.trim().isEmpty ?? true ? 'This field is required.' : null;

String? _email(String? value) =>
    RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value?.trim() ?? '')
    ? null
    : 'Enter a valid email address.';

String? _optionalEmail(String? value) =>
    value?.trim().isEmpty ?? true ? null : _email(value);

String? _emailList(String? value) {
  final emails = (value ?? '')
      .split(',')
      .map((email) => email.trim())
      .where((email) => email.isNotEmpty)
      .toList(growable: false);
  if (emails.isEmpty || emails.any((email) => _email(email) != null)) {
    return 'Enter one or more valid emails separated by commas.';
  }
  return null;
}

String? _slugValidator(String? value) =>
    RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(value?.trim() ?? '')
    ? null
    : 'Use lowercase letters, numbers, and hyphens.';

String? _date(String? value) => DateTime.tryParse(value?.trim() ?? '') == null
    ? 'Enter an ISO-8601 date and time.'
    : null;

String? _optionalDate(String? value) =>
    value?.trim().isEmpty ?? true ? null : _date(value);

String? _workspaceType(String? value) =>
    const <String>{'company', 'agency', 'team'}.contains(value?.trim())
    ? null
    : 'Use company, agency, or team.';

String? _workspaceRole(String? value) =>
    const <String>{
      'admin',
      'manager',
      'member',
      'viewer',
    }.contains(value?.trim())
    ? null
    : 'Use admin, manager, member, or viewer.';

String? _taskPriority(String? value) =>
    const <String>{'low', 'normal', 'high', 'urgent'}.contains(value?.trim())
    ? null
    : 'Use low, normal, high, or urgent.';

String? _documentClassification(String? value) =>
    const <String>{
      'public',
      'internal',
      'confidential',
      'restricted',
    }.contains(value?.trim())
    ? null
    : 'Use public, internal, confidential, or restricted.';

String? _approvalDecision(String? value) =>
    const <String>{'approved', 'rejected'}.contains(value?.trim())
    ? null
    : 'Use approved or rejected.';

String? _currency(String? value) =>
    RegExp(r'^[A-Z]{3}$').hasMatch(value?.trim() ?? '')
    ? null
    : 'Enter a three-letter uppercase currency.';

String? _contentType(String? value) =>
    (value ?? '').contains('/') ? null : 'Enter a MIME content type.';

String? _sha256(String? value) =>
    RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(value ?? '')
    ? null
    : 'Enter 64 hexadecimal characters.';

String? _rights(String? value) =>
    (value?.trim().length ?? 0) < 10 ? 'Enter at least 10 characters.' : null;
