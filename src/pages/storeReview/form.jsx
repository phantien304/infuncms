/**
 * pages/storeReview/form.jsx — THÊM/SỬA StoreReview (REST chuẩn).
 * -----------------------------------------------------------
 * Mirror pages/category/form.jsx (xem file đó để đối chiếu pattern gốc).
 *
 *   GET  /store-review/{id}   (chi tiết, res.data.data kèm store_review_descriptions)
 *   POST /store-review        (tạo → 201, res.data.data.id)
 *   PUT  /store-review/{id}   (sửa)
 * Lỗi validate: 422 { errors: { 'store_review_descriptions.0.title': [...] } }.
 *
 * product_id/author_id: chưa có endpoint dropdown search phù hợp
 * (ResourceController chỉ có bundle cố định cho setting/product form, không
 * có tìm sản phẩm rời) — để input số đơn giản, nhập tay ID.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Checkbox, Tabs, Button } from 'antd';

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

const SOCIAL_ICON_OPTIONS = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'zalo', label: 'Zalo' },
    { value: 'google', label: 'Google' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'pinterest', label: 'Pinterest' },
];

const emptyDescription = (code) => ({
    language_code: code,
    title: '',
    content: '',
    meta_title: '',
    meta_description: '',
});

export default function StoreReviewForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        name: '',
        image: '',
        social_icon: 'instagram',
        featured: 0,
        product_id: '',
        author_id: '',
        store_review_descriptions: [],
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
                .get(`/store-review/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        id: data.id,
                        name: data.name || '',
                        image: data.image || '',
                        social_icon: data.social_icon || 'instagram',
                        featured: data.featured ? 1 : 0,
                        product_id: data.product_id ?? '',
                        author_id: data.author_id ?? '',
                        store_review_descriptions: buildDescriptions(
                            data.store_review_descriptions || []
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
                store_review_descriptions: buildDescriptions([]),
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
            store_review_descriptions: f.store_review_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    name: objForm.name || null,
                    image: objForm.image || null,
                    social_icon: objForm.social_icon || null,
                    featured: objForm.featured ? 1 : 0,
                    product_id: objForm.product_id === '' ? null : objForm.product_id,
                    author_id: objForm.author_id === '' ? null : objForm.author_id,
                    store_review_descriptions: objForm.store_review_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/store-review/${objForm.id}`, payload)
                        : api.post('/store-review', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/store-review/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/store-review/${newId}`);
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
            <Wrapper
                title={objForm.id > 0 ? t('EditStoreReview') : t('AddStoreReview')}
                sapo=""
            >
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const languageTabs = listLanguages.map((lang, index) => {
        const desc =
            objForm.store_review_descriptions[index] || emptyDescription(lang.code);
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
                            {errOf(`store_review_descriptions.${index}.title`) && (
                                <span className="has-error">
                                    {errOf(`store_review_descriptions.${index}.title`)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Content')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={desc.content}
                                onChange={(e) => setDesc(index, 'content', e.target.value)}
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
                                rows={3}
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
        <Wrapper
            title={objForm.id > 0 ? t('EditStoreReview') : t('AddStoreReview')}
            sapo=""
        >
            <div className="store-review-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Image')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Photo
                            src={objForm.image}
                            width="160px"
                            height="160px"
                            onChange={(url) => setField('image', url)}
                        />
                        {errOf('image') && (
                            <span className="has-error">{errOf('image')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Name')}</label>
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

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('SocialIcon')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: 260 }}
                            value={objForm.social_icon}
                            onChange={(val) => setField('social_icon', val)}
                            options={SOCIAL_ICON_OPTIONS}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ProductId')}</label>
                    </div>
                    <div className="col-xl-4">
                        <Input
                            type="number"
                            value={objForm.product_id}
                            placeholder={t('Optional')}
                            onChange={(e) => setField('product_id', e.target.value)}
                        />
                        {errOf('product_id') && (
                            <span className="has-error">{errOf('product_id')}</span>
                        )}
                    </div>
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('AuthorId')}</label>
                    </div>
                    <div className="col-xl-4">
                        <Input
                            type="number"
                            value={objForm.author_id}
                            placeholder={t('Optional')}
                            onChange={(e) => setField('author_id', e.target.value)}
                        />
                        {errOf('author_id') && (
                            <span className="has-error">{errOf('author_id')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Featured')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Checkbox
                            checked={objForm.featured === 1}
                            onChange={(e) =>
                                setField('featured', e.target.checked ? 1 : 0)
                            }
                        >
                            {t('ShowOnHomepage')}
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
                    <Link to="/store-review/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
