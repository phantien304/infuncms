/**
 * pages/reviewCriteria/form.jsx — THÊM/SỬA tiêu chí chấm điểm review.
 * Mirror pages/filter/form.jsx (Input theo ngôn ngữ), rút gọn: KHÔNG có
 * bảng values con — chỉ description gồm name+hint theo từng ngôn ngữ.
 * -----------------------------------------------------------
 *   GET  /review-criteria/{id}   (chi tiết)
 *   POST /review-criteria        (tạo → 201)
 *   PUT  /review-criteria/{id}   (sửa)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Switch, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages, useLanguageDefault } from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({ language_code: code, name: '', hint: '' });

export default function ReviewCriteriaForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        code: '',
        icon: '',
        sort_order: '',
        is_required: false,
        is_active: true,
        review_criteria_descriptions: [],
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

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
                .get(`/review-criteria/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        review_criteria_descriptions: buildDescriptions(
                            data.review_criteria_descriptions || []
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
                review_criteria_descriptions: buildDescriptions([]),
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

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            review_criteria_descriptions: f.review_criteria_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    code: objForm.code,
                    icon: objForm.icon,
                    sort_order: objForm.sort_order || 0,
                    is_required: objForm.is_required,
                    is_active: objForm.is_active,
                    review_criteria_descriptions: objForm.review_criteria_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/review-criteria/${objForm.id}`, payload)
                        : api.post('/review-criteria', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/review-criteria/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/review-criteria/${newId}`);
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
            <Wrapper title={t('AddReviewCriteria')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper
            title={objForm.id > 0 ? t('EditReviewCriteria') : t('AddReviewCriteria')}
            sapo=""
        >
            <div className="review-criteria-form">
                <h3 className="mt-0 header-title">{t('ReviewCriteria')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Code')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.code}
                            placeholder={t('Code')}
                            onChange={(e) => setField('code', e.target.value)}
                        />
                        {errOf('code') && <span className="has-error">{errOf('code')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Icon')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.icon}
                            placeholder={t('Icon')}
                            onChange={(e) => setField('icon', e.target.value)}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('SortOrder')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.sort_order}
                            placeholder={t('SortOrder')}
                            onChange={(e) => setField('sort_order', e.target.value)}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Required')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Switch
                            checked={objForm.is_required}
                            onChange={(checked) => setField('is_required', checked)}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Active')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Switch
                            checked={objForm.is_active}
                            onChange={(checked) => setField('is_active', checked)}
                        />
                    </div>
                </div>

                {listLanguages.map((lang, index) => {
                    const desc =
                        objForm.review_criteria_descriptions[index] || emptyDescription(lang.code);
                    return (
                        <div key={lang.code}>
                            <div className="row mt-3 pt-3 border-top">
                                <div className="col-xl-2 text-right">
                                    <label className="tit">
                                        {t('Name')} ({lang.name})
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
                                    {errOf(`review_criteria_descriptions.${index}.name`) && (
                                        <span className="has-error">
                                            {errOf(`review_criteria_descriptions.${index}.name`)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-xl-2 text-right">
                                    <label className="tit">
                                        {t('Hint')} ({lang.name})
                                    </label>
                                </div>
                                <div className="col-xl-10">
                                    <Input
                                        value={desc.hint}
                                        placeholder={t('Hint')}
                                        onChange={(e) => setDesc(index, 'hint', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/review-criteria/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
