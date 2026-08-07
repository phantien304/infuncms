/**
 * pages/auth/login.jsx
 * -----------------------------------------------------------
 * Convert từ components/auth/login.vue (Vue 2) sang React.
 *
 *   Vue 2                          | React (file này)
 *   -------------------------------+--------------------------------
 *   data.objLogin {email,...}      | antd Form values
 *   mapActions(['login'])          | http({ data:{ url:'login', ... } })
 *   this.$loading({lock:true})     | useLoading().open()
 *   this.$i(key)                   | useTranslation() -> t(key)
 *   this.$error(msg)               | alert.error(msg)
 *   this.$router.push(returnUrl)   | navigate(returnUrl)
 *   created(): đã login -> đẩy đi   | useEffect(mount)
 *
 * Backend /rcms/login trả về data: { account, permissions } (khác bản cũ
 * chỉ trả username) → lưu USERNAME + PERMISSIONS rồi set currentUser.
 * Auth thật sự nằm ở session cookie httpOnly (Sanctum SPA) do backend set,
 * JS không đọc/lưu token nữa — xem core/services/api.js#ensureCsrfCookie.
 *
 * returnUrl nhận từ 2 nguồn:
 *   - RequireAuth đẩy qua location.state.returnUrl
 *   - http.js (lỗi 401) đẩy qua query ?returnUrl=
 * -----------------------------------------------------------
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Card } from 'antd';

import api, { ensureCsrfCookie } from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { error as showError } from '@/core/services/alert';
import useUserStore from '@/core/stores/userStore';
import CONSTANTS from '@/core/utils/constants';

export default function Login() {
    const t = useTranslation();
    const loading = useLoading();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const setCurrentUser = useUserStore((s) => s.setCurrentUser);
    const setPermissions = useUserStore((s) => s.setPermissions);

    // Gộp returnUrl từ location.state (RequireAuth) hoặc query (?returnUrl=).
    const resolveReturnUrl = () => {
        const raw = location.state?.returnUrl || searchParams.get('returnUrl');
        return raw ? decodeURIComponent(raw) : '/';
    };

    // created(): nếu đã đăng nhập rồi thì không ở lại trang login.
    useEffect(() => {
        if (localStorage.getItem(CONSTANTS.USERNAME)) {
            navigate(resolveReturnUrl(), { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onFinish = (values) => {
        const inst = loading.open();

        // Sanctum SPA: phải có cookie XSRF-TOKEN trước khi POST /login.
        // REST: POST /login → { data: { account, permissions }, message }.
        ensureCsrfCookie()
            .then(() =>
                api.post('/login', { email: values.email, password: values.password })
            )
            .then((res) => {
                const data = res.data?.data || {};

                // Quyền (permissions) — lưu để menu/route phân quyền dùng lại
                // (usePermission()/Can.jsx, xem core/stores/userStore.js).
                setPermissions(data.permissions || []);

                const username =
                    data.account?.username ||
                    data.account?.email ||
                    values.email;

                // setCurrentUser tự đồng bộ USERNAME vào localStorage.
                setCurrentUser(username);

                inst.close();
                navigate(resolveReturnUrl(), { replace: true });
            })
            .catch((err) => {
                inst.close();
                showError(t(err?.response?.data?.message || 'LoginFailed'));
            });
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
        >
            <Card style={{ width: 380, maxWidth: '100%' }}>
                <h4 style={{ textAlign: 'center', marginBottom: 4 }}>Chào bạn!</h4>
                <p
                    style={{
                        textAlign: 'center',
                        color: '#888',
                        marginBottom: 24,
                    }}
                >
                    {t('TextScreenLogin')}
                </p>

                <Form
                    layout="vertical"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    <Form.Item
                        label={t('Email')}
                        name="email"
                        rules={[
                            { required: true, message: t('Email') },
                            { type: 'email', message: t('Email') },
                        ]}
                    >
                        <Input placeholder={t('Email')} autoComplete="username" />
                    </Form.Item>

                    <Form.Item
                        label={t('Password')}
                        name="password"
                        rules={[{ required: true, message: t('Password') }]}
                    >
                        <Input.Password
                            placeholder={t('Password')}
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Form.Item name="remember" valuePropName="checked">
                        <Checkbox>{t('Remember')}</Checkbox>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block>
                            {t('Login')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
