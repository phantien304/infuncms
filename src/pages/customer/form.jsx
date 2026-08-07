/**
 * pages/customer/form.jsx — THÊM/SỬA khách hàng (REST chuẩn).
 * -----------------------------------------------------------
 * Mirror pages/user/form.jsx (Phase 2.3/3.3 pattern) nhưng cho member
 * (type=2 — App\Enums\UserType::Member), theo yêu cầu user "Đầy đủ CRUD như
 * màn User admin" (docs/ROLE-PERMISSION-PLAN.md phần mở rộng sau Phase 4).
 * Khác User: KHÔNG có username/role_ids, THÊM phone/address/sex/newsletter/
 * user_group_id. Password: required lúc tạo, để trống lúc sửa = giữ nguyên
 * (khớp CustomerRequest backend).
 *
 *   GET  /customer/{id}          (chi tiết)
 *   GET  /user-group?per_page=1000 (danh sách nhóm khách hàng cho dropdown)
 *   POST /customer                (tạo → 201)
 *   PUT  /customer/{id}           (sửa, password rỗng/omit = giữ nguyên)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Checkbox, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Photo from '@/components/ui/Photo';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

export default function CustomerForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        email: '',
        password: '',
        full_name: '',
        avatar: '',
        phone: '',
        address: '',
        sex: null,
        newsletter: 0,
        user_group_id: null,
        status: 1,
    });
    const [listUserGroup, setListUserGroup] = useState([]);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const loadUserGroups = useCallback(() => {
        return api
            .get('/user-group', { params: { per_page: 1000 } })
            .then((res) => setListUserGroup(res.data?.data || []))
            .catch(() => {});
    }, []);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/customer/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm((f) => ({
                        ...f,
                        ...data,
                        password: '',
                    }));
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
        loadUserGroups();
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) =>
        setObjForm((f) => ({ ...f, [field]: value }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    email: objForm.email,
                    full_name: objForm.full_name,
                    avatar: objForm.avatar,
                    phone: objForm.phone || null,
                    address: objForm.address || null,
                    sex: objForm.sex,
                    newsletter: objForm.newsletter ? 1 : 0,
                    user_group_id: objForm.user_group_id,
                    status: objForm.status,
                };
                // password rỗng lúc sửa = giữ nguyên, KHÔNG gửi field này lên
                // (giống UserForm — CustomerRequest rule 'nullable' vẫn chạy
                // qua min:8 nếu có mặt key, gửi thiếu key an toàn hơn).
                if (objForm.password) payload.password = objForm.password;

                const req =
                    objForm.id > 0
                        ? api.put(`/customer/${objForm.id}`, payload)
                        : api.post('/customer', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/customer/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/customer/${newId}`);
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
            <Wrapper title={t('AddCustomer')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditCustomer') : t('AddCustomer')} sapo="">
            <div className="customer-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Avatar')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Photo
                            src={objForm.avatar}
                            width="120px"
                            height="120px"
                            showDelete
                            onChange={(url) => setField('avatar', url)}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('FullName')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.full_name}
                            placeholder={t('FullName')}
                            onChange={(e) => setField('full_name', e.target.value)}
                        />
                        {errOf('full_name') && (
                            <span className="has-error">{errOf('full_name')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Email')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.email}
                            placeholder={t('Email')}
                            onChange={(e) => setField('email', e.target.value)}
                        />
                        {errOf('email') && (
                            <span className="has-error">{errOf('email')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Password')}
                            {objForm.id === 0 && <span className="text-danger">&nbsp;*</span>}
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input.Password
                            value={objForm.password}
                            placeholder={
                                objForm.id > 0 ? t('LeaveBlankToKeepPassword') : t('Password')
                            }
                            autoComplete="new-password"
                            onChange={(e) => setField('password', e.target.value)}
                        />
                        {errOf('password') && (
                            <span className="has-error">{errOf('password')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Phone')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.phone || ''}
                            placeholder={t('Phone')}
                            onChange={(e) => setField('phone', e.target.value)}
                        />
                        {errOf('phone') && (
                            <span className="has-error">{errOf('phone')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Address')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input.TextArea
                            rows={3}
                            value={objForm.address || ''}
                            placeholder={t('Address')}
                            onChange={(e) => setField('address', e.target.value)}
                        />
                        {errOf('address') && (
                            <span className="has-error">{errOf('address')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Sex')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            allowClear
                            style={{ width: 200 }}
                            placeholder={t('Select')}
                            value={objForm.sex}
                            onChange={(val) => setField('sex', val ?? null)}
                            options={[
                                { label: t('Male'), value: 1 },
                                { label: t('Female'), value: 0 },
                            ]}
                        />
                        {errOf('sex') && <span className="has-error">{errOf('sex')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('UserGroup')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            allowClear
                            style={{ width: '100%' }}
                            placeholder={t('Select')}
                            optionFilterProp="label"
                            value={objForm.user_group_id}
                            onChange={(val) => setField('user_group_id', val ?? null)}
                            options={listUserGroup.map((g) => ({
                                label: g.name,
                                value: g.id,
                            }))}
                        />
                        {errOf('user_group_id') && (
                            <span className="has-error">{errOf('user_group_id')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Newsletter')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Checkbox
                            checked={!!objForm.newsletter}
                            onChange={(e) => setField('newsletter', e.target.checked)}
                        >
                            {t('Subscribe')}
                        </Checkbox>
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Status')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: 200 }}
                            value={objForm.status}
                            onChange={(val) => setField('status', val)}
                            options={[
                                { label: t('Active'), value: 1 },
                                { label: t('DeActive'), value: 0 },
                            ]}
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
                    <Link to="/customer/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
