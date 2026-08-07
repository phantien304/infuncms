import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from '@/core/hooks/useLoading';
import AppWrapper from '@/components/app/AppWrapper';
import AppRoutes from '@/router';

function Root() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <LoadingProvider>
                <AppWrapper>
                    <AppRoutes />
                </AppWrapper>
            </LoadingProvider>
        </BrowserRouter>
    );
}

const container = document.getElementById('cms-app');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <Root />
        </React.StrictMode>
    );
} else {
    console.warn('[cms] #cms-app element not found in DOM');
}

export default Root;
