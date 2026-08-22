/**
 * pages/orderStatus/form.jsx — THÊM/SỬA tình trạng đơn hàng (orders_status).
 * Bảng orders_status lưu i18n bằng composite key (id, language_code) ngay
 * trên bảng — KHÔNG có bảng *_description riêng, nhưng UI vẫn y hệt pattern
 * Filter/ReviewCriteria (1 Input tên / ngôn ngữ) vì backend đã gói lại
 * thành `order_status_descriptions` cho form dùng thống nhất.
 * -----------------------------------------------------------
 *   GET  /order-status/{id}   (chi tiết)
 *   POST /order-status        (tạo → 201)
 *   PUT  /order-status/{id}   (sửa)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages, useLanguageDefault } from '@/core/stores/appSettingsStore';

const emptyDescription = (code) => ({ language_code: code, name: '' });

export default function OrderStatusForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        order_status_descriptions: [],
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
                .get(`/order-status/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        ...data,
                        order_status_descriptions: buildDescriptions(
                            data.order_status_descriptions || []
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
                order_status_descriptions: buildDescriptions([]),
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

    const setDesc = (index, field, value) =>
        setObjForm((f) => ({
            ...f,
            order_status_descriptions: f.order_status_descriptions.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    descriptions: objForm.order_status_descriptions,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/order-status/${objForm.id}`, payload)
                        : api.post('/order-status', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/order-status/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/order-status/${newId}`);
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
            <Wrapper title={t('AddOrderStatus')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper
            title={objForm.id > 0 ? t('EditOrderStatus') : t('AddOrderStatus')}
            sapo=""
        >
            <div className="order-status-form">
                <h3 className="mt-0 header-title">{t('OrderStatus')}</h3>

                {listLanguages.map((lang, index) => {
                    const desc =
                        objForm.order_status_descriptions[index] || emptyDescription(lang.code);
                    return (
                        <div key={lang.code} className="row mt-3 pt-3 border-top">
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
                                {errOf(`descriptions.${index}.name`) && (
                                    <span className="has-error">
                                        {errOf(`descriptions.${index}.name`)}
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
                    <Link to="/order-status/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
