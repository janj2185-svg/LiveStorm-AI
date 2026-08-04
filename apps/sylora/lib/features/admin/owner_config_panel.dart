import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import 'admin_repository.dart';

@immutable
final class OwnerFieldDescriptor {
  const OwnerFieldDescriptor({
    required this.key,
    required this.label,
    required this.envVar,
    required this.secret,
    required this.required,
    required this.kind,
    required this.configured,
    this.placeholder = '',
    this.helpText = '',
    this.defaultValue,
    this.publicValue,
  });

  factory OwnerFieldDescriptor.fromJson(JsonObject json) => OwnerFieldDescriptor(
    key: requireString(json, 'key'),
    label: requireString(json, 'label'),
    envVar: requireString(json, 'env_var'),
    secret: requireBool(json, 'secret'),
    required: requireBool(json, 'required'),
    kind: requireString(json, 'kind'),
    configured: requireBool(json, 'configured'),
    placeholder: optionalString(json, 'placeholder') ?? '',
    helpText: optionalString(json, 'help_text') ?? '',
    defaultValue: optionalString(json, 'default'),
    publicValue: optionalString(json, 'public_value'),
  );

  final String key;
  final String label;
  final String envVar;
  final bool secret;
  final bool required;
  final String kind;
  final bool configured;
  final String placeholder;
  final String helpText;
  final String? defaultValue;
  final String? publicValue;
}

@immutable
final class OwnerProviderSummary {
  const OwnerProviderSummary({
    required this.key,
    required this.name,
    required this.category,
    required this.description,
    required this.status,
    required this.enabled,
    required this.featureFlagKey,
    required this.relatedFeatures,
    required this.supportsLiveTest,
    required this.setupInstructions,
    required this.callbackUrls,
    required this.webhookUrls,
    required this.dnsRequirements,
    required this.fields,
    this.version,
    this.lastTestedAt,
    this.lastError,
  });

  factory OwnerProviderSummary.fromJson(JsonObject json) => OwnerProviderSummary(
    key: requireString(json, 'key'),
    name: requireString(json, 'name'),
    category: requireString(json, 'category'),
    description: requireString(json, 'description'),
    status: requireString(json, 'status'),
    enabled: requireBool(json, 'enabled'),
    featureFlagKey: requireString(json, 'feature_flag_key'),
    relatedFeatures: _strings(json, 'related_features'),
    supportsLiveTest: requireBool(json, 'supports_live_test'),
    setupInstructions: _strings(json, 'setup_instructions'),
    callbackUrls: _strings(json, 'callback_urls'),
    webhookUrls: _strings(json, 'webhook_urls'),
    dnsRequirements: _strings(json, 'dns_requirements'),
    fields: requireList(json, 'fields')
        .map(
          (value) => OwnerFieldDescriptor.fromJson(
            requireObject(value, 'owner field'),
          ),
        )
        .toList(growable: false),
    version: json['version'] is int ? json['version'] as int : null,
    lastTestedAt: optionalDateTime(json, 'last_tested_at'),
    lastError: optionalString(json, 'last_error'),
  );

  final String key;
  final String name;
  final String category;
  final String description;
  final String status;
  final bool enabled;
  final String featureFlagKey;
  final List<String> relatedFeatures;
  final bool supportsLiveTest;
  final List<String> setupInstructions;
  final List<String> callbackUrls;
  final List<String> webhookUrls;
  final List<String> dnsRequirements;
  final List<OwnerFieldDescriptor> fields;
  final int? version;
  final DateTime? lastTestedAt;
  final String? lastError;
}

@immutable
final class OwnerCatalog {
  const OwnerCatalog({
    required this.domain,
    required this.providers,
    required this.connectedCount,
    required this.missingCount,
    required this.invalidCount,
  });

  factory OwnerCatalog.fromJson(JsonObject json) => OwnerCatalog(
    domain: requireString(json, 'domain'),
    providers: requireList(json, 'providers')
        .map(
          (value) => OwnerProviderSummary.fromJson(
            requireObject(value, 'owner provider'),
          ),
        )
        .toList(growable: false),
    connectedCount: requireInt(json, 'connected_count'),
    missingCount: requireInt(json, 'missing_count'),
    invalidCount: requireInt(json, 'invalid_count'),
  );

  final String domain;
  final List<OwnerProviderSummary> providers;
  final int connectedCount;
  final int missingCount;
  final int invalidCount;
}

@immutable
final class OwnerEnvExport {
  const OwnerEnvExport({
    required this.note,
    required this.files,
  });

