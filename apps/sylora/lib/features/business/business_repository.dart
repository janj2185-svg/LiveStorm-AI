import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../auth/auth.dart';

@immutable
final class Workspace {
  const Workspace({
    required this.id,
    required this.slug,
    required this.name,
    required this.type,
    required this.ownerUserId,
    required this.status,
    required this.locale,
    required this.timezone,
    required this.currency,
  });

  factory Workspace.fromJson(JsonObject json) => Workspace(
    id: requireString(json, 'id'),
    slug: requireString(json, 'slug'),
    name: requireString(json, 'name'),
    type: requireString(json, 'type'),
    ownerUserId: requireString(json, 'owner_user_id'),
    status: requireString(json, 'status'),
    locale: requireString(json, 'locale'),
    timezone: requireString(json, 'timezone'),
    currency: requireString(json, 'currency'),
  );

  final String id;
  final String slug;
  final String name;
  final String type;
  final String ownerUserId;
  final String status;
  final String locale;
  final String timezone;
  final String currency;
}

@immutable
final class WorkspaceContext {
  const WorkspaceContext({
    required this.workspace,
    required this.role,
    required this.permissions,
  });

  factory WorkspaceContext.fromJson(JsonObject json) => WorkspaceContext(
    workspace: Workspace.fromJson(
      requireObject(json['workspace'], 'workspace'),
    ),
    role: requireString(json, 'role'),
    permissions: requireObject(json['permissions'], 'workspace permissions')
        .map(
          (key, value) => MapEntry(
            key,
            value is bool
                ? value
                : throw FormatException('$key permission must be boolean.'),
          ),
        ),
  );

  final Workspace workspace;
  final String role;
  final Map<String, bool> permissions;
}

@immutable
final class BusinessResource {
  const BusinessResource({
    required this.id,
    required this.label,
    required this.summary,
    this.status,
  });

  factory BusinessResource.fromJson(
    JsonObject json, {
    List<String> labelKeys = const <String>[
      'name',
      'title',
      'number',
      'email',
      'vendor',
      'key',
      'status',
    ],
    List<String> statusKeys = const <String>[
      'status',
      'state',
      'upload_state',
      'role',
    ],
  }) {
    final id = requireString(json, 'id');
    String? label;
    for (final key in labelKeys) {
      final value = json[key];
      if (value is String && value.trim().isNotEmpty) {
        label = value;
        break;
      }
    }
    String? status;
    for (final key in statusKeys) {
      final value = json[key];
      if (value is String) {
        status = value;
        break;
      }
    }
    return BusinessResource(
      id: id,
      label: label ?? id,
      status: status,
      summary: _boundedSummary(json),
    );
  }

  final String id;
  final String label;
  final String? status;
  final Map<String, String> summary;
}

@immutable
final class FinanceReport {
  const FinanceReport({
    required this.expenses,
    required this.invoices,
    required this.budgets,
    required this.basis,
  });

  factory FinanceReport.fromJson(JsonObject json) => FinanceReport(
    expenses: _reportRows(json, 'expenses'),
    invoices: _reportRows(json, 'invoices'),
    budgets: _reportRows(json, 'budgets'),
    basis: requireString(json, 'basis'),
  );

  final List<Map<String, String>> expenses;
  final List<Map<String, String>> invoices;
  final List<Map<String, String>> budgets;
  final String basis;
}

