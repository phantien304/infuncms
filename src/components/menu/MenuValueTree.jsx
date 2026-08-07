/**
 * components/menu/MenuValueTree.jsx — cây menu con (menu_value) kéo-thả.
 * -----------------------------------------------------------
 * Convert từ mt219 components/menu/form.vue (khối vue-nestable + 2 nút
 * ImportCategory/DeleteCategory). Thay `vue-nestable` (không có bản React
 * tương đương, không maintain nhiều năm) bằng antd `Tree` (draggable) —
 * cùng nhóm công nghệ đã dùng (antd) thay vì thêm 1 lib ngoài mới.
 *
 * Cây build từ danh sách PHẲNG (GET /menu-value?menu_id=X) theo `parent_id`;
 * gốc = node có `parent_id === 1` (sentinel "root", KHÔNG phải id thật —
 * xem BE MenuValueRepository::saveFromCms) HOẶC parent_id trỏ tới id không
 * tồn tại trong danh sách (orphan an toàn, không rơi mất node).
 *
 * Kéo-thả xong → tính DIFF {id, parent_id, position} so với mốc đã đồng bộ
 * gần nhất (KHÔNG gửi cả cây — cây to chỉ đổi 1 nhánh nhỏ mỗi lần kéo) rồi
 * POST lên /menu/{menuId}/values/reorder.
 *
 * Props:
 *   menuId       : id Menu cha
 *   selectedId   : id node đang mở form sửa bên phải (để highlight)
 *   onSelect(id) : bấm chọn 1 node → mở form sửa
 *   onCreateNew  : bấm "+ Tạo mục mới" → parent reset form về trạng thái tạo mới
 *   reloadToken  : đổi giá trị (số tăng dần) → ép tree fetch lại (sau khi lưu
 *                  node bên form phải)
 * -----------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tree, Spin, message, notification, Button, Input } from 'antd';

import api from '@/core/services/api';
import useLoading from '@/core/hooks/useLoading';
import useTranslation from '@/core/hooks/useTranslation';
import { confirm, error as showError, success } from '@/core/services/alert';
import './MenuValueTree.css';

// Gộp nhiều lần thả liên tiếp (kéo nhiều node/nhiều lần trong lúc sắp xếp)
// thành 1 request duy nhất thay vì bắn API ngay mỗi lần thả.
const REORDER_DEBOUNCE_MS = 800;

const ROOT = 'ROOT';

// Nhãn badge loại node — khớp value với TYPE_OPTIONS ở MenuValueForm.jsx.
const TYPE_LABELS = {
    page: 'Page',
    category: 'Category',
    information: 'Information',
    product: 'Product',
    blogCategory: 'BlogCategory',
};

// Key localStorage nhớ trạng thái đóng/mở nhánh — RIÊNG theo từng menu (mở
// menu khác nhau, cây khác nhau, không dùng chung 1 key).
const expandStorageKey = (menuId) => `menu_tree_expanded_${menuId}`;

function buildTree(flat) {
    const ids = new Set(flat.map((n) => n.id));
    const childrenMap = new Map();
    flat.forEach((n) => {
        const parentKey = n.parent_id === 1 || !ids.has(n.parent_id) ? ROOT : n.parent_id;
        if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
        childrenMap.get(parentKey).push(n);
    });

    const build = (parentKey, visited) => {
        const kids = (childrenMap.get(parentKey) || [])
            .slice()
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        return kids.map((n) => {
            if (visited.has(n.id)) {
                return { key: n.id, raw: n, children: [] };
            }
            const nextVisited = new Set(visited);
            nextVisited.add(n.id);
            return { key: n.id, raw: n, children: build(n.id, nextVisited) };
        });
    };

    return build(ROOT, new Set());
}

/** Duyệt cây → Map(id => {parent_id, position}). Dùng để diff 2 mốc cây. */
function flattenMap(nodes, parentId = 1, map = new Map()) {
    nodes.forEach((node, idx) => {
        map.set(node.key, { parent_id: parentId, position: idx + 1 });
        if (node.children?.length) flattenMap(node.children, node.key, map);
    });
    return map;
}

/**
 * So `nextTree` với `baseTree` (mốc đã đồng bộ với server gần nhất) → CHỈ
 * trả node có parent_id/position thật sự đổi. Cây 500 node kéo 1 node từ
 * nhánh A sang nhánh B chỉ tính ra vài dòng thay đổi (node kéo + các anh em
 * bị dịch position tại 2 nhánh liên quan) thay vì gửi nguyên 500 dòng.
 */
