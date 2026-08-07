# Deploy infuncms lên staging + AWS production (`cms.tienpv.shop`)

> Bổ sung cho hạ tầng **đã có sẵn** của backend `infun` (xem
> `../infun/docs/PRODUCTION-AWS-SETUP.md` + `docs/STAGING.md`, `docs/CI-CD-PRODUCTION.md`).
> infuncms là **repo/image riêng**, chạy **cùng máy** (staging + EC2 production)
> với backend nhưng KHÔNG đụng vào compose/CI của backend — chỉ thêm 1 dòng
> ingress Cloudflare Tunnel để lộ diện ra domain riêng.

---

## Vì sao khác pattern "promote, không rebuild" của backend

Backend `infun` (PHP) đọc cấu hình từ **biến môi trường lúc container chạy**
→ 1 image build 1 lần, promote thẳng staging → production bằng retag.

infuncms (Vite/React) **bake** `VITE_API_BASE_URL`/`VITE_LARAVEL_ORIGIN` vào
bundle JS **ngay lúc `npm run build`** — production trỏ API khác staging
(`https://tienpv.shop/rcms` khác `http://infun.co/rcms`) nên **không thể**
dùng lại đúng image staging cho production. `deploy-production.yml` vì vậy
**build lại** từ đúng git ref đã publish, với build-arg production — vẫn giữ
nguyên tinh thần "release có chủ đích + cổng phê duyệt thủ công", chỉ khác
bước cuối. Chi tiết kỹ thuật: xem comment đầu `Dockerfile.staging`.

---

## 1. Máy staging (Tailscale `100.99.170.2`, user `an-my`)

Backend đã mirror ở `/home/an-my/infun`. Thêm mirror riêng cho infuncms:

```bash
ssh an-my@100.99.170.2
mkdir -p /home/an-my/infuncms
git clone https://github.com/phantien304/infuncms.git /home/an-my/infuncms
cd /home/an-my/infuncms
docker compose -f docker-compose.staging.yml pull infuncms-web   # sau khi CI đã chạy ít nhất 1 lần
docker compose -f docker-compose.staging.yml up -d
curl -I http://127.0.0.1:8200/__lb_health   # -> 200
```

`deploy-staging.yml` (CI) tự làm việc này mỗi lần push nhánh `main` — bước
trên chỉ cần chạy **1 lần đầu** để thư mục tồn tại.

---

## 2. EC2 production — thêm vào `/srv` cạnh `/srv/infun`

```bash
ssh -i infun-prod.pem ubuntu@<PUBLIC_IP>     # hoặc qua Tailscale 100.84.143.32

sudo mkdir -p /srv/infuncms && sudo chown $USER:$USER /srv/infuncms
git clone https://<GH_TOKEN>@github.com/phantien304/infuncms.git /srv/infuncms
cd /srv/infuncms
echo <GH_TOKEN> | docker login ghcr.io -u phantien304 --password-stdin   # nếu package để Private

# infuncms không cần .env runtime (config đã bake lúc build) — compose file
# chỉ cần biến PROD_CMS_WEB_PORT nếu muốn đổi cổng khác 8200, KHÔNG bắt buộc.

docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
curl -I http://127.0.0.1:8200/__lb_health   # -> 200
```

(Tùy chọn) file cấu hình cho `deploy/prod-deploy.sh`:

```bash
sudo tee /etc/infuncms-deploy.env <<'EOF'
APP_DIR=/srv/infuncms
COMPOSE_FILE=docker-compose.production.yml
HEALTH_URL=http://127.0.0.1:8200/__lb_health
EOF
```

---

## 3. Thêm `cms.tienpv.shop` vào Cloudflare Tunnel đã có

Backend đã chạy 1 tunnel (`infun-prod`) với ingress `tienpv.shop -> :8100`
(xem `../infun/docs/PRODUCTION-AWS-SETUP.md` mục 7). Thêm 1 dòng ingress
**trước** dòng catch-all `http_status:404` — thứ tự quan trọng, Cloudflare
match theo thứ tự khai báo:

```bash
sudo nano /etc/cloudflared/config.yml
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: tienpv.shop
    service: http://localhost:8100
  - hostname: cms.tienpv.shop
    service: http://localhost:8200
  - service: http_status:404
```

```bash
sudo systemctl restart cloudflared
cloudflared tunnel route dns infun-prod cms.tienpv.shop
# báo "record đã tồn tại" -> xoá A/CNAME cũ của cms.tienpv.shop ở Cloudflare
# DNS dashboard rồi chạy lại lệnh trên.
sudo systemctl status cloudflared --no-pager
```

Mở `https://cms.tienpv.shop` — phải load được trang login (Vite build tĩnh,
HTTPS tự động qua Cloudflare, không cần chứng chỉ gì trên EC2).

---

## 4. Bắt buộc: mở CORS + Sanctum stateful domain ở backend cho origin mới

CMS gọi API qua `fetch`/axios `withCredentials` tới `tienpv.shop/rcms` —
thiếu bước này thì browser sẽ chặn ngay ở preflight (CORS) hoặc backend từ
chối cấp cookie phiên (Sanctum không coi origin là "stateful").

Trong `.env` production của **backend** (`/srv/infun/.env` trên EC2, KHÔNG
phải file này):