abstract interface class BusinessRepository {
  Future<List<Workspace>> workspaces();
  Future<Workspace> createWorkspace(JsonObject payload);
  Future<WorkspaceContext> switchWorkspace(String workspaceId);
  Future<List<BusinessResource>> members(String workspaceId);
  Future<List<BusinessResource>> invitations(String workspaceId);
  Future<JsonObject> invite(String workspaceId, JsonObject payload);
  Future<List<BusinessResource>> teams(String workspaceId);
  Future<BusinessResource> createTeam(String workspaceId, JsonObject payload);
  Future<CursorPage<BusinessResource>> companies(
    String workspaceId, {
    String? query,
    String? cursor,
  });
  Future<BusinessResource> createCompany(
    String workspaceId,
    JsonObject payload,
  );
  Future<CursorPage<BusinessResource>> contacts(
    String workspaceId, {
    String? query,
    String? cursor,
  });
  Future<BusinessResource> createContact(
    String workspaceId,
    JsonObject payload,
  );
  Future<List<BusinessResource>> pipelineStages(String workspaceId);
  Future<BusinessResource> createPipelineStage(
    String workspaceId,
    JsonObject payload,
  );
  Future<CursorPage<BusinessResource>> deals(
    String workspaceId, {
    String? query,
    String? cursor,
  });
  Future<BusinessResource> createDeal(String workspaceId, JsonObject payload);
  Future<BusinessResource> transitionDeal(
    String workspaceId,
    String dealId,
    String stageId, {
    String? note,
  });
  Future<CursorPage<BusinessResource>> tasks(
    String workspaceId, {
    String? status,
    String? cursor,
  });
  Future<BusinessResource> createTask(String workspaceId, JsonObject payload);
  Future<BusinessResource> completeTask(
    String workspaceId,
    String taskId,
    int version,
  );
  Future<List<BusinessResource>> calendar(
    String workspaceId, {
    required DateTime start,
    required DateTime end,
  });
  Future<BusinessResource> createCalendarEvent(
    String workspaceId,
    JsonObject payload,
  );
  Future<List<BusinessResource>> folders(String workspaceId);
  Future<BusinessResource> createFolder(String workspaceId, JsonObject payload);
  Future<List<BusinessResource>> documents(String workspaceId);
  Future<BusinessResource> createDocument(
    String workspaceId,
    JsonObject payload,
  );
  Future<JsonObject> document(String workspaceId, String documentId);
  Future<JsonObject> requestDocumentUpload(
    String workspaceId,
    String documentId,
    JsonObject payload,
  );
  Future<BusinessResource> verifyDocumentVersion(
    String workspaceId,
    String documentId,
    String versionId,
  );
  Future<JsonObject> downloadDocument(String workspaceId, String documentId);
  Future<BusinessResource> requestDocumentApproval(
    String workspaceId,
    String documentId,
    JsonObject payload,
  );
  Future<BusinessResource> decideDocumentApproval(
    String workspaceId,
    String documentId,
    String approvalId,
    JsonObject payload,
  );
  Future<List<BusinessResource>> budgets(String workspaceId);
  Future<BusinessResource> createBudget(String workspaceId, JsonObject payload);
  Future<List<BusinessResource>> expenses(String workspaceId);
  Future<BusinessResource> createExpense(
    String workspaceId,
    JsonObject payload,
  );
  Future<BusinessResource> submitExpense(String workspaceId, String expenseId);
  Future<List<BusinessResource>> invoices(String workspaceId);
  Future<BusinessResource> createInvoice(
    String workspaceId,
    JsonObject payload,
  );
  Future<BusinessResource> sendInvoice(String workspaceId, String invoiceId);
  Future<FinanceReport> financeReport(String workspaceId);
}

final class DioBusinessRepository implements BusinessRepository {
  const DioBusinessRepository(this._client);

  final ApiClient _client;

  @override
  Future<List<Workspace>> workspaces() async {
    final response = await _client.request('business/workspaces');
    return _objects(
      response.data,
      'workspaces',
    ).map(Workspace.fromJson).toList(growable: false);
  }

  @override
  Future<Workspace> createWorkspace(JsonObject payload) async {
    final response = await _client.request(
      'business/workspaces',
      method: 'POST',
      data: payload,
    );
    return Workspace.fromJson(requireObject(response.data, 'workspace'));
  }

  @override
  Future<WorkspaceContext> switchWorkspace(String workspaceId) async {
    final response = await _client.request(
      'business/workspaces/$workspaceId/switch',
      method: 'POST',
    );
    return WorkspaceContext.fromJson(
      requireObject(response.data, 'workspace context'),
    );
  }

  @override
  Future<List<BusinessResource>> members(String workspaceId) => _list(
    'business/workspaces/$workspaceId/members',
    labelKeys: const ['user_id'],
  );

  @override
  Future<List<BusinessResource>> invitations(String workspaceId) => _list(
    'business/workspaces/$workspaceId/invitations',
    labelKeys: const ['email'],
  );

