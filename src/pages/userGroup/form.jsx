/**
 * pages/userGroup/form.jsx — THÊM/SỬA user_group (REST chuẩn).
 * -----------------------------------------------------------
 * Mirror pages/category/form.jsx — cùng shape i18n (user_group_descriptions
 * theo language_code). Khác: field approval (checkbox) + sort_order thay
 * vì parent_id/icon/image; không có ảnh.
 *
 *   GET  /user-group/{id}   (chi tiết, res.data.data kèm user_group_descriptions)
 *   POST /user-group        (tạo → 201, res.data.data.id)
 *   PUT  /user-group/{id}   (sửa)
 * Lỗi validate: 422 { errors: { 'user_group_descriptions.0.name': [...] } }.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Checkbox, Tabs, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    useListLanguages,
    useLanguageDefault,
} from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({
    language_code: code,
    name: '',
    description: '',
});

export default function UserGroupForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        approval: 1,
        sort_order: '',
        user_group_descriptions: [],
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);
    const [activeKey, setActiveKey] = useState('0');

    const buildDescriptions = useCallback(
        (existing = []) =>
            listLanguages.map(
                (lang) =>
                    existing.find((d) => d.language_code === lang.code) ||
                    emptyDescription(lang.code)
            ),
        [listLanguages]
    );

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/user-group/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        user_group_descriptions: buildDescriptions(
                            data.user_group_descriptions || []
                        ),
                    });
                    setLoader(true);
                })
                .catch((err) => {
                    setLoader(true);
                    showError(t(err?.response?.data?.message || 'ErrorAction'));
                })
                .finally(() => inst.close());
        } else {
            setObjForm((f) => ({
                ...f,
                user_group_descriptions: buildDescriptions([]),
            }));
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id, buildDescriptions]);

    useEffect(() => {
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) =>
        setObjForm((f) => ({ ...f, [field]: value }));

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            user_group_descriptions: f.user_group_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    approval: objForm.approval ? 1 : 0,
                    sort_order: objForm.sort_order || 0,
                    user_group_descriptions: objForm.user_group_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/user-group/${objForm.id}`, payload)
                        : api.post('/user-group', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/user-group/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/user-group/${newId}`);
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
            <Wrapper title={t('AddUserGroup')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const languageTabs = listLanguages.map((lang, index) => {
        const desc =
            objForm.user_group_descriptions[index] || emptyDescription(lang.code);
        return {
            key: String(index),
            label: lang.name,
            children: (
                <div>
                    <div className="row mt-3">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Name')}
                                {lang.code === languageDefault && (
                                    <span className="text-danger">&nbsp;*</span>
                                )}
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={desc.name}
                                placeholder={t('Name')}
                                onChange={(e) => setDesc(index, 'name', e.target.value)}
                            />
                            {errOf(`user_group_descriptions.${index}.name`) && (
                                <span className="has-error">
                                    {errOf(`user_group_descriptions.${index}.name`)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Description')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={desc.description}
                                onChange={(e) =>
                                    setDesc(index, 'description', e.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>
            ),
        };
    });

    return (
        <Wrapper
            title={objForm.id > 0 ? t('EditUserGroup') : t('AddUserGroup')}
            sapo=""
        >
            <div className="user-group-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('SortOrder')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.sort_order}
                            placeholder={t('Position')}
                            onChange={(e) => setField('sort_order', e.target.value)}
                        />
                        {errOf('sort_order') && (
                            <span className="has-error">{errOf('sort_order')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Approval')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Checkbox
                            checked={!!objForm.approval}
                            onChange={(e) => setField('approval', e.target.checked)}
                        >
                            {t('Active')}
                        </Checkbox>
                    </div>
                </div>

                <h3 className="mt-5 header-title">{t('Content')}</h3>
                <Tabs activeKey={activeKey} onChange={setActiveKey} items={languageTabs} />

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/user-group/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
