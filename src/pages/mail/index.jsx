/**
 * pages/mail/index.jsx — LỊCH SỬ chiến dịch mail marketing.
 * -----------------------------------------------------------
 * MÀN MỚI — mt219 gửi xong không lưu gì, không có gì để liệt kê.
 *
 * Chiến dịch là BIÊN BẢN: không sửa, không xoá, nên màn này KHÔNG có
 * FormSearch (vốn gắn với bulk delete/restore) — chỉ có ô tìm + lọc trạng
 * thái + nút soạn mail mới.
 *
 *   GET /mail-campaign  (list: keyword/status/sort/order/page/per_page)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Select, Input, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Pager from '@/components/ui/Pager';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import useUrlSyncedState, { intParam } from '@/core/hooks/useUrlSyncedState';
import { error as showError } from '@/core/services/alert';
import {
    MAIL_CAMPAIGN_STATUS_OPTIONS,
    MAIL_SEND_TO_OPTIONS,
    labelKeyOf,
    labelKeyOfString,
} from '@/core/utils/marketing';

export default function MailIndex() {
    const t = useTranslation();
    const loading = useLoading();

    const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
        keyword: searchParams.get('keyword') || '',
        status: searchParams.get('status') || '',
        order: searchParams.get('order') || 'desc',
        sort: searchParams.get('sort') || 'id',
        pageIndex: intParam(searchParams, 'pageIndex', 1),
        pageSize: intParam(searchParams, 'pageSize', 50),
    }));
    const [list, setList] = useState([]);
    const [count, setCount] = useState(0);
    const [loader, setLoader] = useState(false);

    const fetchList = useCallback(() => {
        const inst = loading.open();
        return api
            .get('/mail-campaign', {
                params: {
                    keyword: objSearch.keyword,
                    sort: objSearch.sort,
                    order: objSearch.order,
                    status: objSearch.status || undefined,
                    page: objSearch.pageIndex,
                    per_page: objSearch.pageSize,
                },
            })
            .then((res) => {
                setList(res.data?.data || []);
                setCount(res.data?.meta?.total || 0);
                setLoader(true);
            })
            .catch((err) => {
                setLoader(true);
                showError(t(err?.response?.data?.message || 'ErrorAction'));
            })
            .finally(() => inst.close());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objSearch]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const onSort = (field) =>
        setObjSearch((s) => ({
            ...s,
            sort: field,
            order: s.sort === field && s.order === 'desc' ? 'asc' : 'desc',
        }));
    const onPageChange = (p) => setObjSearch((s) => ({ ...s, pageIndex: p }));

    const sortIcon = (field) => {
        if (objSearch.sort !== field) return null;
        return objSearch.order === 'desc' ? (
            <i className="fa fa-arrow-down" />
        ) : (
            <i className="fa fa-arrow-up" />
        );
    };

    const th = (field, label, className = '') => (
        <th
            className={className}
            style={{ color: '#1e91cf', cursor: 'pointer' }}
            onClick={() => onSort(field)}
        >
            {t(label)} {sortIcon(field)}
        </th>
    );

    return (
        <Wrapper title={t('MailCampaignList')} sapo="">
            {loader ? (
                <>
                    <div className="row" id="form-search">
                        <div className="col-xl-3">
                            <Link to="/mail/send" className="btn btn-primary">
                                {t('SendMail')}
                            </Link>
                        </div>
                        <div className="col-xl-9">
                            <div className="row">
                                <div className="col-xl-5" />
                                <div className="col-xl-4">
                                    <Input
                                        placeholder={t('Keyword')}
                                        value={objSearch.keyword}
                                        onChange={(e) =>
                                            setObjSearch((s) => ({ ...s, keyword: e.target.value }))
                                        }
                                        onPressEnter={() =>
                                            setObjSearch((s) => ({ ...s, pageIndex: 1 }))
                                        }
                                    />
                                </div>
                                <div className="col-xl-2">
                                    <Select
                                        style={{ width: '100%' }}
                                        allowClear
                                        placeholder={t('Status')}
                                        value={objSearch.status || undefined}
                                        onChange={(v) =>
                                            setObjSearch((s) => ({
                                                ...s,
                                                status: v ?? '',
                                                pageIndex: 1,
                                            }))
                                        }
                                        options={MAIL_CAMPAIGN_STATUS_OPTIONS.map((o) => ({
                                            value: String(o.value),
                                            label: t(o.labelKey),
                                        }))}
                                    />
                                </div>
                                <div className="col-xl-1">
                                    <Button
                                        onClick={() => setObjSearch((s) => ({ ...s, pageIndex: 1 }))}
                                    >
                                        <i className="fa fa-search" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <table className="table table-bordered mt-3">
                        <thead>
                            <tr>
                                {th('id', 'Id', 'width-100')}
                                {th('subject', 'Subject')}
                                <th className="width-150">{t('MailSendTo')}</th>
                                {th('recipient_count', 'RecipientCount', 'width-100')}
                                {th('sent_count', 'SentCount', 'width-100')}
                                <th className="width-100">{t('FailedCount')}</th>
                                <th className="width-150">{t('Status')}</th>
                                <th className="width-150">{t('Author')}</th>
                                {th('created_at', 'CreatedAt', 'width-150')}
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((item) => (
                                <tr key={item.id} className="post-item-group">
                                    <td>{item.id}</td>
                                    <td>
                                        <Link to={`/mail/${item.id}`} style={{ color: '#0f74a8' }}>
                                            {item.subject}
                                        </Link>
                                    </td>
                                    <td>{t(labelKeyOfString(MAIL_SEND_TO_OPTIONS, item.send_to))}</td>
                                    <td>{item.recipient_count}</td>
                                    <td>{item.sent_count}</td>
                                    <td className={item.failed_count > 0 ? 'text-danger' : ''}>
                                        {item.failed_count}
                                    </td>
                                    <td>
                                        {t(labelKeyOf(MAIL_CAMPAIGN_STATUS_OPTIONS, item.status))}
                                    </td>
                                    <td>{item.author_name || '-'}</td>
                                    <td>{item.created_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <Pager
                        total={count}
                        pageIndex={objSearch.pageIndex}
                        pageSize={objSearch.pageSize}
                        onChange={onPageChange}
                    />
                </>
            ) : (
                <div className="p-5 text-center">
                    <Spin />
                </div>
            )}
        </Wrapper>
    );
}
