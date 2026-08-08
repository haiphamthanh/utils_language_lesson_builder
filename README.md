# Language Lesson Builder

Một walking skeleton cho hành trình luyện viết ngoại ngữ: hệ thống đưa ra bài học, người học chép bằng tay trên giấy, sau đó xác nhận hoàn thành. PostgreSQL là nguồn dữ liệu duy nhất.

## Chạy example

Yêu cầu: Node.js 22+, PostgreSQL (Docker hoặc local), và OpenCode đã đăng nhập/configure provider.

```bash
./start.sh
```

`start.sh` là cách nhanh nhất: tự cài dependencies khi cần, khởi động PostgreSQL qua Docker (hoặc dùng PostgreSQL local), chạy migration/seed, sinh bài đầu tiên qua OpenCode và mở server.

Hoặc chạy thủ công:

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:setup
npm run app:bootstrap
npm start
```

Mở <http://localhost:9999>. Seed tạo sẵn một user demo và bài đầu tiên của hành trình “Software Engineering English”. Migration và seed có thể chạy lại an toàn. Nếu máy đã có PostgreSQL local, có thể bỏ Docker và đặt `DATABASE_URL` tới database đó.

## Lệnh chính

```bash
npm run dev       # server có hot reload
npm test          # kiểm thử tự động
npm run db:migrate
npm run db:seed
```

## Settings

| Biến | Mặc định | Vai trò |
| --- | --- | --- |
| `PORT` | `9999` | Cổng HTTP |
| `DATABASE_URL` | PostgreSQL trong `compose.yaml` | Nguồn dữ liệu duy nhất |
| `APP_TIME_ZONE` | `Asia/Ho_Chi_Minh` | Timezone của user demo để tính ngày học/streak |
| `DEMO_USER_ID` | UUID cố định | Danh tính tạm trước khi có authentication |
| `GENERATION_PROVIDER` | `opencode` | `opencode` cho bài thật; `sample` cho test/offline |
| `OPENCODE_MODEL` | `opencode-go/deepseek-v4-flash` | Model dùng để sinh structured lesson; phải xuất hiện trong `opencode models` |

> Ghi chú: một số model thinking (ví dụ `opencode-go/deepseek-v4-flash`) không hỗ trợ `tool_choice` mà structured output (json_schema) cần dùng. Generator tự thử structured output trước, nếu gặp lỗi `Thinking mode does not support this tool_choice` thì tự fallback sang yêu cầu JSON dạng text và parse + validate lại. Metadata `generationMetadata.structured` trong `ai_generation_requests.output_payload` cho biết đường nào đã dùng.
| `OPENCODE_PORT` | `4096` | Cổng server OpenCode nhúng |
| `OPENCODE_GENERATION_TIMEOUT_MS` | `180000` | Timeout cho một lần sinh bài |

## Luồng hiện tại

1. Web đọc bookmark và mở thẳng bài hiện tại. Nếu chưa có hành trình đang học (mới mở hoặc đã hoàn thành) thì hiện màn hình tạo hành trình mới.
2. Màn hình **Tạo hành trình mới** cho chọn chủ đề từ danh sách có sẵn, ngôn ngữ và trình độ. Bấm tạo sẽ vẽ lộ trình, sinh bài đầu tiên và mở thẳng.
3. Người học đọc rồi chép bài bằng tay trên giấy.
4. Nút **Đã chép xong** khóa vĩnh viễn bài hiện tại.
5. Cùng transaction đó ghi ngày học và chuyển bookmark.
6. OpenCode sinh bài kế tiếp từ topic, level, outline, bài đã khóa và các từ/cụm từ đã gặp; hết vòng một thì dùng lại nội dung đã khóa cho vòng ôn.
7. **Tạo bài khác** tạo version mới nhưng giữ lịch sử; bài đã Done hoặc đang ôn bị backend từ chối regenerate.
8. Khi hết vòng ôn, hành trình chuyển sang **completed** và hiện màn hình hoàn thành với nút **Tạo bài mới** để bắt đầu một hành trình khác (journey cũ được đặt tạm dừng, không bị xóa).
9. Thanh tiến độ đếm bài đã khóa, ngày học, streak và từ/cụm từ đã tiếp xúc; chỉ Done mới làm thay đổi số liệu.
10. Phần **Ôn lại** chỉ hiện danh sách các từ/cụm từ/cấu trúc; bấm vào một mục sẽ mở panel kế bên hiện nghĩa và 5 câu ví dụ.
11. **Đánh dấu (highlight)**: bôi đen một đoạn trong bài để đánh dấu kèm ghi chú; đoạn đánh dấu hiển thị như bút highlight có số, bấm vào để sửa/xoá. Dữ liệu lưu trong `lesson_highlights` theo lesson, offset theo từng đoạn.
12. Mỗi từ vựng, cụm từ và cấu trúc có đúng 5 câu ví dụ trong target language.
13. Hai nút mũi tên cho phép đi qua các bài đã khóa rồi quay về bài hiện tại; thao tác xem không thay đổi bookmark hoặc thống kê.

## Ranh giới MVP hiện tại

- Một user demo, chưa có authentication.
- OpenCode SDK chạy server nhúng, yêu cầu provider/model đã được cấu hình trong OpenCode. `GENERATION_PROVIDER=sample` vẫn có thể dùng khi test offline.
- Tạo hành trình mới từ **chủ đề có sẵn** (system topics); chưa có màn hình thêm chủ đề mới hay chọn lại hành trình đã tạm dừng.
- Không có editor: người học viết trên giấy.
- Core dữ liệu gồm journey, lesson/version, bookmark và study day.

Các ranh giới này giữ hệ thống nhỏ trước khi bổ sung tài khoản thật và màn hình tạo journey.

Chi tiết các invariant và hướng mở rộng nằm tại [docs/architecture.md](docs/architecture.md).
