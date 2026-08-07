/**
 * pages/storeReview/index.jsx — DANH SÁCH StoreReview (REST chuẩn).
 * -----------------------------------------------------------
 * Mirror pages/category/index.jsx (xem file đó để đối chiếu pattern gốc).
 * Convert từ mt219 app/Http/Controllers/Cms/StoreReviewController.php
 * (Blade + Presenter cũ) — "Khách hàng của In&Fun" hiển thị ở trang chủ
 * (web::page.child.store_review).
 *
 *   GET    /store-review              (list, params: keyword/language_code/
 *                                       deleted_at/featured/sort/order/page/per_page)
 *   DELETE /store-review/{id}         (xoá mềm 1)
 *   PATCH  /store-review/{id}/restore (khôi phục 1)
 *   POST   /store-review/bulk         ({ action:'delete'|'restore', ids:[] })
 * Response list: { data:[...], meta:{ total, ... } }.
 *
 * Lưu ý sort: StoreReviewRepository::listForCms() KHÔNG dùng Spatie
 * QueryBuilder allowedSorts — chỉ nhận sort='title' (theo
 * store_review_description.title) hoặc mặc định store_review.id, giá trị
 * khác đều rơi về id. Vì vậy chỉ 2 cột Id/Title sortable (không có
 * created_at/name như Category).
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import FormSearch from '@/components/form/FormSearch';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useAppSettings } from '@/core/stores/appSettingsStore';
import { resolveImageUrl } from '@/core/utils/imageUrl';
import CONSTANTS from '@/core/utils/constants';

const SOCIAL_ICON_LABELS = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    twitter: 'Twitter/X',
    zalo: 'Zalo',
    google: 'Google',
    linkedin: 'LinkedIn',
    pinterest: 'Pinterest',
};

export default function StoreReviewIndex() {
    const t = useTranslation();
    const loading = useLoading();
    const appSettings = useAppSettings();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
        featured: searchParams.get('featured') || '',
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
        language_code: searchParams.get('language_code') || '',
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
            .get('/store-review', {
                params: {
                    keyword: objSearch.keyword,
                    language_code: objSearch.language_code || undefined,
                    sort: objSearch.sort,
                    order: objSearch.order,
                    deleted_at: objSearch.deleted_at,
                    featured: objSearch.featured === '' ? undefined : objSearch.featured,
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

    // Xoá mềm / khôi phục 1 dòng.
    const rowAction = (item) => {
        const willDelete = item.deleted_at == null;
        confirm(t(willDelete ? 'DoYouWantToDeleteItem' : 'DoYouWantToRecover'))
            .then(() => {
                const inst = loading.open();
                const req = willDelete
                    ? api.delete(`/store-review/${item.id}`)
                    : api.patch(`/store-review/${item.id}/restore`);
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

    // Hành động hàng loạt từ FormSearch: deleted_at 0 = xoá, 1 = khôi phục.
    const bulkAction = (action) => {
        const map = { 0: 'delete', 1: 'restore' };
        const act = map[String(action.deleted_at)];
        if (!act || !action.selected.length) return;
        confirm(t('DoYouWantUpdateSelected'))
            .then(() => {
                const inst = loading.open();
                api
                    .post('/store-review/bulk', { action: act, ids: action.selected })
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

    const imageUrl = (path) =>
        resolveImageUrl(path || CONSTANTS.NO_IMG, appSettings.storageDomain);

    return (
        <Wrapper title={t('StoreReviewList')} sapo="">
            {loader ? (
                <>
                    <FormSearch
                        addPath="/store-review/add"
                        objAction={objAction}
                        setObjAction={setObjAction}
                        objSearch={objSearch}
                        setObjSearch={setObjSearch}
                        onSearch={onSearch}
                        changeStatus={bulkAction}
                    />

                    {/* Bộ lọc riêng: featured — không có sẵn trong FormSearch chung */}
                    <div className="row mt-2">
                        <div className="col-xl-3 offset-xl-9">
                            <select
                                className="form-control"
                                value={objSearch.featured}
                                onChange={(e) =>
                                    setObjSearch((s) => ({
                                        ...s,
                                        featured: e.target.value,
                                        pageIndex: 1,
                                    }))
                                }
                            >
                                <option value="">{t('AllFeatured')}</option>
                                <option value="1">{t('Featured')}</option>
                                <option value="0">{t('NotFeatured')}</option>
                            </select>
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
                                <th
                                    className="width-150"
                                    style={{ color: '#1e91cf', cursor: 'pointer' }}
                                    onClick={() => onSort('id')}
                                >
                                    {t('Id')} {sortIcon('id')}
                                </th>
                                <th className="width-100">{t('Image')}</th>
                                <th>{t('Name')}</th>
                                <th
                                    style={{ color: '#1e91cf', cursor: 'pointer' }}
                                    onClick={() => onSort('title')}
                                >
                                    {t('Title')} {sortIcon('title')}
                                </th>
                                <th className="width-150">{t('SocialIcon')}</th>
                                <th className="width-100 text-center">{t('Featured')}</th>
                                <th className="text-center width-150">{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center">
                                        {t('NoData')}
                                    </td>
                                </tr>
                            )}
                            {list.map((item) => (
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
                                        <img
                                            src={imageUrl(item.image)}
                                            alt=""
                                            style={{
                                                width: 48,
                                                height: 48,
                                                objectFit: 'cover',
                                                borderRadius: 4,
                                            }}
                                        />
                                    </td>
                                    <td>{item.name}</td>
                                    <td>
                                        <Link
                                            to={`/store-review/${item.id}`}
                                            style={{ color: '#0f74a8' }}
                                        >
                                            {item.title}
                                        </Link>
                                    </td>
                                    <td>
                                        {SOCIAL_ICON_LABELS[item.social_icon] ||
                                            item.social_icon}
                                    </td>
                                    <td className="text-center">
                                        {item.featured ? t('Yes') : t('No')}
                                    </td>
                                    <td className="btn-action">
                                        {item.deleted_at == null ? (
                                            <>
                                                <Link
                                                    to={`/store-review/${item.id}`}
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
