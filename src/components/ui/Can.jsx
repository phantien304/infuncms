/**
 * Can.jsx — ẩn/hiện children theo quyền CMS (UX thuần, xem usePermission.js).
 * -----------------------------------------------------------
 * Cách dùng:
 *   <Can permission="edit-role"><Button>Sửa</Button></Can>
 *   <Can permission={['edit-role', 'del-role']} mode="any">...</Can>
 *   <Can permission="edit-role" fallback={<span>Không có quyền</span>}>...</Can>
 *
 * Không truyền `permission` -> luôn render children (tiện dùng có điều
 * kiện trong JSX mà không phải if/else riêng).
 */

import usePermission from '@/core/hooks/usePermission';

export default function Can({ permission, mode = 'any', fallback = null, children }) {
    const can = usePermission();

    if (!permission) return children;

    return can(permission, mode) ? children : fallback;
}
