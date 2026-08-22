/**
 * components/option/OptionValues.jsx — bảng option_values[] của
 * option/form.jsx. Mirror components/filter/FilterValues.jsx, thêm cột ảnh
 * (dùng cho variant swatch — vd màu sắc) qua <Photo>.
 * -----------------------------------------------------------
 * Convert từ mt219 cms/components/option/form.vue (bảng "Filter Value" cũ,
 * đổi tên option). Chỉ hiển thị khi type thuộc nhóm có value cố định
 * (select/radio/checkbox/image) — điều kiện show/hide xử lý ở option/form.jsx.
 *
 * Props:
 *   values         : option_values[] (đã build đủ theo listLanguages)
 *   listLanguages  : từ useListLanguages()
 *   languageDefault: từ useLanguageDefault()
 *   errors         : object lỗi 422 (key 'option_values.{i}.xxx')
 *   onChange       : (nextValues) => void
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input } from 'antd';

import Photo from '@/components/ui/Photo';
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

export function emptyOptionValue(listLanguages) {
    return {
        id: 0,
        image: '',
        sort_order: '',
        option_value_descriptions: buildValueDescriptions(listLanguages),
    };
}

export default function OptionValues({
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
                          option_value_descriptions: v.option_value_descriptions.map((d, j) =>
                              j === langIndex ? { ...d, [field]: value } : d
                          ),
                      }
                    : v
            )
        );

    const addValue = () => setValues([...values, emptyOptionValue(listLanguages)]);

    const removeValue = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setValues(values.filter((_, idx) => idx !== i)))
            .catch(() => {});

    return (
        <table className="table table-bordered option-values">
            <thead>
                <tr>
                    <th>{t('FilterName')}</th>
                    <th className="width-150">{t('Image')}</th>
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
                                    item.option_value_descriptions[j] ||
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
                                        {errOf(`option_values.${i}.option_value_descriptions.${j}.name`) && (
                                            <span className="has-error">
                                                {errOf(`option_values.${i}.option_value_descriptions.${j}.name`)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </td>

                        <td className="width-150">
                            <Photo
                                src={item.image}
                                width="100px"
                                height="100px"
                                index={i}
                                onChange={(url) => setField(i, 'image', url)}
                            />
                            {errOf(`option_values.${i}.image`) && (
                                <span className="has-error">
                                    {errOf(`option_values.${i}.image`)}
                                </span>
                            )}
                        </td>

                        <td className="width-150">
                            <Input
                                value={item.sort_order}
                                placeholder={t('SortOrder')}
                                onChange={(e) => setField(i, 'sort_order', e.target.value)}
                            />
                            {errOf(`option_values.${i}.sort_order`) && (
                                <span className="has-error">
                                    {errOf(`option_values.${i}.sort_order`)}
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
                    <td colSpan={3} />
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
