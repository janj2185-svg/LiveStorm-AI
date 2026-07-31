import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../auth/auth.dart';

@immutable
final class Course {
  const Course({
    required this.id,
    required this.authorUserId,
    required this.slug,
    required this.category,
    required this.state,
    required this.settlementMethod,
    required this.title,
    required this.description,
    required this.learningObjectives,
    this.priceMinor,
    this.externalSettlementReference,
    this.productId,
    this.requiredSubscriptionTierId,
  });

  factory Course.fromJson(JsonObject json) => Course(
    id: requireString(json, 'id'),
    authorUserId: requireString(json, 'author_user_id'),
    slug: requireString(json, 'slug'),
    category: requireString(json, 'category'),
    state: requireString(json, 'state'),
    settlementMethod: requireString(json, 'settlement_method'),
    priceMinor: _optionalInt(json, 'price_minor'),
    externalSettlementReference: optionalString(
      json,
      'external_settlement_reference',
    ),
    productId: optionalString(json, 'product_id'),
    requiredSubscriptionTierId: optionalString(
      json,
      'required_subscription_tier_id',
    ),
    title: requireString(json, 'title'),
    description: requireString(json, 'description'),
    learningObjectives: requireList(json, 'learning_objectives')
        .map(
          (value) => value is String
              ? value
              : throw const FormatException(
                  'learning objective must be a string.',
                ),
        )
        .toList(growable: false),
  );

  final String id;
  final String authorUserId;
  final String slug;
  final String category;
  final String state;
  final String settlementMethod;
  final int? priceMinor;
  final String? externalSettlementReference;
  final String? productId;
  final String? requiredSubscriptionTierId;
  final String title;
  final String description;
  final List<String> learningObjectives;
}

@immutable
final class CourseModule {
  const CourseModule({
    required this.id,
    required this.courseVersionId,
    required this.title,
    required this.position,
    this.description,
  });

  factory CourseModule.fromJson(JsonObject json) => CourseModule(
    id: requireString(json, 'id'),
    courseVersionId: requireString(json, 'course_version_id'),
    title: requireString(json, 'title'),
    description: optionalString(json, 'description'),
    position: requireInt(json, 'position'),
  );

  final String id;
  final String courseVersionId;
  final String title;
  final String? description;
  final int position;
}

@immutable
final class LessonSummary {
  const LessonSummary({
    required this.id,
    required this.moduleId,
    required this.kind,
    required this.title,
    required this.position,
    required this.required,
    required this.requiredSeconds,
    required this.requiredHeartbeatSeconds,
    this.prerequisiteLessonId,
  });

  factory LessonSummary.fromJson(JsonObject json) => LessonSummary(
    id: requireString(json, 'id'),
    moduleId: requireString(json, 'module_id'),
    kind: requireString(json, 'kind'),
    title: requireString(json, 'title'),
    position: requireInt(json, 'position'),
    required: requireBool(json, 'required'),
    requiredSeconds: requireInt(json, 'required_seconds'),
    requiredHeartbeatSeconds: requireInt(json, 'required_heartbeat_seconds'),
    prerequisiteLessonId: optionalString(json, 'prerequisite_lesson_id'),
  );

  final String id;
  final String moduleId;
  final String kind;
  final String title;
  final int position;
  final bool required;
  final int requiredSeconds;
  final int requiredHeartbeatSeconds;
  final String? prerequisiteLessonId;
}

@immutable
final class Lesson extends LessonSummary {
  const Lesson({
    required super.id,
    required super.moduleId,
    required super.kind,
    required super.title,
    required super.position,
    required super.required,
    required super.requiredSeconds,
    required super.requiredHeartbeatSeconds,
    super.prerequisiteLessonId,
    this.body,
    this.contentItemId,
  });

