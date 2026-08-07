/**
 * pages/setting/detail.jsx — convert từ mt219 Vue2
 * resources/js/cms/components/setting/detail.vue.
 * -----------------------------------------------------------
 * Form 1 cục sửa nhiều key config cùng lúc (bảng `setting`, code=config),
 * chia theo tab như bản gốc: General / Store / Order / Seo / Footer.
 * Thêm tab "Reward & Affiliate" — 2 tính năng ra đời SAU mt219, đã seed
 * key vào bảng setting (xem migration 2026_07_10_*) nhưng chưa từng có màn
 * CMS để chỉnh (xem components/setting/RewardAffiliate.jsx).
 *
 * REST:
 *   GET  /resource?list_for_setting=true   → dropdown user_group/weight_class/
 *                                             length_class/category
 *   GET  /order-status                     → dropdown trạng thái đơn hàng
 *                                             (route có sẵn, dùng chung order/form.jsx)
 *   GET  /setting                          → toàn bộ config hiện tại
 *   PUT  /setting                          → lưu (body phẳng key: value)
 *
 * Khác mt219: state 1 chiều (objForm ở page, patch xuống tab con qua
 * onChange) thay vì Vue2 truyền object rồi mutate trực tiếp — giống pattern
 * đã dùng ở product/form.jsx.
 * -----------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { Button, Spin } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import General from '@/components/setting/General';
import Store from '@/components/setting/Store';
import Order from '@/components/setting/Order';
import Seo from '@/components/setting/Seo';
import Footer from '@/components/setting/Footer';
import RewardAffiliate from '@/components/setting/RewardAffiliate';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { error as showError, success } from '@/core/services/alert';

const TABS = [
    { key: 'general', label: 'General' },
    { key: 'store', label: 'Store' },
    { key: 'order', label: 'Order' },
    { key: 'seo', label: 'Seo' },
    { key: 'footer', label: 'Footer' },
    { key: 'reward-affiliate', label: 'Reward & Affiliate' },
];

export default function SettingDetail() {
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({});
    const [resource, setResource] = useState({});
    const [orderStatus, setOrderStatus] = useState([]);
    const [activeTab, setActiveTab] = useState('general');
    const [loader, setLoader] = useState(false);

    const loadDetail = () => {
        const inst = loading.open();
        Promise.all([
            api.get('/setting').then((res) => res.data?.data || {}),
            api.get('/resource', { params: { list_for_setting: true } }).then(
                (res) => res.data?.data || {}
            ),
            api.get('/order-status').then((res) => res.data?.data || []).catch(() => []),
        ])
            .then(([settingData, resourceData, orderStatusData]) => {
                setObjForm(settingData);
                setResource(resourceData);
                setOrderStatus(orderStatusData);
            })
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => {
                setLoader(true);
                inst.close();
            });
    };

    useEffect(() => {
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const patchForm = (patch) => setObjForm((f) => ({ ...f, ...patch }));

    const saveSetting = () => {
        const inst = loading.open();
        setLoader(false);
        api.put('/setting', objForm)
            .then(() => {
                success(t('SaveSuccess')).then(() => loadDetail());
            })
            .catch((err) => {
                setLoader(true);
                showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
            })
            .finally(() => inst.close());
    };

    if (!loader) {
        return (
            <Wrapper title={t('Setting')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'general':
                return <General setting={objForm} resource={resource} onChange={patchForm} />;
            case 'store':
                return <Store setting={objForm} onChange={patchForm} />;
            case 'order':
                return <Order setting={objForm} orderStatus={orderStatus} onChange={patchForm} />;
            case 'seo':
                return <Seo setting={objForm} onChange={patchForm} />;
            case 'footer':
                return <Footer setting={objForm} onChange={patchForm} />;
            case 'reward-affiliate':
                return <RewardAffiliate setting={objForm} onChange={patchForm} />;
            default:
                return null;
        }
    };

    return (
        <Wrapper title={t('Setting')} sapo="">
            <div className="dn-content-left setting">
                <ul className="nav nav-tabs nav-tabs-custom">
                    {TABS.map((tab) => (
                        <li className="nav-item" key={tab.key}>
                            {/* React 19 chặn href="javascript:void(0);" — dùng <button>,
                                xem ghi chú tương tự ở product/form.jsx. */}
                            <button
                                type="button"
                                className={'nav-link' + (activeTab === tab.key ? ' active' : '')}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="d-none d-sm-block">{tab.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="tab-content">
                    <div className="tab-pane p-3 active">{renderTab()}</div>
                </div>

                <div className="row">
                    <div className="col-xl-12">
                        <Button type="primary" onClick={saveSetting}>
                            {t('Save')}
                        </Button>
                    </div>
                </div>
            </div>
        </Wrapper>
    );
}
