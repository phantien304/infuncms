# CLAUDE.md — `infun_cms` (CMS React SPA)

SPA React standalone cho CMS admin của `infun`. Repo/build riêng, gọi backend
Laravel qua REST `/rcms`. Convention backend ở `../infun/CLAUDE.md` (mục
"CMS REST API (`rcms`)").

## Stack
- React 19 + Vite 7, **antd 6**, **zustand** (store), **react-router-dom 7**,
  **dayjs**, TinyMCE. Tailwind v4 (`@tailwindcss/vite`).
- Alias `@/` → `src/`.
- ⚠️ Date dùng **`dayjs`** — KHÔNG thêm `moment` (đã gỡ vì chỉ 1 chỗ orphan dùng).

## Entry
- `src/app.jsx` mount vào `#cms-app`, `basename = import.meta.env.BASE_URL`.
- KHÔNG còn `bootstrap.js`/`app.js` (đã xoá): chúng chỉ set `window.axios` global mà
  không ai đọc; `api.js`/`http.js` tự `axios.create()` cấu hình riêng.

## HTTP — 2 client (đừng nhầm)
- `core/services/api.js` — **client REST chính** cho `/rcms`: Bearer token,
  `Accept: application/json`, interceptor 401 → `/login`. Đọc response `{data}`.
  **Code mới luôn dùng cái này.**
- `core/services/http.js` — client **envelope legacy** (`{success,validator,...}`),
  CHỈ còn dùng cho upload ảnh + `deleteCache` ở `AppLayout`. Đang phase-out.
- Env: `VITE_API_BASE_URL=http://infun.test/rcms`, `VITE_LARAVEL_ORIGIN=http://infun.test`.

## Routing — auto lazy-load theo tên file
- `router/index.jsx` khai route; mảng `CRUD_ENTITIES` sinh 3 route chuẩn
  `/x/list`, `/x/add`, `/x/:id` cho mỗi entity (helper `crudRoutes`).
- `router/pageLoader.jsx` scan `import.meta.glob('../pages/**/*.jsx')`, key =
  đường dẫn dưới `pages/` bỏ đuôi `.jsx`.
- ⚠️ **`<Page name="...">` PHẢI khớp ĐÚNG path file, phân biệt hoa thường** —
  vd `_layout/UrlNotFound` (KHÔNG phải kebab `url-not-found`). Lệch tên →
  render placeholder "Page not found" IM LẶNG (đã dính bug này ở trang 404/403).

## Trạng thái migration (Vue2 `mt219` → React)
- Đã convert: `auth/login`, `category` (index + form), `product`
  (index + form 9 tab + `components/product/*`).
- Phần lớn entity trong `CRUD_ENTITIES` (banner, currency, order…) TRỎ tới page
  **chưa convert** → render placeholder. Đây là trạng thái đang migrate, KHÔNG phải lỗi.

## Convention dọn code
- Giữ cây gọn: không để file mồ côi (UI component / hook không ai import).
  Trước khi thêm dependency, kiểm tra đã có sẵn lựa chọn (date → dayjs…).
- Dọn 2026-06 đã xoá: `Autocomplete`, `ui/DatePicker` (dùng antd thay), `ManualUpload`,
  `useCrudActions`, `useDateLocale`, `services/notification`, `app.js`, `bootstrap.js`;
  gỡ dep `moment`.
