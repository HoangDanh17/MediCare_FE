import Link from "next/link";

import { hasSession } from "@/lib/server-auth";

const FEATURES = [
  {
    title: "Đặt lịch 24/7",
    description:
      "Bệnh nhân chủ động đặt lịch khám mọi lúc, không cần chờ đợi hay gọi điện đặt trước.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    title: "Chọn đúng chuyên khoa",
    description:
      "Danh mục khoa rõ ràng giúp bệnh nhân chọn đúng chuyên khoa phù hợp với tình trạng.",
    icon: (
      <>
        <path d="M12 2v20M2 12h20" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    title: "Phòng khám & cơ sở",
    description:
      "Quản lý phòng khám, phòng thủ thuật, xét nghiệm... để phân bổ lịch hẹn hợp lý.",
    icon: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M10 21v-6h4v6" />
      </>
    ),
  },
  {
    title: "Nhắc lịch & theo dõi",
    description:
      "Theo dõi lịch hẹn, trạng thái khám và thông tin bác sĩ trong một màn hình duy nhất.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M9 16l2 2 4-4" />
      </>
    ),
  },
];

const STEPS = [
  { step: "1", title: "Chọn khoa", text: "Tìm và chọn chuyên khoa phù hợp với nhu cầu khám." },
  { step: "2", title: "Chọn phòng & thời gian", text: "Chọn phòng khám và khung giờ mong muốn." },
  { step: "3", title: "Xác nhận", text: "Xác nhận thông tin và hoàn tất đặt lịch khám." },
];

const HIGHLIGHTS = [
  "Đặt lịch khám trực tuyến nhanh chóng",
  "Danh mục khoa và phòng khám rõ ràng",
  "Quản lý tập trung cho phòng khám & bệnh viện",
];

export default async function HomePage() {
  const loggedIn = await hasSession();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
              </svg>
            </span>
            <span className="text-lg font-semibold text-slate-900">MediCare</span>
          </Link>

          <nav className="flex items-center gap-2">
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
              >
                Vào hệ thống
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-24 h-96 w-96 rounded-full bg-brand-100/70 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 -left-32 h-80 w-80 rounded-full bg-brand-50 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Đặt lịch khám trực tuyến
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Đặt lịch khám bệnh nhanh chóng, đúng chuyên khoa
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              MediCare giúp bệnh nhân đặt lịch khám trực tuyến theo khoa và phòng khám, đồng thời
              giúp phòng khám quản lý lịch hẹn tập trung và hiệu quả.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={loggedIn ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
              >
                {loggedIn ? "Vào hệ thống" : "Đăng nhập"}
              </Link>
              {loggedIn ? null : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Đăng ký ngay
                </Link>
              )}
            </div>

            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-4 shadow-xl shadow-brand-900/5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Lịch hẹn của bạn</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">Khám Tim mạch</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    Đã xác nhận
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ["Chuyên khoa", "Khoa Tim mạch"],
                    ["Phòng khám", "Phòng khám K101"],
                    ["Bác sĩ", "BS. Nguyễn Văn A"],
                    ["Thời gian", "08:30 · 12/10/2026"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["7", "Chuyên khoa"],
                    ["20+", "Phòng khám"],
                    ["24/7", "Đặt lịch"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-3"
                    >
                      <p className="text-lg font-semibold text-brand-700">{value}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white">
                  Xác nhận đặt lịch
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-slate-900">Tính năng chính</h2>
            <p className="mt-2 text-slate-600">
              Trải nghiệm đặt lịch khám đơn giản và quản lý hiệu quả cho phòng khám.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {feature.icon}
                  </svg>
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-slate-900">Đặt lịch chỉ trong 3 bước</h2>
          <p className="mt-2 text-slate-600">Nhanh gọn, rõ ràng và dễ dàng cho mọi bệnh nhân.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {item.step}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-brand-600 px-6 py-12 text-center shadow-lg shadow-brand-900/10 sm:px-12">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Sẵn sàng đặt lịch khám cùng MediCare?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            Đăng nhập để đặt lịch khám theo chuyên khoa và phòng khám của bạn.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              {loggedIn ? "Vào hệ thống" : "Đăng nhập"}
            </Link>
            {loggedIn ? null : (
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-brand-400/60 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Đăng ký ngay
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
              </svg>
            </span>
            <span className="font-medium text-slate-700">MediCare</span>
          </div>
          <p>© {new Date().getFullYear()} MediCare. Đặt lịch khám bệnh trực tuyến.</p>
        </div>
      </footer>
    </div>
  );
}
