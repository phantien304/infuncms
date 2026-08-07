# Chạy Infun CMS tại `cms.infun.co` (LOCAL) qua Laravel Herd — DEV MODE

Mục tiêu: `npm run dev` (có hot reload) nhưng mở bằng URL sạch
`http://cms.infun.co`. Herd (nginx) đứng ở cổng 80 proxy vào Vite dev server
(cổng 5173).

> Vì sao cần Herd proxy: Vite dev server chạy ở cổng 5173. Muốn URL không kèm
> `:5173` thì phải có thứ gì đó nghe cổng 80 và forward vào 5173 — đó là nginx
> của Herd. (Nếu chấp nhận URL `http://cms.infun.co:5173` thì có thể bỏ Herd,
> xem mục cuối.)

---

## 1) Ép `cms.infun.co` về máy local (file hosts)

`cms.infun.co` là domain public (đang trỏ trang parking). Thêm dòng dưới để
máy này resolve về localhost — **chỉ ảnh hưởng máy bạn**.

Mở Notepad **quyền Administrator**, mở:

```
C:\Windows\System32\drivers\etc\hosts
```

Thêm dòng cuối rồi lưu:

```
127.0.0.1  cms.infun.co
```

Kiểm tra (PowerShell):

```powershell
ipconfig /flushdns
ping cms.infun.co        # phải trả 127.0.0.1
```

> Khi để dòng này, `cms.infun.co` trên máy bạn KHÔNG vào site public được nữa.
> Xoá dòng đó khi muốn quay lại.

---

## 2) Nạp nginx conf (proxy) cho Herd

Copy `deploy/cms.infun.co.conf` vào thư mục site-config của Herd:

```powershell
copy E:\xampp82\htdocs\infuncms\deploy\cms.infun.co.conf `
     "$env:USERPROFILE\.config\herd\config\valet\Nginx\cms.infun.co.conf"
```

Conf khai báo `server_name cms.infun.co` + `proxy_pass http://127.0.0.1:5173`
kèm header WebSocket cho HMR.

---

## 3) Chạy Vite dev server

```powershell
cd E:\xampp82\htdocs\infuncms
npm run dev            # Vite nghe cổng 5173, giữ cửa sổ này chạy nền
```

`vite.config.js` đã set sẵn (không cần sửa):
- `allowedHosts: true` → không bị "Blocked request" khi Host = cms.infun.co.
- `hmr.host = 'cms.infun.co'`, `clientPort = 80` → HMR websocket đi qua Herd.

---

## 4) Restart Herd rồi mở trình duyệt

```powershell
herd restart           # hoặc Herd UI: Stop -> Start
```

Mở: **http://cms.infun.co**. Sửa code trong `src/` → trang tự cập nhật (HMR).
Deep-link như `/product/list` cũng chạy (Vite tự route).

---

## 5) Điều kiện để app HOẠT ĐỘNG (không chỉ hiện trang)

CMS là frontend, gọi API Laravel:

1. **Backend `infun.co` đang chạy** (Herd site của thư mục `infun`).
   `infuncms/.env`:
   ```
   VITE_API_BASE_URL=http://infun.co/rcms
   VITE_LARAVEL_ORIGIN=http://infun.co
   ```
   Mở thử `http://infun.co/rcms/system/init` — phải trả JSON.
   > Ở dev mode, sửa `.env` phải **tắt và chạy lại `npm run dev`** (Vite chỉ
   > đọc env lúc khởi động).

2. **CORS**: `infun/config/cors.php` đã có sẵn `http://cms.infun.co`. Sửa gì
   trong backend nhớ `cd E:\xampp82\htdocs\infun && php artisan config:clear`.

---

## Gỡ lỗi nhanh

| Triệu chứng | Xử lý |
|---|---|
| Mở `cms.infun.co` vẫn ra "Click here to enter" | Chưa thêm hosts / DNS cache cũ → `ipconfig /flushdns`, `ping cms.infun.co` = 127.0.0.1 |
| `502 Bad Gateway` | Vite chưa chạy (`npm run dev`) hoặc không phải cổng 5173 |
| `Blocked request. This host is not allowed` | `allowedHosts` chưa nhận host → đã set `true`, tắt/chạy lại `npm run dev` |
| Trang load nhưng sửa code không tự đổi | HMR websocket lỗi → kiểm 3 dòng Upgrade/Connection trong conf + `hmr.host` = cms.infun.co; xem Console tab Network có ws `cms.infun.co` không |
| Gọi API 401 / CORS | Backend `infun.test` chưa chạy, hoặc quên `php artisan config:clear` |
| Herd không nhận conf | Sai đường dẫn copy — phải `%USERPROFILE%\.config\herd\config\valet\Nginx\`, rồi `herd restart` |

---

## Cách tối giản — bỏ Herd, chấp nhận URL kèm `:5173`

Nếu không muốn động vào nginx của Herd:

1. Vẫn thêm hosts `127.0.0.1  cms.infun.co` (bước 1).
2. Trong `vite.config.js` đổi HMR về cùng cổng dev:
   `hmr: { host: 'cms.infun.co', clientPort: 5173 }` (hoặc set env
   `$env:VITE_HMR_HOST = "cms.infun.co"` trước khi chạy).
3. `npm run dev`, mở **http://cms.infun.co:5173**.

Nhược điểm: URL phải kèm `:5173`. Đổi lại: không cần Herd conf + restart.
