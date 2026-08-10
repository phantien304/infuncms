/**
 * pages/order/index.jsx — DANH SÁCH order (REST, convert từ order/index.vue).
 * -----------------------------------------------------------
 * Mirror pages/product/index.jsx (thanh search top + bảng + bulk xoá/khôi
 * phục + Pager) — khác bản mt219 gốc vốn có cột filter nằm SIDEBAR bên phải,
 * đổi sang thanh search trên cùng cho nhất quán với product/blog.
 *
 * REST (xem routes/rcms.php + Api/Cms/Order/OrderController):
 *   GET    /order                  list (id/invoice_no/full_name/order_status_id/
 *                                   total/created_at/deleted_at/sort/order/page/per_page)
 *                                   — tên cột trần, KHÔNG còn hậu tố _eq/_cons của base cũ.
 *   DELETE /order/{id}             xoá mềm 1
 *   PATCH  /order/{id}/restore     khôi phục 1
 *   POST   /order/bulk             { action:'delete'|'restore', ids:[] }
 *   GET    /order-status           dropdown lọc theo trạng thái
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';

import Wrapper from '@/components/app/Wrapper';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';
import { formatVnd } from '@/core/utils/orderPricing';

export default function OrderIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        id: searchParams.get('id') || '',
        invoice_no: searchParams.get('invoice_no') || '',
        full_name: searchParams.get('full_name') || '',
        order_status_id: searchParams.get('order_status_id') || '',
        created_at: searchParams.get('created_at') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
        pageIndex: intParam(searchParams, 'pageIndex', 1),
        pageSize: intParam(searchParams, 'pageSize', 50),
    }));
    const [objAction, setObjAction] = useState({ deleted_at: -1, selected: [] });
    const [list, setList] = useState([]);
    const [count, setCount] = useState(0);
    const [orderStatuses, setOrderStatuses] = useState([]);
    const [loader, setLoader] = useState(false);

    useEffect(() => {
        api.get('/order-status').then((res) => setOrderStatuses(res.data?.data || [])).catch(() => {});
    }, []);

    const fetchList = useCallback(() => {
        const inst = loading.open();
        return api
            .get('/order', {
                params: {
                    id: objSearch.id || undefined,
                    invoice_no: objSearch.invoice_no || undefined,
                    full_name: objSearch.full_name || undefined,
                    order_status_id: objSearch.order_status_id || undefined,
                    created_at: objSearch.created_at || undefined,
                    sort: objSearch.sort,
                    order: objSearch.order,
                    deleted_at: objSearch.deleted_at,
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
                    ? api.delete(`/order/${item.id}`)
                    : api.patch(`/order/${item.id}/restore`);
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

    const bulkChangeStatus = () => {
        const map = { 0: 'delete', 1: 'restore' };
        const act = map[String(objAction.deleted_at)];
        if (!act || !objAction.selected.length) return;
        confirm(t('DoYouWantUpdateSelected'))
            .then(() => {
                const inst = loading.open();
                api
                    .post('/order/bulk', { action: act, ids: objAction.selected })
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
        return objSearch.order === 'desc' ? <i className="fa fa-arrow-down" /> : <i className="fa fa-arrow-up" />;
    };
    const th = (field, label, cls = '') => (
        <th className={cls} style={{ color: '#1e91cf', cursor: 'pointer' }} onClick={() => onSort(field)}>
            {t(label)} {sortIcon(field)}
        </th>
    );

    return (
        <Wrapper title={t('OrderList')} sapo="">
            {loader ? (
                <>
                    <div className="row" id="form-search">
                        <div className="col-xl-3">
                            <div className="row">
                                <div className="col-xl-5">
                                    <select
                                        className="form-control"
                                        value={objAction.deleted_at}
                                        onChange={(e) => setObjAction((a) => ({ ...a, deleted_at: parseInt(e.target.value, 10) }))}
                                    >
                                        <option value="-1">{t('Select')}</option>
                                        <option value="1">{t('Recover')}</option>
                                        <option value="0">{t('Delete')}</option>
                                    </select>
                                </div>
                                <div className="col-xl-7">
                                    <input className="btn btn-secondary" type="button" onClick={bulkChangeStatus} value={t('Save')} />
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-9">
                            <div className="row">
                                <div className="col-xl-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={t('OrderId')}
                                        value={objSearch.id}
                                        onChange={(e) => setObjSearch((s) => ({ ...s, id: e.target.value }))}
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={t('InvoiceNo')}
                                        value={objSearch.invoice_no}
                                        onChange={(e) => setObjSearch((s) => ({ ...s, invoice_no: e.target.value }))}
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={t('Customer')}
                                        value={objSearch.full_name}
                                        onChange={(e) => setObjSearch((s) => ({ ...s, full_name: e.target.value }))}
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <Select
                                        style={{ width: '100%' }}
                                        allowClear
                                        placeholder={t('OrderStatus')}
                                        value={objSearch.order_status_id || undefined}
                                        onChange={(v) => setObjSearch((s) => ({ ...s, order_status_id: v ?? '' }))}
                                        options={orderStatuses.map((s) => ({ label: s.name, value: s.id }))}
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        placeholder={t('DateCreate')}
                                        value={objSearch.created_at ? dayjs(objSearch.created_at) : null}
                                        onChange={(d) => setObjSearch((s) => ({ ...s, created_at: d ? d.format('YYYY-MM-DD') : '' }))}
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <input className="btn btn-info" type="button" onClick={onSearch} value={t('Search')} />
                                    <Link to="/order/add" className="btn btn-primary ml-2">
                                        {t('Add')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <table className="table table-bordered mt-3">
                        <thead>
                            <tr>
                                <th className="width-100">
                                    <input type="checkbox" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} />
                                </th>
                                {th('id', 'OrderId', 'width-100')}
                                {th('invoice_no', 'InvoiceNo')}
                                {th('full_name', 'Customer')}
                                {th('order_status_id', 'OrderStatus')}
                                {th('total', 'Total')}
                                {th('created_at', 'DateCreated')}
                                <th>{t('DateUpdated')}</th>
                                <th className="text-center width-200">{t('Action')}</th>
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
                                    <td>{item.invoice_no}</td>
                                    <td>{item.full_name}</td>
                                    <td>{item.order_status_name}</td>
                                    <td>{formatVnd(item.total)}</td>
                                    <td>{item.created_at}</td>
                                    <td>{item.updated_at}</td>
                                    <td className="btn-action">
                                        {item.deleted_at == null ? (
                                            <>
                                                <Link to={`/order/view/${item.id}`} className="btn btn-info" title={t('View')}>
                                                    <i className="fa fa-eye" />
                                                </Link>
                                                <Link to={`/order/${item.id}`} className="btn btn-primary" title={t('Edit')}>
                                                    <i className="fa fa-edit" />
                                                </Link>
                                                <button title={t('Delete')} className="btn btn-danger" onClick={() => rowAction(item)}>
                                                    <i className="fas fa-trash-alt" />
                                                </button>
                                            </>
                                        ) : (
                                            <button title={t('Recover')} className="btn btn-primary" onClick={() => rowAction(item)}>
                                                <i className="fa fas fa-check" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <Pager total={count} pageIndex={objSearch.pageIndex} pageSize={objSearch.pageSize} onChange={onPageChange} />
                </>
            ) : (
                <div className="p-5 text-center">
                    <Spin />
                </div>
            )}
        </Wrapper>
    );
}
