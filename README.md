# Language Lesson Builder

Một walking skeleton cho hành trình luyện viết ngoại ngữ: hệ thống đưa ra bài học, người học chép bằng tay trên giấy, sau đó xác nhận hoàn thành. PostgreSQL là nguồn dữ liệu duy nhất.

## Chạy example

Yêu cầu: Node.js 22+ và Docker.

```bash
./start.sh
```

`start.sh` là cách nhanh nhất: tự cài dependencies khi cần, khởi động PostgreSQL qua Docker (hoặc dùng PostgreSQL local), chạy migration/seed và mở server.

Hoặc chạy thủ công:

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:setup
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
| `GENERATION_PROVIDER` | `sample` | Provider sinh bài; MVP mới hỗ trợ `sample` |

## Luồng hiện tại

1. Web đọc bookmark và mở thẳng bài hiện tại.
2. Người học đọc rồi chép bài bằng tay trên giấy.
3. Nút **Đã chép xong** khóa vĩnh viễn bài hiện tại.
4. Cùng transaction đó ghi ngày học và chuyển bookmark.
5. Example generator chuẩn bị bài tiếp theo; hết vòng một thì dùng lại nội dung đã khóa cho vòng ôn.
6. **Tạo bài khác** tạo version mới nhưng giữ lịch sử; bài đã Done hoặc đang ôn bị backend từ chối regenerate.
7. Thanh tiến độ đếm bài đã khóa, ngày học, streak và từ/cụm từ đã tiếp xúc; chỉ Done mới làm thay đổi số liệu.

## Ranh giới MVP hiện tại

- Một user demo, chưa có authentication.
- `GENERATION_PROVIDER=sample` dùng example generator xác định trước; điểm mở rộng provider đã tách riêng nhưng chưa gọi dịch vụ AI bên ngoài.
- Không có editor: người học viết trên giấy.
- Core dữ liệu gồm journey, lesson/version, bookmark và study day.

Các ranh giới này giữ hệ thống nhỏ trước khi bổ sung tài khoản thật, màn hình tạo journey và provider AI production.

Chi tiết các invariant và hướng mở rộng nằm tại [docs/architecture.md](docs/architecture.md).
