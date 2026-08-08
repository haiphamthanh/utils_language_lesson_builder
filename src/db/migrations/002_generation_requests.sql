CREATE TABLE ai_generation_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('regenerate')),
  prompt_version text NOT NULL,
  input_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE lesson_versions
  ADD COLUMN generation_request_id uuid REFERENCES ai_generation_requests(id);

CREATE INDEX generation_requests_lesson_created_idx
  ON ai_generation_requests (lesson_id, created_at DESC);
