/**
 * pages/warehouse/form.jsx — THÊM/SỬA warehouse (REST chuẩn).
 * -----------------------------------------------------------
 * Đa kho — quản lý danh sách kho cho product_stock.warehouse_id. Warehouse
 * KHÔNG có bảng dịch (chỉ field phẳng), khác Category — bỏ hẳn phần
 * Tabs/*_descriptions của category/form.jsx.
 *
 * Gọi REST qua `api`:
 *   GET  /warehouse/{id}   (chi tiết)
 *   POST /warehouse        (tạo → 201, res.data.data.id)
 *   PUT  /warehouse/{id}   (sửa)
 * Cascading Zone → District → Ward: cùng pattern components/order/Customer.jsx.
 * Lỗi validate: 422 { errors: { code: [...] } }.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, InputNumber, Select, Switch, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

const emptyForm = (id) => ({
    id,
    code: '',
    name: '',
    address: '',
    zone_id: '',
    district_id: '',
    ward_id: '',
    telephone: '',
    priority: 0,
    is_active: true,
    is_sellable: true,
});

export default function WarehouseForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState(() => emptyForm(parseInt(params.id, 10) || 0));
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/warehouse/${objForm.id}`)
                .then((res) => {
                    setObjForm({ ...emptyForm(objForm.id), ...(res.data?.data || {}) });
                    setLoader(true);
                })
                .catch((err) => {
                    setLoader(true);
                    showError(t(err?.response?.data?.message || 'ErrorAction'));
                })
                .finally(() => inst.close());
        } else {
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id]);

    useEffect(() => {
        api.get('/zone').then((res) => setZones(res.data?.data || [])).catch(() => {});
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cascading zone -> district -> ward — nạp lại khi đổi (kể cả lúc load
    // chi tiết kho đã có sẵn địa chỉ).
    useEffect(() => {
        if (!objForm.zone_id) {
            setDistricts([]);
            return;
        }
        api
            .get('/district', { params: { zone_id: objForm.zone_id } })
            .then((res) => setDistricts(res.data?.data || []))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.zone_id]);

    useEffect(() => {
        if (!objForm.district_id) {
            setWards([]);
            return;
        }
        api
            .get('/ward', { params: { district_id: objForm.district_id } })
            .then((res) => setWards(res.data?.data || []))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.district_id]);

    const setField = (field, value) =>
        setObjForm((f) => ({ ...f, [field]: value }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    code: objForm.code,
                    name: objForm.name,
                    address: objForm.address,
                    zone_id: objForm.zone_id || null,
                    district_id: objForm.district_id || null,
                    ward_id: objForm.ward_id || null,
                    telephone: objForm.telephone,
                    priority: objForm.priority || 0,
                    is_active: objForm.is_active,
                    is_sellable: objForm.is_sellable,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/warehouse/${objForm.id}`, payload)
                        : api.post('/warehouse', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/warehouse/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/warehouse/${newId}`);
                            }
                        });
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) {
                            setErrors(err.response.data?.errors || {});
                        }
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const errOf = (key) => errors?.[key]?.[0];

    if (!loader) {
        return (
            <Wrapper title={t('AddWarehouse')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditWarehouse') : t('AddWarehouse')} sapo="">
            <div className="warehouse-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Code')} <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            style={{ maxWidth: 320 }}
                            value={objForm.code}
                            placeholder={t('Code')}
                            onChange={(e) => setField('code', e.target.value)}
                        />
                        {errOf('code') && <span className="has-error">{errOf('code')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Name')} <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.name}
                            placeholder={t('Name')}
                            onChange={(e) => setField('name', e.target.value)}
                        />
                        {errOf('name') && <span className="has-error">{errOf('name')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Telephone')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            style={{ maxWidth: 320 }}
                            value={objForm.telephone}
                            placeholder={t('Telephone')}
                            onChange={(e) => setField('telephone', e.target.value)}
                        />
                        {errOf('telephone') && <span className="has-error">{errOf('telephone')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Address')}</label>
                    </div>
                    <div className="col-xl-10">
                        <div className="row">
                            <div className="col-xl-4">
                                <Select
                                    style={{ width: '100%' }}
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    placeholder={t('SelectProvince')}
                                    value={objForm.zone_id || undefined}
                                    onChange={(v) =>
                                        setObjForm((f) => ({ ...f, zone_id: v ?? '', district_id: '', ward_id: '' }))
                                    }
                                    options={zones.map((z) => ({ label: z.name, value: z.id }))}
                                />
                                {errOf('zone_id') && <span className="has-error">{errOf('zone_id')}</span>}
                            </div>
                            <div className="col-xl-4">
                                <Select
                                    style={{ width: '100%' }}
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    placeholder={t('SelectDistrict')}
                                    value={objForm.district_id || undefined}
                                    onChange={(v) => setObjForm((f) => ({ ...f, district_id: v ?? '', ward_id: '' }))}
                                    options={districts.map((d) => ({ label: d.name, value: d.id }))}
                                />
                                {errOf('district_id') && <span className="has-error">{errOf('district_id')}</span>}
                            </div>
                            <div className="col-xl-4">
                                <Select
                                    style={{ width: '100%' }}
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    placeholder={t('SelectWard')}
                                    value={objForm.ward_id || undefined}
                                    onChange={(v) => setField('ward_id', v ?? '')}
                                    options={wards.map((w) => ({ label: w.name, value: w.id }))}
                                />
                                {errOf('ward_id') && <span className="has-error">{errOf('ward_id')}</span>}
                            </div>
                        </div>
                        <div className="row mt-2">
                            <div className="col-xl-12">
                                <Input
                                    placeholder={t('Address')}
                                    value={objForm.address}
                                    onChange={(e) => setField('address', e.target.value)}
                                />
                                {errOf('address') && <span className="has-error">{errOf('address')}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Priority')}</label>
                    </div>
                    <div className="col-xl-10">
                        <InputNumber
                            style={{ width: 150 }}
                            min={0}
                            value={objForm.priority}
                            onChange={(v) => setField('priority', v ?? 0)}
                        />
                        {errOf('priority') && <span className="has-error">{errOf('priority')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('IsActive')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Switch
                            checked={!!objForm.is_active}
                            onChange={(v) => setField('is_active', v)}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('IsSellable')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Switch
                            checked={!!objForm.is_sellable}
                            onChange={(v) => setField('is_sellable', v)}
                        />
                    </div>
                </div>

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/warehouse/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
