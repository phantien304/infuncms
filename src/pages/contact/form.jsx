/**
 * pages/contact/form.jsx — XEM chi tiết 1 contact (mailbox liên hệ).
 * Convert từ mt219 cms/components/contact/form.vue — đây là trang CHỈ XEM,
 * KHÔNG có nút Save (title gốc "ViewContact", chỉ có nút "Back"). Mở trang
 * này = tự động đánh dấu đã đọc (is_read=1), xử lý phía backend
 * (ContactRepository::getForCms) khi gọi GET /contact/{id}.
 * -----------------------------------------------------------
 *   GET /contact/{id}   (chi tiết — tự set is_read=1 phía server)
 * -----------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spin, Input } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { error as showError } from '@/core/services/alert';

const { TextArea } = Input;

export default function ContactForm() {
    const params = useParams();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState(null);
    const [loader, setLoader] = useState(false);

    useEffect(() => {
        const inst = loading.open();
        api
            .get(`/contact/${params.id}`)
            .then((res) => {
                setObjForm(res.data?.data || {});
                setLoader(true);
            })
            .catch((err) => {
                setLoader(true);
                showError(t(err?.response?.data?.message || 'ErrorAction'));
            })
            .finally(() => inst.close());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    if (!loader || !objForm) {
        return (
            <Wrapper title={t('ViewContact')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const field = (label, value) => (
        <div className="row mt-3 pt-3 border-top">
            <div className="col-xl-2 text-right">
                <label className="tit">{t(label)}</label>
            </div>
            <div className="col-xl-10">
                <Input value={value || ''} readOnly />
            </div>
        </div>
    );

    return (
        <Wrapper title={t('ViewContact')} sapo="">
            <div className="contact-form">
                <h3 className="mt-3 header-title">{t('Contact')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Name')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input value={objForm.name || ''} readOnly />
                    </div>
                </div>

                {field('Email', objForm.email)}
                {field('Company', objForm.company)}
                {field('Phone', objForm.phone)}
                {field('Address', objForm.address)}
                {field('Service', objForm.service)}

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Content')}</label>
                    </div>
                    <div className="col-xl-10">
                        <TextArea rows={5} value={objForm.content || ''} readOnly />
                    </div>
                </div>

                <div className="form-group mt-3 text-right">
                    <Link to="/contact/list" className="btn btn-danger">
                        {t('Back')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
