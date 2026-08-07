/**
 * pages/customer/index.jsx — DANH SÁCH khách hàng (REST chuẩn).
 * -----------------------------------------------------------
 * Mirror pages/user/index.jsx 1:1 (Phase 2.3/3.3 pattern) nhưng cho member
 * (type=2 — App\Enums\UserType::Member), theo yêu cầu user "Đầy đủ CRUD như
 * màn User admin" (docs/ROLE-PERMISSION-PLAN.md phần mở rộng sau Phase 4).
 * Khác User: cột Phone thay Roles, KHÔNG có Username.
 *
 *   GET    /customer              (list, params: keyword/page/per_page)
 *   DELETE /customer/{id}         (xoá mềm 1 — chặn tự xoá chính mình)
 *   PATCH  /customer/{id}/restore (khôi phục 1)
 *   POST   /customer/bulk         ({ action:'delete'|'restore', ids:[] })
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

export default function CustomerIndex() {
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
            .get('/customer', {
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
                    ? api.delete(`/customer/${item.id}`)
                    : api.patch(`/customer/${item.id}/restore`);
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
        <Wrapper title={t('CustomerList')} sapo="">
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
                            <Can permission="create-customer">
                                <Link to="/customer/add" className="btn btn-primary">
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
                                <th>{t('Phone')}</th>
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
                                            to={`/customer/${item.id}`}
                                            style={{ color: '#0f74a8' }}
                                        >
                                            {item.full_name}
                                        </Link>
                                    </td>
                                    <td>{item.email}</td>
                                    <td>{item.phone}</td>
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
                                                <Can permission="edit-customer">
                                                    <Link
                                                        to={`/customer/${item.id}`}
                                                        className="btn btn-primary"
                                                        title={t('Edit')}
                                                    >
                                                        <i className="fa fa-edit" />
                                                    </Link>
                                                </Can>
                                                <Can permission="del-customer">
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
                                            <Can permission="del-customer">
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
