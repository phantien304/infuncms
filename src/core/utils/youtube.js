/**
 * youtube.js — trích video ID từ URL YouTube (watch?v=, youtu.be/, /embed/,
 * /shorts/) để dựng preview nhúng trong banner form. Không tồn tại module
 * tương tự nào khác trong repo (banner là chỗ đầu tiên hỗ trợ video).
 */
const YOUTUBE_ID_RE =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYoutubeId(url) {
    if (!url) return null;
    const match = String(url).match(YOUTUBE_ID_RE);
    return match ? match[1] : null;
}

export function youtubeEmbedUrl(url) {
    const id = extractYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
}

export default extractYoutubeId;
