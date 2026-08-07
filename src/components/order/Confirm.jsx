/**
 * components/order/Confirm.jsx — tab "Xác nhận" của order/form.jsx.
 * -----------------------------------------------------------
 * Convert từ subForm/confirm.vue (mt219) — BỎ so với bản gốc:
 *   - Coupon/voucher/reward: xem OrderAdminWriteService header comment — logic
 *     giảm giá thật (PromotionService) session/customer-bound, không tái dùng
 *     an toàn cho đơn tạo tay từ CMS. Bỏ hẳn input thay vì hiện ô không chạy.
 *
 * Bảng tạm tính gọi POST /order/preview-total (KHÔNG ghi DB) — BE tính lại giá
 * TỪ ĐẦU theo product_id + option_value_ids + quantity (không tin giá FE),
 * nên đây là tổng tiền THẬT sẽ được lưu, không phải ước tính client-side như
 * ở tab Product (orderPricing.js).
 * -----------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { Select, Spin, Alert } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';
import api from '@/core/services/api';
import { formatVnd } from '@/core/utils/orderPricing';

export default function Confirm({ order, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();
    const errOf = (key) => errors?.[key]?.[0];

    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [previewError, setPreviewError] = useState('');

    const products = order.products || [];
    const ready = products.length > 0 && !!order.zone_id && !!order.district_id && !!order.ward_id && !!order.carrier_code;

    const runPreview = () => {
        if (!ready) return;
        setPreviewing(true);
        setPreviewError('');
        api
            .post('/order/preview-total', {
                products: products.map((p) => ({
                    product_id: p.product_id,
                    quantity: p.quantity,
                    option_value_ids: p.option_value_ids,
                    custom_options: p.custom_options,
                })),
                zone_id: order.zone_id,
                district_id: order.district_id,
                ward_id: order.ward_id,
                address: order.address,
                carrier_code: order.carrier_code,
            })
            .then((res) => setPreview(res.data?.data || null))
            .catch((err) => {
                setPreview(null);
                setPreviewError(err?.response?.data?.message || t('ErrorAction'));
            })
            .finally(() => setPreviewing(false));
    };

    // Tự tính lại mỗi khi đổi hãng vận chuyển / địa chỉ / danh sách sản phẩm —
    // đúng như comment ở OrderAdminWriteService::previewTotal().
    useEffect(() => {
        runPreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.carrier_code, order.zone_id, order.district_id, order.ward_id, JSON.stringify(products)]);

    return (
        <div className="mt-2">
            <div className="row mt-3">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('ShippingCarrier')} <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%', maxWidth: 320 }}
                        placeholder={t('Select')}
                        value={order.carrier_code || undefined}
                        onChange={(v) => onChange({ carrier_code: v })}
                        options={(resource.carrier || []).map((c) => ({ label: c.name, value: c.code }))}
                    />
                    {errOf('carrier_code') && <span className="has-error">{errOf('carrier_code')}</span>}
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('PaymentMethod')} <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%', maxWidth: 320 }}
                        placeholder={t('Select')}
                        value={order.payment_code || undefined}
                        onChange={(v) => onChange({ payment_code: v })}
                        options={(resource.payment || []).map((p) => ({ label: p.name, value: p.code }))}
                    />
                    {errOf('payment_code') && <span className="has-error">{errOf('payment_code')}</span>}
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">{t('OrderSummary')}</h5>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={!ready || previewing}
                            onClick={runPreview}
                        >
                            <i className="fa fa-sync" /> {t('RecalculateTotal')}
                        </button>
                    </div>

                    {!ready && <div className="text-muted mt-2">{t('PleaseCompleteCustomerAndProductFirst')}</div>}

                    {ready && previewing && (
                        <div className="p-3 text-center">
                            <Spin />
                        </div>
                    )}

                    {ready && !previewing && previewError && (
                        <Alert type="error" message={previewError} showIcon className="mt-2 mb-2" />
                    )}

                    {ready && !previewing && preview && (
                        <>
                            {!preview.shipping_fee_ok && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    className="mt-2 mb-2"
                                    message={t('ShippingFeeCalculationFailedDefaultZero')}
                                />
                            )}
                            <table className="table table-bordered mt-2">
                                <thead>
                                    <tr>
                                        <th>{t('Product')}</th>
                                        <th style={{ width: 100 }}>{t('Quantity')}</th>
                                        <th style={{ width: 150 }}>{t('UnitPrice')}</th>
                                        <th style={{ width: 150 }}>{t('Total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(preview.lines || []).map((l, i) => (
                                        <tr key={i}>
                                            <td>{l.name}</td>
                                            <td>{l.quantity}</td>
                                            <td>{formatVnd(l.price)}</td>
                                            <td>{formatVnd(l.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {(preview.totals_rows || []).map((r, i) => (
                                        <tr key={i} className={r.code === 'total' ? 'font-weight-bold' : ''}>
                                            <td colSpan={3} className="text-right">
                                                {r.title}
                                            </td>
                                            <td>{formatVnd(r.value)}</td>
                                        </tr>
                                    ))}
                                </tfoot>
                            </table>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
