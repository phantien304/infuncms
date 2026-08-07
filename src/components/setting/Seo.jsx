/**
 * components/setting/Seo.jsx — tab "Seo" của setting/detail.jsx.
 * -----------------------------------------------------------
 * Convert 1:1 từ mt219 resources/js/cms/components/setting/subForm/seo.vue —
 * không có key mới so với datatable hiện tại.
 *
 * Props: setting, onChange — giống General.jsx.
 * -----------------------------------------------------------
 */

import React from 'react';

import TinyMce from '@/components/ui/TinyMce';
import useTranslation from '@/core/hooks/useTranslation';

export default function Seo({ setting = {}, onChange }) {
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

    const textarea = (field) => (
        <textarea
            rows={3}
            className="form-control"
            value={setting[field] ?? ''}
            onChange={(e) => setField(field, e.target.value)}
        />
    );

    const pair = (titleKey, titleField, descKey, descField, first = false) => (
        <>
            <div className={'row' + (first ? '' : ' mt-3 pt-3 border-top')}>
                <div className="col-xl-12">
                    <label className="tit">{t(titleKey)}</label>
                </div>
                <div className="col-xl-12">{text(titleField)}</div>
            </div>
            <div className="row mt-3">
                <div className="col-xl-12">
                    <label className="tit">{t(descKey)}</label>
                </div>
                <div className="col-xl-12">{textarea(descField)}</div>
            </div>
        </>
    );

    return (
        <div className="row mt-3">
            <div className="col-xl-12">
                <div className="card m-b-20">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-xl-6 border-right">
                                {pair('TitleHome', 'seo_title_home', 'DescriptionHome', 'seo_description_home', true)}
                                {pair('TitleProducts', 'seo_title_products', 'DescriptionProducts', 'seo_description_products')}
                                {pair('TitleCart', 'seo_title_cart', 'DescriptionCart', 'seo_description_cart')}
                                {pair('TitleCheckout', 'seo_title_checkout', 'DescriptionCheckout', 'seo_description_checkout')}
                                {pair('TitleCartSearch', 'seo_title_cart_search', 'DescriptionCartSearch', 'seo_description_cart_search')}
                            </div>
                            <div className="col-xl-6">
                                {pair('TitleBlogs', 'seo_title_blogs', 'DescriptionBlogs', 'seo_description_blogs', true)}
                                {pair('TitleIngredient', 'seo_title_ingredient', 'DescriptionIngredient', 'seo_description_ingredient')}
                                {pair('TitleTag', 'seo_title_tags', 'DescriptionTags', 'seo_description_tags')}
                                {pair('TitleCheckoutSuccess', 'seo_title_checkout_success', 'DescriptionCheckoutSuccess', 'seo_description_checkout_success')}
                                <div className="row mt-3 border-top">
                                    <div className="col-xl-12">
                                        <label className="tit">{t('TextCheckoutSuccess')}</label>
                                    </div>
                                    <div className="col-xl-12">
                                        <TinyMce
                                            value={setting.config_text_checkout_success || ''}
                                            height={200}
                                            onChange={(html) => setField('config_text_checkout_success', html)}
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
