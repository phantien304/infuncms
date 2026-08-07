/**
 * components/order/Customer.jsx — tab "Khách hàng" của order/form.jsx.
 * -----------------------------------------------------------
 * Convert từ subForm/customer.vue (mt219) — BỎ so với bản gốc:
 *   - Chọn Country: hệ thống hiện chỉ 1 country mặc định, không có
 *     CountryRepository/CRUD nào (xem OrderAdminWriteService header comment).
 *   - Nút "sinh lại mã hoá đơn": BE tự strtoupper(uniqid()) khi tạo đơn mới,
 *     không cần nhân viên bấm tay (invoice_no cũng không hiển thị được ở form
 *     thêm mới vì chưa có).
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Select, Checkbox, Input, Spin } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';
import api from '@/core/services/api';

export default function Customer({ order, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();
    const [customerOptions, setCustomerOptions] = useState([]);
    const [customerSearching, setCustomerSearching] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const searchTimer = useRef(null);

    const errOf = (key) => errors?.[key]?.[0];

    const searchCustomer = useCallback((keyword) => {
        setCustomerSearching(true);
        api
            .get('/user', { params: { keyword, type: 2, per_page: 20 } })
            .then((res) => {
                const users = res.data?.data || [];
                setCustomerOptions(
                    users.map((u) => ({
                        value: u.id,
                        label: u.full_name || u.email,
                        user: u,
                    }))
                );
            })
            .catch(() => {})
            .finally(() => setCustomerSearching(false));
    }, []);

    const onCustomerSearch = (keyword) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => searchCustomer(keyword), 300);
    };

    const onCustomerChange = (userId, option) => {
        const u = option?.user;
        onChange({
            user_id: userId ?? '',
            full_name: u?.full_name || order.full_name,
            email: u?.email || '',
            telephone: u?.telephone || '',
        });
    };

    // Cascading zone -> district -> ward. Nạp lại khi order.zone_id/district_id
    // đổi (kể cả khi load chi tiết đơn đã có sẵn địa chỉ).
    useEffect(() => {
        if (!order.zone_id) {
            setDistricts([]);
            return;
        }
        api
            .get('/district', { params: { zone_id: order.zone_id } })
            .then((res) => setDistricts(res.data?.data || []))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.zone_id]);

    useEffect(() => {
        if (!order.district_id) {
            setWards([]);
            return;
        }
        api
            .get('/ward', { params: { district_id: order.district_id } })
            .then((res) => setWards(res.data?.data || []))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.district_id]);

    return (
        <div className="mt-2">
            <div className="row mt-3">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('OrderStatus')} <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%', maxWidth: 320 }}
                        showSearch
                        optionFilterProp="label"
                        placeholder={t('Select')}
                        value={order.order_status_id || undefined}
                        onChange={(v) => onChange({ order_status_id: v })}
                        options={(resource.order_status || []).map((s) => ({ label: s.name, value: s.id }))}
                    />
                    {errOf('order_status_id') && <span className="has-error">{errOf('order_status_id')}</span>}
                    <div className="mt-2">
                        <Checkbox
                            checked={!!order.send_mail}
                            onChange={(e) => onChange({ send_mail: e.target.checked })}
                        >
                            {t('SendMailToCustomer')}
                        </Checkbox>
                    </div>
                    {order.send_mail && (
                        <Input.TextArea
                            className="mt-2"
                            rows={3}
                            placeholder={t('Note')}
                            value={order.note}
                            onChange={(e) => onChange({ note: e.target.value })}
                        />
                    )}
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('Customer')}</label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%' }}
                        showSearch
                        allowClear
                        placeholder={t('Customer')}
                        filterOption={false}
                        loading={customerSearching}
                        notFoundContent={customerSearching ? <Spin size="small" /> : null}
                        value={order.user_id || undefined}
                        labelInValue={false}
                        onSearch={onCustomerSearch}
                        onFocus={() => {
                            if (!customerOptions.length) searchCustomer('');
                        }}
                        onChange={(val, option) => onCustomerChange(val, option)}
                        options={customerOptions}
                    />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('FullName')} <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <Input
                        placeholder={t('Name')}
                        value={order.full_name}
                        onChange={(e) => onChange({ full_name: e.target.value })}
                    />
                    {errOf('full_name') && <span className="has-error">{errOf('full_name')}</span>}
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('Email')}</label>
                </div>
                <div className="col-xl-10">
                    <Input placeholder={t('Email')} value={order.email} onChange={(e) => onChange({ email: e.target.value })} />
                    {errOf('email') && <span className="has-error">{errOf('email')}</span>}
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('Telephone')} <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <Input
                        placeholder={t('Telephone')}
                        value={order.telephone}
                        onChange={(e) => onChange({ telephone: e.target.value })}
                    />
                    {errOf('telephone') && <span className="has-error">{errOf('telephone')}</span>}
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('Address')} <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <div className="row">
                        <div className="col-xl-4">
                            <Select
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('SelectProvince')}
                                value={order.zone_id || undefined}
                                onChange={(v) => onChange({ zone_id: v, district_id: '', ward_id: '' })}
                                options={(resource.zone || []).map((z) => ({ label: z.name, value: z.id }))}
                            />
                            {errOf('zone_id') && <span className="has-error">{errOf('zone_id')}</span>}
                        </div>
                        <div className="col-xl-4">
                            <Select
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('SelectDistrict')}
                                value={order.district_id || undefined}
                                onChange={(v) => onChange({ district_id: v, ward_id: '' })}
                                options={districts.map((d) => ({ label: d.name, value: d.id }))}
                            />
                            {errOf('district_id') && <span className="has-error">{errOf('district_id')}</span>}
                        </div>
                        <div className="col-xl-4">
                            <Select
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('SelectWard')}
                                value={order.ward_id || undefined}
                                onChange={(v) => onChange({ ward_id: v })}
                                options={wards.map((w) => ({ label: w.name, value: w.id }))}
                            />
                            {errOf('ward_id') && <span className="has-error">{errOf('ward_id')}</span>}
                        </div>
                    </div>
                    <div className="row mt-2">
                        <div className="col-xl-12">
                            <Input
                                placeholder={t('Address')}
                                value={order.address}
                                onChange={(e) => onChange({ address: e.target.value })}
                            />
                            {errOf('address') && <span className="has-error">{errOf('address')}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('Comment')}</label>
                </div>
                <div className="col-xl-10">
                    <Input.TextArea rows={3} value={order.comment} onChange={(e) => onChange({ comment: e.target.value })} />
                </div>
            </div>
        </div>
    );
}
