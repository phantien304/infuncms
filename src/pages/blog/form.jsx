/**
 * pages/blog/form.jsx — THÊM/SỬA blog (REST chuẩn).
 * -----------------------------------------------------------
 * Convert từ mt219 resources/js/cms/components/blog/form.vue.
 * Mirror pages/category/form.jsx (REST + tabs đa ngôn ngữ) +
 * components/product/General.jsx (TinyMce trong tab).
 *
 *   GET  /blog/{id}        (chi tiết, res.data.data kèm blog_descriptions + author_name)
 *   POST /blog              (tạo → 201, res.data.data.id)
 *   PUT  /blog/{id}         (sửa)
 *   GET  /blog-category     (dropdown category — CHỈ read, CRUD riêng chưa convert)
 *   GET  /user?keyword=&type=1  (remote-search Author — CHỈ read, CRUD user chưa convert)
 * Lỗi validate: 422 { errors: { 'blog_descriptions.0.title': [...] } }.
 *
 * Khác bản mt219 gốc:
 *  - Tag: mt219 dùng el-select multiple chọn từ danh sách blogTag có sẵn,
 *    nhưng cột lưu DB (`blog_description.tag`) là TEXT thô — đúng convention
 *    ĐÃ migrate ở Product (product_description.tag, xem
 *    ProductCmsRepository::syncDescriptions + General.jsx KHÔNG có multi-select
 *    riêng). Theo cho nhất quán: Tag ở đây là 1 Input text thường (chuỗi,
 *    ngăn cách bởi dấu phẩy), KHÔNG dựng lại multi-select phụ thuộc blogTag.
 *  - Author: mt219 dùng <autocomplete> (component đã bị xoá ở đợt dọn code
 *    2026-06 vì mồ côi). Thay bằng antd <Select showSearch> remote (debounce
 *    gõ tới đâu tìm tới đó qua GET /user), giữ đúng UX gốc (tìm theo tên).
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Tabs, Button, InputNumber } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Photo from '@/components/ui/Photo';
import TinyMce from '@/components/ui/TinyMce';
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
    content: '',
    tag: '',
    meta_title: '',
    meta_description: '',
});

export default function BlogForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        category_id: '',
        author_id: '',
        image: '',
        viewed: 0,
        featured: 0,
        blog_descriptions: [],
    });
    const [categories, setCategories] = useState([]);
    const [authorOptions, setAuthorOptions] = useState([]);
    const [authorSearching, setAuthorSearching] = useState(false);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);
    const [activeKey, setActiveKey] = useState('0');
    const authorSearchTimer = useRef(null);

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
            .get('/blog-category')
            .then((res) => setCategories(res.data?.data || []))
            .catch(() => {});
    }, []);

    const searchAuthor = useCallback((keyword) => {
        setAuthorSearching(true);
        api
            .get('/user', { params: { keyword, type: 1, per_page: 20 } })
            .then((res) => {
                const users = res.data?.data || [];
                setAuthorOptions(
                    users.map((u) => ({ value: u.id, label: u.full_name || u.email }))
                );
            })
            .catch(() => {})
            .finally(() => setAuthorSearching(false));
    }, []);

    const onAuthorSearch = (keyword) => {
        if (authorSearchTimer.current) clearTimeout(authorSearchTimer.current);
        authorSearchTimer.current = setTimeout(() => searchAuthor(keyword), 300);
    };

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/blog/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        category_id: data.category_id || '',
                        author_id: data.author_id || '',
                        blog_descriptions: buildDescriptions(
                            data.blog_descriptions || []
                        ),
                    });
                    if (data.author_id && data.author_name) {
                        setAuthorOptions([
                            { value: data.author_id, label: data.author_name },
                        ]);
                    }
                    setLoader(true);
                })
                .catch((err) => {
                    setLoader(true);
                    showError(t(err?.response?.data?.message || 'ErrorAction'));
                })
                .finally(() => inst.close());
        } else {
            setObjForm((f) => ({ ...f, blog_descriptions: buildDescriptions([]) }));
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
            blog_descriptions: f.blog_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    category_id: objForm.category_id || null,
                    author_id: objForm.author_id || null,
                    image: objForm.image,
                    viewed: objForm.viewed || 0,
                    featured: objForm.featured || 0,
                    blog_descriptions: objForm.blog_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/blog/${objForm.id}`, payload)
                        : api.post('/blog', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/blog/list');
                            // Save & Edit: bản tạo mới → sang trang edit theo id mới.
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/blog/${newId}`);
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
            <Wrapper title={t('AddBlogPost')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const languageTabs = listLanguages.map((lang, index) => {
        const desc =
            objForm.blog_descriptions[index] || emptyDescription(lang.code);
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
                            {errOf(`blog_descriptions.${index}.title`) && (
                                <span className="has-error">
                                    {errOf(`blog_descriptions.${index}.title`)}
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
                                height={350}
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

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Tag')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={desc.tag}
                                placeholder={t('Tag')}
                                onChange={(e) => setDesc(index, 'tag', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            ),
        };
    });

    return (
        <Wrapper title={objForm.id > 0 ? t('EditBlogPost') : t('AddBlogPost')} sapo="">
            <div className="blog-form">
                <h3 className="mt-0 header-title">{t('Blog')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('BlogCategory')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            placeholder={t('Select')}
                            optionFilterProp="label"
                            value={objForm.category_id || undefined}
                            onChange={(val) => setField('category_id', val ?? '')}
                            options={categories.map((c) => ({
                                label: c.title,
                                value: c.id,
                            }))}
                        />
                        {errOf('category_id') && (
                            <span className="has-error">{errOf('category_id')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Author')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            placeholder={t('Customer')}
                            filterOption={false}
                            loading={authorSearching}
                            notFoundContent={authorSearching ? <Spin size="small" /> : null}
                            value={objForm.author_id || undefined}
                            onSearch={onAuthorSearch}
                            onFocus={() => {
                                if (!authorOptions.length) searchAuthor('');
                            }}
                            onChange={(val) => setField('author_id', val ?? '')}
                            options={authorOptions}
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
                        <Select
                            style={{ width: '100%' }}
                            placeholder={t('Select')}
                            value={objForm.featured}
                            onChange={(val) => setField('featured', val)}
                            options={[
                                { label: t('Active'), value: 1 },
                                { label: t('DeActive'), value: 0 },
                            ]}
                        />
                        {errOf('featured') && (
                            <span className="has-error">{errOf('featured')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Image')}</label>
                    </div>
                    <div className="col-xl-10 image">
                        <Photo
                            src={objForm.image}
                            width="100px"
                            height="100px"
                            onChange={(url) => setField('image', url)}
                        />
                        {errOf('image') && (
                            <span className="has-error">{errOf('image')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Viewed')}</label>
                    </div>
                    <div className="col-xl-10">
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            value={objForm.viewed}
                            onChange={(val) => setField('viewed', val ?? 0)}
                        />
                        {errOf('viewed') && (
                            <span className="has-error">{errOf('viewed')}</span>
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
                    <Link to="/blog/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
