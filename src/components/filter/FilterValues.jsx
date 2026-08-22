/**
 * components/filter/FilterValues.jsx — bảng filter_values[] của filter/form.jsx.
 * -----------------------------------------------------------
 * Convert từ mt219 cms/components/filter/form.vue (bảng "Filter Value").
 * Mỗi dòng = 1 giá trị filter (vd "Đỏ", "Xanh" cho filter "Màu sắc"), có
 * filter_value_descriptions[] (name theo ngôn ngữ, căn theo listLanguages —
 * giống buildDescriptions ở category/form.jsx) + sort_order.
 *
 * Props:
 *   values         : filter_values[] (đã build đủ theo listLanguages)
 *   listLanguages  : từ useListLanguages()
 *   languageDefault: từ useLanguageDefault()
 *   errors         : object lỗi 422 (key 'filter_values.{i}.xxx')
 *   onChange       : (nextValues) => void
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input } from 'antd';

import useTranslation from '@/core/hooks/useTranslation';
import { confirm } from '@/core/services/alert';

const emptyValueDescription = (code) => ({ language_code: code, name: '' });

export function buildValueDescriptions(listLanguages, existing = []) {
    return listLanguages.map(
        (lang) =>
            existing.find((d) => d.language_code === lang.code) ||
            emptyValueDescription(lang.code)
    );
}

export function emptyFilterValue(listLanguages) {
    return {
        id: 0,
        sort_order: '',
        filter_value_descriptions: buildValueDescriptions(listLanguages),
    };
}

export default function FilterValues({
    values,
    listLanguages,
    languageDefault,
    errors = {},
    onChange,
}) {
    const t = useTranslation();

    const errOf = (key) => errors?.[key]?.[0];

    const setValues = (next) => onChange(next);

    const setField = (i, field, value) =>
        setValues(values.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));

    const setDesc = (i, langIndex, field, value) =>
        setValues(
            values.map((v, idx) =>
                idx === i
                    ? {
                          ...v,
                          filter_value_descriptions: v.filter_value_descriptions.map((d, j) =>
                              j === langIndex ? { ...d, [field]: value } : d
                          ),
                      }
                    : v
            )
        );

    const addValue = () => setValues([...values, emptyFilterValue(listLanguages)]);

    const removeValue = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setValues(values.filter((_, idx) => idx !== i)))
            .catch(() => {});

    return (
        <table className="table table-bordered filter-values">
            <thead>
                <tr>
                    <th>{t('FilterName')}</th>
                    <th className="width-150">{t('SortOrder')}</th>
                    <th className="text-center width-150">{t('Action')}</th>
                </tr>
            </thead>
            <tbody>
                {values.map((item, i) => (
                    <tr key={i} className="post-item-group">
                        <td>
                            {listLanguages.map((lang, j) => {
                                const desc =
                                    item.filter_value_descriptions[j] ||
                                    emptyValueDescription(lang.code);
                                return (
                                    <div key={lang.code} className="mb-2">
                                        <Input
                                            value={desc.name}
                                            placeholder={
                                                lang.code === languageDefault
                                                    ? `${t('Name')} (${lang.name}) *`
                                                    : `${t('Name')} (${lang.name})`
                                            }
                                            onChange={(e) => setDesc(i, j, 'name', e.target.value)}
                                        />
                                        {errOf(`filter_values.${i}.filter_value_descriptions.${j}.name`) && (
                                            <span className="has-error">
                                                {errOf(`filter_values.${i}.filter_value_descriptions.${j}.name`)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </td>

                        <td className="width-150">
                            <Input
                                value={item.sort_order}
                                placeholder={t('SortOrder')}
                                onChange={(e) => setField(i, 'sort_order', e.target.value)}
                            />
                            {errOf(`filter_values.${i}.sort_order`) && (
                                <span className="has-error">
                                    {errOf(`filter_values.${i}.sort_order`)}
                                </span>
                            )}
                        </td>

                        <td className="width-100">
                            <div className="float-right">
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => removeValue(i)}
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
                            title={t('AddFilterValue')}
                            onClick={addValue}
                        >
                            <i className="fa fa-plus-circle" />
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