  @override
  Future<JsonObject> invite(String workspaceId, JsonObject payload) async {
    final response = await _client.request(
      'business/workspaces/$workspaceId/invitations',
      method: 'POST',
      data: payload,
    );
    final json = requireObject(response.data, 'workspace invitation');
    requireString(json, 'status');
    requireString(json, 'invitation_id');
    requireDateTime(json, 'expires_at');
    return json;
  }

  @override
  Future<List<BusinessResource>> teams(String workspaceId) =>
      _list('business/workspaces/$workspaceId/teams');

  @override
  Future<BusinessResource> createTeam(String workspaceId, JsonObject payload) =>
      _create('business/workspaces/$workspaceId/teams', payload);

  @override
  Future<CursorPage<BusinessResource>> companies(
    String workspaceId, {
    String? query,
    String? cursor,
  }) => _page(
    'business/crm/companies',
    workspaceId,
    query: query,
    cursor: cursor,
  );

  @override
  Future<BusinessResource> createCompany(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate('business/crm/companies', workspaceId, payload);

  @override
  Future<CursorPage<BusinessResource>> contacts(
    String workspaceId, {
    String? query,
    String? cursor,
  }) => _page(
    'business/crm/contacts',
    workspaceId,
    query: query,
    cursor: cursor,
    labelKeys: const ['first_name', 'email'],
  );

  @override
  Future<BusinessResource> createContact(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate(
    'business/crm/contacts',
    workspaceId,
    payload,
    labelKeys: const ['first_name', 'email'],
  );

  @override
  Future<List<BusinessResource>> pipelineStages(String workspaceId) =>
      _tenantList('business/crm/pipeline-stages', workspaceId);

  @override
  Future<BusinessResource> createPipelineStage(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate('business/crm/pipeline-stages', workspaceId, payload);

  @override
  Future<CursorPage<BusinessResource>> deals(
    String workspaceId, {
    String? query,
    String? cursor,
  }) => _page('business/crm/deals', workspaceId, query: query, cursor: cursor);

  @override
  Future<BusinessResource> createDeal(String workspaceId, JsonObject payload) =>
      _tenantCreate('business/crm/deals', workspaceId, payload);

  @override
  Future<BusinessResource> transitionDeal(
    String workspaceId,
    String dealId,
    String stageId, {
    String? note,
  }) => _tenantCreate(
    'business/crm/deals/$dealId/transition',
    workspaceId,
    <String, dynamic>{'stage_id': stageId, 'note': note},
  );

  @override
  Future<CursorPage<BusinessResource>> tasks(
    String workspaceId, {
    String? status,
    String? cursor,
  }) => _page(
    'business/tasks',
    workspaceId,
    cursor: cursor,
    additionalQuery: <String, dynamic>{'status': status},
  );

  @override
  Future<BusinessResource> createTask(String workspaceId, JsonObject payload) =>
      _tenantCreate('business/tasks', workspaceId, payload);

  @override
  Future<BusinessResource> completeTask(
    String workspaceId,
    String taskId,
    int version,
  ) async {
    final response = await _client.request(
      'business/tasks/$taskId/complete',
      method: 'POST',
      queryParameters: <String, dynamic>{
        'workspace_id': workspaceId,
        'version': version,
      },
    );
    return BusinessResource.fromJson(
      requireObject(response.data, 'completed task'),
    );
  }

  @override
  Future<List<BusinessResource>> calendar(
    String workspaceId, {
    required DateTime start,
    required DateTime end,
  }) => _tenantList(
    'business/calendar/events',
    workspaceId,
    additionalQuery: <String, dynamic>{
      'start': start.toUtc().toIso8601String(),
      'end': end.toUtc().toIso8601String(),
    },
  );

  @override
  Future<BusinessResource> createCalendarEvent(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate('business/calendar/events', workspaceId, payload);

  @override
  Future<List<BusinessResource>> folders(String workspaceId) =>
      _tenantList('business/documents/folders', workspaceId);

  @override
  Future<BusinessResource> createFolder(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate('business/documents/folders', workspaceId, payload);

  @override
  Future<List<BusinessResource>> documents(String workspaceId) =>
      _tenantList('business/documents', workspaceId);

  @override
  Future<BusinessResource> createDocument(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate('business/documents', workspaceId, payload);

  @override
  Future<JsonObject> document(String workspaceId, String documentId) async {
    final response = await _client.request(
      'business/documents/$documentId',
      queryParameters: <String, dynamic>{'workspace_id': workspaceId},
    );
    final json = requireObject(response.data, 'business document');
    requireString(json, 'id');
    requireString(json, 'workspace_id');
    requireString(json, 'title');
    requireList(json, 'versions');
    return json;
  }

  @override
  Future<JsonObject> requestDocumentUpload(
    String workspaceId,
    String documentId,
    JsonObject payload,
  ) async {
    final response = await _client.request(
      'business/documents/$documentId/versions',
      method: 'POST',
      queryParameters: <String, dynamic>{'workspace_id': workspaceId},
      data: payload,
    );
    final json = requireObject(response.data, 'document upload capability');
    requireString(json, 'version_id');
    requireString(json, 'object_key');
    requireString(json, 'upload_url');
    requireObject(json['headers'], 'document upload headers');
    requireInt(json, 'expires_in_seconds');
    return json;
  }

  @override
  Future<BusinessResource> verifyDocumentVersion(
    String workspaceId,
    String documentId,
    String versionId,
  ) async {
    final response = await _client.request(
      'business/documents/$documentId/versions/$versionId/verify',
      method: 'POST',
      queryParameters: <String, dynamic>{'workspace_id': workspaceId},
    );
    return BusinessResource.fromJson(
      requireObject(response.data, 'document version'),
      labelKeys: const ['version_number', 'upload_state'],
    );
  }

  @override
  Future<JsonObject> downloadDocument(
    String workspaceId,
    String documentId,
  ) async {
    final response = await _client.request(
      'business/documents/$documentId/download',
      queryParameters: <String, dynamic>{'workspace_id': workspaceId},
    );
    final json = requireObject(response.data, 'document download');
    requireString(json, 'download_url');
    requireInt(json, 'expires_in_seconds');
    requireString(json, 'version_id');
    return json;
  }

  @override
  Future<BusinessResource> requestDocumentApproval(
    String workspaceId,
    String documentId,
    JsonObject payload,
  ) => _tenantCreate(
    'business/documents/$documentId/approvals',
    workspaceId,
    payload,
  );

  @override
  Future<BusinessResource> decideDocumentApproval(
    String workspaceId,
    String documentId,
    String approvalId,
    JsonObject payload,
  ) => _tenantCreate(
    'business/documents/$documentId/approvals/$approvalId/decision',
    workspaceId,
    payload,
  );

  @override
  Future<List<BusinessResource>> budgets(String workspaceId) =>
      _tenantList('business/finance/budgets', workspaceId);

  @override
  Future<BusinessResource> createBudget(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate('business/finance/budgets', workspaceId, payload);

  @override
  Future<List<BusinessResource>> expenses(String workspaceId) => _tenantList(
    'business/finance/expenses',
    workspaceId,
    labelKeys: const ['vendor'],
  );

  @override
  Future<BusinessResource> createExpense(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate(
    'business/finance/expenses',
    workspaceId,
    payload,
    labelKeys: const ['vendor'],
  );

  @override
  Future<BusinessResource> submitExpense(
    String workspaceId,
    String expenseId,
  ) => _tenantCreate(
    'business/finance/expenses/$expenseId/submit',
    workspaceId,
    const <String, dynamic>{},
    labelKeys: const ['vendor'],
  );

  @override
  Future<List<BusinessResource>> invoices(String workspaceId) => _tenantList(
    'business/finance/invoices',
    workspaceId,
    labelKeys: const ['number'],
  );

  @override
  Future<BusinessResource> createInvoice(
    String workspaceId,
    JsonObject payload,
  ) => _tenantCreate(
    'business/finance/invoices',
    workspaceId,
    payload,
    labelKeys: const ['number'],
  );

  @override
  Future<BusinessResource> sendInvoice(String workspaceId, String invoiceId) =>
      _tenantCreate(
        'business/finance/invoices/$invoiceId/send',
        workspaceId,
        const <String, dynamic>{},
        labelKeys: const ['number'],
      );

  @override
  Future<FinanceReport> financeReport(String workspaceId) async {
    final response = await _client.request(
      'business/reports/finance',
      queryParameters: <String, dynamic>{'workspace_id': workspaceId},
    );
    return FinanceReport.fromJson(
      requireObject(response.data, 'finance report'),
    );
  }

  Future<List<BusinessResource>> _list(
    String path, {
    List<String>? labelKeys,
  }) async {
    final response = await _client.request(path);
    return _objects(response.data, path)
        .map(
          (json) => BusinessResource.fromJson(
            json,
            labelKeys: labelKeys ?? const ['name', 'title', 'email', 'status'],
          ),
        )
        .toList(growable: false);
  }

  Future<BusinessResource> _create(
    String path,
    JsonObject payload, {
    List<String>? labelKeys,
  }) async {
    final response = await _client.request(path, method: 'POST', data: payload);
    return BusinessResource.fromJson(
      requireObject(response.data, path),
      labelKeys: labelKeys ?? const ['name', 'title', 'email', 'status'],
    );
  }

  Future<List<BusinessResource>> _tenantList(
    String path,
    String workspaceId, {
    List<String>? labelKeys,
    JsonObject? additionalQuery,
  }) async {
    final response = await _client.request(
      path,
      queryParameters: <String, dynamic>{
        'workspace_id': workspaceId,
        ...?additionalQuery,
      },
    );
    return _objects(response.data, path)
        .map(
          (json) => BusinessResource.fromJson(
            json,
            labelKeys:
                labelKeys ??
                const ['name', 'title', 'number', 'email', 'status'],
          ),
        )
        .toList(growable: false);
  }

  Future<BusinessResource> _tenantCreate(
    String path,
    String workspaceId,
    JsonObject payload, {
    List<String>? labelKeys,
  }) async {
    final response = await _client.request(
      path,
      method: 'POST',
      queryParameters: <String, dynamic>{'workspace_id': workspaceId},
      data: payload,
    );
    return BusinessResource.fromJson(
      requireObject(response.data, path),
      labelKeys:
          labelKeys ?? const ['name', 'title', 'number', 'email', 'status'],
    );
  }

  Future<CursorPage<BusinessResource>> _page(
    String path,
    String workspaceId, {
    String? query,
    String? cursor,
    List<String>? labelKeys,
    JsonObject? additionalQuery,
  }) async {
    final response = await _client.request(
      path,
      queryParameters: <String, dynamic>{
        'workspace_id': workspaceId,
        'q': query,
        'cursor': cursor,
        ...?additionalQuery,
      },
    );
    return CursorPage<BusinessResource>.fromJson(
      requireObject(response.data, path),
      (json) => BusinessResource.fromJson(
        json,
        labelKeys:
            labelKeys ?? const ['name', 'title', 'number', 'email', 'status'],
      ),
    );
  }
}

Map<String, String> _boundedSummary(JsonObject json) {
  final result = <String, String>{};
  for (final entry in json.entries) {
    if (entry.key == 'id' ||
        entry.key == 'workspace_id' ||
        entry.key == 'name' ||
        entry.key == 'title') {
      continue;
    }
    final value = entry.value;
    if (value == null || value is String || value is num || value is bool) {
      result[entry.key] = value?.toString() ?? '—';
    }
    if (result.length == 8) {
      break;
    }
  }
  return Map<String, String>.unmodifiable(result);
}

List<Map<String, String>> _reportRows(JsonObject json, String key) =>
    requireList(json, key)
        .map(
          (value) => Map<String, String>.unmodifiable(
            requireObject(
              value,
              '$key row',
            ).map((rowKey, rowValue) => MapEntry(rowKey, rowValue.toString())),
          ),
        )
        .toList(growable: false);

List<JsonObject> _objects(Object? value, String context) {
  if (value is! List<dynamic>) {
    throw FormatException('$context must be a JSON array.');
  }
  return value
      .map((item) => requireObject(item, '$context item'))
      .toList(growable: false);
}

final businessRepositoryProvider = Provider<BusinessRepository>(
  (ref) => DioBusinessRepository(ref.watch(apiClientProvider)),
);
