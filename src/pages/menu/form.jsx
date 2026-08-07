/**
 * pages/menu/form.jsx — THÊM/SỬA menu (REST chuẩn) + quản lý cây menu_value.
 * -----------------------------------------------------------
 * Convert từ mt219 resources/js/cms/components/menu/form.vue.
 * Phần trên (title/position/theme) mirror category/form.jsx (đơn giản hơn —
 * KHÔNG có bảng dịch). Phần dưới (chỉ hiện khi đã có id) quản lý cây
 * menu_value — tách 2 component con components/menu/MenuValueTree.jsx
 * (cây kéo-thả + Import/Xoá Category) và MenuValueForm.jsx (form sửa 1 node).
 *
 *   GET  /menu/{id}   (chi tiết)
 *   POST /menu         (tạo → 201, res.data.data.id)
 *   PUT  /menu/{id}    (sửa)
 * Lỗi validate: 422 { errors: { title: [...], position: [...] } }.
 *
 * Field MỚI so với mt219 gốc: `theme` (gán menu cho 1 theme cụ thể trong hệ
 * theme multi-tenant — xem config/theme.php phía BE). `theme = ''` (rỗng)
 * nghĩa là "Mặc định / mọi theme", giữ đúng hành vi cũ.
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import MenuValueTree from '@/components/menu/MenuValueTree';
import MenuValueForm from '@/components/menu/MenuValueForm';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useThemes } from '@/core/stores/appSettingsStore';

export default function MenuForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const themes = useThemes();

    const [objForm, setObjForm] = useState({
        id: parseInt(params.id, 10) || 0,
        title: '',
        position: '',
        theme: '',
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    // Cây menu_value: id node đang mở form sửa (0 = đang ở chế độ tạo mới).
    const [selectedValueId, setSelectedValueId] = useState(0);
    const [treeReloadToken, setTreeReloadToken] = useState(0);

    const getDetail = useCallback(() => {
        const inst = loading.open();
        if (objForm.id > 0) {
            api
                .get(`/menu/${objForm.id}`)
                .then((res) => {
                    const data = res.data?.data || {};
                    setObjForm({
                        id: data.id,
                        title: data.title || '',
                        position: data.position || '',
                        theme: data.theme || '',
                    });
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
                    title: objForm.title,
                    position: objForm.position,
                    theme: objForm.theme || null,
                };
                const req = objForm.id > 0
                    ? api.put(`/menu/${objForm.id}`, payload)
                    : api.post('/menu', payload);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/menu/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                getDetail();
                            } else {
                                navigate(`/menu/${newId}`);
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
            <Wrapper title={t('AddMenu')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={objForm.id > 0 ? t('EditMenu') : t('AddMenu')} sapo="">
            <div className="menu-form">
                <h3 className="header-title">{t('Menu')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Title')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.title}
                            placeholder={t('Title')}
                            onChange={(e) => setField('title', e.target.value)}
                        />
                        {errOf('title') && <span className="has-error">{errOf('title')}</span>}
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
                            placeholder={t('Select')}
                            value={objForm.position || undefined}
                            onChange={(val) => setField('position', val)}
                            options={[
                                { label: t('Top'), value: 'top' },
                                { label: t('Footer'), value: 'footer' },
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

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={() => save(false)}>
                        {t('Save')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                    &nbsp;
                    <Link to="/menu/list" className="btn btn-danger">
                        {t('Cancel')}
                    </Link>
                </div>

                {objForm.id > 0 && (
                    <div className="row mt-5">
                        <div className="col-xl-4">
                            <MenuValueTree
                                menuId={objForm.id}
                                selectedId={selectedValueId}
                                reloadToken={treeReloadToken}
                                onSelect={(id) => setSelectedValueId(id)}
                                onCreateNew={() => setSelectedValueId(0)}
                            />
                        </div>
                        <div className="col-xl-8" style={{ paddingLeft: 50 }}>
                            <h4 className="header-title">
                                {selectedValueId > 0 ? t('EditMenuValue') : t('CreateMenuValue')}
                            </h4>
                            <MenuValueForm
                                menuId={objForm.id}
                                valueId={selectedValueId}
                                onSaved={(newId) => {
                                    setTreeReloadToken((v) => v + 1);
                                    if (newId) setSelectedValueId(newId);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Wrapper>
    );
}
