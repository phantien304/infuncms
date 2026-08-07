/**
 * components/role/PermissionMatrix.jsx — ma trận quyền cho pages/role/form.jsx
 * -----------------------------------------------------------
 * Phase 3.2 (docs/ROLE-PERMISSION-PLAN.md). Nguồn dữ liệu:
 *   GET /rcms/role/permissions/registry
 *   -> { data: [ { entity: 'category', permissions: [
 *        { action, code, id }, ...5 action... ] }, ...20 entity hiện có ] }
 * `id` là null nếu `php artisan permission:sync` chưa chạy cho quyền đó —
 * disable checkbox thay vì gửi id rỗng (không phải lỗi FE, là chưa sync).
 *
 * Hàng = entity, group theo 6 nhóm nghiệp vụ (Api/Cms/README.md) thay vì
 * liệt kê phẳng — registry sẽ phình tới ~90 entity khi backend làm đủ.
 * Cột = 5 action cố định (list/detail/create/edit/del, CmsPermissionEntity::ACTIONS).
 * Check-all theo CẢ hàng lẫn cột (mt219 chỉ có theo cột).
 *
 * Chống leo thang (khớp RoleWriteService::filterToOwnPermissions() ở
 * backend — FE chỉ là UX, backend luôn là nguồn quyết định thật): checkbox
 * ngoài quyền hiện có của user đăng nhập bị disable, KHÔNG ẩn — để user
 * hiểu vì sao không tick được thay vì tưởng nhầm là thiếu tính năng.
 *
 * Props:
 *   value: number[]           — permission_ids đang chọn (controlled)
 *   onChange: (number[]) => void
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Input, Checkbox, Spin } from 'antd';
import api from '@/core/services/api';
import useTranslation from '@/core/hooks/useTranslation';
import usePermission from '@/core/hooks/usePermission';
import { error as showError } from '@/core/services/alert';

const ACTIONS = ['list', 'detail', 'create', 'edit', 'del'];

// Group nghiệp vụ (Api/Cms/README.md) — entity chưa map rơi vào 'Khac' thay
// vì biến mất, để không "mất tích" khi backend đăng ký entity mới mà FE
// quên cập nhật bảng này.
const GROUP_BY_ENTITY = {
    category: 'Catalog',
    product: 'Catalog',
    warehouse: 'Catalog',
    banner: 'Marketing',
    order: 'Order',
    'order-status': 'Order',
    carrier: 'Order',
    payment: 'Order',
    zone: 'Order',
    district: 'Order',
    ward: 'Order',
    blog: 'Content',
    'blog-category': 'Content',
    menu: 'Content',
    'menu-value': 'Content',
    information: 'Content',
    setting: 'System',
    user: 'System',
    role: 'System',
    'user-group': 'System',
};
const GROUP_ORDER = ['Catalog', 'Order', 'Customer', 'Marketing', 'Content', 'System', 'Khac'];

export default function PermissionMatrix({ value = [], onChange }) {
    const t = useTranslation();
    const can = usePermission();

    const [registry, setRegistry] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        api
            .get('/role/permissions/registry')
            .then((res) => setRegistry(res.data?.data || []))
            .catch((err) =>
                showError(t(err?.response?.data?.message || 'ErrorAction'))
            )
            .finally(() => setLoading(false));
    }, [t]);

    const selected = useMemo(() => new Set(value), [value]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return kw
            ? registry.filter((r) => r.entity.toLowerCase().includes(kw))
            : registry;
    }, [registry, keyword]);

    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach((row) => {
            const group = GROUP_BY_ENTITY[row.entity] || 'Khac';
            (map[group] ||= []).push(row);
        });
        return GROUP_ORDER.map((g) => ({ group: g, rows: map[g] || [] })).filter(
            (g) => g.rows.length > 0
        );
    }, [filtered]);

    const toggle = (id, checked) => {
        if (id == null) return;
        const next = new Set(selected);
        checked ? next.add(id) : next.delete(id);
        onChange?.(Array.from(next));
    };

    // Checkbox chỉ bật được nếu: đã sync (có id) VÀ user hiện tại đang có
    // chính quyền đó (chống leo thang, khớp filterToOwnPermissions backend).
    const isSelectable = (perm) => perm.id != null && can(perm.code);

    const toggleRow = (row, checked) => {
        const next = new Set(selected);
        row.permissions.forEach((p) => {
            if (!isSelectable(p) && !checked) return; // không tự tắt quyền không sở hữu
            if (!isSelectable(p)) return;
            checked ? next.add(p.id) : next.delete(p.id);
        });
        onChange?.(Array.from(next));
    };

    const toggleColumn = (action, checked) => {
        const next = new Set(selected);
        filtered.forEach((row) => {
            const p = row.permissions.find((x) => x.action === action);
            if (!p || !isSelectable(p)) return;
            checked ? next.add(p.id) : next.delete(p.id);
        });
        onChange?.(Array.from(next));
    };

    const isRowFullyChecked = (row) => {
        const selectable = row.permissions.filter(isSelectable);
        return selectable.length > 0 && selectable.every((p) => selected.has(p.id));
    };
    const isColumnFullyChecked = (action) => {
        const cells = filtered
            .map((row) => row.permissions.find((x) => x.action === action))
            .filter(Boolean)
            .filter(isSelectable);
        return cells.length > 0 && cells.every((p) => selected.has(p.id));
    };

    if (loading) {
        return (
            <div className="p-4 text-center">
                <Spin />
            </div>
        );
    }

    return (
        <div className="permission-matrix">
            <div className="row mb-3">
                <div className="col-xl-4">
                    <Input.Search
                        placeholder={t('SearchEntity')}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        allowClear
                    />
                </div>
            </div>

            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th style={{ minWidth: 160 }}>{t('Entity')}</th>
                        {ACTIONS.map((action) => (
                            <th key={action} className="text-center">
                                <div>{t(action)}</div>
                                <Checkbox
                                    checked={isColumnFullyChecked(action)}
                                    onChange={(e) => toggleColumn(action, e.target.checked)}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {grouped.map(({ group, rows }) => (
                        <React.Fragment key={group}>
                            <tr>
                                <td colSpan={ACTIONS.length + 1} style={{ background: '#f5f5f5' }}>
                                    <strong>{t(group)}</strong>
                                </td>
                            </tr>
                            {rows.map((row) => (
                                <tr key={row.entity}>
                                    <td>
                                        <Checkbox
                                            checked={isRowFullyChecked(row)}
                                            onChange={(e) => toggleRow(row, e.target.checked)}
                                        >
                                            {row.entity}
                                        </Checkbox>
                                    </td>
                                    {ACTIONS.map((action) => {
                                        const perm = row.permissions.find(
                                            (p) => p.action === action
                                        );
                                        if (!perm) return <td key={action} />;
                                        return (
                                            <td key={action} className="text-center">
                                                <Checkbox
                                                    checked={
                                                        perm.id != null && selected.has(perm.id)
                                                    }
                                                    disabled={!isSelectable(perm)}
                                                    title={
                                                        perm.id == null
                                                            ? t('PermissionNotSynced')
                                                            : !can(perm.code)
                                                            ? t('PermissionNotOwned')
                                                            : undefined
                                                    }
                                                    onChange={(e) =>
                                                        toggle(perm.id, e.target.checked)
                                                    }
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
