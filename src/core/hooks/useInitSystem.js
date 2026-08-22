/**
 * useInitSystem.js
 * -----------------------------------------------------------
 * Tương đương `initSystem` + `updateAppSettings` (Vuex actions cũ) +
 * lifecycle `created()` của app-wrapper.vue.
 *
 * Việc hook làm:
 *  1. Gọi API `/system/init` (đổi URL nếu backend khác)
 *  2. Gộp data trả về vào appSettings:
 *       - appSettings.config           = system.config
 *       - appSettings.languageDefault  = system.config.config_language
 *       - appSettings.languageTexts    = system.languageTexts
 *       - appSettings.languages        = system.languages
 *  3. Hiển thị loading global trong khi đang fetch
 *  4. Trả về { done, error } để component cha quyết định render gì
 *
 * Lưu ý: Code Vue 2 dùng `this.initSystem()` từ Vuex action. Ở React
 * em đặt logic trực tiếp trong hook để gọn — KHÔNG cần lưu `system`
 * vào store vì sau khi merge xong vào appSettings là dùng được hết.
 * -----------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import api from '../services/api';
import useLoading from './useLoading';
import useAppSettingsStore from '../stores/appSettingsStore';
import useUserStore from '../stores/userStore';
import CONSTANTS from '../utils/constants';
import { alert as alertModal } from '../services/alert';

export default function useInitSystem() {
    const loading = useLoading();
    const setAppSettings = useAppSettingsStore((s) => s.setAppSettings);
    const setPermissions = useUserStore((s) => s.setPermissions);

    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const inst = loading.open();

        // REST: GET /system/init → { data: { config, languageTexts, languages } }.
        api.get('/system/init')
            .then((res) => {
                if (cancelled) return;
                const system = res.data?.data || {};
                setAppSettings({
                    config: system.config || {},
                    languageDefault: system.config?.config_language,
                    languageTexts: system.languageTexts || {},
                    languages: system.languages || [],
                    // Allowlist theme (SystemController::init → config/theme.php)
                    // — dùng cho dropdown "Theme" ở menu/form.jsx.
                    themes: system.themes || [],
                    // BUG đã fix (2026-08-02, lần 2): appSettings.storageDomain
                    // TRƯỚC ĐÓ map từ system.config.config_storage_domain — đây
                    // chỉ là setting DB "base URL của site" (link mailer/checkout,
                    // giá trị "http://infun.co"), KHÔNG PHẢI domain phục vụ ảnh.
                    // Ảnh product upload qua disk 'image' (R2/Cloudflare, xem
                    // config/filesystems.php) được serve ở 1 domain CDN riêng
                    // (AWS_URL, vd "https://cdn.lartisan.vn") — hoàn toàn khác
                    // config_storage_domain. Dùng nhầm domain web chính khiến MỌI
                    // ảnh upload thật qua CMS không hiển thị (chỉ ảnh seed đặt cứng
                    // trong public/ của app mới "tình cờ" hiển thị đúng, gây hiểu
                    // lầm là đã fix xong ở lần sửa trước). Backend giờ trả thêm
                    // system.imageDomain = config('filesystems.disks.image.url')
                    // (xem SystemController::init) — dùng field NÀY, fallback về
                    // config_storage_domain nếu vì lý do gì đó imageDomain rỗng.
                    storageDomain:
                        system.imageDomain ||
                        system.config?.config_storage_domain ||
                        '',
                });
                setDone(true);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err);
                alertModal(err?.response?.data?.message || 'Init system failed');
            })
            .finally(() => {
                inst.close();
            });

        /**
         * Refresh permissions từ GET /me mỗi lần app khởi động (F5/mở tab
         * mới) — KHÔNG chỉ lúc login. `permissions` cache trong localStorage
         * chỉ được ghi ở login.jsx, nên nếu registry quyền (CmsPermissionEntity)
         * có entity mới sau lúc user đăng nhập lần cuối, PermissionMatrix sẽ
         * disable nhầm các quyền entity đó dù backend đã cho phép — bug thật
         * đã gặp ("nhiều quyền trong mục khác không tích được") do phiên CMS
         * đăng nhập từ trước khi hàng chục entity mới được đăng ký. Chỉ gọi
         * khi đã có USERNAME (đã đăng nhập) — bỏ qua lỗi vì đây là refresh
         * nền, không chặn render app; 401 (session hết hạn) đã có interceptor
         * api.js xử lý.
         */
        if (typeof localStorage !== 'undefined' && localStorage.getItem(CONSTANTS.USERNAME)) {
            api.get('/me')
                .then((res) => {
                    if (cancelled) return;
                    setPermissions(res.data?.data?.permissions || []);
                })
                .catch(() => {});
        }

        return () => {
            cancelled = true;
            inst.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { done, error };
}
