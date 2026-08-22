/**
 * pages/information/form.jsx — THÊM/SỬA information (trang nội dung tĩnh).
 * Convert từ mt219 cms/components/information/form.vue. Mirror
 * pages/blog/form.jsx (Tabs đa ngôn ngữ + TinyMce), rút gọn: KHÔNG có
 * category/author/image/viewed/featured — chỉ banner_id + sort_order +
 * information_descriptions[title, description, content, meta_title,
 * meta_description].
 * -----------------------------------------------------------
 *   GET  /information/{id}   (chi tiết, res.data.data kèm information_descriptions)
 *   POST /information        (tạo → 201, res.data.data.id)
 *   PUT  /information/{id}   (sửa)
 *   GET  /banner             (dropdown Banner — CRUD banner đã có sẵn)
 * Lỗi validate: 422 { errors: { 'information_descriptions.0.title': [...] } }.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Tabs, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import TinyMce from '@/components/ui/TinyMce';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages, useLanguageDefault } from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({
    language_code: code,
    title: '',
    description: '',
    content: '',
    meta_title: '',
    meta_description: '',
});

export default function InformationForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        banner_id: '',
        sort_order: '',
        information_descriptions: [],
    });
    const [banners, setBanners] = useState([]);
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

    const loadBanners = useCallback(() => {
        return api
            .get('/banner', { params: { per_page: 100 } })
            .then((res) => setBanners(res.data?.data || []))
            .catch(() => {});
    }, []);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/information/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        banner_id: data.banner_id || '',
                        information_descriptions: buildDescriptions(
                            data.information_descriptions || []
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
                information_descriptions: buildDescriptions([]),
            }));
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id, buildDescriptions]);

    useEffect(() => {
        loadBanners();
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            information_descriptions: f.information_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    banner_id: objForm.banner_id || null,
                    sort_order: objForm.sort_order || 0,
                    information_descriptions: objForm.information_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/information/${objForm.id}`, payload)
                        : api.post('/information', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/information/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/information/${newId}`);
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
            <Wrapper title={t('AddInformation')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const languageTabs = listLanguages.map((lang, index) => {
        const desc =
            objForm.information_descriptions[index] || emptyDescription(lang.code);
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
                            {errOf(`information_descriptions.${index}.title`) && (
                                <span className="has-error">
                                    {errOf(`information_descriptions.${index}.title`)}
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
                            <label className="tit">{t('Content')}</label>
                        </div>
                        <div className="col-xl-10">
                            <TinyMce
                                value={desc.content}
                                height={500}
                                onChange={(html) => setDesc(index, 'content', html)}
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
        <Wrapper title={objForm.id > 0 ? t('EditInformation') : t('AddInformation')} sapo="">
            <div className="information-form">
                <h3 className="mt-0 header-title">{t('Information')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Banner')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            placeholder={t('Select')}
                            optionFilterProp="label"
                            value={objForm.banner_id || undefined}
                            onChange={(val) => setField('banner_id', val ?? '')}
                            options={banners.map((b) => ({
                                label: b.title,
                                value: b.id,
                            }))}
                        />
                        {errOf('banner_id') && (
                            <span className="has-error">{errOf('banner_id')}</span>
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
                            placeholder={t('SortOrder')}
                            onChange={(e) => setField('sort_order', e.target.value)}
                        />
                        {errOf('sort_order') && (
                            <span className="has-error">{errOf('sort_order')}</span>
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
                    <Link to="/information/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
