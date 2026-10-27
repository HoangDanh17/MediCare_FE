/**
 * URL backend — CHỈ dùng ở server (route handlers, server components).
 *
 * Không dùng tiền tố NEXT_PUBLIC_: giá trị này không bao giờ được đóng gói vào
 * bundle trình duyệt, nên backend có thể nằm trong mạng nội bộ (không cần public
 * port) khi deploy. Đặt biến API_BASE_URL trong .env / biến môi trường của server.
 */
export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:5000").replace(
  /\/+$/,
  "",
);
