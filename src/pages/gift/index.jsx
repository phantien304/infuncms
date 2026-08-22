/**
 * pages/gift/index.jsx — DANH SÁCH chương trình quà tặng.
 * -----------------------------------------------------------
 * MÀN MỚI — mt219 KHÔNG có tính năng này. Bảng `gift` / `gift_item` /
 * `gift_trigger_product` / `order_gift` được thêm ở migration 2026_06_12.
 *
 *   GET    /gift              (list: keyword/trigger_type/sort/order/deleted_at)
 *   DELETE /gift/{id}         (xoá mềm 1)
 *   PATCH  /gift/{id}/restore (khôi phục 1)
 *   POST   /gift/bulk         ({ action:'delete'|'restore', ids:[] })
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Select } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import FormSearch from '@/components/form/FormSearch';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    GIFT_PICK_TYPE_OPTIONS,
    GIFT_TRIGGER_TYPE_OPTIONS,
    formatMoney,
    labelKeyOf,
} from '@/core/utils/marketing';

export default function GiftIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
        trigger_type: searchParams.get('trigger_type') || '',
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
            .get('/gift', {
                params: {
                    keyword: objSearch.keyword,
                    sort: objSearch.sort,
                    order: objSearch.order,
                    deleted_at: objSearch.deleted_at,
                    trigger_type: objSearch.trigger_type || undefined,
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
                    ? api.delete(`/gift/${item.id}`)
                    : api.patch(`/gift/${item.id}/restore`);
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
                    .post('/gift/bulk', { action: act, ids: action.selected })
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
        <Wrapper title={t('GiftList')} sapo="">
            {loader ? (
                <>
                    <FormSearch
                        addPath="/gift/add"
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
                                placeholder={t('TriggerType')}
                                value={objSearch.trigger_type || undefined}
                                onChange={(v) =>
                                    setObjSearch((s) => ({
                                        ...s,
                                        trigger_type: v ?? '',
                                        pageIndex: 1,
                                    }))
                                }
                                options={GIFT_TRIGGER_TYPE_OPTIONS.map((o) => ({
                                    value: String(o.value),
                                    label: t(o.labelKey),
                                }))}
                            />
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
                                {th('name', 'Name')}
                                <th className="width-150">{t('TriggerType')}</th>
                                <th className="width-150">{t('MinSubtotal')}</th>
                                <th className="width-150">{t('PickType')}</th>
                                <th className="width-100">{t('GiftItemCount')}</th>
                                <th className="width-100">{t('UsedCount')}</th>
                                {th('date_start', 'DateStart')}
                                {th('date_end', 'DateEnd')}
                                <th className="width-100">{t('Active')}</th>
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
                                        <Link to={`/gift/${item.id}`} style={{ color: '#0f74a8' }}>
                                            {item.name}
                                        </Link>
                                    </td>
                                    <td>
                                        {t(labelKeyOf(GIFT_TRIGGER_TYPE_OPTIONS, item.trigger_type))}
                                    </td>
                                    <td>{item.min_subtotal != null ? formatMoney(item.min_subtotal) : ''}</td>
                                    <td>{t(labelKeyOf(GIFT_PICK_TYPE_OPTIONS, item.pick_type))}</td>
                                    <td>{item.gift_item_count}</td>
                                    <td>
                                        {item.used_count}
                                        {item.uses_total != null ? ` / ${item.uses_total}` : ''}
                                    </td>
                                    <td>{item.date_start || ''}</td>
                                    <td>{item.date_end || ''}</td>
                                    <td>{item.is_active ? t('Active') : t('DeActive')}</td>
                                    <td className="btn-action">
                                        {item.deleted_at == null ? (
                                            <>
                                                <Link
                                                    to={`/gift/${item.id}`}
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
