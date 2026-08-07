/**
 * components/product/General.jsx — tab "General" của product form.
 * -----------------------------------------------------------
 * Convert từ product/subForm/general.vue: mô tả đa ngôn ngữ
 * (name / description / content[TinyMCE] / meta_title / meta_description /
 * meta_keyword). Mỗi ngôn ngữ 1 tab con.
 *
 * Props:
 *   descriptions   : mảng product_descriptions (song song listLanguages)
 *   onChangeDesc   : (index, field, value) => void
 *   errors         : object lỗi validate ('product_descriptions.0.name': [...])
 * -----------------------------------------------------------
 */

import React, { useState } from 'react';
import { Tabs, Input } from 'antd';

import TinyMce from '@/components/ui/TinyMce';
import useTranslation from '@/core/hooks/useTranslation';
import {
    useListLanguages,
    useLanguageDefault,
} from '@/core/stores/appSettingsStore';

export default function General({ descriptions = [], onChangeDesc, errors = {} }) {
    const t = useTranslation();
    const listLanguages = useListLanguages();
    const languageDefault = useLanguageDefault();
    const [activeKey, setActiveKey] = useState('0');

    const errOf = (i, field) => errors?.[`product_descriptions.${i}.${field}`]?.[0];

    const items = listLanguages.map((lang, index) => {
        const d = descriptions[index] || { language_code: lang.code };
        return {
            key: String(index),
            label: lang.name,
            children: (
                <div>
                    <div className="row mt-3">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Name')}
                                {lang.code === languageDefault && (
                                    <span className="text-danger">&nbsp;*</span>
                                )}
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={d.name || ''}
                                onChange={(e) => onChangeDesc(index, 'name', e.target.value)}
                            />
                            {errOf(index, 'name') && (
                                <span className="has-error">{errOf(index, 'name')}</span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Description')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={d.description || ''}
                                onChange={(e) =>
                                    onChangeDesc(index, 'description', e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('ProductContent')}</label>
                        </div>
                        <div className="col-xl-10">
                            <TinyMce
                                value={d.content || ''}
                                height={450}
                                onChange={(html) => onChangeDesc(index, 'content', html)}
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('MetaTitle')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={d.meta_title || ''}
                                placeholder={t('MetaTitle')}
                                onChange={(e) =>
                                    onChangeDesc(index, 'meta_title', e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('MetaDescription')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={d.meta_description || ''}
                                onChange={(e) =>
                                    onChangeDesc(index, 'meta_description', e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('MetaKeyword')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={d.meta_keyword || ''}
                                onChange={(e) =>
                                    onChangeDesc(index, 'meta_keyword', e.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>
            ),
        };
    });

    return (
        <div className="card m-b-20">
            <div className="card-body">
                <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
            </div>
        </div>
    );
}
