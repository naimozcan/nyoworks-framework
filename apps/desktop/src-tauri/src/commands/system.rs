// ═══════════════════════════════════════════════════════════════════════════════
// System Commands
// ═══════════════════════════════════════════════════════════════════════════════

use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    name: String,
    version: String,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "NYOWORKS".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}
