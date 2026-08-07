/**
 * components/setting/RewardAffiliate.jsx — tab "Reward & Affiliate" của
 * setting/detail.jsx.
 * -----------------------------------------------------------
 * KHÔNG tồn tại ở mt219 (Vue2) — 2 tính năng reward hybrid (migration
 * 2026_07_10_000000_reward_hybrid_schema) và affiliate (migration
 * 2026_07_10_000001_create_affiliate_tables) được xây SAU khi mt219 dừng
 * phát triển, seed thẳng vào bảng `setting` nhưng chưa từng có màn CMS nào
 * để admin chỉnh. Thêm tab riêng ở đây theo đúng lưu ý khi convert: bám theo
 * datatable THẬT hiện tại, không chỉ port nguyên xi form Vue2 cũ.
 *
 * config_reward_point_enabled đã có ô nhập ở tab General (giữ đúng vị trí
 * mt219) — lặp lại ở đây cho tiện chỉnh chung 1 chỗ với các field reward
 * khác; cùng field, đổi ở tab nào cũng ra 1 giá trị (setting cha dùng chung).
 *
 * Props: setting, onChange — giống General.jsx.
 * -----------------------------------------------------------
 */

import React from 'react';
import { Select } from 'antd';

const YES_NO = [
    { value: 1, label: 'Yes' },
    { value: 0, label: 'No' },
];

export default function RewardAffiliate({ setting = {}, onChange }) {
    const setField = (field, value) => onChange({ [field]: value });

    const number = (field) => (
        <input
            type="number"
            className="form-control"
            value={setting[field] ?? ''}
            onChange={(e) => setField(field, e.target.value === '' ? '' : Number(e.target.value))}
        />
    );

    const yesNo = (field) => (
        <Select
            style={{ width: '100%' }}
            value={setting[field]}
            onChange={(v) => setField(field, v)}
            options={YES_NO}
        />
    );

    return (
        <div className="row mt-3">
            <div className="col-xl-6">
                <div className="card m-b-20">
                    <div className="card-body">
                        <h3 className="mt-0 header-title">Điểm thưởng (Reward)</h3>

                        <div className="row mt-3">
                            <div className="col-xl-12">
                                <label className="tit">Bật hệ điểm thưởng</label>
                            </div>
                            <div className="col-xl-12">{yesNo('config_reward_point_enabled')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    Tỷ lệ tích điểm (đồng / 1 điểm)
                                    <br />
                                    <small>
                                        X đồng = 1 điểm — áp dụng khi sản phẩm không có tỉ lệ
                                        riêng. 0 = tắt tích điểm mặc định.
                                    </small>
                                </label>
                            </div>
                            <div className="col-xl-12">{number('config_reward_earn_divisor')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    Tỷ lệ quy đổi khi tiêu điểm (đồng / 1 điểm)
                                </label>
                            </div>
                            <div className="col-xl-12">{number('config_reward_redeem_rate')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    % tối đa giá trị đơn được trả bằng điểm
                                </label>
                            </div>
                            <div className="col-xl-12">{number('config_reward_redeem_max_percent')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    Điểm hết hạn sau (tháng)
                                    <br />
                                    <small>Tính từ lúc điểm được kích hoạt (đơn giao thành công). 0 = không hết hạn.</small>
                                </label>
                            </div>
                            <div className="col-xl-12">{number('config_reward_expiry_months')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-xl-6">
                <div className="card m-b-20">
                    <div className="card-body">
                        <h3 className="mt-0 header-title">Tiếp thị liên kết (Affiliate)</h3>

                        <div className="row mt-3">
                            <div className="col-xl-12">
                                <label className="tit">Bật hệ affiliate</label>
                            </div>
                            <div className="col-xl-12">{yesNo('config_affiliate_enabled')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">Tỷ lệ hoa hồng (%)</label>
                            </div>
                            <div className="col-xl-12">{number('config_affiliate_commission_rate')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    Thời gian giữ cookie (ngày)
                                    <br />
                                    <small>Đơn hàng tính hoa hồng cho affiliate nếu khách đặt trong khoảng thời gian này sau khi click link.</small>
                                </label>
                            </div>
                            <div className="col-xl-12">{number('config_affiliate_cookie_days')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    Thời gian giữ hoa hồng trước khi duyệt (ngày)
                                    <br />
                                    <small>Tránh trả hoa hồng cho đơn có thể bị hoàn/hủy.</small>
                                </label>
                            </div>
                            <div className="col-xl-12">{number('config_affiliate_hold_days')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">Mức rút tiền tối thiểu (đồng)</label>
                            </div>
                            <div className="col-xl-12">{number('config_affiliate_min_payout')}</div>
                        </div>

                        <div className="row mt-3 border-top">
                            <div className="col-xl-12">
                                <label className="tit">
                                    Tự động duyệt affiliate mới đăng ký
                                </label>
                            </div>
                            <div className="col-xl-12">{yesNo('config_affiliate_auto_approve')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