  factory Lesson.fromJson(JsonObject json) => Lesson(
    id: requireString(json, 'id'),
    moduleId: requireString(json, 'module_id'),
    kind: requireString(json, 'kind'),
    title: requireString(json, 'title'),
    body: optionalString(json, 'body'),
    contentItemId: optionalString(json, 'content_item_id'),
    position: requireInt(json, 'position'),
    required: requireBool(json, 'required'),
    requiredSeconds: requireInt(json, 'required_seconds'),
    requiredHeartbeatSeconds: requireInt(json, 'required_heartbeat_seconds'),
    prerequisiteLessonId: optionalString(json, 'prerequisite_lesson_id'),
  );

  final String? body;
  final String? contentItemId;
}

@immutable
final class Curriculum {
  const Curriculum({required this.modules, required this.lessons});

  factory Curriculum.fromJson(JsonObject json) => Curriculum(
    modules: requireList(json, 'modules')
        .map(
          (value) =>
              CourseModule.fromJson(requireObject(value, 'course module')),
        )
        .toList(growable: false),
    lessons: requireList(json, 'lessons')
        .map(
          (value) =>
              LessonSummary.fromJson(requireObject(value, 'lesson summary')),
        )
        .toList(growable: false),
  );

  final List<CourseModule> modules;
  final List<LessonSummary> lessons;
}

@immutable
final class Enrollment {
  const Enrollment({
    required this.id,
    required this.userId,
    required this.courseId,
    required this.courseVersionId,
    required this.status,
    required this.settlementMethod,
    required this.enrolledAt,
    this.provider,
    this.providerOperationId,
    this.completedAt,
  });

  factory Enrollment.fromJson(JsonObject json) => Enrollment(
    id: requireString(json, 'id'),
    userId: requireString(json, 'user_id'),
    courseId: requireString(json, 'course_id'),
    courseVersionId: requireString(json, 'course_version_id'),
    status: requireString(json, 'status'),
    settlementMethod: requireString(json, 'settlement_method'),
    provider: optionalString(json, 'provider'),
    providerOperationId: optionalString(json, 'provider_operation_id'),
    enrolledAt: requireDateTime(json, 'enrolled_at'),
    completedAt: _optionalDateTime(json, 'completed_at'),
  );

  final String id;
  final String userId;
  final String courseId;
  final String courseVersionId;
  final String status;
  final String settlementMethod;
  final String? provider;
  final String? providerOperationId;
  final DateTime enrolledAt;
  final DateTime? completedAt;
}

@immutable
final class LessonProgress {
  const LessonProgress({
    required this.id,
    required this.enrollmentId,
    required this.lessonId,
    required this.state,
    required this.heartbeatSeconds,
    required this.lastPositionSeconds,
    this.startedAt,
    this.completedAt,
  });

  factory LessonProgress.fromJson(JsonObject json) => LessonProgress(
    id: requireString(json, 'id'),
    enrollmentId: requireString(json, 'enrollment_id'),
    lessonId: requireString(json, 'lesson_id'),
    state: requireString(json, 'state'),
    heartbeatSeconds: requireInt(json, 'heartbeat_seconds'),
    lastPositionSeconds: requireInt(json, 'last_position_seconds'),
    startedAt: _optionalDateTime(json, 'started_at'),
    completedAt: _optionalDateTime(json, 'completed_at'),
  );

  final String id;
  final String enrollmentId;
  final String lessonId;
  final String state;
  final int heartbeatSeconds;
  final int lastPositionSeconds;
  final DateTime? startedAt;
  final DateTime? completedAt;
}

@immutable
final class QuizOption {
  const QuizOption({
    required this.id,
    required this.text,
    required this.position,
  });

  factory QuizOption.fromJson(JsonObject json) => QuizOption(
    id: requireString(json, 'id'),
    text: requireString(json, 'text'),
    position: requireInt(json, 'position'),
  );

  final String id;
  final String text;
  final int position;
}

@immutable
final class QuizQuestion {
  const QuizQuestion({
    required this.id,
    required this.prompt,
    required this.position,
    required this.options,
  });

