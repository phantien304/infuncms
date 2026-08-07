/**
 * components/product/Option.jsx — tab "Option" (schema MỚI: cluster variant).
 * -----------------------------------------------------------
 * Toàn bộ GIÁ / GIÁ NIÊM YẾT / KHO / SL TỐI THIỂU / KHUYẾN MÃI của sản phẩm
 * nhập ở đây (tầng product_variant + product_stock + product_variant_special).
 *
 *   - option.role: 1 = variant (tạo SKU) / 0 = custom_field (khách điền).
 *   - product_options: khai báo product dùng option nào.
 *   - product_variants: đơn vị bán.
 *       + Có option variant → ma trận tổ hợp (cartesian).
 *       + Không có option variant → 1 "biến thể mặc định" (sản phẩm đơn giản).
 *
 * Shape gửi backend:
 *   product_variants: [{ id, price, regular_price, sku, minimum, sort_order,
 *     is_default, stocks: [{ warehouse_id, on_hand, inventory_policy }],
 *     special_price, special_date_start, special_date_end, option_value_ids[] }]
 *   (reserved chỉ đọc — do backend tính từ product_stock. `stocks[]` = đa kho,
 *   1 dòng / warehouse — xem components/product/Option.jsx VariantStockCell.)
 * -----------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import { Input, Select, Checkbox, Radio, Button, Tag, DatePicker, Popover } from 'antd';
import dayjs from 'dayjs';

import useTranslation from '@/core/hooks/useTranslation';
import { confirm } from '@/core/services/alert';

const ROLE_VARIANT = 1;
const ROLE_CUSTOM_FIELD = 0;

// product_stock.inventory_policy — mirror App\Enums\StockPolicy.
const STOCK_POLICIES = [
    { value: 0, label: 'Chặn khi hết (deny)' },
    { value: 1, label: 'Cho bán khống (backorder)' },
    { value: 2, label: 'Không theo dõi kho (untracked)' },
];

const sig = (ids) => [...(ids || [])].map(Number).sort((a, b) => a - b).join('-');

const blankVariant = (combo = [], defaultWarehouseId = null) => ({
    id: 0,
    price: '',
    regular_price: '',
    sku: '',
    minimum: 1,
    sort_order: 0,
    is_default: 0,
    stocks: defaultWarehouseId
        ? [{ warehouse_id: defaultWarehouseId, on_hand: 0, reserved: 0, inventory_policy: 0 }]
        : [],
    special_price: '',
    special_date_start: '',
    special_date_end: '',
    option_value_ids: combo,
});

const stockTotals = (v) => {
    const stocks = v.stocks || [];
    const onHand = stocks.reduce((s, r) => s + (Number(r.on_hand) || 0), 0);
    const reserved = stocks.reduce((s, r) => s + (Number(r.reserved) || 0), 0);
    return { onHand, reserved, available: Math.max(0, onHand - reserved) };
};

/**
 * Ô "Kho" của 1 dòng variant trong bảng Option — đa kho: mỗi variant có THỂ
 * có tồn ở nhiều warehouse cùng lúc (product_stock UNIQUE variant+warehouse).
 * Bấm vào tổng để mở Popover sửa từng dòng kho + thêm/xoá kho.
 */
