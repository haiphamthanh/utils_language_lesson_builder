CREATE TABLE user_generation_state (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  request_type text NOT NULL CHECK (request_type IN ('journey_creation', 'lesson_generation', 'regeneration')),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
