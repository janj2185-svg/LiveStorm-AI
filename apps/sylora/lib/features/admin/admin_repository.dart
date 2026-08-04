import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../auth/auth.dart';

@immutable
final class AdminUser {
  const AdminUser({
    required this.id,
    required this.email,
    required this.status,
    required this.roles,
    required this.createdAt,
    this.handle,
    this.displayName,
  });

  factory AdminUser.fromJson(JsonObject json) {
    final profileValue = json['profile'];
    final profile = profileValue == null
        ? null
        : requireObject(profileValue, 'admin user profile');
    return AdminUser(
      id: requireString(json, 'id'),
      email: requireString(json, 'email'),
      status: requireString(json, 'status'),
      roles: requireList(json, 'roles')
          .map(
            (value) => value is String
                ? value
                : throw const FormatException('user role must be a string.'),
          )
          .toList(growable: false),
      createdAt: requireDateTime(json, 'created_at'),
      handle: profile == null ? null : optionalString(profile, 'handle'),
      displayName: profile == null
          ? null
          : requireString(profile, 'display_name'),
    );
  }

  final String id;
  final String email;
  final String status;
  final List<String> roles;
  final DateTime createdAt;
  final String? handle;
  final String? displayName;
}

@immutable
final class AdminResource {
  const AdminResource({
    required this.id,
    required this.label,
    required this.summary,
    this.status,
  });

