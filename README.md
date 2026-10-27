# MediCare (Next.js)

Giao diện quản trị MediCare. Trình duyệt **không** gọi thẳng backend và **không**
giữ token: mọi lời gọi API đi qua BFF của Next.

## Kiến trúc

```
Trình duyệt ──fetch /api/...──▶ Next Route Handlers ──Bearer token──▶ Backend
              (cookie httpOnly)      (single-flight refresh)
```

- `app/api/auth/login`, `app/api/auth/logout`: nhận/ghi cookie phiên httpOnly.
- `app/api/[...path]`: proxy mọi endpoint còn lại, tự gắn `Authorization: Bearer`
  và tự refresh khi access token hết hạn hoặc bị từ chối.
- `lib/server-auth.ts`: đọc/ghi cookie, giữ refresh token và single-flight refresh.
  Backend dùng refresh token một lần (dùng lại sẽ thu hồi toàn bộ phiên), nên các
  request đồng thời phải dùng chung một lần refresh.
- `lib/api-client.ts`: chỉ fetch cùng origin tới `/api/...`; 401 → chuyển /login,
  403 → refetch quyền, 503 → báo lỗi tạm thời.

Token nằm trong cookie `HttpOnly; SameSite=Lax` (`Secure` khi production), không
lưu ở `localStorage`/`sessionStorage` và không xuất hiện trong bundle client.

## Cấu hình

Tạo `.env` (xem `.env.example`):

```bash
API_BASE_URL=http://localhost:5000
```

`API_BASE_URL` là biến **server-only**. Khi deploy, trỏ nó tới địa chỉ nội bộ của
backend; backend không cần mở public port và không cần cấu hình CORS cho FE.

## Chạy

```bash
npm run dev     # http://localhost:3000
npm run build
npm start
```

## Lưu ý triển khai nhiều instance

Single-flight refresh nằm trong bộ nhớ của một tiến trình Next. Nếu chạy nhiều
instance Next sau load balancer, các request đồng thời của cùng người dùng có
thể rơi vào nhiều instance và cùng refresh → backend coi là dùng lại refresh
token và thu hồi phiên. Cần sticky session theo cookie phiên, hoặc chạy một
instance, hoặc chuyển trạng thái single-flight sang store dùng chung.
