/**
 * Courses
 * ---------------------------------------------------------------------------
 * The single largest predictor of whether someone finishes a course is whether
 * they can resume it in one tap, so "Continue learning" is the hero and it
 * names the *next lesson* rather than the course. "Resume" alone asks the
 * learner to remember where they were; naming the lesson removes that cost.
 *
 * Owned courses sit above the catalogue. A learning product that sells before
 * it serves teaches people to distrust the home screen, and the enrolment
 * numbers in the catalogue are already doing the selling.
 *
 * Curriculum state uses three shapes — a filled check, an open circle and a
 * padlock — so completed, available and locked survive greyscale. The locked
 * rows keep muted-not-quiet text: a syllabus you cannot read is not a preview.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  Icon,
  IconButton,
  Progress,
  ProgressRing,
  Surface,
} from '../../design-system/primitives';
import { Media, ScreenSection } from '../components';
import { COURSES } from '../data';

const CATEGORIES = ['All', 'Design', 'Statistics', 'Audio', 'Photography', 'Business', 'Live production'];

/** Ratings and prices sit outside the shared Course type but are real catalogue facts. */
const CATALOGUE_META: Record<string, { rating: number; reviews: string; price: string }> = {
  co1: { rating: 4.9, reviews: '1,204', price: '€129' },
  co2: { rating: 4.8, reviews: '3,918', price: '€149' },
  co3: { rating: 4.7, reviews: '412', price: '€89' },
  co4: { rating: 5.0, reviews: '688', price: '€69' },
};

const NEXT_LESSON = {
  module: 'Module 4 · Colour',
  title: 'Solving the solid step against WCAG instead of a fixed curve',
  duration: '18m 40s',
  remaining: '13 lessons left',
};

interface Lesson {
  title: string;
  duration: string;
  state: 'done' | 'next' | 'locked';
}

const CURRICULUM: { title: string; summary: string; lessons: Lesson[] }[] = [
  {
    title: 'Foundations',
    summary: 'Why a design system is a contract, not a component library',
    lessons: [
      { title: 'What a token actually is', duration: '12m 04s', state: 'done' },
      { title: 'Naming: semantic versus literal', duration: '16m 22s', state: 'done' },
      { title: 'Governance before tooling', duration: '21m 10s', state: 'done' },
    ],
  },
  {
    title: 'Space and type',
    summary: 'Building a lattice you can defend in a design review',
    lessons: [
      { title: 'Choosing a base unit', duration: '09m 48s', state: 'done' },
      { title: 'Optical sizing and why 1.6 beats 1.5', duration: '14m 30s', state: 'done' },
      { title: 'Measure, leading and the reading test', duration: '18m 12s', state: 'done' },
      { title: 'Fluid type without breakpoint soup', duration: '22m 55s', state: 'done' },
    ],
  },
  {
    title: 'Colour',
    summary: 'Perceptual colour, gamut mapping and provable contrast',
    lessons: [
      { title: 'From HSL to OKLCH', duration: '19m 26s', state: 'done' },
      { title: 'Generating a ramp from one hue', duration: '24m 18s', state: 'done' },
      { title: 'Solving the solid step against WCAG instead of a fixed curve', duration: '18m 40s', state: 'next' },
      { title: 'Gamut mapping for wide-gamut displays', duration: '26m 02s', state: 'locked' },
      { title: 'Auditing 82 pairs in CI', duration: '15m 44s', state: 'locked' },
    ],
  },
  {
    title: 'Shipping it',
    summary: 'Versioning, migration and the politics of a breaking change',
    lessons: [
      { title: 'Codemods that people trust', duration: '20m 08s', state: 'locked' },
      { title: 'Deprecation windows', duration: '13m 36s', state: 'locked' },
      { title: 'Measuring adoption honestly', duration: '17m 50s', state: 'locked' },
    ],
  },
];

