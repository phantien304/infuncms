/**
 * pages/coupon/form.jsx — THÊM/SỬA mã giảm giá.
 * -----------------------------------------------------------
 * Convert từ mt219 `components/coupon/form.vue`, bám schema infun sau
 * refactor 2026_06_11 (Shopee-style):
 *
 *   mt219                    →  infun
 *   type 'P'/'F'             →  type 1/2/3 (percent/fixed/FREESHIP)
 *   checkbox shipping        →  gộp vào type=3; cột `shipping` để legacy,
 *                               màn này TỰ suy ra (type=3 ⇒ shipping=1) chứ
 *                               không cho nhập tay — hai ô cùng nói một
 *                               chuyện là nguồn gốc dữ liệu lệch.
 *   (không có)               →  description, discount_max, min_subtotal,
 *                               apply_scope, user_group_id, is_active,
 *                               sort_order, badge
 *
 * `used_count` chỉ hiển thị: backend không nhận field này (quota do
 * CouponRepository::incrementUsedCount ghi theo đơn thật).
 *
 *   GET  /coupon/{id}                    (chi tiết, kèm 200 dòng lịch sử)
 *   POST /coupon                         (tạo → 201)
 *   PUT  /coupon/{id}                    (sửa)
 *   GET  /resource?list_for_setting=1    (user_group + category)
 *   GET  /product?keyword=               (gợi ý sản phẩm)
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
    COUPON_APPLY_SCOPE,
    COUPON_APPLY_SCOPE_OPTIONS,
    COUPON_HISTORY_STATUS_LABEL,
    COUPON_TYPE,
    COUPON_TYPE_OPTIONS,
    formatMoney,
} from '@/core/utils/marketing';

const { TextArea } = Input;

const EMPTY = {
    id: 0,
    name: '',
    description: '',
    code: '',
    type: COUPON_TYPE.PERCENT,
    discount: 0,
    discount_max: null,
    min_subtotal: null,
    apply_scope: COUPON_APPLY_SCOPE.ALL,
    user_group_id: null,
    logged: 0,
    date_start: '',
    date_end: '',
    uses_total: null,
    uses_customer: null,
    used_count: 0,
    is_active: true,
    sort_order: 0,
    badge: '',
    coupon_products: [],
    coupon_categories: [],
    coupon_histories: [],
};

export default function CouponForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({ ...EMPTY, id: parseInt(params.id, 10) || 0 });
    const [resource, setResource] = useState({ user_group: [], category: [] });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    // --- gợi ý sản phẩm (tìm qua API) / danh mục (lọc cục bộ) ---
    const [kwProduct, setKwProduct] = useState('');
    const [openProduct, setOpenProduct] = useState(false);
    const [sugProduct, setSugProduct] = useState([]);
    const [kwCategory, setKwCategory] = useState('');
    const [openCategory, setOpenCategory] = useState(false);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        const resourceReq = api
            .get('/resource', { params: { list_for_setting: 1 } })
            .then((res) => setResource(res.data?.data || {}))
            .catch(() => {});

        const detailReq =
            objForm.id > 0
                ? api.get(`/coupon/${objForm.id}`).then((res) => {
                      const data = res.data?.data || {};
                      setObjForm({ ...EMPTY, ...data });
                  })
                : Promise.resolve();

        Promise.all([resourceReq, detailReq])
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => {
                setLoader(true);
                inst.close();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id]);

    useEffect(() => {
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const searchProduct = (kw) => {
        setKwProduct(kw);
        api
            .get('/product', { params: { keyword: kw, per_page: 10 } })
            .then((res) => {
                setSugProduct(res.data?.data || []);
                setOpenProduct(true);
            })
            .catch(() => {});
    };

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const isFreeship = Number(objForm.type) === COUPON_TYPE.FREESHIP;
                const payload = {
                    name: objForm.name,
                    description: objForm.description || null,
                    code: objForm.code,
                    type: Number(objForm.type),
                    discount: Number(objForm.discount || 0),
                    discount_max: objForm.discount_max === '' ? null : objForm.discount_max,
                    min_subtotal: objForm.min_subtotal === '' ? null : objForm.min_subtotal,
                    apply_scope: Number(objForm.apply_scope),
                    user_group_id: objForm.user_group_id || null,
                    logged: !!objForm.logged,
                    // Cột legacy: freeship nay là type=3, `shipping` chỉ đi
                    // theo cho code cũ đọc — KHÔNG có ô nhập riêng.
                    shipping: isFreeship,
                    date_start: objForm.date_start || null,
                    date_end: objForm.date_end || null,
                    uses_total: objForm.uses_total === '' ? null : objForm.uses_total,
                    uses_customer: objForm.uses_customer === '' ? null : objForm.uses_customer,
                    is_active: !!objForm.is_active,
                    sort_order: Number(objForm.sort_order || 0),
                    badge: objForm.badge || null,
                    coupon_products: (objForm.coupon_products || []).map((p) => ({ id: p.id })),
                    coupon_categories: (objForm.coupon_categories || []).map((c) => ({ id: c.id })),
                };

                const req =
                    objForm.id > 0
                        ? api.put(`/coupon/${objForm.id}`, payload)
                        : api.post('/coupon', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/coupon/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) getDetail();
                            else navigate(`/coupon/${newId}`);
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
            <Wrapper title={t('AddCoupon')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const isPercent = Number(objForm.type) === COUPON_TYPE.PERCENT;
    const scope = Number(objForm.apply_scope);

    return (
        <Wrapper title={objForm.id > 0 ? t('EditCoupon') : t('AddCoupon')} sapo="">
            <div className="coupon-form">
                <h3 className="mt-0 header-title">{t('Coupon')}</h3>

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
                            placeholder={t('Name')}
                            onChange={(e) => setField('name', e.target.value)}
                        />
                        {errOf('name') && <span className="has-error">{errOf('name')}</span>}
                    </div>
                </div>

                {row(
                    'Code',
                    <Input
                        value={objForm.code}
                        placeholder={t('Code')}
                        onChange={(e) => setField('code', e.target.value.trim())}
                    />,
                    true,
                    'code'
                )}

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
                    'CouponType',
                    <Select
                        style={{ width: '100%' }}
                        value={Number(objForm.type)}
                        onChange={(v) => setField('type', v)}
                        options={COUPON_TYPE_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                        }))}
                    />,
                    true,
                    'type'
                )}

                {row(
                    'Discount',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={isPercent ? 100 : undefined}
                        value={objForm.discount}
                        onChange={(v) => setField('discount', v ?? 0)}
                        addonAfter={isPercent ? '%' : 'đ'}
                    />,
                    true,
                    'discount'
                )}

                {/* Trần giảm chỉ có nghĩa với mã %: "giảm 10% tối đa 50k" */}
                {isPercent &&
                    row(
                        'DiscountMax',
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            value={objForm.discount_max}
                            onChange={(v) => setField('discount_max', v)}
                            addonAfter="đ"
                        />,
                        false,
                        'discount_max'
                    )}

                {row(
                    'MinSubtotal',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.min_subtotal}
                        onChange={(v) => setField('min_subtotal', v)}
                        addonAfter="đ"
                    />,
                    false,
                    'min_subtotal'
                )}

                {row(
                    'ApplyScope',
                    <Select
                        style={{ width: '100%' }}
                        value={scope}
                        onChange={(v) => setField('apply_scope', v)}
                        options={COUPON_APPLY_SCOPE_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                        }))}
                    />,
                    true,
                    'apply_scope'
                )}

                {scope === COUPON_APPLY_SCOPE.PRODUCTS &&
                    row(
                        'CouponProducts',
                        <>
                            <Input
                                value={kwProduct}
                                placeholder={t('Keyword')}
                                onChange={(e) => searchProduct(e.target.value)}
                                onFocus={() => setOpenProduct(true)}
                                onBlur={() => setTimeout(() => setOpenProduct(false), 150)}
                            />
                            <MultipleSelect
                                suggestions={sugProduct}
                                selection={objForm.coupon_products || []}
                                keyword={kwProduct}
                                opened={openProduct}
                                onChange={(sel, op) => {
                                    setField('coupon_products', sel);
                                    setOpenProduct(op);
                                }}
                            />
                        </>,
                        true,
                        'coupon_products'
                    )}

                {scope === COUPON_APPLY_SCOPE.CATEGORIES &&
                    row(
                        'CouponCategories',
                        <>
                            <Input
                                value={kwCategory}
                                placeholder={t('Keyword')}
                                onChange={(e) => {
                                    setKwCategory(e.target.value);
                                    setOpenCategory(true);
                                }}
                                onFocus={() => setOpenCategory(true)}
                                onBlur={() => setTimeout(() => setOpenCategory(false), 150)}
                            />
                            <MultipleSelect
                                suggestions={resource.category || []}
                                selection={objForm.coupon_categories || []}
                                keyword={kwCategory}
                                opened={openCategory}
                                onChange={(sel, op) => {
                                    setField('coupon_categories', sel);
                                    setOpenCategory(op);
                                }}
                            />
                        </>,
                        true,
                        'coupon_categories'
                    )}

                {row(
                    'UserGroup',
                    <Select
                        style={{ width: '100%' }}
                        allowClear
                        placeholder={t('Select')}
                        value={objForm.user_group_id || undefined}
                        onChange={(v) => setField('user_group_id', v ?? null)}
                        options={(resource.user_group || []).map((g) => ({
                            value: g.id,
                            label: g.name,
                        }))}
                    />,
                    false,
                    'user_group_id'
                )}

                {row(
                    'LoggedOnly',
                    <Switch
                        checked={!!objForm.logged}
                        onChange={(checked) => setField('logged', checked ? 1 : 0)}
                    />
                )}

                {row(
                    'DateStart',
                    <DatePicker
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        value={objForm.date_start ? dayjs(objForm.date_start) : null}
                        onChange={(d) => setField('date_start', d ? d.format('YYYY-MM-DD') : '')}
                        placeholder={t('Select')}
                    />,
                    false,
                    'date_start'
                )}

                {row(
                    'DateEnd',
                    <DatePicker
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        value={objForm.date_end ? dayjs(objForm.date_end) : null}
                        onChange={(d) => setField('date_end', d ? d.format('YYYY-MM-DD') : '')}
                        placeholder={t('Select')}
                    />,
                    false,
                    'date_end'
                )}

                {row(
                    'UsesTotal',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.uses_total}
                        onChange={(v) => setField('uses_total', v)}
                        placeholder={t('Select')}
                    />,
                    false,
                    'uses_total'
                )}

                {row(
                    'UsesCustomer',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.uses_customer}
                        onChange={(v) => setField('uses_customer', v)}
                    />,
                    false,
                    'uses_customer'
                )}

                {objForm.id > 0 &&
                    row('UsedCount', <Input value={objForm.used_count} readOnly />)}

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

                {objForm.id > 0 && (
                    <div className="mt-4 pt-3 border-top">
                        <h4 className="header-title">{t('CouponHistory')}</h4>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th className="width-100">{t('Id')}</th>
                                    <th>{t('OrderId')}</th>
                                    <th>{t('Customer')}</th>
                                    <th>{t('Amount')}</th>
                                    <th>{t('Status')}</th>
                                    <th>{t('CreatedAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(objForm.coupon_histories || []).map((h) => (
                                    <tr key={h.id}>
                                        <td>{h.id}</td>
                                        <td>{h.order_id}</td>
                                        <td>{h.user_name || h.user_email || '-'}</td>
                                        <td>{formatMoney(h.amount)}</td>
                                        <td>{t(COUPON_HISTORY_STATUS_LABEL[h.status] || '')}</td>
                                        <td>{h.created_at}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/coupon/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
