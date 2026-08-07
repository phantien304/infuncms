/**
 * pages/order/form.jsx — KHUNG wizard 3 bước tạo/sửa order (REST).
 * -----------------------------------------------------------
 * Convert từ order/form.vue (mt219, 3 subForm: customer/product/confirm) —
 * BỎ `step_order`/`mode_save` phía server: FE tự quản lý state cả 3 tab
 * trong 1 objForm, chỉ gọi BE 1 lần lúc bấm Save (POST/PUT /order[/:id]),
 * và gọi POST /order/preview-total (không ghi DB) để xem trước tổng tiền
 * (xem components/order/Confirm.jsx).
 *
 * REST:
 *   GET /order-status, /zone, /carrier, /payment   dropdown
 *   GET /resource?list_for_product=true             option catalog (tên
 *                                                    option/option_value —
 *                                                    dùng ở tab Product)
 *   GET /order/{id}                                 chi tiết khi sửa
 *   POST /order | PUT /order/{id}                   lưu (luôn kèm `products`
 *                                                    — phân biệt với
 *                                                    order/view.jsx chỉ sửa
 *                                                    trạng thái/thông tin
 *                                                    khách, KHÔNG gửi `products`)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Spin, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import Customer from '@/components/order/Customer';
import Product from '@/components/order/Product';
import Confirm from '@/components/order/Confirm';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';

const TABS = ['customer', 'product', 'confirm'];

/**
 * Gate chuyển tab — mirror lại đúng các điều kiện mt219 từng chặn bằng
 * `:disabled` + gọi BE `step_order` (form.vue cũ: stepOneToTwo/stepTwoToThree),
 * nhưng làm HOÀN TOÀN client-side (không gọi thêm BE) để giữ đúng quyết định
 * kiến trúc "chỉ gọi BE 1 lần lúc Save" đã chọn khi convert (xem comment đầu
 * file). Field bắt buộc khớp với App\Http\Requests\Cms\OrderRequest::rules().
 */
const isCustomerStepValid = (form) =>
    !!form.order_status_id &&
    !!(form.full_name || '').trim() &&
    !!(form.telephone || '').trim() &&
    !!(form.address || '').trim() &&
    !!form.zone_id &&
    !!form.district_id &&
    !!form.ward_id;

const isProductStepValid = (form) => (form.products || []).length > 0;

const defaultForm = (id) => ({
    id,
    order_status_id: '',
    send_mail: false,
    note: '',
    user_id: '',
    full_name: '',
    email: '',
    telephone: '',
    zone_id: '',
    district_id: '',
    ward_id: '',
    address: '',
    comment: '',
    carrier_code: '',
    payment_code: '',
    products: [],
});

/**
 * orders_products (shape lưu trong DB, đọc từ GET /order/{id}) -> shape dòng
 * sản phẩm mà tab Product/Confirm dùng nội bộ (khớp state Product.jsx tự tạo
 * khi "Thêm sản phẩm"). Tách theo options[].type ('variant'/'custom_field')
 * để dựng lại option_value_ids/custom_options gửi lên khi Save lại.
 *
 * product_variant_id (2026-08-03, sửa bug mất biến thể khi resave): giữ
 * nguyên kèm theo làm lưới an toàn. Order tạo trước khi convert module này
 * (hoặc bất kỳ trường hợp nào orders_product_option không có row type=
 * 'variant') sẽ cho variantOpts rỗng dù dòng sản phẩm ĐÃ có biến thể thật —
 * nếu BE chỉ dựa vào option_value_ids rỗng để hiểu "chưa chọn gì" thì sẽ âm
 * thầm rơi về variant mặc định, đổi nhầm giá/biến thể dù nhân viên chỉ sửa
 * tab Customer. Gửi kèm product_variant_id để BE ưu tiên giữ nguyên khi
 * option_value_ids rỗng (xem OrderAdminWriteService::resolveLine()).
 */
const productsFromDetail = (ordersProducts = []) =>
    ordersProducts.map((p) => {
        const options = p.options || [];
        const variantOpts = options.filter((o) => o.type === 'variant');
        const customOpts = options.filter((o) => o.type !== 'variant');
        return {
            key: `existing-${p.id}`,
            product_id: p.product_id,
            product_variant_id: p.product_variant_id ?? null,
            name: p.name,
            model: p.model,
            quantity: p.quantity,
            price: p.price,
            total: p.total,
            option_value_ids: variantOpts.map((o) => ({
                option_id: o.product_option_id,
                value_id: o.product_option_value_id,
            })),
            custom_options: customOpts.map((o) => ({ option_id: o.product_option_id, value: o.value })),
            display_options: options.map((o) => ({ name: o.name, value: o.value })),
        };
    });

/** Payload gửi BE — bỏ hết field chỉ FE dùng để hiển thị (name/price/total/key/display_options). */
const buildPayload = (form) => ({
    order_status_id: form.order_status_id,
    send_mail: form.send_mail,
    note: form.note,
    user_id: form.user_id || null,
    full_name: form.full_name,
    email: form.email,
    telephone: form.telephone,
    zone_id: form.zone_id,
    district_id: form.district_id,
    ward_id: form.ward_id,
    address: form.address,
    comment: form.comment,
    carrier_code: form.carrier_code,
    payment_code: form.payment_code,
    products: (form.products || []).map((p) => ({
        product_id: p.product_id,
        // Chỉ có ở dòng ĐÃ tồn tại (nạp từ productsFromDetail) — dòng mới
        // thêm qua Product.jsx picker không có key này (giữ nguyên hành vi
        // cũ: BE tự resolve variant từ option_value_ids).
        product_variant_id: p.product_variant_id ?? null,
        quantity: p.quantity,
        option_value_ids: p.option_value_ids,
        custom_options: p.custom_options,
    })),
});

