/**
 * pages/filter/form.jsx — THÊM/SỬA filter (REST chuẩn, convert từ mt219
 * cms/components/filter/form.vue).
 * -----------------------------------------------------------
 * Gọi REST qua `api`:
 *   GET  /filter/{id}   (chi tiết, res.data.data kèm filter_descriptions +
 *                        filter_values[].filter_value_descriptions)
 *   POST /filter        (tạo → 201, res.data.data.id)
 *   PUT  /filter/{id}   (sửa)
 * Lỗi validate: 422 { errors: { 'filter_descriptions.0.name': [...],
 *   'filter_values.0.filter_value_descriptions.0.name': [...] } }.
 * Lỗi 422 khác: xoá 1 filter_value đang được sản phẩm dùng (product_filter
 * có FK RESTRICT) → message thẳng ở err.response.data.message, không có
 * `errors` field.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import FilterValues, { buildValueDescriptions } from '@/components/filter/FilterValues';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages, useLanguageDefault } from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({ language_code: code, name: '' });

export default function FilterForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        sort_order: '',
        filter_descriptions: [],
        filter_values: [],
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

    const buildValues = useCallback(
        (existing = []) =>
            existing.map((v) => ({
                ...v,
                filter_value_descriptions: buildValueDescriptions(
                    listLanguages,
                    v.filter_value_descriptions || []
                ),
            })),
        [listLanguages]
    );

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/filter/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        filter_descriptions: buildDescriptions(data.filter_descriptions || []),
                        filter_values: buildValues(data.filter_values || []),
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
                filter_descriptions: buildDescriptions([]),
            }));
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id, buildDescriptions, buildValues]);

    useEffect(() => {
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            filter_descriptions: f.filter_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    sort_order: objForm.sort_order || 0,
                    filter_descriptions: objForm.filter_descriptions,
                    filter_values: objForm.filter_values,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/filter/${objForm.id}`, payload)
                        : api.post('/filter', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/filter/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/filter/${newId}`);
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
            <Wrapper title={t('AddFilter')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditFilter') : t('AddFilter')} sapo="">
            <div className="filter-form">
                <h3 className="mt-0 header-title">{t('FilterGroup')}</h3>

                {listLanguages.map((lang, index) => {
                    const desc = objForm.filter_descriptions[index] || emptyDescription(lang.code);
                    return (
                        <div className="row mt-3" key={lang.code}>
                            <div className="col-xl-2 text-right">
                                <label className="tit">
                                    {t('FilterGroupName')} ({lang.name})
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
                                {errOf(`filter_descriptions.${index}.name`) && (
                                    <span className="has-error">
                                        {errOf(`filter_descriptions.${index}.name`)}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

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
                        {errOf('sort_order') && (
                            <span className="has-error">{errOf('sort_order')}</span>
                        )}
                    </div>
                </div>

                <h3 className="mt-4 header-title">{t('FilterValue')}</h3>
                <div className="row mt-3">
                    <div className="col-xl-12">
                        <FilterValues
                            values={objForm.filter_values}
                            listLanguages={listLanguages}
                            languageDefault={languageDefault}
                            errors={errors}
                            onChange={(next) => setField('filter_values', next)}
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
                    <Link to="/filter/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
