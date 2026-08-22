/**
 * pages/voucher/form.jsx — THÊM/SỬA thẻ quà tặng.
 * -----------------------------------------------------------
 * Convert từ mt219 `components/voucher/form.vue`.
 *
 * Bổ sung so với bản cũ (migration 2026_06_13_000000):
 *   status, date_expire, redeemed_balance / available_balance, sent_at.
 * Ba field cuối CHỈ ĐỌC: số dư do VoucherRepository ghi theo giao dịch thật,
 * `sent_at` do job gửi mail đóng dấu — sửa tay ở đây là làm lệch sổ.
 *
 * `voucher_theme_id` lấy từ GET /voucher-theme (per_page lớn: bảng mẫu thiệp
 * chỉ vài chục dòng, không đáng làm autocomplete).
 *
 *   GET  /voucher/{id}     (chi tiết, kèm 200 dòng lịch sử)
 *   POST /voucher          (tạo → 201)
 *   PUT  /voucher/{id}     (sửa)
 *   GET  /voucher-theme    (danh sách mẫu thiệp)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, InputNumber, Select, Button, DatePicker } from 'antd';
import dayjs from 'dayjs';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    VOUCHER_HISTORY_STATUS_LABEL,
    VOUCHER_STATUS,
    VOUCHER_STATUS_OPTIONS,
    formatMoney,
} from '@/core/utils/marketing';

const { TextArea } = Input;

const EMPTY = {
    id: 0,
    order_id: null,
    code: '',
    from_name: '',
    from_email: '',
    to_name: '',
    to_email: '',
    voucher_theme_id: null,
    voucher_theme_name: '',
    message: '',
    amount: 0,
    redeemed_balance: 0,
    available_balance: 0,
    status: VOUCHER_STATUS.ACTIVE,
    date_expire: '',
    sent_at: '',
    voucher_histories: [],
};

export default function VoucherForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({ ...EMPTY, id: parseInt(params.id, 10) || 0 });
    const [themes, setThemes] = useState([]);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        const themeReq = api
            .get('/voucher-theme', { params: { per_page: 200, deleted_at: 1 } })
            .then((res) => setThemes(res.data?.data || []))
            .catch(() => {});

        const detailReq =
            objForm.id > 0
                ? api.get(`/voucher/${objForm.id}`).then((res) => {
                      setObjForm({ ...EMPTY, ...(res.data?.data || {}) });
                  })
                : Promise.resolve();

        Promise.all([themeReq, detailReq])
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

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    code: objForm.code,
                    order_id: objForm.order_id || null,
                    from_name: objForm.from_name,
                    from_email: objForm.from_email,
                    to_name: objForm.to_name,
                    to_email: objForm.to_email,
                    voucher_theme_id: objForm.voucher_theme_id,
                    message: objForm.message || null,
                    amount: Number(objForm.amount || 0),
                    status: Number(objForm.status),
                    date_expire: objForm.date_expire || null,
                };

                const req =
                    objForm.id > 0
                        ? api.put(`/voucher/${objForm.id}`, payload)
                        : api.post('/voucher', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/voucher/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) getDetail();
                            else navigate(`/voucher/${newId}`);
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
            <Wrapper title={t('AddVoucher')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditVoucher') : t('AddVoucher')} sapo="">
            <div className="voucher-form">
                <h3 className="mt-0 header-title">{t('GiftVoucher')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Code')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.code}
                            maxLength={20}
                            placeholder={t('Code')}
                            onChange={(e) => setField('code', e.target.value.trim())}
                        />
                        {errOf('code') && <span className="has-error">{errOf('code')}</span>}
                    </div>
                </div>

                {row(
                    'FromName',
                    <Input
                        value={objForm.from_name}
                        onChange={(e) => setField('from_name', e.target.value)}
                    />,
                    true,
                    'from_name'
                )}
                {row(
                    'FromEmail',
                    <Input
                        value={objForm.from_email}
                        onChange={(e) => setField('from_email', e.target.value)}
                    />,
                    true,
                    'from_email'
                )}
                {row(
                    'ToName',
                    <Input
                        value={objForm.to_name}
                        onChange={(e) => setField('to_name', e.target.value)}
                    />,
                    true,
                    'to_name'
                )}
                {row(
                    'ToEmail',
                    <Input
                        value={objForm.to_email}
                        onChange={(e) => setField('to_email', e.target.value)}
                    />,
                    true,
                    'to_email'
                )}

                {row(
                    'VoucherTheme',
                    <Select
                        style={{ width: '100%' }}
                        showSearch
                        optionFilterProp="label"
                        placeholder={t('Select')}
                        value={objForm.voucher_theme_id || undefined}
                        onChange={(v) => setField('voucher_theme_id', v)}
                        options={themes.map((th) => ({
                            value: th.id,
                            label: th.name || `#${th.id}`,
                        }))}
                    />,
                    true,
                    'voucher_theme_id'
                )}

                {row(
                    'VoucherMessage',
                    <TextArea
                        rows={3}
                        value={objForm.message || ''}
                        onChange={(e) => setField('message', e.target.value)}
                    />,
                    false,
                    'message'
                )}

                {row(
                    'Amount',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.amount}
                        onChange={(v) => setField('amount', v ?? 0)}
                        addonAfter="đ"
                    />,
                    true,
                    'amount'
                )}

                {row(
                    'VoucherStatus',
                    <Select
                        style={{ width: '100%' }}
                        value={Number(objForm.status)}
                        onChange={(v) => setField('status', v)}
                        options={VOUCHER_STATUS_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                        }))}
                    />,
                    true,
                    'status'
                )}

                {row(
                    'DateExpire',
                    <DatePicker
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        value={objForm.date_expire ? dayjs(objForm.date_expire) : null}
                        onChange={(d) => setField('date_expire', d ? d.format('YYYY-MM-DD') : '')}
                        placeholder={t('Select')}
                    />,
                    false,
                    'date_expire'
                )}

                {objForm.id > 0 && (
                    <>
                        {row('OrderId', <Input value={objForm.order_id || ''} readOnly />)}
                        {row(
                            'RedeemedBalance',
                            <Input value={formatMoney(objForm.redeemed_balance)} readOnly />
                        )}
                        {row(
                            'AvailableBalance',
                            <Input value={formatMoney(objForm.available_balance)} readOnly />
                        )}
                        {row('SentAt', <Input value={objForm.sent_at || ''} readOnly />)}

                        <div className="mt-4 pt-3 border-top">
                            <h4 className="header-title">{t('VoucherHistory')}</h4>
                            <table className="table table-bordered">
                                <thead>
                                    <tr>
                                        <th className="width-100">{t('Id')}</th>
                                        <th>{t('OrderId')}</th>
                                        <th>{t('Amount')}</th>
                                        <th>{t('Status')}</th>
                                        <th>{t('CreatedAt')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(objForm.voucher_histories || []).map((h) => (
                                        <tr key={h.id}>
                                            <td>{h.id}</td>
                                            <td>{h.order_id}</td>
                                            <td>{formatMoney(h.amount)}</td>
                                            <td>{t(VOUCHER_HISTORY_STATUS_LABEL[h.status] || '')}</td>
                                            <td>{h.created_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/voucher/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