function VariantStockCell({ variant, warehouses, warehouseById, onAdd, onField, onRemove }) {
    const [addId, setAddId] = useState(undefined);
    const stocks = variant.stocks || [];
    const { onHand, reserved, available } = stockTotals(variant);
    const usedIds = stocks.map((s) => Number(s.warehouse_id));
    const addable = warehouses.filter((w) => !usedIds.includes(Number(w.id)));

    const content = (
        <div style={{ width: 440 }}>
            <table className="table table-bordered table-sm mb-2">
                <thead>
                    <tr>
                        <th>Kho</th>
                        <th style={{ width: 80 }}>Tồn</th>
                        <th style={{ width: 70 }} className="text-center">
                            Đã giữ
                        </th>
                        <th style={{ width: 70 }} className="text-center">
                            Khả dụng
                        </th>
                        <th style={{ width: 170 }}>Chính sách</th>
                        <th style={{ width: 36 }} />
                    </tr>
                </thead>
                <tbody>
                    {stocks.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center text-muted">
                                Chưa có kho nào
                            </td>
                        </tr>
                    )}
                    {stocks.map((s) => {
                        const w = warehouseById[s.warehouse_id];
                        const avail = Math.max(0, (Number(s.on_hand) || 0) - (Number(s.reserved) || 0));
                        return (
                            <tr key={s.warehouse_id}>
                                <td>
                                    {w?.name || `#${s.warehouse_id}`}
                                    {w && !w.is_active && (
                                        <Tag color="red" style={{ marginLeft: 4 }}>
                                            off
                                        </Tag>
                                    )}
                                </td>
                                <td>
                                    <Input
                                        value={s.on_hand ?? ''}
                                        onChange={(e) => onField(s.warehouse_id, 'on_hand', e.target.value)}
                                    />
                                </td>
                                <td className="text-center text-muted">{Number(s.reserved) || 0}</td>
                                <td className="text-center">{avail}</td>
                                <td>
                                    <Select
                                        style={{ width: '100%' }}
                                        size="small"
                                        value={Number(s.inventory_policy) || 0}
                                        onChange={(val) => onField(s.warehouse_id, 'inventory_policy', val)}
                                        options={STOCK_POLICIES}
                                    />
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => onRemove(s.warehouse_id)}
                                    >
                                        <i className="mdi mdi-delete" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="d-flex" style={{ gap: 8 }}>
                <Select
                    style={{ flex: 1 }}
                    size="small"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    placeholder="Thêm kho"
                    value={addId}
                    onChange={setAddId}
                    options={addable.map((w) => ({ label: w.name, value: w.id }))}
                />
                <Button
                    size="small"
                    type="primary"
                    disabled={!addId}
                    onClick={() => {
                        onAdd(addId);
                        setAddId(undefined);
                    }}
                >
                    Thêm
                </Button>
            </div>
        </div>
    );

    return (
        <Popover content={content} title="Tồn kho theo chi nhánh" trigger="click" placement="bottomLeft">
            <a role="button" style={{ cursor: 'pointer', display: 'block' }}>
                <b>{onHand}</b>
                {reserved > 0 && <span className="text-muted"> (giữ {reserved})</span>}
                <div className="text-muted" style={{ fontSize: 12 }}>
                    Khả dụng {available} · {stocks.length} kho
                </div>
            </a>
        </Popover>
    );
}

export default function Option({ product, resource = {}, onChange }) {
    const t = useTranslation();
    const options = resource.option || [];
    const warehouses = resource.warehouse || [];
    const productOptions = product.product_options || [];
    const variants = product.product_variants || [];
    const [addId, setAddId] = useState(undefined);

    const warehouseById = useMemo(
        () => Object.fromEntries(warehouses.map((w) => [w.id, w])),
        [warehouses]
    );
    // Kho mặc định cho variant mới tạo — kho ưu tiên cao nhất (priority thấp
    // nhất, resource.warehouse đã sắp theo priority), khớp WarehouseService::
    // defaultId() trong đa số trường hợp (kho id=1 'DEFAULT' priority=0).
    const defaultWarehouseId = warehouses[0]?.id || null;

    const optionById = useMemo(
        () => Object.fromEntries(options.map((o) => [o.id, o])),
        [options]
    );
    // option_value_id -> { name, option_id }
    const valueInfo = useMemo(() => {
        const m = {};
        options.forEach((o) =>
            (o.option_values || []).forEach((v) => {
                m[v.id] = { name: v.name, option_id: o.id };
            })
        );
        return m;
    }, [options]);

    const setPO = (next) => onChange({ product_options: next });
    const setVariants = (next) => onChange({ product_variants: next });

    // ---- Khai báo option ----
    const addedIds = productOptions.map((p) => p.option_id);
    const available = options.filter((o) => !addedIds.includes(o.id));

    const addOption = () => {
        const o = optionById[addId];
        if (!o) return;
        setPO([
            ...productOptions,
            {
                option_id: o.id,
                role: o.role,
                required: 0,
                value: '',
                option_value_ids: [],
            },
        ]);
        setAddId(undefined);
    };
    const removeOption = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setPO(productOptions.filter((_, idx) => idx !== i)))
            .catch(() => {});
    const setPOField = (i, field, val) =>
        setPO(productOptions.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

    // ---- Ma trận variant ----
    const variantOptions = productOptions.filter(
        (p) => p.role === ROLE_VARIANT && (p.option_value_ids || []).length
    );
    const matrix = variantOptions.length > 0;

    // Sản phẩm đơn giản: 1 dòng mặc định (giữ dữ liệu đã tải hoặc dòng trống).
    const simpleRow = variants[0] || { ...blankVariant([], defaultWarehouseId), is_default: 1 };
    const rows = matrix ? variants : [simpleRow];

    const generate = () => {
        let combos = [[]];
        variantOptions.forEach((po) => {
            const next = [];
            combos.forEach((c) =>
                po.option_value_ids.forEach((v) => next.push([...c, v]))
            );
            combos = next;
        });
        const existing = {};
        variants.forEach((vr) => {
            existing[sig(vr.option_value_ids)] = vr;
        });
        const built = combos.map(
            (combo) => existing[sig(combo)] || blankVariant(combo, defaultWarehouseId)
        );
        if (built.length && !built.some((r) => r.is_default)) built[0].is_default = 1;
        setVariants(built);
    };

    // Cập nhật 1 dòng variant bằng hàm biến đổi (matrix theo index; simple
    // luôn là 1 dòng mặc định) — dùng chung cho field phẳng lẫn thao tác
    // mảng stocks[] lồng bên trong (đa kho).
    const updateVariant = (i, updater) => {
        if (matrix) {
            setVariants(variants.map((v, idx) => (idx === i ? updater(v) : v)));
        } else {
            setVariants([{ ...updater(simpleRow), is_default: 1, option_value_ids: [] }]);
        }
    };
    const updateRow = (i, field, val) => updateVariant(i, (v) => ({ ...v, [field]: val }));

    // Đa kho — thêm/sửa/xoá 1 dòng product_stock (theo warehouse_id) của
    // variant thứ i. Full-replace theo variant mỗi lần Save (xem
    // ProductVariantWriter::syncVariantStocks phía backend).
    const addStockRow = (i, warehouseId) => {
        if (!warehouseId) return;
        updateVariant(i, (v) => {
            const stocks = v.stocks || [];
            if (stocks.some((s) => Number(s.warehouse_id) === Number(warehouseId))) return v;
            return {
                ...v,
                stocks: [...stocks, { warehouse_id: warehouseId, on_hand: 0, reserved: 0, inventory_policy: 0 }],
            };
        });
    };
    const updateStockField = (i, warehouseId, field, val) =>
        updateVariant(i, (v) => ({
            ...v,
            stocks: (v.stocks || []).map((s) =>
                Number(s.warehouse_id) === Number(warehouseId) ? { ...s, [field]: val } : s
            ),
        }));
    const removeStockRow = (i, warehouseId) =>
        updateVariant(i, (v) => ({
            ...v,
            stocks: (v.stocks || []).filter((s) => Number(s.warehouse_id) !== Number(warehouseId)),
        }));

    const setDefault = (i) =>
        setVariants(variants.map((v, idx) => ({ ...v, is_default: idx === i ? 1 : 0 })));
    const removeVariant = (i) =>
        setVariants(variants.filter((_, idx) => idx !== i));

    // Giá trị của 1 variant theo từng cột option (map theo option_id).
    const cellValue = (variant, optionId) => {
        const vid = (variant.option_value_ids || []).find(
            (id) => valueInfo[id]?.option_id === optionId
        );
        return vid ? valueInfo[vid]?.name : '';
    };

    // Nhóm ô giá/khuyến mãi/kho — dùng chung cho cả matrix lẫn simple.
    const priceCells = (v, i) => (
        <>
            <td>
                <Input
                    value={v.price ?? ''}
                    onChange={(e) => updateRow(i, 'price', e.target.value)}
                />
            </td>
            <td>
                <Input
                    value={v.regular_price ?? ''}
                    placeholder="—"
                    onChange={(e) => updateRow(i, 'regular_price', e.target.value)}
                />
            </td>
            <td>
                <Input
                    value={v.special_price ?? ''}
                    placeholder="—"
                    onChange={(e) => updateRow(i, 'special_price', e.target.value)}
                />
            </td>
            <td>
                <DatePicker
                    style={{ width: 130 }}
                    format="YYYY-MM-DD"
                    value={v.special_date_start ? dayjs(v.special_date_start) : null}
                    onChange={(d) =>
                        updateRow(i, 'special_date_start', d ? d.format('YYYY-MM-DD') : '')
                    }
                />
            </td>
            <td>
                <DatePicker
                    style={{ width: 130 }}
                    format="YYYY-MM-DD"
                    value={v.special_date_end ? dayjs(v.special_date_end) : null}
                    onChange={(d) =>
                        updateRow(i, 'special_date_end', d ? d.format('YYYY-MM-DD') : '')
                    }
                />
            </td>
            <td>
                <Input
                    value={v.sku ?? ''}
                    onChange={(e) => updateRow(i, 'sku', e.target.value)}
                />
            </td>
            <td style={{ minWidth: 160 }}>
                <VariantStockCell
                    variant={v}
                    warehouses={warehouses}
                    warehouseById={warehouseById}
                    onAdd={(warehouseId) => addStockRow(i, warehouseId)}
                    onField={(warehouseId, field, val) => updateStockField(i, warehouseId, field, val)}
                    onRemove={(warehouseId) => removeStockRow(i, warehouseId)}
                />
            </td>
            <td>
                <Input
                    style={{ width: 90 }}
                    value={v.minimum ?? ''}
                    onChange={(e) => updateRow(i, 'minimum', e.target.value)}
                />
            </td>
        </>
    );

    return (
        <div className="card m-b-20 product-option">
            <div className="card-body">
                {/* ============ Khai báo option ============ */}
                <h5>{t('Options')}</h5>
                <div className="d-flex" style={{ gap: 8, marginBottom: 12 }}>
                    <Select
                        style={{ width: 280 }}
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        placeholder={t('Select')}
                        value={addId}
                        onChange={setAddId}
                        options={available.map((o) => ({
                            label:
                                o.name +
                                (o.role === ROLE_VARIANT ? ' (variant)' : ' (custom)'),
                            value: o.id,
                        }))}
                    />
                    <Button type="primary" onClick={addOption} disabled={!addId}>
                        {t('Add')}
                    </Button>
                </div>

                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th className="width-200">{t('Option')}</th>
                            <th>{t('Content')}</th>
                            <th className="text-center width-150">{t('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productOptions.map((po, i) => {
                            const o = optionById[po.option_id] || {};
                            return (
                                <tr key={i} className="post-item-group">
                                    <td>
                                        {o.name}{' '}
                                        <Tag color={po.role === ROLE_VARIANT ? 'blue' : 'default'}>
                                            {po.role === ROLE_VARIANT ? 'variant' : 'custom'}
                                        </Tag>
                                    </td>
                                    <td>
                                        {po.role === ROLE_VARIANT ? (
                                            <Select
                                                mode="multiple"
                                                style={{ width: '100%' }}
                                                placeholder={t('Select')}
                                                optionFilterProp="label"
                                                value={po.option_value_ids}
                                                onChange={(v) =>
                                                    setPOField(i, 'option_value_ids', v)
                                                }
                                                options={(o.option_values || []).map((ov) => ({
                                                    label: ov.name,
                                                    value: ov.id,
                                                }))}
                                            />
                                        ) : (
                                            <div className="d-flex" style={{ gap: 12 }}>
                                                <Input
                                                    placeholder={t('DefaultValue')}
                                                    value={po.value || ''}
                                                    onChange={(e) =>
                                                        setPOField(i, 'value', e.target.value)
                                                    }
                                                />
                                                <Checkbox
                                                    checked={!!po.required}
                                                    onChange={(e) =>
                                                        setPOField(i, 'required', e.target.checked ? 1 : 0)
                                                    }
                                                >
                                                    {t('Required')}
                                                </Checkbox>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="float-right">
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={() => removeOption(i)}
                                            >
                                                <i className="mdi mdi-delete" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* ============ Biến thể / giá / kho / khuyến mãi ============ */}
                <div
                    className="d-flex"
                    style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}
                >
                    <h5 className="m-0">
                        {matrix ? t('Variants') : 'Biến thể mặc định'}
                    </h5>
                    {matrix && <Button onClick={generate}>{t('GenerateVariants')}</Button>}
                </div>
                {!matrix && (
                    <div className="text-muted" style={{ margin: '4px 0 8px' }}>
                        Sản phẩm đơn giản — nhập giá / giá niêm yết / kho / khuyến mãi
                        cho biến thể mặc định.
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table
                        className="table table-bordered mt-2"
                        style={{ minWidth: matrix ? 1300 : 1050 }}
                    >
                        <thead>
                            <tr className="text-center">
                                {matrix && (
                                    <th colSpan={variantOptions.length}>Biến thể</th>
                                )}
                                <th colSpan={2}>Giá</th>
                                <th colSpan={3}>Khuyến mãi</th>
                                <th colSpan={3}>Kho</th>
                                {matrix && <th colSpan={3}>Khác</th>}
                            </tr>
                            <tr>
                                {matrix &&
                                    variantOptions.map((po) => (
                                        <th key={po.option_id}>
                                            {optionById[po.option_id]?.name}
                                        </th>
                                    ))}
                                <th>Giá bán</th>
                                <th>Giá niêm yết</th>
                                <th>Giá KM</th>
                                <th>KM từ</th>
                                <th>KM đến</th>
                                <th>{t('SKU')}</th>
                                <th>Tồn kho (đa kho)</th>
                                <th>SL tối thiểu</th>
                                {matrix && (
                                    <>
                                        <th>{t('Default')}</th>
                                        <th>{t('SortOrder')}</th>
                                        <th>{t('Action')}</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((v, i) => (
                                <tr key={i} className="post-item-group">
                                    {matrix &&
                                        variantOptions.map((po) => (
                                            <td key={po.option_id}>
                                                {cellValue(v, po.option_id)}
                                            </td>
                                        ))}
                                    {priceCells(v, i)}
                                    {matrix && (
                                        <>
                                            <td className="text-center">
                                                <Radio
                                                    checked={!!v.is_default}
                                                    onChange={() => setDefault(i)}
                                                />
                                            </td>
                                            <td>
                                                <Input
                                                    style={{ width: 80 }}
                                                    value={v.sort_order ?? ''}
                                                    onChange={(e) =>
                                                        updateRow(i, 'sort_order', e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-danger"
                                                    onClick={() => removeVariant(i)}
                                                >
                                                    <i className="mdi mdi-delete" />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {matrix && variants.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={variantOptions.length + 11}
                                        className="text-center text-muted"
                                    >
                                        {t('NoData')} — bấm "{t('GenerateVariants')}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
