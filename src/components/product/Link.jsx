/**
 * components/product/Link.jsx — tab "Link" của product form.
 * -----------------------------------------------------------
 * Convert từ product/subForm/link.vue:
 *   - Manufacturer (select đơn, resource.manufacture)
 *   - Categories   (MultipleSelect, lọc cục bộ trên resource.category theo title)
 *   - Filter       (select nhiều, nhóm theo resource.filter -> filter_values)
 *   - Product Related   (MultipleSelect, tìm qua API GET /product?keyword=)
 *   - Product Ingredient(MultipleSelect, tìm qua API GET /ingredient?keyword=)
 *
 * MultipleSelect giữ shape selection {id, title|name}; onChange(next, opened).
 * -----------------------------------------------------------
 */

import React, { useState } from 'react';
import { Input, Select } from 'antd';

import MultipleSelect from '@/components/ui/MultipleSelect';
import api from '@/core/services/api';
import useTranslation from '@/core/hooks/useTranslation';

export default function Link({ product, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();

    // --- Categories (lọc cục bộ) ---
    const [kwCate, setKwCate] = useState('');
    const [openCate, setOpenCate] = useState(false);

    // --- Related (tìm API) ---
    const [kwRelated, setKwRelated] = useState('');
    const [openRelated, setOpenRelated] = useState(false);
    const [sugRelated, setSugRelated] = useState([]);

    // --- Ingredient (tìm API) ---
    const [kwIng, setKwIng] = useState('');
    const [openIng, setOpenIng] = useState(false);
    const [sugIng, setSugIng] = useState([]);

    const searchRelated = (kw) => {
        setKwRelated(kw);
        api
            .get('/product', { params: { keyword: kw, per_page: 10 } })
            .then((res) => {
                setSugRelated(res.data?.data || []);
                setOpenRelated(true);
            })
            .catch(() => {});
    };

    const searchIngredient = (kw) => {
        setKwIng(kw);
        api
            .get('/ingredient', { params: { keyword: kw, per_page: 10 } })
            .then((res) => {
                setSugIng(res.data?.data || []);
                setOpenIng(true);
            })
            .catch(() => {});
    };

    return (
        <div className="card m-b-20">
            <div className="card-body">
                {/* Manufacturer */}
                <div className="row">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Manufacturer')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            optionFilterProp="label"
                            placeholder={t('Select')}
                            value={product.manufacturer_id || undefined}
                            onChange={(v) => onChange({ manufacturer_id: v ?? '' })}
                            options={(resource.manufacture || []).map((m) => ({
                                label: m.name,
                                value: m.id,
                            }))}
                        />
                        {errors?.manufacturer_id?.[0] && (
                            <span className="has-error">{errors.manufacturer_id[0]}</span>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Categories')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={kwCate}
                            onChange={(e) => {
                                setKwCate(e.target.value);
                                setOpenCate(true);
                            }}
                            onFocus={() => setOpenCate(true)}
                            onBlur={() => setTimeout(() => setOpenCate(false), 150)}
                        />
                        <MultipleSelect
                            suggestions={resource.category || []}
                            selection={product.product_categories || []}
                            keyword={kwCate}
                            opened={openCate}
                            onChange={(sel, op) => {
                                onChange({ product_categories: sel });
                                setOpenCate(op);
                            }}
                        />
                    </div>
                </div>

                {/* Filter (nhóm) */}
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Filter')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            mode="multiple"
                            showSearch
                            optionFilterProp="label"
                            placeholder={t('Select')}
                            value={product.product_filters || []}
                            onChange={(v) => onChange({ product_filters: v })}
                            options={(resource.filter || []).map((g) => ({
                                label: g.name,
                                options: (g.filter_values || []).map((fv) => ({
                                    label: fv.name,
                                    value: fv.id,
                                })),
                            }))}
                        />
                    </div>
                </div>

                {/* Product Related */}
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ProductRelated')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={kwRelated}
                            onChange={(e) => searchRelated(e.target.value)}
                            onFocus={() => searchRelated(kwRelated)}
                            onBlur={() => setTimeout(() => setOpenRelated(false), 150)}
                        />
                        <MultipleSelect
                            label="name"
                            suggestions={sugRelated}
                            selection={product.product_related || []}
                            keyword={kwRelated}
                            opened={openRelated}
                            onChange={(sel, op) => {
                                onChange({ product_related: sel });
                                setOpenRelated(op);
                            }}
                        />
                    </div>
                </div>

                {/* Product Ingredient */}
                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ProductIngredient')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={kwIng}
                            onChange={(e) => searchIngredient(e.target.value)}
                            onFocus={() => searchIngredient(kwIng)}
                            onBlur={() => setTimeout(() => setOpenIng(false), 150)}
                        />
                        <MultipleSelect
                            label="name"
                            suggestions={sugIng}
                            selection={product.product_ingredients || []}
                            keyword={kwIng}
                            opened={openIng}
                            onChange={(sel, op) => {
                                onChange({ product_ingredients: sel });
                                setOpenIng(op);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
