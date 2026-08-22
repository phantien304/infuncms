/**
 * pages/voucher/index.jsx — DANH SÁCH thẻ quà tặng (voucher / gift card).
 * -----------------------------------------------------------
 * Convert từ mt219 `components/voucher/index.vue`.
 *
 * Khác bản Vue:
 *   - Cột mới: Trạng thái (active/expired/fully_used/revoked), Số dư còn lại,
 *     HSD, Đã gửi lúc — đều là cột bổ sung của infun (migration
 *     2026_06_13_000000).
 *   - Gửi mail: mt219 nhét vào `save()` qua field ẩn `send_mails`; ở đây là
 *     endpoint riêng `POST /voucher/send`. Nút "gửi lại" truyền `force=true`
 *     vì job gửi mail tự chống trùng bằng `sent_at`.
 *
 *   GET    /voucher              (list: keyword/status/sort/order/deleted_at)
 *   DELETE /voucher/{id}         (xoá mềm 1)
 *   PATCH  /voucher/{id}/restore (khôi phục 1)
 *   POST   /voucher/bulk         ({ action:'delete'|'restore', ids:[] })
 *   POST   /voucher/send         ({ ids:[], force?:bool })
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Select, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import FormSearch from '@/components/form/FormSearch';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    VOUCHER_STATUS_OPTIONS,
    formatMoney,
    labelKeyOf,
} from '@/core/utils/marketing';

export default function VoucherIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
        status: searchParams.get('status') || '',
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
        language_code: searchParams.get('language_code') || 'vi',
        pageIndex: intParam(searchParams, 'pageIndex', 1),
        pageSize: intParam(searchParams, 'pageSize', 50),
    }));
    const [objAction, setObjAction] = useState({ deleted_at: -1, selected: [] });
    const [list, setList] = useState([]);
    const [count, setCount] = useState(0);
    const [loader, setLoader] = useState(false);

    const fetchList = useCallback(() => {
        const inst = loading.open();
        return api
            .get('/voucher', {
                params: {
                    keyword: objSearch.keyword,
                    sort: objSearch.sort,
                    order: objSearch.order,
                    deleted_at: objSearch.deleted_at,
                    status: objSearch.status || undefined,
                    page: objSearch.pageIndex,
                    per_page: objSearch.pageSize,
                },
            })
            .then((res) => {
                setList(res.data?.data || []);
                setCount(res.data?.meta?.total || 0);
                setLoader(true);
            })
            .catch((err) => {
                setLoader(true);
                showError(t(err?.response?.data?.message || 'ErrorAction'));
            })
            .finally(() => inst.close());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objSearch]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const rowAction = (item) => {
        const willDelete = item.deleted_at == null;
        confirm(t(willDelete ? 'DoYouWantToDeleteItem' : 'DoYouWantToRecover'))
            .then(() => {
                const inst = loading.open();
                const req = willDelete
                    ? api.delete(`/voucher/${item.id}`)
                    : api.patch(`/voucher/${item.id}/restore`);
                req
                    .then(() => {
                        success(t('Successful'));
                        fetchList();
                    })
                    .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const bulkAction = (action) => {
        const map = { 0: 'delete', 1: 'restore' };
        const act = map[String(action.deleted_at)];
        if (!act || !action.selected.length) return;
        confirm(t('DoYouWantUpdateSelected'))
            .then(() => {
                const inst = loading.open();
                api
                    .post('/voucher/bulk', { action: act, ids: action.selected })
                    .then(() => {
                        success(t('Successful'));
                        setObjAction({ deleted_at: -1, selected: [] });
                        fetchList();
                    })
                    .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const sendMail = (force) => {
        if (!objAction.selected.length) return;
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                api
                    .post('/voucher/send', { ids: objAction.selected, force })
                    .then(() => {
                        success(t('VoucherSendQueued'));
                        setObjAction({ deleted_at: -1, selected: [] });
                        fetchList();
                    })
                    .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const onSort = (field) =>
        setObjSearch((s) => ({
            ...s,
            sort: field,
            order: s.sort === field && s.order === 'desc' ? 'asc' : 'desc',
        }));
    const onSearch = () => setObjSearch((s) => ({ ...s, pageIndex: 1 }));
    const onPageChange = (p) => setObjSearch((s) => ({ ...s, pageIndex: p }));

    const allSelected = list.length > 0 && objAction.selected.length === list.length;
    const toggleSelectAll = (checked) =>
        setObjAction((a) => ({ ...a, selected: checked ? list.map((i) => i.id) : [] }));
    const toggleSelectOne = (id, checked) =>
        setObjAction((a) => ({
            ...a,
            selected: checked ? [...a.selected, id] : a.selected.filter((x) => x !== id),
        }));

    const sortIcon = (field) => {
        if (objSearch.sort !== field) return null;
        return objSearch.order === 'desc' ? (
            <i className="fa fa-arrow-down" />
        ) : (
            <i className="fa fa-arrow-up" />
        );
    };

    const th = (field, label, className = '') => (
        <th
            className={className}
            style={{ color: '#1e91cf', cursor: 'pointer' }}
            onClick={() => onSort(field)}
        >
            {t(label)} {sortIcon(field)}
        </th>
    );

    return (
        <Wrapper title={t('VoucherList')} sapo="">
            {loader ? (
                <>
                    <FormSearch
                        addPath="/voucher/add"
                        objAction={objAction}
                        setObjAction={setObjAction}
                        objSearch={objSearch}
                        setObjSearch={setObjSearch}
                        onSearch={onSearch}
                        changeStatus={bulkAction}
                        showLanguage={false}
                    />

                    <div className="row mt-2">
                        <div className="col-xl-3">
                            <Select
                                style={{ width: '100%' }}
                                allowClear
                                placeholder={t('VoucherStatus')}
                                value={objSearch.status || undefined}
                                onChange={(v) =>
                                    setObjSearch((s) => ({ ...s, status: v ?? '', pageIndex: 1 }))
                                }
                                options={VOUCHER_STATUS_OPTIONS.map((o) => ({
                                    value: String(o.value),
                                    label: t(o.labelKey),
                                }))}
                            />
                        </div>
                        <div className="col-xl-6">
                            <Button
                                type="primary"
                                disabled={!objAction.selected.length}
                                onClick={() => sendMail(false)}
                            >
                                {t('SendVoucherMail')}
                            </Button>
                            &nbsp;
                            <Button
                                disabled={!objAction.selected.length}
                                onClick={() => sendMail(true)}
                            >
                                {t('SendVoucherMailForce')}
                            </Button>
                        </div>
                    </div>

                    <table className="table table-bordered mt-3">
                        <thead>
                            <tr>
                                <th className="width-100">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                    />
                                </th>
                                {th('id', 'Id', 'width-100')}
                                {th('code', 'Code')}
                                <th>{t('ToName')}</th>
                                <th>{t('ToEmail')}</th>
                                {th('amount', 'Amount')}
                                <th>{t('AvailableBalance')}</th>
                                {th('status', 'VoucherStatus')}
                                {th('date_expire', 'DateExpire')}
                                <th>{t('SentAt')}</th>
                                <th className="text-center width-150">{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((item) => (
                                <tr key={item.id} className="post-item-group">
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={objAction.selected.includes(item.id)}
                                            onChange={(e) => toggleSelectOne(item.id, e.target.checked)}
                                        />
                                    </td>
                                    <td>{item.id}</td>
                                    <td>
                                        <Link to={`/voucher/${item.id}`} style={{ color: '#0f74a8' }}>
                                            {item.code}
                                        </Link>
                                    </td>
                                    <td>{item.to_name}</td>
                                    <td>{item.to_email}</td>
                                    <td>{formatMoney(item.amount)}</td>
                                    <td>{formatMoney(item.available_balance)}</td>
                                    <td>{t(labelKeyOf(VOUCHER_STATUS_OPTIONS, item.status))}</td>
                                    <td>{item.date_expire || ''}</td>
                                    <td>{item.sent_at || ''}</td>
                                    <td className="btn-action">
                                        {item.deleted_at == null ? (
                                            <>
                                                <Link
                                                    to={`/voucher/${item.id}`}
                                                    className="btn btn-primary"
                                                    title={t('Edit')}
                                                >
                                                    <i className="fa fa-edit" />
                                                </Link>
                                                <button
                                                    title={t('Delete')}
                                                    className="btn btn-danger"
                                                    onClick={() => rowAction(item)}
                                                >
                                                    <i className="fas fa-trash-alt" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                title={t('Recover')}
                                                className="btn btn-primary"
                                                onClick={() => rowAction(item)}
                                            >
                                                <i className="fa fas fa-check" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <Pager
                        total={count}
                        pageIndex={objSearch.pageIndex}
                        pageSize={objSearch.pageSize}
                        onChange={onPageChange}
                    />
                </>
            ) : (
                <div className="p-5 text-center">
                    <Spin />
                </div>
            )}
        </Wrapper>
    );
}
