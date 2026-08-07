/**
 * components/product/ProductImage.jsx — tab "Image" của product form.
 * -----------------------------------------------------------
 * Convert từ product/subForm/image.vue: ảnh chính + danh sách ảnh phụ
 * (image + sort_order, thêm/xoá dòng).
 *
 * Props:
 *   product   : objForm (đọc image + product_images)
 *   onChange  : (patch) => void  (merge vào objForm)
 *   errors    : object lỗi validate
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input } from 'antd';

import Photo from '@/components/ui/Photo';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm } from '@/core/services/alert';

export default function ProductImage({ product, onChange, errors = {} }) {
    const t = useTranslation();
    const images = product.product_images || [];

    const setImages = (next) => onChange({ product_images: next });

    const setImageField = (i, field, value) =>
        setImages(images.map((img, idx) => (idx === i ? { ...img, [field]: value } : img)));

    const addImage = () =>
        setImages([...images, { id: 0, image: '', sort_order: '' }]);

    const removeImage = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setImages(images.filter((_, idx) => idx !== i)))
            .catch(() => {});

    return (
        <div className="card m-b-20 product-image">
            <div className="card-body">
                {/* Ảnh chính */}
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th className="width-150">
                                {t('Image')} <span className="text-danger">&nbsp;*</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <Photo
                                    src={product.image}
                                    width="120px"
                                    height="120px"
                                    onChange={(url) => onChange({ image: url })}
                                />
                                {errors?.image?.[0] && (
                                    <span className="has-error">{errors.image[0]}</span>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Ảnh phụ */}
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th className="width-150">{t('AdditionalImages')}</th>
                            <th className="text-right">{t('SortOrder')}</th>
                            <th className="text-center width-150">{t('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {images.map((item, i) => (
                            <tr key={i} className="post-item-group">
                                <td>
                                    <Photo
                                        src={item.image}
                                        width="120px"
                                        height="120px"
                                        index={i}
                                        onChange={(url) => setImageField(i, 'image', url)}
                                    />
                                    {errors?.[`product_images.${i}.image`]?.[0] && (
                                        <span className="has-error">
                                            {errors[`product_images.${i}.image`][0]}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <Input
                                        value={item.sort_order || ''}
                                        onChange={(e) =>
                                            setImageField(i, 'sort_order', e.target.value)
                                        }
                                    />
                                </td>
                                <td>
                                    <div className="float-right">
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => removeImage(i)}
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
                                    title={t('AddImage')}
                                    onClick={addImage}
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
