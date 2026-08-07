/**
 * imageUrl.js
 * -----------------------------------------------------------
 * Build URL ảnh tuyệt đối từ path tương đối lưu trong DB (vd
 * "seed/products/image-32.jpg" hoặc "infun/2026-08-01/xxx.png").
 *
 * QUAN TRỌNG — domain nào mới đúng:
 *   appSettings.storageDomain (từ /system/init → imageDomain, xem
 *   SystemController::init + useInitSystem.js) LÀ domain CDN thật nơi ảnh
 *   được lưu (R2/Cloudflare, .env AWS_URL — vd "https://cdn.lartisan.vn").
 *   KHÔNG PHẢI domain web chính (infun.co) — 2 domain khác nhau hoàn toàn.
 *
 * Về resize theo kích thước (w/h):
 *   R2 (Cloudflare object storage thuần) KHÔNG có cú pháp query-string tự
 *   resize (?w=&h=... bị R2 lờ đi, trả nguyên ảnh gốc). Cơ chế resize THẬT
 *   của backend là 1 trong 2:
 *     1. Cloudflare Image Resizing (feature riêng, trả phí, phải bật ở zone
 *        + cấu hình CF_IMAGE_RESIZING=true trong .env) — dùng path riêng
 *        "/cdn-cgi/image/width=W,height=H,.../<path>", xem
 *        MyStorage::cloudflareResizeUrl(). Hiện .env CHƯA bật (đã kiểm tra
 *        2026-08-02) ⇒ tính năng này đang tắt.
 *     2. Cache thumbnail dựng sẵn lúc upload (ProcessImageUpload job) ở
 *        đúng path "{folder_cache}/{w}x{h}/{path}" — chỉ có cho vài size cố
 *        định (xem config/media.php thumbnail_sizes), không áp dụng cho
 *        kích thước tuỳ ý, và CMS hiện chưa gọi API nào trả URL dạng này.
 *   ⇒ Hàm này KHÔNG append query string resize nữa (khác bản cũ có
 *   "?w=&h=&mode=crop" — dead code, chưa từng có tác dụng thật với R2).
 *   Ảnh hiển thị đúng kích thước gốc, co lại bằng CSS (width/height) như
 *   hiện tại — chấp nhận được cho ảnh thumbnail nhỏ trong CMS.
 *
 * @param {string} path - path tương đối lưu trong DB, hoặc URL tuyệt đối/data:
 * @param {string} domain - appSettings.storageDomain
 * @returns {string}
 */
export function resolveImageUrl(path, domain) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image/')) {
        return path;
    }
    const base = (domain || '').replace(/\/+$/, '');
    return base + '/' + path.replace(/^\/+/, '');
}

export default resolveImageUrl;
