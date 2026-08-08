CREATE TABLE lesson_highlights (
  id uuid PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  paragraph_index integer NOT NULL CHECK (paragraph_index >= 0),
  start_offset integer NOT NULL CHECK (start_offset >= 0),
  end_offset integer NOT NULL CHECK (end_offset > start_offset),
  text text NOT NULL,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lesson_highlights_lesson_idx ON lesson_highlights (lesson_id);
