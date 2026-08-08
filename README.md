# Language Lesson Builder

Một walking skeleton cho hành trình luyện viết ngoại ngữ: hệ thống đưa ra bài học, người học chép bằng tay trên giấy, sau đó xác nhận hoàn thành. PostgreSQL là nguồn dữ liệu duy nhất.

## Chạy example

Yêu cầu: Node.js 22+ và Docker.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:setup
npm start
```

Mở <http://localhost:3000>. Seed tạo sẵn một user demo và bài đầu tiên của hành trình “Software Engineering English”. Migration và seed có thể chạy lại an toàn.

## Lệnh chính

```bash
npm run dev       # server có hot reload
npm test          # kiểm thử tự động
npm run db:migrate
npm run db:seed
```

## Luồng hiện tại

1. Web đọc bookmark và mở thẳng bài hiện tại.
2. Người học đọc rồi chép bài bằng tay trên giấy.
3. Nút **Đã chép xong** khóa vĩnh viễn bài hiện tại.
4. Cùng transaction đó ghi ngày học và chuyển bookmark.
5. Example generator chuẩn bị bài tiếp theo; hết vòng một thì dùng lại nội dung đã khóa cho vòng ôn.

## Ranh giới MVP hiện tại

- Một user demo, chưa có authentication.
- Nội dung dùng example generator xác định trước; chưa gọi dịch vụ AI bên ngoài.
- Không có editor: người học viết trên giấy.
- Core dữ liệu gồm journey, lesson/version, bookmark và study day.

Các ranh giới này giữ hệ thống nhỏ trước khi bổ sung regenerate và thống kê.
