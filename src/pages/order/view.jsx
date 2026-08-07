/**
 * pages/order/view.jsx — Xem/đổi trạng thái đơn hàng (REST, convert từ
 * order/view.vue mt219).
 * -----------------------------------------------------------
 * KHÁC order/form.jsx: trang này CHỈ cho sửa trạng thái + thông tin khách
 * hàng/địa chỉ (tái dùng thẳng components/order/Customer.jsx — cùng field,
 * không viết lại). KHÔNG cho sửa sản phẩm/vận chuyển/thanh toán — muốn đổi
 * những thứ đó phải vào order/form.jsx (nút Sửa ở đây trỏ sang đó).
 *
 * QUAN TRỌNG: khi Save, payload PUT /order/{id} KHÔNG có key `products`,
 * `carrier_code`, `payment_code` — đây chính là tín hiệu để
 * OrderAdminWriteService::save() hiểu là "update chỉ phần header" (giữ
 * nguyên sản phẩm/tổng tiền/vận chuyển/thanh toán cũ), xem OrderRequest.php
 * (`required_with:products`) và OrderAdminWriteService::buildOrderRow()
 * (fallback `$existing?->payment_code`/`carrier_code`).
 * -----------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spin, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Customer from '@/components/order/Customer';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { formatVnd } from '@/core/utils/orderPricing';

export default function OrderView() {
    const params = useParams();
    const t = useTranslation();
    const loading = useLoading();

    const id = parseInt(params.id, 10) || 0;
    const [objForm, setObjForm] = useState(null);
    const [resource, setResource] = useState({});
    const [detail, setDetail] = useState(null);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const inst = loading.open();

        const loadResource = Promise.all([
            api.get('/order-status').then((res) => res.data?.data || []),
            api.get('/zone').then((res) => res.data?.data || []),
        ]).then(([order_status, zone]) => setResource({ order_status, zone }));

        const loadDetail = api
            .get(`/order/${id}`)
            .then((res) => {
                const data = res.data?.data || {};
                setDetail(data);
                setObjForm({
                    id,
                    order_status_id: data.order_status_id,
                    send_mail: false,
                    note: '',
                    user_id: data.user_id || '',
                    full_name: data.full_name,
                    email: data.email,
                    telephone: data.telephone,
                    zone_id: data.zone_id || '',
                    district_id: data.district_id || '',
                    ward_id: data.ward_id || '',
                    address: data.address,
                    comment: data.comment || '',
                });
            })
            .catch((err) => {
                setLoadError(true);
                throw err;
            });

        Promise.all([loadResource, loadDetail])
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => {
                setLoader(true);
                inst.close();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const patchForm = (patch) => setObjForm((f) => ({ ...f, ...patch }));

    const save = () => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const body = {
                    order_status_id: objForm.order_status_id,
                    send_mail: objForm.send_mail,
                    note: objForm.note,
                    user_id: objForm.user_id || null,
                    full_name: objForm.full_name,
                    email: objForm.email,
                    telephone: objForm.telephone,
                    zone_id: objForm.zone_id,
                    district_id: objForm.district_id,
                    ward_id: objForm.ward_id,
                    address: objForm.address,
                    comment: objForm.comment,
                };
                api
                    .put(`/order/${id}`, body)
                    .then(() => {
                        success(t('SaveSuccess')).then(() => window.location.reload());
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) {
                            setErrors(err.response.data?.errors || {});
                            showError(t('ErrorSaveAction'));
                        } else {
                            showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                        }
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    if (!loader || !objForm) {
        return (
            <Wrapper title={t('OrderDetail')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    if (loadError || !detail) {
        return (
            <Wrapper title={t('OrderDetail')} sapo="">
                <div className="card m-b-20">
                    <div className="card-body p-5 text-center text-danger">
                        {t('ErrorAction')}
                        <br />
                        <Link to="/order/list" className="btn btn-secondary mt-3">
                            {t('Cancel')}
                        </Link>
                    </div>
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={`${t('OrderDetail')} #${detail.id} - ${detail.invoice_no}`} sapo="">
            <div className="row">
                <div className="col-xl-8">
                    <div className="card m-b-20">
                        <div className="card-body">
                            <Customer order={objForm} resource={resource} errors={errors} onChange={patchForm} />
                        </div>
                    </div>

                    <div className="card m-b-20">
                        <div className="card-body">
                            <h5>{t('Product')}</h5>
                            <table className="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>{t('Product')}</th>
                                        <th style={{ width: 100 }}>{t('Quantity')}</th>
                                        <th style={{ width: 150 }}>{t('UnitPrice')}</th>
                                        <th style={{ width: 150 }}>{t('Total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(detail.orders_products || []).map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                {p.name}
                                                {(p.options || []).map((o, i) => (
                                                    <div key={i} className="text-muted" style={{ fontSize: 12 }}>
                                                        - {o.name}: {o.value}
                                                    </div>
                                                ))}
                                            </td>
                                            <td>{p.quantity}</td>
                                            <td>{formatVnd(p.price)}</td>
                                            <td>{formatVnd(p.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {(detail.orders_totals || []).map((row, i) => (
                                        <tr key={i} className={row.code === 'total' ? 'font-weight-bold' : ''}>
                                            <td colSpan={3} className="text-right">
                                                {row.title}
                                            </td>
                                            <td>{formatVnd(row.value)}</td>
                                        </tr>
                                    ))}
                                </tfoot>
                            </table>
                            <div className="text-muted" style={{ fontSize: 13 }}>
                                {t('Note_CannotEditProductsHere')} <Link to={`/order/${detail.id}`}>{t('EditOrder')}</Link>.
                            </div>
                        </div>
                    </div>

                    <div className="row mt-3 text-right">
                        <div className="col-xl-12">
                            <Button type="primary" onClick={save}>
                                {t('Save')}
                            </Button>
                            &nbsp;
                            <Link to="/order/list" className="btn btn-danger">
                                {t('Cancel')}
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="col-xl-4">
                    <div className="card m-b-20">
                        <div className="card-body">
                            <h5>{t('OrderInfo')}</h5>
                            <p className="mb-1">
                                <b>{t('ShippingCarrier')}:</b> {detail.carrier_name || detail.carrier_code || '-'}
                            </p>
                            <p className="mb-1">
                                <b>{t('PaymentMethod')}:</b> {detail.payment_name || detail.payment_code || '-'}
                            </p>
                            <p className="mb-1">
                                <b>{t('DateCreated')}:</b> {detail.created_at}
                            </p>
                            <p className="mb-1">
                                <b>{t('DateUpdated')}:</b> {detail.updated_at}
                            </p>
                        </div>
                    </div>

                    <div className="card m-b-20">
                        <div className="card-body">
                            <h5>{t('OrderHistory')}</h5>
                            <ul className="list-unstyled">
                                {(detail.orders_histories || []).map((h) => (
                                    <li key={h.id} className="mb-2 pb-2 border-bottom">
                                        <div>
                                            <b>{h.order_status_name}</b> — {h.created_at}
                                        </div>
                                        {h.user_email && <div className="text-muted">{h.user_email}</div>}
                                        {h.comment && <div>{h.comment}</div>}
                                        {h.notify && <span className="badge badge-info">{t('SendMailToCustomer')}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </Wrapper>
    );
}
