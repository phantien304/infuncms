/**
 * components/product/Reward.jsx — tab "Reward" của product form.
 * -----------------------------------------------------------
 * Redesign 2026-08-02: bỏ field "Points" cấp product (cột `product.points`)
 * — theo docs/CLAUDE.md ("Hệ điểm thưởng — HYBRID"), cột này đã VESTIGIAL từ
 * khi hệ reward chuyển sang mô hình hybrid (migration
 * 2026_07_10_000000_reward_hybrid_schema): CMS vẫn ghi được nhưng
 * CartService::resolveReward/RewardEarnService KHÔNG đọc cột này nữa —
 * field chỉ gây hiểu nhầm cho admin (tưởng nhập là có tác dụng).
 *
 * Bảng `product_rewards` theo user_group VẪN giữ nguyên schema/ý nghĩa cũ,
 * nhưng đổi vai trò: giờ là OVERRIDE (điểm cố định/đơn vị, bỏ qua giá) —
 * nếu để trống (0), hệ thống tự fallback theo tỷ lệ quy đổi toàn cục
 * (setting `config_reward_earn_divisor`: X đồng chi tiêu = 1 điểm, tính
 * động trên giá thực tế lúc mua — đúng cho từng variant dù giá khác nhau).
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';

export default function Reward({ product, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();
    const groups = resource.user_group || [];
    const existing = product.product_rewards || [];

    const rows = groups.map((g) => {
        const ex = existing.find((r) => r.user_group_id === g.id);
        return {
            id: ex?.id || 0,
            user_group_id: g.id,
            name: g.name,
            points: ex?.points ?? 0,
        };
    });

    const setPoints = (groupId, value) => {
        const next = rows.map((r) =>
            r.user_group_id === groupId ? { ...r, points: value } : r
        );
        onChange({ product_rewards: next });
    };

    return (
        <div className="card m-b-20 product-discount">
            <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    Điểm thưởng mỗi nhóm khách là <b>ghi đè (override)</b>: nhập số điểm cố định
                    trên MỖI ĐƠN VỊ sản phẩm mua (không tính theo giá). Để trống (0) = không ghi
                    đè, hệ thống tự tính điểm theo tỷ lệ quy đổi chung (cấu hình
                    "config_reward_earn_divisor" ở SystemConfig — X đồng chi tiêu = 1 điểm,
                    tính trên giá thực tế lúc mua nên vẫn đúng dù các biến thể giá khác nhau).
                </div>

                <table className="table table-bordered mt-3">
                    <thead>
                        <tr>
                            <th>{t('UserGroup')}</th>
                            <th className="text-right">{t('RewardPoints')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item, index) => (
                            <tr key={item.user_group_id} className="post-item-group">
                                <td>{item.name}</td>
                                <td className="text-right">
                                    <Input
                                        value={item.points ?? ''}
                                        onChange={(e) =>
                                            setPoints(item.user_group_id, e.target.value)
                                        }
                                    />
                                    {errors?.[`product_rewards.${index}.points`]?.[0] && (
                                        <span className="has-error">
                                            {errors[`product_rewards.${index}.points`][0]}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
