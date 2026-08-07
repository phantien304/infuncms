/**
 * pages/banner/form.jsx — THÊM/SỬA banner (REST chuẩn, convert từ mt219
 * cms/components/banner/form.vue).
 * -----------------------------------------------------------
 * Gọi REST qua `api`:
 *   GET  /banner/{id}   (chi tiết, res.data.data kèm banner_descriptions +
 *                        banner_values[].banner_value_descriptions)
 *   POST /banner        (tạo → 201, res.data.data.id)
 *   PUT  /banner/{id}   (sửa)
 * Lỗi validate: 422 { errors: { 'banner_descriptions.0.title': [...],
 *   'banner_values.0.image': [...], 'banner_values.0.banner_value_descriptions.0.title': [...] } }.
 *
 * page: multi-select 12 giá trị cố định (giữ nguyên list từ bản Vue2, không
 * có API riêng — đây là danh sách trang tĩnh trong storefront).
 *
 * Field MỚI so với mt219 gốc: `theme` (gán banner cho 1 theme cụ thể trong hệ
 * theme multi-tenant — mirror menu/form.jsx, xem config/theme.php phía BE).
 * `theme = ''` (rỗng) nghĩa là "Mặc định / mọi theme", giữ đúng hành vi cũ.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Tabs, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import BannerValues, { buildValueDescriptions } from '@/components/banner/BannerValues';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    useListLanguages,
    useLanguageDefault,
    useThemes,
} from '@/core/stores/appSettingsStore';

const PAGE_OPTIONS = [
    'home', 'category', 'product', 'information', 'manufacturer', 'blog',
    'reviews', 'pageStatic', 'ingredient', 'blog_tag', 'checkout', 'account',
];

const emptyDescription = (code) => ({ language_code: code, title: '' });

export default function BannerForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();
    const themes = useThemes();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        type: 'image',
        position: 'top',
        sort_order: '',
        page: [],
        theme: '',
        banner_descriptions: [],
        banner_values: [],
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

    const buildValues = useCallback(
        (existing = []) =>
            existing.map((v) => ({
                ...v,
                banner_value_descriptions: buildValueDescriptions(
                    listLanguages,
                    v.banner_value_descriptions || []
                ),
            })),
        [listLanguages]
    );

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/banner/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        page: data.page || [],
                        theme: data.theme || '',
                        banner_descriptions: buildDescriptions(data.banner_descriptions || []),
                        banner_values: buildValues(data.banner_values || []),
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
                banner_descriptions: buildDescriptions([]),
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
            banner_descriptions: f.banner_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    type: objForm.type,
                    position: objForm.position,
                    sort_order: objForm.sort_order || 0,
                    page: objForm.page,
                    theme: objForm.theme || null,
                    banner_descriptions: objForm.banner_descriptions,
                    banner_values: objForm.banner_values,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/banner/${objForm.id}`, payload)
                        : api.post('/banner', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/banner/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/banner/${newId}`);
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
            <Wrapper title={t('AddBanner')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const languageTabs = listLanguages.map((lang, index) => {
        const desc = objForm.banner_descriptions[index] || emptyDescription(lang.code);
        return {
            key: String(index),
            label: lang.name,
            children: (
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('BannerName')}
                            {lang.code === languageDefault && (
                                <span className="text-danger">&nbsp;*</span>
                            )}
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={desc.title}
                            placeholder={t('Name')}
                            onChange={(e) => setDesc(index, 'title', e.target.value)}
                        />
                        {errOf(`banner_descriptions.${index}.title`) && (
                            <span className="has-error">
                                {errOf(`banner_descriptions.${index}.title`)}
                            </span>
                        )}
                    </div>
                </div>
            ),
        };
    });

    return (
        <Wrapper title={objForm.id > 0 ? t('EditBanner') : t('AddBanner')} sapo="">
            <div className="banner-form">
                <h3 className="mt-0 header-title">{t('Banner')}</h3>
                <Tabs activeKey={activeKey} onChange={setActiveKey} items={languageTabs} />

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Type')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            value={objForm.type}
                            onChange={(val) => setField('type', val)}
                            options={[
                                { label: t('Image'), value: 'image' },
                                { label: t('Slider'), value: 'slider' },
                            ]}
                        />
                        {errOf('type') && <span className="has-error">{errOf('type')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Page')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder={t('Select')}
                            value={objForm.page}
                            onChange={(val) => setField('page', val)}
                            options={PAGE_OPTIONS.map((code) => ({
                                label: t(code.charAt(0).toUpperCase() + code.slice(1)),
                                value: code,
                            }))}
                        />
                        {errOf('page') && <span className="has-error">{errOf('page')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Position')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            value={objForm.position}
                            onChange={(val) => setField('position', val)}
                            options={[
                                { label: 'Top', value: 'top' },
                                { label: 'Bottom', value: 'bottom' },
                            ]}
                        />
                        {errOf('position') && <span className="has-error">{errOf('position')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Theme')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            value={objForm.theme || ''}
                            onChange={(val) => setField('theme', val || '')}
                            options={[
                                { label: t('Default'), value: '' },
                                ...themes.map((th) => ({ label: th, value: th })),
                            ]}
                        />
                        {errOf('theme') && <span className="has-error">{errOf('theme')}</span>}
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

                <h3 className="mt-4 header-title">{t('BannerValue')}</h3>
                <div className="row mt-3">
                    <div className="col-xl-12">
                        <BannerValues
                            values={objForm.banner_values}
                            listLanguages={listLanguages}
                            languageDefault={languageDefault}
                            errors={errors}
                            onChange={(next) => setField('banner_values', next)}
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
                    <Link to="/banner/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
