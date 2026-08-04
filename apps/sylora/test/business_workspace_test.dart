import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/api.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/core/models.dart';
import 'package:sylora/features/business/business_repository.dart';
import 'package:sylora/features/business/business_screens.dart';

void main() {
  testWidgets('contacts expose focused navigation and create empty state', (
    tester,
  ) async {
    await tester.pumpWidget(
      _material(
        repository: _BusinessRepository(),
        child: const BusinessAreaScreen(
          workspaceId: 'workspace-id',
          area: 'contacts',
        ),
      ),
    );
    await _pumpUi(tester);

    expect(find.text('Workspace modules'), findsOneWidget);
    expect(find.text('Contacts'), findsWidgets);
    expect(find.text('Deals'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('No contacts yet'), findsOneWidget);
    expect(find.text('Create first contact'), findsOneWidget);
    expect(find.byTooltip('Aura Business'), findsOneWidget);
  });

  testWidgets('deal creation selects a real pipeline stage', (tester) async {
    final repository = _BusinessRepository(
      stages: const <BusinessResource>[
        BusinessResource(
          id: 'stage-qualified',
          label: 'Qualified',
          summary: <String, String>{},
        ),
      ],
    );
    await tester.pumpWidget(
      _material(
        repository: repository,
        child: const BusinessAreaScreen(
          workspaceId: 'workspace-id',
          area: 'deals',
        ),
      ),
    );
    await _pumpUi(tester);

    final createDeal = find.text('Create first deal');
    await tester.ensureVisible(createDeal);
    await _pumpUi(tester);
    await tester.tap(createDeal);
    await _pumpUi(tester);
    expect(find.text('Pipeline stage'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Name'),
      'Renewal',
    );
    await tester.tap(find.text('Pipeline stage'));
    await _pumpUi(tester);
    await tester.tap(find.text('Qualified').last);
    await _pumpUi(tester);
    await tester.tap(find.text('Submit'));
    await _pumpUi(tester);

    expect(repository.createdDeal?['stage_id'], 'stage-qualified');
    expect(repository.createdDeal?['name'], 'Renewal');
  });

  testWidgets('accounting export fails closed with provider detail', (
    tester,
  ) async {
    await tester.pumpWidget(
      _material(
        repository: _BusinessRepository(accountingUnavailable: true),
        child: const BusinessAreaScreen(
          workspaceId: 'workspace-id',
          area: 'finance',
        ),
      ),
    );
    await _pumpUi(tester);

    final export = find.text('Export finance records');
    await tester.ensureVisible(export);
    await _pumpUi(tester);
    await tester.tap(export);
    await _pumpUi(tester);

    expect(
      find.textContaining('No real accounting provider is configured'),
      findsOneWidget,
    );
    expect(find.textContaining('No export was queued'), findsOneWidget);
  });

  testWidgets('e-signature request fails closed with provider detail', (
    tester,
  ) async {
    await tester.pumpWidget(
      _material(
        repository: _BusinessRepository(eSignatureUnavailable: true),
        child: const BusinessDocumentScreen(
          workspaceId: 'workspace-id',
          documentId: 'document-id',
        ),
      ),
    );
    await _pumpUi(tester);

    final request = find.text('Request e-signatures');
    await tester.ensureVisible(request);
    await _pumpUi(tester);
    await tester.tap(request);
    await _pumpUi(tester);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Signer emails (comma separated)'),
      'signer@example.test',
    );
    await tester.tap(find.text('Submit'));
    await _pumpUi(tester);

    expect(
      find.textContaining('No real e-signature provider is configured'),
      findsOneWidget,
    );
    expect(
      find.textContaining('No signature request was queued'),
      findsOneWidget,
    );
  });
}

Future<void> _pumpUi(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 700));
}

Widget _material({
  required BusinessRepository repository,
  required Widget child,
}) => ProviderScope(
  overrides: <Override>[
    businessRepositoryProvider.overrideWithValue(repository),
  ],
  child: MaterialApp(theme: LumenTheme.light(), home: child),
);

final class _BusinessRepository implements BusinessRepository {
  _BusinessRepository({
    this.stages = const <BusinessResource>[],
    this.accountingUnavailable = false,
    this.eSignatureUnavailable = false,
  });

  final List<BusinessResource> stages;
  final bool accountingUnavailable;
  final bool eSignatureUnavailable;
  JsonObject? createdDeal;

  @override
  Future<CursorPage<BusinessResource>> contacts(
    String workspaceId, {
    String? query,
    String? cursor,
  }) async => const CursorPage<BusinessResource>(
    items: <BusinessResource>[],
    nextCursor: null,
  );

  @override
  Future<List<BusinessResource>> pipelineStages(String workspaceId) async =>
      stages;

  @override
  Future<CursorPage<BusinessResource>> deals(
    String workspaceId, {
    String? query,
    String? cursor,
  }) async => const CursorPage<BusinessResource>(
    items: <BusinessResource>[],
    nextCursor: null,
  );

  @override
  Future<BusinessResource> createDeal(
    String workspaceId,
    JsonObject payload,
  ) async {
    createdDeal = payload;
    return BusinessResource(
      id: 'deal-id',
      label: payload['name']! as String,
      summary: const <String, String>{},
    );
  }

  @override
  Future<List<BusinessResource>> budgets(String workspaceId) async =>
      const <BusinessResource>[];

  @override
  Future<List<BusinessResource>> expenses(String workspaceId) async =>
      const <BusinessResource>[];

  @override
  Future<List<BusinessResource>> invoices(String workspaceId) async =>
      const <BusinessResource>[];

  @override
  Future<FinanceReport> financeReport(String workspaceId) async =>
      const FinanceReport(
        expenses: <Map<String, String>>[],
        invoices: <Map<String, String>>[],
        budgets: <Map<String, String>>[],
        basis: 'persisted_business_records',
      );

  @override
  Future<JsonObject> exportToAccounting(String workspaceId) async {
    if (accountingUnavailable) {
      throw const ApiProblem(
        status: 503,
        code: 'accounting_provider_unavailable',
        title: 'Accounting provider unavailable',
        detail:
            'No real accounting provider is configured for this deployment.',
      );
    }
    return <String, dynamic>{
      'status': 'queued',
      'provider_operation_id': 'operation-id',
    };
  }

  @override
  Future<JsonObject> document(String workspaceId, String documentId) async =>
      <String, dynamic>{
        'id': documentId,
        'workspace_id': workspaceId,
        'title': 'Customer agreement',
        'classification': 'confidential',
        'state': 'draft',
        'current_version_id': 'version-id',
        'versions': <JsonObject>[],
        'approvals': <JsonObject>[],
      };

  @override
  Future<JsonObject> requestESignature(
    String workspaceId,
    String documentId,
    List<String> signerEmails,
  ) async {
    if (eSignatureUnavailable) {
      throw const ApiProblem(
        status: 503,
        code: 'esignature_provider_unavailable',
        title: 'E-signature provider unavailable',
        detail:
            'No real e-signature provider is configured for this deployment.',
      );
    }
    return <String, dynamic>{
      'status': 'queued',
      'provider_operation_id': 'operation-id',
    };
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
