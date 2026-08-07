<?php
/**
 * SPA fallback cho Laravel Herd (nginx) khi phục vụ bản BUILD tĩnh.
 * -----------------------------------------------------------------
 * Herd dùng nginx, KHÔNG đọc .htaccess. Với site tĩnh, deep-link
 * (vd /product/list) sẽ 404. Herd nginx fallback các URL không khớp
 * file về /index.php -> file này trả index.html để react-router xử lý.
 *
 * File nằm trong public/ nên Vite tự copy sang dist/ mỗi lần build.
 * Asset thật (js/css/img) đã được nginx phục vụ trực tiếp trước khi
 * tới đây, nên chỉ cần trả index.html.
 *
 * (Chỉ dùng cho cách "herd link bản build". Nếu dùng `herd proxy` tới
 *  Vite dev server thì file này không liên quan.)
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$full = __DIR__ . $path;

// Nếu là file thật -> để server phục vụ trực tiếp (built-in server).
if ($path !== '/' && is_file($full)) {
    return false;
}

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
