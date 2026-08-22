/**
 * pages/reviewTag/form.jsx — THÊM/SỬA nhãn review. Mirror
 * pages/reviewCriteria/form.jsx. `usage_count` CHỈ HIỂN THỊ (đếm thật từ
 * review_tag_pivot, backend không nhận field này từ CMS — sửa tay sẽ làm
 * sai lệch số liệu thật).
 * -----------------------------------------------------------
 *   GET  /review-tag/{id}   (chi tiết)
 *   POST /review-tag        (tạo → 201)
 *   PUT  /review-tag/{id}   (sửa)
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

const emptyDescription = (code) => ({ language_code: code, name: '' });

export default function ReviewTagForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        code: '',
        usage_count: 0,
        is_auto_generated: false,
        is_active: true,
        review_tag_descriptions: [],
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
                .get(`/review-tag/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        review_tag_descriptions: buildDescriptions(
                            data.review_tag_descriptions || []
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
                review_tag_descriptions: buildDescriptions([]),
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
            review_tag_descriptions: f.review_tag_descriptions.map((d, i) =>
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
                    is_auto_generated: objForm.is_auto_generated,
                    is_active: objForm.is_active,
                    review_tag_descriptions: objForm.review_tag_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/review-tag/${objForm.id}`, payload)
                        : api.post('/review-tag', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/review-tag/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/review-tag/${newId}`);
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
            <Wrapper title={t('AddReviewTag')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditReviewTag') : t('AddReviewTag')} sapo="">
            <div className="review-tag-form">
                <h3 className="mt-0 header-title">{t('ReviewTag')}</h3>

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

                {objForm.id > 0 && (
                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('UsageCount')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input value={objForm.usage_count} readOnly />
                        </div>
                    </div>
                )}

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('AutoGenerated')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Switch
                            checked={objForm.is_auto_generated}
                            onChange={(checked) => setField('is_auto_generated', checked)}
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
                        objForm.review_tag_descriptions[index] || emptyDescription(lang.code);
                    return (
                        <div className="row mt-3 pt-3 border-top" key={lang.code}>
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
                                {errOf(`review_tag_descriptions.${index}.name`) && (
                                    <span className="has-error">
                                        {errOf(`review_tag_descriptions.${index}.name`)}
                                    </span>
                                )}
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
                    <Link to="/review-tag/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
