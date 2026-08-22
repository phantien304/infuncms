/**
 * pages/manufacturer/form.jsx — THÊM/SỬA manufacturer (REST chuẩn, convert từ
 * mt219 cms/components/manufacturer/form.vue). Mirror pages/filter/form.jsx
 * nhưng KHÔNG có i18n/nested values — manufacturer chỉ 1 bảng phẳng (name,
 * image, sort_order, meta_title, meta_description), khác Category/Blog.
 * -----------------------------------------------------------
 * Gọi REST qua `api`:
 *   GET  /manufacturer/{id}   (chi tiết)
 *   POST /manufacturer        (tạo → 201)
 *   PUT  /manufacturer/{id}   (sửa)
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

const { TextArea } = Input;

export default function ManufacturerForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        name: '',
        image: '',
        sort_order: '',
        meta_title: '',
        meta_description: '',
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/manufacturer/${objForm.id}`)
                .then((res) => {
                    setObjForm({ ...(res.data?.data || {}) });
                    setLoader(true);
                })
                .catch((err) => {
                    setLoader(true);
                    showError(t(err?.response?.data?.message || 'ErrorAction'));
                })
                .finally(() => inst.close());
        } else {
            setLoader(true);
            inst.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objForm.id]);

    useEffect(() => {
        getDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const save = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    name: objForm.name,
                    image: objForm.image,
                    sort_order: objForm.sort_order || 0,
                    meta_title: objForm.meta_title,
                    meta_description: objForm.meta_description,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/manufacturer/${objForm.id}`, payload)
                        : api.post('/manufacturer', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/manufacturer/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/manufacturer/${newId}`);
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
            <Wrapper title={t('AddManufacture')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditManufacture') : t('AddManufacture')} sapo="">
            <div className="manufacturer-form">
                <h3 className="mt-0 header-title">{t('Manufacture')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('ManufactureName')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.name}
                            placeholder={t('ManufactureName')}
                            onChange={(e) => setField('name', e.target.value)}
                        />
                        {errOf('name') && <span className="has-error">{errOf('name')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ManufactureImage')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Photo
                            src={objForm.image}
                            width="100px"
                            height="100px"
                            onChange={(url) => setField('image', url)}
                        />
                        {errOf('image') && <span className="has-error">{errOf('image')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ManufactureSortOrder')}</label>
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

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('MetaTitle')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.meta_title}
                            placeholder={t('MetaTitle')}
                            onChange={(e) => setField('meta_title', e.target.value)}
                        />
                        {errOf('meta_title') && (
                            <span className="has-error">{errOf('meta_title')}</span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('MetaDescription')}</label>
                    </div>
                    <div className="col-xl-10">
                        <TextArea
                            rows={5}
                            value={objForm.meta_description}
                            placeholder={t('MetaDescription')}
                            onChange={(e) => setField('meta_description', e.target.value)}
                        />
                        {errOf('meta_description') && (
                            <span className="has-error">{errOf('meta_description')}</span>
                        )}
                    </div>
                </div>

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/manufacturer/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
