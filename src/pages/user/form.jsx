/**
 * pages/user/form.jsx — THÊM/SỬA tài khoản quản trị CMS (REST chuẩn).
 * -----------------------------------------------------------
 * Phase 6.2 "Multi-role" (khuyến nghị, đã chốt) — role_ids là mảng, Select
 * mode="multiple" (không phải single). Password: required lúc tạo, để
 * trống lúc sửa = giữ nguyên mật khẩu cũ (khớp UserRequest backend).
 *
 *   GET  /user/{id}          (chi tiết, res.data.data.roles: [{id,name}])
 *   GET  /role?per_page=1000 (danh sách role cho multi-select)
 *   POST /user                (tạo → 201, body { username, email, password,
 *                               full_name, avatar, status, role_ids })
 *   PUT  /user/{id}            (sửa, password rỗng/omit = giữ nguyên)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Photo from '@/components/ui/Photo';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

export default function UserForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        username: '',
        email: '',
        password: '',
        full_name: '',
        avatar: '',
        status: 1,
        role_ids: [],
    });
    const [listRole, setListRole] = useState([]);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const loadRoles = useCallback(() => {
        return api
            .get('/role', { params: { per_page: 1000 } })
            .then((res) => setListRole(res.data?.data || []))
            .catch(() => {});
    }, []);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/user/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm((f) => ({
                        ...f,
                        ...data,
                        password: '',
                        role_ids: (data.roles || []).map((r) => r.id),
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
        loadRoles();
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
                    username: objForm.username || null,
                    email: objForm.email,
                    full_name: objForm.full_name,
                    avatar: objForm.avatar,
                    status: objForm.status,
                    role_ids: objForm.role_ids,
                };
                // password rỗng lúc sửa = giữ nguyên, KHÔNG gửi field này lên
                // (khác gửi '' — UserRequest rule 'nullable' vẫn chạy qua
                // min:8 nếu có mặt key, gửi thiếu key an toàn hơn).
                if (objForm.password) payload.password = objForm.password;

                const req =
                    objForm.id > 0
                        ? api.put(`/user/${objForm.id}`, payload)
                        : api.post('/user', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/user/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/user/${newId}`);
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
            <Wrapper title={t('AddUser')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditUser') : t('AddUser')} sapo="">
            <div className="user-form">
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
                        <label className="tit">{t('Username')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.username || ''}
                            placeholder={t('Username')}
                            onChange={(e) => setField('username', e.target.value)}
                        />
                        {errOf('username') && (
                            <span className="has-error">{errOf('username')}</span>
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
                        <label className="tit">{t('Roles')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder={t('Select')}
                            optionFilterProp="label"
                            value={objForm.role_ids}
                            onChange={(val) => setField('role_ids', val)}
                            options={listRole.map((r) => ({
                                label: r.name,
                                value: r.id,
                            }))}
                        />
                        {errOf('role_ids') && (
                            <span className="has-error">{errOf('role_ids')}</span>
                        )}
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
                    <Link to="/user/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
