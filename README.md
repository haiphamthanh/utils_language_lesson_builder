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
| `OPENCODE_MODEL` | `opencode-go/gpt-5.6-luna` | Model dùng để sinh structured lesson; phải xuất hiện trong `opencode models` |
| `OPENCODE_PORT` | `4096` | Cổng server OpenCode nhúng |
| `OPENCODE_GENERATION_TIMEOUT_MS` | `180000` | Timeout cho một lần sinh bài |

## Luồng hiện tại

1. Web đọc bookmark và mở thẳng bài hiện tại.
2. Người học đọc rồi chép bài bằng tay trên giấy.
3. Nút **Đã chép xong** khóa vĩnh viễn bài hiện tại.
4. Cùng transaction đó ghi ngày học và chuyển bookmark.
5. OpenCode sinh bài kế tiếp từ topic, level, outline, bài đã khóa và các từ/cụm từ đã gặp; hết vòng một thì dùng lại nội dung đã khóa cho vòng ôn.
6. **Tạo bài khác** tạo version mới nhưng giữ lịch sử; bài đã Done hoặc đang ôn bị backend từ chối regenerate.
7. Thanh tiến độ đếm bài đã khóa, ngày học, streak và từ/cụm từ đã tiếp xúc; chỉ Done mới làm thay đổi số liệu.
8. Mỗi từ vựng, cụm từ và cấu trúc có đúng 5 câu ví dụ trong target language.
9. Hai nút mũi tên cho phép đi qua các bài đã khóa rồi quay về bài hiện tại; thao tác xem không thay đổi bookmark hoặc thống kê.

## Ranh giới MVP hiện tại

- Một user demo, chưa có authentication.
- OpenCode SDK chạy server nhúng, yêu cầu provider/model đã được cấu hình trong OpenCode. `GENERATION_PROVIDER=sample` vẫn có thể dùng khi test offline.
- Không có editor: người học viết trên giấy.
- Core dữ liệu gồm journey, lesson/version, bookmark và study day.

Các ranh giới này giữ hệ thống nhỏ trước khi bổ sung tài khoản thật và màn hình tạo journey.

Chi tiết các invariant và hướng mở rộng nằm tại [docs/architecture.md](docs/architecture.md).