  factory QuizQuestion.fromJson(JsonObject json) => QuizQuestion(
    id: requireString(json, 'id'),
    prompt: requireString(json, 'prompt'),
    position: requireInt(json, 'position'),
    options: requireList(json, 'options')
        .map(
          (value) => QuizOption.fromJson(requireObject(value, 'quiz option')),
        )
        .toList(growable: false),
  );

  final String id;
  final String prompt;
  final int position;
  final List<QuizOption> options;
}

@immutable
final class PublicQuiz {
  const PublicQuiz({
    required this.id,
    required this.title,
    required this.attemptLimit,
    required this.questions,
  });

  factory PublicQuiz.fromJson(JsonObject json) => PublicQuiz(
    id: requireString(json, 'id'),
    title: requireString(json, 'title'),
    attemptLimit: requireInt(json, 'attempt_limit'),
    questions: requireList(json, 'questions')
        .map(
          (value) =>
              QuizQuestion.fromJson(requireObject(value, 'quiz question')),
        )
        .toList(growable: false),
  );

  final String id;
  final String title;
  final int attemptLimit;
  final List<QuizQuestion> questions;
}

@immutable
final class QuizAttempt {
  const QuizAttempt({
    required this.id,
    required this.enrollmentId,
    required this.quizId,
    required this.attemptNumber,
    required this.state,
    required this.startedAt,
    this.scorePercent,
    this.correctCount,
    this.questionCount,
    this.finalizedAt,
  });

  factory QuizAttempt.fromJson(JsonObject json) => QuizAttempt(
    id: requireString(json, 'id'),
    enrollmentId: requireString(json, 'enrollment_id'),
    quizId: requireString(json, 'quiz_id'),
    attemptNumber: requireInt(json, 'attempt_number'),
    state: requireString(json, 'state'),
    scorePercent: _optionalInt(json, 'score_percent'),
    correctCount: _optionalInt(json, 'correct_count'),
    questionCount: _optionalInt(json, 'question_count'),
    startedAt: requireDateTime(json, 'started_at'),
    finalizedAt: _optionalDateTime(json, 'finalized_at'),
  );

  final String id;
  final String enrollmentId;
  final String quizId;
  final int attemptNumber;
  final String state;
  final int? scorePercent;
  final int? correctCount;
  final int? questionCount;
  final DateTime startedAt;
  final DateTime? finalizedAt;
}

@immutable
final class Certificate {
  const Certificate({
    required this.id,
    required this.enrollmentId,
    required this.verificationCode,
    required this.recipientDisplayName,
    required this.courseTitle,
    required this.issuedAt,
    this.pdfObjectKey,
  });

  factory Certificate.fromJson(JsonObject json) => Certificate(
    id: requireString(json, 'id'),
    enrollmentId: requireString(json, 'enrollment_id'),
    verificationCode: requireString(json, 'verification_code'),
    recipientDisplayName: requireString(json, 'recipient_display_name'),
    courseTitle: requireString(json, 'course_title'),
    issuedAt: requireDateTime(json, 'issued_at'),
    pdfObjectKey: optionalString(json, 'pdf_object_key'),
  );

  final String id;
  final String enrollmentId;
  final String verificationCode;
  final String recipientDisplayName;
  final String courseTitle;
  final DateTime issuedAt;
  final String? pdfObjectKey;
}

@immutable
final class CertificateVerification {
  const CertificateVerification({
    required this.valid,
    required this.verificationCode,
    required this.recipientDisplayName,
    required this.courseTitle,
    required this.issuedAt,
  });

  factory CertificateVerification.fromJson(JsonObject json) =>
      CertificateVerification(
        valid: requireBool(json, 'valid'),
        verificationCode: requireString(json, 'verification_code'),
        recipientDisplayName: requireString(json, 'recipient_display_name'),
        courseTitle: requireString(json, 'course_title'),
        issuedAt: requireDateTime(json, 'issued_at'),
      );

  final bool valid;
  final String verificationCode;
  final String recipientDisplayName;
  final String courseTitle;
  final DateTime issuedAt;
}

