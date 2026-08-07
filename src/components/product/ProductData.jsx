/**
 * components/product/ProductData.jsx — tab "Data" của product form.
 * -----------------------------------------------------------
 * Chỉ còn dữ liệu cấp PRODUCT: định danh (model/sku/mã vạch), link bán custom,
 * thuế, badge, cờ hiển thị, tình trạng hết hàng, vận chuyển, ngày bán, kích
 * thước & khối lượng, sort.
 *
 * Giá / giá niêm yết / tồn kho / SL tối thiểu / giá khuyến mãi ĐÃ CHUYỂN sang
 * tab Option (tầng product_variant + product_stock + product_variant_special).
 * Sản phẩm đơn giản = 1 variant mặc định, nhập ngay ở tab Option.
 *
 * Props:
 *   product   : objForm
 *   resource  : listResource (stock_status, length_class, weight_class, tax_class...)
 *   errors    : object lỗi validate (key phẳng: 'model'...)
 *   onChange  : (patch) => void
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input, Select, Radio, DatePicker } from 'antd';
import dayjs from 'dayjs';

import useTranslation from '@/core/hooks/useTranslation';
import { confirm } from '@/core/services/alert';

const BADGES = [
    { id: 'new', name: 'Mới' },
    { id: 'hot', name: 'Bán chạy' },
    { id: 'sale', name: 'Sale' },
    { id: 'best', name: 'Tốt nhất' },
    { id: 'feature', name: 'Nổi bật' },
];

const YES_NO = [
    { label: 'Yes', value: 1 },
    { label: 'No', value: 0 },
];

/**
 * QUAN TRỌNG: Field PHẢI khai báo ở module scope (ngoài component
 * ProductData), KHÔNG được định nghĩa bên trong thân hàm ProductData.
 *
 * Trước đây `const Field = (...) => (...)` nằm bên trong ProductData ⇒ mỗi
 * lần ProductData re-render (tức là MỌI keystroke, vì onChange → cha
 * setObjForm → prop `product` đổi tham chiếu → ProductData render lại) thì
 * Field lại là một FUNCTION REFERENCE MỚI. Với JSX, React coi "loại"
 * component chính là function reference đó — reference đổi ⇒ React huỷ hẳn
 * cây con cũ (unmount toàn bộ DOM, kể cả input đang focus) rồi mount lại cây
 * mới. Hệ quả: gõ đúng 1 ký tự vào input trong <Field> (Model/SKU/UPC/EAN/...)
 * là mất focus ngay lập tức, không gõ tiếp được, và vì onChange chỉ kịp bắn 1
 * lần nên field coi như luôn rỗng/1-ký-tự khi Save ⇒ không lưu được xuống DB.
 * Fix: đưa Field ra ngoài, thành 1 component ổn định (reference cố định qua
 * mọi lần render) — input bên trong sẽ giữ được DOM node, giữ được focus.
 */
function Field({ label, required, error, children, first }) {
    return (
        <div className={'row mt-3' + (first ? '' : ' pt-3 border-top')}>
            <div className="col-xl-2 text-right">
                <label className="tit">
                    {label}
                    {required && <span className="text-danger">&nbsp;*</span>}
                </label>
            </div>
            <div className="col-xl-10">
                {children}
                {error && <span className="has-error">{error}</span>}
            </div>
        </div>
    );
}

