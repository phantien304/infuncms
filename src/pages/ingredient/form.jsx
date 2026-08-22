/**
 * pages/ingredient/form.jsx — THÊM/SỬA ingredient (thành phần mỹ phẩm/INCI).
 * Convert từ mt219 cms/components/ingredient/form.vue. KHÔNG i18n. 2 tab:
 *   - General: name, description, warning (radio yes/no), warning_text.
 *   - Data: 3 multi-select many-to-many — skincare_ids, safety_ids, effect_ids
 *     (mt219 dùng remote-search riêng cho effect, nhưng cả 3 danh sách đều
 *     nhỏ — 22/9/22 dòng — nên dùng chung 1 kiểu multi-select fetch-toàn-bộ
 *     cho nhất quán, không dựng lại component remote-search riêng).
 * -----------------------------------------------------------
 *   GET  /ingredient/{id}   (chi tiết, res.data.data kèm effect_ids/safety_ids/skincare_ids)
 *   POST /ingredient        (tạo → 201, res.data.data.id)
 *   PUT  /ingredient/{id}   (sửa)
 *   GET  /effect, /safety, /skincare  (danh sách đầy đủ cho multi-select)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Radio, Tabs, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

export default function IngredientForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        name: '',
        description: '',
        warning: 0,
        warning_text: '',
        effect_ids: [],
        safety_ids: [],
        skincare_ids: [],
    });
    const [effects, setEffects] = useState([]);
    const [safeties, setSafeties] = useState([]);
    const [skincares, setSkincares] = useState([]);
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const loadPickers = useCallback(() => {
        Promise.all([
            api.get('/effect').then((res) => setEffects(res.data?.data || [])),
            api.get('/safety').then((res) => setSafeties(res.data?.data || [])),
            api.get('/skincare').then((res) => setSkincares(res.data?.data || [])),
        ]).catch(() => {});
    }, []);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/ingredient/${objForm.id}`)
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
        loadPickers();
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
                    description: objForm.description,
                    warning: objForm.warning,
                    warning_text: objForm.warning_text,
                    effect_ids: objForm.effect_ids,
                    safety_ids: objForm.safety_ids,
                    skincare_ids: objForm.skincare_ids,
                };
                const req =
                    objForm.id > 0
                        ? api.put(`/ingredient/${objForm.id}`, payload)
                        : api.post('/ingredient', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/ingredient/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/ingredient/${newId}`);
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
            <Wrapper title={t('AddIngredient')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const tabItems = [
        {
            key: 'general',
            label: 'General',
            children: (
                <div>
                    <div className="row mt-3">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('IngredientName')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={objForm.name}
                                placeholder={t('IngredientName')}
                                onChange={(e) => setField('name', e.target.value)}
                            />
                            {errOf('name') && <span className="has-error">{errOf('name')}</span>}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Description')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={objForm.description}
                                placeholder={t('Description')}
                                onChange={(e) => setField('description', e.target.value)}
                            />
                            {errOf('description') && (
                                <span className="has-error">{errOf('description')}</span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Warning')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Radio.Group
                                value={objForm.warning}
                                onChange={(e) => setField('warning', e.target.value)}
                            >
                                <Radio value={1}>Yes</Radio>
                                <Radio value={0}>No</Radio>
                            </Radio.Group>
                            {errOf('warning') && (
                                <span className="has-error">{errOf('warning')}</span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('WarningText')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={objForm.warning_text}
                                placeholder={t('WarningText')}
                                onChange={(e) => setField('warning_text', e.target.value)}
                            />
                            {errOf('warning_text') && (
                                <span className="has-error">{errOf('warning_text')}</span>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'data',
            label: 'Data',
            children: (
                <div>
                    <div className="row mt-3">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Skincare')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('Select')}
                                value={objForm.skincare_ids}
                                onChange={(val) => setField('skincare_ids', val)}
                                options={skincares.map((s) => ({ label: s.name, value: s.id }))}
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Safety')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('Select')}
                                value={objForm.safety_ids}
                                onChange={(val) => setField('safety_ids', val)}
                                options={safeties.map((s) => ({ label: s.name, value: s.id }))}
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Effects')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                placeholder={t('Select')}
                                value={objForm.effect_ids}
                                onChange={(val) => setField('effect_ids', val)}
                                options={effects.map((e) => ({ label: e.name, value: e.id }))}
                            />
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <Wrapper title={objForm.id > 0 ? t('EditIngredient') : t('AddIngredient')} sapo="">
            <div className="ingredient-form">
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/ingredient/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
