/**
 * useUrlSyncedState.js
 * -----------------------------------------------------------
 * State object (objSearch: keyword/sort/order/deleted_at/pageIndex/pageSize...)
 * đồng bộ 2 chiều với query string — F5 hoặc back/forward giữ nguyên trạng
 * thái filter/sort/trang hiện tại thay vì reset về mặc định.
 *
 *   const [objSearch, setObjSearch] = useUrlSyncedState((searchParams) => ({
 *       keyword: searchParams.get('keyword') || '',
 *       pageIndex: intParam(searchParams, 'pageIndex', 1),
 *       ...
 *   }));
 *
 * API giữ nguyên `useState` (đọc lần đầu từ URL, set như bình thường) — chỉ
 * thêm hiệu ứng phụ: mỗi lần state đổi thì ghi lại vào URL (replace, không
 * đẩy thêm history entry — tránh spam nút Back khi gõ từng ký tự keyword).
 * -----------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * parseInt an toàn cho field số có thể = 0 (vd deleted_at=0 "DeActive").
 * KHÔNG dùng `parseInt(...) || fallback` — 0 là falsy nên sẽ bị đè nhầm
 * thành fallback, filter "DeActive" không bao giờ giữ được qua F5.
 */
export function intParam(searchParams, key, fallback) {
    const value = parseInt(searchParams.get(key), 10);
    return Number.isNaN(value) ? fallback : value;
}

export default function useUrlSyncedState(getInitialState) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState(() => getInitialState(searchParams));

    useEffect(() => {
        const params = {};
        Object.entries(state).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                params[key] = String(value);
            }
        });
        setSearchParams(params, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    return [state, setState];
}
