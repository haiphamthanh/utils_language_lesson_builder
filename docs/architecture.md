# Kiến trúc MVP

Tài liệu này cô đọng quyết định từ brainstorming, đặc biệt là bài 005. Mục tiêu là giữ một đường đi chính nhỏ, chạy được và khó làm sai dữ liệu.

## Đường đi chính

```text
Mở web
  → đọc bookmark
  → xem bài hiện tại
  → chép bằng tay trên giấy
  → Done
  → khóa bài + ghi ngày học + chuyển bookmark (một transaction)
  → sinh/mở bài kế tiếp
```

Hệ thống không có editor, submission hay chấm bài. `Done` là tín hiệu duy nhất xác nhận người học đã hoàn thành.

## Các invariant không được phá vỡ

1. Chỉ bài hiện tại, `ready`, chưa khóa và ở vòng 1 mới được regenerate.
2. Regenerate luôn tạo `lesson_versions` mới; không ghi đè lịch sử.
3. Bài `completed` bị khóa ở backend, không chỉ ẩn nút trên UI.
4. Complete là idempotent: gọi lại không tăng `study_days` hoặc tạo lesson trùng.
5. Lock bài, ghi ngày học và chuyển bookmark nằm cùng một PostgreSQL transaction.
6. Vòng ôn tạo một lesson progress mới nhưng tham chiếu version đã khóa ở vòng 1.
7. Thống kê chỉ tính lesson đã Done. Mở web hoặc regenerate không tạo ngày học.
8. “Từ đã gặp” là thống kê tiếp xúc, không được gọi là “từ đã thuộc”.
9. Đọc bài lịch sử là read-only: không đổi `user_journey_progress`, không tăng thống kê và không hiện action mutate.
10. Tạo journey mới (POST /api/journeys) chuyển các journey `active`/`reviewing` khác của user sang `paused` trong cùng transaction, để `current lesson` luôn chỉ một hành trình rõ ràng.

## Ranh giới module

```text
HTTP routes (src/app.js)
  → services: điều phối use case
    → repositories: query + transaction PostgreSQL
      → migrations: invariant ở tầng dữ liệu

services
  → lesson generator interface
    → OpenCode SDK provider (mặc định)
    → sample provider (test/offline)
```

Vanilla HTML/CSS/JS chỉ hiển thị trạng thái và phát action. Toàn bộ quy tắc lock, current lesson, cycle và số liệu nằm ở backend.

## Dữ liệu core

- `users`, `topics`, `journeys`, `journey_steps`: người học và outline.
- `lessons`: danh tính/trạng thái logic của một lượt học.
- `lesson_versions`: nội dung bất biến theo version; review tạm lưu JSONB.
- `lesson_highlights`: đánh dấu + ghi chú theo lesson, định vị bằng `paragraph_index`/`start_offset`/`end_offset` (offset vào dòng của nội dung active version). Khi render, highlight chỉ hiện nếu đoạn văn bản hiện tại vẫn khớp `text` đã lưu, nên nội dung bị regenerate thì highlight cũ tự ẩn.
- `user_journey_progress`: bookmark để mở đúng bài.
- `study_days`: một hàng mỗi user/ngày, chỉ cập nhật bởi Done.
- `ai_generation_requests`: audit context/output/lỗi cho cả bài kế tiếp và regenerate.

Chưa tách vocabulary thành nhiều bảng. Khi cần tìm kiếm/tổng hợp ở quy mô lớn, migrate dữ liệu JSONB sang `vocabulary_items`, `lesson_vocabulary` và `user_vocabulary_progress`; không cần thay đổi luồng Done.

## Thứ tự mở rộng đề xuất

1. Authentication và user context thật, thay user demo.
2. Màn hình thêm chủ đề mới (custom topic) và chọn lại hành trình đã tạm dừng.
3. Worker generation chỉ khi request AI thực sự chậm; chưa cần queue ở MVP.
4. Chuẩn hóa vocabulary khi dashboard JSONB không còn đáp ứng.

Không thêm Redis, microservice hay realtime trước khi có số liệu cho thấy một process Express + PostgreSQL là không đủ.
