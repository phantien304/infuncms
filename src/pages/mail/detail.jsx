/**
 * pages/mail/detail.jsx — CHI TIẾT một chiến dịch mail (chỉ đọc).
 * -----------------------------------------------------------
 * MÀN MỚI. Đây là màn trả lời được câu "khách này có nhận mail không, nếu
 * không thì vì sao" — thứ bản mt219 không có cách nào trả lời.
 *
 * Chiến dịch là biên bản nên KHÔNG có nút sửa/xoá. Nút "Làm mới" để theo dõi
 * tiến độ khi job còn đang chạy (đã gửi / lỗi tăng dần).
 *
 * Danh sách người nhận backend trả tối đa 200 dòng, ưu tiên dòng LỖI trước.
 *
 *   GET /mail-campaign/{id}
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spin, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { error as showError } from '@/core/services/alert';
import {
    MAIL_CAMPAIGN_STATUS_OPTIONS,
    MAIL_RECIPIENT_STATUS_LABEL,
    MAIL_SEND_TO_OPTIONS,
    labelKeyOf,
    labelKeyOfString,
} from '@/core/utils/marketing';

export default function MailDetail() {
    const params = useParams();
    const t = useTranslation();
    const loading = useLoading();

    const [campaign, setCampaign] = useState(null);
    const [loader, setLoader] = useState(false);

    const fetchDetail = useCallback(() => {
        const inst = loading.open();
        api
            .get(`/mail-campaign/${params.id}`)
            .then((res) => setCampaign(res.data?.data || null))
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => {
                setLoader(true);
                inst.close();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    useEffect(() => {
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const row = (label, value) => (
        <div className="row mt-3 pt-3 border-top">
            <div className="col-xl-2 text-right">
                <label className="tit">{t(label)}</label>
            </div>
            <div className="col-xl-10">{value}</div>
        </div>
    );

    if (!loader) {
        return (
            <Wrapper title={t('MailCampaignDetail')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    if (!campaign) {
        return (
            <Wrapper title={t('MailCampaignDetail')} sapo="">
                <p>{t('NoData')}</p>
                <Link to="/mail/list" className="btn btn-danger">
                    {t('Back')}
                </Link>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={t('MailCampaignDetail')} sapo="">
            <div className="mail-campaign-detail">
                <h3 className="mt-0 header-title">{campaign.subject}</h3>

                {row(
                    'MailSendTo',
                    t(labelKeyOfString(MAIL_SEND_TO_OPTIONS, campaign.send_to))
                )}
                {row('Status', t(labelKeyOf(MAIL_CAMPAIGN_STATUS_OPTIONS, campaign.status)))}
                {row('RecipientCount', campaign.recipient_count)}
                {row('SentCount', campaign.sent_count)}
                {row(
                    'FailedCount',
                    <span className={campaign.failed_count > 0 ? 'text-danger' : ''}>
                        {campaign.failed_count}
                    </span>
                )}
                {row('Author', campaign.author_name || '-')}
                {row('CreatedAt', campaign.created_at || '-')}
                {row('StartedAt', campaign.started_at || '-')}
                {row('FinishedAt', campaign.finished_at || '-')}

                {row(
                    'Message',
                    <div
                        style={{
                            border: '1px solid #eee',
                            borderRadius: 6,
                            padding: 16,
                            maxHeight: 400,
                            overflow: 'auto',
                        }}
                        // Nội dung do chính admin soạn trong TinyMCE và đã lưu
                        // xuống DB — render lại đúng như mail đã gửi. Không có
                        // đường nào cho người ngoài chèn HTML vào đây.
                        dangerouslySetInnerHTML={{ __html: campaign.message || '' }}
                    />
                )}

                <div className="mt-4 pt-3 border-top">
                    <h4 className="header-title">
                        {t('Recipients')}{' '}
                        <small className="text-muted">{t('RecipientSampleNote')}</small>
                    </h4>
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th className="width-100">{t('Id')}</th>
                                <th>{t('Email')}</th>
                                <th className="width-150">{t('Status')}</th>
                                <th>{t('Error')}</th>
                                <th className="width-150">{t('SentAt')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(campaign.recipients || []).map((r) => (
                                <tr key={r.id}>
                                    <td>{r.id}</td>
                                    <td>{r.email}</td>
                                    <td>{t(MAIL_RECIPIENT_STATUS_LABEL[r.status] || '')}</td>
                                    <td className="text-danger">{r.error || ''}</td>
                                    <td>{r.sent_at || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={fetchDetail}>
                        {t('Refresh')}
                    </Button>
                    &nbsp;
                    <Link to="/mail/list" className="btn btn-danger">
                        {t('Back')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
