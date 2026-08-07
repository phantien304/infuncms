/**
 * constants.js
 * -----------------------------------------------------------
 * Mapping từ Vue 2: gần như giữ nguyên (đây là static config).
 * Cách dùng trong React component:
 *
 *   import CONSTANTS from '@/utils/constants';
 *   localStorage.getItem(CONSTANTS.USERNAME);
 * -----------------------------------------------------------
 */

let area = import.meta.env.VITE_AREA || 'CMS';
let suffix = '_' + area;

// Origin Laravel để asset /cms/... load đúng khi CMS chạy ở origin khác.
const LARAVEL_ORIGIN = import.meta.env.VITE_LARAVEL_ORIGIN || '';

// window.appSettings vẫn được inject sẵn (qua <script> trong index.html)
// giống bản Vue 2. Không thay đổi cơ chế này.

const CONSTANTS = {
    LANG: 'LANG' + suffix,
    USERNAME: 'USERNAME' + suffix,
    ACCOUNT: 'ACCOUNT' + suffix,
    PERMISSIONS: 'PERMISSIONS' + suffix,
    USER_PERMISSIONS: 'USER_PERMISSIONS' + suffix,
    CURRENT_VERSION: 'CURRENT_VERSION' + suffix,
    MENU_MODE: 'MENU_MODE' + suffix,
    ACCESS_PERMISSION: 'ACCESS_PERMISSION' + suffix,
    ICON_UPLOAD: LARAVEL_ORIGIN + '/cms/images/assets/file-upload.jpg',
    NO_IMG: LARAVEL_ORIGIN + '/cms/images/assets/no-img.png',
    POSITION_MENU: ['top', 'bottom'],
    VARIATION_ONE: 1,
    VARIATION_TWO: 2,
};

export default CONSTANTS;
