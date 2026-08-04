from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    require_permission,
)
from app.errors import APIError
from app.platform_models import (
    AttemptState,
    Certificate,
    ContentItem,
    Course,
    CourseModule,
    CourseState,
    CourseVersion,
    CreatorSubscriptionTier,
    Enrollment,
    Lesson,
    LessonProgress,
    MarketplaceProduct,
    MarketplaceStore,
    ProgressState,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    QuizOption,
    QuizQuestion,
    SettlementMethod,
)
from app.platform_schemas import (
    CertificateIssueRequest,
    CertificateResponse,
    CertificateVerificationResponse,
    CourseCreate,
    CourseDetailResponse,
    CoursePatch,
    CourseResponse,
    CourseVersionCreate,
    CurriculumResponse,
    CursorPage,
    EnrollmentResponse,
    EnrollRequest,
    HeartbeatRequest,
    LessonCreate,
    LessonResponse,
    LessonSummaryResponse,
    ModuleCreate,
    ModuleResponse,
    ProgressResponse,
    QuizAnswerRequest,
    QuizAttemptCreate,
    QuizAttemptResponse,
    QuizCreate,
    QuizOptionPublic,
    QuizPublicResponse,
    QuizQuestionCreate,
    QuizQuestionPublic,
)
from app.platform_service import (
    aware,
    derive_course_completion,
    enroll_course,
    ensure_lesson_in_enrollment,
    finalize_quiz_attempt,
    issue_certificate,
    progress_for,
    require_enrollment,
)
from app.rate_limit import rate_limit
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor
from app.storage import S3ObjectStorage

router = APIRouter(tags=["Learning"])
OptionalIdempotencyHeader = Annotated[
    str | None,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    ),
]


async def owned_course(db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID) -> Course:
    course = await db.get(Course, course_id)
    if course is None or course.author_user_id != user_id:
        raise APIError(404, "course_not_found", "Course not found", "The course does not exist.")
    return course


async def latest_course_version(db: AsyncSession, course_id: uuid.UUID) -> CourseVersion:
    version = await db.scalar(
        select(CourseVersion)
        .where(CourseVersion.course_id == course_id)
        .order_by(CourseVersion.version_number.desc())
        .limit(1)
    )
    if version is None:
        raise RuntimeError("course version is missing")
    return version


async def validate_course_entitlement_references(
    db: AsyncSession,
    *,
    author_user_id: uuid.UUID,
    product_id: uuid.UUID | None,
    subscription_tier_id: uuid.UUID | None,
) -> None:
    if product_id is not None:
        product = await db.scalar(
            select(MarketplaceProduct.id)
            .join(MarketplaceStore, MarketplaceStore.id == MarketplaceProduct.store_id)
            .where(
                MarketplaceProduct.id == product_id,
                MarketplaceStore.owner_user_id == author_user_id,
            )
        )
        if product is None:
            raise APIError(
                422,
                "invalid_course_product",
                "Invalid course product",
                "The enrollment product must belong to the course author.",
            )
    if subscription_tier_id is not None:
        tier = await db.get(CreatorSubscriptionTier, subscription_tier_id)
        if tier is None or tier.creator_user_id != author_user_id:
            raise APIError(
                422,
                "invalid_course_subscription_tier",
                "Invalid course subscription tier",
                "The enrollment tier must belong to the course author.",
            )


