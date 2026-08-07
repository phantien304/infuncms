/**
 * components/banner/BannerValues.jsx — bảng banner_values[] của banner/form.jsx.
 * -----------------------------------------------------------
 * Convert từ mt219 cms/components/banner/form.vue (bảng "Banner Value").
 * Mỗi dòng = 1 slide, có thể là ẢNH hoặc VIDEO (media_type):
 *   - image  → Photo (giống ProductImage.jsx).
 *   - video  → chọn provider:
 *       - youtube → dán URL, preview bằng iframe nhúng.
 *       - r2      → VideoUpload (upload file lên R2, preview <video>).
 * Mỗi dòng còn có banner_value_descriptions[] (title/content theo ngôn ngữ,
 * căn theo listLanguages — giống buildDescriptions ở category/form.jsx).
 *
 * Props:
 *   values         : banner_values[] (đã build đủ theo listLanguages)
 *   listLanguages  : từ useListLanguages()
 *   languageDefault: từ useLanguageDefault()
 *   errors         : object lỗi 422 (key 'banner_values.{i}.xxx')
 *   onChange       : (nextValues) => void
 * -----------------------------------------------------------
 */

import React from 'react';
import { Input, Select } from 'antd';

import Photo from '@/components/ui/Photo';
import VideoUpload from '@/components/ui/VideoUpload';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm } from '@/core/services/alert';
import { youtubeEmbedUrl } from '@/core/utils/youtube';

const emptyValueDescription = (code) => ({ language_code: code, title: '', content: '' });

export function buildValueDescriptions(listLanguages, existing = []) {
    return listLanguages.map(
        (lang) =>
            existing.find((d) => d.language_code === lang.code) ||
            emptyValueDescription(lang.code)
    );
}

export function emptyBannerValue(listLanguages) {
    return {
        id: 0,
        link: '',
        sort_order: '',
        media_type: 'image',
        image: '',
        video_provider: '',
        video_url: '',
        banner_value_descriptions: buildValueDescriptions(listLanguages),
    };
}

export default function BannerValues({
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
                          banner_value_descriptions: v.banner_value_descriptions.map((d, j) =>
                              j === langIndex ? { ...d, [field]: value } : d
                          ),
                      }
                    : v
            )
        );

    const setMediaType = (i, mediaType) =>
        setValues(
            values.map((v, idx) =>
                idx === i
                    ? {
                          ...v,
                          media_type: mediaType,
                          video_provider: mediaType === 'video' ? v.video_provider || 'youtube' : '',
                      }
                    : v
            )
        );

    const addValue = () => setValues([...values, emptyBannerValue(listLanguages)]);

    const removeValue = (i) =>
        confirm(t('DoYouWantToDelete'))
            .then(() => setValues(values.filter((_, idx) => idx !== i)))
            .catch(() => {});

    return (
        <table className="table table-bordered banner-values">
            <thead>
                <tr>
                    <th className="width-100">{t('STT')}</th>
                    <th>{t('BannerValueTitle')}</th>
                    <th className="width-200">{t('Media')}</th>
                    <th>{t('Link')}</th>
                    <th className="width-150">{t('SortOrder')}</th>
                    <th className="text-center width-150">{t('Action')}</th>
                </tr>
            </thead>
            <tbody>
                {values.map((item, i) => (
                    <tr key={i} className="post-item-group">
                        <td>{i + 1}</td>

                        <td>
                            {listLanguages.map((lang, j) => {
                                const desc = item.banner_value_descriptions[j] || emptyValueDescription(lang.code);
                                return (
                                    <div key={lang.code} className="mb-2">
                                        <Input
                                            value={desc.title}
                                            placeholder={
                                                lang.code === languageDefault
                                                    ? `${t('Title')} (${lang.name}) *`
                                                    : `${t('Title')} (${lang.name})`
                                            }
                                            onChange={(e) => setDesc(i, j, 'title', e.target.value)}
                                        />
                                        {errOf(`banner_values.${i}.banner_value_descriptions.${j}.title`) && (
                                            <span className="has-error">
                                                {errOf(`banner_values.${i}.banner_value_descriptions.${j}.title`)}
                                            </span>
                                        )}
                                        <Input.TextArea
                                            className="mt-1"
                                            rows={2}
                                            placeholder={t('Content')}
                                            value={desc.content}
                                            onChange={(e) => setDesc(i, j, 'content', e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </td>

                        <td className="width-200">
                            <Select
                                style={{ width: '100%', marginBottom: 8 }}
                                value={item.media_type || 'image'}
                                onChange={(val) => setMediaType(i, val)}
                                options={[
                                    { label: t('Image'), value: 'image' },
                                    { label: t('Video'), value: 'video' },
                                ]}
                            />

                            {(item.media_type || 'image') === 'image' ? (
                                <>
                                    <Photo
                                        src={item.image}
                                        width="150px"
                                        height="100px"
                                        index={i}
                                        onChange={(url) => setField(i, 'image', url)}
                                    />
                                    {errOf(`banner_values.${i}.image`) && (
                                        <span className="has-error">
                                            {errOf(`banner_values.${i}.image`)}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Select
                                        style={{ width: '100%', marginBottom: 8 }}
                                        value={item.video_provider || 'youtube'}
                                        onChange={(val) => setField(i, 'video_provider', val)}
                                        options={[
                                            { label: 'YouTube', value: 'youtube' },
                                            { label: t('UploadR2'), value: 'r2' },
                                        ]}
                                    />

                                    {item.video_provider === 'r2' ? (
                                        <VideoUpload
                                            src={item.video_url}
                                            index={i}
                                            onChange={(path) => setField(i, 'video_url', path)}
                                        />
                                    ) : (
                                        <>
                                            <Input
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={item.video_url}
                                                onChange={(e) => setField(i, 'video_url', e.target.value)}
                                            />
                                            {youtubeEmbedUrl(item.video_url) && (
                                                <iframe
                                                    title={`youtube-preview-${i}`}
                                                    src={youtubeEmbedUrl(item.video_url)}
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: 300,
                                                        height: 170,
                                                        marginTop: 8,
                                                        border: 0,
                                                    }}
                                                    allowFullScreen
                                                />
                                            )}
                                        </>
                                    )}
                                    {errOf(`banner_values.${i}.video_url`) && (
                                        <span className="has-error">
                                            {errOf(`banner_values.${i}.video_url`)}
                                        </span>
                                    )}

                                    {/* Poster tuỳ chọn — hiển thị khi video chưa tải xong. */}
                                    <div className="mt-2">
                                        <label className="tit">{t('VideoPoster')}</label>
                                        <Photo
                                            src={item.image}
                                            width="150px"
                                            height="100px"
                                            index={i}
                                            onChange={(url) => setField(i, 'image', url)}
                                        />
                                    </div>
                                </>
                            )}
                        </td>

                        <td>
                            <Input
                                placeholder={t('Link')}
                                value={item.link}
                                onChange={(e) => setField(i, 'link', e.target.value)}
                            />
                            {errOf(`banner_values.${i}.link`) && (
                                <span className="has-error">{errOf(`banner_values.${i}.link`)}</span>
                            )}
                        </td>

                        <td>
                            <Input
                                value={item.sort_order}
                                placeholder={t('SortOrder')}
                                onChange={(e) => setField(i, 'sort_order', e.target.value)}
                            />
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
                    <td colSpan={5} />
                    <td className="text-right">
                        <button
                            type="button"
                            className="btn btn-primary"
                            title={t('AddBannerValue')}
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
