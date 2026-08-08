CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  language_scope text,
  is_system boolean NOT NULL DEFAULT false,
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journeys (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  topic_id uuid NOT NULL REFERENCES topics(id),
  language text NOT NULL,
  level text NOT NULL,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'reviewing', 'completed', 'paused')),
  max_cycles integer NOT NULL DEFAULT 2 CHECK (max_cycles > 0),
  planned_lesson_count integer NOT NULL CHECK (planned_lesson_count > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journey_steps (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  title text NOT NULL,
  objective text NOT NULL,
  continuation_hint text NOT NULL DEFAULT '',
  is_final_step boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, sequence_number)
);

CREATE TABLE lessons (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  journey_step_id uuid NOT NULL REFERENCES journey_steps(id),
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  cycle_number integer NOT NULL DEFAULT 1 CHECK (cycle_number > 0),
  status text NOT NULL CHECK (status IN ('draft', 'generating', 'ready', 'completed', 'failed')),
  active_version_id uuid,
  previous_lesson_id uuid REFERENCES lessons(id),
  source_lesson_id uuid REFERENCES lessons(id),
  is_locked boolean NOT NULL DEFAULT false,
  generated_at timestamptz,
  completed_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, sequence_number, cycle_number),
  CHECK (
    (status = 'completed' AND is_locked = true AND completed_at IS NOT NULL AND locked_at IS NOT NULL)
    OR status <> 'completed'
  )
);

CREATE TABLE lesson_versions (
  id uuid PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  title text NOT NULL,
  content text NOT NULL,
  summary text NOT NULL DEFAULT '',
  review_content jsonb NOT NULL DEFAULT '{"vocabulary": [], "phrases": [], "grammar": []}'::jsonb,
  prompt_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, version_number)
);

ALTER TABLE lessons
  ADD CONSTRAINT lessons_active_version_fk
  FOREIGN KEY (active_version_id) REFERENCES lesson_versions(id);

CREATE UNIQUE INDEX one_active_version_per_lesson
  ON lesson_versions (lesson_id)
  WHERE is_active = true;

CREATE TABLE user_journey_progress (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  current_lesson_id uuid NOT NULL REFERENCES lessons(id),
  current_step_number integer NOT NULL CHECK (current_step_number > 0),
  current_cycle integer NOT NULL DEFAULT 1 CHECK (current_cycle > 0),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, journey_id)
);

CREATE TABLE study_days (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  study_date date NOT NULL,
  lessons_completed integer NOT NULL DEFAULT 0 CHECK (lessons_completed >= 0),
  cycles_completed integer NOT NULL DEFAULT 0 CHECK (cycles_completed >= 0),
  first_completed_at timestamptz NOT NULL,
  last_completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, study_date)
);

CREATE INDEX journeys_user_status_idx ON journeys (user_id, status);
CREATE INDEX lessons_journey_cycle_idx ON lessons (journey_id, cycle_number, sequence_number);
CREATE INDEX study_days_user_date_idx ON study_days (user_id, study_date DESC);
