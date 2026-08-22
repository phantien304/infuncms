/**
 * pages/mail/form.jsx — SOẠN & GỬI mail marketing hàng loạt.
 * -----------------------------------------------------------
 * Convert từ mt219 `components/mail/form.vue`.
 *
 * Khác bản Vue:
 *  - mt219 POST `mail/save` (một endpoint dùng chung cho mọi thứ). Ở đây là
 *    `POST /mail-campaign` — tạo một CHIẾN DỊCH, trả về ngay và job gửi chạy
 *    nền theo lô. Không đứng chờ gửi xong.
 *  - Gửi xong điều hướng sang lịch sử chiến dịch để theo dõi tiến độ; bản cũ
 *    `$router.go(0)` (reload trắng) vì chẳng có gì để xem.
 *  - Chọn khách cụ thể: gửi `user_ids` (id) thay vì mảng object email —
 *    backend tự resolve email hiện tại, tránh gửi vào email khách đã đổi.
 *
 *   POST /mail-campaign                  (multipart khi send_to = file)
 *   GET  /resource?list_for_setting=1    (user_group)
 *   GET  /customer?keyword=              (gợi ý khách)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Input, Select, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import MultipleSelect from '@/components/ui/MultipleSelect';
import TinyMce from '@/components/ui/TinyMce';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { MAIL_SEND_TO, MAIL_SEND_TO_OPTIONS } from '@/core/utils/marketing';

export default function MailForm() {
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState({
        send_to: MAIL_SEND_TO.NEWSLETTER,
        subject: '',
        message: '',
        user_group_id: null,
        users: [],
        file: null,
    });
    const [resource, setResource] = useState({ user_group: [] });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);

    // Gợi ý khách (tìm qua API) — MultipleSelect hiển thị theo `email`.
    const [kwUser, setKwUser] = useState('');
    const [openUser, setOpenUser] = useState(false);
    const [sugUser, setSugUser] = useState([]);

    useEffect(() => {
        const inst = loading.open();
        api
            .get('/resource', { params: { list_for_setting: 1 } })
            .then((res) => setResource(res.data?.data || {}))
            .catch(() => {})
            .finally(() => {
                setLoader(true);
                inst.close();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const searchUser = useCallback((kw) => {
        setKwUser(kw);
        api
            .get('/customer', { params: { keyword: kw, per_page: 10, deleted_at: 1 } })
            .then((res) => {
                setSugUser(res.data?.data || []);
                setOpenUser(true);
            })
            .catch(() => {});
    }, []);

    const send = () => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});

                const isFile = objForm.send_to === MAIL_SEND_TO.FILE;
                let payload;

                if (isFile) {
                    // multipart: file danh sách email đi cùng nội dung. Không
                    // set Content-Type thủ công — để browser tự sinh boundary.
                    payload = new FormData();
                    payload.append('send_to', objForm.send_to);
                    payload.append('subject', objForm.subject);
                    payload.append('message', objForm.message);
                    if (objForm.file) payload.append('file', objForm.file);
                } else {
                    payload = {
                        send_to: objForm.send_to,
                        subject: objForm.subject,
                        message: objForm.message,
                        user_group_id:
                            objForm.send_to === MAIL_SEND_TO.USER_GROUP
                                ? objForm.user_group_id
                                : null,
                        user_ids:
                            objForm.send_to === MAIL_SEND_TO.USERS
                                ? (objForm.users || []).map((u) => u.id)
                                : null,
                    };
                }

                api
                    .post('/mail-campaign', payload)
                    .then((res) => {
                        const campaign = res.data?.data;
                        success(
                            `${t('MailCampaignQueued')} (${campaign?.recipient_count ?? 0} ${t(
                                'RecipientCount'
                            )})`
                        ).then(() => navigate('/mail/list'));
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) setErrors(err.response.data?.errors || {});
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const errOf = (key) => errors?.[key]?.[0];

    const row = (label, node, required = false, errKey = null) => (
        <div className="row mt-3 pt-3 border-top">
            <div className="col-xl-2 text-right">
                <label className="tit">
                    {t(label)}
                    {required && <span className="text-danger">&nbsp;*</span>}
                </label>
            </div>
            <div className="col-xl-10">
                {node}
                {errKey && errOf(errKey) && <span className="has-error">{errOf(errKey)}</span>}
            </div>
        </div>
    );

    if (!loader) {
        return (
            <Wrapper title={t('Mail')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper title={t('Mail')} sapo="">
            <div className="mail-form">
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('MailSendTo')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: '100%' }}
                            value={objForm.send_to}
                            onChange={(v) => setField('send_to', v)}
                            options={MAIL_SEND_TO_OPTIONS.map((o) => ({
                                value: o.value,
                                label: t(o.labelKey),
                            }))}
                        />
                        {errOf('send_to') && <span className="has-error">{errOf('send_to')}</span>}
                    </div>
                </div>

                {objForm.send_to === MAIL_SEND_TO.USER_GROUP &&
                    row(
                        'UserGroup',
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="label"
                            placeholder={t('Select')}
                            value={objForm.user_group_id || undefined}
                            onChange={(v) => setField('user_group_id', v)}
                            options={(resource.user_group || []).map((g) => ({
                                value: g.id,
                                label: g.name,
                            }))}
                        />,
                        true,
                        'user_group_id'
                    )}

                {objForm.send_to === MAIL_SEND_TO.USERS &&
                    row(
                        'Users',
                        <>
                            <Input
                                value={kwUser}
                                placeholder={t('Keyword')}
                                onChange={(e) => searchUser(e.target.value)}
                                onFocus={() => setOpenUser(true)}
                                onBlur={() => setTimeout(() => setOpenUser(false), 150)}
                            />
                            <MultipleSelect
                                suggestions={sugUser}
                                selection={objForm.users || []}
                                keyword={kwUser}
                                opened={openUser}
                                label="email"
                                onChange={(sel, op) => {
                                    setField('users', sel);
                                    setOpenUser(op);
                                }}
                            />
                        </>,
                        true,
                        'user_ids'
                    )}

                {objForm.send_to === MAIL_SEND_TO.FILE &&
                    row(
                        'File',
                        <>
                            <input
                                type="file"
                                accept=".txt,.csv"
                                className="form-control"
                                onChange={(e) => setField('file', e.target.files?.[0] || null)}
                            />
                            <small className="text-muted">{t('FileEmailHint')}</small>
                        </>,
                        true,
                        'file'
                    )}

                {row(
                    'Subject',
                    <Input
                        value={objForm.subject}
                        maxLength={255}
                        onChange={(e) => setField('subject', e.target.value)}
                    />,
                    true,
                    'subject'
                )}

                {row(
                    'Message',
                    <TinyMce
                        value={objForm.message}
                        height={500}
                        relative_urls={false}
                        onChange={(content) => setField('message', content)}
                    />,
                    true,
                    'message'
                )}

                <div className="form-group text-right mt-4">
                    <Button type="primary" onClick={send}>
                        {t('SendMail')}
                    </Button>
                    &nbsp;
                    <Button onClick={() => navigate('/mail/list')}>{t('Cancel')}</Button>
                </div>
            </div>
        </Wrapper>
    );
}