  factory AdminResource.fromJson(
    JsonObject json, {
    List<String> labelKeys = const <String>[
      'key',
      'action',
      'service',
      'status',
    ],
    List<String> statusKeys = const <String>['status', 'source'],
  }) {
    final id = requireString(json, 'id');
    String? label;
    for (final key in labelKeys) {
      final value = json[key];
      if (value is String && value.isNotEmpty) {
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
    return AdminResource(
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
final class FeatureFlag {
  const FeatureFlag({
    required this.id,
    required this.key,
    required this.environments,
    required this.enabled,
    required this.rolloutBps,
    required this.allowSubjects,
    required this.denySubjects,
    required this.version,
  });

  factory FeatureFlag.fromJson(JsonObject json) => FeatureFlag(
    id: requireString(json, 'id'),
    key: requireString(json, 'key'),
    environments: _strings(json, 'environments'),
    enabled: requireBool(json, 'enabled'),
    rolloutBps: requireInt(json, 'rollout_bps'),
    allowSubjects: _strings(json, 'allow_subjects'),
    denySubjects: _strings(json, 'deny_subjects'),
    version: requireInt(json, 'version'),
  );

  final String id;
  final String key;
  final List<String> environments;
  final bool enabled;
  final int rolloutBps;
  final List<String> allowSubjects;
  final List<String> denySubjects;
  final int version;
}

@immutable
final class PlatformSetting {
  const PlatformSetting({
    required this.id,
    required this.key,
    required this.version,
    required this.secret,
    required this.configured,
    this.value,
  });

  factory PlatformSetting.fromJson(JsonObject json) {
    final secret = requireBool(json, 'secret');
    final rawValue = json['value'];
    if (secret && rawValue != null) {
      throw const FormatException('Secret setting value must not be exposed.');
    }
    return PlatformSetting(
      id: requireString(json, 'id'),
      key: requireString(json, 'key'),
      version: requireInt(json, 'version'),
      secret: secret,
      configured: requireBool(json, 'configured'),
      value: rawValue == null
          ? null
          : requireObject(rawValue, 'platform setting value'),
    );
  }

  final String id;
  final String key;
  final int version;
  final bool secret;
  final bool configured;
  final JsonObject? value;
}

@immutable
final class AdminDashboard {
  const AdminDashboard({required this.sections, required this.basis});

  factory AdminDashboard.fromJson(JsonObject json) {
    final sections = <String, Map<String, String>>{};
    for (final entry in json.entries) {
      if (entry.key == 'basis') {
        continue;
      }
      final value = entry.value;
      if (value is Map) {
        final object = requireObject(value, '${entry.key} dashboard section');
        sections[entry.key] = Map<String, String>.unmodifiable(
          object.entries
              .where(
                (item) =>
                    item.value == null ||
                    item.value is String ||
                    item.value is num ||
                    item.value is bool,
              )
              .take(16)
              .fold(<String, String>{}, (result, item) {
                result[item.key] = item.value?.toString() ?? '—';
                return result;
              }),
        );
      }
    }
    return AdminDashboard(
      sections: Map<String, Map<String, String>>.unmodifiable(sections),
      basis: optionalString(json, 'basis'),
    );
  }

  final Map<String, Map<String, String>> sections;
  final String? basis;
}

abstract interface class AdminRepository {
  Future<CursorPage<AdminUser>> users({
    String? query,
    String? status,
    String? cursor,
  });
  Future<JsonObject> user(String id);
  Future<AdminUser> suspendUser(String id, String reason);
  Future<AdminUser> restoreUser(String id, String reason);
  Future<List<FeatureFlag>> featureFlags();
  Future<FeatureFlag> createFeatureFlag(JsonObject payload);
  Future<FeatureFlag> updateFeatureFlag(String key, JsonObject patch);
  Future<JsonObject> evaluateFeatureFlag(
    String key, {
    required String subject,
    required String environment,
  });
  Future<List<PlatformSetting>> settings();
  Future<PlatformSetting> updateSetting(
    String key, {
    required JsonObject value,
    required bool secret,
    int? expectedVersion,
  });
  Future<CursorPage<AdminResource>> audit({
    String? action,
    String? workspaceId,
    String? cursor,
  });
  Future<AdminDashboard> analytics();
  Future<List<AdminResource>> serviceHealth();
  Future<AdminDashboard> security();
  Future<JsonObject> moderationSummary();
  Future<CursorPage<AdminResource>> moderationReports({String? cursor});
}

final class DioAdminRepository implements AdminRepository {
  const DioAdminRepository(this._client);

  final ApiClient _client;

  @override
  Future<CursorPage<AdminUser>> users({
    String? query,
    String? status,
    String? cursor,
  }) async {
    final response = await _client.request(
      'admin/users',
      queryParameters: <String, dynamic>{
        'q': query,
        'status': status,
        'cursor': cursor,
      },
    );
    return CursorPage<AdminUser>.fromJson(
      requireObject(response.data, 'admin users'),
      AdminUser.fromJson,
    );
  }

  @override
  Future<JsonObject> user(String id) async {
    final response = await _client.request('admin/users/$id');
    final json = requireObject(response.data, 'admin user');
    AdminUser.fromJson(json);
    requireList(json, 'sessions');
    requireList(json, 'workspace_memberships');
    requireList(json, 'administration_actions');
    return json;
  }

  @override
  Future<AdminUser> suspendUser(String id, String reason) =>
      _userAction(id, 'suspend', reason);

  @override
  Future<AdminUser> restoreUser(String id, String reason) =>
      _userAction(id, 'restore', reason);

  Future<AdminUser> _userAction(String id, String action, String reason) async {
    final response = await _client.request(
      'admin/users/$id/$action',
      method: 'POST',
      data: <String, dynamic>{'reason': reason},
    );
    return AdminUser.fromJson(requireObject(response.data, 'admin user'));
  }

  @override
  Future<List<FeatureFlag>> featureFlags() async {
    final response = await _client.request('admin/feature-flags');
    return _objects(
      response.data,
      'feature flags',
    ).map(FeatureFlag.fromJson).toList(growable: false);
  }

  @override
  Future<FeatureFlag> createFeatureFlag(JsonObject payload) async {
    final response = await _client.request(
      'admin/feature-flags',
      method: 'POST',
      data: payload,
    );
    return FeatureFlag.fromJson(requireObject(response.data, 'feature flag'));
  }

  @override
  Future<FeatureFlag> updateFeatureFlag(String key, JsonObject patch) async {
    final response = await _client.request(
      'admin/feature-flags/$key',
      method: 'PATCH',
      data: patch,
    );
    return FeatureFlag.fromJson(requireObject(response.data, 'feature flag'));
  }

  @override
  Future<JsonObject> evaluateFeatureFlag(
    String key, {
    required String subject,
    required String environment,
  }) async {
    final response = await _client.request(
      'admin/feature-flags/$key/evaluate',
      method: 'POST',
      data: <String, dynamic>{'subject': subject, 'environment': environment},
    );
    final json = requireObject(response.data, 'feature flag evaluation');
    requireString(json, 'key');
    requireBool(json, 'enabled');
    requireString(json, 'reason');
    requireInt(json, 'bucket');
    requireInt(json, 'rollout_bps');
    requireInt(json, 'version');
    requireString(json, 'environment');
    return json;
  }

  @override
  Future<List<PlatformSetting>> settings() async {
    final response = await _client.request('admin/settings');
    return _objects(
      response.data,
      'platform settings',
    ).map(PlatformSetting.fromJson).toList(growable: false);
  }

  @override
  Future<PlatformSetting> updateSetting(
    String key, {
    required JsonObject value,
    required bool secret,
    int? expectedVersion,
  }) async {
    final response = await _client.request(
      'admin/settings/$key',
      method: 'PUT',
      data: <String, dynamic>{
        'expected_version': expectedVersion,
        'value': value,
        'secret': secret,
      },
    );
    return PlatformSetting.fromJson(
      requireObject(response.data, 'platform setting'),
    );
  }

  @override
  Future<CursorPage<AdminResource>> audit({
    String? action,
    String? workspaceId,
    String? cursor,
  }) async {
    final response = await _client.request(
      'admin/audit',
      queryParameters: <String, dynamic>{
        'action': action,
        'workspace_id': workspaceId,
        'cursor': cursor,
      },
    );
    return CursorPage<AdminResource>.fromJson(
      requireObject(response.data, 'admin audit'),
      (json) => AdminResource.fromJson(
        json,
        labelKeys: const ['action'],
        statusKeys: const ['source'],
      ),
    );
  }

  @override
  Future<AdminDashboard> analytics() async {
    final response = await _client.request('admin/analytics');
    return AdminDashboard.fromJson(
      requireObject(response.data, 'admin analytics'),
    );
  }

  @override
  Future<List<AdminResource>> serviceHealth() async {
    final response = await _client.request('admin/service-health');
    final json = requireObject(response.data, 'service health');
    requireString(json, 'scope');
    requireBool(json, 'prometheus_replacement');
    return requireList(json, 'reports')
        .map(
          (value) => AdminResource.fromJson(
            requireObject(value, 'service health report'),
            labelKeys: const ['service'],
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<AdminDashboard> security() async {
    final response = await _client.request('admin/security');
    return AdminDashboard.fromJson(
      requireObject(response.data, 'security dashboard'),
    );
  }

  @override
  Future<JsonObject> moderationSummary() async {
    final response = await _client.request('admin/moderation/summary');
    return requireObject(response.data, 'moderation summary');
  }

  @override
  Future<CursorPage<AdminResource>> moderationReports({String? cursor}) async {
    final response = await _client.request(
      'trust-safety/reports',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<AdminResource>.fromJson(
      requireObject(response.data, 'moderation reports'),
      (json) => AdminResource.fromJson(
        json,
        labelKeys: const <String>['reason', 'target_type', 'status'],
        statusKeys: const <String>['status'],
      ),
    );
  }
}

List<String> _strings(JsonObject json, String key) => requireList(json, key)
    .map(
      (value) => value is String
          ? value
          : throw FormatException('$key items must be strings.'),
    )
    .toList(growable: false);

Map<String, String> _boundedSummary(JsonObject json) {
  final result = <String, String>{};
  for (final entry in json.entries) {
    if (entry.key == 'id' || entry.key == 'key' || entry.key == 'action') {
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

List<JsonObject> _objects(Object? value, String context) {
  if (value is! List<dynamic>) {
    throw FormatException('$context must be a JSON array.');
  }
  return value
      .map((item) => requireObject(item, '$context item'))
      .toList(growable: false);
}

final adminRepositoryProvider = Provider<AdminRepository>(
  (ref) => DioAdminRepository(ref.watch(apiClientProvider)),
);
