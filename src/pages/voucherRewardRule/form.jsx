/**
 * pages/voucherRewardRule/form.jsx — THÊM/SỬA chương trình tặng voucher.
 * -----------------------------------------------------------
 * MÀN MỚI — mt219 không có.
 *
 * Hai con số CHỈ ĐỌC:
 *   granted_count  — bộ đếm quota, repository tăng bằng conditional UPDATE
 *                    (chống 2 đơn hoàn tất cùng lúc phát vượt ngân sách).
 *   quota_remaining— dẫn xuất = quota_total - granted_count.
 * Sửa tay hai ô này là phá chính cơ chế chống đua, nên backend không nhận.
 *
 * `status` (1 đang chạy / 2 tạm dừng) TRUMPS khung thời gian: admin bấm tạm
 * dừng là dừng ngay, bất kể date_end còn hạn.
 *
 *   GET  /voucher-reward-rule/{id}   (chi tiết, kèm 200 biên bản phát gần nhất)
 *   POST /voucher-reward-rule        (tạo → 201)
 *   PUT  /voucher-reward-rule/{id}   (sửa)
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
    VOUCHER_REWARD_RULE_STATUS,
    VOUCHER_REWARD_RULE_STATUS_OPTIONS,
} from '@/core/utils/marketing';

const { TextArea } = Input;
const DATETIME = 'YYYY-MM-DD HH:mm:ss';

const EMPTY = {
    id: 0,
    name: '',
    description: '',
    min_order_total: 0,
    reward_amount: 0,
    reward_expire_days: 30,
    max_per_user: null,
    quota_total: null,
    granted_count: 0,
    quota_remaining: null,
    date_start: '',
    date_end: '',
    status: VOUCHER_REWARD_RULE_STATUS.ACTIVE,
    sort_order: 0,
    grants: [],
};

export default function VoucherRewardRuleForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({ ...EMPTY, id: parseInt(params.id, 10) || 0 });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/voucher-reward-rule/${objForm.id}`)
                .then((res) => {
                    setObjForm({ ...EMPTY, ...(res.data?.data || {}) });
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
                    name: objForm.name,
                    description: objForm.description || null,
                    min_order_total: Number(objForm.min_order_total || 0),
                    reward_amount: Number(objForm.reward_amount || 0),
                    reward_expire_days: Number(objForm.reward_expire_days || 1),
                    max_per_user: objForm.max_per_user === '' ? null : objForm.max_per_user,
                    quota_total: objForm.quota_total === '' ? null : objForm.quota_total,
                    date_start: objForm.date_start || null,
                    date_end: objForm.date_end || null,
                    status: Number(objForm.status),
                    sort_order: Number(objForm.sort_order || 0),
                };

                const req =
                    objForm.id > 0
                        ? api.put(`/voucher-reward-rule/${objForm.id}`, payload)
                        : api.post('/voucher-reward-rule', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/voucher-reward-rule/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) getDetail();
                            else navigate(`/voucher-reward-rule/${newId}`);
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
            <Wrapper title={t('AddVoucherRewardRule')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper
            title={objForm.id > 0 ? t('EditVoucherRewardRule') : t('AddVoucherRewardRule')}
            sapo=""
        >
            <div className="voucher-reward-rule-form">
                <h3 className="mt-0 header-title">{t('VoucherRewardRule')}</h3>

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
                    'MinOrderTotal',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        value={objForm.min_order_total}
                        onChange={(v) => setField('min_order_total', v ?? 0)}
                        addonAfter="đ"
                    />,
                    true,
                    'min_order_total'
                )}

                {row(
                    'RewardAmount',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={objForm.reward_amount}
                        onChange={(v) => setField('reward_amount', v ?? 0)}
                        addonAfter="đ"
                    />,
                    true,
                    'reward_amount'
                )}

                {row(
                    'RewardExpireDays',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={objForm.reward_expire_days}
                        onChange={(v) => setField('reward_expire_days', v ?? 1)}
                    />,
                    true,
                    'reward_expire_days'
                )}

                {row(
                    'MaxPerUser',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={objForm.max_per_user}
                        onChange={(v) => setField('max_per_user', v)}
                    />,
                    false,
                    'max_per_user'
                )}

                {row(
                    'QuotaTotal',
                    <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={objForm.quota_total}
                        onChange={(v) => setField('quota_total', v)}
                    />,
                    false,
                    'quota_total'
                )}

                {objForm.id > 0 && (
                    <>
                        {row('GrantedCount', <Input value={objForm.granted_count} readOnly />)}
                        {row(
                            'QuotaRemaining',
                            <Input
                                value={
                                    objForm.quota_remaining === null
                                        ? '∞'
                                        : objForm.quota_remaining
                                }
                                readOnly
                            />
                        )}
                    </>
                )}

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
                    'Status',
                    <Select
                        style={{ width: '100%' }}
                        value={Number(objForm.status)}
                        onChange={(v) => setField('status', v)}
                        options={VOUCHER_REWARD_RULE_STATUS_OPTIONS.map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                        }))}
                    />,
                    true,
                    'status'
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

                {objForm.id > 0 && (
                    <div className="mt-4 pt-3 border-top">
                        <h4 className="header-title">{t('Grants')}</h4>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th className="width-100">{t('Id')}</th>
                                    <th>{t('OrderId')}</th>
                                    <th>{t('GrantEmail')}</th>
                                    <th>{t('VoucherCode')}</th>
                                    <th>{t('CreatedAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(objForm.grants || []).map((g) => (
                                    <tr key={g.id}>
                                        <td>{g.id}</td>
                                        <td>{g.order_id}</td>
                                        <td>{g.email}</td>
                                        <td>
                                            <Link to={`/voucher/${g.voucher_id}`}>
                                                {g.voucher_code || `#${g.voucher_id}`}
                                            </Link>
                                        </td>
                                        <td>{g.created_at}</td>
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
                    <Link to="/voucher-reward-rule/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