abstract interface class LearningRepository {
  Future<CursorPage<Course>> courses({
    String? search,
    String? category,
    String? cursor,
  });
  Future<Course> course(String id);
  Future<Curriculum> curriculum(String courseId);
  Future<Enrollment> enroll(Course course, {String? returnUrl});
  Future<CursorPage<Enrollment>> enrollments({String? cursor});
  Future<CursorPage<LessonProgress>> progress(
    String enrollmentId, {
    String? cursor,
  });
  Future<Lesson> lesson(String enrollmentId, String lessonId);
  Future<LessonProgress> startLesson(String enrollmentId, String lessonId);
  Future<LessonProgress> heartbeat(
    String enrollmentId,
    String lessonId, {
    required int elapsedSeconds,
    required int positionSeconds,
  });
  Future<LessonProgress> completeLesson(String enrollmentId, String lessonId);
  Future<PublicQuiz> quiz(String quizId, String enrollmentId);
  Future<QuizAttempt> startQuiz(String quizId, String enrollmentId);
  Future<void> answerQuiz(
    String attemptId,
    String questionId,
    String selectedOptionId,
  );
  Future<QuizAttempt> finalizeQuiz(String attemptId);
  Future<Certificate> issueCertificate(String enrollmentId);
  Future<CertificateVerification> verifyCertificate(String code);
  Future<Certificate> renderCertificatePdf(String certificateId);
}

final class DioLearningRepository implements LearningRepository {
  DioLearningRepository(this._client, {Uuid? uuid})
    : _uuid = uuid ?? const Uuid();

  final ApiClient _client;
  final Uuid _uuid;

  @override
  Future<CursorPage<Course>> courses({
    String? search,
    String? category,
    String? cursor,
  }) async {
    final response = await _client.request(
      'learning/courses',
      queryParameters: <String, dynamic>{
        'search': search,
        'category': category,
        'cursor': cursor,
      },
    );
    return CursorPage<Course>.fromJson(
      requireObject(response.data, 'course catalog'),
      Course.fromJson,
    );
  }

  @override
  Future<Course> course(String id) async {
    final response = await _client.request('learning/courses/$id');
    return Course.fromJson(requireObject(response.data, 'course'));
  }

  @override
  Future<Curriculum> curriculum(String courseId) async {
    final response = await _client.request(
      'learning/courses/$courseId/curriculum',
    );
    return Curriculum.fromJson(requireObject(response.data, 'curriculum'));
  }

  @override
  Future<Enrollment> enroll(Course course, {String? returnUrl}) async {
    final paid = course.settlementMethod != 'free';
    final response = await _client.request(
      'learning/enrollments',
      method: 'POST',
      headers: paid ? <String, dynamic>{'Idempotency-Key': _uuid.v4()} : null,
      data: <String, dynamic>{'course_id': course.id, 'return_url': returnUrl},
    );
    return Enrollment.fromJson(requireObject(response.data, 'enrollment'));
  }