function diffForReorder(baseTree, nextTree) {
    const baseMap = flattenMap(baseTree);
    const nextMap = flattenMap(nextTree);
    const items = [];
    nextMap.forEach((val, id) => {
        const prev = baseMap.get(id);
        if (!prev || prev.parent_id !== val.parent_id || prev.position !== val.position) {
            items.push({ id, parent_id: val.parent_id, position: val.position });
        }
    });
    return items;
}

/** Tìm + xoá node theo key, trả node đã gỡ (thuật toán chuẩn antd Tree drag). */
function loopTree(data, key, callback) {
    data.forEach((item, index) => {
        if (item.key === key) {
            callback(item, index, data);
            return;
        }
        if (item.children) loopTree(item.children, key, callback);
    });
}

/** Đổi title (local, không refetch) của đúng 1 node theo key — dùng sau khi rename thành công. */
function updateNodeTitle(nodes, key, title) {
    return nodes.map((n) => {
        if (n.key === key) {
            return { ...n, raw: { ...n.raw, title } };
        }
        if (n.children?.length) {
            return { ...n, children: updateNodeTitle(n.children, key, title) };
        }
        return n;
    });
}

/** Highlight đoạn khớp từ khoá tìm kiếm trong label (giữ nguyên hoa/thường gốc). */
function highlightMatch(label, term) {
    if (!term) return label;
    const idx = label.toLowerCase().indexOf(term);
    if (idx === -1) return label;
    return (
        <>
            {label.slice(0, idx)}
            <mark className="node-label-hit">{label.slice(idx, idx + term.length)}</mark>
            {label.slice(idx + term.length)}
        </>
    );
}

/** Duyệt cây → key của MỌI tổ tiên của node khớp `term` (để auto-expand lúc tìm kiếm). */
function collectAncestorKeysOnMatch(nodes, term, ancestors = []) {
    let keys = [];
    nodes.forEach((n) => {
        const label = String(n.raw?.title || '').toLowerCase();
        if (label.includes(term)) keys.push(...ancestors);
        if (n.children?.length) {
            keys.push(...collectAncestorKeysOnMatch(n.children, term, [...ancestors, n.key]));
        }
    });
    return keys;
}