const OUTCOMES = [
  'Generate a full colour ramp from a single hue and prove every pair against WCAG in CI',
  'Choose a spacing lattice and defend it without appealing to taste',
  'Write component APIs that survive three product teams and two rebrands',
  'Run a breaking change through a codebase of 400 screens without freezing the roadmap',
];

function Stars({ value, reviews }: { value: number; reviews: string }) {
  return (
    <span className="sy-course-rating">
      <span aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <Icon
            key={step}
            name="achievement"
            size={13}
            filled={value >= step - 0.25}
            className={value >= step - 0.25 ? 'is-full' : 'is-empty'}
          />
        ))}
      </span>
      <span className="sy-mono">{value.toFixed(1)}</span>
      <span className="sy-caption sy-fg-quiet">({reviews})</span>
      <span className="sy-sr-only">Rated {value.toFixed(1)} out of 5 from {reviews} reviews</span>
    </span>
  );
}

const LESSON_ICON = { done: 'check', next: 'play', locked: 'lock' } as const;

export function CoursesScreen() {
  const [category, setCategory] = useState('All');
  const [openModule, setOpenModule] = useState('Colour');

  const current = COURSES[0];
  const started = COURSES.filter((course) => course.progress !== undefined);
  const detail = COURSES[0];

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-learn">
        <ScreenSection eyebrow="Continue learning" title="Pick up where you stopped">
          <Surface className="sy-resume" padding="none" elevation="raised" radius="xl">
            <div className="sy-resume__cover">
              <Media seed={`${current.id}-cover`} ratio="16/9" radius="none" scrim>
                <span className="sy-resume__play">
                  <Icon name="play" size={24} />
                </span>
                <span className="sy-resume__duration sy-mono">{NEXT_LESSON.duration}</span>
              </Media>
            </div>
            <div className="sy-resume__body">
              <div className="sy-row sy-gap-2 sy-wrap">
                <Badge tone="accent" variant="soft" icon="courses">
                  {current.level}
                </Badge>
                <span className="sy-caption sy-fg-quiet">{NEXT_LESSON.module}</span>
              </div>
              <h3 className="sy-title-3 sy-resume__title">{NEXT_LESSON.title}</h3>
              <p className="sy-body-sm sy-fg-muted">
                {current.title} · {current.instructor}
              </p>

              <div className="sy-resume__progress">
                <ProgressRing value={current.progress ?? 0} size={52} thickness={5} label="Course progress">
                  <span className="sy-mono sy-resume__ring">{current.progress}%</span>
                </ProgressRing>
                <div className="sy-grow">
                  <Progress value={current.progress} label={`${current.title} progress`} />
                  <p className="sy-caption sy-fg-muted sy-resume__meta">
                    21 of {current.lessons} lessons complete · {NEXT_LESSON.remaining} · {current.hours} total
                  </p>
                </div>
              </div>

              <div className="sy-resume__actions">
                <Button variant="primary" icon="play" size="lg">
                  Resume lesson
                </Button>
                <Button variant="outline" icon="list">
                  Syllabus
                </Button>
                <IconButton icon="download" label="Download for offline viewing" variant="ghost" size="lg" />
              </div>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="My courses"
          eyebrow={`${COURSES.length} enrolled · ${started.length} in progress`}
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              Archive
            </Button>
          }
        >
          <div className="sy-grid sy-enter sy-course-grid">
            {COURSES.map((course) => (
              <Surface
                key={course.id}
                as="article"
                className="sy-course-card"
                padding="none"
                elevation="surface"
                interactive
              >
                <Media seed={course.id} ratio="16/9" radius="none">
                  <span className="sy-course-card__level">
                    <Badge tone="neutral" variant="solid">
                      {course.level}
                    </Badge>
                  </span>
                </Media>
                <div className="sy-course-card__body">
                  <h3 className="sy-course-card__title sy-clamp-2">{course.title}</h3>
                  <span className="sy-course-card__author">
                    <Avatar name={course.instructor} size={20} />
                    <span className="sy-caption sy-fg-muted sy-truncate">{course.instructor}</span>
                  </span>
                  <p className="sy-caption sy-fg-quiet">
                    {course.lessons} lessons · {course.hours}
                  </p>
                  {course.progress === undefined ? (
                    <span className="sy-course-card__notstarted">
                      <Icon name="clock" size={13} />
                      Not started
                    </span>
                  ) : (
                    <div className="sy-course-card__progress">
                      <Progress value={course.progress} size="sm" label={`${course.title} progress`} />
                      <span className="sy-mono sy-caption">{course.progress}%</span>
                    </div>
                  )}
                </div>
              </Surface>
            ))}
          </div>
        </ScreenSection>

        <ScreenSection title="Catalogue" eyebrow="4,182 courses from 900 creators">
          <div className="sy-scroller sy-learn-cats" role="group" aria-label="Course categories">
            {CATEGORIES.map((name) => (
              <Chip key={name} selected={category === name} onClick={() => setCategory(name)}>
                {name}
              </Chip>
            ))}
          </div>

          <div className="sy-grid sy-course-grid">
            {COURSES.map((course) => {
              const meta = CATALOGUE_META[course.id];
              return (
                <Surface
                  key={`cat-${course.id}`}
                  as="article"
                  className="sy-course-card"
                  padding="none"
                  elevation="surface"
                  interactive
                >
                  <Media seed={`${course.id}-catalogue`} ratio="16/9" radius="none" />
                  <div className="sy-course-card__body">
                    <h3 className="sy-course-card__title sy-clamp-2">{course.title}</h3>
                    <span className="sy-course-card__author">
                      <Avatar name={course.instructor} size={20} />
                      <span className="sy-caption sy-fg-muted sy-truncate">{course.instructor}</span>
                    </span>
                    <Stars value={meta.rating} reviews={meta.reviews} />
                    <div className="sy-course-card__foot">
                      <span className="sy-mono sy-course-card__price">{meta.price}</span>
                      <span className="sy-caption sy-fg-quiet">{course.enrolled} enrolled</span>
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        </ScreenSection>

        <ScreenSection title={detail.title} eyebrow="Course detail">
          <div className="sy-cols sy-cols--sidebar">
            <Surface elevation="surface" padding="lg" radius="lg" className="sy-curriculum">
              <div className="sy-between sy-row sy-curriculum__head">
                <div>
                  <h3 className="sy-headline">Curriculum</h3>
                  <p className="sy-caption sy-fg-quiet">
                    {CURRICULUM.length} modules · {detail.lessons} lessons · {detail.hours}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Expand all
                </Button>
              </div>

              <ul className="sy-modules">
                {CURRICULUM.map((module, index) => {
                  const open = module.title === openModule;
                  const done = module.lessons.filter((lesson) => lesson.state === 'done').length;
                  return (
                    <li key={module.title} className={open ? 'is-open' : undefined}>
                      <button
                        type="button"
                        className="sy-module__head"
                        aria-expanded={open}
                        onClick={() => setOpenModule(open ? '' : module.title)}
                      >
                        <span className="sy-module__index sy-mono">{String(index + 1).padStart(2, '0')}</span>
                        <span className="sy-module__text">
                          <span className="sy-label">{module.title}</span>
                          <span className="sy-caption sy-fg-quiet sy-truncate">{module.summary}</span>
                        </span>
                        <span className="sy-caption sy-fg-muted sy-module__count">
                          {done}/{module.lessons.length}
                        </span>
                        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
                      </button>
                      {open && (
                        <ul className="sy-lessons">
                          {module.lessons.map((lesson) => (
                            <li key={lesson.title} className={`is-${lesson.state}`}>
                              <span className="sy-lesson__mark">
                                <Icon name={LESSON_ICON[lesson.state]} size={13} />
                              </span>
                              <span className="sy-body-sm sy-grow">{lesson.title}</span>
                              <span className="sy-mono sy-caption sy-fg-quiet">{lesson.duration}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="sy-outcomes">
                <h3 className="sy-headline">What you will be able to do</h3>
                <ul>
                  {OUTCOMES.map((outcome) => (
                    <li key={outcome}>
                      <Icon name="check" size={15} />
                      <span className="sy-body-sm">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Surface>

            <div className="sy-stack sy-gap-5">
              <Surface elevation="raised" padding="lg" radius="lg" className="sy-enrol">
                <span className="sy-overline sy-fg-accent">Full course</span>
                <p className="sy-enrol__price sy-mono-lg">{CATALOGUE_META[detail.id].price}</p>
                <p className="sy-caption sy-fg-muted">
                  One payment. Lifetime access, including every future module.
                </p>
                <Button variant="primary" fullWidth size="lg" icon="courses">
                  Enrol now
                </Button>
                <Button variant="outline" fullWidth icon="gift">
                  Gift this course
                </Button>
                <ul className="sy-enrol__includes">
                  <li>
                    <Icon name="video" size={15} />
                    {detail.hours} of video, downloadable
                  </li>
                  <li>
                    <Icon name="attach" size={15} />
                    Token generator source and 12 exercises
                  </li>
                  <li>
                    <Icon name="certificate" size={15} />
                    Certificate on completion
                  </li>
                  <li>
                    <Icon name="community" size={15} />
                    Access to Design Systems Guild
                  </li>
                </ul>
              </Surface>

              <Surface elevation="surface" padding="lg" radius="lg" className="sy-instructor">
                <div className="sy-instructor__head">
                  <Avatar name={detail.instructor} size={52} verified ring="story" />
                  <div className="sy-grow">
                    <p className="sy-label">{detail.instructor}</p>
                    <p className="sy-caption sy-fg-quiet">@amara.builds · 482K followers</p>
                  </div>
                </div>
                <p className="sy-body-sm sy-fg-muted">
                  Systems designer. Built the token pipeline this course teaches, first at a bank and
                  then in the open. Teaches live most Thursdays.
                </p>
                <div className="sy-instructor__stats">
                  <div>
                    <span className="sy-mono">6</span>
                    <span className="sy-caption sy-fg-quiet">courses</span>
                  </div>
                  <div>
                    <span className="sy-mono">18.2K</span>
                    <span className="sy-caption sy-fg-quiet">learners</span>
                  </div>
                  <div>
                    <span className="sy-mono">4.9</span>
                    <span className="sy-caption sy-fg-quiet">avg rating</span>
                  </div>
                </div>
              </Surface>

              {/* The certificate is shown as an artefact rather than a receipt: it is
                  the thing learners screenshot, so it deserves to look like paper. */}
              <Surface elevation="surface" padding="lg" radius="lg">
                <div className="sy-between sy-row sy-certificate__head">
                  <h3 className="sy-headline">Certificate earned</h3>
                  <Badge tone="success" variant="soft" icon="check">
                    Completed
                  </Badge>
                </div>
                <div className="sy-certificate">
                  <span className="sy-certificate__seal" aria-hidden="true">
                    <Icon name="certificate" size={26} />
                  </span>
                  <p className="sy-overline sy-certificate__eyebrow">SYLORA Learning</p>
                  <p className="sy-certificate__title">The Darkroom Method</p>
                  <p className="sy-caption sy-certificate__name">Awarded to Jordan Reyes</p>
                  <div className="sy-certificate__foot">
                    <span className="sy-caption">Mateo Fernández-Ruiz</span>
                    <span className="sy-mono sy-caption">CERT-4417-DM</span>
                  </div>
                </div>
                <div className="sy-certificate__actions">
                  <Button variant="outline" size="sm" icon="download">
                    Download PDF
                  </Button>
                  <Button variant="ghost" size="sm" icon="share">
                    Share
                  </Button>
                </div>
              </Surface>
            </div>
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}
