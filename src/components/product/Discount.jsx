/**
 * components/product/Discount.jsx — tab "Discount" của product form.
 * -----------------------------------------------------------
 * Redesign 2026-08-02: bảng `product_discount` (OpenCart legacy, khoá theo
 * product_id, 1 giá tuyệt đối cho CẢ sản phẩm) đã được xác nhận KHÔNG còn
 * ảnh hưởng gì tới giá checkout (CartService không đọc) và không còn hợp lý
 * từ khi giá chuyển xuống product_variant (mỗi variant giá riêng). Đã thay
 * bằng `product_variant_discount` — chiết khấu theo số lượng mua, khai báo
 * RIÊNG cho từng biến thể (giống cách tab Option quản lý giá/kho theo
 * variant, và product_variant_special quản lý giá khuyến mãi theo variant).
 *
 * Sản phẩm đơn giản (không option tạo biến thể): chỉ có 1 "biến thể mặc
 * định" → UI gần như y hệt bản cũ (không đổi trải nghiệm cho trường hợp phổ
 * biến nhất). Sản phẩm có option tạo biến thể (matrix): mỗi biến thể có bảng
 * tier riêng, vì giá gốc khác nhau nên 1 bảng chiết khấu chung không còn
 * đúng nghĩa.
 *
 * Field lưu vào product_variants[i].discounts[] (embed theo variant, cùng
 * cơ chế với special_price/special_date_start/special_date_end — xem
 * ProductVariantWriter::syncVariantDiscounts).
 * -----------------------------------------------------------
 */

