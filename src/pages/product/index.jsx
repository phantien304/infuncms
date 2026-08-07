/**
 * pages/product/index.jsx — DANH SÁCH product (REST, convert từ product/index.vue).
 * -----------------------------------------------------------
 * Đặc thù so với category: sửa INLINE ngay trong bảng (model/badge/price/
 * quantity) rồi bấm "Update Selected" để lưu hàng loạt; có duyệt draft (approval).
 *
 * REST (backend product chưa dựng — frontend gọi sẵn theo convention):
 *   GET    /product                  list (params: keyword/language_code/sort/order/deleted_at/warehouse_id/page/per_page)
 *   DELETE /product/{id}             xoá mềm 1
 *   PATCH  /product/{id}/restore     khôi phục 1
 *   POST   /product/bulk             { action:'delete'|'restore', ids:[] }
 *   POST   /product/bulk-update      { items:[{id,model,badge,price,quantity?}], warehouse_id? }  (Update Selected)
 *   POST   /product/{id}/approve     duyệt sản phẩm từ draft
 *
 * Đa kho (thêm 2026-08-06): filter Kho ở thanh search — chưa chọn (0 = "Tất
 * cả kho") thì cột Quantity là TỔNG các kho sellable, read-only; chọn đúng 1
 * kho thì hiện on_hand đúng kho đó, mở sửa inline. Sản phẩm có nhiều variant
 * (has_variants=true) thì Quantity LUÔN read-only bất kể đã chọn kho hay
 * chưa — sửa thật nằm ở tab Option (form.jsx?tab=option, VariantStockCell).
 * Backend: ProductCmsRepository::listForCms / ProductWriteService::bulkUpdate.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Input, Select, InputNumber } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { useAppSettings, useListLanguages } from '@/core/stores/appSettingsStore';
import { confirm, error as showError, success } from '@/core/services/alert';
import { resolveImageUrl } from '@/core/utils/imageUrl';

const BADGES = [
    { id: 'new', name: 'Mới' },
    { id: 'hot', name: 'Bán chạy' },
    { id: 'sale', name: 'Sale' },
    { id: 'best', name: 'Tốt nhất' },
    { id: 'feature', name: 'Nổi bật' },
];

export default function ProductIndex() {
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const appSettings = useAppSettings();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        deleted_at: intParam(searchParams, 'deleted_at', 1),
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
        language_code: searchParams.get('language_code') || 'vi',
        // warehouse_id: 0 = "Tất cả kho" (mặc định) — quantity hiển thị TỔNG
        // các kho sellable, cột read-only. Chọn đúng 1 kho mới mở sửa inline
        // (xem cột Quantity + updateSelected bên dưới; backend tương ứng ở
        // ProductCmsRepository::listForCms / ProductWriteService::bulkUpdate).
        warehouse_id: intParam(searchParams, 'warehouse_id', 0),
        pageIndex: intParam(searchParams, 'pageIndex', 1),
        pageSize: intParam(searchParams, 'pageSize', 50),
    }));
    const [objAction, setObjAction] = useState({ deleted_at: -1, selected: [] });
    const [list, setList] = useState([]);
    const [count, setCount] = useState(0);
    const [loader, setLoader] = useState(false);
    const [warehouses, setWarehouses] = useState([]);

    // Danh sách kho cho dropdown filter — cùng nguồn resource dùng bởi
    // product/form.jsx (Option tab), KHÔNG cần quyền 'list-warehouse' riêng
    // (xem routes/rcms.php comment ở route warehouse). Nạp 1 lần lúc mount.
    useEffect(() => {
        api.get('/resource', { params: { list_for_product: true } })
            .then((res) => setWarehouses((res.data?.data || res.data || {}).warehouse || []))
            .catch(() => {});
    }, []);

    const fetchList = useCallback(() => {
        const inst = loading.open();
        return api
            .get('/product', {
                params: {
                    keyword: objSearch.keyword,
                    language_code: objSearch.language_code,
                    sort: objSearch.sort,
                    order: objSearch.order,
                    deleted_at: objSearch.deleted_at,
                    warehouse_id: objSearch.warehouse_id || undefined,
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

    // Sửa inline 1 ô của 1 dòng (chưa lưu — chờ "Update Selected").
    const setCell = (id, field, value) =>
        setList((rows) =>
            rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );

    // Lưu hàng loạt các dòng đang chọn (model/badge/price/quantity).
    // quantity CHỈ gửi khi: đã chọn đúng 1 kho ở filter (warehouse_id > 0) VÀ
    // sản phẩm không có variant (has_variants=false) — 2 điều kiện khớp đúng
    // lúc ô Quantity ở bảng đang mở sửa inline (xem render cột bên dưới).
    // Sản phẩm nhiều variant hoặc chưa chọn kho: quantity trên dòng chỉ là
    // TỔNG hiển thị, gửi lên sẽ ghi sai — bỏ hẳn field này khỏi payload, kể cả
    // khi backend đã có guard riêng (ProductWriteService::bulkUpdate), để
    // tránh gửi số gây hiểu nhầm.
    const updateSelected = () => {
        const canEditQuantity = !!objSearch.warehouse_id;
        const items = list
            .filter((r) => objAction.selected.includes(r.id))
            .map((r) => {
                const item = { id: r.id, model: r.model, badge: r.badge, price: r.price };
                if (canEditQuantity && !r.has_variants) {
                    item.quantity = r.quantity;
                }
                return item;
            });
        if (!items.length) {
            return showError(t('PleaseSelectRows'));
        }
        confirm(t('DoYouWantUpdateSelected'))
            .then(() => {
                const inst = loading.open();
                api
                    .post('/product/bulk-update', {
                        items,
                        warehouse_id: objSearch.warehouse_id || undefined,
                    })
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

    // Xoá mềm / khôi phục 1 dòng.
    const rowAction = (item) => {
        const willDelete = item.deleted_at == null;
        confirm(t(willDelete ? 'DoYouWantToDeleteItem' : 'DoYouWantToRecover'))
            .then(() => {
                const inst = loading.open();
                const req = willDelete
                    ? api.delete(`/product/${item.id}`)
                    : api.patch(`/product/${item.id}/restore`);
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

    // Xoá / khôi phục hàng loạt (theo objAction.deleted_at: 0 = xoá, 1 = khôi phục).
    const bulkChangeStatus = () => {
        const map = { 0: 'delete', 1: 'restore' };
        const act = map[String(objAction.deleted_at)];
        if (!act || !objAction.selected.length) return;
        confirm(t('DoYouWantUpdateSelected'))
            .then(() => {
                const inst = loading.open();
                api
                    .post('/product/bulk', { action: act, ids: objAction.selected })
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

    // Duyệt sản phẩm có bản nháp (draft).
    const approvalProduct = (item) => {
        confirm(t('DoYouWantToApproval'))
            .then(() => {
                const inst = loading.open();
                api
                    .post(`/product/${item.id}/approve`)
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

    const allSelected =
        list.length > 0 && objAction.selected.length === list.length;
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

    const th = (field, label, cls = '') => (
        <th
            className={cls}
            style={{ color: '#1e91cf', cursor: 'pointer' }}
            onClick={() => onSort(field)}
        >
            {t(label)} {sortIcon(field)}
        </th>
    );

    return (
        <Wrapper title={t('ProductList')} sapo="">
            {loader ? (
                <>
                    {/* Thanh hành động + tìm kiếm (tùy biến vì có nút Update Selected) */}
                    <div className="row" id="form-search">
                        <div className="col-xl-3">
                            <div className="row">
                                <div className="col-xl-4">
                                    <select
                                        className="form-control"
                                        value={objAction.deleted_at}
                                        onChange={(e) =>
                                            setObjAction((a) => ({
                                                ...a,
                                                deleted_at: parseInt(e.target.value, 10),
                                            }))
                                        }
                                    >
                                        <option value="-1">{t('Select')}</option>
                                        <option value="1">{t('Recover')}</option>
                                        <option value="0">{t('Delete')}</option>
                                    </select>
                                </div>
                                <div className="col-xl-8">
                                    <input
                                        className="btn btn-secondary"
                                        type="button"
                                        onClick={bulkChangeStatus}
                                        value={t('Save')}
                                    />
                                    <input
                                        className="btn btn-primary ml-2"
                                        type="button"
                                        onClick={updateSelected}
                                        value={t('UpdateSelected')}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-9">
                            <div className="row">
                                <div className="col-xl-3">
                                    <Select
                                        style={{ width: '100%' }}
                                        value={objSearch.warehouse_id || 0}
                                        onChange={(v) =>
                                            setObjSearch((s) => ({ ...s, warehouse_id: v || 0 }))
                                        }
                                        options={[
                                            { label: t('AllWarehouses'), value: 0 },
                                            ...warehouses.map((w) => ({
                                                label: w.name,
                                                value: w.id,
                                            })),
                                        ]}
                                    />
                                </div>
                                <div className="col-xl-3">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={t('Keyword')}
                                        value={objSearch.keyword}
                                        onChange={(e) =>
                                            setObjSearch((s) => ({ ...s, keyword: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <select
                                        className="form-control"
                                        value={objSearch.language_code}
                                        onChange={(e) =>
                                            setObjSearch((s) => ({
                                                ...s,
                                                language_code: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">{t('SelectLanguage')}</option>
                                        {listLanguages.map((l) => (
                                            <option key={l.code} value={l.code}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-xl-2">
                                    <select
                                        className="form-control"
                                        value={objSearch.deleted_at}
                                        onChange={(e) =>
                                            setObjSearch((s) => ({
                                                ...s,
                                                deleted_at: parseInt(e.target.value, 10),
                                            }))
                                        }
                                    >
                                        <option value={-1}>{t('ShowAll')}</option>
                                        <option value={1}>{t('Active')}</option>
                                        <option value={0}>{t('DeActive')}</option>
                                    </select>
                                </div>
                                <div className="col-xl-1">
                                    <input
                                        className="btn btn-info"
                                        type="button"
                                        onClick={onSearch}
                                        value={t('Search')}
                                    />
                                </div>
                                <div className="col-xl-1">
                                    <Link to="/product/add" className="btn btn-primary ml-2">
                                        {t('Add')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                    />
                                </th>
                                {th('id', 'Id', 'width-100')}
                                <th className="width-200">{t('Image')}</th>
                                {th('product_description.name', 'Name')}
                                {th('model', 'Model', 'width-200')}
                                {th('badge', 'Badge', 'width-200')}
                                {th('price', 'Price', 'width-200')}
                                {th('quantity', 'Quantity', 'width-150')}
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
                                            onChange={(e) =>
                                                toggleSelectOne(item.id, e.target.checked)
                                            }
                                        />
                                    </td>
                                    <td>{item.id}</td>
                                    <td>
                                        {item.image && (
                                            <img
                                                // BUG đã fix (2026-08-02, lần 3): trước đây dùng thẳng
                                                // item.image (path tương đối, vd "seed/products/xxx.jpg")
                                                // làm src ⇒ trình duyệt resolve như URL tương đối theo
                                                // origin CMS (cms.infun.co) ⇒ luôn 404, ảnh không hiện ở
                                                // trang danh sách (khác tab Image trong form, vốn đã có
                                                // resolveImageUrl qua Photo.jsx).
                                                src={resolveImageUrl(item.image, appSettings.storageDomain)}
                                                alt={item.name}
                                                style={{ maxWidth: 80, height: 'auto' }}
                                            />
                                        )}
                                    </td>
                                    <td>{item.name}</td>
                                    <td>
                                        <Input
                                            value={item.model || ''}
                                            onChange={(e) =>
                                                setCell(item.id, 'model', e.target.value)
                                            }
                                        />
                                    </td>
                                    <td>
                                        <Select
                                            style={{ width: '100%' }}
                                            allowClear
                                            placeholder={t('Select')}
                                            value={item.badge || undefined}
                                            onChange={(v) => setCell(item.id, 'badge', v ?? '')}
                                            options={BADGES.map((b) => ({
                                                label: b.name,
                                                value: b.id,
                                            }))}
                                        />
                                    </td>
                                    <td>
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            value={item.price}
                                            onChange={(v) => setCell(item.id, 'price', v)}
                                        />
                                    </td>
                                    <td>
                                        {item.has_variants ? (
                                            // Nhiều variant: 1 số duy nhất không đủ để biết
                                            // ghi ngược vào variant nào — chỉ hiển thị TỔNG,
                                            // click nhảy sang tab Option (VariantStockCell) để
                                            // sửa đúng theo từng variant × từng kho.
                                            <Link
                                                to={`/product/${item.id}?tab=option`}
                                                title={t('QuantityHasVariantsHint')}
                                            >
                                                {item.variant_count} {t('Variants')} · {item.quantity}
                                            </Link>
                                        ) : objSearch.warehouse_id ? (
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                value={item.quantity}
                                                onChange={(v) => setCell(item.id, 'quantity', v)}
                                            />
                                        ) : (
                                            // Chưa chọn kho cụ thể: số hiển thị là TỔNG các kho
                                            // sellable — ghi ngược lại sẽ không biết vào kho nào,
                                            // nên chỉ đọc, chọn 1 kho ở filter phía trên để sửa.
                                            <span title={t('QuantityAllWarehousesHint')}>
                                                {item.quantity}
                                            </span>
                                        )}
                                    </td>
                                    <td className="btn-action">
                                        {item.product_draft && (
                                            <div className="mb-2">
                                                <Link
                                                    to={`/product-draft/${item.product_draft.id}`}
                                                    className="btn btn-secondary"
                                                    target="_blank"
                                                    title={t('View')}
                                                >
                                                    <i className="fa fa-eye" />
                                                </Link>
                                                <button
                                                    title={t('Approval')}
                                                    className="btn btn-warning"
                                                    onClick={() => approvalProduct(item)}
                                                >
                                                    <i className="fa fa-check" />
                                                </button>
                                            </div>
                                        )}
                                        {item.deleted_at == null ? (
                                            <>
                                                <Link
                                                    to={`/product/${item.id}`}
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
