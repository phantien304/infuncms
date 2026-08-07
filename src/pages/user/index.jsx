/**
 * pages/user/index.jsx — DANH SÁCH tài khoản quản trị CMS (REST chuẩn).
 * -----------------------------------------------------------
 * Phase 2.3/3.3 (docs/ROLE-PERMISSION-PLAN.md) — CHỈ quản Admin (type=1,
 * quyết định Phase 6.1). KHÔNG đụng route GET /rcms/user cũ (dropdown Author
 * blog/form.jsx) — trang này gọi endpoint RIÊNG /user/admin-list.
 *
 *   GET    /user/admin-list       (list, params: keyword/page/per_page)
 *   DELETE /user/{id}             (xoá mềm 1 — chặn tự xoá chính mình)
 *   PATCH  /user/{id}/restore     (khôi phục 1)
 *   POST   /user/bulk             ({ action:'delete'|'restore', ids:[] })
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Input } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Pager from '@/components/ui/Pager';
import Can from '@/components/ui/Can';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { confirm, error as showError, success } from '@/core/services/alert';

export default function UserIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        pageIndex: intParam(searchParams, 'pageIndex', 1),
        pageSize: intParam(searchParams, 'pageSize', 50),
    }));
    const [list, setList] = useState([]);
    const [count, setCount] = useState(0);
    const [loader, setLoader] = useState(false);

    const fetchList = useCallback(() => {
        const inst = loading.open();
        return api
            .get('/user/admin-list', {
                params: {
                    keyword: objSearch.keyword,
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
                    ? api.delete(`/user/${item.id}`)
                    : api.patch(`/user/${item.id}/restore`);
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

    const onSearch = () => setObjSearch((s) => ({ ...s, pageIndex: 1 }));
    const onPageChange = (p) => setObjSearch((s) => ({ ...s, pageIndex: p }));

    return (
        <Wrapper title={t('UserList')} sapo="">
            {loader ? (
                <>
                    <div className="row mb-3" id="form-search">
                        <div className="col-xl-4">
                            <Input.Search
                                placeholder={t('Keyword')}
                                value={objSearch.keyword}
                                onChange={(e) =>
                                    setObjSearch((s) => ({ ...s, keyword: e.target.value }))
                                }
                                onSearch={onSearch}
                                allowClear
                            />
                        </div>
                        <div className="col-xl-8 text-right">
                            <Can permission="create-user">
                                <Link to="/user/add" className="btn btn-primary">
                                    {t('Add')}
                                </Link>
                            </Can>
                        </div>
                    </div>

                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th className="width-100">{t('Id')}</th>
                                <th>{t('FullName')}</th>
                                <th>{t('Email')}</th>
                                <th>{t('Roles')}</th>
                                <th className="text-center width-100">{t('Status')}</th>
                                <th className="text-center width-150">{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>
                                        <Link
                                            to={`/user/${item.id}`}
                                            style={{ color: '#0f74a8' }}
                                        >
                                            {item.full_name}
                                        </Link>
                                    </td>
                                    <td>{item.email}</td>
                                    <td>
                                        {(item.roles || [])
                                            .map((r) => r.name)
                                            .join(', ')}
                                    </td>
                                    <td className="text-center">
                                        {item.status ? (
                                            <i className="fa fa-check text-success" />
                                        ) : (
                                            <i className="fa fa-times text-danger" />
                                        )}
                                    </td>
                                    <td className="btn-action">
                                        {item.deleted_at == null ? (
                                            <>
                                                <Can permission="edit-user">
                                                    <Link
                                                        to={`/user/${item.id}`}
                                                        className="btn btn-primary"
                                                        title={t('Edit')}
                                                    >
                                                        <i className="fa fa-edit" />
                                                    </Link>
                                                </Can>
                                                <Can permission="del-user">
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
                                            <Can permission="del-user">
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
