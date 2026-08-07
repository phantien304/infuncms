/**
 * VideoUpload.jsx — upload 1 file video lên R2, mirror Photo.jsx.
 * -----------------------------------------------------------
 * Dùng cho banner_value.media_type = 'video', provider = 'r2'. Khác Photo.jsx:
 *   - POST tới '/file/upload-video' (FileController::uploadVideo, max 50MB,
 *     mp4/mov/webm/avi) thay vì '/file/upload'.
 *   - Preview bằng thẻ <video controls> thay vì <img>.
 *   - Không dùng Dragger toàn vùng ảnh (video preview cần kích thước lớn hơn,
 *     kéo-thả style tương tự nhưng render khác khi đã có video).
 * -----------------------------------------------------------
 */

import React, { useState } from 'react';
import { Upload, Button } from 'antd';
import { error, success } from '@/core/services/alert';
import useTranslation from '@/core/hooks/useTranslation';
import api from '@/core/services/api';
import { useAppSettings } from '@/core/stores/appSettingsStore';
import { resolveImageUrl } from '@/core/utils/imageUrl';

export default function VideoUpload({ src = '', index = null, onChange }) {
    const t = useTranslation();
    const appSettings = useAppSettings();
    const [srcUpload, setSrcUpload] = useState(src);
    const [uploading, setUploading] = useState(false);

    const displayVideo = srcUpload
        ? resolveImageUrl(srcUpload, appSettings.storageDomain)
        : '';

    function handleBeforeUpload(file) {
        const isLt50M = file.size / 1024 / 1024 < 50;
        if (!isLt50M) error(t('VideoMoreThan50MB'));
        return isLt50M || Upload.LIST_IGNORE;
    }

    function handleUpload({ file, onSuccess, onError }) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        api
            .post('/file/upload-video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((res) => {
                const path = res.data?.data?.path;
                if (path) {
                    setSrcUpload(path);
                    onChange?.(path, index);
                    success(t('UploadSuccess'));
                    onSuccess?.(res.data);
                } else {
                    error(t('UploadVideoFail'));
                    onError?.(new Error('missing path'));
                }
            })
            .catch((err) => {
                error(err?.response?.data?.message || t('UploadVideoFail'));
                onError?.(err);
            })
            .finally(() => setUploading(false));
    }

    return (
        <div className="video-upload">
            {displayVideo && (
                <video
                    src={displayVideo}
                    controls
                    style={{ width: '100%', maxWidth: 300, display: 'block', marginBottom: 8 }}
                />
            )}
            <Upload
                showUploadList={false}
                disabled={uploading}
                customRequest={handleUpload}
                beforeUpload={handleBeforeUpload}
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            >
                <Button icon={<i className="fa fa-upload" />} loading={uploading}>
                    {srcUpload ? t('ChangeVideo') : t('UploadVideo')}
                </Button>
            </Upload>
        </div>
    );
}
