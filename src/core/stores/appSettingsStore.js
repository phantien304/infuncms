/**
 * appSettingsStore.js
 * -----------------------------------------------------------
 * Mapping từ Vue 2:
 *
 *   import {mapGetters} from 'vuex'
 *   computed: {
 *     ...mapGetters(['appSettings']),
 *     listLanguages() { ... },
 *     languageDefault() { ... }
 *   }
 *
 * → React + Zustand:
 *   - state: appSettings
 *   - selectors: listLanguages, languageDefault
 *
 * Zustand là state-management cho React, đơn giản hơn Redux/Vuex.
 * Cách hoạt động: 1 file = 1 store. Component subscribe bằng hook.
 *
 * Cài đặt:  npm i zustand
 *
 * Cách dùng trong component:
 *
 *   import { useAppSettings, useListLanguages } from '@/stores/appSettingsStore';
 *
 *   function MyComp() {
 *     const appSettings = useAppSettings();
 *     const listLanguages = useListLanguages();
 *     ...
 *   }
 * -----------------------------------------------------------
 */

import { useMemo } from 'react';
import { create } from 'zustand';

// Lấy appSettings từ window khi load (đồng nhất với bản Vue 2).
const initialAppSettings =
    (typeof window !== 'undefined' && window.appSettings) || {};

const useAppSettingsStore = create((set) => ({
    appSettings: initialAppSettings,

    /**
     * Setter để cập nhật appSettings sau khi gọi API lấy config (nếu có).
     */
    setAppSettings: (next) =>
        set((state) => ({ appSettings: { ...state.appSettings, ...next } })),
}));

// -------- Selector hooks (giống "computed" của Vue) --------

/** Trả nguyên appSettings object */
export const useAppSettings = () =>
    useAppSettingsStore((s) => s.appSettings);

/**
 * Danh sách ngôn ngữ chưa bị xoá mềm.
 *
 * BUG đã fix: trước đây filter() nằm ngay trong selector Zustand → mỗi lần
 * store notify là selector trả về 1 array MỚI (dù data y hệt). Zustand so
 * sánh bằng Object.is (không shallow-compare theo mặc định) nên coi là state
 * đổi → re-render → gọi lại selector → lại ra array mới → lặp vô hạn
 * ("Maximum update depth exceeded", crash cả cây React — gặp ở ProductIndex
 * vì đây là consumer duy nhất của hook này lúc bug xuất hiện).
 *
 * Fix: selector Zustand chỉ lấy value gốc `languages` (tham chiếu ổn định,
 * chỉ đổi khi setAppSettings thực sự cập nhật) — filter() tách ra useMemo,
 * chỉ tính lại khi `languages` đổi tham chiếu.
 */
export const useListLanguages = () => {
    const languages = useAppSettingsStore((s) => s.appSettings.languages);
    return useMemo(
        () => (languages || []).filter((i) => i.deleted_at === null),
        [languages]
    );
};

/** Ngôn ngữ mặc định */
export const useLanguageDefault = () =>
    useAppSettingsStore((s) => s.appSettings.languageDefault);

/** Allowlist theme (config/theme.php) — dropdown "Theme" ở menu/form.jsx. */
export const useThemes = () => {
    const themes = useAppSettingsStore((s) => s.appSettings.themes);
    return useMemo(() => themes || [], [themes]);
};

/**
 * rowNum trong Vue 2 là computed phụ thuộc this.objSearch.
 * Ở React, objSearch là local state của component, nên hàm này
 * nhận objSearch làm tham số (KHÔNG đặt trong store nữa).
 */
export function calcRowNum(objSearch) {
    if (!objSearch) return 0;
    return (objSearch.pageIndex - 1) * objSearch.pageSize;
}

export default useAppSettingsStore;
