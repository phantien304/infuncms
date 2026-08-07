# Node 20 cho infun_cms (React + Vite + AntD). Dev mode.
# Code mount từ host (./:/app) nên KHÔNG COPY source.
# Container chỉ cung cấp Node + giữ node_modules trong volume riêng để tránh
# xung đột giữa node_modules Windows (binary lightningcss-win32) và Linux.

FROM node:20-alpine

# Một số native module (lightningcss, esbuild) cần libc6-compat trên Alpine.
RUN apk add --no-cache libc6-compat bash git

WORKDIR /app

# Pre-install package.json trước khi mount để cache layer.
# Khi compose mount ./:/app, node_modules sẽ bị override → ta dùng named
# volume riêng cho /app/node_modules (xem docker-compose.yml).
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Khi container start, nếu node_modules trong volume rỗng (lần đầu) thì cài lại.
COPY <<'EOF' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e
cd /app
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "[entrypoint] node_modules trống, npm install..."
    npm install --no-audit --no-fund
fi
exec "$@"
EOF
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 5173
ENTRYPOINT ["entrypoint.sh"]
# --host 0.0.0.0 để browser host truy cập được; HMR đã handle bằng vite config.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