```
CORS_ALLOWED_ORIGINS=https://tienpv.shop,https://cms.tienpv.shop
SANCTUM_STATEFUL_DOMAINS=tienpv.shop,cms.tienpv.shop
SESSION_DOMAIN=.tienpv.shop
```

> `CORS_ALLOWED_ORIGINS` là biến MỚI thêm ở `config/cors.php` (trước đây
> hard-code danh sách origin trong code — xem commit sửa file đó). Không set
> biến này thì fallback về 4 origin cũ (`cms.infun.test`/`cms.infun.co`),
> **không** tự nhiên cho phép `cms.tienpv.shop` — phải set tường minh.
>
> `SESSION_DOMAIN=.tienpv.shop` (có dấu chấm đầu) để cookie phiên dùng
> chung được giữa `tienpv.shop` và `cms.tienpv.shop` (2 subdomain cùng gốc).
> Đổi xong nhớ:
> ```bash
> cd /srv/infun
> docker compose -f docker-compose.production.yml exec infun-php php artisan config:clear
> docker compose -f docker-compose.production.yml up -d --force-recreate infun-php infun-admin-php
> ```

---

## 5. Thiết lập GitHub (một lần, trong repo `infuncms`)

Giống hệt mục "1. Thiết lập trên GitHub" của
`../infun/docs/CI-CD-PRODUCTION.md`, làm lại cho repo **infuncms**:

- **Environment `production`** (Settings → Environments) → bật **Required
  reviewers**.
- **Secrets** (Settings → Secrets and variables → Actions):

  | Secret | Giá trị |
  |---|---|
  | `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` | dùng lại của backend (cùng tailnet) |
  | `STAGING_SSH_KEY` | dùng lại của backend (cùng máy staging, user `an-my`) |
  | `PROD_HOST` | `100.84.143.32` (Tailscale IP EC2, dùng lại của backend) |
  | `PROD_SSH_USER` | `ubuntu` |
  | `PROD_SSH_KEY` | dùng lại của backend |

- **Variables** (không bắt buộc — có default trong workflow):

  | Variable | Default | Khi nào cần đổi |
  |---|---|---|
  | `STAGING_VITE_API_BASE_URL` | `http://infun.co/rcms` | staging trỏ backend khác |
  | `STAGING_VITE_LARAVEL_ORIGIN` | `http://infun.co` | " |
  | `PROD_VITE_API_BASE_URL` | `https://tienpv.shop/rcms` | đổi domain production |
  | `PROD_VITE_LARAVEL_ORIGIN` | `https://tienpv.shop` | " |

- Package `infuncms-web` trên GHCR: đặt **Public** để máy staging/production
  pull không cần `docker login` (giống `infun-app`/`infun-web`), hoặc giữ
  Private + `docker login ghcr.io` một lần trên mỗi máy (đã làm ở mục 1/2).

---

## 6. Quy trình phát hành (giống hệt backend)

1. Push `main` → CI build + deploy **staging** tự động
   (`http://cms.infun.co` hoặc `http://<staging-tailscale-ip>:8200`).
2. Kiểm tra staging OK → GitHub **Releases → Draft new release** → tag
   `vX.Y.Z` → Publish.
3. `Deploy production` chạy, **dừng ở cổng duyệt** → Actions → Review
   deployments → **Approve**.
4. Sau approve: build image production (build-arg `tienpv.shop`), SSH EC2,
   pull + up + health check tại `https://cms.tienpv.shop`.

**Rollback:** Actions → Deploy production → Run workflow → nhập `ref` (tag/commit)
của bản tốt trước đó → Approve. Vì bước cuối là **build lại** (không phải
retag như backend), rollback sẽ build lại từ ref cũ — chậm hơn vài phút so
với backend nhưng vẫn cho đúng kết quả.

---

## Gỡ lỗi nhanh

| Triệu chứng | Xử lý |
|---|---|
| `https://cms.tienpv.shop` ra 404/522 của Cloudflare | Chưa thêm ingress rule / chưa `route dns` / `cloudflared` chưa restart — xem mục 3 |
| Trang load được nhưng gọi API 401 liên tục dù đã đăng nhập | Thiếu `SANCTUM_STATEFUL_DOMAINS`/`SESSION_DOMAIN` cho `cms.tienpv.shop` ở backend — mục 4 |
| Console báo lỗi CORS (`No 'Access-Control-Allow-Origin'`) | Thiếu `CORS_ALLOWED_ORIGINS` cho `cms.tienpv.shop` ở backend `.env` — mục 4, nhớ `config:clear` |
| Build production ra bundle vẫn gọi `infun.co` thay vì `tienpv.shop` | Build-arg build lúc CI staging bị cache nhầm vào layer production — kiểm `PROD_VITE_API_BASE_URL` trong workflow logs; **không** dùng lại image `:staging` cho production dưới mọi hình thức |
| `docker compose pull` báo `unauthorized` | Package GHCR đang Private mà máy đó chưa `docker login` — mục 1/2 |
| Health check `/__lb_health` timeout | Container chưa lên (`docker compose ps`) hoặc sai `PROD_CMS_WEB_PORT` trong `.env`/`/etc/infuncms-deploy.env` |