export default function MenuValueTree({ menuId, selectedId, onSelect, onCreateNew, reloadToken }) {
    const t = useTranslation();
    const loading = useLoading();

    const [treeData, setTreeData] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- kéo-thả: gộp request (debounce) + Undo + diff --------------------
    // latestTreeRef: luôn trỏ tới treeData mới nhất, dùng trong callback
    // setTimeout (closure ở đó không tự cập nhật theo state).
    // undoBaseRef: cây TRƯỚC lần thả đầu tiên của batch hiện tại — chỉ set
    // khi bắt đầu 1 batch mới (chưa có timer đang chờ), giữ nguyên qua các
    // lần thả tiếp theo trong cùng batch để Undo quay lại đúng điểm xuất
    // phát chứ không phải bước liền trước.
    // lastSyncedTreeRef: mốc cây KHỚP với server gần nhất (sau fetch/lưu
    // thành công) — nguồn so sánh để tính diff, KHÔNG phải state hiển thị.
    const latestTreeRef = useRef(treeData);
    const undoBaseRef = useRef(null);
    const saveTimerRef = useRef(null);
    const lastSyncedTreeRef = useRef([]);

    // Nhớ đã khôi phục trạng thái đóng/mở cho menuId nào rồi — chỉ đọc
    // localStorage 1 lần lúc vào menu đó, các lần fetch lại sau (Import/Xoá/
    // Lưu/Sửa tên...) GIỮ NGUYÊN trạng thái người dùng đang thao tác, không
    // ép mở hết lại (đây chính là điều user phàn nàn).
    const initedMenuIdRef = useRef(null);
    // Snapshot expandedKeys trước khi bắt đầu gõ tìm kiếm — trả lại đúng
    // trạng thái cũ khi xoá hết ô tìm kiếm, không mất trạng thái thật.
    const preSearchExpandedRef = useRef(null);
    // Chặn onBlur bắn thêm 1 lần rename sau khi Escape đã cancel (input bị
    // unmount ngay sau cancel → browser có thể fire blur native).
    const skipBlurRef = useRef(false);
    const renamingRef = useRef(false);

    const [editingKey, setEditingKey] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    useEffect(() => {
        latestTreeRef.current = treeData;
    }, [treeData]);

    // Huỷ timer đang chờ khi unmount (đổi menu / rời trang) — tránh gọi API
    // với menuId cũ hoặc setState trên component đã gỡ.
    useEffect(() => () => clearTimeout(saveTimerRef.current), []);

    const fetchTree = useCallback(() => {
        setFetching(true);
        return api
            .get('/menu-value', { params: { menu_id: menuId } })
            .then((res) => {
                const flat = res.data?.data || [];
                const tree = buildTree(flat);
                setTreeData(tree);
                lastSyncedTreeRef.current = tree;

                const idSet = new Set(flat.map((n) => n.id));
                if (initedMenuIdRef.current !== menuId) {
                    // Lần đầu vào menu này (mount / đổi menuId) — khôi phục
                    // trạng thái đã lưu; chưa từng lưu (menu mới/lần đầu mở)
                    // thì mặc định mở hết để xem tổng quan.
                    initedMenuIdRef.current = menuId;
                    let restored = null;
                    try {
                        const raw = localStorage.getItem(expandStorageKey(menuId));
                        restored = raw ? JSON.parse(raw) : null;
                    } catch {
                        restored = null;
                    }
                    setExpandedKeys(
                        Array.isArray(restored)
                            ? restored.filter((k) => idSet.has(k))
                            : flat.map((n) => n.id)
                    );
                } else {
                    // Refetch cùng menu — giữ nguyên trạng thái đóng/mở hiện
                    // tại, chỉ dọn key mồ côi (node vừa bị xoá) cho sạch.
                    setExpandedKeys((prev) => prev.filter((k) => idSet.has(k)));
                }
            })
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
            .finally(() => setFetching(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menuId]);

    useEffect(() => {
        // Cây được tải lại từ server (đổi menu, hoặc sau Import/Xoá) → mọi
        // batch kéo-thả + điểm Undo đang dở đều hết ý nghĩa.
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        undoBaseRef.current = null;
        fetchTree();
    }, [fetchTree, reloadToken]);

    /**
     * Gửi PHẦN THAY ĐỔI (diff so với lastSyncedTreeRef) lên server.
     * `undoBase`: cây trước đó để gắn nút "Hoàn tác" vào flash message
     *   (null khi chính hành động này LÀ một lần Undo — không lồng Undo
     *   của Undo, giữ đơn giản).
     */
    const commitSaveOrder = (nextTreeData, undoBase) => {
        const items = diffForReorder(lastSyncedTreeRef.current, nextTreeData);
        if (items.length === 0) {
            // Không có gì thật sự đổi (vd kéo rồi thả lại đúng chỗ cũ) —
            // khỏi tốn 1 request.
            return;
        }
        api
            .post(`/menu/${menuId}/values/reorder`, { items })
            .then(() => {
                lastSyncedTreeRef.current = nextTreeData;
                if (!undoBase) {
                    message.success(t('Successful'));
                    return;
                }
                // Flash message tự tắt (không Modal) + nút Hoàn tác — kéo-thả
                // là thao tác lặp lại nhiều lần, không đáng phải bấm "Đồng ý"
                // mỗi lần như Import/Xoá/Lưu.
                const key = `reorder-${Date.now()}`;
                notification.success({
                    key,
                    title: t('Successful'),
                    placement: 'topRight',
                    duration: 5,
                    actions: (
                        <Button
                            type="link"
                            size="small"
                            onClick={() => {
                                notification.destroy(key);
                                setTreeData(undoBase);
                                commitSaveOrder(undoBase, null);
                            }}
                        >
                            {t('Undo')}
                        </Button>
                    ),
                });
            })
            .catch((err) => {
                showError(t(err?.response?.data?.message || 'ErrorSaveAction'));
                fetchTree(); // lệch state với server → tải lại cho khớp
            });
    };

    // Gọi sau mỗi lần thả — KHÔNG bắn API ngay, gộp các lần thả liên tiếp
    // (trong REORDER_DEBOUNCE_MS) thành 1 request duy nhất.
    const scheduleSaveOrder = () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        } else {
            // Lần thả đầu của batch — chốt mốc Undo tại đây (trước khi state
            // vừa setTreeData ở onDrop kịp lan tới latestTreeRef).
            undoBaseRef.current = latestTreeRef.current;
        }
        saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            commitSaveOrder(latestTreeRef.current, undoBaseRef.current);
        }, REORDER_DEBOUNCE_MS);
    };

    const onDrop = (info) => {
        const dropKey = info.node.key;
        const dragKey = info.dragNode.key;
        const dropPos = info.node.pos.split('-');
        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

        // Clone sâu {key, raw, children} từ state gốc (KHÔNG phải bản đã
        // decorate() title JSX) — raw là data thuần, clone thẳng an toàn.
        const data = JSON.parse(JSON.stringify(treeData));

        let dragObj;
        loopTree(data, dragKey, (item, index, arr) => {
            arr.splice(index, 1);
            dragObj = item;
        });

        if (!info.dropToGap) {
            loopTree(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.unshift(dragObj);
            });
        } else if (
            (info.node.children || []).length > 0 &&
            info.node.expanded &&
            dropPosition === 1
        ) {
            loopTree(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.unshift(dragObj);
            });
        } else {
            let targetArr = [];
            let targetIndex = 0;
            loopTree(data, dropKey, (_item, index, arr) => {
                targetArr = arr;
                targetIndex = index;
            });
            if (dropPosition === -1) {
                targetArr.splice(targetIndex, 0, dragObj);
            } else {
                targetArr.splice(targetIndex + 1, 0, dragObj);
            }
        }

        setTreeData(data);
        scheduleSaveOrder();
    };

    const importCategory = () => {
        confirm(t('DoYouWantSave'))
            .then(() => {
                const inst = loading.open();
                api
                    .post(`/menu/${menuId}/values/import-category`)
                    .then((res) => {
                        // BE giờ idempotent (bỏ qua category đã có sẵn trong
                        // menu) — bấm lại không nhân đôi cây nữa, chỉ tạo
                        // thêm phần còn thiếu. Báo rõ số mục MỚI để người
                        // dùng biết import lại có tác dụng gì hay không.
                        const created = res.data?.created ?? 0;
                        success(
                            created > 0
                                ? `${t('Successful')} (+${created})`
                                : t('ImportCategoryNoNew')
                        );
                        fetchTree();
                    })
                    .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const deleteCategories = () => {
        confirm(t('DoYouWantToDelete'))
            .then(() => {
                const inst = loading.open();
                api
                    .delete(`/menu/${menuId}/values/categories`)
                    .then(() => {
                        success(t('Successful'));
                        fetchTree();
                        onCreateNew?.();
                    })
                    .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    const deleteNode = (id) => {
        confirm(t('DoYouWantToDelete'))
            .then(() => {
                const inst = loading.open();
                api
                    .delete(`/menu-value/${id}`)
                    .then(() => {
                        success(t('Successful'));
                        fetchTree();
                        if (id === selectedId) onCreateNew?.();
                    })
                    .catch((err) => showError(t(err?.response?.data?.message || 'ErrorAction')))
                    .finally(() => inst.close());
            })
            .catch(() => {});
    };

    // --- Sửa tên tại chỗ (double-click label) ------------------------------
    const startRename = (node, e) => {
        e.stopPropagation();
        setEditingKey(node.key);
        setEditingValue(node.raw?.title || '');
    };

    const cancelRename = () => {
        setEditingKey(null);
        setEditingValue('');
    };

    const commitRename = (id) => {
        if (skipBlurRef.current) {
            skipBlurRef.current = false;
            return;
        }
        const value = editingValue.trim();
        if (!value) {
            cancelRename();
            return;
        }
        if (renamingRef.current) return;
        renamingRef.current = true;
        api
            .patch(`/menu-value/${id}/rename`, { title: value })
            .then((res) => {
                const savedTitle = res.data?.title ?? value;
                setTreeData((prev) => updateNodeTitle(prev, id, savedTitle));
                message.success(t('Successful'));
            })
            .catch((err) => showError(t(err?.response?.data?.message || 'ErrorSaveAction')))
            .finally(() => {
                renamingRef.current = false;
                cancelRename();
            });
    };

    // --- Đóng/mở nhánh: persist localStorage + tìm kiếm tự expand ---------
    const onExpand = (keys) => {
        setExpandedKeys(keys);
        // Đang gõ tìm kiếm → đây là expand tạm thời để lộ kết quả, KHÔNG ghi
        // đè lên trạng thái thật người dùng đã sắp xếp trước đó.
        if (searchTerm.trim()) return;
        try {
            localStorage.setItem(expandStorageKey(menuId), JSON.stringify(keys));
        } catch {
            // localStorage đầy/bị chặn (private mode...) — bỏ qua, không vỡ UI.
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        const term = val.trim().toLowerCase();
        if (term) {
            if (preSearchExpandedRef.current === null) {
                preSearchExpandedRef.current = expandedKeys; // chốt 1 lần lúc bắt đầu gõ
            }
            const ancestorKeys = collectAncestorKeysOnMatch(treeData, term);
            setExpandedKeys(Array.from(new Set(ancestorKeys)));
        } else if (preSearchExpandedRef.current !== null) {
            setExpandedKeys(preSearchExpandedRef.current);
            preSearchExpandedRef.current = null;
        }
    };

    // Gắn title render (badge loại + icon sửa/xoá + input rename) đệ quy —
    // làm ở render thay vì lúc build để luôn đọc đúng selectedId/editingKey/
    // searchTerm mới nhất (không đóng gói lúc fetch). Icon sửa/xoá ghim sát
    // mép phải nhờ .node-title flex space-between (Tree có prop blockNode
    // nên cả dòng rộng hết khổ).
    const term = searchTerm.trim().toLowerCase();
    const decorate = (nodes) =>
        nodes.map((n) => {
            const isActive = n.key === selectedId;
            const isEditing = n.key === editingKey;
            const type = n.raw?.type;
            const label = n.raw?.title || `#${n.key}`;
            return {
                ...n,
                title: (
                    <span className={`node-title${isActive ? ' is-active' : ''}`}>
                        <span className="node-main">
                            {isEditing ? (
                                <Input
                                    size="small"
                                    autoFocus
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onPressEnter={() => commitRename(n.key)}
                                    onBlur={() => commitRename(n.key)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.stopPropagation();
                                            skipBlurRef.current = true;
                                            cancelRename();
                                        }
                                    }}
                                    className="node-rename-input"
                                />
                            ) : (
                                <span
                                    className="node-label"
                                    onDoubleClick={(e) => startRename(n, e)}
                                    title={t('DoubleClickToRename')}
                                >
                                    {highlightMatch(label, term)}
                                </span>
                            )}
                            {type && (
                                <span className={`node-badge type-${type}`}>
                                    {t(TYPE_LABELS[type] || type)}
                                </span>
                            )}
                            {n.raw?.item_exists === false && (
                                <span
                                    className="node-badge badge-broken"
                                    title={t('ItemDeletedWarning')}
                                >
                                    {t('ItemDeleted')}
                                </span>
                            )}
                        </span>
                        <span className="node-actions">
                            <i
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect?.(n.key);
                                }}
                                className="mdi mdi-pencil-box-outline"
                                title={t('Edit')}
                            />
                            <i
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNode(n.key);
                                }}
                                className="mdi mdi-close-circle-outline"
                                title={t('Delete')}
                            />
                        </span>
                    </span>
                ),
                children: n.children?.length ? decorate(n.children) : [],
            };
        });

    const isEmpty = !fetching && treeData.length === 0;

    return (
        <div className="menu-value-tree">
            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-12">
                    <div className="toolbar">
                        <button type="button" className="btn btn-primary" onClick={importCategory}>
                            <i className="mdi mdi-import" />
                            {t('ImportCategory')}
                        </button>
                        <button type="button" className="btn btn-danger" onClick={deleteCategories}>
                            <i className="mdi mdi-delete-sweep" />
                            {t('DeleteCategory')}
                        </button>
                        <span className="spacer" />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => onCreateNew?.()}
                        >
                            <i className="mdi mdi-plus-circle-outline" />
                            {t('CreateMenuValue')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="row mt-3 pt-3 border-top">
                <div className="col-xl-12">
                    <h4 className="header-title">{t('TreeMenuValue')}</h4>
                </div>
                <div className="col-xl-12">
                    <Input.Search
                        className="tree-search-input"
                        placeholder={t('Keyword')}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        allowClear
                    />
                </div>
                <div className="col-xl-12">
                    <div className="tree-panel">
                        {fetching ? (
                            <div className="p-3 text-center">
                                <Spin />
                            </div>
                        ) : isEmpty ? (
                            <div className="tree-empty">
                                <i className="mdi mdi-file-tree" />
                                <span>{t('NoData')}</span>
                            </div>
                        ) : (
                            <Tree
                                treeData={decorate(treeData)}
                                expandedKeys={expandedKeys}
                                onExpand={onExpand}
                                filterTreeNode={(node) =>
                                    !!term && String(node.raw?.title || '').toLowerCase().includes(term)
                                }
                                draggable
                                blockNode
                                onDrop={onDrop}
                                onSelect={(keys) => keys[0] != null && onSelect?.(keys[0])}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