export default function OrderForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();

    const [objForm, setObjForm] = useState(() => defaultForm(parseInt(params.id, 10) || 0));
    const [resource, setResource] = useState({});
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState('customer');
    const [loader, setLoader] = useState(false);

    useEffect(() => {
        const inst = loading.open();
        const id = objForm.id;

        const loadResource = Promise.all([
            api.get('/order-status').then((res) => res.data?.data || []),
            api.get('/zone').then((res) => res.data?.data || []),
            api.get('/carrier').then((res) => res.data?.data || []),
            api.get('/payment').then((res) => res.data?.data || []),
            api
                .get('/resource', { params: { list_for_product: true } })
                .then((res) => (res.data?.data || res.data || {}).option || []),
        ]).then(([order_status, zone, carrier, payment, option]) => {
            setResource({ order_status, zone, carrier, payment, option });
            // Đơn mới: mặc định trạng thái đầu tiên (mt219 gốc cũng mặc định
            // "Chờ xác nhận" — danh sách order_status đã sort theo id ở BE).
            if (id === 0 && order_status.length) {
                setObjForm((f) => (f.order_status_id ? f : { ...f, order_status_id: order_status[0].id }));
            }
        });

        const loadDetail =
            id > 0
                ? api.get(`/order/${id}`).then((res) => {
                      const data = res.data?.data || {};
                      setObjForm({
                          ...defaultForm(id),
                          order_status_id: data.order_status_id,
                          send_mail: false,
                          note: '',
                          user_id: data.user_id || '',
                          full_name: data.full_name,
                          email: data.email,
                          telephone: data.telephone,
                          zone_id: data.zone_id || '',
                          district_id: data.district_id || '',
                          ward_id: data.ward_id || '',
                          address: data.address,
                          comment: data.comment || '',
                          carrier_code: data.carrier_code || '',
                          payment_code: data.payment_code || '',
                          products: productsFromDetail(data.orders_products),
                      });
                  })
                : Promise.resolve();

        Promise.all([loadResource, loadDetail])
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => {
                setLoader(true);
                inst.close();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const patchForm = useCallback((patch) => setObjForm((f) => ({ ...f, ...patch })), []);

    // Đi lùi (Product -> Customer, Confirm -> Product/Customer) luôn tự do —
    // giống mt219 (stepTwoToOne/stepThreeToTwo không validate). Chỉ chặn đi
    // TỚI khi bước trước đó chưa hợp lệ.
    const customerOk = isCustomerStepValid(objForm);
    const productOk = isProductStepValid(objForm);
    const canAccessTab = (tab) => {
        if (tab === 'product') return customerOk;
        if (tab === 'confirm') return customerOk && productOk;
        return true;
    };

    const goToTab = (tab) => {
        if (canAccessTab(tab)) {
            setActiveTab(tab);
            return;
        }
        if (!customerOk) {
            showError(t('PleaseCompleteCustomerInfoFirst'));
            return;
        }
        showError(t('PleaseAddAtLeastOneProduct'));
    };

    const save = (edit = false) => {
        if (!(objForm.products || []).length) {
            showError(t('PleaseAddAtLeastOneProduct'));
            setActiveTab('product');
            return;
        }
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const body = buildPayload(objForm);
                const req = objForm.id > 0 ? api.put(`/order/${objForm.id}`, body) : api.post('/order', body);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/order/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                window.location.reload();
                            } else {
                                navigate(`/order/${newId}`);
                            }
                        });
                    })
                    .catch((err) => {
                        if (err?.response?.status === 422) {
                            setErrors(err.response.data?.errors || {});
                            showError(t('ErrorSaveAction'));
                        } else {
                            showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                        }
                    })
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    if (!loader) {
        return (
            <Wrapper title={t('AddOrder')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'customer':
                return <Customer order={objForm} resource={resource} errors={errors} onChange={patchForm} />;
            case 'product':
                return <Product order={objForm} resource={resource} errors={errors} onChange={patchForm} />;
            case 'confirm':
                return <Confirm order={objForm} resource={resource} errors={errors} onChange={patchForm} />;
            default:
                return null;
        }
    };

    return (
        <Wrapper title={objForm.id > 0 ? t('EditOrder') : t('AddOrder')} sapo="">
            <div className="order">
                <ul className="nav nav-tabs nav-tabs-custom">
                    {TABS.map((tab) => (
                        <li className="nav-item" key={tab}>
                            <button
                                type="button"
                                className={
                                    'nav-link' +
                                    (activeTab === tab ? ' active' : '') +
                                    // Cố ý KHÔNG dùng class "disabled": Bootstrap định nghĩa
                                    // .nav-link.disabled { pointer-events: none }, sẽ chặn
                                    // luôn onClick nên goToTab() không bao giờ chạy được để
                                    // báo lỗi — chỉ mờ đi bằng class riêng, vẫn bấm được.
                                    (canAccessTab(tab) ? '' : ' tab-locked')
                                }
                                onClick={() => goToTab(tab)}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {t(tab.charAt(0).toUpperCase() + tab.slice(1))}
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="tab-content p-3">{renderTab()}</div>

                <div className="row mt-3 text-right">
                    <div className="col-xl-12">
                        <Button type="primary" onClick={() => save(false)}>
                            {t('Save')}
                        </Button>
                        &nbsp;
                        <Button onClick={() => save(true)}>{t('SaveAndEdit')}</Button>
                        &nbsp;
                        <Link to="/order/list" className="btn btn-danger">
                            {t('Cancel')}
                        </Link>
                    </div>
                </div>
            </div>
        </Wrapper>
    );
}