@router.post(
    "/learning/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_course(
    payload: CourseCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Course:
    await validate_course_entitlement_references(
        db,
        author_user_id=auth.user.id,
        product_id=payload.product_id,
        subscription_tier_id=payload.required_subscription_tier_id,
    )
    course = Course(
        author_user_id=auth.user.id,
        slug=payload.slug,
        category=payload.category,
        state=CourseState.draft,
        settlement_method=payload.settlement_method,
        price_minor=payload.price_minor,
        external_settlement_reference=payload.external_settlement_reference,
        product_id=payload.product_id,
        required_subscription_tier_id=payload.required_subscription_tier_id,
    )
    db.add(course)
    await db.flush()
    version = CourseVersion(
        course_id=course.id,
        version_number=1,
        state=CourseState.draft,
        title=payload.title,
        description=payload.description,
        learning_objectives=payload.learning_objectives,
        created_by_id=auth.user.id,
    )
    db.add(version)
    add_audit_event(
        db,
        request,
        settings,
        "learning.course_priced",
        actor_user_id=auth.user.id,
        metadata={
            "course_id": str(course.id),
            "method": course.settlement_method.value,
            "price_minor": course.price_minor,
        },
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "course_slug_unavailable",
            "Course slug unavailable",
            "That course slug is already in use.",
        ) from exc
    await db.refresh(course)
    return course


@router.patch("/learning/courses/{course_id}", response_model=CourseResponse)
async def patch_course(
    course_id: uuid.UUID,
    payload: CoursePatch,
    request: Request,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Course:
    course = await owned_course(db, auth.user.id, course_id)
    if course.state == CourseState.retired:
        raise APIError(
            409,
            "course_retired",
            "Course retired",
            "A retired course cannot be changed.",
        )
    old_pricing = (
        course.settlement_method.value,
        course.price_minor,
        course.external_settlement_reference,
    )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    if course.settlement_method == SettlementMethod.free and (
        course.price_minor is not None or course.external_settlement_reference is not None
    ):
        raise APIError(
            422,
            "invalid_course_price",
            "Invalid course price",
            "Free courses cannot have settlement configuration.",
        )
    if course.settlement_method == SettlementMethod.credits and (
        course.price_minor is None or course.external_settlement_reference is not None
    ):
        raise APIError(
            422,
            "invalid_course_price",
            "Invalid course price",
            "Credit courses require only an integer credit price.",
        )
    if course.settlement_method == SettlementMethod.external and (
        course.external_settlement_reference is None or course.price_minor is not None
    ):
        raise APIError(
            422,
            "invalid_course_price",
            "Invalid course price",
            "External courses require only a provider settlement reference.",
        )
    await validate_course_entitlement_references(
        db,
        author_user_id=auth.user.id,
        product_id=course.product_id,
        subscription_tier_id=course.required_subscription_tier_id,
    )
    new_pricing = (
        course.settlement_method.value,
        course.price_minor,
        course.external_settlement_reference,
    )
    if new_pricing != old_pricing:
        add_audit_event(
            db,
            request,
            settings,
            "learning.course_repriced",
            actor_user_id=auth.user.id,
            metadata={
                "course_id": str(course.id),
                "old_method": old_pricing[0],
                "old_price_minor": old_pricing[1],
                "new_method": new_pricing[0],
                "new_price_minor": new_pricing[1],
            },
        )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "course_slug_unavailable",
            "Course slug unavailable",
            "That course slug is already in use.",
        ) from exc
    await db.refresh(course)
    return course


@router.post(
    "/learning/courses/{course_id}/versions",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
)
async def create_course_version(
    course_id: uuid.UUID,
    payload: CourseVersionCreate,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    course = await owned_course(db, auth.user.id, course_id)
    latest = await latest_course_version(db, course.id)
    version = CourseVersion(
        course_id=course.id,
        version_number=latest.version_number + 1,
        state=CourseState.draft,
        title=payload.title,
        description=payload.description,
        learning_objectives=payload.learning_objectives,
        created_by_id=auth.user.id,
    )
    db.add(version)
    course.state = CourseState.draft
    await db.commit()
    await db.refresh(version)
    return {
        "id": version.id,
        "course_id": version.course_id,
        "version_number": version.version_number,
        "state": version.state,
        "title": version.title,
        "description": version.description,
        "learning_objectives": version.learning_objectives,
        "created_at": version.created_at,
    }


@router.patch(
    "/learning/courses/{course_id}/versions/{version_id}",
    response_model=dict[str, Any],
)
async def patch_course_version(
    course_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: CourseVersionCreate,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await owned_course(db, auth.user.id, course_id)
    version = await db.get(CourseVersion, version_id)
    if version is None or version.course_id != course_id:
        raise APIError(
            404,
            "course_version_not_found",
            "Course version not found",
            "The version does not exist.",
        )
    if version.state == CourseState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Create a new course version to make changes.",
        )
    version.title = payload.title
    version.description = payload.description
    version.learning_objectives = payload.learning_objectives
    await db.commit()
    return {
        "id": version.id,
        "course_id": version.course_id,
        "version_number": version.version_number,
        "state": version.state,
        "title": version.title,
        "description": version.description,
        "learning_objectives": version.learning_objectives,
        "created_at": version.created_at,
    }


@router.post(
    "/learning/courses/{course_id}/versions/{version_id}/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_module(
    course_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ModuleCreate,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> CourseModule:
    await owned_course(db, auth.user.id, course_id)
    version = await db.get(CourseVersion, version_id)
    if version is None or version.course_id != course_id:
        raise APIError(
            404,
            "course_version_not_found",
            "Course version not found",
            "The version does not exist.",
        )
    if version.state == CourseState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published curriculum cannot be changed.",
        )
    module = CourseModule(course_version_id=version.id, **payload.model_dump())
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


@router.post(
    "/learning/courses/{course_id}/modules/{module_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lesson(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    payload: LessonCreate,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> Lesson:
    await owned_course(db, auth.user.id, course_id)
    module = await db.get(CourseModule, module_id)
    version = await db.get(CourseVersion, module.course_version_id) if module else None
    if module is None or version is None or version.course_id != course_id:
        raise APIError(
            404, "course_module_not_found", "Course module not found", "The module does not exist."
        )
    if version.state == CourseState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published curriculum cannot be changed.",
        )
    if payload.prerequisite_lesson_id is not None:
        prerequisite = await db.get(Lesson, payload.prerequisite_lesson_id)
        prerequisite_module = (
            await db.get(CourseModule, prerequisite.module_id) if prerequisite is not None else None
        )
        if (
            prerequisite is None
            or prerequisite_module is None
            or prerequisite_module.course_version_id != module.course_version_id
        ):
            raise APIError(
                422,
                "invalid_lesson_prerequisite",
                "Invalid lesson prerequisite",
                "A prerequisite must be an earlier lesson in this course version.",
            )
        if (prerequisite_module.position, prerequisite.position) >= (
            module.position,
            payload.position,
        ):
            raise APIError(
                422,
                "invalid_lesson_prerequisite",
                "Invalid lesson prerequisite",
                "A prerequisite must appear before this lesson.",
            )
    if payload.content_item_id is not None:
        content = await db.get(ContentItem, payload.content_item_id)
        if content is None or content.creator_user_id != auth.user.id:
            raise APIError(
                422,
                "invalid_lesson_content",
                "Invalid lesson content",
                "Linked lesson content must belong to the course author.",
            )
    lesson = Lesson(module_id=module.id, **payload.model_dump())
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post(
    "/learning/courses/{course_id}/versions/{version_id}/quizzes",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz(
    course_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: QuizCreate,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await owned_course(db, auth.user.id, course_id)
    version = await db.get(CourseVersion, version_id)
    if version is None or version.course_id != course_id:
        raise APIError(
            404,
            "course_version_not_found",
            "Course version not found",
            "The version does not exist.",
        )
    if version.state == CourseState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published quizzes cannot be changed.",
        )
    if payload.lesson_id is not None:
        lesson = await db.get(Lesson, payload.lesson_id)
        module = await db.get(CourseModule, lesson.module_id) if lesson else None
        if module is None or module.course_version_id != version.id:
            raise APIError(
                422,
                "invalid_quiz_lesson",
                "Invalid quiz lesson",
                "The quiz lesson must belong to this course version.",
            )
    quiz = Quiz(course_version_id=version.id, **payload.model_dump())
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return {
        "id": quiz.id,
        "course_version_id": quiz.course_version_id,
        "lesson_id": quiz.lesson_id,
        "title": quiz.title,
        "position": quiz.position,
        "required": quiz.required,
        "pass_threshold_percent": quiz.pass_threshold_percent,
        "attempt_limit": quiz.attempt_limit,
    }


@router.post(
    "/learning/courses/{course_id}/quizzes/{quiz_id}/questions",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_question(
    course_id: uuid.UUID,
    quiz_id: uuid.UUID,
    payload: QuizQuestionCreate,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await owned_course(db, auth.user.id, course_id)
    quiz = await db.get(Quiz, quiz_id)
    version = await db.get(CourseVersion, quiz.course_version_id) if quiz else None
    if quiz is None or version is None or version.course_id != course_id:
        raise APIError(404, "quiz_not_found", "Quiz not found", "The quiz does not exist.")
    if version.state == CourseState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published quiz questions cannot be changed.",
        )
    question = QuizQuestion(quiz_id=quiz.id, prompt=payload.prompt, position=payload.position)
    db.add(question)
    await db.flush()
    options = [
        QuizOption(
            question_id=question.id,
            text=option.text,
            position=index,
            is_correct=option.is_correct,
        )
        for index, option in enumerate(payload.options)
    ]
    db.add_all(options)
    await db.commit()
    return {
        "id": question.id,
        "quiz_id": question.quiz_id,
        "prompt": question.prompt,
        "position": question.position,
        "option_count": len(options),
    }


@router.post("/learning/courses/{course_id}/submit-review", response_model=CourseResponse)
async def submit_course_review(
    course_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("courses:author")),
    db: AsyncSession = Depends(get_session),
) -> Course:
    course = await owned_course(db, auth.user.id, course_id)
    version = await latest_course_version(db, course.id)
    if version.state != CourseState.draft:
        raise APIError(
            409,
            "course_not_draft",
            "Course not draft",
            "Only a draft course version can be submitted.",
        )
    modules = int(
        await db.scalar(
            select(func.count())
            .select_from(CourseModule)
            .where(CourseModule.course_version_id == version.id)
        )
        or 0
    )
    lessons = int(
        await db.scalar(
            select(func.count())
            .select_from(Lesson)
            .join(CourseModule, CourseModule.id == Lesson.module_id)
            .where(CourseModule.course_version_id == version.id)
        )
        or 0
    )
    if modules == 0 or lessons == 0:
        raise APIError(
            409,
            "course_curriculum_required",
            "Course curriculum required",
            "Add at least one module and lesson before review.",
        )
    course.state = CourseState.review
    version.state = CourseState.review
    version.reviewed_by_id = None
    version.reviewed_at = None
    await db.commit()
    await db.refresh(course)
    return course


@router.post("/learning/courses/{course_id}/review", response_model=CourseResponse)
async def review_course(
    course_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("courses:review")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Course:
    course = await db.get(Course, course_id)
    if course is None or course.state != CourseState.review:
        raise APIError(
            409,
            "course_not_in_review",
            "Course not in review",
            "The course is not awaiting review.",
        )
    version = await latest_course_version(db, course.id)
    if version.state != CourseState.review:
        raise APIError(
            409,
            "course_version_not_in_review",
            "Course version not in review",
            "The latest version is not awaiting review.",
        )
    version.reviewed_by_id = auth.user.id
    version.reviewed_at = utcnow()
    add_audit_event(
        db,
        request,
        settings,
        "learning.course_reviewed",
        actor_user_id=auth.user.id,
        target_user_id=course.author_user_id,
        metadata={"course_id": str(course.id), "version_id": str(version.id)},
    )
    await db.commit()
    await db.refresh(course)
    return course


@router.post("/learning/courses/{course_id}/publish", response_model=CourseResponse)
async def publish_course(
    course_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("courses:publish")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Course:
    course = await db.get(Course, course_id)
    if course is None or course.state != CourseState.review:
        raise APIError(
            409,
            "course_not_in_review",
            "Course not in review",
            "Review the course before publication.",
        )
    version = await latest_course_version(db, course.id)
    if version.state != CourseState.review:
        raise APIError(
            409,
            "course_version_not_in_review",
            "Course version not in review",
            "The latest version is not ready for publication.",
        )
    if version.reviewed_by_id is None or version.reviewed_at is None:
        raise APIError(
            409,
            "course_review_required",
            "Course review required",
            "A course reviewer must approve the latest version before publication.",
        )
    quiz_ids = list(
        (await db.scalars(select(Quiz.id).where(Quiz.course_version_id == version.id))).all()
    )
    for quiz_id in quiz_ids:
        has_question = await db.scalar(
            select(QuizQuestion.id).where(QuizQuestion.quiz_id == quiz_id).limit(1)
        )
        if has_question is None:
            raise APIError(
                409,
                "quiz_has_no_questions",
                "Quiz has no questions",
                "Every published quiz requires at least one question.",
            )
    question_ids = list(
        (
            await db.scalars(
                select(QuizQuestion.id)
                .join(Quiz, Quiz.id == QuizQuestion.quiz_id)
                .where(Quiz.course_version_id == version.id)
            )
        ).all()
    )
    for question_id in question_ids:
        correct = int(
            await db.scalar(
                select(func.count())
                .select_from(QuizOption)
                .where(
                    QuizOption.question_id == question_id,
                    QuizOption.is_correct.is_(True),
                )
            )
            or 0
        )
        if correct != 1:
            raise APIError(
                409,
                "invalid_quiz_answer_key",
                "Invalid quiz answer key",
                "Every quiz question requires exactly one correct answer.",
            )
    now = utcnow()
    course.state = CourseState.published
    course.published_version_id = version.id
    version.state = CourseState.published
    version.published_at = now
    add_audit_event(
        db,
        request,
        settings,
        "learning.course_published",
        actor_user_id=auth.user.id,
        target_user_id=course.author_user_id,
        metadata={"course_id": str(course.id), "version_id": str(version.id)},
    )
    await db.commit()
    await db.refresh(course)
    return course


@router.post("/learning/courses/{course_id}/retire", response_model=CourseResponse)
async def retire_course(
    course_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("courses:publish")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Course:
    course = await db.get(Course, course_id)
    if course is None or course.state != CourseState.published:
        raise APIError(
            409,
            "course_not_published",
            "Course not published",
            "Only a published course can be retired.",
        )
    course.state = CourseState.retired
    add_audit_event(
        db,
        request,
        settings,
        "learning.course_retired",
        actor_user_id=auth.user.id,
        target_user_id=course.author_user_id,
        metadata={"course_id": str(course.id)},
    )
    await db.commit()
    await db.refresh(course)
    return course


async def course_detail(db: AsyncSession, course: Course) -> CourseDetailResponse:
    version = await db.get(CourseVersion, course.published_version_id)
    if version is None:
        raise RuntimeError("published course version is missing")
    return CourseDetailResponse(
        **CourseResponse.model_validate(course).model_dump(),
        title=version.title,
        description=version.description,
        learning_objectives=version.learning_objectives,
    )


@router.get("/learning/courses", response_model=CursorPage)
async def course_catalog(
    search: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=64),
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"course-catalog:{search}:{category}"
    statement = (
        select(Course)
        .join(CourseVersion, CourseVersion.id == Course.published_version_id)
        .where(Course.state == CourseState.published)
    )
    if search:
        term = f"%{search}%"
        statement = statement.where(
            (CourseVersion.title.ilike(term)) | (CourseVersion.description.ilike(term))
        )
    if category:
        statement = statement.where(Course.category == category.lower())
    statement = apply_cursor(
        statement,
        Course.created_at,
        Course.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(Course.created_at.desc(), Course.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[await course_detail(db, item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


@router.get("/learning/courses/{course_id}", response_model=CourseDetailResponse)
async def get_course(
    course_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> CourseDetailResponse:
    course = await db.get(Course, course_id)
    if course is None or course.state != CourseState.published:
        raise APIError(404, "course_not_found", "Course not found", "The course is unavailable.")
    return await course_detail(db, course)


@router.get("/learning/courses/{course_id}/curriculum", response_model=CurriculumResponse)
async def get_curriculum(
    course_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> CurriculumResponse:
    course = await db.get(Course, course_id)
    if (
        course is None
        or course.state != CourseState.published
        or course.published_version_id is None
    ):
        raise APIError(404, "course_not_found", "Course not found", "The course is unavailable.")
    modules = list(
        (
            await db.scalars(
                select(CourseModule)
                .where(CourseModule.course_version_id == course.published_version_id)
                .order_by(CourseModule.position, CourseModule.id)
            )
        ).all()
    )
    module_ids = [module.id for module in modules]
    lessons = (
        list(
            (
                await db.scalars(
                    select(Lesson)
                    .join(CourseModule, CourseModule.id == Lesson.module_id)
                    .where(Lesson.module_id.in_(module_ids))
                    .order_by(CourseModule.position, Lesson.position, Lesson.id)
                )
            ).all()
        )
        if module_ids
        else []
    )
    return CurriculumResponse(
        modules=[ModuleResponse.model_validate(item) for item in modules],
        lessons=[LessonSummaryResponse.model_validate(item) for item in lessons],
    )


@router.post(
    "/learning/enrollments",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def enroll(
    payload: EnrollRequest,
    request: Request,
    idempotency_key: OptionalIdempotencyHeader = None,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Enrollment:
    course = await db.get(Course, payload.course_id)
    if course is None:
        raise APIError(404, "course_not_found", "Course not found", "The course is unavailable.")
    if course.settlement_method != SettlementMethod.free and idempotency_key is None:
        raise APIError(
            422,
            "idempotency_key_required",
            "Idempotency key required",
            "Paid enrollment requires an Idempotency-Key header.",
        )
    if payload.return_url is not None and not payload.return_url.startswith(
        settings.web_base_url.rstrip("/") + "/"
    ):
        raise APIError(
            422,
            "invalid_return_url",
            "Invalid return URL",
            "The return URL must be within the configured web application origin.",
        )
    enrollment = await enroll_course(
        db,
        payment_provider=request.app.state.payment_provider,
        user_id=auth.user.id,
        course=course,
        idempotency_key=idempotency_key or f"free-enrollment:{course.id}",
        return_url=payload.return_url,
    )
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


@router.get("/learning/enrollments", response_model=CursorPage)
async def list_enrollments(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"enrollments:{auth.user.id}"
    statement = select(Enrollment).where(Enrollment.user_id == auth.user.id)
    statement = apply_cursor(
        statement,
        Enrollment.enrolled_at,
        Enrollment.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(Enrollment.enrolled_at.desc(), Enrollment.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[EnrollmentResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].enrolled_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


async def lesson_and_enrollment(
    db: AsyncSession,
    user_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> tuple[Enrollment, Lesson]:
    enrollment = await require_enrollment(db, user_id, enrollment_id)
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise APIError(404, "lesson_not_found", "Lesson not found", "The lesson does not exist.")
    await ensure_lesson_in_enrollment(db, enrollment, lesson)
    return enrollment, lesson


@router.get(
    "/learning/enrollments/{enrollment_id}/lessons/{lesson_id}",
    response_model=LessonResponse,
)
async def get_enrolled_lesson(
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Lesson:
    _, lesson = await lesson_and_enrollment(db, auth.user.id, enrollment_id, lesson_id)
    return lesson


@router.post(
    "/learning/enrollments/{enrollment_id}/lessons/{lesson_id}/start",
    response_model=ProgressResponse,
)
async def start_lesson(
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LessonProgress:
    await rate_limit(
        request,
        bucket="learning-progress",
        subject=str(auth.user.id),
        limit=settings.learning_progress_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    enrollment, lesson = await lesson_and_enrollment(db, auth.user.id, enrollment_id, lesson_id)
    progress = await progress_for(db, enrollment=enrollment, lesson=lesson)
    if progress.state == ProgressState.not_started:
        progress.state = ProgressState.started
        progress.started_at = utcnow()
    await db.commit()
    await db.refresh(progress)
    return progress


@router.post(
    "/learning/enrollments/{enrollment_id}/lessons/{lesson_id}/heartbeat",
    response_model=ProgressResponse,
)
async def lesson_heartbeat(
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: HeartbeatRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LessonProgress:
    await rate_limit(
        request,
        bucket="learning-progress",
        subject=str(auth.user.id),
        limit=settings.learning_progress_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    enrollment, lesson = await lesson_and_enrollment(db, auth.user.id, enrollment_id, lesson_id)
    progress = await progress_for(db, enrollment=enrollment, lesson=lesson)
    if progress.state == ProgressState.not_started:
        progress.state = ProgressState.started
        progress.started_at = utcnow()
    if progress.state != ProgressState.completed:
        now = utcnow()
        wall_seconds = max(0, int((now - aware(progress.updated_at)).total_seconds()))
        credited_seconds = min(payload.elapsed_seconds, wall_seconds)
        progress.heartbeat_seconds = min(
            progress.heartbeat_seconds + credited_seconds,
            86_400,
        )
        if credited_seconds:
            progress.last_position_seconds = max(
                progress.last_position_seconds, payload.position_seconds
            )
    await db.commit()
    await db.refresh(progress)
    return progress


@router.post(
    "/learning/enrollments/{enrollment_id}/lessons/{lesson_id}/complete",
    response_model=ProgressResponse,
)
async def complete_lesson(
    enrollment_id: uuid.UUID,
    lesson_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LessonProgress:
    await rate_limit(
        request,
        bucket="learning-progress",
        subject=str(auth.user.id),
        limit=settings.learning_progress_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    enrollment, lesson = await lesson_and_enrollment(db, auth.user.id, enrollment_id, lesson_id)
    progress = await progress_for(db, enrollment=enrollment, lesson=lesson)
    if progress.state == ProgressState.not_started:
        raise APIError(
            409,
            "lesson_not_started",
            "Lesson not started",
            "Start the lesson before completing it.",
        )
    required_heartbeat = max(lesson.required_heartbeat_seconds, lesson.required_seconds)
    if progress.heartbeat_seconds < required_heartbeat or (
        progress.last_position_seconds < lesson.required_seconds
    ):
        raise APIError(
            409,
            "lesson_requirement_incomplete",
            "Lesson requirement incomplete",
            "The server-recorded lesson participation requirement is not complete.",
        )
    progress.state = ProgressState.completed
    progress.completed_at = utcnow()
    await db.flush()
    await derive_course_completion(db, enrollment)
    await db.commit()
    await db.refresh(progress)
    return progress


@router.get("/learning/enrollments/{enrollment_id}/progress", response_model=CursorPage)
async def enrollment_progress(
    enrollment_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    await require_enrollment(db, auth.user.id, enrollment_id)
    scope = f"lesson-progress:{enrollment_id}"
    statement = select(LessonProgress).where(LessonProgress.enrollment_id == enrollment_id)
    statement = apply_cursor(
        statement,
        LessonProgress.updated_at,
        LessonProgress.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    LessonProgress.updated_at.desc(), LessonProgress.id.desc()
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[ProgressResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].updated_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


async def public_quiz(db: AsyncSession, quiz: Quiz) -> QuizPublicResponse:
    questions = list(
        (
            await db.scalars(
                select(QuizQuestion)
                .where(QuizQuestion.quiz_id == quiz.id)
                .order_by(QuizQuestion.position, QuizQuestion.id)
            )
        ).all()
    )
    public_questions: list[QuizQuestionPublic] = []
    for question in questions:
        options = list(
            (
                await db.scalars(
                    select(QuizOption)
                    .where(QuizOption.question_id == question.id)
                    .order_by(QuizOption.position, QuizOption.id)
                )
            ).all()
        )
        public_questions.append(
            QuizQuestionPublic(
                id=question.id,
                prompt=question.prompt,
                position=question.position,
                options=[
                    QuizOptionPublic(id=item.id, text=item.text, position=item.position)
                    for item in options
                ],
            )
        )
    return QuizPublicResponse(
        id=quiz.id,
        title=quiz.title,
        attempt_limit=quiz.attempt_limit,
        questions=public_questions,
    )


@router.get(
    "/learning/enrollments/{enrollment_id}/quizzes",
    response_model=list[QuizPublicResponse],
)
async def enrollment_quizzes(
    enrollment_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[QuizPublicResponse]:
    enrollment = await require_enrollment(db, auth.user.id, enrollment_id)
    quizzes = list(
        (
            await db.scalars(
                select(Quiz)
                .where(Quiz.course_version_id == enrollment.course_version_id)
                .order_by(Quiz.position, Quiz.id)
            )
        ).all()
    )
    return [await public_quiz(db, quiz) for quiz in quizzes]


@router.get("/learning/quizzes/{quiz_id}", response_model=QuizPublicResponse)
async def get_quiz(
    quiz_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> QuizPublicResponse:
    enrollment = await require_enrollment(db, auth.user.id, enrollment_id)
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None or quiz.course_version_id != enrollment.course_version_id:
        raise APIError(404, "quiz_not_found", "Quiz not found", "The quiz does not exist.")
    return await public_quiz(db, quiz)


@router.post(
    "/learning/quizzes/{quiz_id}/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_quiz_attempt(
    quiz_id: uuid.UUID,
    payload: QuizAttemptCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> QuizAttempt:
    await rate_limit(
        request,
        bucket="learning-quizzes",
        subject=str(auth.user.id),
        limit=settings.learning_quiz_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    enrollment = await require_enrollment(db, auth.user.id, payload.enrollment_id)
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None or quiz.course_version_id != enrollment.course_version_id:
        raise APIError(404, "quiz_not_found", "Quiz not found", "The quiz does not exist.")
    if quiz.lesson_id is not None:
        lesson_progress = await db.scalar(
            select(LessonProgress).where(
                LessonProgress.enrollment_id == enrollment.id,
                LessonProgress.lesson_id == quiz.lesson_id,
                LessonProgress.state == ProgressState.completed,
            )
        )
        if lesson_progress is None:
            raise APIError(
                409,
                "quiz_lesson_incomplete",
                "Quiz lesson incomplete",
                "Complete the associated lesson before starting this quiz.",
            )
    active = await db.scalar(
        select(QuizAttempt).where(
            QuizAttempt.enrollment_id == enrollment.id,
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.state == AttemptState.in_progress,
        )
    )
    if active is not None:
        return active
    attempts = int(
        await db.scalar(
            select(func.count())
            .select_from(QuizAttempt)
            .where(
                QuizAttempt.enrollment_id == enrollment.id,
                QuizAttempt.quiz_id == quiz.id,
            )
        )
        or 0
    )
    if attempts >= quiz.attempt_limit:
        raise APIError(
            409,
            "quiz_attempt_limit_reached",
            "Quiz attempt limit reached",
            "No quiz attempts remain.",
        )
    attempt = QuizAttempt(
        enrollment_id=enrollment.id,
        quiz_id=quiz.id,
        attempt_number=attempts + 1,
        state=AttemptState.in_progress,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.put(
    "/learning/quizzes/attempts/{attempt_id}/answers",
    response_model=dict[str, str],
)
async def answer_quiz_question(
    attempt_id: uuid.UUID,
    payload: QuizAnswerRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    await rate_limit(
        request,
        bucket="learning-quizzes",
        subject=str(auth.user.id),
        limit=settings.learning_quiz_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    attempt = await db.get(QuizAttempt, attempt_id)
    enrollment = await db.get(Enrollment, attempt.enrollment_id) if attempt is not None else None
    if (
        attempt is None
        or enrollment is None
        or enrollment.user_id != auth.user.id
        or attempt.state != AttemptState.in_progress
    ):
        raise APIError(
            404,
            "quiz_attempt_not_found",
            "Quiz attempt not found",
            "The active attempt does not exist.",
        )
    question = await db.get(QuizQuestion, payload.question_id)
    option = await db.get(QuizOption, payload.selected_option_id)
    if (
        question is None
        or question.quiz_id != attempt.quiz_id
        or option is None
        or option.question_id != question.id
    ):
        raise APIError(
            422,
            "invalid_quiz_answer",
            "Invalid quiz answer",
            "The question or selected option is invalid.",
        )
    answer = await db.scalar(
        select(QuizAnswer).where(
            QuizAnswer.attempt_id == attempt.id,
            QuizAnswer.question_id == question.id,
        )
    )
    if answer is None:
        answer = QuizAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            selected_option_id=option.id,
            is_correct=None,
        )
        db.add(answer)
    else:
        answer.selected_option_id = option.id
        answer.is_correct = None
    await db.commit()
    # Deliberately no correctness field before finalization.
    return {"status": "recorded"}


@router.post(
    "/learning/quizzes/attempts/{attempt_id}/finalize",
    response_model=QuizAttemptResponse,
)
async def finalize_attempt(
    attempt_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> QuizAttempt:
    await rate_limit(
        request,
        bucket="learning-quizzes",
        subject=str(auth.user.id),
        limit=settings.learning_quiz_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    attempt = await db.get(QuizAttempt, attempt_id)
    enrollment = await db.get(Enrollment, attempt.enrollment_id) if attempt is not None else None
    if attempt is None or enrollment is None or enrollment.user_id != auth.user.id:
        raise APIError(
            404,
            "quiz_attempt_not_found",
            "Quiz attempt not found",
            "The attempt does not exist.",
        )
    attempt = await finalize_quiz_attempt(db, attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.post(
    "/learning/certificates",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_certificate(
    payload: CertificateIssueRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Certificate:
    enrollment = await require_enrollment(db, auth.user.id, payload.enrollment_id)
    certificate = await issue_certificate(db, enrollment)
    add_audit_event(
        db,
        request,
        settings,
        "learning.certificate_issued",
        actor_user_id=auth.user.id,
        metadata={
            "certificate_id": str(certificate.id),
            "enrollment_id": str(enrollment.id),
            "verification_code": certificate.verification_code,
        },
    )
    await db.commit()
    await db.refresh(certificate)
    return certificate


@router.get(
    "/learning/certificates/verify/{verification_code}",
    response_model=CertificateVerificationResponse,
)
async def verify_certificate(
    verification_code: str, db: AsyncSession = Depends(get_session)
) -> CertificateVerificationResponse:
    certificate = await db.scalar(
        select(Certificate).where(
            Certificate.verification_code == verification_code,
            Certificate.revoked_at.is_(None),
        )
    )
    if certificate is None:
        raise APIError(
            404,
            "certificate_not_found",
            "Certificate not found",
            "No valid certificate has this verification code.",
        )
    return CertificateVerificationResponse(
        valid=True,
        verification_code=certificate.verification_code,
        recipient_display_name=certificate.recipient_display_name,
        course_title=certificate.course_title,
        issued_at=certificate.issued_at,
    )


@router.post("/learning/certificates/{certificate_id}/pdf", response_model=CertificateResponse)
async def render_certificate_pdf(
    certificate_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Certificate:
    certificate = await db.get(Certificate, certificate_id)
    enrollment = (
        await db.get(Enrollment, certificate.enrollment_id) if certificate is not None else None
    )
    if certificate is None or enrollment is None or enrollment.user_id != auth.user.id:
        raise APIError(
            404,
            "certificate_not_found",
            "Certificate not found",
            "The certificate does not exist.",
        )
    renderer = request.app.state.certificate_renderer
    pdf = await renderer.render_pdf(certificate_id=certificate.id)
    if not pdf.startswith(b"%PDF-"):
        raise APIError(
            502,
            "certificate_renderer_invalid_response",
            "Invalid certificate renderer response",
            "The configured renderer did not return a valid PDF document.",
        )
    storage: S3ObjectStorage = request.app.state.object_storage
    object_key = f"certificates/{enrollment.user_id}/{certificate.id}.pdf"
    stored = await storage.put_bytes(
        object_key=object_key, content_type="application/pdf", content=pdf
    )
    certificate.pdf_object_key = stored.object_key
    await db.commit()
    await db.refresh(certificate)
    return certificate
