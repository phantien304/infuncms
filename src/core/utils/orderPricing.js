/**
 * orderPricing.js — resolve variant + ước tính đơn giá NGAY TRÊN TRÌNH DUYỆT
 * khi nhân viên chọn sản phẩm/option ở order/form.jsx (tab Product).
 * -----------------------------------------------------------
 * CHỈ để hiển thị tức thời (UX) — giá THẬT luôn được BE tính lại từ đầu khi
 * gọi POST /order/preview-total (tab Confirm) và khi Save đơn thật sự
 * (OrderAdminWriteService::resolveLine, KHÔNG tin giá FE gửi). 2 nơi tính
 * giá cố ý trùng thuật toán — sửa 1 chỗ nhớ sửa chỗ kia:
 *   - resolvePrice()/bestDiscountTier() ở đây
 *   - OrderAdminWriteService::resolvePrice()/bestDiscountTier() (PHP)
 *   - CartService::resolvePrice()/bestDiscountTier() (PHP, giỏ hàng ngoài site)
 *
 * Dữ liệu vào là product_variants[] / product_options[] lấy nguyên từ
 * GET /product/{id} (App\Data\Cms\ProductData) — xem components/product/Option.jsx
 * để biết đúng shape (role: 1=variant tạo SKU, 0=custom_field khách điền).
 * -----------------------------------------------------------
 */

const ROLE_VARIANT = 1;

/** Chữ ký tổ hợp option_value_ids — y hệt components/product/Option.jsx::sig(). */
export const sig = (ids) => [...(ids || [])].map(Number).sort((a, b) => a - b).join('-');

/**
 * Danh sách option "tạo biến thể" của product (role=1, có khai option_value_ids).
 */
export function variantOptionsOf(product) {
    return (product?.product_options || []).filter(
        (po) => Number(po.role) === ROLE_VARIANT && (po.option_value_ids || []).length > 0
    );
}

/** Option "custom field" (role=0) — khách/nhân viên điền tay, không ảnh hưởng giá. */
export function customFieldOptionsOf(product) {
    return (product?.product_options || []).filter((po) => Number(po.role) !== ROLE_VARIANT);
}

/**
 * Tìm đúng 1 dòng product_variants khớp tổ hợp giá trị option đã chọn.
 * @param {object} product  ProductData (từ GET /product/{id})
 * @param {Record<number, number>} selectedValueByOption  {option_id: option_value_id}
 */
export function resolveVariant(product, selectedValueByOption = {}) {
    const variants = product?.product_variants || [];
    const variantOptions = variantOptionsOf(product);
    if (variantOptions.length === 0) {
        // Sản phẩm đơn giản — luôn 1 biến thể mặc định.
        return variants.find((v) => v.is_default) || variants[0] || null;
    }
    const wanted = variantOptions.map((po) => selectedValueByOption[po.option_id]);
    if (wanted.some((v) => !v)) return null; // chưa chọn đủ
    const wantedSig = sig(wanted);
    return variants.find((v) => sig(v.option_value_ids) === wantedSig) || null;
}

const isDateActive = (start, end) => {
    const today = new Date().toISOString().slice(0, 10);
    if (start && start > today) return false;
    if (end && end < today) return false;
    return true;
};

function bestDiscountTier(discounts, quantity) {
    let best = null;
    for (const tier of discounts || []) {
        const tq = Number(tier.quantity) || 0;
        if (tq > quantity) continue;
        if (!best || tq > Number(best.quantity) || (tq === Number(best.quantity) && Number(tier.priority) > Number(best.priority))) {
            best = tier;
        }
    }
    return best;
}

/**
 * Giá cuối = MIN(giá variant, special đang active theo ngày, tier chiết khấu
 * theo số lượng đạt ngưỡng) — mirror OrderAdminWriteService::resolvePrice() (PHP).
 */
export function effectivePrice(variant, quantity = 1) {
    if (!variant) return 0;
    const candidates = [Number(variant.price) || 0];

    if (variant.special_price !== '' && variant.special_price != null) {
        if (isDateActive(variant.special_date_start, variant.special_date_end)) {
            candidates.push(Number(variant.special_price));
        }
    }

    const tier = bestDiscountTier(variant.discounts, quantity);
    if (tier) candidates.push(Number(tier.price));

    return Math.min(...candidates);
}

export function formatVnd(value) {
    return (Number(value) || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}
