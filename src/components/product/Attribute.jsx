/**
 * components/product/Attribute.jsx — tab "Attribute" của product form.
 * -----------------------------------------------------------
 * Convert từ product/subForm/attribute.vue: bảng thuộc tính.
 * Mỗi dòng: attribute_id (select nhóm theo resource.attribute -> attribute_values)
 * + product_attribute: text theo từng ngôn ngữ (kèm cờ).
 *
 * Mỗi dòng được chuẩn hoá product_attribute theo listLanguages (merge dữ liệu
 * đã có), thêm/xoá dòng.
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input, Select } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';
import { useListLanguages } from '@/core/stores/appSettingsStore';
import { confirm } from '@/core/services/alert';

export default function Attribute({ product, resource = {}, errors = {}, onChange }) {
    const t = useTranslation();
    const listLanguages = useListLanguages();
    const rows = product.product_attributes || [];

    const setRows = (next) => onChange({ product_attributes: next });

    // Chuẩn hoá product_attribute của 1 dòng theo listLanguages.
    const langValues = (row) =>
        listLanguages.map((lang) => {
            const ex = (row.product_attribute || []).find(
                (p) => p.language_code === lang.code
            );
            return {
                language_code: lang.code,
                text: ex?.text || '',
                flag_icon: lang.flag_icon,
            };
        });

    const addRow = () =>
        setRows([
            ...rows,
            {
                attribute_id: '',
                product_attribute: listLanguages.map((l) => ({
                    language_code: l.code,
                    text: '',
                    flag_icon: l.flag_icon,
                })),
            },
        ]);

    const removeRow = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setRows(rows.filter((_, idx) => idx !== i)))
            .catch(() => {});

    const setAttrId = (i, v) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, attribute_id: v } : r)));

    const setText = (i, langCode, value) =>
        setRows(
            rows.map((r, idx) => {
                if (idx !== i) return r;
                const values = langValues(r).map((v) =>
                    v.language_code === langCode ? { ...v, text: value } : v
                );
                return { ...r, product_attribute: values };
            })
        );

    const errOf = (key) => errors?.[key]?.[0];

    return (
        <div className="card m-b-20 product-attribute">
            <div className="card-body">
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th className="width-200">{t('Attribute')}</th>
                            <th>{t('Content')}</th>
                            <th className="text-center width-150">{t('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item, i) => (
                            <tr key={i} className="post-item-group">
                                <td className="width-150">
                                    <Select
                                        style={{ width: '100%' }}
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={t('Select')}
                                        value={item.attribute_id || undefined}
                                        onChange={(v) => setAttrId(i, v)}
                                        options={(resource.attribute || []).map((g) => ({
                                            label: g.name,
                                            options: (g.attribute_values || []).map((av) => ({
                                                label: av.name,
                                                value: av.id,
                                            })),
                                        }))}
                                    />
                                    {errOf(`product_attributes.${i}.attribute_id`) && (
                                        <span className="has-error">
                                            {errOf(`product_attributes.${i}.attribute_id`)}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {langValues(item).map((value, j) => (
                                        <div key={j} style={{ marginBottom: 20 }}>
                                            <div className="row">
                                                <div className="col-xl-1 pt-3 text-right">
                                                    {value.flag_icon && (
                                                        <img src={value.flag_icon} alt="" />
                                                    )}
                                                </div>
                                                <div className="col-xl-11">
                                                    <Input.TextArea
                                                        rows={3}
                                                        value={value.text}
                                                        onChange={(e) =>
                                                            setText(i, value.language_code, e.target.value)
                                                        }
                                                    />
                                                    {errOf(
                                                        `product_attributes.${i}.product_attribute.${j}.text`
                                                    ) && (
                                                        <span className="has-error">
                                                            {errOf(
                                                                `product_attributes.${i}.product_attribute.${j}.text`
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </td>
                                <td>
                                    <div className="float-right">
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => removeRow(i)}
                                        >
                                            <i className="mdi mdi-delete" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={2} />
                            <td className="text-right">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    title={t('Add')}
                                    onClick={addRow}
                                >
                                    <i className="fa fa-plus-circle" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
