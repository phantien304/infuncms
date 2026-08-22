/**
 * pages/review/index.jsx — DANH SÁCH review sản phẩm (review — khác
 * store-review là review cấp cửa hàng). Tính năng đã phát triển xa hơn
 * nhiều so với mt219 (thêm criteria/tag/media/reply/report) — KHÔNG mirror
 * mt219 cho trang này.
 * -----------------------------------------------------------
 *   GET    /review               (list, params: keyword/status/product_id/
 *                                  rating/sort/order/deleted_at/page/per_page)
 *   POST   /review                (tạo review "mồi" — nút Add)
 *   DELETE /review/{id}           (xoá mềm 1)
 *   PATCH  /review/{id}/restore   (khôi phục 1)
 *   POST   /review/bulk           ({ action:'delete'|'restore', ids:[] })
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Select, Input, Button, Tag } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import FormSearch from '@/components/form/FormSearch';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';

const STATUS_LABEL = {
    0: { label: 'Pending', color: 'gold' },
    1: { label: 'Approved', color: 'green' },
    2: { label: 'Rejected', color: 'red' },
    3: { label: 'Hidden', color: 'default' },
};

export default function ReviewIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        status: searchParams.get('status') || '',
        product_id: searchParams.get('product_id') || '',
        rating: searchParams.get('rating') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
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
            .get('/review', {
                params: {
                    keyword: objSearch.keyword,
                    status: objSearch.status,
                    product_id: objSearch.product_id,
                    rating: objSearch.rating,
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
                    ? api.delete(`/review/${item.id}`)
                    : api.patch(`/review/${item.id}/restore`);
                req
                    .then(() => {
                        success(t('Successful'));
                        fetchList();
                    })
                    .catch((err) =>
                        showError(t(err?.response?.data?.message || 'ErrorAction'))
                    )
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
                    .post('/review/bulk', { action: act, ids: action.selected })
                    .then(() => {
                        success(t('Successful'));
                        setObjAction({ deleted_at: -1, selected: [] });
                        fetchList();
                    })
                    .catch((err) =>
                        showError(t(err?.response?.data?.message || 'ErrorAction'))
                    )
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

    const allSelected =
        list.length > 0 && objAction.selected.length === list.length;
    const toggleSelectAll = (checked) =>
        setObjAction((a) => ({
            ...a,
            selected: checked ? list.map((i) => i.id) : [],
        }));
    const toggleSelectOne = (id, checked) =>
        setObjAction((a) => ({
            ...a,
            selected: checked
                ? [...a.selected, id]
                : a.selected.filter((x) => x !== id),
        }));

    const sortIcon = (field) => {
        if (objSearch.sort !== field) return null;
        return objSearch.order === 'desc' ? (
            <i className="fa fa-arrow-down" />
        ) : (
            <i className="fa fa-arrow-up" />
        );
    };

    return (
        <Wrapper title={t('ReviewList')} sapo="">
            {loader ? (
                <>
                    <div className="row mb-3">
                        <div className="col-xl-3">
                            <Select
                                style={{ width: '100%' }}
                                allowClear
                                placeholder={t('Status')}
                                value={objSearch.status || undefined}
                                onChange={(val) =>
                                    setObjSearch((s) => ({ ...s, status: val ?? '' }))
                                }
                                options={Object.entries(STATUS_LABEL).map(([value, cfg]) => ({
                                    label: t(cfg.label),
                                    value,
                                }))}
                            />
                        </div>
                        <div className="col-xl-3">
                            <Select
                                style={{ width: '100%' }}
                                allowClear
                                placeholder={t('Rating')}
                                value={objSearch.rating || undefined}
                                onChange={(val) =>
                                    setObjSearch((s) => ({ ...s, rating: val ?? '' }))
                                }
                                options={[1, 2, 3, 4, 5].map((r) => ({
                                    label: `${r} ${t('Stars')}`,
                                    value: String(r),
                                }))}
                            />
                        </div>
                        <div className="col-xl-3">
                            <Input
                                placeholder={t('ProductId')}
                                value={objSearch.product_id}
                                onChange={(e) =>
                                    setObjSearch((s) => ({ ...s, product_id: e.target.value }))
                                }
                            />
                        </div>
                        <div className="col-xl-3">
                            <Button type="primary" onClick={onSearch}>
                                {t('Search')}
                            </Button>
                        </div>
                    </div>

                    <FormSearch
                        addPath="/review/add"
                        showLanguage={false}
                        objAction={objAction}
                        setObjAction={setObjAction}
                        objSearch={objSearch}
                        setObjSearch={setObjSearch}
                        onSearch={onSearch}
                        changeStatus={bulkAction}
                    />

                    <div style={{ overflowX: 'auto' }}>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th className="width-100">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th
                                        className="width-100"
                                        style={{ color: '#1e91cf', cursor: 'pointer' }}
                                        onClick={() => onSort('id')}
                                    >
                                        {t('Id')} {sortIcon('id')}
                                    </th>
                                    <th>{t('Product')}</th>
                                    <th>{t('Author')}</th>
                                    <th
                                        className="width-100"
                                        style={{ color: '#1e91cf', cursor: 'pointer' }}
                                        onClick={() => onSort('rating')}
                                    >
                                        {t('Rating')} {sortIcon('rating')}
                                    </th>
                                    <th
                                        className="width-150"
                                        style={{ color: '#1e91cf', cursor: 'pointer' }}
                                        onClick={() => onSort('status')}
                                    >
                                        {t('Status')} {sortIcon('status')}
                                    </th>
                                    <th className="width-100">{t('Reply')}</th>
                                    <th className="width-100">{t('Report')}</th>
                                    <th
                                        className="width-150"
                                        style={{ color: '#1e91cf', cursor: 'pointer' }}
                                        onClick={() => onSort('created_at')}
                                    >
                                        {t('Date')} {sortIcon('created_at')}
                                    </th>
                                    <th className="text-center width-150">{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((item) => {
                                    const statusCfg = STATUS_LABEL[item.status] || STATUS_LABEL[0];
                                    return (
                                        <tr key={item.id} className="post-item-group">
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={objAction.selected.includes(item.id)}
                                                    onChange={(e) =>
                                                        toggleSelectOne(item.id, e.target.checked)
                                                    }
                                                />
                                            </td>
                                            <td>{item.id}</td>
                                            <td>
                                                {item.product_name || `#${item.product_id}`}
                                            </td>
                                            <td>{item.is_anonymous ? t('Anonymous') : item.author}</td>
                                            <td>{item.rating} ★</td>
                                            <td>
                                                <Tag color={statusCfg.color}>{t(statusCfg.label)}</Tag>
                                            </td>
                                            <td>{item.reply_count}</td>
                                            <td>{item.reports_count || 0}</td>
                                            <td>{item.created_at}</td>
                                            <td className="btn-action">
                                                {item.deleted_at == null ? (
                                                    <>
                                                        <Link
                                                            to={`/review/${item.id}`}
                                                            className="btn btn-primary"
                                                            title={t('View')}
                                                        >
                                                            <i className="fa fa-eye" />
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

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