export default function ProductData({ product, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();

    const setField = (field, value) => onChange({ [field]: value });
    const errOf = (field) => errors?.[field]?.[0];

    // --- link_sale_custom (bảng name/link) ---
    const links = product.link_sale_custom || [];
    const setLinks = (next) => onChange({ link_sale_custom: next });
    const setLinkField = (i, field, value) =>
        setLinks(links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
    const addLink = () => setLinks([...links, { name: '', link: '' }]);
    const removeLink = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setLinks(links.filter((_, idx) => idx !== i)))
            .catch(() => {});

    const text = (field) => (
        <Input value={product[field] ?? ''} onChange={(e) => setField(field, e.target.value)} />
    );

    const yesNo = (field) => (
        <Select
            style={{ width: '100%' }}
            value={product[field]}
            onChange={(v) => setField(field, v)}
            options={YES_NO}
        />
    );

    const selectFrom = (field, list, labelKey = 'name', placeholderNone = false) => (
        <Select
            style={{ width: '100%' }}
            showSearch
            allowClear
            optionFilterProp="label"
            placeholder={t('Select')}
            value={product[field] === '' ? undefined : product[field]}
            onChange={(v) => setField(field, v ?? '')}
            options={[
                ...(placeholderNone ? [{ label: '--None--', value: 0 }] : []),
                ...(list || []).map((it) => ({ label: it[labelKey], value: it.id })),
            ]}
        />
    );

    return (
        <div className="card m-b-20 product-data">
            <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    Giá, giá niêm yết, tồn kho, SL tối thiểu và giá khuyến mãi được
                    nhập ở tab Option (theo từng biến thể; sản phẩm đơn giản có sẵn
                    1 biến thể mặc định).
                </div>
                <Field label={t('Model')} required error={errOf('model')} first>
                    {text('model')}
                </Field>
                <Field label={t('SKU')} error={errOf('sku')}>{text('sku')}</Field>
                <Field label={t('UPC')} error={errOf('upc')}>{text('upc')}</Field>
                <Field label={t('EAN')} error={errOf('ean')}>{text('ean')}</Field>
                <Field label={t('JAN')} error={errOf('jan')}>{text('jan')}</Field>
                <Field label={t('ISBN')} error={errOf('isbn')}>{text('isbn')}</Field>
                <Field label={t('MPN')} error={errOf('mpn')}>{text('mpn')}</Field>
                <Field label={t('Location')} error={errOf('location')}>{text('location')}</Field>

                <Field label={t('LinkSaleCustom')}>
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th className="width-250">{t('Name')}</th>
                                <th className="text-right">{t('Link')}</th>
                                <th className="text-center width-150">{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {links.map((item, i) => (
                                <tr key={i} className="post-item-group">
                                    <td>
                                        <Input
                                            value={item.name || ''}
                                            onChange={(e) => setLinkField(i, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <Input
                                            value={item.link || ''}
                                            onChange={(e) => setLinkField(i, 'link', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <div className="float-right">
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={() => removeLink(i)}
                                            >
                                                <i className="mdi mdi-delete" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={2} />
                                <td className="text-right">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        title={t('AddLink')}
                                        onClick={addLink}
                                    >
                                        <i className="fa fa-plus-circle" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Field>

                <Field label={t('TaxClass')} error={errOf('tax_class_id')}>
                    {selectFrom('tax_class_id', resource.tax_class, 'title', true)}
                </Field>

                <Field label={t('Badge')} error={errOf('badge')}>
                    <Select
                        style={{ width: '100%' }}
                        allowClear
                        placeholder={t('Select')}
                        value={product.badge || undefined}
                        onChange={(v) => setField('badge', v ?? '')}
                        options={BADGES.map((b) => ({ label: b.name, value: b.id }))}
                    />
                </Field>

                <Field label={t('ProductCustom')} error={errOf('is_custom')}>
                    {yesNo('is_custom')}
                </Field>
                <Field label={t('AddToCart')} error={errOf('is_add_cart')}>
                    {yesNo('is_add_cart')}
                </Field>
                <Field label={t('Review')} error={errOf('is_review')}>
                    {yesNo('is_review')}
                </Field>

                <Field label={t('OutOfStockStatus')} required error={errOf('stock_status_id')}>
                    {selectFrom('stock_status_id', resource.stock_status, 'name')}
                </Field>

                <Field label={t('RequiresShipping')} required error={errOf('shipping')}>
                    <Radio.Group
                        value={product.shipping}
                        onChange={(e) => setField('shipping', e.target.value)}
                    >
                        <Radio value={1}>Yes</Radio>
                        <Radio value={0}>No</Radio>
                    </Radio.Group>
                </Field>

                <Field label={t('DateAvailable')} error={errOf('date_available')}>
                    <DatePicker
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        value={product.date_available ? dayjs(product.date_available) : null}
                        onChange={(d) =>
                            setField('date_available', d ? d.format('YYYY-MM-DD') : '')
                        }
                        placeholder={t('SelectDate')}
                    />
                </Field>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Dimensions(LxWxH)')}</label>
                    </div>
                    <div className="col-xl-3">
                        {text('length')}
                        {errOf('length') && <span className="has-error">{errOf('length')}</span>}
                    </div>
                    <div className="col-xl-3">
                        {text('width')}
                        {errOf('width') && <span className="has-error">{errOf('width')}</span>}
                    </div>
                    <div className="col-xl-3">
                        {text('height')}
                        {errOf('height') && <span className="has-error">{errOf('height')}</span>}
                    </div>
                </div>

                <Field label={t('LengthClass')} required error={errOf('length_class_id')}>
                    {selectFrom('length_class_id', resource.length_class, 'title')}
                </Field>
                <Field label={t('Weight')} required error={errOf('weight')}>{text('weight')}</Field>
                <Field label={t('WeightClass')} required error={errOf('weight_class_id')}>
                    {selectFrom('weight_class_id', resource.weight_class, 'title')}
                </Field>
                <Field label={t('SortOrder')} error={errOf('sort_order')}>{text('sort_order')}</Field>
            </div>
        </div>
    );
}
