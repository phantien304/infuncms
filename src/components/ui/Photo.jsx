/**
 * Photo.jsx — convert từ photo.vue
 * -----------------------------------------------------------
 * Upload 1 ảnh (drag-drop). Bản Vue 2 dùng el-upload, file React
 * dùng antd Upload (Dragger).
 *
 * Mapping:
 *  - props.src, width, height, index, showDelete → giữ
 *  - computed.displayImage → useMemo (logic build URL preview giữ nguyên)
 *  - methods.getFiles / beforeUpload / deleteImage → giữ logic
 *  - $emit('change', url, index) → onChange prop
 *  - this.$confirm/$error/$success → confirm/error/success từ alert.js
 *
 * BUG đã fix (2026-08-02) — ảnh upload luôn fail, không hiển thị:
 *  1. action cũ trỏ '/vcms/file/save' — route KHÔNG tồn tại ở backend infun
 *     hiện tại (chỉ có POST /file/upload ở web.php, dùng session+CSRF).
 *     infuncms là SPA Bearer-token thuần (api.js), không có session/CSRF
 *     (index.html không có <meta name="csrf-token">) ⇒ mọi request antd
 *     Dragger tự bắn (raw XHR, không qua axios interceptor) đều thiếu cả
 *     URL đúng lẫn Authorization header ⇒ luôn lỗi.
 *     Fix: dùng customRequest để tự POST qua api.js (có sẵn Bearer token)
 *     tới endpoint mới '/rcms/file/upload'.
 *  2. handleDelete cũ gọi useHttp() (client envelope cũ) tới '/file/del' —
 *     route này cũng không tồn tại ở backend (chưa từng có, không phải mới
 *     hỏng) và showDelete không được bật ở bất kỳ nơi nào đang dùng <Photo>
 *     (ProductImage.jsx tự xoá cả dòng ảnh phụ qua removeImage(), không qua
 *     nút xoá trong Photo). Đơn giản hoá: xoá chỉ cần clear giá trị field,
 *     Save sẽ ghi đè xuống DB như mọi field khác — không cần gọi API riêng.
 * -----------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import { Upload } from 'antd';
import CONSTANTS from '@/core/utils/constants';
import { confirm, error, success } from '@/core/services/alert';
import useTranslation from '@/core/hooks/useTranslation';
import api from '@/core/services/api';
import { useAppSettings } from '@/core/stores/appSettingsStore';
import { resolveImageUrl } from '@/core/utils/imageUrl';

const { Dragger } = Upload;

export default function Photo({
    src = '',
    width = '100%',
    height = '500px',
    index = null,
    showDelete = false,
    onChange,
}) {
    const t = useTranslation();
    const appSettings = useAppSettings();

    const [srcUpload, setSrcUpload] = useState(src);
    const [uploading, setUploading] = useState(false);

    const hasImage = useMemo(() => {
        if (!src) return false;
        if (src.indexOf(CONSTANTS.ICON_UPLOAD) !== -1) return false;
        return true;
    }, [src]);

    // BUG đã fix (2026-08-02, lần 3): logic cũ tự chắp "?w=&h=&mode=crop" vào
    // URL với giả định có 1 image-proxy đọc query string này để resize — xác
    // nhận KHÔNG có cơ chế nào như vậy ở backend infun (R2 tự nó không resize
    // theo query string; resize thật là qua Cloudflare Image Resizing dạng
    // path "/cdn-cgi/image/..." — hiện đang TẮT trong .env — hoặc cache
    // thumbnail dựng sẵn theo path riêng, không phải query string). Query
    // string này bị R2 lờ đi hoàn toàn, không có tác dụng — bỏ, dùng chung
    // helper resolveImageUrl với list page (core/utils/imageUrl.js).
    const displayImage = useMemo(() => {
        if (!srcUpload) {
            // ICON_UPLOAD đã là URL tuyệt đối (LARAVEL_ORIGIN + path, xem
            // core/utils/constants.js) — KHÔNG prepend storageDomain (CDN
            // R2) nữa, kẻo nối 2 domain thành 1 URL hỏng kiểu
            // "https://cdn...http://infun...".
            return resolveImageUrl(CONSTANTS.ICON_UPLOAD, appSettings.storageDomain);
        }
        return resolveImageUrl(srcUpload, appSettings.storageDomain);
    }, [srcUpload, appSettings]);

    function handleBeforeUpload(file) {
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) error(t('ImageMoreThan2MB'));
        return isLt2M || Upload.LIST_IGNORE;
    }

    // customRequest: tự POST qua api.js (Bearer token) thay vì để antd Dragger
    // tự bắn XHR thẳng tới action URL (không có cách nào gắn Authorization
    // header vào request đó).
    function handleUpload({ file, onSuccess, onError }) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        api.post('/file/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
            .then((res) => {
                const path = res.data?.data?.path;
                if (path) {
                    setSrcUpload(path);
                    onChange?.(path, index);
                    onSuccess?.(res.data);
                } else {
                    error(t('UploadImageFail'));
                    onError?.(new Error('missing path'));
                }
            })
            .catch((err) => {
                error(
                    err?.response?.data?.message || t('UploadImageFail')
                );
                onError?.(err);
            })
            .finally(() => setUploading(false));
    }

    function handleDelete() {
        confirm(t('DoYouWantToDeleteImage')).then(() => {
            // Không có API xoá file vật lý riêng (chưa từng có) — clear field,
            // Save sẽ ghi giá trị rỗng xuống DB như mọi field khác.
            setSrcUpload('');
            onChange?.('', index);
            success(t('DeleteImageSuccess'));
        });
    }

    return (
        <div
            className="upload-drag-drop-image"
            style={{ position: 'relative' }}
        >
            <Dragger
                multiple={false}
                showUploadList={false}
                disabled={uploading}
                customRequest={handleUpload}
                beforeUpload={handleBeforeUpload}
            >
                <img
                    src={displayImage}
                    alt="upload"
                    className="photo-preview"
                    style={{ width, height }}
                />
            </Dragger>

            {showDelete && hasImage && (
                <i
                    className="mdi mdi-close-circle"
                    onClick={handleDelete}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        fontSize: 15,
                        background: 'rgb(207, 207, 207)',
                        padding: 10,
                        zIndex: 99999,
                        cursor: 'pointer',
                    }}
                />
            )}
        </div>
    );
}
