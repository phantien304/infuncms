/**
 * pages/role/index.jsx — DANH SÁCH role (REST chuẩn).
 * -----------------------------------------------------------
 * KHÁC category/user-group: Spatie\Permission\Models\Role KHÔNG có
 * deleted_at (xem RoleController docblock backend) — không soft-delete,
 * không bulk, không dropdown ngôn ngữ. Vì vậy KHÔNG dùng FormSearch (form
 * đó gắn cứng UI xoá-mềm/khôi phục không áp dụng được cho Role) — tự viết
 * thanh tìm kiếm tối giản.
 *
 *   GET    /role            (list, params: keyword/sort/order/page/per_page)
 *   DELETE /role/{id}       (XOÁ CỨNG — RoleWriteService chặn nếu còn user
 *                            gán, trả 422 { message })
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

export default function RoleIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
        pageIndex: intParam(searchParams, 'pageIndex', 1),
        pageSize: intParam(searchParams, 'pageSize', 50),
    }));
    const [list, setList] = useState([]);
    const [count, setCount] = useState(0);
    const [loader, setLoader] = useState(false);

    const fetchList = useCallback(() => {
        const inst = loading.open();
        return api
            .get('/role', {
                params: {
                    keyword: objSearch.keyword,
                    sort: objSearch.sort,
                    order: objSearch.order,
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

    // XOÁ CỨNG — không hoàn tác được. RoleWriteService::delete() chặn nếu
    // còn user gán (422), nhưng vẫn phải cảnh báo rõ TRƯỚC khi gọi (quy tắc
    // an toàn docs/CLAUDE.md — dù có guard backend, không miễn trừ cảnh báo
    // ở UI khi thao tác là xoá cứng thật).
    const rowAction = (item) => {
        confirm(t('DoYouWantToDeleteRolePermanently'))
            .then(() => {
                const inst = loading.open();
                api
                    .delete(`/role/${item.id}`)
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

    const onSort = (field) =>
        setObjSearch((s) => ({
            ...s,
            sort: field,
            order: s.sort === field && s.order === 'desc' ? 'asc' : 'desc',
        }));
    const onSearch = () => setObjSearch((s) => ({ ...s, pageIndex: 1 }));
    const onPageChange = (p) => setObjSearch((s) => ({ ...s, pageIndex: p }));

    const sortIcon = (field) => {
        if (objSearch.sort !== field) return null;
        return objSearch.order === 'desc' ? (
            <i className="fa fa-arrow-down" />
        ) : (
            <i className="fa fa-arrow-up" />
        );
    };

    return (
        <Wrapper title={t('RoleList')} sapo="">
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
                            <Can permission="create-role">
                                <Link to="/role/add" className="btn btn-primary">
                                    {t('Add')}
                                </Link>
                            </Can>
                        </div>
                    </div>

                    <table className="table table-bordered">
                        <thead>
                            <tr>
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
                                <th className="text-center width-150">
                                    {t('PermissionsCount')}
                                </th>
                                <th className="text-center width-150">{t('UsersCount')}</th>
                                <th className="text-center width-150">{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>
                                        <Link
                                            to={`/role/${item.id}`}
                                            style={{ color: '#0f74a8' }}
                                        >
                                            {item.name}
                                        </Link>
                                    </td>
                                    <td className="text-center">{item.permissions_count}</td>
                                    <td className="text-center">{item.users_count}</td>
                                    <td className="btn-action">
                                        <Can permission="edit-role">
                                            <Link
                                                to={`/role/${item.id}`}
                                                className="btn btn-primary"
                                                title={t('Edit')}
                                            >
                                                <i className="fa fa-edit" />
                                            </Link>
                                        </Can>
                                        <Can permission="del-role">
                                            <button
                                                title={t('Delete')}
                                                className="btn btn-danger"
                                                onClick={() => rowAction(item)}
                                            >
                                                <i className="fas fa-trash-alt" />
                                            </button>
                                        </Can>
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
