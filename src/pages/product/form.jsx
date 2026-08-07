/**
 * pages/product/form.jsx — KHUNG form product (REST).
 * -----------------------------------------------------------
 * Nạp resource (list_for_product) + detail, giữ objForm, thanh tab
 * (General/Data/Link/Attribute/Option/Discount/Reward/Image), nút Save /
 * Save&Edit / Cancel.
 *
 * Sau refactor DB (2026-06/07):
 *   - product_special đã gộp vào product_variant_special ⇒ BỎ tab Special.
 *   - price / regular_price / minimum / tồn kho / khuyến mãi đều nằm ở tầng
 *     product_variant + product_stock + product_variant_special ⇒ TẤT CẢ nhập
 *     ở tab Option. Sản phẩm đơn giản = 1 variant mặc định (tab Option luôn
 *     hiển thị 1 dòng mặc định).
 *   - buildPayload đảm bảo LUÔN gửi ít nhất 1 variant mặc định cho sản phẩm
 *     đơn giản (backend ProductVariantWriter là nơi duy nhất ghi giá & kho).
 *
 * REST:
 *   GET  /resource?list_for_product=true   → dropdown nguồn (category, manufacturer...)
 *   GET  /product/{id}                      → chi tiết
 *   POST /product                           → tạo (201, data.id)
 *   PUT  /product/{id}                      → sửa
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Spin, Button } from 'antd';

import Wrapper from '@/components/app/Wrapper';
import General from '@/components/product/General';
import ProductData from '@/components/product/ProductData';
import ProductImage from '@/components/product/ProductImage';
import ProductLink from '@/components/product/Link';
import Attribute from '@/components/product/Attribute';
import Option from '@/components/product/Option';
import Discount from '@/components/product/Discount';
import Reward from '@/components/product/Reward';
import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import { useListLanguages } from '@/core/stores/appSettingsStore';

const TABS = [
    'general',
    'data',
    'link',
    'attribute',
    'option',
    'discount',
    'reward',
    'image',
];

/**
 * Tìm variant mặc định (đơn vị bán của sản phẩm đơn giản). Ưu tiên cờ
 * is_default, rồi variant không gắn option, cuối cùng là dòng đầu.
 */
const findDefaultVariant = (variants = []) =>
    variants.find((v) => v.is_default) ||
    variants.find((v) => !(v.option_value_ids || []).length) ||
    variants[0] ||
    null;

const emptyDescription = (code) => ({
    language_code: code,
    name: '',
    description: '',
    content: '',
    tag: '',
    meta_title: '',
    meta_description: '',
    meta_keyword: '',
});

const defaultForm = (id) => ({
    id,
    model: '',
    sku: '',
    stock_status_id: 7,
    image: '',
    manufacturer_id: '',
    shipping: 1,
    link_sale: '',
    link_sale_custom: [],
    points: '',
    tax_class_id: '',
    date_available: '',
    weight: 0,
    weight_class_id: 2,
    length: '',
    width: '',
    height: '',
    length_class_id: 1,
    sort_order: '',
    is_add_cart: 1,
    is_custom: 0,
    is_review: 1,
    product_categories: [],
    product_descriptions: [],
    product_filters: [],
    product_related: [],
    product_ingredients: [],
    product_attributes: [],
    product_options: [],
    product_variants: [],
    product_rewards: [],
    product_images: [],
});

/**
 * Chuẩn hoá payload trước khi gửi backend.
 *   - Bỏ field chết product_specials (bảng product_special đã gộp vào
 *     product_variant_special).
 *   - Sản phẩm đơn giản (không có option tạo biến thể): LUÔN gửi đúng 1 variant
 *     mặc định — lấy dữ liệu từ tab Option (variant[0]) để không mất giá/kho.
 */
const buildPayload = (form) => {
    const payload = { ...form };
    delete payload.product_specials;

    const hasVariantOptions = (form.product_options || []).some(
        (o) => Number(o.role) === 1 && (o.option_value_ids || []).length > 0
    );

    let variants = form.product_variants || [];
    if (!hasVariantOptions) {
        const dv = findDefaultVariant(variants) || {};
        variants = [
            {
                id: dv.id || 0,
                price: dv.price ?? '',
                regular_price: dv.regular_price ?? '',
                sku: dv.sku ?? '',
                minimum: dv.minimum || 1,
                // Đa kho — xem components/product/Option.jsx VariantStockCell.
                // 'on_hand'/'inventory_policy' phẳng giữ lại làm fallback tương
                // thích ngược cho backend (ProductVariantWriter::syncVariantStocks)
                // khi 'stocks' rỗng, KHÔNG phải nguồn dữ liệu chính nữa.
                stocks: dv.stocks ?? [],
                on_hand: dv.on_hand ?? 0,
                inventory_policy: dv.inventory_policy ?? 0,
                sort_order: dv.sort_order || 0,
                is_default: 1,
                special_price: dv.special_price ?? '',
                special_date_start: dv.special_date_start ?? '',
                special_date_end: dv.special_date_end ?? '',
                option_value_ids: [],
                // BUG đã fix (2026-08-02): thiếu field này ⇒ mọi lần Save sản
                // phẩm ĐƠN GIẢN (không option tạo biến thể) đều gửi variant KHÔNG
                // có discounts ⇒ backend syncVariantDiscounts() coi discounts =
                // [] ⇒ xoá sạch tier chiết khấu đã nhập ở tab Discount, kể cả khi
                // chỉ sửa 1 field không liên quan (vd SKU). Phải giữ nguyên mảng
                // discounts hiện có của default variant khi build lại object.
                discounts: dv.discounts ?? [],
            },
        ];
    }

    payload.product_variants = variants;
    return payload;
};

