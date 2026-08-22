/**
 * core/utils/marketing.js — hằng số nghiệp vụ của nhóm Marketing.
 * -----------------------------------------------------------
 * Mirror 1-1 các enum PHP bên infun (app/Enums). Gom về một file để 10 màn
 * coupon/voucher/voucherTheme/gift/voucherRewardRule không rải magic number
 * mỗi nơi một kiểu — đổi enum ở backend thì sửa đúng một chỗ ở đây.
 *
 * `labelKey` là key i18n (resources/lang/vi/rcms.php của infun, trả về qua
 * GET /rcms/system/init → appSettings.languageTexts). t() không tìm thấy key
 * thì trả lại chính key, nên thêm option mới không làm vỡ màn hình.
 * -----------------------------------------------------------
 */

// --- App\Enums\CouponType ---
export const COUPON_TYPE = { PERCENT: 1, FIXED: 2, FREESHIP: 3 };

export const COUPON_TYPE_OPTIONS = [
    { value: COUPON_TYPE.PERCENT, labelKey: 'CouponTypePercent' },
    { value: COUPON_TYPE.FIXED, labelKey: 'CouponTypeFixed' },
    { value: COUPON_TYPE.FREESHIP, labelKey: 'CouponTypeFreeship' },
];

// --- App\Enums\CouponApplyScope ---
export const COUPON_APPLY_SCOPE = { ALL: 0, PRODUCTS: 1, CATEGORIES: 2 };

export const COUPON_APPLY_SCOPE_OPTIONS = [
    { value: COUPON_APPLY_SCOPE.ALL, labelKey: 'ScopeAll' },
    { value: COUPON_APPLY_SCOPE.PRODUCTS, labelKey: 'ScopeProducts' },
    { value: COUPON_APPLY_SCOPE.CATEGORIES, labelKey: 'ScopeCategories' },
];

// --- App\Enums\CouponHistoryStatus ---
export const COUPON_HISTORY_STATUS_LABEL = {
    0: 'CouponHistoryApplied',
    1: 'CouponHistoryUsed',
    2: 'CouponHistoryCancelled',
};

// --- App\Enums\VoucherStatus ---
export const VOUCHER_STATUS = { ACTIVE: 1, EXPIRED: 2, FULLY_USED: 3, REVOKED: 4 };

export const VOUCHER_STATUS_OPTIONS = [
    { value: VOUCHER_STATUS.ACTIVE, labelKey: 'VoucherStatusActive' },
    { value: VOUCHER_STATUS.EXPIRED, labelKey: 'VoucherStatusExpired' },
    { value: VOUCHER_STATUS.FULLY_USED, labelKey: 'VoucherStatusFullyUsed' },
    { value: VOUCHER_STATUS.REVOKED, labelKey: 'VoucherStatusRevoked' },
];

// --- App\Enums\VoucherHistoryStatus ---
export const VOUCHER_HISTORY_STATUS_LABEL = {
    1: 'VoucherHistoryApplied',
    2: 'VoucherHistoryConfirmed',
    3: 'VoucherHistoryRefunded',
};

// --- App\Enums\GiftTriggerType ---
export const GIFT_TRIGGER_TYPE = { MIN_SUBTOTAL: 1, BUY_SPECIFIC_PRODUCT: 2 };

export const GIFT_TRIGGER_TYPE_OPTIONS = [
    { value: GIFT_TRIGGER_TYPE.MIN_SUBTOTAL, labelKey: 'TriggerMinSubtotal' },
    { value: GIFT_TRIGGER_TYPE.BUY_SPECIFIC_PRODUCT, labelKey: 'TriggerBuySpecificProduct' },
];

// --- App\Enums\GiftPickType ---
export const GIFT_PICK_TYPE = { AUTO: 0, ONE_OF_N: 1, UP_TO_N: 2 };

export const GIFT_PICK_TYPE_OPTIONS = [
    { value: GIFT_PICK_TYPE.AUTO, labelKey: 'PickAuto' },
    { value: GIFT_PICK_TYPE.ONE_OF_N, labelKey: 'PickOneOfN' },
    { value: GIFT_PICK_TYPE.UP_TO_N, labelKey: 'PickUpToN' },
];

// --- App\Enums\VoucherRewardRuleStatus ---
export const VOUCHER_REWARD_RULE_STATUS = { ACTIVE: 1, PAUSED: 2 };

export const VOUCHER_REWARD_RULE_STATUS_OPTIONS = [
    { value: VOUCHER_REWARD_RULE_STATUS.ACTIVE, labelKey: 'RuleStatusActive' },
    { value: VOUCHER_REWARD_RULE_STATUS.PAUSED, labelKey: 'RuleStatusPaused' },
];

// --- App\Enums\MailCampaignSendTo (chuỗi, giữ nguyên vocabulary mt219) ---
export const MAIL_SEND_TO = {
    NEWSLETTER: 'newsletter',
    ALL_USERS: 'user_all',
    USER_GROUP: 'user_group',
    USERS: 'user',
    FILE: 'file',
};

export const MAIL_SEND_TO_OPTIONS = [
    { value: MAIL_SEND_TO.NEWSLETTER, labelKey: 'SendToNewsletter' },
    { value: MAIL_SEND_TO.ALL_USERS, labelKey: 'SendToAllUsers' },
    { value: MAIL_SEND_TO.USER_GROUP, labelKey: 'SendToUserGroup' },
    { value: MAIL_SEND_TO.USERS, labelKey: 'SendToUsers' },
    { value: MAIL_SEND_TO.FILE, labelKey: 'SendToFile' },
];

// --- App\Enums\MailCampaignStatus ---
export const MAIL_CAMPAIGN_STATUS = { QUEUED: 1, SENDING: 2, COMPLETED: 3, FAILED: 4 };

export const MAIL_CAMPAIGN_STATUS_OPTIONS = [
    { value: MAIL_CAMPAIGN_STATUS.QUEUED, labelKey: 'CampaignStatusQueued' },
    { value: MAIL_CAMPAIGN_STATUS.SENDING, labelKey: 'CampaignStatusSending' },
    { value: MAIL_CAMPAIGN_STATUS.COMPLETED, labelKey: 'CampaignStatusCompleted' },
    { value: MAIL_CAMPAIGN_STATUS.FAILED, labelKey: 'CampaignStatusFailed' },
];

// --- App\Enums\MailCampaignRecipientStatus ---
export const MAIL_RECIPIENT_STATUS_LABEL = {
    0: 'RecipientStatusPending',
    1: 'RecipientStatusSent',
    2: 'RecipientStatusFailed',
};

/**
 * Tra label cho option value dạng CHUỖI (send_to) — labelKeyOf() ép Number()
 * nên không dùng được cho enum chuỗi.
 */
export function labelKeyOfString(options, value) {
    const found = options.find((o) => o.value === value);
    return found ? found.labelKey : '';
}

/** Tra label theo value trong một mảng option; không khớp thì trả '' */
export function labelKeyOf(options, value) {
    const found = options.find((o) => Number(o.value) === Number(value));
    return found ? found.labelKey : '';
}

/** Định dạng tiền VNĐ cho cột danh sách (không phụ thuộc currency service). */
export function formatMoney(value) {
    const n = Number(value || 0);
    return n.toLocaleString('vi-VN');
}