  factory OwnerEnvExport.fromJson(JsonObject json) => OwnerEnvExport(
    note: requireString(json, 'note'),
    files: requireList(json, 'files')
        .map((value) {
          final file = requireObject(value, 'env file');
          return (
            filename: requireString(file, 'filename'),
            description: requireString(file, 'description'),
            content: requireString(file, 'content'),
          );
        })
        .toList(growable: false),
  );

  final String note;
  final List<({String filename, String description, String content})> files;
}

@immutable
final class OwnerTestResult {
  const OwnerTestResult({
    required this.message,
    required this.ok,
    required this.status,
    required this.enabled,
  });

  factory OwnerTestResult.fromJson(JsonObject json) => OwnerTestResult(
    message: requireString(json, 'message'),
    ok: requireBool(json, 'ok'),
    status: requireString(json, 'status'),
    enabled: requireBool(json, 'enabled'),
  );

  final String message;
  final bool ok;
  final String status;
  final bool enabled;
}

List<String> _strings(JsonObject json, String key) {
  final value = json[key];
  if (value is! List) {
    return const <String>[];
  }
  return value.whereType<String>().toList(growable: false);
}

final _ownerCatalogProvider = FutureProvider.autoDispose<OwnerCatalog>((
  ref,
) async {
  final repository = ref.watch(adminRepositoryProvider);
  final json = await repository.ownerConfigCatalogRaw();
  return OwnerCatalog.fromJson(json);
});

final class OwnerConfigPanel extends ConsumerWidget {
  const OwnerConfigPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_ownerCatalogProvider);
    return LumenAsyncView<OwnerCatalog>(
      value: async,
      onRetry: () => ref.invalidate(_ownerCatalogProvider),
      data: (catalog) => _OwnerCatalogView(
        catalog: catalog,
        onChanged: () => ref.invalidate(_ownerCatalogProvider),
      ),
    );
  }
}

final class _OwnerCatalogView extends StatelessWidget {
  const _OwnerCatalogView({required this.catalog, required this.onChanged});

  final OwnerCatalog catalog;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      children: <Widget>[
        Text(
          'Owner services',
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: 6),
        Text(
          'Paste credentials after deployment. Secrets are encrypted with '
          'DATA_ENCRYPTION_KEY, never returned to the client, and never '
          'hardcoded in source. Domain: ${catalog.domain}',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: <Widget>[
            Chip(label: Text('Connected ${catalog.connectedCount}')),
            Chip(label: Text('Invalid ${catalog.invalidCount}')),
            Chip(label: Text('Missing ${catalog.missingCount}')),
            TextButton.icon(
              onPressed: () => _exportEnv(context),
              icon: const Icon(Icons.download_rounded),
              label: const Text('Generate .env files'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        for (final provider in catalog.providers)
          _OwnerProviderTile(
            provider: provider,
            onChanged: onChanged,
          ),
      ],
    );
  }

  Future<void> _exportEnv(BuildContext context) async {
    final container = ProviderScope.containerOf(context);
    final repository = container.read(adminRepositoryProvider);
    try {
      final export = OwnerEnvExport.fromJson(
        await repository.ownerConfigEnvExportRaw(),
      );
      if (!context.mounted) {
        return;
      }
      final buffer = StringBuffer();
      for (final file in export.files) {
        buffer.writeln('===== ${file.filename} =====');
        buffer.writeln(file.description);
        buffer.writeln(file.content);
        buffer.writeln();
      }
      await Clipboard.setData(ClipboardData(text: buffer.toString()));
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(export.note)),
      );
    } catch (error) {
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }
}

final class _OwnerProviderTile extends ConsumerStatefulWidget {
  const _OwnerProviderTile({
    required this.provider,
    required this.onChanged,
  });

  final OwnerProviderSummary provider;
  final VoidCallback onChanged;

  @override
  ConsumerState<_OwnerProviderTile> createState() => _OwnerProviderTileState();
}

final class _OwnerProviderTileState extends ConsumerState<_OwnerProviderTile> {
  final Map<String, TextEditingController> _controllers =
      <String, TextEditingController>{};
  bool _expanded = false;
  bool _busy = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    for (final field in widget.provider.fields) {
      final initial = field.secret
          ? ''
          : (field.publicValue ?? field.defaultValue ?? '');
      _controllers[field.key] = TextEditingController(text: initial);
    }
  }

