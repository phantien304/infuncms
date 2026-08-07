/**
 * usePermission.js — đọc mảng permission code (['list-role', 'edit-role', ...])
 * -----------------------------------------------------------
 * Nguồn dữ liệu: core/stores/userStore.js (state `permissions`), được nạp
 * từ localStorage[CONSTANTS.PERMISSIONS] lúc app khởi động và ghi lại lúc
 * login.jsx nhận response POST /login (xem AuthController::resolvePermissions
 * — gộp quyền trực tiếp + quyền qua role, spatie getAllPermissions()).
 *
 * CHỈ dùng để ẩn/hiện UI (UX) — nguồn quyết định thật vẫn là middleware
 * `cms.permission` ở backend (xem docs/ROLE-PERMISSION-PLAN.md Phase 3.4).
 * Không dùng để chặn dữ liệu nhạy cảm, chỉ để tránh hiện nút bấm mà lúc
 * bấm sẽ bị 403.
 *
 * Cách dùng:
 *   const can = usePermission();
 *   can('edit-category')        // -> boolean
 *   can(['edit-category', 'del-category'], 'any')  // -> true nếu có ít nhất 1
 *   can(['edit-category', 'del-category'], 'all')  // -> true nếu có đủ cả 2
 */

import { useCallback } from 'react';
import { usePermissions } from '../stores/userStore';

export default function usePermission() {
    const permissions = usePermissions();

    return useCallback(
        (code, mode = 'any') => {
            if (!code) return true;
            const list = Array.isArray(code) ? code : [code];
            if (list.length === 0) return true;

            const has = (c) => permissions.includes(c);
            return mode === 'all' ? list.every(has) : list.some(has);
        },
        [permissions]
    );
}
