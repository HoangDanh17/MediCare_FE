/**
 * URL backend — bỏ link ở đây (hoặc NEXT_PUBLIC_API_BASE_URL trong .env.local).
 * Trình duyệt gọi thẳng backend này (đã bật CORS cho origin FE, cert đã tin trong Windows).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7170";
