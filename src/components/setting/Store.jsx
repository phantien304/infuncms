/**
 * components/setting/Store.jsx — tab "Store" của setting/detail.jsx.
 * -----------------------------------------------------------
 * Convert từ mt219 resources/js/cms/components/setting/subForm/store.vue.
 *
 * Thêm mới so với mt219 (key đã có sẵn trong bảng `setting`, chưa có ô nhập
 * ở form Vue2 cũ):
 *   - config_review_policy : chính sách ai được viết đánh giá sản phẩm
 *     (App\Enums\ReviewPolicy — public/login/purchase), dùng ở
 *     ReviewService::create() + ProductController(web)@show.
 *
 * Props: setting, onChange — giống General.jsx.
 * -----------------------------------------------------------
 */

import React from 'react';
import { Select } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';

const REVIEW_POLICY_OPTIONS = [
    { value: 'public', label: 'Ai cũng đánh giá được' },
    { value: 'login', label: 'Phải đăng nhập' },
    { value: 'purchase', label: 'Phải mua hàng thành công' },
];

export default function Store({ setting = {}, onChange }) {
    const t = useTranslation();

    const setField = (field, value) => onChange({ [field]: value });

    const text = (field) => (
        <input
            type="text"
            className="form-control"
            value={setting[field] ?? ''}
            onChange={(e) => setField(field, e.target.value)}
        />
    );

    const textarea = (field, rows = 3) => (
        <textarea
            rows={rows}
            className="form-control"
            value={setting[field] ?? ''}
            onChange={(e) => setField(field, e.target.value)}
        />
    );

    return (
        <div className="row mt-3">
            <div className="col-xl-12">
                <div className="card m-b-20">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-xl-6">
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('StoreName')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_name')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Address')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_address')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('EMail')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_email')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Telephone')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_telephone')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('MetaTitle')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_meta_title')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('MetaDescription')}</label>
                                    </div>
                                    <div className="col-xl-12">{textarea('config_meta_description')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('GoogleAnalytics')}</label>
                                    </div>
                                    <div className="col-xl-12">{textarea('config_google_analytics', 5)}</div>
                                </div>
                            </div>
                            <div className="col-xl-6">
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Facebook')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_facebook')}</div>
                                </div>
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Instagram')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_instagram')}</div>
                                </div>
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Tiktok')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_tiktok')}</div>
                                </div>
                                <div className="row">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('Threads')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_threads')}</div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('OpeningTime')}</label>
                                    </div>
                                    <div className="col-xl-12">{text('config_opening_time')}</div>
                                </div>
                                {/* Mới (chưa có ở form mt219) — bảng setting đã có sẵn key này. */}
                                <div className="row mt-3 pt-3 border-top">
                                    <div className="col-xl-12">
                                        <label className="tit">Chính sách đánh giá sản phẩm</label>
                                    </div>
                                    <div className="col-xl-12">
                                        <Select
                                            style={{ width: '100%' }}
                                            value={setting.config_review_policy || 'public'}
                                            onChange={(v) => setField('config_review_policy', v)}
                                            options={REVIEW_POLICY_OPTIONS}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
