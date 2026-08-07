/**
 * api.js — REST axios client cho CMS (chuẩn REST, KHÁC http.js).
 * -----------------------------------------------------------
 * http.js: bọc theo envelope cũ ({ success, data, totalRow }, check
 *          response.data.success). Dùng cho login/system/init/các module
 *          theo convention /list /save /del.
 * api.js : axios "thuần" cho các module viết theo REST chuẩn Laravel
 *          (apiResource) — phân biệt thành/bại bằng HTTP status, body là
 *          { data } / { data, meta } / 422 { message, errors }.
 *
 * Auth: session cookie httpOnly (Sanctum SPA), KHÔNG còn Bearer token trong
 * localStorage (tránh XSS đọc được token). withCredentials để browser gửi
 * cookie cross-subdomain (cms.infun.co → infun.co); withXSRFToken vì axios
 * mặc định không tự gắn header X-XSRF-TOKEN cho request cross-origin.
 *
 * Tự gắn:
 *   - Accept: application/json  → Laravel trả 422 JSON thay vì redirect.
 *   - 401 → xoá phiên + về /login.
 * -----------------------------------------------------------
 */

import axios from 'axios';
import CONSTANTS from '@/core/utils/constants';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

// Sanctum SPA: phải có cookie XSRF-TOKEN trước khi gọi login/bất kỳ request
// mutating nào. Gọi 1 lần trước login; sau đó Laravel tự refresh cookie này
// trên mỗi response nên các request tiếp theo không cần gọi lại.
export function ensureCsrfCookie() {
    const origin = import.meta.env.VITE_LARAVEL_ORIGIN || '';
    return axios.get(origin + '/sanctum/csrf-cookie', { withCredentials: true });
}

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(CONSTANTS.USERNAME);
            }
            window.location.href = '/login';
        }
        // 403 = qua được auth nhưng thiếu quyền (Gate::authorize ở middleware
        // cms.permission — xem docs/ROLE-PERMISSION-PLAN.md Phase 3.4). Khác
        // 401: KHÔNG xoá phiên đăng nhập, chỉ điều hướng sang trang thông
        // báo có sẵn (router/index.jsx đã khai /permission-denied). Bỏ qua
        // GET /me — gọi lúc app khởi động trước khi có permissions, 403 ở
        // đây không phải do thiếu quyền trang mà do request đặc thù.
        if (
            err?.response?.status === 403 &&
            typeof window !== 'undefined' &&
            window.location.pathname !== '/permission-denied'
        ) {
            window.location.href = '/permission-denied';
        }
        return Promise.reject(err);
    }
);

export default api;
