/**
 * pages/userGroup/index.jsx — DANH SÁCH user_group (REST chuẩn).
 * -----------------------------------------------------------
 * Mirror pages/category/index.jsx 1:1 (cùng shape i18n cha/con) — xem đó
 * để hiểu convention. Khác: 'title' -> 'name', không có cây parent/children,
 * thêm cột 'approval' (mt219 UserGroupController hiển thị field này ở list).
 *
 *   GET    /user-group              (list)
 *   DELETE /user-group/{id}         (xoá mềm 1)
 *   PATCH  /user-group/{id}/restore (khôi phục 1)
 *   POST   /user-group/bulk         ({ action:'delete'|'restore', ids:[] })
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import FormSearch from '@/components/form/FormSearch';
import Pager from '@/components/ui/Pager';
import Can from '@/components/ui/Can';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';

export default function UserGroupIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
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
            .get('/user-group', {
                params: {
                    keyword: objSearch.keyword,
                    language_code: objSearch.language_code,
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
                    ? api.delete(`/user-group/${item.id}`)
                    : api.patch(`/user-group/${item.id}/restore`);
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
                    .post('/user-group/bulk', { action: act, ids: action.selected })
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
        <Wrapper title={t('UserGroupList')} sapo="">
            {loader ? (
                <>
                    <FormSearch
                        addPath="/user-group/add"
                        objAction={objAction}
                        setObjAction={setObjAction}
                        objSearch={objSearch}
                        setObjSearch={setObjSearch}
                        onSearch={onSearch}
                        changeStatus={bulkAction}
                    />

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
                                    className="width-150"
                                    style={{ color: '#1e91cf', cursor: 'pointer' }}
                                    onClick={() => onSort('id')}
                                >
                                    {t('Id')} {sortIcon('id')}
                                </th>
                                <th
                                    style={{ color: '#1e91cf', cursor: 'pointer' }}
                                    onClick={() => onSort('name')}
                                >
                                    {t('Name')} {sortIcon('name')}
                                </th>
                                <th className="text-center width-150">{t('Approval')}</th>
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
                                            onChange={(e) =>
                                                toggleSelectOne(item.id, e.target.checked)
                                            }
                                        />
                                    </td>
                                    <td>{item.id}</td>
                                    <td>
                                        <Link
                                            to={`/user-group/${item.id}`}
                                            style={{ color: '#0f74a8' }}
                                        >
                                            {item.name}
                                        </Link>
                                    </td>
                                    <td className="text-center">
                                        {item.approval ? (
                                            <i className="fa fa-check text-success" />
                                        ) : (
                                            <i className="fa fa-times text-danger" />
                                        )}
                                    </td>
                                    <td className="btn-action">
                                        {item.deleted_at == null ? (
                                            <>
                                                <Can permission="edit-user-group">
                                                    <Link
                                                        to={`/user-group/${item.id}`}
                                                        className="btn btn-primary"
                                                        title={t('Edit')}
                                                    >
                                                        <i className="fa fa-edit" />
                                                    </Link>
                                                </Can>
                                                <Can permission="del-user-group">
                                                    <button
                                                        title={t('Delete')}
                                                        className="btn btn-danger"
                                                        onClick={() => rowAction(item)}
                                                    >
                                                        <i className="fas fa-trash-alt" />
                                                    </button>
                                                </Can>
                                            </>
                                        ) : (
                                            <Can permission="del-user-group">
                                                <button
                                                    title={t('Recover')}
                                                    className="btn btn-primary"
                                                    onClick={() => rowAction(item)}
                                                >
                                                    <i className="fa fas fa-check" />
                                                </button>
                                            </Can>
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
