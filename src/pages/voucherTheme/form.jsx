/**
 * pages/voucherTheme/form.jsx — THÊM/SỬA mẫu thiệp voucher.
 * -----------------------------------------------------------
 * Convert từ mt219 `components/voucherTheme/form.vue`. Cấu trúc giống
 * pages/reviewTag/form.jsx: 1 field chung (ảnh) + N field tên theo ngôn ngữ.
 * Tên bắt buộc ở ngôn ngữ mặc định; ngôn ngữ phụ để trống thì backend XOÁ
 * dòng description đó (không lưu chuỗi rỗng).
 *
 *   GET  /voucher-theme/{id}
 *   POST /voucher-theme        (tạo → 201)
 *   PUT  /voucher-theme/{id}   (sửa)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Photo from '@/components/ui/Photo';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages, useLanguageDefault } from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({ language_code: code, name: '' });

export default function VoucherThemeForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        image: '',
        voucher_theme_descriptions: [],
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
                .get(`/voucher-theme/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        voucher_theme_descriptions: buildDescriptions(
                            data.voucher_theme_descriptions || []
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
            setObjForm((f) => ({ ...f, voucher_theme_descriptions: buildDescriptions([]) }));
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
            voucher_theme_descriptions: f.voucher_theme_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    image: objForm.image,
                    voucher_theme_descriptions: objForm.voucher_theme_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/voucher-theme/${objForm.id}`, payload)
                        : api.post('/voucher-theme', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/voucher-theme/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) getDetail();
                            else navigate(`/voucher-theme/${newId}`);
                        });
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) setErrors(err.response.data?.errors || {});
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const errOf = (key) => errors?.[key]?.[0];

    if (!loader) {
        return (
            <Wrapper title={t('AddVoucherTheme')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper
            title={objForm.id > 0 ? t('EditVoucherTheme') : t('AddVoucherTheme')}
            sapo=""
        >
            <div className="voucher-theme-form">
                <h3 className="mt-0 header-title">{t('VoucherTheme')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Image')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Photo
                            src={objForm.image}
                            width="200px"
                            height="120px"
                            onChange={(url) => setField('image', url)}
                        />
                        {errOf('image') && <span className="has-error">{errOf('image')}</span>}
                    </div>
                </div>

                {listLanguages.map((lang, index) => {
                    const desc =
                        objForm.voucher_theme_descriptions[index] || emptyDescription(lang.code);
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
                                    value={desc.name || ''}
                                    maxLength={32}
                                    placeholder={t('Name')}
                                    onChange={(e) => setDesc(index, 'name', e.target.value)}
                                />
                                {errOf(`voucher_theme_descriptions.${index}.name`) && (
                                    <span className="has-error">
                                        {errOf(`voucher_theme_descriptions.${index}.name`)}
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
                    <Link to="/voucher-theme/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
