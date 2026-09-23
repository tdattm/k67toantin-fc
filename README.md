# Lịch đá bóng đội ⚽

MVP tiếng Việt: link riêng cho đội, thêm/xoá thành viên, chọn 21 khung giờ và top 5 buổi ít người vắng nhất. Next.js App Router + TypeScript + Tailwind CSS, không đăng nhập.

## Chạy local

Node.js >= 20.9 (khuyến nghị Node 22 LTS).

```sh
npm install
npm run dev
```

Mở http://localhost:3000. Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd`.

```sh
npm run build
npm start
npm run typecheck
```

## Deploy Vercel

Import repo GitHub vào Vercel, chọn framework Next.js rồi Deploy; dùng cấu hình build mặc định. Hoặc từ thư mục dự án:

```sh
npx vercel
npx vercel --prod
```

CLI yêu cầu đăng nhập và chọn project. Repo sẵn sàng deploy, chưa tự triển khai vào tài khoản nào.

## Lưu trữ

**Demo không cấu hình:** lưu JSON tại `lich-da-bong-doi` trong thư mục tạm của OS (`/tmp` trên Vercel). Dữ liệu có thể mất khi redeploy/cold start. Các instance Vercel không chia sẻ filesystem, nên người dùng có thể không thấy cùng đội. Chỉ phù hợp demo, không đảm bảo chia sẻ ổn định. UI có cảnh báo. File hết hạn không đọc được nữa; OS quản lý dọn thư mục tạm.

**Chia sẻ trên nhiều thiết bị qua Vercel:** tạo Upstash Redis qua Vercel Marketplace hoặc Upstash; vào Project Settings → Environment Variables, thêm:

```dotenv
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
```

Chọn đúng Production/Preview rồi redeploy. Local: copy `.env.example` thành `.env.local`, điền cả hai biến, khởi động lại server. Hỗ trợ tên cũ `KV_REST_API_URL` / `KV_REST_API_TOKEN`. Không thêm tiền tố `NEXT_PUBLIC_`. Thiếu một biến sẽ báo lỗi thay vì âm thầm dùng file. Đội đã tạo bằng file không tự chuyển sang Redis.

Gọi [Upstash REST API](https://upstash.com/docs/redis/features/restapi) trực tiếp, không cần SDK. TTL 28 ngày kể từ khi tạo đội. Redis dùng compare-and-set nguyên tử kèm retry để tránh ghi đè cập nhật giữa các thành viên. File tuần tự hoá ghi trong một process. Nếu hai người sửa cùng một thành viên, lần lưu cuối cùng thắng.

## Cách dùng

1. Tạo đội, chia sẻ link `/team/<slug>` vào nhóm chat.
2. Thêm họ tên và số áo (tối đa 60 người, tên 1–50 ký tự, số áo nguyên từ 0–99 và không trùng trong đội). Tên một từ yêu cầu nhập lại; tên hai từ hiện cảnh báo thân thiện và cho phép chọn **Tiếp tục** hoặc **Nhập lại**; từ ba từ trở lên được chấp nhận. Cho phép trùng tên; số áo hiển thị ở đội hình, danh sách chọn người và danh sách vắng. Thành viên cũ chưa có số áo vẫn giữ nguyên lịch và dùng được bình thường.
3. Mỗi người chọn tên mình, tick giờ rảnh, bấm **Lưu giờ rảnh**. Không rảnh buổi nào vẫn lưu với tất cả ô bỏ chọn.
4. Top 5 xếp theo số vắng tăng dần; bằng điểm thì theo thứ/buổi. Người chưa nhập lịch tạm tính là vắng và được đánh dấu riêng. Khi chưa ai nhập, bảng hiển thị trạng thái chờ.

Lịch tuần điển hình: Thứ 2–Chủ nhật × Sáng 6–9h / Chiều 14–17h / Tối 19–22h, không gắn ngày cụ thể. Tự tải mỗi 15 giây khi trang đang hiển thị và khi quay lại cửa sổ. Bản nháp được giữ khi cập nhật; cần lưu hoặc huỷ trước khi đổi tên đang chọn.

Ai có link đều có quyền sửa/xoá; xoá có bước xác nhận. Không nhập thông tin nhạy cảm. MVP chưa có rate limiting/chống spam. Polling dùng request/lệnh Redis, cần theo dõi quota gói đang dùng.

## Đội bóng trong mơ

Trong trang đội, chọn thành viên ở mục **Đội bóng trong mơ** để xếp hoặc xem đội hình riêng của người đó. Hai sơ đồ sân 7 được hỗ trợ:

- **3-1-2:** GK, LB, CB, RB, CM và hai ST (trái/phải).
- **2-3-1:** GK, hai CB (trái/phải), LM, CM, RM và ST.

Kéo tên cầu thủ từ danh sách vào sân hoặc hành lang xanh nối bên phải sân. Hành lang có ba khu vực nét đứt bo góc: **Y tế**, **Xách nước / bổ cam** và **Siêu dự bị**, mỗi khu vực có biểu tượng riêng và tối đa 4 cầu thủ. Mỗi vị trí hiển thị vòng tròn số áo, tên ở dưới; vòng tròn nét đứt là vị trí còn trống. Trên điện thoại, kéo từ số áo màu xanh hoặc chạm tên rồi chạm vị trí; dùng bàn phím Tab và Enter cũng được. Sân có áo xanh Italia, số áo trên áo và tên bên dưới. Mỗi cầu thủ chỉ chiếm một vị trí trên sân hoặc hành lang; nút × đưa cầu thủ về danh sách.

Bấm **Lưu đội hình** để lưu lựa chọn của thành viên; có thể lưu khi chưa đủ 7 người hoặc chưa chọn vị trí hỗ trợ. Đổi sơ đồ giữ các vị trí chung, các vị trí không còn phù hợp được trả về danh sách. Bấm **Huỷ thay đổi đội hình** để khôi phục bản đã lưu. Bản nháp không bị ghi đè bởi polling; nếu mất mạng khi lưu, bản nháp vẫn còn.

Đội hình lưu cùng dữ liệu đội trong JSON/Redis, dùng chung thời hạn 28 ngày. Xoá thành viên sẽ bỏ cầu thủ đó khỏi mọi đội hình và xoá đội hình riêng của họ. Dữ liệu đội cũ không cần chuyển đổi. Giống lịch rảnh, ai có link cũng có thể chọn tên để xem hoặc sửa đội hình; không có xác thực danh tính.

## Kiểm tra nhanh

- Mở cùng link trong hai trình duyệt; thêm hai người, lưu các lịch khác nhau.
- Đợi tối đa 15 giây, đối chiếu số rảnh/vắng, top 5 và tên người vắng.
- Thử lịch trống, hai người cùng tên khác số áo, số áo trùng/không hợp lệ, huỷ/xác nhận xoá và mất mạng khi lưu.
- Kiểm tra mobile và điều hướng bàn phím.

Tài liệu framework: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).
