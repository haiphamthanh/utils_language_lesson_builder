ALTER TABLE ai_generation_requests
  DROP CONSTRAINT ai_generation_requests_request_type_check;

ALTER TABLE ai_generation_requests
  ADD CONSTRAINT ai_generation_requests_request_type_check
  CHECK (request_type IN ('next_lesson', 'regenerate'));
