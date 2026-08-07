/**
 * menuConfig.js — Tách data của menuLeft ra file riêng
 * -----------------------------------------------------------
 * Vue 2: data trong menu_left.vue trộn với UI.
 * React: tách config sang file riêng cho dễ chỉnh.
 *
 * Lưu ý: trường `name` tham chiếu tới route name của vue-router cũ.
 * React Router v6 KHÔNG có "name" — chỉ có path. Em đã map sang
 * `path` trực tiếp, đúng với router/index.jsx mới.
 *
 * `permission` (Phase 3.4, docs/ROLE-PERMISSION-PLAN.md): mã quyền
 * 'list-{slug}' cần có để item hiện trong menu — lọc ở MenuLeft.jsx qua
 * usePermission(). CHỈ gắn cho slug đã có trong
 * App\Enums\CmsPermissionEntity (infun) — item KHÔNG gắn `permission` luôn
 * hiện (an toàn hơn ẩn oan, vì phần lớn controller cũ CHƯA được đăng ký vào
 * registry/CI permission:sync, đăng ký thiếu 1 slug sẽ khiến item đó biến
 * mất với MỌI user kể cả admin). Bổ sung dần khi backend gate thêm entity.
 * -----------------------------------------------------------
 */

const MENU = [
    {
        id: 'product',
        label: 'Product',
        icon: 'fa fa-clipboard-list',
        children: [
            { path: '/category/list', label: 'Category', permission: 'list-category' },
            { path: '/product/list', label: 'Product' },
            { path: '/product-draft/list', label: 'ProductDraft' },
            { path: '/warehouse/list', label: 'Warehouse', permission: 'list-warehouse' },
            { path: '/filter/list', label: 'Filter' },
            { path: '/attribute/list', label: 'Attribute' },
            { path: '/option/list', label: 'Option' },
            { path: '/manufacturer/list', label: 'Manufacture' },
            { path: '/review/list', label: 'Review' },
            { path: '/store-review/list', label: 'StoreReview' },
            { path: '/information/list', label: 'Information', permission: 'list-information' },
            { path: '/banner/list', label: 'Banner', permission: 'list-banner' },
            { path: '/ingredient/list', label: 'Ingredient' },
            { path: '/contact/list', label: 'Contact' },
        ],
    },
    {
        id: 'order',
        label: 'Order',
        icon: 'fa fa-cart-plus',
        children: [
            { path: '/order/list', label: 'Order', permission: 'list-order' },
            { path: '/order-status/list', label: 'OrderStatus', permission: 'list-order-status' },
        ],
    },
    {
        id: 'marketing',
        label: 'Marketing',
        icon: 'fa fa-bullhorn',
        children: [
            { path: '/coupon/list', label: 'Coupon' },
            { path: '/voucher/list', label: 'GiftVoucher' },
            { path: '/voucher-theme/list', label: 'VoucherTheme' },
            { path: '/mail/send', label: 'SendMail' },
        ],
    },
    {
        id: 'carrier',
        label: 'Carrier',
        icon: 'fa fa-truck',
        children: [
            { path: '/carrier/list', label: 'Carrier', permission: 'list-carrier' },
            { path: '/carrier-order-status/list', label: 'CarrierOrderStatus' },
        ],
    },
    {
        id: 'payment',
        label: 'Payment',
        icon: 'fa fa-money-bill-alt',
        children: [{ path: '/payment/list', label: 'Payment', permission: 'list-payment' }],
    },
    {
        id: 'user',
        label: 'Users',
        icon: 'mdi mdi-account-multiple',
        children: [
            { path: '/role/list', label: 'Role', permission: 'list-role' },
            { path: '/user/list', label: 'User', permission: 'list-user' },
            { path: '/user-group/list', label: 'UserGroup', permission: 'list-user-group' },
            // Customer (khách hàng, type=2) — gộp vào nhóm Users theo yêu cầu
            // user (2026-08-05), trước đó tách riêng nhóm 'customer' theo
            // CMS-MODULE-BOUNDARY.md nhưng user muốn gộp lại cho gọn menu.
            { path: '/customer/list', label: 'Customer', permission: 'list-customer' },
        ],
    },
    {
        id: 'blog',
        label: 'Blog',
        icon: 'fa fa-tags',
        children: [
            { path: '/blog/list', label: 'Blog', permission: 'list-blog' },
            { path: '/blog-category/list', label: 'BlogCategory', permission: 'list-blog-category' },
            { path: '/blog-tag/list', label: 'BlogTag' },
        ],
    },
    {
        id: 'resource',
        label: 'Resource',
        icon: 'fa fa-map',
        children: [
            { path: '/language/list', label: 'Language' },
            { path: '/currency/list', label: 'Currency' },
            { path: '/stock-status/list', label: 'StockStatus' },
            { path: '/length-class/list', label: 'LengthClass' },
            { path: '/weight-class/list', label: 'WeightClass' },
            { path: '/country/list', label: 'Country' },
            { path: '/zone/list', label: 'Zone', permission: 'list-zone' },
            { path: '/district/list', label: 'District', permission: 'list-district' },
            { path: '/ward/list', label: 'Ward', permission: 'list-ward' },
            { path: '/tax-class/list', label: 'TaxClass' },
            { path: '/tax-rate/list', label: 'TaxRate' },
            { path: '/geo-zone/list', label: 'GeoZone' },
            { path: '/skincare/list', label: 'Skincare' },
            { path: '/safety/list', label: 'Safety' },
            { path: '/effect/list', label: 'Effect' },
        ],
    },
    {
        id: 'systemConfig',
        label: 'SystemConfig',
        icon: 'mdi mdi-settings',
        children: [
            { path: '/setting/detail', label: 'Setting', permission: 'list-setting' },
            { path: '/menu/list', label: 'Menu', permission: 'list-menu' },
        ],
    },
    {
        // Menu lá (không có children) — click thẳng vào path
        id: 'report',
        label: 'Report',
        path: '/report/list',
        icon: 'far fa-chart-bar',
    },
];

export default MENU;
