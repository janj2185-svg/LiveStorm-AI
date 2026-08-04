import 'dart:typed_data';

import 'package:sylora/core/api.dart';
import 'package:sylora/core/models.dart';
import 'package:sylora/features/auth/auth.dart';
import 'package:sylora/features/platform/repositories.dart';

final class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.loginError});

  final Object? loginError;

  static const _user = UserAccount(
    id: 'user-id',
    email: 'person@example.test',
    status: 'active',
    roles: <String>['user'],
  );

  @override
  Future<AuthMethods> authMethods() async => const AuthMethods(
    phone: false,
    email: true,
    tiktok: false,
    facebook: false,
    google: false,
    apple: false,
  );

  @override
  Future<UserAccount?> restore() async => null;

  @override
  Future<LoginResult> login({
    required String email,
    required String password,
    required String deviceLabel,
  }) async {
    if (loginError != null) {
      throw loginError!;
    }
    return const LoginResult.authenticated(_user);
  }

  @override
  Future<OtpStartResult> startPhoneOtp(String phone) async =>
      const OtpStartResult();

  @override
  Future<UserAccount> verifyPhoneOtp({
    required String phone,
    required String code,
    required String deviceLabel,
  }) async => _user;

  @override
  Future<OtpStartResult> startEmailOtp(String email) async =>
      const OtpStartResult();

  @override
  Future<UserAccount> verifyEmailOtp({
    required String email,
    required String code,
    required String deviceLabel,
  }) async => _user;

  @override
  Future<UserAccount> completeOAuthSession() async => _user;

  @override
  Future<List<String>> confirmTotp(String code) async => <String>[];

  @override
  Future<void> consumeEmailVerification(String token) async {}

  @override
  Future<void> consumePasswordReset(String token, String password) async {}

  @override
  Future<void> disableTotp({required String code, String? password}) async {}

  @override
  Future<void> logout() async {}

  @override
  Future<void> logoutAll() async {}

  @override
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String displayName,
    required String deviceLabel,
  }) async => const RegisterResult(status: 'registered_verified');

  @override
  Future<DeliveryHint> requestEmailVerification(String email) async =>
      const DeliveryHint();

  @override
  Future<DeliveryHint> requestPasswordReset(String email) async =>
      const DeliveryHint();

  @override
  Future<void> revokeSession(String id) async {}

  @override
  Future<List<SessionModel>> sessions() async => <SessionModel>[];

  @override
  Future<JsonObject> setupTotp() async => <String, dynamic>{};

  @override
  Future<UserAccount> verifyMfa({
    required String challengeToken,
    required String code,
    required String deviceLabel,
  }) async => _user;
}

final class FakeWalletRepository implements WalletRepository {
  FakeWalletRepository({this.paymentError});

  final Object? paymentError;

  static const walletBalance = WalletBalance(
    assetCode: 'LUMEN',
    spendableMinor: 0,
    accountId: 'account-id',
  );

  @override
  Future<WalletBalance> balance() async => walletBalance;

  @override
  Future<WalletBalance> creatorEarnings() async => walletBalance;

  @override
  Future<CursorPage<LedgerTransactionModel>> transactions({
    String? cursor,
  }) async => const CursorPage<LedgerTransactionModel>(
    items: <LedgerTransactionModel>[],
    nextCursor: null,
  );

  @override
  Future<PaymentOperationModel> payout({
    required int amountMinor,
    required String settlementCurrency,
    required String destinationReference,
  }) async {
    if (paymentError != null) {
      throw paymentError!;
    }
    return const PaymentOperationModel(
      id: 'operation-id',
      type: 'payout',
      status: 'pending',
      provider: 'configured',
      amountMinor: 100,
    );
  }

  @override
  Future<PaymentOperationModel> topUp({
    required int amountMinor,
    required String settlementCurrency,
    required String returnUrl,
  }) async {
    if (paymentError != null) {
      throw paymentError!;
    }
    return const PaymentOperationModel(
      id: 'operation-id',
      type: 'topup',
      status: 'pending',
      provider: 'configured',
      amountMinor: 100,
    );
  }
}