import React, { useMemo } from 'react';
import { Input, Select, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';

import useTranslation from '@/core/hooks/useTranslation';
import { confirm } from '@/core/services/alert';

const ROLE_VARIANT = 1;

const blankTier = (defaultGroupId) => ({
    id: 0,
    user_group_id: defaultGroupId,
    quantity: 2,
    priority: 1,
    price: '',
    date_start: '',
    date_end: '',
});

export default function Discount({ product, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();
    const variants = product.product_variants || [];
    const productOptions = product.product_options || [];
    const groups = resource.user_group || [];
    const options = resource.option || [];

    const valueInfo = useMemo(() => {
        const m = {};
        options.forEach((o) =>
            (o.option_values || []).forEach((v) => {
                m[v.id] = { name: v.name, option_id: o.id };
            })
        );
        return m;
    }, [options]);

    // Cùng logic matrix/simple với Option.jsx: có option role=variant kèm
    // option_value_ids mới coi là sản phẩm nhiều biến thể.
    const variantOptions = productOptions.filter(
        (p) => p.role === ROLE_VARIANT && (p.option_value_ids || []).length
    );
    const matrix = variantOptions.length > 0;
    // Simple: chỉ 1 dòng (biến thể mặc định) — slice(0,1) vẫn giữ nguyên
    // index 0 nên `vi` bên dưới luôn khớp đúng vị trí thật trong `variants`.
    const rows = matrix ? variants : variants.slice(0, 1);

    const defaultGroupId = groups[0]?.id ?? 1;

    const setVariants = (next) => onChange({ product_variants: next });

    const variantLabel = (v) => {
        if (!matrix) return 'Biến thể mặc định';
        const names = (v.option_value_ids || [])
            .map((id) => valueInfo[id]?.name)
            .filter(Boolean);
        return names.length ? names.join(' / ') : v.sku || `SKU trống`;
    };

    const setTiers = (variantIndex, nextTiers) =>
        setVariants(
            variants.map((v, idx) => (idx === variantIndex ? { ...v, discounts: nextTiers } : v))
        );

    const addTier = (variantIndex) => {
        const v = variants[variantIndex];
        setTiers(variantIndex, [...(v.discounts || []), blankTier(defaultGroupId)]);
    };

    const removeTier = (variantIndex, tierIndex) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => {
                const v = variants[variantIndex];
                setTiers(variantIndex, (v.discounts || []).filter((_, i) => i !== tierIndex));
            })
            .catch(() => {});

    const setTierField = (variantIndex, tierIndex, field, value) => {
        const v = variants[variantIndex];
        const tiers = (v.discounts || []).map((d, i) =>
            i === tierIndex ? { ...d, [field]: value } : d
        );
        setTiers(variantIndex, tiers);
    };

    const errOf = (variantIndex, tierIndex, field) =>
        errors?.[`product_variants.${variantIndex}.discounts.${tierIndex}.${field}`]?.[0];

    if (!rows.length) {
        return (
            <div className="card m-b-20">
                <div className="card-body text-center text-muted">
                    Chưa có biến thể nào — mở tab <b>Option</b> trước để tạo biến thể mặc định,
                    sau đó quay lại đây khai báo chiết khấu theo số lượng.
                </div>
            </div>
        );
    }

    return (
        <div className="card m-b-20 product-discount">
            <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    Chiết khấu theo số lượng mua, áp dụng riêng cho từng biến thể (mỗi biến thể
                    giá gốc khác nhau). Khách mua đạt "Số lượng từ" sẽ được áp "Giá" tương ứng.
                    Nếu cùng lúc có giá khuyến mãi (tab Option) thấp hơn, hệ thống tự chọn giá
                    thấp hơn cho khách — hai cơ chế không cộng dồn.
                </div>

                {rows.map((v, vi) => {
                    const tiers = v.discounts || [];
                    return (
                        <div key={v.id || vi} className="mb-4 pb-3 border-bottom">
                            <h6 className="mb-2">{variantLabel(v)}</h6>
                            <table className="table table-bordered mb-2">
                                <thead>
                                    <tr>
                                        <th className="width-200">{t('UserGroup')}</th>
                                        <th>{t('Quantity')}</th>
                                        <th>{t('Priority')}</th>
                                        <th>{t('Price')}</th>
                                        <th>{t('DateStart')}</th>
                                        <th>{t('DateEnd')}</th>
                                        <th className="text-center width-100">{t('Action')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tiers.map((d, di) => (
                                        <tr key={di} className="post-item-group">
                                            <td className="width-150">
                                                <Select
                                                    style={{ width: '100%' }}
                                                    showSearch
                                                    optionFilterProp="label"
                                                    placeholder={t('Select')}
                                                    value={d.user_group_id}
                                                    onChange={(val) =>
                                                        setTierField(vi, di, 'user_group_id', val)
                                                    }
                                                    options={groups.map((g) => ({
                                                        label: g.name,
                                                        value: g.id,
                                                    }))}
                                                />
                                                {errOf(vi, di, 'user_group_id') && (
                                                    <span className="has-error">
                                                        {errOf(vi, di, 'user_group_id')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <Input
                                                    value={d.quantity ?? ''}
                                                    onChange={(e) =>
                                                        setTierField(vi, di, 'quantity', e.target.value)
                                                    }
                                                />
                                                {errOf(vi, di, 'quantity') && (
                                                    <span className="has-error">
                                                        {errOf(vi, di, 'quantity')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <Input
                                                    value={d.priority ?? ''}
                                                    onChange={(e) =>
                                                        setTierField(vi, di, 'priority', e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <Input
                                                    value={d.price ?? ''}
                                                    onChange={(e) =>
                                                        setTierField(vi, di, 'price', e.target.value)
                                                    }
                                                />
                                                {errOf(vi, di, 'price') && (
                                                    <span className="has-error">
                                                        {errOf(vi, di, 'price')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <DatePicker
                                                    style={{ width: '100%' }}
                                                    format="YYYY-MM-DD"
                                                    value={d.date_start ? dayjs(d.date_start) : null}
                                                    onChange={(dt) =>
                                                        setTierField(
                                                            vi,
                                                            di,
                                                            'date_start',
                                                            dt ? dt.format('YYYY-MM-DD') : ''
                                                        )
                                                    }
                                                    placeholder={t('Select')}
                                                />
                                            </td>
                                            <td>
                                                <DatePicker
                                                    style={{ width: '100%' }}
                                                    format="YYYY-MM-DD"
                                                    value={d.date_end ? dayjs(d.date_end) : null}
                                                    onChange={(dt) =>
                                                        setTierField(
                                                            vi,
                                                            di,
                                                            'date_end',
                                                            dt ? dt.format('YYYY-MM-DD') : ''
                                                        )
                                                    }
                                                    placeholder={t('Select')}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-danger"
                                                    onClick={() => removeTier(vi, di)}
                                                >
                                                    <i className="mdi mdi-delete" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!tiers.length && (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted">
                                                {t('NoData')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <Button size="small" onClick={() => addTier(vi)}>
                                {t('Add')}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
