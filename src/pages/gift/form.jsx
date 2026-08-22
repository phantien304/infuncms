/**
 * pages/gift/form.jsx — THÊM/SỬA chương trình quà tặng.
 * -----------------------------------------------------------
 * MÀN MỚI — mt219 không có. Ba khối dữ liệu, ràng buộc chéo đúng theo
 * semantic bảng `gift` (backend GiftRequest::withValidator cũng chặn y hệt,
 * đây chỉ là UX cho nhanh):
 *
 *   trigger_type = 1 (đơn từ X)        → hiện ô `min_subtotal`
 *   trigger_type = 2 (mua SP chỉ định) → hiện danh sách SP kích hoạt
 *   pick_type    = 2 (chọn tối đa N)   → hiện ô `pick_limit`
 *
 * Món quà (`gift_items`) luôn phải có ≥ 1 dòng — chương trình không có quà
 * thì chẳng tặng gì. SP có biến thể thì phải chọn đúng biến thể (variant),
 * nên khi thêm SP có `has_variants` màn này nạp thêm GET /product/{id} để
 * lấy danh sách biến thể.
 *
 *   GET  /gift/{id}
 *   POST /gift                 (tạo → 201)
 *   PUT  /gift/{id}            (sửa)
 *   GET  /product?keyword=     (gợi ý sản phẩm)
 *   GET  /product/{id}         (lấy product_variants khi SP có biến thể)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, InputNumber, Select, Switch, Button, DatePicker } from 'antd';
import dayjs from 'dayjs';

import Wrapper from '@/components/app/Wrapper';
import MultipleSelect from '@/components/ui/MultipleSelect';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    GIFT_PICK_TYPE,
    GIFT_PICK_TYPE_OPTIONS,
    GIFT_TRIGGER_TYPE,
    GIFT_TRIGGER_TYPE_OPTIONS,
} from '@/core/utils/marketing';

const { TextArea } = Input;
const DATETIME = 'YYYY-MM-DD HH:mm:ss';

const EMPTY = {
    id: 0,
    name: '',
    description: '',
    trigger_type: GIFT_TRIGGER_TYPE.MIN_SUBTOTAL,
    min_subtotal: null,
    pick_type: GIFT_PICK_TYPE.AUTO,
    pick_limit: null,
    uses_total: null,
    used_count: 0,
    date_start: '',
    date_end: '',
    is_active: true,
    sort_order: 0,
    badge: '',
    gift_items: [],
    gift_trigger_products: [],
};

export default function GiftForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({ ...EMPTY, id: parseInt(params.id, 10) || 0 });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    // Biến thể theo product_id, nạp lười khi cần (SP có has_variants).
    const [variantsByProduct, setVariantsByProduct] = useState({});

    // Ô tìm SP cho danh sách quà và cho danh sách SP kích hoạt — 2 ô riêng.
    const [kwItem, setKwItem] = useState('');
    const [sugItem, setSugItem] = useState([]);
    const [kwTrigger, setKwTrigger] = useState('');
    const [openTrigger, setOpenTrigger] = useState(false);
    const [sugTrigger, setSugTrigger] = useState([]);

    const loadVariants = useCallback((productId) => {
        api
            .get(`/product/${productId}`)
            .then((res) => {
                const variants = res.data?.data?.product_variants || [];
                setVariantsByProduct((m) => ({ ...m, [productId]: variants }));
            })
            .catch(() => {});
    }, []);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/gift/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({ ...EMPTY, ...data });
                    // Dòng nào đã gắn biến thể thì nạp luôn để Select có nhãn.
                    (data.gift_items || [])
                        .filter((it) => it.product_variant_id)
                        .forEach((it) => loadVariants(it.product_id));
                    setLoader(true);
                })
                .catch((err) => {
                    setLoader(true);
                    showError(t(err?.response?.data?.message || 'ErrorAction'));
                })
                .finally(() => inst.close());
        } else {
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id, loadVariants]);

    useEffect(() => {
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const searchProduct = (kw, forTrigger) => {
        const setKw = forTrigger ? setKwTrigger : setKwItem;
        const setSug = forTrigger ? setSugTrigger : setSugItem;
        setKw(kw);
        api
            .get('/product', { params: { keyword: kw, per_page: 10 } })
            .then((res) => {
                setSug(res.data?.data || []);
                if (forTrigger) setOpenTrigger(true);
            })
            .catch(() => {});
    };

    const addItem = (product) => {
        const exists = (objForm.gift_items || []).some(
            (it) => Number(it.product_id) === Number(product.id) && !it.product_variant_id
        );
        if (exists) return;
        if (product.has_variants) loadVariants(product.id);

        setObjForm((f) => ({
            ...f,
            gift_items: [
                ...(f.gift_items || []),
                {
                    id: null,
                    product_id: product.id,
                    product_name: product.name,
                    product_variant_id: null,
                    quantity: 1,
                    sort_order: (f.gift_items || []).length,
                },
            ],
        }));
        setKwItem('');
        setSugItem([]);
    };

    const setItem = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            gift_items: f.gift_items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
        }));

    const removeItem = (index) =>
        setObjForm((f) => ({ ...f, gift_items: f.gift_items.filter((_, i) => i !== index) }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const trigger = Number(objForm.trigger_type);
                const pick = Number(objForm.pick_type);

                const payload = {
                    name: objForm.name,
                    description: objForm.description || null,
                    trigger_type: trigger,
                    min_subtotal:
                        trigger === GIFT_TRIGGER_TYPE.MIN_SUBTOTAL ? objForm.min_subtotal : null,
                    pick_type: pick,
                    pick_limit: pick === GIFT_PICK_TYPE.UP_TO_N ? objForm.pick_limit : null,
                    uses_total: objForm.uses_total === '' ? null : objForm.uses_total,
                    date_start: objForm.date_start || null,
                    date_end: objForm.date_end || null,
                    is_active: !!objForm.is_active,
                    sort_order: Number(objForm.sort_order || 0),
                    badge: objForm.badge || null,
                    gift_items: (objForm.gift_items || []).map((it, i) => ({
                        product_id: it.product_id,
                        product_variant_id: it.product_variant_id || null,
                        quantity: Number(it.quantity || 1),
                        sort_order: Number(it.sort_order ?? i),
                    })),
                    gift_trigger_products:
                        trigger === GIFT_TRIGGER_TYPE.BUY_SPECIFIC_PRODUCT
                            ? (objForm.gift_trigger_products || []).map((p) => ({ id: p.id }))
                            : [],
                };

                const req =
                    objForm.id > 0
                        ? api.put(`/gift/${objForm.id}`, payload)
                        : api.post('/gift', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/gift/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) getDetail();
                            else navigate(`/gift/${newId}`);
                        });
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) setErrors(err.response.data?.errors || {});
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const errOf = (key) => errors?.[key]?.[0];

    const row = (label, node, required = false, errKey = null) => (
        <div className="row mt-3 pt-3 border-top">
            <div className="col-xl-2 text-right">
                <label className="tit">
                    {t(label)}
                    {required && <span className="text-danger">&nbsp;*</span>}
                </label>
            </div>
            <div className="col-xl-10">
                {node}
                {errKey && errOf(errKey) && <span className="has-error">{errOf(errKey)}</span>}
            </div>
        </div>
    );

    if (!loader) {
        return (
            <Wrapper title={t('AddGift')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const trigger = Number(objForm.trigger_type);
    const pick = Number(objForm.pick_type);

    return (
        <Wrapper title={objForm.id > 0 ? t('EditGift') : t('AddGift')} sapo="">
            <div className="gift-form">
                <h3 className="mt-0 header-title">{t('Gift')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Name')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.name}
                            onChange={(e) => setField('name', e.target.value)}
                        />
                        {errOf('name') && <span className="has-error">{errOf('name')}</span>}
                    </div>
                </div>

                {row(
                    'Description',
                    <TextArea
                        rows={3}
                        value={objForm.description || ''}
                        onChange={(e) => setField('description', e.target.value)}
                    />,
                    false,
                    'description'
                )}

                {row(
                    'TriggerType',
                    <Select
                        style={{ width: '100%' }}
                        value={trigger}
                        onChange={(v) => setField('trigger_type', v)}
                        options={GIFT_TRIGGER_TYPE_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                        }))}
                    />,
                    true,
                    'trigger_type'
                )}

                {trigger === GIFT_TRIGGER_TYPE.MIN_SUBTOTAL &&
                    row(
                        'MinSubtotal',
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            value={objForm.min_subtotal}
                            onChange={(v) => setField('min_subtotal', v)}
                            addonAfter="đ"
                        />,
                        true,
                        'min_subtotal'
                    )}

                {trigger === GIFT_TRIGGER_TYPE.BUY_SPECIFIC_PRODUCT &&
                    row(
                        'GiftTriggerProducts',
                        <>
                            <Input
                                value={kwTrigger}
                                placeholder={t('Keyword')}
                                onChange={(e) => searchProduct(e.target.value, true)}
                                onFocus={() => setOpenTrigger(true)}
                                onBlur={() => setTimeout(() => setOpenTrigger(false), 150)}
                            />
                            <MultipleSelect
                                suggestions={sugTrigger}
                                selection={objForm.gift_trigger_products || []}
                                keyword={kwTrigger}
                                opened={openTrigger}
                                onChange={(sel, op) => {
                                    setField('gift_trigger_products', sel);
                                    setOpenTrigger(op);
                                }}
                            />
                        </>,
                        true,
                        'gift_trigger_products'
                    )}

                {row(
                    'PickType',
                    <Select
                        style={{ width: '100%' }}
                        value={pick}
                        onChange={(v) => setField('pick_type', v)}
                        options={GIFT_PICK_TYPE_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                        }))}
                    />,
                    true,
                    'pick_type'
                )}

                {pick === GIFT_PICK_TYPE.UP_TO_N &&
                    row(
                        'PickLimit',
                        <InputNumber
                            style={{ width: '100%' }}
                            min={1}
                            value={objForm.pick_limit}
                            onChange={(v) => setField('pick_limit', v)}
                        />,
                        true,
                        'pick_limit'
                    )}

                {/* ---------- Danh sách quà ---------- */}
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('GiftItems')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            value={null}
                            placeholder={t('Keyword')}
                            filterOption={false}
                            onSearch={(kw) => searchProduct(kw, false)}
                            onChange={(_, option) => option?.product && addItem(option.product)}
                            notFoundContent={null}
                            options={sugItem.map((p) => ({
                                value: p.id,
                                label: p.name,
                                product: p,
                            }))}
                            searchValue={kwItem}
                        />
                        {errOf('gift_items') && (
                            <span className="has-error">{errOf('gift_items')}</span>
                        )}

                        <table className="table table-bordered mt-2">
                            <thead>
                                <tr>
                                    <th>{t('Product')}</th>
                                    <th className="width-150">{t('ProductVariant')}</th>
                                    <th className="width-100">{t('Quantity')}</th>
                                    <th className="width-100">{t('SortOrder')}</th>
                                    <th className="width-100 text-center">{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(objForm.gift_items || []).map((it, index) => (
                                    <tr key={`${it.product_id}-${it.product_variant_id || 0}-${index}`}>
                                        <td>
                                            {it.product_name || `#${it.product_id}`}
                                            {errOf(`gift_items.${index}.product_id`) && (
                                                <span className="has-error">
                                                    {errOf(`gift_items.${index}.product_id`)}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <Select
                                                style={{ width: '100%' }}
                                                allowClear
                                                placeholder={t('Select')}
                                                value={it.product_variant_id || undefined}
                                                onChange={(v) =>
                                                    setItem(index, 'product_variant_id', v ?? null)
                                                }
                                                onFocus={() => {
                                                    if (!variantsByProduct[it.product_id]) {
                                                        loadVariants(it.product_id);
                                                    }
                                                }}
                                                options={(variantsByProduct[it.product_id] || []).map(
                                                    (v) => ({
                                                        value: v.id,
                                                        label: v.sku || `#${v.id}`,
                                                    })
                                                )}
                                            />
                                        </td>
                                        <td>
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                min={1}
                                                value={it.quantity}
                                                onChange={(v) => setItem(index, 'quantity', v ?? 1)}
                                            />
                                        </td>
                                        <td>
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                min={0}
                                                value={it.sort_order}
                                                onChange={(v) => setItem(index, 'sort_order', v ?? 0)}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <button
                                                className="btn btn-danger"
                                                title={t('Remove')}
                                                onClick={() => removeItem(index)}
                                            >
                                                <i className="fas fa-trash-alt" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {row(
                    'UsesTotal',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.uses_total}
                        onChange={(v) => setField('uses_total', v)}
                    />,
                    false,
                    'uses_total'
                )}

                {objForm.id > 0 && row('UsedCount', <Input value={objForm.used_count} readOnly />)}

                {row(
                    'DateStart',
                    <DatePicker
                        style={{ width: '100%' }}
                        showTime
                        format={DATETIME}
                        value={objForm.date_start ? dayjs(objForm.date_start) : null}
                        onChange={(d) => setField('date_start', d ? d.format(DATETIME) : '')}
                        placeholder={t('Select')}
                    />,
                    false,
                    'date_start'
                )}

                {row(
                    'DateEnd',
                    <DatePicker
                        style={{ width: '100%' }}
                        showTime
                        format={DATETIME}
                        value={objForm.date_end ? dayjs(objForm.date_end) : null}
                        onChange={(d) => setField('date_end', d ? d.format(DATETIME) : '')}
                        placeholder={t('Select')}
                    />,
                    false,
                    'date_end'
                )}

                {row(
                    'Badge',
                    <Input
                        value={objForm.badge || ''}
                        maxLength={32}
                        onChange={(e) => setField('badge', e.target.value)}
                    />,
                    false,
                    'badge'
                )}

                {row(
                    'SortOrder',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.sort_order}
                        onChange={(v) => setField('sort_order', v ?? 0)}
                    />,
                    false,
                    'sort_order'
                )}

                {row(
                    'Active',
                    <Switch
                        checked={!!objForm.is_active}
                        onChange={(checked) => setField('is_active', checked)}
                    />
                )}

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/gift/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
