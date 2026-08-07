# Sự cố: container `infun-cms` luôn ở trạng thái loading — nguyên nhân & cách sửa

Ngày: 2026-07-31

## 1) Triệu chứng

Mở `http://localhost:5173` (hoặc `http://cms.infun.co`) trang không bao giờ
load xong, cứ loading mãi.

`docker ps -a` cho thấy container ở trạng thái crash-loop:

```
NAMES       STATUS
infun-cms   Restarting (254) 37 seconds ago
```

`docker logs infun-cms` báo lỗi lặp lại mỗi lần entrypoint thử chạy:

```
npm error path /app/package.json
npm error errno -2
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/app/package.json'
```

## 2) Nguyên nhân

Trong `E:\xampp82\htdocs\infun\docker-compose.yml`, service `infun-cms`:

```yaml
infun-cms:
  build:
    context: ../infuncms      # ✅ build đúng — project thật, có source code
  volumes:
    - ../infun_cms:/app       # ❌ SAI — trỏ nhầm sang thư mục "infun_cms"
    - cms_node_modules:/app/node_modules
```

- Image được **build đúng** từ `../infuncms` (không dấu `_`).
- Nhưng lúc **runtime**, volume lại mount `../infun_cms` (CÓ dấu `_`) đè lên
  `/app`. Thư mục này gần như rỗng (chỉ có `node_modules` cũ), không có
  `package.json`, không có `src/`, không có `vite.config.js`.
- Kết quả: entrypoint script cố `npm install` / `npm run dev` trong thư mục
  rỗng → lỗi `ENOENT package.json` → container thoát → policy
  `restart: unless-stopped` khởi động lại → lặp vô hạn (crash-loop) → Vite
  dev server không bao giờ trả response hợp lệ → browser loading mãi.

## 3) Cách sửa

Đổi volume mount về đúng thư mục project (`../infuncms`, không dấu `_`):

```yaml
volumes:
  - ../infuncms:/app
  - cms_node_modules:/app/node_modules
```

Rebuild + start lại:

```powershell
cd E:\xampp82\htdocs\infun
docker compose up -d --build infun-cms
docker logs --tail 30 infun-cms   # phải thấy "VITE vX ready in ..."
```

> Lưu ý: `E:\xampp82\htdocs\infun_cms` là thư mục rác/nhầm tên, không phải
> project thật. Project CMS thật nằm ở `E:\xampp82\htdocs\infuncms`.

## 4) Vì sao chạy trong Docker hay bị trễ khi save file

- `infun-cms` không COPY source vào image — code thật nằm trên host Windows
  và được **bind-mount** vào container qua `../infuncms:/app`.
- Docker Desktop chạy container qua WSL2. Bind-mount từ ổ NTFS Windows sang
  filesystem Linux trong container đi qua một lớp dịch (9p/virtiofs) —
  không phải native Linux fs.
- Hệ quả: sự kiện `inotify` ("file vừa đổi") của Linux thường **không
  xuyên qua được** lớp dịch này một cách tin cậy khi file gốc nằm trên ổ
  Windows thật.
- Đó là lý do `docker-compose.yml` phải set:
  ```yaml
  CHOKIDAR_USEPOLLING: "true"
  ```
  Chokidar (watcher của Vite) chuyển sang **polling** — quét lại mtime từng
  file theo chu kỳ cố định (mặc định ~100ms) thay vì nhận event tức thời.
  Polling luôn có độ trễ tối thiểu bằng chu kỳ quét, đây là đánh đổi cố hữu
  của mô hình "code Windows + server chạy trong Linux container", không
  phải lỗi cấu hình.

## 5) Giải pháp thay thế — chạy Vite trực tiếp trên Windows (khuyến nghị cho dev hằng ngày)

Bỏ qua lớp dịch bind-mount hoàn toàn bằng cách chạy `npm run dev` thẳng trên
Windows (Node.js cài sẵn trên máy, không qua Docker). HMR khi đó dùng native
filesystem event của Windows — hết độ trễ polling.

### Các bước đã thực hiện

1. **Dừng container Docker** để giải phóng port 5173 (không xoá, có thể bật
   lại sau):
   ```powershell
   cd E:\xampp82\htdocs\infun
   docker compose stop infun-cms
   ```

2. **Tạo file `infuncms/.env`** (trước đó chưa có):
   ```
   VITE_API_BASE_URL=http://infun.test/rcms
   VITE_LARAVEL_ORIGIN=http://infun.co
   ```

3. **Chạy Vite trực tiếp** (Node v24 + `node_modules` đã có sẵn trên
   Windows, không cần cài lại):
   ```powershell
   cd E:\xampp82\htdocs\infuncms
   npm run dev
   ```
   Giữ cửa sổ terminal này chạy nền.

4. Herd đã có sẵn nginx conf proxy `cms.infun.co -> 127.0.0.1:5173`
   (`%USERPROFILE%\.config\herd\config\valet\Nginx\cms.infun.co.conf`, xem
   chi tiết ở `SETUP-cms.infun.co.md`) nên không cần cấu hình lại — mở thẳng
   `http://cms.infun.co` hoặc `http://localhost:5173` đều dùng được.

### Xác nhận hoạt động

```
curl http://localhost:5173/   -> 200, trả HTML có /@vite/client, react-refresh
curl http://cms.infun.co/     -> 200
```

### Quay lại dùng Docker khi cần

```powershell
# Tắt npm run dev native (Ctrl+C trong terminal đang chạy) trước,
# tránh đụng port 5173, rồi:
cd E:\xampp82\htdocs\infun
docker compose start infun-cms
```

## 6) Việc còn tồn đọng (chưa xử lý trong lần này)

`http://infun.test/` hiện trả về trang **"Herd - Site not found"** — nghĩa
là Herd chưa park/link site cho thư mục `infun` (backend Laravel). CMS vẫn
load được trang, nhưng mọi API call tới `/rcms/*` sẽ lỗi cho tới khi site
này được cấu hình lại trong Herd.
