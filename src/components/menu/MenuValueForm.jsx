/**
 * components/menu/MenuValueForm.jsx — form sửa/thêm 1 node menu_value.
 * -----------------------------------------------------------
 * Convert từ phần bên phải của mt219 components/menu/form.vue (khối
 * "TabContent"/target picker). Type quyết định target picker:
 *   - page          : không có target picker, chỉ Link (theo ngôn ngữ)
 *   - category      : Select tìm cục bộ, load hết (GET /category, giống parent
 *                     dropdown ở category/form.jsx)
 *   - information   : Select tìm cục bộ, load hết (GET /information)
 *   - product       : Select tìm REMOTE theo keyword (GET /product) — catalog
 *                     có thể rất lớn, KHÔNG load hết (giống Link.jsx product related)
 *   - blogCategory  : Select tìm cục bộ, load hết (GET /blog-category)
 *
 * Khác bản gốc: KHÔNG dùng component <autocomplete> (đã xoá khỏi infuncms,
 * mồ côi — xem CLAUDE.md dọn code 2026-06). Category/Information/BlogCategory
 * dùng antd Select showSearch cục bộ (danh mục nhỏ); Product dùng remote-search
 * debounce (giống Author ở blog/form.jsx).
 *
 * Props:
 *   menuId    : id Menu cha (bắt buộc — gắn vào node mới tạo)
 *   valueId   : id menu_value đang sửa, 0/null = tạo mới
 *   onSaved   : () => void — gọi sau khi lưu thành công (parent tự refresh cây)
 *   onCancel  : () => void — bấm khi muốn bỏ chọn (không bắt buộc dùng)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Select, Tabs, Button, Spin } from 'antd';

import Photo from '@/components/ui/Photo';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import {
    useListLanguages,
    useLanguageDefault,
} from '@/core/stores/appSettingsStore';

const TYPE_OPTIONS = [
    { value: 'page', label: 'Page' },
    { value: 'category', label: 'Category' },
    { value: 'information', label: 'Information' },
    { value: 'product', label: 'Product' },
    { value: 'blogCategory', label: 'BlogCategory' },
];

const emptyDescription = (code) => ({ language_code: code, title: '', link: '' });

const emptyForm = (menuId) => ({
    id: 0,
    menu_id: menuId,
    item_id: '',
    parent_id: 1,
    position: 99,
    type: '',
    css: '',
    html_custom: '',
    mega_menu: 0,
    tab_content: 0,
    image: '',
    menu_value_descriptions: [],
});

export default function MenuValueForm({ menuId, valueId, onSaved }) {
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState(() => emptyForm(menuId));
    const [targetOptions, setTargetOptions] = useState([]);
    const [targetSearching, setTargetSearching] = useState(false);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(true);
    const [activeKey, setActiveKey] = useState('0');
    const searchTimer = useRef(null);

    const buildDescriptions = useCallback(
        (existing = []) =>
            listLanguages.map(
                (lang) =>
                    existing.find((d) => d.language_code === lang.code) ||
                    emptyDescription(lang.code)
            ),
        [listLanguages]
    );

    // Load hết (category/information/blogCategory) — danh mục nhỏ.
    const loadAllTargets = useCallback((type) => {
        const urlByType = {
            category: '/category',
            information: '/information',
            blogCategory: '/blog-category',
        };
        const url = urlByType[type];
        if (!url) return;
        setTargetSearching(true);
        api
            .get(url, type === 'category' ? { params: { per_page: 1000, deleted_at: 1 } } : undefined)
            .then((res) => {
                const rows = res.data?.data || [];
                setTargetOptions(rows.map((r) => ({ value: r.id, label: r.title })));
            })
            .catch(() => {})
            .finally(() => setTargetSearching(false));
    }, []);

    // Tìm REMOTE theo keyword — product (catalog lớn).
    const searchProduct = useCallback((keyword) => {
        setTargetSearching(true);
        api
            .get('/product', { params: { keyword, per_page: 20 } })
            .then((res) => {
                const rows = res.data?.data || [];
                setTargetOptions(rows.map((r) => ({ value: r.id, label: r.title || r.name })));
            })
            .catch(() => {})
            .finally(() => setTargetSearching(false));
    }, []);

    const onProductSearch = (keyword) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => searchProduct(keyword), 300);
    };

    const resetForm = useCallback(() => {
        setObjForm({
            ...emptyForm(menuId),
            menu_value_descriptions: buildDescriptions([]),
        });
        setTargetOptions([]);
        setErrors({});
        setLoader(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menuId, buildDescriptions]);

    const getDetail = useCallback(() => {
        if (!valueId) {
            resetForm();
            return;
        }
        const inst = loading.open();
        setLoader(false);
        api
            .get(`/menu-value/${valueId}`)
            .then((res) => {
                const data = res.data?.data || {};
                setObjForm({
                    ...data,
                    item_id: data.item_id || '',
                    menu_value_descriptions: buildDescriptions(
                        data.menu_value_descriptions || []
                    ),
                });
                if (data.item_id && data.item_name) {
                    setTargetOptions([{ value: data.item_id, label: data.item_name }]);
                } else {
                    setTargetOptions([]);
                }
                setLoader(true);
            })
            .catch((err) => {
                setLoader(true);
                showError(t(err?.response?.data?.message || 'ErrorAction'));
            })
            .finally(() => inst.close());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueId, buildDescriptions, resetForm]);

    useEffect(() => {
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueId, menuId]);

    const setField = (field, value) =>
        setObjForm((f) => ({ ...f, [field]: value }));

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            menu_value_descriptions: f.menu_value_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const changeType = (type) => {
        setObjForm((f) => ({ ...f, type, item_id: '' }));
        setTargetOptions([]);
        if (type === 'category' || type === 'information' || type === 'blogCategory') {
            loadAllTargets(type);
        }
    };

    const save = () => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    menu_id: menuId,
                    item_id: objForm.item_id || null,
                    parent_id: objForm.parent_id || 1,
                    position: objForm.position || 99,
                    type: objForm.type,
                    css: objForm.css,
                    html_custom: objForm.html_custom,
                    mega_menu: objForm.mega_menu || 0,
                    tab_content: objForm.tab_content || 0,
                    image: objForm.image,
                    menu_value_descriptions: objForm.menu_value_descriptions,
                };
                const req = objForm.id > 0
                    ? api.put(`/menu-value/${objForm.id}`, payload)
                    : api.post('/menu-value', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess'));
                        const saved = res.data?.data;
                        if (saved?.id) {
                            setObjForm((f) => ({ ...f, id: saved.id }));
                        }
                        onSaved?.(saved?.id);
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
            <div className="p-5 text-center">
                <Spin />
            </div>
        );
    }

    const showTargetPicker = objForm.type && objForm.type !== 'page';
    const targetLabel = {
        category: t('Category'),
        information: t('Information'),
        product: t('Product'),
        blogCategory: t('BlogCategory'),
    }[objForm.type];

    const languageTabs = listLanguages.map((lang, index) => {
        const desc = objForm.menu_value_descriptions[index] || emptyDescription(lang.code);
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
                            {errOf(`menu_value_descriptions.${index}.title`) && (
                                <span className="has-error">
                                    {errOf(`menu_value_descriptions.${index}.title`)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Link')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={desc.link}
                                placeholder={t('Link')}
                                onChange={(e) => setDesc(index, 'link', e.target.value)}
                            />
                            {errOf(`menu_value_descriptions.${index}.link`) && (
                                <span className="has-error">
                                    {errOf(`menu_value_descriptions.${index}.link`)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ),
        };
    });

    return (
        <div>
            <div className="row mt-3">
                <div className="col-xl-2 text-right">
                    <label className="tit">
                        {t('Type')}
                        <span className="text-danger">&nbsp;*</span>
                    </label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%' }}
                        placeholder={t('Select')}
                        value={objForm.type || undefined}
                        onChange={changeType}
                        options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
                    />
                    {errOf('type') && <span className="has-error">{errOf('type')}</span>}
                </div>
            </div>

            {showTargetPicker && (
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {targetLabel}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            placeholder={targetLabel}
                            loading={targetSearching}
                            filterOption={
                                objForm.type === 'product'
                                    ? false
                                    : (input, option) =>
                                          (option?.label || '')
                                              .toLowerCase()
                                              .includes(input.toLowerCase())
                            }
                            onSearch={objForm.type === 'product' ? onProductSearch : undefined}
                            onFocus={() => {
                                if (objForm.type === 'product') {
                                    if (!targetOptions.length) searchProduct('');
                                } else if (!targetOptions.length) {
                                    loadAllTargets(objForm.type);
                                }
                            }}
                            value={objForm.item_id || undefined}
                            onChange={(val) => setField('item_id', val ?? '')}
                            options={targetOptions}
                        />
                        {errOf('item_id') && <span className="has-error">{errOf('item_id')}</span>}
                    </div>
                </div>
            )}

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('ClassCss')}</label>
                </div>
                <div className="col-xl-10">
                    <Input
                        value={objForm.css}
                        placeholder={t('ClassCss')}
                        onChange={(e) => setField('css', e.target.value)}
                    />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('HtmlCustom')}</label>
                </div>
                <div className="col-xl-10">
                    <Input
                        value={objForm.html_custom}
                        placeholder={t('HtmlCustom')}
                        onChange={(e) => setField('html_custom', e.target.value)}
                    />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('MegaMenu')}</label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%' }}
                        value={objForm.mega_menu}
                        onChange={(val) => setField('mega_menu', val)}
                        options={[
                            { label: t('Yes'), value: 1 },
                            { label: t('No'), value: 0 },
                        ]}
                    />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('TabContent')}</label>
                </div>
                <div className="col-xl-10">
                    <Select
                        style={{ width: '100%' }}
                        value={objForm.tab_content}
                        onChange={(val) => setField('tab_content', val)}
                        options={[
                            { label: t('Yes'), value: 1 },
                            { label: t('No'), value: 0 },
                        ]}
                    />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-2 text-right">
                    <label className="tit">{t('Image')}</label>
                </div>
                <div className="col-xl-10">
                    <Photo
                        src={objForm.image}
                        width="50px"
                        height="50px"
                        onChange={(url) => setField('image', url)}
                    />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-12">
                    <Tabs activeKey={activeKey} onChange={setActiveKey} items={languageTabs} />
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-12 text-right">
                    <Button type="primary" onClick={save}>
                        {t('Save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