function Placeholder({ name }) {
    return (
        <div className="card m-b-20">
            <div className="card-body p-5 text-center text-muted">
                Tab <b>{name}</b> sẽ được convert ở đợt sau.
            </div>
        </div>
    );
}

export default function ProductForm() {
    const params = useParams();
    const navigate = useNavigate();
    const t = useTranslation();
    const loading = useLoading();
    const listLanguages = useListLanguages();
    // ?tab=option — cho phép deep-link mở thẳng 1 tab (dùng bởi badge Quantity
    // ở product/index.jsx khi sản phẩm có nhiều variant: click nhảy thẳng vào
    // tab Option, nơi sửa tồn kho theo từng variant × từng kho — xem
    // VariantStockCell trong components/product/Option.jsx). Chỉ đọc 1 lần
    // lúc mount, không sync ngược lại URL khi user tự bấm đổi tab.
    const [searchParams] = useSearchParams();

    const [objForm, setObjForm] = useState(() => defaultForm(parseInt(params.id, 10) || 0));
    const [resource, setResource] = useState({});
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState(
        () => TABS.find((tab) => tab === searchParams.get('tab')) || 'general'
    );
    const [loader, setLoader] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const buildDescriptions = useCallback(
        (existing = []) =>
            listLanguages.map(
                (lang) =>
                    existing.find((d) => d.language_code === lang.code) ||
                    emptyDescription(lang.code)
            ),
        [listLanguages]
    );

    // Nạp resource cho dropdown + detail.
    useEffect(() => {
        const inst = loading.open();
        const id = objForm.id;

        const loadResource = api
            .get('/resource', { params: { list_for_product: true } })
            .then((res) => setResource(res.data?.data || res.data || {}))
            .catch(() => {});

        // QUAN TRỌNG: phải catch riêng lỗi loadDetail. Trước đây không có
        // .catch() ở đây ⇒ nếu GET /product/{id} lỗi (500/timeout thoáng qua),
        // objForm vẫn giữ nguyên defaultForm(id) (product_variants: [],
        // product_descriptions: []) NHƯNG loader vẫn được set true ở
        // .finally() bên dưới ⇒ form vẫn render, vẫn bấm Save được. Với sản
        // phẩm đơn giản, buildPayload() sẽ coi "không có variant" là dấu hiệu
        // hợp lệ để gửi 1 variant mặc định RỖNG (price:'', on_hand:0) ⇒ GHI ĐÈ
        // mất giá/kho thật trong DB. Đây chính là nguyên nhân đã làm hỏng dữ
        // liệu sản phẩm test (id 500000: price/on_hand bị về 0). Fix: đánh dấu
        // loadError để chặn render form khi tải chi tiết thất bại, thay vì lặng
        // lẽ coi như sản phẩm rỗng.
        const loadDetail = id > 0
            ? api.get(`/product/${id}`).then((res) => {
                  const data = res.data?.data || {};
                  let linkSale = data.link_sale_custom;
                  if (typeof linkSale === 'string' && linkSale) {
                      try {
                          linkSale = JSON.parse(linkSale);
                      } catch {
                          linkSale = [];
                      }
                  }
                  setObjForm({
                      ...defaultForm(id),
                      ...data,
                      link_sale_custom: Array.isArray(linkSale) ? linkSale : [],
                      product_descriptions: buildDescriptions(data.product_descriptions || []),
                      product_images: data.product_images || [],
                  });
              }).catch((err) => {
                  setLoadError(true);
                  throw err;
              })
            : Promise.resolve(
                  setObjForm((f) => ({
                      ...f,
                      product_descriptions: buildDescriptions([]),
                  }))
              );

        Promise.all([loadResource, loadDetail])
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => {
                setLoader(true);
                inst.close();
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Merge patch vào objForm (tab con gọi).
    const patchForm = useCallback(
        (patch) => setObjForm((f) => ({ ...f, ...patch })),
        []
    );

    const setDesc = useCallback(
        (index, field, value) =>
            setObjForm((f) => ({
                ...f,
                product_descriptions: f.product_descriptions.map((d, i) =>
                    i === index ? { ...d, [field]: value } : d
                ),
            })),
        []
    );

    const save = (edit = false) => {
        // Chốt chặn thứ 2 (bên cạnh loadError chặn render): nếu đây là sản
        // phẩm CÓ SẴN (id > 0), không dùng option tạo biến thể, mà
        // product_variants lại rỗng — nghĩa là dữ liệu variant/kho chưa từng
        // được nạp vào objForm (bug tải trang, tab Option chưa mở lần nào sau
        // 1 lần load lỗi, v.v.). Không được để buildPayload() tự ý sinh 1
        // variant mặc định toàn giá trị rỗng/0 rồi ghi đè lên giá/kho thật.
        const hasVariantOptions = (objForm.product_options || []).some(
            (o) => Number(o.role) === 1 && (o.option_value_ids || []).length > 0
        );
        if (objForm.id > 0 && !hasVariantOptions && (objForm.product_variants || []).length === 0) {
            showError(
                'Không thể lưu: dữ liệu giá/kho (product_variants) chưa được tải. ' +
                    'Vui lòng tải lại trang trước khi lưu để tránh mất dữ liệu.'
            );
            return;
        }

        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                setErrors({});
                const body = buildPayload(objForm);
                const req =
                    objForm.id > 0
                        ? api.put(`/product/${objForm.id}`, body)
                        : api.post('/product', body);

                req
                    .then((res) => {
                        success(t('SaveSuccess')).then(() => {
                            if (!edit) return navigate('/product/list');
                            const newId = res.data?.data?.id || objForm.id;
                            if (objForm.id > 0) {
                                window.location.reload();
                            } else {
                                navigate(`/product/${newId}`);
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
            <Wrapper title={t('AddProduct')} sapo="">
                <div className="p-5 text-center">
                    <Spin />
                </div>
            </Wrapper>
        );
    }

    if (loadError) {
        return (
            <Wrapper title={t('EditProduct')} sapo="">
                <div className="card m-b-20">
                    <div className="card-body p-5 text-center text-danger">
                        Không tải được dữ liệu sản phẩm (lỗi mạng hoặc server). Để tránh
                        ghi đè mất giá/kho, form sửa đã bị khoá.
                        <br />
                        <Button className="mt-3" onClick={() => window.location.reload()}>
                            Tải lại trang
                        </Button>
                    </div>
                </div>
            </Wrapper>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <General
                        descriptions={objForm.product_descriptions}
                        onChangeDesc={setDesc}
                        errors={errors}
                    />
                );
            case 'data':
                return (
                    <ProductData
                        product={objForm}
                        resource={resource}
                        onChange={patchForm}
                        errors={errors}
                    />
                );
            case 'link':
                return (
                    <ProductLink
                        product={objForm}
                        resource={resource}
                        onChange={patchForm}
                        errors={errors}
                    />
                );
            case 'attribute':
                return (
                    <Attribute
                        product={objForm}
                        resource={resource}
                        onChange={patchForm}
                        errors={errors}
                    />
                );
            case 'option':
                return (
                    <Option product={objForm} resource={resource} onChange={patchForm} />
                );
            case 'discount':
                return (
                    <Discount
                        product={objForm}
                        resource={resource}
                        onChange={patchForm}
                        errors={errors}
                    />
                );
            case 'reward':
                return (
                    <Reward
                        product={objForm}
                        resource={resource}
                        onChange={patchForm}
                        errors={errors}
                    />
                );
            case 'image':
                return (
                    <ProductImage product={objForm} onChange={patchForm} errors={errors} />
                );
            default:
                return <Placeholder name={activeTab} />;
        }
    };

    return (
        <Wrapper title={objForm.id > 0 ? t('EditProduct') : t('AddProduct')} sapo="">
            <div className="product">
                {/* Thanh tab */}
                <ul className="nav nav-tabs nav-tabs-custom">
                    {TABS.map((tab) => (
                        <li className="nav-item" key={tab}>
                            {/*
                                React 19 tự chặn href="javascript:void(0);" ("React has
                                blocked a javascript: URL as a security precaution") — mọi
                                click vào tab đều log 1 exception ra console (onClick vẫn
                                chạy nên tab vẫn chuyển được, nhưng console bị spam lỗi).
                                Đổi sang <button> — .nav-tabs .nav-link style áp được cho
                                bất kỳ element nào, không riêng <a>.
                            */}
                            <button
                                type="button"
                                className={'nav-link' + (activeTab === tab ? ' active' : '')}
                                onClick={() => setActiveTab(tab)}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {tab}
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
                        <Link to="/product/list" className="btn btn-danger">
                            {t('Cancel')}
                        </Link>
                    </div>
                </div>
            </div>
        </Wrapper>
    );
}
