/**
 * components/setting/Order.jsx — tab "Order" của setting/detail.jsx.
 * -----------------------------------------------------------
 * Convert từ mt219 resources/js/cms/components/setting/subForm/order.vue.
 *
 * Thêm mới so với mt219 (key đã có sẵn trong bảng `setting`, chưa có ô nhập
 * ở form Vue2 cũ):
 *   - config_warehouse_id : kho mặc định dùng khi ghi product_stock/
 *     stock_movement (xem migration 2026_07_08_000002_add_warehouse_id_setting).
 *     Hệ thống hiện chỉ có 1 kho (warehouse_id=1), CHƯA có bảng warehouses +
 *     CRUD riêng → nhập trực tiếp ID dạng số, không phải dropdown.
 *
 * Props:
 *   setting   : object config phẳng
 *   resource  : { order_status } — GET /order-status (đã có sẵn, dùng chung
 *               với order/form.jsx, KHÔNG qua /resource)
 *   onChange  : (patch) => void
 * -----------------------------------------------------------
 */

import React from 'react';
import { Select } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';

const YES_NO = [
    { value: 1, label: 'Yes' },
    { value: 0, label: 'No' },
];

export default function Order({ setting = {}, orderStatus = [], onChange }) {
    const t = useTranslation();

    const setField = (field, value) => onChange({ [field]: value });

    const text = (field) => (
        <input
            type="text"
            className="form-control"
            value={setting[field] ?? ''}
            onChange={(e) => setField(field, e.target.value)}
        />
    );

    const statusOptions = orderStatus.map((s) => ({ value: s.id, label: s.name }));

    const selectStatus = (field, multiple = false) => (
        <Select
            mode={multiple ? 'multiple' : undefined}
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="label"
            placeholder={t('Select')}
            value={
                multiple
                    ? setting[field] || []
                    : setting[field] === ''
                      ? undefined
                      : setting[field]
            }
            onChange={(v) => setField(field, v)}
            options={statusOptions}
        />
    );

    return (
        <div className="row mt-3">
            <div className="col-xl-12">
                <div className="card m-b-20">
                    <div className="card-body">
                        <div className="row mt-3">
                            <div className="col-xl-6">
                                <label className="tit">{t('ProductStockDisplay')}</label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={setting.config_stock_display}
                                    onChange={(v) => setField('config_stock_display', v)}
                                    options={YES_NO}
                                />
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('StockCheckout')}</label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={setting.config_stock_checkout}
                                    onChange={(v) => setField('config_stock_checkout', v)}
                                    options={YES_NO}
                                />
                            </div>
                        </div>
                        <div className="row mt-3">
                            <div className="col-xl-6">
                                <label className="tit">{t('InvoicePrefix')}</label>
                                {text('config_invoice_prefix')}
                            </div>
                            {/* Mới (chưa có ở form mt219) — bảng setting đã có sẵn key này. */}
                            <div className="col-xl-6">
                                <label className="tit">
                                    Kho mặc định (ID)
                                    <br />
                                    <small>Hệ thống hiện chỉ có 1 kho — để nguyên 1 nếu không chắc.</small>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={setting.config_warehouse_id ?? 1}
                                    onChange={(e) =>
                                        setField('config_warehouse_id', Number(e.target.value))
                                    }
                                />
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('CartTotalFreeShip')}</label>
                                {text('config_total_free_ship')}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('FeeShip')}</label>
                                {text('config_fee_ship')}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderStatusComplete')}</label>
                                {selectStatus('order_complete_status_id')}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderDefaultStatus')}</label>
                                {selectStatus('order_status_id')}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderCompleteStatusAll')}</label>
                                {selectStatus('order_complete_status_all', true)}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderPaymentSuccessStatus')}</label>
                                {selectStatus('order_payment_success_status_id')}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderPaymentFailedStatus')}</label>
                                {selectStatus('order_payment_failed_status_id')}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderPaymentWaitingStatus')}</label>
                                {selectStatus('order_payment_waiting_status_id')}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('OrderStatusMemberNotDelete')}</label>
                                {selectStatus('config_order_member_not_delete', true)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
