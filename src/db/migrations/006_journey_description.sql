ALTER TABLE journeys
  ADD COLUMN description text NOT NULL DEFAULT '';

UPDATE journeys
SET description = 'Một hành trình luyện viết được mở ra như một cổ thư, dẫn bạn đi sâu hơn qua từng bài học.'
WHERE description = '';
