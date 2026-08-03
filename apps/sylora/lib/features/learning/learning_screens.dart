import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../../design/sylora.dart';
import '../auth/auth.dart';
import 'learning_repository.dart';

@immutable
final class _LearningSnapshot {
  const _LearningSnapshot({required this.courses, required this.enrollments});

  final CursorPage<Course> courses;
  final CursorPage<Enrollment> enrollments;
}

final _learningProvider = FutureProvider.autoDispose<_LearningSnapshot>((
  ref,
) async {
  final repository = ref.watch(learningRepositoryProvider);
  final values = await Future.wait<Object>(<Future<Object>>[
    repository.courses(),
    repository.enrollments(),
  ]);
  return _LearningSnapshot(
    courses: values[0] as CursorPage<Course>,
    enrollments: values[1] as CursorPage<Enrollment>,
  );
});

final class LearningScreen extends ConsumerWidget {
  const LearningScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => LumenPage(
    title: 'Learning',
    subtitle:
        'Published courses, real enrollment progress, quizzes, and certificates.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.learning,
    child: LumenAsyncView<_LearningSnapshot>(
      value: ref.watch(_learningProvider),
      onRetry: () => ref.invalidate(_learningProvider),
      data: (snapshot) => DefaultTabController(
        length: 3,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const TabBar(
              isScrollable: true,
              tabs: <Tab>[
                Tab(text: 'Catalog'),
                Tab(text: 'My learning'),
                Tab(text: 'Verify certificate'),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 720,
              child: TabBarView(
                children: <Widget>[
                  _CourseCatalog(initialPage: snapshot.courses),
                  _EnrollmentList(initialPage: snapshot.enrollments),
                  const CertificateVerificationView(),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

final class _CourseCatalog extends ConsumerStatefulWidget {
  const _CourseCatalog({required this.initialPage});

  final CursorPage<Course> initialPage;

  @override
  ConsumerState<_CourseCatalog> createState() => _CourseCatalogState();
}

final class _CourseCatalogState extends ConsumerState<_CourseCatalog> {
  final _search = TextEditingController();
  final _category = TextEditingController();
  late List<Course> _items = widget.initialPage.items.toList();
  late String? _cursor = widget.initialPage.nextCursor;
  bool _busy = false;

  @override
  void dispose() {
    _search.dispose();
    _category.dispose();
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
            width: 260,
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                labelText: 'Search courses',
                prefixIcon: Icon(Icons.search_rounded),
              ),
              onSubmitted: (_) => _reload(),
            ),
          ),
          SizedBox(
            width: 200,
            child: TextField(
              controller: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              onSubmitted: (_) => _reload(),
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
                title: 'No published courses',
                message:
                    'The learning catalog returned no courses for these filters.',
                actionLabel: 'Clear filters',
                onAction: _clear,
                icon: Icons.school_outlined,
              )
            : ListView(
                children: <Widget>[
                  for (final course in _items)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.school_outlined),
                        title: Text(course.title),
                        subtitle: Text(
                          '${course.category} • ${_coursePrice(course)}',
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => context.pushNamed(
                          'learning-course',
                          pathParameters: <String, String>{'id': course.id},
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
    _category.clear();
    await _reload();
  }

  Future<void> _reload() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(learningRepositoryProvider)
          .courses(
            search: _blank(_search.text),
            category: _blank(_category.text),
          );
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
          .read(learningRepositoryProvider)
          .courses(
            search: _blank(_search.text),
            category: _blank(_category.text),
            cursor: _cursor,
          );
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

final class _EnrollmentList extends ConsumerStatefulWidget {
  const _EnrollmentList({required this.initialPage});

  final CursorPage<Enrollment> initialPage;

  @override
  ConsumerState<_EnrollmentList> createState() => _EnrollmentListState();
}

final class _EnrollmentListState extends ConsumerState<_EnrollmentList> {
  late final List<Enrollment> _items = widget.initialPage.items.toList();
  late String? _cursor = widget.initialPage.nextCursor;
  bool _busy = false;

  @override
  Widget build(BuildContext context) => _items.isEmpty
      ? LumenEmptyView(
          title: 'No enrollments',
          message: 'The enrollment API returned no learning records.',
          actionLabel: 'Browse courses',
          onAction: () => DefaultTabController.of(context).animateTo(0),
          icon: Icons.menu_book_outlined,
        )
      : ListView(
          children: <Widget>[
            for (final enrollment in _items)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.menu_book_outlined),
                  title: Text('Course ${enrollment.courseId.substring(0, 8)}'),
                  subtitle: Text(
                    '${enrollment.settlementMethod} • enrolled '
                    '${DateFormat.yMMMd().format(enrollment.enrolledAt.toLocal())}',
                  ),
                  trailing: LumenBadge(label: enrollment.status),
                  onTap: () => context.pushNamed(
                    'learning-enrollment',
                    pathParameters: <String, String>{
                      'id': enrollment.id,
                      'courseId': enrollment.courseId,
                    },
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
        );

  Future<void> _loadMore() async {
    setState(() => _busy = true);
    try {
      final page = await ref
          .read(learningRepositoryProvider)
          .enrollments(cursor: _cursor);
      if (mounted) {
        setState(() {
          _items.addAll(page.items);
          _cursor = page.nextCursor;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class LearningCourseScreen extends ConsumerStatefulWidget {
  const LearningCourseScreen({required this.courseId, super.key});

  final String courseId;

  @override
  ConsumerState<LearningCourseScreen> createState() =>
      _LearningCourseScreenState();
}

final class _LearningCourseScreenState
    extends ConsumerState<LearningCourseScreen> {
  late Future<(Course, Curriculum)> _future = _load();
  bool _busy = false;
  String? _message;

  Future<(Course, Curriculum)> _load() async {
    final repository = ref.read(learningRepositoryProvider);
    final values = await Future.wait<Object>(<Future<Object>>[
      repository.course(widget.courseId),
      repository.curriculum(widget.courseId),
    ]);
    return (values[0] as Course, values[1] as Curriculum);
  }

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Course',
    subtitle: 'Course detail, curriculum, and enrollment entry point.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.learning,
    child: FutureBuilder<(Course, Curriculum)>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(
            error: snapshot.error!,
            onRetry: () => setState(() => _future = _load()),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final (course, curriculum) = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    course.title,
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  Text('${course.category} • ${_coursePrice(course)}'),
                  const SizedBox(height: 12),
                  Text(course.description),
                  if (course.learningObjectives.isNotEmpty) ...<Widget>[
                    const Divider(height: 28),
                    Text(
                      'Learning objectives',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    for (final objective in course.learningObjectives)
                      Text('• $objective'),
                  ],
                  const SizedBox(height: 16),
                  LumenPrimaryButton(
                    label: course.settlementMethod == 'free'
                        ? 'Enroll'
                        : 'Enroll with ${course.settlementMethod}',
                    busy: _busy,
                    onPressed: () => _enroll(course),
                    icon: Icons.school_rounded,
                  ),
                  if (_message != null) ...<Widget>[
                    const SizedBox(height: 10),
                    Text(_message!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Curriculum',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            if (curriculum.modules.isEmpty)
              const Text('The curriculum API returned no modules.')
            else
              for (final module in curriculum.modules)
                ExpansionTile(
                  title: Text(module.title),
                  subtitle: module.description == null
                      ? null
                      : Text(module.description!),
                  children: <Widget>[
                    for (final lesson
                        in curriculum.lessons
                            .where((item) => item.moduleId == module.id)
                            .toList()
                          ..sort((a, b) => a.position.compareTo(b.position)))
                      ListTile(
                        leading: const Icon(Icons.lock_outline_rounded),
                        title: Text(lesson.title),
                        subtitle: Text('${lesson.kind} • enrollment required'),
                      ),
                  ],
                ),
          ],
        );
      },
    ),
  );

  Future<void> _enroll(Course course) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final enrollment = await ref
          .read(learningRepositoryProvider)
          .enroll(
            course,
            returnUrl: course.settlementMethod == 'external'
                ? Uri.base.toString()
                : null,
          );
      if (mounted) {
        setState(() => _message = 'Enrollment is ${enrollment.status}.');
        ref.invalidate(_learningProvider);
        if (enrollment.status == 'active') {
          await context.pushNamed(
            'learning-enrollment',
            pathParameters: <String, String>{
              'id': enrollment.id,
              'courseId': enrollment.courseId,
            },
          );
        }
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class LearningEnrollmentScreen extends ConsumerStatefulWidget {
  const LearningEnrollmentScreen({
    required this.enrollmentId,
    required this.courseId,
    super.key,
  });

  final String enrollmentId;
  final String courseId;

  @override
  ConsumerState<LearningEnrollmentScreen> createState() =>
      _LearningEnrollmentScreenState();
}

final class _LearningEnrollmentScreenState
    extends ConsumerState<LearningEnrollmentScreen> {
  late Future<(Course, Curriculum, CursorPage<LessonProgress>)> _future =
      _load();
  Certificate? _certificate;
  String? _message;
  bool _busy = false;

  Future<(Course, Curriculum, CursorPage<LessonProgress>)> _load() async {
    final repository = ref.read(learningRepositoryProvider);
    final values = await Future.wait<Object>(<Future<Object>>[
      repository.course(widget.courseId),
      repository.curriculum(widget.courseId),
      repository.progress(widget.enrollmentId),
    ]);
    return (
      values[0] as Course,
      values[1] as Curriculum,
      values[2] as CursorPage<LessonProgress>,
    );
  }

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Enrollment',
    subtitle: 'Lesson progress, quizzes, and certificate issuance.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.learning,
    child: FutureBuilder<(Course, Curriculum, CursorPage<LessonProgress>)>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(error: snapshot.error!, onRetry: _refresh);
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final (course, curriculum, progress) = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              course.title,
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 14),
            for (final module in curriculum.modules)
              LumenSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      module.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    for (final lesson in curriculum.lessons.where(
                      (item) => item.moduleId == module.id,
                    ))
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          _progressFor(progress.items, lesson.id)?.state ==
                                  'completed'
                              ? Icons.check_circle_rounded
                              : Icons.play_circle_outline_rounded,
                        ),
                        title: Text(lesson.title),
                        subtitle: Text(
                          _progressFor(progress.items, lesson.id)?.state ??
                              'not started',
                        ),
                        onTap: () async {
                          await context.pushNamed(
                            'learning-lesson',
                            pathParameters: <String, String>{
                              'enrollmentId': widget.enrollmentId,
                              'lessonId': lesson.id,
                            },
                          );
                          _refresh();
                        },
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            _QuizLookup(enrollmentId: widget.enrollmentId),
            const SizedBox(height: 16),
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    'Certificate',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const Text(
                    'Issuance succeeds only after the backend confirms all completion requirements.',
                  ),
                  const SizedBox(height: 12),
                  LumenPrimaryButton(
                    label: 'Issue certificate',
                    busy: _busy,
                    onPressed: _issueCertificate,
                    icon: Icons.workspace_premium_outlined,
                  ),
                  if (_certificate != null) ...<Widget>[
                    const SizedBox(height: 10),
                    SelectableText(
                      'Verification code: ${_certificate!.verificationCode}',
                    ),
                    const SizedBox(height: 8),
                    LumenSecondaryButton(
                      label: 'Render certificate PDF',
                      onPressed: _renderCertificate,
                      icon: Icons.picture_as_pdf_outlined,
                    ),
                  ],
                  if (_message != null) ...<Widget>[
                    const SizedBox(height: 10),
                    Text(_message!),
                  ],
                ],
              ),
            ),
          ],
        );
      },
    ),
  );

  void _refresh() => setState(() => _future = _load());

  Future<void> _issueCertificate() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final certificate = await ref
          .read(learningRepositoryProvider)
          .issueCertificate(widget.enrollmentId);
      if (mounted) {
        setState(() {
          _certificate = certificate;
          _message = 'Certificate issued by the learning API.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _renderCertificate() async {
    try {
      final result = await ref
          .read(learningRepositoryProvider)
          .renderCertificatePdf(_certificate!.id);
      if (mounted) {
        setState(() {
          _certificate = result;
          _message = result.pdfObjectKey == null
              ? 'PDF storage is unavailable; the API did not return an object key.'
              : 'PDF stored at ${result.pdfObjectKey}.';
        });
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    }
  }
}

final class _QuizLookup extends StatefulWidget {
  const _QuizLookup({required this.enrollmentId});

  final String enrollmentId;

  @override
  State<_QuizLookup> createState() => _QuizLookupState();
}

final class _QuizLookupState extends State<_QuizLookup> {
  final _quizId = TextEditingController();

  @override
  void dispose() {
    _quizId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text('Course quiz', style: Theme.of(context).textTheme.headlineSmall),
        const Text(
          'The curriculum response does not expose quiz IDs. Use the quiz ID '
          'provided by the course author.',
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _quizId,
          decoration: const InputDecoration(labelText: 'Quiz ID'),
        ),
        const SizedBox(height: 10),
        LumenPrimaryButton(
          label: 'Open quiz',
          onPressed: () {
            if (_quizId.text.trim().isNotEmpty) {
              context.pushNamed(
                'learning-quiz',
                pathParameters: <String, String>{
                  'quizId': _quizId.text.trim(),
                  'enrollmentId': widget.enrollmentId,
                },
              );
            }
          },
          icon: Icons.quiz_outlined,
        ),
      ],
    ),
  );
}

final class LearningLessonScreen extends ConsumerStatefulWidget {
  const LearningLessonScreen({
    required this.enrollmentId,
    required this.lessonId,
    super.key,
  });

  final String enrollmentId;
  final String lessonId;

  @override
  ConsumerState<LearningLessonScreen> createState() =>
      _LearningLessonScreenState();
}

final class _LearningLessonScreenState
    extends ConsumerState<LearningLessonScreen> {
  late Future<Lesson> _future = ref
      .read(learningRepositoryProvider)
      .lesson(widget.enrollmentId, widget.lessonId);
  LessonProgress? _progress;
  bool _busy = false;
  String? _message;

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Lesson',
    subtitle: 'Lesson content, heartbeat tracking, and completion controls.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.learning,
    child: FutureBuilder<Lesson>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(
            error: snapshot.error!,
            onRetry: () => setState(
              () => _future = ref
                  .read(learningRepositoryProvider)
                  .lesson(widget.enrollmentId, widget.lessonId),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final lesson = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    lesson.title,
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  Text('${lesson.kind} • ${lesson.requiredSeconds}s required'),
                  if (lesson.body != null) ...<Widget>[
                    const Divider(height: 28),
                    SelectableText(lesson.body!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                FilledButton.icon(
                  onPressed: _busy ? null : _start,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Start lesson'),
                ),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _heartbeat,
                  icon: const Icon(Icons.monitor_heart_outlined),
                  label: const Text('Record 30-second heartbeat'),
                ),
                FilledButton.tonalIcon(
                  onPressed: _busy ? null : _complete,
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Complete lesson'),
                ),
              ],
            ),
            if (_progress != null || _message != null) ...<Widget>[
              const SizedBox(height: 14),
              LumenSurface(
                child: Text(
                  _message ??
                      '${_progress!.state} • ${_progress!.heartbeatSeconds}s recorded',
                ),
              ),
            ],
          ],
        );
      },
    ),
  );

  Future<void> _start() => _action(
    () => ref
        .read(learningRepositoryProvider)
        .startLesson(widget.enrollmentId, widget.lessonId),
  );

  Future<void> _heartbeat() => _action(
    () => ref
        .read(learningRepositoryProvider)
        .heartbeat(
          widget.enrollmentId,
          widget.lessonId,
          elapsedSeconds: 30,
          positionSeconds: (_progress?.lastPositionSeconds ?? 0) + 30,
        ),
  );

  Future<void> _complete() => _action(
    () => ref
        .read(learningRepositoryProvider)
        .completeLesson(widget.enrollmentId, widget.lessonId),
  );

  Future<void> _action(Future<LessonProgress> Function() action) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final result = await action();
      if (mounted) {
        setState(() => _progress = result);
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class LearningQuizScreen extends ConsumerStatefulWidget {
  const LearningQuizScreen({
    required this.quizId,
    required this.enrollmentId,
    super.key,
  });

  final String quizId;
  final String enrollmentId;

  @override
  ConsumerState<LearningQuizScreen> createState() => _LearningQuizScreenState();
}

final class _LearningQuizScreenState extends ConsumerState<LearningQuizScreen> {
  late Future<PublicQuiz> _future = ref
      .read(learningRepositoryProvider)
      .quiz(widget.quizId, widget.enrollmentId);
  final Map<String, String> _answers = <String, String>{};
  QuizAttempt? _attempt;
  bool _busy = false;
  String? _message;

  @override
  Widget build(BuildContext context) => LumenPage(
    title: 'Quiz',
    subtitle: 'Attempt lifecycle, answers, and scoring.',
    showAuraPresence: true,
    auraPresencePreset: SyloraAuraContextPreset.learning,
    child: FutureBuilder<PublicQuiz>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return LumenErrorView(
            error: snapshot.error!,
            onRetry: () => setState(
              () => _future = ref
                  .read(learningRepositoryProvider)
                  .quiz(widget.quizId, widget.enrollmentId),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final quiz = snapshot.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(quiz.title, style: Theme.of(context).textTheme.headlineLarge),
            Text('Attempt limit: ${quiz.attemptLimit}'),
            const SizedBox(height: 12),
            if (_attempt == null)
              LumenPrimaryButton(
                label: 'Start quiz attempt',
                busy: _busy,
                onPressed: _start,
                icon: Icons.quiz_outlined,
              )
            else
              for (final question in quiz.questions)
                LumenSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        question.prompt,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      RadioGroup<String>(
                        groupValue: _answers[question.id],
                        onChanged: (value) {
                          if (_attempt?.state == 'in_progress' &&
                              value != null) {
                            setState(() => _answers[question.id] = value);
                          }
                        },
                        child: Column(
                          children: <Widget>[
                            for (final option in question.options)
                              RadioListTile<String>(
                                value: option.id,
                                title: Text(option.text),
                                enabled: _attempt?.state == 'in_progress',
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            if (_attempt?.state == 'in_progress') ...<Widget>[
              const SizedBox(height: 12),
              LumenPrimaryButton(
                label: 'Submit and finalize',
                busy: _busy,
                onPressed: _answers.length == quiz.questions.length
                    ? () => _finalize(quiz)
                    : null,
                disabledReason: 'Answer every question before finalizing.',
                icon: Icons.task_alt_rounded,
              ),
            ],
            if (_attempt != null &&
                _attempt?.state != 'in_progress') ...<Widget>[
              const SizedBox(height: 14),
              LumenSurface(
                child: Column(
                  children: <Widget>[
                    Text(
                      '${_attempt!.scorePercent ?? 0}%',
                      style: Theme.of(context).textTheme.displaySmall,
                    ),
                    Text(
                      '${_attempt!.correctCount ?? 0} of '
                      '${_attempt!.questionCount ?? quiz.questions.length} correct',
                    ),
                  ],
                ),
              ),
            ],
            if (_message != null) ...<Widget>[
              const SizedBox(height: 12),
              Text(_message!),
            ],
          ],
        );
      },
    ),
  );

  Future<void> _start() async {
    setState(() => _busy = true);
    try {
      final attempt = await ref
          .read(learningRepositoryProvider)
          .startQuiz(widget.quizId, widget.enrollmentId);
      if (mounted) {
        setState(() => _attempt = attempt);
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _finalize(PublicQuiz quiz) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final repository = ref.read(learningRepositoryProvider);
      for (final question in quiz.questions) {
        await repository.answerQuiz(
          _attempt!.id,
          question.id,
          _answers[question.id]!,
        );
      }
      final result = await repository.finalizeQuiz(_attempt!.id);
      if (mounted) {
        setState(() => _attempt = result);
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _message = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class CertificateVerificationView extends ConsumerStatefulWidget {
  const CertificateVerificationView({super.key});

  @override
  ConsumerState<CertificateVerificationView> createState() =>
      _CertificateVerificationViewState();
}

final class _CertificateVerificationViewState
    extends ConsumerState<CertificateVerificationView> {
  final _form = GlobalKey<FormState>();
  final _code = TextEditingController();
  CertificateVerification? _result;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListView(
    children: <Widget>[
      LumenSurface(
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Verify a certificate',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              TextFormField(
                controller: _code,
                decoration: const InputDecoration(
                  labelText: 'Verification code',
                ),
                validator: (value) => (value?.trim().isEmpty ?? true)
                    ? 'Enter a verification code.'
                    : null,
              ),
              const SizedBox(height: 12),
              LumenPrimaryButton(
                label: 'Verify',
                busy: _busy,
                onPressed: _verify,
                icon: Icons.verified_outlined,
              ),
              if (_error != null) ...<Widget>[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
      ),
      if (_result != null) ...<Widget>[
        const SizedBox(height: 14),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              LumenBadge(label: _result!.valid ? 'valid' : 'invalid'),
              Text(_result!.recipientDisplayName),
              Text(_result!.courseTitle),
              Text(
                'Issued ${DateFormat.yMMMd().format(_result!.issuedAt.toLocal())}',
              ),
            ],
          ),
        ),
      ],
    ],
  );

  Future<void> _verify() async {
    if (!_form.currentState!.validate()) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _result = null;
    });
    try {
      final result = await ref
          .read(learningRepositoryProvider)
          .verifyCertificate(_code.text.trim());
      if (mounted) {
        setState(() => _result = result);
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _error = messageFor(error));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

LessonProgress? _progressFor(List<LessonProgress> values, String lessonId) {
  for (final value in values) {
    if (value.lessonId == lessonId) {
      return value;
    }
  }
  return null;
}

String _coursePrice(Course course) => switch (course.settlementMethod) {
  'free' => 'Free',
  'credits' => '${course.priceMinor} credits',
  'external' => 'External payment',
  _ => course.settlementMethod,
};

String? _blank(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
