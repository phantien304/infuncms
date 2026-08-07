/**
 * components/setting/Footer.jsx — tab "Footer" của setting/detail.jsx.
 * -----------------------------------------------------------
 * Convert 1:1 từ mt219 resources/js/cms/components/setting/subForm/footer.vue —
 * không có key mới so với datatable hiện tại.
 *
 * Props: setting, onChange — giống General.jsx.
 * -----------------------------------------------------------
 */

import React from 'react';

import TinyMce from '@/components/ui/TinyMce';
import useTranslation from '@/core/hooks/useTranslation';

export default function Footer({ setting = {}, onChange }) {
    const t = useTranslation();

    const setField = (field, value) => onChange({ [field]: value });

    const editor = (field) => (
        <TinyMce
            value={setting[field] || ''}
            height={200}
            onChange={(html) => setField(field, html)}
        />
    );

    return (
        <div className="row mt-3">
            <div className="col-xl-12">
                <div className="card m-b-20">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-xl-6 border-right">
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Footer1')}</label>
                                    </div>
                                    <div className="col-xl-12">{editor('config_footer1')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Footer2')}</label>
                                    </div>
                                    <div className="col-xl-12">{editor('config_footer2')}</div>
                                </div>
                            </div>
                            <div className="col-xl-6">
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Footer3')}</label>
                                    </div>
                                    <div className="col-xl-12">{editor('config_footer3')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Footer4')}</label>
                                    </div>
                                    <div className="col-xl-12">{editor('config_footer4')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
