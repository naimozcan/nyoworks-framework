// ═══════════════════════════════════════════════════════════════════════════════
// Window Hook
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useWindow() {
    const [state, setState] = useState({
        isMaximized: false,
        isFocused: true,
    });
    useEffect(() => {
        const appWindow = getCurrentWindow();
        const checkState = async () => {
            const isMaximized = await appWindow.isMaximized();
            const isFocused = await appWindow.isFocused();
            setState({ isMaximized, isFocused });
        };
        checkState();
        const unlistenResize = appWindow.onResized(() => checkState());
        const unlistenFocus = appWindow.onFocusChanged(({ payload }) => {
            setState((prev) => ({ ...prev, isFocused: payload }));
        });
        return () => {
            unlistenResize.then((fn) => fn());
            unlistenFocus.then((fn) => fn());
        };
    }, []);
    return state;
}
