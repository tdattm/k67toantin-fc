# Hướng dẫn đóng góp

Cảm ơn bạn muốn cải thiện Lịch Đá Bóng Đội. Mọi đóng góp về tính năng, sửa lỗi, giao diện, khả năng sử dụng và tài liệu đều được chào đón.

## Trước khi bắt đầu

- Với lỗi, hãy mở GitHub Issue và ghi các bước tái hiện, kết quả mong muốn, kết quả thực tế, trình duyệt và thiết bị nếu có liên quan. Đính kèm ảnh hoặc video đã loại bỏ email, tên, link riêng và dữ liệu cá nhân.
- Với tính năng mới hoặc thay đổi lớn, hãy mở Issue mô tả vấn đề cần giải quyết và cách bạn đề xuất xử lý. Trao đổi trước giúp tránh công sức trùng lặp.
- Với thay đổi nhỏ như sửa chính tả hoặc lỗi giao diện rõ ràng, bạn có thể mở Pull Request trực tiếp.

## Chuẩn bị môi trường

1. Cài Git và Node.js 24.
2. Fork repository, sau đó clone fork của bạn:

   ```bash
   git clone https://github.com/<ten-cua-ban>/k67toantin-fc.git
   cd k67toantin-fc
   ```

3. Cài gói và tạo cấu hình local:

   ```bash
   npm ci
   cp .env.example .env.local
   ```

   Trên PowerShell, dùng `Copy-Item .env.example .env.local`. Trang chủ và demo có thể chạy mà không điền dịch vụ ngoài. Để thử đăng nhập, tạo đội và lưu dữ liệu, hãy tự cấu hình các biến mẫu Firebase và Redis trong `.env.local`. Không dùng hoặc chia sẻ credential của người khác.

   Để cấu hình luồng tài khoản, tạo project Firebase của bạn, bật đăng nhập Email/Password, đăng ký một ứng dụng web và thêm `localhost` vào danh sách domain được phép. Điền bốn giá trị web vào các biến `NEXT_PUBLIC_FIREBASE_*`. Điền `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` và `FIREBASE_PRIVATE_KEY` bằng credential server của chính bạn; khóa riêng chỉ dùng ở biến server, không thêm tiền tố `NEXT_PUBLIC_`. Để lưu đội tài khoản, điền `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` của database Redis riêng. Dừng và khởi động lại dự án sau khi thay đổi `.env.local`.

4. Tạo nhánh làm việc riêng:

   ```bash
   git switch -c feat/mo-ta-ngan
   ```

   Đặt tên `feat/...` cho tính năng, `fix/...` cho sửa lỗi và `docs/...` cho tài liệu.

## Nguyên tắc khi sửa dự án

- Giữ demo độc lập với đội thật. Chỉ dùng dữ liệu giả lập; không ghi fixture demo vào tài khoản hoặc kho dữ liệu thật.
- Không đưa mật khẩu, khóa, token, email thật, thông tin thành viên thật hay file `.env.local` vào commit. Kiểm tra `git status` trước khi commit.
- Mọi quyền của đội tài khoản phải được kiểm tra ở phía máy chủ. Không dùng tên, local storage, link đội hoặc cờ quyền do trình duyệt gửi để cấp quyền.
- Bảo toàn cách mở đội cũ bằng link. Không tự liên kết thành viên legacy với tài khoản mới và không để API legacy tác động lên đội tài khoản.
- Giữ kiểm tra số áo duy nhất trong từng đội và cập nhật chỉ mục dữ liệu cùng thao tác thay đổi đội.
- Khi sửa nội dung giao diện, dùng tiếng Việt rõ ràng và thông báo điều người dùng có thể thực hiện tiếp theo.

## Kiểm tra thay đổi

Chạy các lệnh phù hợp trước khi gửi Pull Request:

```bash
npm run typecheck
npm run test:auth
npm run build
```

Nếu thay đổi ảnh hưởng đến luồng đăng nhập, đội, lịch hoặc Dream Team, hãy mô tả thêm cách bạn đã kiểm tra. Không đưa tài khoản thật hoặc credential vào test. Nếu cần ảnh minh họa, dùng demo hoặc dữ liệu giả lập.

## Gửi Pull Request

1. Commit thay đổi trên nhánh riêng với thông điệp ngắn, ví dụ `fix: giữ lịch khi đổi số áo` hoặc `docs: hướng dẫn chạy local`.
2. Push nhánh lên fork của bạn và mở Pull Request hướng về nhánh mặc định của repository này.
3. Trong mô tả Pull Request, nêu vấn đề, giải pháp, các thay đổi chính và kết quả kiểm tra. Liên kết Issue liên quan nếu có.
4. Thêm ảnh chụp màn hình khi thay đổi giao diện; chỉ dùng dữ liệu giả lập.
5. Trả lời góp ý và cập nhật nhánh cho tới khi thay đổi sẵn sàng được xem xét.

Không đưa khóa bí mật vào phần mô tả Pull Request, Issue, ảnh chụp màn hình hoặc nhật ký kiểm thử. Việc gửi Pull Request không đồng nghĩa với tự động triển khai lên trang web.
