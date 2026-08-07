/**
 * components/order/Product.jsx — tab "Sản phẩm" của order/form.jsx.
 * -----------------------------------------------------------
 * Convert từ subForm/product.vue (mt219) — VIẾT LẠI HOÀN TOÀN phần chọn
 * option: schema product option/variant đã đổi (xem components/product/Option.jsx).
 *   - mt219 cũ: option -> option_value -> option_value_2 (2 cấp, mỗi value có
 *     price/weight/points +/- riêng) — phức tạp, đã bỏ.
 *   - Bây giờ: option.role = 1 (variant, tạo SKU) hoặc 0 (custom_field, khách
 *     điền tay). Giá nằm THẲNG ở product_variant (1 dòng/tổ hợp variant-option),
 *     custom_field KHÔNG cộng giá (Option.jsx hiện chưa có UI đặt giá riêng
 *     cho custom_field).
 *
 * Giá hiển thị ở đây CHỈ LÀ ƯỚC TÍNH (orderPricing.js, chạy trên trình duyệt)
 * để nhân viên thấy ngay khi chọn option/số lượng — giá THẬT lấy lại từ
 * POST /order/preview-total (tab Confirm) và khi Save (BE không tin giá FE).
 * -----------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import { Select, InputNumber, Button, Spin, Input } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';
import api from '@/core/services/api';
import { error as showError, success as showSuccess, confirm } from '@/core/services/alert';
import {
    resolveVariant,
    effectivePrice,
    formatVnd,
    variantOptionsOf,
    customFieldOptionsOf,
} from '@/core/utils/orderPricing';

const nameFromList = (p) => p?.name || p?.model || `#${p?.id}`;
const nameFromDetail = (p) => {
    const desc = (p?.product_descriptions || []).find((d) => d.name);
    return desc?.name || p?.model || `#${p?.id}`;
};

export default function Product({ order, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();
    const globalOptions = resource.option || [];

    const valueName = useMemo(() => {
        const m = {};
        globalOptions.forEach((o) => (o.option_values || []).forEach((v) => {
            m[v.id] = v.name;
        }));
        return m;
    }, [globalOptions]);
    const optionName = (optionId) => globalOptions.find((o) => o.id === optionId)?.name || '';

    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [productLoading, setProductLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedValues, setSelectedValues] = useState({});
    const [customValues, setCustomValues] = useState({});
    const [quantity, setQuantity] = useState(1);

    const products = order.products || [];
    const setProducts = (next) => onChange({ products: next });

    const searchProduct = (keyword) => {
        setSearching(true);
        api
            .get('/product', { params: { keyword, per_page: 10, deleted_at: 1 } })
            .then((res) => setSearchResults(res.data?.data || []))
            .catch(() => {})
            .finally(() => setSearching(false));
    };

    const pickProduct = (id) => {
        if (!id) {
            setSelectedProduct(null);
            return;
        }
        setProductLoading(true);
        api
            .get(`/product/${id}`)
            .then((res) => {
                setSelectedProduct(res.data?.data || null);
                setSelectedValues({});
                setCustomValues({});
                setQuantity(1);
            })
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => setProductLoading(false));
    };

    const variantOptions = selectedProduct ? variantOptionsOf(selectedProduct) : [];
    const customFieldOptions = selectedProduct ? customFieldOptionsOf(selectedProduct) : [];
    const variant = selectedProduct ? resolveVariant(selectedProduct, selectedValues) : null;
    const canAdd =
        !!selectedProduct &&
        !!variant &&
        variantOptions.every((po) => !!selectedValues[po.option_id]) &&
        customFieldOptions.every((po) => !po.required || (customValues[po.option_id] || '').trim() !== '');
    const estimatedPrice = variant ? effectivePrice(variant, quantity) : 0;

    const addLine = () => {
        if (!canAdd || !variant || !selectedProduct) return;

        const optionValueIds = variantOptions.map((po) => ({
            option_id: po.option_id,
            value_id: selectedValues[po.option_id],
        }));
        const customOptions = customFieldOptions
            .filter((po) => (customValues[po.option_id] || '').trim() !== '')
            .map((po) => ({ option_id: po.option_id, value: customValues[po.option_id].trim() }));
        const displayOptions = [
            ...variantOptions.map((po) => ({
                name: optionName(po.option_id),
                value: valueName[selectedValues[po.option_id]] || '',
            })),
            ...customOptions.map((c) => ({ name: optionName(c.option_id), value: c.value })),
        ];
        const key = `${selectedProduct.id}:${variant.id}:${JSON.stringify(customOptions)}`;

        const existing = products.find((p) => p.key === key);
        if (existing) {
            setProducts(
                products.map((p) =>
                    p.key === key
                        ? { ...p, quantity: p.quantity + quantity, total: (p.quantity + quantity) * p.price }
                        : p
                )
            );
        } else {
            setProducts([
                ...products,
                {
                    key,
                    product_id: selectedProduct.id,
                    name: nameFromDetail(selectedProduct),
                    model: selectedProduct.model,
                    quantity,
                    price: estimatedPrice,
                    total: estimatedPrice * quantity,
                    option_value_ids: optionValueIds,
                    custom_options: customOptions,
                    display_options: displayOptions,
                },
            ]);
        }
        showSuccess(t('AddProductSuccess'));
        setSelectedProduct(null);
        setSelectedValues({});
        setCustomValues({});
        setQuantity(1);
    };

    const removeLine = (key) => {
        confirm(t('DoYouWantToDelete'))
            .then(() => setProducts(products.filter((p) => p.key !== key)))
            .catch(() => {});
    };

    const setLineQuantity = (key, qty) => {
        setProducts(products.map((p) => (p.key === key ? { ...p, quantity: qty, total: qty * p.price } : p)));
    };

    return (
        <div className="mt-2">
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>{t('Product')}</th>
                        <th style={{ width: 120 }}>{t('Quantity')}</th>
                        <th style={{ width: 150 }}>{t('UnitPrice')}</th>
                        <th style={{ width: 150 }}>{t('Total')}</th>
                        <th className="text-center" style={{ width: 100 }}>
                            {t('Action')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {products.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center text-muted">
                                {t('NoData')}
                            </td>
                        </tr>
                    )}
                    {products.map((p) => (
                        <tr key={p.key} className="post-item-group">
                            <td>
                                {p.name}
                                {(p.display_options || []).map((o, i) => (
                                    <div key={i} className="text-muted" style={{ fontSize: 12 }}>
                                        - {o.name}: {o.value}
                                    </div>
                                ))}
                            </td>
                            <td>
                                <InputNumber
                                    min={1}
                                    style={{ width: '100%' }}
                                    value={p.quantity}
                                    onChange={(v) => setLineQuantity(p.key, v || 1)}
                                />
                            </td>
                            <td>{formatVnd(p.price)}</td>
                            <td>{formatVnd(p.total)}</td>
                            <td className="text-center">
                                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeLine(p.key)}>
                                    <i className="fas fa-trash-alt" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {errors?.products && <div className="has-error mb-2">{errors.products[0]}</div>}

            <div className="card m-b-20">
                <div className="card-body">
                    <h5>{t('AddProduct')}</h5>
                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Product')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                style={{ width: '100%' }}
                                showSearch
                                allowClear
                                filterOption={false}
                                placeholder={t('Product')}
                                loading={searching}
                                notFoundContent={searching ? <Spin size="small" /> : null}
                                onSearch={searchProduct}
                                onFocus={() => {
                                    if (!searchResults.length) searchProduct('');
                                }}
                                onChange={pickProduct}
                                value={selectedProduct?.id}
                                options={searchResults.map((p) => ({
                                    value: p.id,
                                    label: nameFromList(p) + (p.model ? ` (${p.model})` : ''),
                                }))}
                            />
                        </div>
                    </div>

                    {productLoading && (
                        <div className="text-center p-3">
                            <Spin />
                        </div>
                    )}

                    {selectedProduct && !productLoading && (
                        <>
                            <div className="row mt-3 pt-3 border-top">
                                <div className="col-xl-2 text-right">
                                    <label className="tit">{t('Quantity')}</label>
                                </div>
                                <div className="col-xl-10">
                                    <InputNumber min={1} value={quantity} onChange={(v) => setQuantity(v || 1)} />
                                </div>
                            </div>

                            {variantOptions.map((po) => (
                                <div className="row mt-3 pt-3 border-top" key={po.option_id}>
                                    <div className="col-xl-2 text-right">
                                        <label className="tit">
                                            {optionName(po.option_id)} <span className="text-danger">(*)</span>
                                        </label>
                                    </div>
                                    <div className="col-xl-10">
                                        <Select
                                            style={{ width: 260 }}
                                            placeholder={t('Select')}
                                            value={selectedValues[po.option_id]}
                                            onChange={(v) => setSelectedValues((s) => ({ ...s, [po.option_id]: v }))}
                                            options={(po.option_value_ids || []).map((id) => ({
                                                value: id,
                                                label: valueName[id] || id,
                                            }))}
                                        />
                                    </div>
                                </div>
                            ))}

                            {customFieldOptions.map((po) => (
                                <div className="row mt-3 pt-3 border-top" key={po.option_id}>
                                    <div className="col-xl-2 text-right">
                                        <label className="tit">
                                            {optionName(po.option_id)} {!!po.required && <span className="text-danger">(*)</span>}
                                        </label>
                                    </div>
                                    <div className="col-xl-10">
                                        <Input
                                            placeholder={po.value || ''}
                                            value={customValues[po.option_id] ?? po.value ?? ''}
                                            onChange={(e) => setCustomValues((s) => ({ ...s, [po.option_id]: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="row mt-3 pt-3 border-top">
                                <div className="col-xl-2 text-right">
                                    <label className="tit">{t('UnitPrice')}</label>
                                </div>
                                <div className="col-xl-10">
                                    {variant ? (
                                        formatVnd(estimatedPrice)
                                    ) : (
                                        <span className="text-muted">{t('PleaseSelectOption')}</span>
                                    )}
                                </div>
                            </div>

                            <div className="row mt-3 mb-2 pt-3 border-top d-flex flex-row-reverse">
                                <Button type="primary" disabled={!canAdd} onClick={addLine}>
                                    <i className="mdi mdi-plus" /> {t('AddProduct')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
