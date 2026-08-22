/**
 * pages/review/form.jsx — 2 CHẾ ĐỘ:
 *   - Tạo mới (id=0): admin tạo review "mồi" (seed) — POST /review.
 *   - Sửa/kiểm duyệt (id>0): admin toàn quyền sửa author/title/text/tag +
 *     rating theo từng tiêu chí (ReviewCriteria) + status (PUT /review/{id},
 *     qua Eloquent save() để ReviewObserver cộng/trừ đúng rating trung bình
 *     sản phẩm khi status/rating đổi). product_id KHÔNG cho sửa. Rating
 *     tổng = TRUNG BÌNH rating theo tiêu chí (giống hệt lúc khách gửi review
 *     — xem ReviewService::submitReview()) nên khi review có breakdown theo
 *     tiêu chí, Select rating tổng bị khoá (chỉ sửa qua từng tiêu chí);
 *     review không có breakdown (vd review "mồi" admin tạo tay) thì sửa
 *     rating tổng trực tiếp. Media chỉ xem (không sửa). Thêm reply admin
 *     (POST /review/{id}/reply), resolve report (PATCH .../report/{id}/resolve).
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Input, Select, Switch, Button, Tag, Image } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

const STATUS_OPTIONS = [
    { value: 0, label: 'Pending' },
    { value: 1, label: 'Approved' },
    { value: 2, label: 'Rejected' },
    { value: 3, label: 'Hidden' },
];

const REPORT_STATUS_LABEL = { 0: 'Pending', 1: 'Resolved', 2: 'Dismissed' };

export default function ReviewForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const isCreate = !params.id;

    const [objForm, setObjForm] = useState({
        id: 0,
        product_id: '',
        author: '',
        title: '',
        text: '',
        rating: 5,
        status: 1,
        is_publish: true,
        is_anonymous: false,
        tag_ids: [],
    });
    const [errors, setErrors] = useState({});
    const [loader, setLoader] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [tagOptions, setTagOptions] = useState([]);
    const [criteriaOptions, setCriteriaOptions] = useState([]);
    const [useCriteria, setUseCriteria] = useState(false);
    const [criteriaRatings, setCriteriaRatings] = useState([]);

    const getDetail = useCallback(() => {
        if (isCreate) {
            setLoader(true);
            return;
        }
        const inst = loading.open();
        api
            .get(`/review/${params.id}`)
            .then((res) => {
                const data = res.data?.data || {};
                setObjForm({ ...data, tag_ids: (data.tags || []).map((tg) => tg.id) });
                setLoader(true);
            })
            .catch((err) => {
                setLoader(true);
                showError(t(err?.response?.data?.message || 'ErrorAction'));
            })
            .finally(() => inst.close());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    useEffect(() => {
        getDetail();
        api
            .get('/review-tag', { params: { deleted_at: 1, per_page: 100 } })
            .then((res) => setTagOptions(res.data?.data || []))
            .catch(() => {});
        if (isCreate) {
            api
                .get('/review-criteria', { params: { deleted_at: 1, per_page: 100 } })
                .then((res) => {
                    const list = (res.data?.data || []).filter((c) => c.is_active);
                    setCriteriaOptions(list);
                    setCriteriaRatings(
                        list.map((c) => ({
                            review_criteria_id: c.id,
                            name: c.name || c.code,
                            rating: 5,
                        }))
                    );
                })
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (field, value) => setObjForm((f) => ({ ...f, [field]: value }));

    const errOf = (key) => errors?.[key]?.[0];

    const saveCreate = (edit = false) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const payload = {
                    product_id: objForm.product_id,
                    author: objForm.author,
                    title: objForm.title,
                    text: objForm.text,
                    rating: objForm.rating,
                    status: objForm.status,
                    is_publish: objForm.is_publish,
                    is_anonymous: objForm.is_anonymous,
                    ratings: useCriteria
                        ? criteriaRatings.map((r) => ({
                              review_criteria_id: r.review_criteria_id,
                              rating: r.rating,
                          }))
                        : [],
                    tag_ids: objForm.tag_ids || [],
                };
                api
                    .post('/review', payload)
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/review/list');
                            navigate(`/review/${res.data?.data?.id}`);
                        });
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) {
                            setErrors(err.response.data?.errors || {});
                        }
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const saveEdit = () => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                api
                    .put(`/review/${objForm.id}`, {
                        author: objForm.author,
                        title: objForm.title,
                        text: objForm.text,
                        rating: objForm.rating,
                        status: objForm.status,
                        is_publish: objForm.is_publish,
                        is_anonymous: objForm.is_anonymous,
                        ratings: (objForm.ratings || []).map((r) => ({
                            review_criteria_id: r.review_criteria_id,
                            rating: r.rating,
                        })),
                        tag_ids: objForm.tag_ids || [],
                    })
                    .then(() => {
                        success(t('SaveSuccess'));
                        getDetail();
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) {
                            setErrors(err.response.data?.errors || {});
                        }
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const submitReply = () => {
        if (!replyText.trim()) return;
        const inst = loading.open();
        api
            .post(`/review/${objForm.id}/reply`, { text: replyText })
            .then(() => {
                success(t('SaveSuccess'));
                setReplyText('');
                getDetail();
            })
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorSaveAction')))
            .finally(() => inst.close());
    };

    const resolveReport = (reportId, status) => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                api
                    .patch(`/review/${objForm.id}/report/${reportId}/resolve`, { status })
                    .then(() => {
                        success(t('SaveSuccess'));
                        getDetail();
                    })
                    .catch((err) =>
                        showError(t(err?.response?.data?.message || 'ErrorSaveAction'))
                    )
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    if (!loader) {
        return (
            <Wrapper title={t(isCreate ? 'AddReview' : 'ViewReview')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    // ------------------------- Chế độ tạo mới -------------------------
    if (isCreate) {
        return (
            <Wrapper title={t('AddReview')} sapo="">
                <div className="review-form">
                    <h3 className="mt-0 header-title">{t('Review')}</h3>

                    <div className="row mt-3">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('ProductId')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={objForm.product_id}
                                placeholder={t('ProductId')}
                                onChange={(e) => setField('product_id', e.target.value)}
                            />
                            {errOf('product_id') && (
                                <span className="has-error">{errOf('product_id')}</span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Author')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={objForm.author}
                                placeholder={t('Author')}
                                onChange={(e) => setField('author', e.target.value)}
                            />
                            {errOf('author') && (
                                <span className="has-error">{errOf('author')}</span>
                            )}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Title')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Input
                                value={objForm.title}
                                placeholder={t('Title')}
                                onChange={(e) => setField('title', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">
                                {t('Content')}
                                <span className="text-danger">&nbsp;*</span>
                            </label>
                        </div>
                        <div className="col-xl-10">
                            <Input.TextArea
                                rows={5}
                                value={objForm.text}
                                placeholder={t('Content')}
                                onChange={(e) => setField('text', e.target.value)}
                            />
                            {errOf('text') && <span className="has-error">{errOf('text')}</span>}
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Rating')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                style={{ width: 150 }}
                                value={objForm.rating}
                                disabled={useCriteria}
                                onChange={(val) => setField('rating', val)}
                                options={[1, 2, 3, 4, 5].map((r) => ({
                                    label: `${r} ★`,
                                    value: r,
                                }))}
                            />
                            {criteriaOptions.length > 0 && (
                                <span style={{ marginLeft: 12 }}>
                                    <Switch
                                        size="small"
                                        checked={useCriteria}
                                        onChange={setUseCriteria}
                                    />
                                    <span style={{ marginLeft: 8 }}>
                                        {t('RateByCriteria') || 'Chấm theo từng tiêu chí'}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    {useCriteria && (
                        <div className="row mt-3 pt-3 border-top">
                            <div className="col-xl-2 text-right">
                                <label className="tit">{t('ReviewCriteria')}</label>
                            </div>
                            <div className="col-xl-10">
                                {criteriaRatings.map((r, idx) => (
                                    <div key={r.review_criteria_id} className="mb-2">
                                        {r.name}:{' '}
                                        <Select
                                            style={{ width: 100 }}
                                            value={r.rating}
                                            onChange={(val) =>
                                                setCriteriaRatings((list) => {
                                                    const next = list.map((x, i) =>
                                                        i === idx ? { ...x, rating: val } : x
                                                    );
                                                    const avg = Math.round(
                                                        next.reduce((s, x) => s + x.rating, 0) /
                                                            next.length
                                                    );
                                                    setField(
                                                        'rating',
                                                        Math.max(1, Math.min(5, avg))
                                                    );
                                                    return next;
                                                })
                                            }
                                            options={[1, 2, 3, 4, 5].map((v) => ({
                                                label: `${v} ★`,
                                                value: v,
                                            }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Status')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                style={{ width: '100%' }}
                                value={objForm.status}
                                onChange={(val) => setField('status', val)}
                                options={STATUS_OPTIONS.map((o) => ({
                                    ...o,
                                    label: t(o.label),
                                }))}
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Anonymous')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Switch
                                checked={objForm.is_anonymous}
                                onChange={(checked) => setField('is_anonymous', checked)}
                            />
                        </div>
                    </div>

                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Tag')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                placeholder={t('Tag')}
                                value={objForm.tag_ids || []}
                                onChange={(vals) => setField('tag_ids', vals)}
                                options={tagOptions.map((tg) => ({
                                    label: tg.name || tg.code,
                                    value: tg.id,
                                }))}
                            />
                        </div>
                    </div>

                    <div className="form-group text-right mt-4">
                        <Button type="primary" onClick={() => saveCreate(false)}>
                            {t('Save')}
                        </Button>
                        &nbsp;
                        <Button onClick={() => saveCreate(true)}>{t('SaveAndEdit')}</Button>
                        &nbsp;
                        <Link to="/review/list" className="btn btn-danger">
                            {t('Cancel')}
                        </Link>
                    </div>
                </div>
            </Wrapper>
        );
    }

    // ------------------------- Chế độ sửa/kiểm duyệt -------------------------
    return (
        <Wrapper title={t('ViewReview')} sapo="">
            <div className="review-form">
                <h3 className="mt-0 header-title">{t('Review')}</h3>

                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Product')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input value={objForm.product_name || `#${objForm.product_id}`} readOnly />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Author')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.author || ''}
                            placeholder={t('Author')}
                            onChange={(e) => setField('author', e.target.value)}
                        />
                        {errOf('author') && <span className="has-error">{errOf('author')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Title')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Input
                            value={objForm.title || ''}
                            placeholder={t('Title')}
                            onChange={(e) => setField('title', e.target.value)}
                        />
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">
                            {t('Content')}
                            <span className="text-danger">&nbsp;*</span>
                        </label>
                    </div>
                    <div className="col-xl-10">
                        <Input.TextArea
                            rows={4}
                            value={objForm.text || ''}
                            onChange={(e) => setField('text', e.target.value)}
                        />
                        {errOf('text') && <span className="has-error">{errOf('text')}</span>}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Rating')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: 150 }}
                            value={objForm.rating}
                            disabled={objForm.ratings?.length > 0}
                            onChange={(val) => setField('rating', val)}
                            options={[1, 2, 3, 4, 5].map((r) => ({
                                label: `${r} ★`,
                                value: r,
                            }))}
                        />
                        {objForm.ratings?.length > 0 && (
                            <span className="text-muted" style={{ marginLeft: 8 }}>
                                (Tính trung bình từ ReviewCriteria bên dưới)
                            </span>
                        )}
                    </div>
                </div>

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Anonymous')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Switch
                            checked={objForm.is_anonymous}
                            onChange={(checked) => setField('is_anonymous', checked)}
                        />
                    </div>
                </div>

                {objForm.ratings?.length > 0 && (
                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('ReviewCriteria')}</label>
                        </div>
                        <div className="col-xl-10">
                            {objForm.ratings.map((r, idx) => (
                                <div key={r.review_criteria_id} className="mb-2">
                                    {r.name}:{' '}
                                    <Select
                                        style={{ width: 100 }}
                                        value={r.rating}
                                        onChange={(val) =>
                                            setObjForm((f) => {
                                                const ratings = f.ratings.map((x, i) =>
                                                    i === idx ? { ...x, rating: val } : x
                                                );
                                                const avg = Math.round(
                                                    ratings.reduce((s, x) => s + x.rating, 0) /
                                                        ratings.length
                                                );
                                                return {
                                                    ...f,
                                                    ratings,
                                                    rating: Math.max(1, Math.min(5, avg)),
                                                };
                                            })
                                        }
                                        options={[1, 2, 3, 4, 5].map((v) => ({
                                            label: `${v} ★`,
                                            value: v,
                                        }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Tag')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder={t('Tag')}
                            value={objForm.tag_ids || []}
                            onChange={(vals) => setField('tag_ids', vals)}
                            options={tagOptions.map((tg) => ({
                                label: tg.name || tg.code,
                                value: tg.id,
                            }))}
                        />
                    </div>
                </div>

                {objForm.media?.length > 0 && (
                    <div className="row mt-3 pt-3 border-top">
                        <div className="col-xl-2 text-right">
                            <label className="tit">{t('Media')}</label>
                        </div>
                        <div className="col-xl-10">
                            <Image.PreviewGroup>
                                {objForm.media.map((m) => (
                                    <Image
                                        key={m.id}
                                        src={m.thumbnail || m.url}
                                        width={100}
                                        height={100}
                                        style={{ objectFit: 'cover', marginRight: 8 }}
                                    />
                                ))}
                            </Image.PreviewGroup>
                        </div>
                    </div>
                )}

                <div className="row mt-3 pt-3 border-top">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('Status')}</label>
                    </div>
                    <div className="col-xl-10">
                        <Select
                            style={{ width: 250 }}
                            value={objForm.status}
                            onChange={(val) => setField('status', val)}
                            options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                        />
                    </div>
                </div>

                <div className="form-group text-right mt-3 pt-3 border-top">
                    <Button type="primary" onClick={saveEdit}>
                        {t('Save')}
                    </Button>
                </div>

                <h3 className="mt-4 header-title">
                    {t('Reply')} ({objForm.replies?.length || 0})
                </h3>
                {(objForm.replies || []).map((r) => (
                    <div key={r.id} className="row mt-2">
                        <div className="col-xl-2 text-right">
                            <small>{r.author_name}</small>
                        </div>
                        <div className="col-xl-10">{r.text}</div>
                    </div>
                ))}
                <div className="row mt-3">
                    <div className="col-xl-2 text-right">
                        <label className="tit">{t('ReplyAsAdmin')}</label>
                    </div>
                    <div className="col-xl-8">
                        <Input.TextArea
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        />
                    </div>
                    <div className="col-xl-2">
                        <Button type="primary" onClick={submitReply}>
                            {t('Send')}
                        </Button>
                    </div>
                </div>

                {objForm.reports?.length > 0 && (
                    <>
                        <h3 className="mt-4 header-title">
                            {t('Report')} ({objForm.reports.length})
                        </h3>
                        {objForm.reports.map((r) => (
                            <div className="row mt-2 pt-2 border-top" key={r.id}>
                                <div className="col-xl-2 text-right">
                                    <Tag>{t(REPORT_STATUS_LABEL[r.status] || 'Pending')}</Tag>
                                </div>
                                <div className="col-xl-8">
                                    <div>
                                        {r.reason_code}
                                        {r.description ? ` — ${r.description}` : ''}
                                    </div>
                                </div>
                                <div className="col-xl-2">
                                    {r.status === 0 && (
                                        <>
                                            <Button
                                                size="small"
                                                onClick={() => resolveReport(r.id, 1)}
                                            >
                                                {t('Resolve')}
                                            </Button>{' '}
                                            <Button
                                                size="small"
                                                onClick={() => resolveReport(r.id, 2)}
                                            >
                                                {t('Dismiss')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <div className="form-group text-right mt-4">
                    <Link to="/review/list" className="btn btn-danger">
                        {t('Back')}
                    </Link>
                </div>
            </div>
        </Wrapper>
    );
}
