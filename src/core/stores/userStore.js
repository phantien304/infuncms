/**
 * userStore.js
 * -----------------------------------------------------------
 * Mapping từ Vue 2:
 *
 *   computed: {
 *     ...mapGetters(['currentUser', 'currentLanguage'])
 *   }
 *
 * → Zustand store cho currentUser + currentLanguage.
 *
 * Cách dùng:
 *   const currentUser = useCurrentUser();
 *   const currentLanguage = useCurrentLanguage();
 *
 *   // Set sau khi login:
 *   useUserStore.getState().setCurrentUser(username);
 * -----------------------------------------------------------
 */

import { create } from 'zustand';
import CONSTANTS from '../utils/constants';

// Đọc lại currentUser từ localStorage để khi F5 vẫn nhận diện user đăng nhập.
// Khớp với pattern Vue 2: app.vue có v-if="currentUser" — currentUser phải
// có sẵn ngay từ render đầu tiên (không đợi initSystem).
const initialUser =
    (typeof localStorage !== 'undefined' &&
        localStorage.getItem(CONSTANTS.USERNAME)) ||
    null;

// Quyền (mảng mã 'list-role', 'edit-role', ...) — đã có sẵn trong
// localStorage từ lúc login.jsx lưu (xem AuthController::resolvePermissions),
// chỉ chưa ai đọc lại (Phase 3.4, docs/ROLE-PERMISSION-PLAN.md). Đọc ở đây
// để usePermission()/Can.jsx dùng, và để không mất quyền khi F5.
const readInitialPermissions = () => {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(CONSTANTS.PERMISSIONS);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

const useUserStore = create((set) => ({
    currentUser: initialUser,
    permissions: readInitialPermissions(),
    currentLanguage:
        (typeof localStorage !== 'undefined' &&
            localStorage.getItem(CONSTANTS.LANG)) ||
        null,

    setCurrentUser: (user) => {
        // Đồng bộ vào localStorage để RequireAuth + reload trang thấy được
        if (typeof localStorage !== 'undefined') {
            if (user) localStorage.setItem(CONSTANTS.USERNAME, user);
            else localStorage.removeItem(CONSTANTS.USERNAME);
        }
        set({ currentUser: user });
    },

    /** Gọi cạnh setCurrentUser lúc login, hoặc sau khi gọi lại GET /me. */
    setPermissions: (permissions) => {
        const list = Array.isArray(permissions) ? permissions : [];
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CONSTANTS.PERMISSIONS, JSON.stringify(list));
        }
        set({ permissions: list });
    },

    setCurrentLanguage: (lang) => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CONSTANTS.LANG, lang);
        }
        set({ currentLanguage: lang });
    },

    /** Logout — clear toàn bộ user state + localStorage liên quan */
    logout: () => {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(CONSTANTS.USERNAME);
            localStorage.removeItem(CONSTANTS.PERMISSIONS);
        }
        set({ currentUser: null, permissions: [] });
    },
}));

// -------- Selector hooks --------
export const useCurrentUser = () => useUserStore((s) => s.currentUser);
export const useCurrentLanguage = () => useUserStore((s) => s.currentLanguage);
export const usePermissions = () => useUserStore((s) => s.permissions);

export default useUserStore;
