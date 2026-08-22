/**
 * pages/option/form.jsx — THÊM/SỬA option (REST chuẩn, convert từ mt219
 * cms/components/option/form.vue). Mirror pages/filter/form.jsx, thêm:
 *   - type (12 loại widget, nhóm theo Choose/Input/File/Date — giữ đúng nhóm
 *     mt219 dùng, ánh xạ 1:1 với backend App\Enums\OptionType)
 *   - role (CustomField=0 / Variant=1 — App\Enums\OptionRole, KHÔNG có ở
 *     mt219, chỉ hiện khi type thuộc nhóm "Choose" vì role=Variant chỉ có ý
 *     nghĩa khi option có option_values cố định để sinh biến thể SKU)
 *   - option_values chỉ hiện khi type ∈ {select,radio,checkbox,image}
 *     (mirror `showFilterValue` ở form.vue gốc)
 * -----------------------------------------------------------
 * Gọi REST qua `api`:
 *   GET  /option/{id}   (chi tiết)
 *   POST /option        (tạo → 201)
 *   PUT  /option/{id}   (sửa)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import OptionValues, { buildValueDescriptions } from '@/components/option/OptionValues';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages, useLanguageDefault } from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({ language_code: code, name: '', name_display: '' });

const VALUE_TYPES = ['select', 'radio', 'checkbox', 'image'];

const TYPE_OPTIONS = [
    {
        label: 'Choose',
        options: [
            { label: 'Select', value: 'select' },
            { label: 'Radio', value: 'radio' },
            { label: 'Checkbox', value: 'checkbox' },
            { label: 'Image', value: 'image' },
        ],
    },
    {
        label: 'Input',
        options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'phone' },
            { label: 'Textarea', value: 'textarea' },
        ],
    },
    {
        label: 'File',
        options: [{ label: 'File', value: 'file' }],
    },
    {
        label: 'Date',
        options: [
            { label: 'Date', value: 'date' },
            { label: 'Time', value: 'time' },
            { label: 'Datetime', value: 'datetime' },
        ],
    },
];

export default function OptionForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        type: 'text',
        role: 0,
        sort_order: '',
        option_descriptions: [],
        option_values: [],
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const showValues = VALUE_TYPES.includes(objForm.type);

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
                option_value_descriptions: buildValueDescriptions(
                    listLanguages,
                    v.option_value_descriptions || []
                ),
            })),
        [listLanguages]
    );

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/option/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        option_descriptions: buildDescriptions(data.option_descriptions || []),
                        option_values: buildValues(data.option_values || []),
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
                option_descriptions: buildDescriptions([]),
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
            option_descriptions: f.option_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    // Đổi type → điều chỉnh role theo đúng quy ước hệ thống đang dùng
    // (SeedCustomFieldsCommand/SeedProductVariantsCommand):
    //   - Loại free-text/file/date (text, email, phone, textarea, file,
    //     date, datetime, time) → LUÔN CustomField, ẩn hẳn lựa chọn role vì
    //     các loại này không có value cố định để sinh biến thể SKU.
    //   - Loại có value cố định (select/radio/checkbox/image) → mặc định
    //     Variant khi vừa chuyển từ nhóm free-text sang (đúng pattern
    //     "Màu sắc"/"Size" thật), nhưng vẫn để admin đổi tay về CustomField
    //     (đúng pattern "Chọn dây áo"/"Chọn loại in" — radio/select vẫn có
    //     thể là tuỳ chọn tính giá thêm, không phải biến thể SKU).
    const onChangeType = (val) => {
        setObjForm((f) => {
            const isValueType = VALUE_TYPES.includes(val);
            const wasValueType = VALUE_TYPES.includes(f.type);
            return {
                ...f,
                type: val,
                role: !isValueType ? 0 : wasValueType ? f.role : 1,
                option_values: isValueType ? f.option_values : [],
            };
        });
    };

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    type: objForm.type,
                    role: objForm.role,
                    sort_order: objForm.sort_order || 0,
                    option_descriptions: objForm.option_descriptions,
                    option_values: showValues ? objForm.option_values : [],
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/option/${objForm.id}`, payload)
                        : api.post('/option', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/option/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/option/${newId}`);
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
            <Wrapper title={t('AddOption')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditOption') : t('AddOption')} sapo="">
            <div className="option-form">
                <h3 className="mt-0 header-title">{t('FilterGroup')}</h3>

                {listLanguages.map((lang, index) => {
                    const desc = objForm.option_descriptions[index] || emptyDescription(lang.code);
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
                            <div className="col-xl-5">
                                <Input
                                    value={desc.name}
                                    placeholder={t('Name')}
                                    onChange={(e) => setDesc(index, 'name', e.target.value)}
                                />
                                {errOf(`option_descriptions.${index}.name`) && (
                                    <span className="has-error">
                                        {errOf(`option_descriptions.${index}.name`)}
                                    </span>
                                )}
                            </div>
                            <div className="col-xl-5">
                                <Input
                                    value={desc.name_display}
                                    placeholder={t('NameDisplay')}
                                    onChange={(e) => setDesc(index, 'name_display', e.target.value)}
                                />
                                {errOf(`option_descriptions.${index}.name_display`) && (
                                    <span className="has-error">
                                        {errOf(`option_descriptions.${index}.name_display`)}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

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
                            onChange={onChangeType}
                            options={TYPE_OPTIONS}
                        />
                        {errOf('type') && <span className="has-error">{errOf('type')}</span>}
                    </div>
                </div>

                {showValues && (
                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Role')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                style={{ width: '100%' }}
                                value={objForm.role}
                                onChange={(val) => setField('role', val)}
                                options={[
                                    { label: t('CustomField'), value: 0 },
                                    { label: t('Variant'), value: 1 },
                                ]}
                            />
                            {errOf('role') && <span className="has-error">{errOf('role')}</span>}
                        </div>
                    </div>
                )}

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

                {showValues && (
                    <>
                        <h3 className="mt-4 header-title">{t('FilterValue')}</h3>
                        <div className="row mt-3">
                            <div className="col-xl-12">
                                <OptionValues
                                    values={objForm.option_values}
                                    listLanguages={listLanguages}
                                    languageDefault={languageDefault}
                                    errors={errors}
                                    onChange={(next) => setField('option_values', next)}
                                />
                            </div>
                        </div>
                    </>
                )}

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/option/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
