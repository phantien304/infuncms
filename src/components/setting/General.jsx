/**
 * components/setting/General.jsx — tab "General" của setting/detail.jsx.
 * -----------------------------------------------------------
 * Convert từ mt219 resources/js/cms/components/setting/subForm/general.vue.
 *
 * Thêm mới so với mt219 (bảng `setting` đã có nhưng form Vue2 cũ chưa có ô
 * nhập — xem CLAUDE.md phần "datatable" người dùng lưu ý khi convert):
 *   - config_debug            : bật/tắt debug mode (1 trong 3 cờ mà
 *                                SettingObserver dùng để quyết định flush
 *                                CacheGate::flushAll()).
 *   - config_list_count_ttl   : TTL (giây) cache COUNT phân trang list sản
 *                                phẩm — xem ProductRepository::L~260. 0 = tắt.
 *
 * Props:
 *   setting   : object config phẳng (setting/detail.jsx quản lý state)
 *   resource  : { user_group, weight_class, length_class, category } —
 *               GET /resource?list_for_setting=true
 *   onChange  : (patch) => void — merge patch vào setting cha
 * -----------------------------------------------------------
 */

import React from 'react';
import { Select } from 'antd';

import Photo from '@/components/ui/Photo';
import useTranslation from '@/core/hooks/useTranslation';
import { useListLanguages } from '@/core/stores/appSettingsStore';

const YES_NO = [
    { value: 1, label: 'Yes' },
    { value: 0, label: 'No' },
];

export default function General({ setting = {}, resource = {}, onChange }) {
    const t = useTranslation();
    const listLanguages = useListLanguages();

    const setField = (field, value) => onChange({ [field]: value });

    const text = (field, disabled = false) => (
        <input
            type="text"
            className="form-control"
            value={setting[field] ?? ''}
            disabled={disabled}
            onChange={(e) => setField(field, e.target.value)}
        />
    );

    const select = (field, options, placeholder = t('Select')) => (
        <Select
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="label"
            placeholder={placeholder}
            value={setting[field] === '' ? undefined : setting[field]}
            onChange={(v) => setField(field, v)}
            options={options}
        />
    );

    return (
        <div className="row mt-3">
            <div className="col-xl-12">
                <div className="card m-b-20">
                    <div className="card-body">
                        <div className="row mt-3">
                            <div className="col-xl-6">
                                <label className="tit">{t('UrlCms')}</label>
                                {text('config_url_cms', true)}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('StorageDomain')}</label>
                                {text('config_storage_domain', true)}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('Domain')}</label>
                                {text('config_domain', true)}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('CurrencyUnit')}</label>
                                {text('config_currency')}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('UserDefaultGroup')}</label>
                                {select(
                                    'config_user_group_id',
                                    (resource.user_group || []).map((i) => ({
                                        value: i.id,
                                        label: i.name,
                                    }))
                                )}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('RewardPointEnabled')}</label>
                                {select('config_reward_point_enabled', YES_NO)}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('LanguageDefault')}</label>
                                {select(
                                    'config_language',
                                    listLanguages.map((l) => ({ value: l.code, label: l.name }))
                                )}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('LanguageDefaultAdmin')}</label>
                                {select(
                                    'config_language_admin',
                                    listLanguages.map((l) => ({ value: l.code, label: l.name }))
                                )}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('WeightDefault')}</label>
                                {select(
                                    'config_weight_class_id',
                                    (resource.weight_class || []).map((i) => ({
                                        value: i.id,
                                        label: i.title,
                                    }))
                                )}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('LengthDefault')}</label>
                                {select(
                                    'config_length_class_id',
                                    (resource.length_class || []).map((i) => ({
                                        value: i.id,
                                        label: i.title,
                                    }))
                                )}
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-6">
                                <label className="tit">{t('ThemeVersion')}</label>
                                {text('config_theme_version')}
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('CategoryHomePage')}</label>
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%' }}
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder={t('Select')}
                                    value={setting.category_show_home_page || []}
                                    onChange={(v) => setField('category_show_home_page', v)}
                                    options={(resource.category || []).map((i) => ({
                                        value: i.id,
                                        label: i.title,
                                    }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-xl-6">
                <div className="card m-b-20">
                    <div className="card-body">
                        <h3 className="mt-0 header-title">{t('Image')}</h3>
                        <div className="row">
                            <div className="col-xl-6">
                                <label className="tit">{t('StoreLogo')}</label>
                                <div className="logo">
                                    <Photo
                                        src={setting.config_logo}
                                        onChange={(url) => setField('config_logo', url)}
                                        width="180px"
                                        height="50px"
                                    />
                                </div>
                            </div>
                            <div className="col-xl-6">
                                <label className="tit">{t('Icon')}</label>
                                <div className="icon">
                                    <Photo
                                        src={setting.config_icon}
                                        onChange={(url) => setField('config_icon', url)}
                                        width="40px"
                                        height="40px"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-xl-6">
                <div className="card m-b-20">
                    <div className="card-body">
                        <h3 className="mt-0 header-title">{t('Server')}</h3>
                        <div className="row mt-3">
                            <div className="col-xl-6">
                                <label className="tit" dangerouslySetInnerHTML={{ __html: t('FileCache') }} />
                                <select
                                    className="form-control"
                                    value={setting.config_cache_file ?? 0}
                                    onChange={(e) => setField('config_cache_file', Number(e.target.value))}
                                >
                                    <option value={1}>{t('Yes')}</option>
                                    <option value={0}>{t('No')}</option>
                                </select>
                            </div>
                            <div className="col-xl-6">
                                <label className="tit" dangerouslySetInnerHTML={{ __html: t('RedisCache') }} />
                                <select
                                    className="form-control"
                                    value={setting.config_redis_cache ?? 0}
                                    onChange={(e) => setField('config_redis_cache', Number(e.target.value))}
                                >
                                    <option value={1}>{t('Yes')}</option>
                                    <option value={0}>{t('No')}</option>
                                </select>
                            </div>
                            <div className="col-xl-6 mt-3">
                                <label className="tit">{t('Maintenance')}</label>
                                <select
                                    className="form-control"
                                    value={setting.config_maintenance ?? 0}
                                    onChange={(e) => setField('config_maintenance', Number(e.target.value))}
                                >
                                    <option value={1}>{t('Yes')}</option>
                                    <option value={0}>{t('No')}</option>
                                </select>
                            </div>
                            {/* Mới (chưa có ở form mt219) — bảng setting đã có sẵn key này. */}
                            <div className="col-xl-6 mt-3">
                                <label className="tit">Debug mode</label>
                                <select
                                    className="form-control"
                                    value={setting.config_debug ?? 0}
                                    onChange={(e) => setField('config_debug', Number(e.target.value))}
                                >
                                    <option value={1}>{t('Yes')}</option>
                                    <option value={0}>{t('No')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    TTL cache đếm sản phẩm khi phân trang (giây)
                                    <br />
                                    <small>0 = tắt cache đếm</small>
                                </label>
                            </div>
                            <div className="col-xl-12">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={setting.config_list_count_ttl ?? 0}
                                    onChange={(e) =>
                                        setField('config_list_count_ttl', Number(e.target.value))
                                    }
                                />
                            </div>
                        </div>
                        <div className="row mt-3">
                            <div className="col-xl-12">
                                <label className="tit">{t('EmailReceiveNotification')}</label>
                            </div>
                            <div className="col-xl-12">
                                {text('config_email_notification')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
