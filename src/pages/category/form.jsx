/**
 * pages/category/form.jsx — THÊM/SỬA category (REST chuẩn).
 * -----------------------------------------------------------
 * Gọi REST qua `api`:
 *   GET  /category/{id}   (chi tiết, res.data.data kèm category_descriptions)
 *   POST /category        (tạo → 201, res.data.data.id)
 *   PUT  /category/{id}   (sửa)
 *   GET  /category?per_page=1000  (danh sách cho dropdown cha)
 * Lỗi validate: 422 { errors: { 'category_descriptions.0.title': [...] } }.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Tabs, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Photo from '@/components/ui/Photo';
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
    title: '',
    description: '',
    meta_title: '',
    meta_description: '',
});

export default function CategoryForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        parent_id: '',
        sort_order: '',
        image_icon: '',
        icon: '',
        image: '',
        category_descriptions: [],
    });
    const [listCategory, setListCategory] = useState([]);
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

    const loadCategories = useCallback(() => {
        return api
            .get('/category', { params: { per_page: 1000, deleted_at: 1 } })
            .then((res) => setListCategory(res.data?.data || []))
            .catch(() => {});
    }, []);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/category/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        category_descriptions: buildDescriptions(
                            data.category_descriptions || []
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
            setObjForm((f) => ({ ...f, category_descriptions: buildDescriptions([]) }));
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id, buildDescriptions]);

    useEffect(() => {
        loadCategories();
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) =>
        setObjForm((f) => ({ ...f, [field]: value }));

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            category_descriptions: f.category_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    parent_id: objForm.parent_id || null,
                    sort_order: objForm.sort_order || 0,
                    icon: objForm.icon,
                    image: objForm.image,
                    image_icon: objForm.image_icon,
                    category_descriptions: objForm.category_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/category/${objForm.id}`, payload)
                        : api.post('/category', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/category/list');
                            // Save & Edit: bản tạo mới → sang trang edit theo id mới.
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/category/${newId}`);
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
            <Wrapper title={t('AddCategory')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const languageTabs = listLanguages.map((lang, index) => {
        const desc =
            objForm.category_descriptions[index] || emptyDescription(lang.code);
        return {
            key: String(index),
            label: lang.name,
            children: (
                <div>
                    <div className="row mt-3">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Title')}
                                {lang.code === languageDefault && (
                                    <span className="text-danger">&nbsp;*</span>
                                )}
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={desc.title}
                                placeholder={t('Title')}
                                onChange={(e) => setDesc(index, 'title', e.target.value)}
                            />
                            {errOf(`category_descriptions.${index}.title`) && (
                                <span className="has-error">
                                    {errOf(`category_descriptions.${index}.title`)}
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

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('MetaTitle')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={desc.meta_title}
                                placeholder={t('MetaTitle')}
                                onChange={(e) =>
                                    setDesc(index, 'meta_title', e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('MetaDescription')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={desc.meta_description}
                                onChange={(e) =>
                                    setDesc(index, 'meta_description', e.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>
            ),
        };
    });

    return (
        <Wrapper title={objForm.id > 0 ? t('EditCategory') : t('AddCategory')} sapo="">
            <div className="category-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('CategoryParent')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            placeholder={t('Select')}
                            optionFilterProp="label"
                            value={objForm.parent_id || undefined}
                            onChange={(val) => setField('parent_id', val ?? '')}
                            options={listCategory.map((c) => ({
                                label: c.title,
                                value: c.id,
                            }))}
                        />
                        {errOf('parent_id') && (
                            <span className="has-error">{errOf('parent_id')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
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
                        <label className="tit">{t('Icon')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.icon}
                            placeholder={t('Icon')}
                            onChange={(e) => setField('icon', e.target.value)}
                        />
                        {errOf('icon') && (
                            <span className="has-error">{errOf('icon')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ImageIcon')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Photo
                            src={objForm.image_icon}
                            width="40px"
                            height="40px"
                            onChange={(url) => setField('image_icon', url)}
                        />
                        {errOf('image_icon') && (
                            <span className="has-error">{errOf('image_icon')}</span>
                        )}
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
                    <Link to="/category/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