  @override
  void didUpdateWidget(covariant _OwnerProviderTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.provider.version != widget.provider.version) {
      for (final field in widget.provider.fields) {
        if (field.secret) {
          continue;
        }
        final controller = _controllers[field.key];
        if (controller == null) {
          continue;
        }
        final next = field.publicValue ?? field.defaultValue ?? '';
        if (controller.text != next) {
          controller.text = next;
        }
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Color _statusColor(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return switch (widget.provider.status) {
      'connected' => scheme.primary,
      'invalid' => scheme.error,
      _ => scheme.outline,
    };
  }

  Future<void> _save({required bool test}) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    final values = <String, dynamic>{};
    for (final field in widget.provider.fields) {
      final text = _controllers[field.key]?.text.trim() ?? '';
      if (text.isEmpty) {
        continue;
      }
      if (field.kind == 'boolean') {
        values[field.key] = text.toLowerCase() == 'true' || text == '1';
      } else if (field.kind == 'number') {
        values[field.key] = text;
      } else {
        values[field.key] = text;
      }
    }
    try {
      final repository = ref.read(adminRepositoryProvider);
      final updated = OwnerProviderSummary.fromJson(
        await repository.upsertOwnerProviderRaw(
          widget.provider.key,
          values: values,
          expectedVersion: widget.provider.version,
          testConnection: test,
          enableOnSuccess: true,
        ),
      );
      setState(() {
        _message =
            '${updated.status.toUpperCase()} · enabled=${updated.enabled}';
        _busy = false;
      });
      widget.onChanged();
    } catch (error) {
      setState(() {
        _message = '$error';
        _busy = false;
      });
    }
  }

  Future<void> _testOnly() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final repository = ref.read(adminRepositoryProvider);
      final result = OwnerTestResult.fromJson(
        await repository.testOwnerProviderRaw(widget.provider.key),
      );
      setState(() {
        _message = result.message;
        _busy = false;
      });
      widget.onChanged();
    } catch (error) {
      setState(() {
        _message = '$error';
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = widget.provider;
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ExpansionTile(
        initiallyExpanded: _expanded,
        onExpansionChanged: (value) => setState(() => _expanded = value),
        leading: Icon(Icons.hub_outlined, color: _statusColor(context)),
        title: Text(provider.name),
        subtitle: Text(
          '${provider.status.toUpperCase()}'
          '${provider.enabled ? ' · feature on' : ''}'
          ' · ${provider.category}',
        ),
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(provider.description),
                if (provider.relatedFeatures.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: <Widget>[
                      for (final feature in provider.relatedFeatures)
                        Chip(label: Text(feature)),
                    ],
                  ),
                ],
                if (provider.lastError != null) ...<Widget>[
                  const SizedBox(height: 8),
                  Text(
                    provider.lastError!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Text('Credentials', style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                for (final field in provider.fields) ...<Widget>[
                  TextFormField(
                    controller: _controllers[field.key],
                    obscureText: field.secret,
                    maxLines: field.kind == 'textarea' || field.kind == 'json'
                        ? 5
                        : 1,
                    decoration: InputDecoration(
                      labelText:
                          '${field.label}${field.required ? ' *' : ''}',
                      hintText: field.secret && field.configured
                          ? '•••• configured — paste to rotate'
                          : field.placeholder,
                      helperText: field.helpText.isEmpty
                          ? field.envVar
                          : '${field.envVar} · ${field.helpText}',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                if (provider.setupInstructions.isNotEmpty) ...<Widget>[
                  Text('Setup instructions', style: theme.textTheme.titleSmall),
                  const SizedBox(height: 6),
                  for (final step in provider.setupInstructions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('• $step'),
                    ),
                ],
                if (provider.callbackUrls.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 8),
                  Text('Callback URLs', style: theme.textTheme.titleSmall),
                  for (final url in provider.callbackUrls)
                    SelectableText(url),
                ],
                if (provider.webhookUrls.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 8),
                  Text('Webhook URLs', style: theme.textTheme.titleSmall),
                  for (final url in provider.webhookUrls)
                    SelectableText(url),
                ],
                if (provider.dnsRequirements.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 8),
                  Text('DNS', style: theme.textTheme.titleSmall),
                  for (final item in provider.dnsRequirements)
                    Text('• $item'),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    FilledButton(
                      onPressed: _busy ? null : () => _save(test: true),
                      child: const Text('Save & validate'),
                    ),
                    if (provider.supportsLiveTest)
                      OutlinedButton(
                        onPressed: _busy ? null : _testOnly,
                        child: const Text('Test Connection'),
                      ),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => _save(test: false),
                      child: const Text('Save without test'),
                    ),
                  ],
                ),
                if (_busy) ...<Widget>[
                  const SizedBox(height: 10),
                  const LinearProgressIndicator(),
                ],
                if (_message != null) ...<Widget>[
                  const SizedBox(height: 8),
                  Text(_message!),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
