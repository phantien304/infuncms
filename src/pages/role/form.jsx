/**
 * pages/role/form.jsx — THÊM/SỬA role + ma trận quyền (REST chuẩn).
 * -----------------------------------------------------------
 *   GET  /role/{id}   (chi tiết, res.data.data.permission_ids)
 *   POST /role        (tạo → 201, body { name, permission_ids })
 *   PUT  /role/{id}   (sửa,        body { name, permission_ids })
 * Lỗi validate: 422 { errors }. Lỗi nghiệp vụ (tự khoá — RoleSelfLockoutException):
 * 422 { message } KHÔNG có `errors` (chặn ở Service, không phải FormRequest)
 * — xem RoleController::store/update (catch riêng, response 422 chỉ message).
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import PermissionMatrix from '@/components/role/PermissionMatrix';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

export default function RoleForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        name: '',
        permission_ids: [],
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/role/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        id: data.id,
                        name: data.name || '',
                        permission_ids: data.permission_ids || [],
                    });
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
                    name: objForm.name,
                    permission_ids: objForm.permission_ids,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/role/${objForm.id}`, payload)
                        : api.post('/role', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/role/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/role/${newId}`);
                            }
                        });
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) {
                            setErrors(err.response.data?.errors || {});
                            // RoleSelfLockoutException / RoleInUseException: 422
                            // KHÔNG có `errors`, chỉ `message` — vẫn phải hiện
                            // cho user thấy vì sao save thất bại.
                            if (!err.response.data?.errors) {
                                showError(err.response.data?.message || t('ErrorSaveAction'));
                                return;
                            }
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
            <Wrapper title={t('AddRole')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditRole') : t('AddRole')} sapo="">
            <div className="role-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Name')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.name}
                            placeholder={t('Name')}
                            onChange={(e) => setField('name', e.target.value)}
                        />
                        {errOf('name') && (
                            <span className="has-error">{errOf('name')}</span>
                        )}
                    </div>
                </div>

                <h3 className="mt-5 header-title">{t('Permissions')}</h3>
                <PermissionMatrix
                    value={objForm.permission_ids}
                    onChange={(ids) => setField('permission_ids', ids)}
                />

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/role/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
