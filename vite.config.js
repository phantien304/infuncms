import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Standalone CMS — KHÔNG dùng laravel-vite-plugin.
// `@` = src (giữ nguyên import '@/...' copy từ resources/cms/js).
// base '/' → router basename dùng import.meta.env.BASE_URL. Muốn host dưới
// /vcms thì đổi base: '/vcms/'.
export default defineConfig({
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
        host: true,
        port: 5173,
        // CHOKIDAR_USEPOLLING=true (docker-compose) vì bind-mount Windows không
        // phát native fs-events vào VM Linux → chokidar phải poll. Mặc định
        // 100ms quá dày, khiến process esbuild/vite ăn CPU liên tục (~40%) và
        // làm vmmem (VM nền của Docker Desktop) load cao gây giật máy host.
        // 1000ms vẫn đủ nhanh để thấy thay đổi, giảm mạnh CPU nền.
        watch: { usePolling: true, interval: 1000 },
        // Cho phép Herd proxy (cms.infun.co) đi vào dev server + LAN IP của
        // Docker host khi truy cập từ máy khác trong mạng LAN.
        // Vite 7 chặn Host lạ -> phải khai báo, nếu không sẽ "Blocked request".
        // `true` ở đây nghĩa là cho phép mọi host (chỉ dùng cho dev LAN, KHÔNG
        // expose public internet như vậy).
        allowedHosts: true,
        // HMR: client (browser) phải kết nối được tới Vite dev server.
        //   - Local cùng máy:    bỏ block `hmr` này hoặc set host = 'localhost'.
        //   - Herd proxy:        host = 'cms.infun.co', clientPort = 80 (qua nginx Herd).
        //   - LAN máy khác:      set VITE_HMR_HOST env trỏ về IP Docker host.
        //     vd: $env:VITE_HMR_HOST = "192.168.1.100"
        hmr: process.env.VITE_HMR_HOST
            ? { host: process.env.VITE_HMR_HOST, clientPort: 5173 }
            : { host: 'cms.infun.co', clientPort: 80 },
    },
});