  @override
  Future<CursorPage<Enrollment>> enrollments({String? cursor}) async {
    final response = await _client.request(
      'learning/enrollments',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<Enrollment>.fromJson(
      requireObject(response.data, 'enrollments'),
      Enrollment.fromJson,
    );
  }

  @override
  Future<CursorPage<LessonProgress>> progress(
    String enrollmentId, {
    String? cursor,
  }) async {
    final response = await _client.request(
      'learning/enrollments/$enrollmentId/progress',
      queryParameters: <String, dynamic>{'cursor': cursor},
    );
    return CursorPage<LessonProgress>.fromJson(
      requireObject(response.data, 'lesson progress'),
      LessonProgress.fromJson,
    );
  }

  @override
  Future<Lesson> lesson(String enrollmentId, String lessonId) async {
    final response = await _client.request(
      'learning/enrollments/$enrollmentId/lessons/$lessonId',
    );
    return Lesson.fromJson(requireObject(response.data, 'lesson'));
  }

  @override
  Future<LessonProgress> startLesson(String enrollmentId, String lessonId) =>
      _lessonAction(enrollmentId, lessonId, 'start');

  @override
  Future<LessonProgress> heartbeat(
    String enrollmentId,
    String lessonId, {
    required int elapsedSeconds,
    required int positionSeconds,
  }) => _lessonAction(
    enrollmentId,
    lessonId,
    'heartbeat',
    data: <String, dynamic>{
      'elapsed_seconds': elapsedSeconds,
      'position_seconds': positionSeconds,
    },
  );

  @override
  Future<LessonProgress> completeLesson(String enrollmentId, String lessonId) =>
      _lessonAction(enrollmentId, lessonId, 'complete');

  Future<LessonProgress> _lessonAction(
    String enrollmentId,
    String lessonId,
    String action, {
    JsonObject? data,
  }) async {
    final response = await _client.request(
      'learning/enrollments/$enrollmentId/lessons/$lessonId/$action',
      method: 'POST',
      data: data,
    );
    return LessonProgress.fromJson(
      requireObject(response.data, 'lesson progress'),
    );
  }

  @override
  Future<PublicQuiz> quiz(String quizId, String enrollmentId) async {
    final response = await _client.request(
      'learning/quizzes/$quizId',
      queryParameters: <String, dynamic>{'enrollment_id': enrollmentId},
    );
    return PublicQuiz.fromJson(requireObject(response.data, 'public quiz'));
  }

  @override
  Future<QuizAttempt> startQuiz(String quizId, String enrollmentId) async {
    final response = await _client.request(
      'learning/quizzes/$quizId/attempts',
      method: 'POST',
      data: <String, dynamic>{'enrollment_id': enrollmentId},
    );
    return QuizAttempt.fromJson(requireObject(response.data, 'quiz attempt'));
  }

  @override
  Future<void> answerQuiz(
    String attemptId,
    String questionId,
    String selectedOptionId,
  ) async {
    final response = await _client.request(
      'learning/quizzes/attempts/$attemptId/answers',
      method: 'PUT',
      data: <String, dynamic>{
        'question_id': questionId,
        'selected_option_id': selectedOptionId,
      },
    );
    final json = requireObject(response.data, 'quiz answer');
    if (requireString(json, 'status') != 'recorded') {
      throw const FormatException('Quiz answer was not recorded.');
    }
    if (json.containsKey('correct') || json.containsKey('is_correct')) {
      throw const FormatException(
        'Quiz answer response exposed correctness before finalization.',
      );
    }
  }

  @override
  Future<QuizAttempt> finalizeQuiz(String attemptId) async {
    final response = await _client.request(
      'learning/quizzes/attempts/$attemptId/finalize',
      method: 'POST',
    );
    return QuizAttempt.fromJson(requireObject(response.data, 'quiz attempt'));
  }

  @override
  Future<Certificate> issueCertificate(String enrollmentId) async {
    final response = await _client.request(
      'learning/certificates',
      method: 'POST',
      data: <String, dynamic>{'enrollment_id': enrollmentId},
    );
    return Certificate.fromJson(requireObject(response.data, 'certificate'));
  }

  @override
  Future<CertificateVerification> verifyCertificate(String code) async {
    final response = await _client.request(
      'learning/certificates/verify/$code',
    );
    return CertificateVerification.fromJson(
      requireObject(response.data, 'certificate verification'),
    );
  }

  @override
  Future<Certificate> renderCertificatePdf(String certificateId) async {
    final response = await _client.request(
      'learning/certificates/$certificateId/pdf',
      method: 'POST',
    );
    return Certificate.fromJson(requireObject(response.data, 'certificate'));
  }
}

int? _optionalInt(JsonObject json, String key) {
  final value = json[key];
  if (value == null || value is int) {
    return value as int?;
  }
  throw FormatException('$key must be an integer or null.');
}

DateTime? _optionalDateTime(JsonObject json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) {
      return parsed;
    }
  }
  throw FormatException('$key must be an ISO-8601 date-time or null.');
}

final learningRepositoryProvider = Provider<LearningRepository>(
  (ref) => DioLearningRepository(ref.watch(apiClientProvider)),
);