final class FakeAiRepository implements AiRepository {
  FakeAiRepository({required this.consent, required this.chatAvailable});

  bool consent;
  final bool chatAvailable;
  int settingsUpdates = 0;

  @override
  Future<AiSettingsModel> settings() async => AiSettingsModel(
    consentGranted: consent,
    memoryEnabled: false,
    preferredLocale: 'en',
    capabilityFlags: const <String, bool>{},
  );

  @override
  Future<AiProviderStatus> providerStatus() async => AiProviderStatus(
    capabilities: <String, bool>{'chat': chatAvailable},
    providerNames: chatAvailable
        ? const <String>['provider']
        : const <String>[],
  );

  @override
  Future<AiSettingsModel> updateSettings(JsonObject patch) async {
    settingsUpdates += 1;
    consent = patch['consent_granted'] as bool? ?? consent;
    return settings();
  }

  @override
  Future<CursorPage<AiConversationModel>> conversations({
    String? cursor,
  }) async => const CursorPage<AiConversationModel>(
    items: <AiConversationModel>[],
    nextCursor: null,
  );

  @override
  Future<JsonObject> usageSummary() async => <String, dynamic>{
    'total_units': 0,
  };

  @override
  Future<AiConversationModel> createConversation({
    String? title,
    String purpose = 'general',
  }) async => AiConversationModel(
    id: 'conversation-id',
    title: title,
    mode: 'copilot',
    purpose: purpose,
    locale: 'en',
  );

  @override
  Future<AiConversationModel> conversation(String id) async =>
      AiConversationModel(
        id: id,
        title: null,
        mode: 'copilot',
        purpose: 'general',
        locale: 'en',
      );

  @override
  Future<JsonObject> createJob(JsonObject typedRequest) async =>
      <String, dynamic>{};

  @override
  Future<JsonObject> createMemory(String kind, String content) async =>
      <String, dynamic>{};

  @override
  Future<void> deleteMemory(String id) async {}

  @override
  Future<JsonObject> exportMemory() async => <String, dynamic>{
    'items': <Object>[],
  };

  @override
  Future<CursorPage<NamedResource>> jobs({String? cursor}) async =>
      const CursorPage<NamedResource>(
        items: <NamedResource>[],
        nextCursor: null,
      );

  @override
  Future<List<NamedResource>> memory() async => <NamedResource>[];

  @override
  Future<CursorPage<AiMessageModel>> messages(
    String conversationId, {
    String? cursor,
  }) async => const CursorPage<AiMessageModel>(
    items: <AiMessageModel>[],
    nextCursor: null,
  );

  @override
  Future<JsonObject> moderate(String text) async => <String, dynamic>{};

  @override
  Future<List<AiToolProposalModel>> proposals(String conversationId) async =>
      <AiToolProposalModel>[];

  @override
  Future<AiMessageModel> send(String conversationId, String content) async =>
      const AiMessageModel(
        id: 'message-id',
        role: 'assistant',
        content: 'response',
        status: 'completed',
        citations: <AiCitationModel>[],
        proposals: <AiToolProposalModel>[],
      );

  @override
  Future<JsonObject> toolAction(
    String conversationId,
    String proposalId,
    String action,
  ) async => <String, dynamic>{};

  @override
  Future<JsonObject> translate(
    String text,
    String sourceLanguage,
    String targetLanguage,
  ) async => <String, dynamic>{};

  @override
  Future<JsonObject> transcribeAudio(
    Uint8List audio, {
    required String filename,
    required String contentType,
    String? language,
  }) async => <String, dynamic>{'text': 'Captioned test audio.'};

  @override
  Future<JsonObject> job(String id) async => <String, dynamic>{
    'id': id,
    'status': 'succeeded',
    'output_refs': <JsonObject>[
      <String, dynamic>{'content_type': 'audio/mpeg'},
    ],
  };

  @override
  Future<JsonObject> jobOutput(String id, {int outputIndex = 0}) async =>
      <String, dynamic>{
        'playback_url': 'https://example.test/aura-reply.mp3',
        'content_type': 'audio/mpeg',
        'expires_in_seconds': 900,
      };

  @override
  Future<JsonObject> auraPresence() async => <String, dynamic>{};
}
