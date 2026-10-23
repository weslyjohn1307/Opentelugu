// OpenTelugu - Native Rust Application Core
// High-performance Telugu Unicode to Script (Legacy Telugu Font) Converter
// 100% Offline with Native WH_KEYBOARD_LL Global Hook & Tesseract 5 Telugu OCR

pub mod converter;
pub mod keystroke_table;
pub mod keyboard_hook;
pub mod ocr;

use tauri::Manager;

#[tauri::command]
fn convert_telugu(text: String) -> Result<converter::ConversionResult, String> {
    Ok(converter::convert(&text))
}

#[tauri::command]
fn win_minimize(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn win_toggle_maximize(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            window.unmaximize().map_err(|e| e.to_string())?;
        } else {
            window.maximize().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn win_close(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("Shutting down OpenTelugu cleanly...");
    let _ = keyboard_hook::stop_hook();
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn is_keyboard_hooked() -> Result<bool, String> {
    Ok(keyboard_hook::is_hook_active())
}

#[tauri::command]
fn start_keyboard_hook(layout: Option<String>) -> Result<bool, String> {
    let l = match layout.as_deref().unwrap_or("roma").to_lowercase().as_str() {
        "apple" => keyboard_hook::KeyboardLayout::Apple,
        "modular" => keyboard_hook::KeyboardLayout::Modular,
        "doe" | "inscript" => keyboard_hook::KeyboardLayout::Doe,
        _ => keyboard_hook::KeyboardLayout::Roma,
    };
    keyboard_hook::start_hook(l)
}

#[tauri::command]
fn stop_keyboard_hook() -> Result<bool, String> {
    keyboard_hook::stop_hook()
}

#[tauri::command]
fn toggle_keyboard(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri::Emitter;
    let res = keyboard_hook::toggle_hook()?;
    let _ = app.emit("is-keyboard-hooked", res);
    Ok(res)
}

#[tauri::command]
fn set_keyboard_layout(layout: String) -> Result<bool, String> {
    let l = match layout.to_lowercase().as_str() {
        "apple" => keyboard_hook::KeyboardLayout::Apple,
        "modular" => keyboard_hook::KeyboardLayout::Modular,
        "doe" | "inscript" => keyboard_hook::KeyboardLayout::Doe,
        _ => keyboard_hook::KeyboardLayout::Roma,
    };
    keyboard_hook::set_layout(l);
    Ok(true)
}

#[tauri::command]
fn get_keyboard_layout() -> Result<String, String> {
    let l = match keyboard_hook::get_current_layout() {
        keyboard_hook::KeyboardLayout::Roma => "roma",
        keyboard_hook::KeyboardLayout::Apple => "apple",
        keyboard_hook::KeyboardLayout::Modular => "modular",
        keyboard_hook::KeyboardLayout::Doe => "doe",
    };
    Ok(l.into())
}

#[derive(serde::Serialize)]
pub struct RuleInfo {
    pub id: u32,
    pub unicode_char: &'static str,
    pub non_unicode_char: &'static str,
    pub vothu_non_unicode_char: Option<&'static str>,
    pub is_hallu: bool,
    pub roma_keystroke: &'static str,
    pub apple_keystroke: &'static str,
    pub modular_keystroke: &'static str,
    pub doe_keystroke: &'static str,
}

#[tauri::command]
fn get_all_keystroke_rules() -> Result<Vec<RuleInfo>, String> {
    let rules = keystroke_table::KEYSTROKE_RULES
        .iter()
        .map(|r| RuleInfo {
            id: r.id,
            unicode_char: r.unicode_char,
            non_unicode_char: r.non_unicode_char,
            vothu_non_unicode_char: r.vothu_non_unicode_char,
            is_hallu: r.is_hallu,
            roma_keystroke: r.roma_keystroke,
            apple_keystroke: r.apple_keystroke,
            modular_keystroke: r.modular_keystroke,
            doe_keystroke: r.doe_keystroke,
        })
        .collect();
    Ok(rules)
}

#[tauri::command]
fn perform_ocr(image_base64: String) -> Result<String, String> {
    let b64_clean = if let Some(idx) = image_base64.find(',') {
        &image_base64[idx + 1..]
    } else {
        &image_base64
    };

    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_clean.trim())
        .map_err(|e| format!("Invalid base64 image data: {}", e))?;

    ocr::recognize_image_bytes(&bytes)
}

#[tauri::command]
fn perform_ocr_file(file_path: String) -> Result<String, String> {
    ocr::recognize_image_file(&file_path)
}

#[tauri::command]
fn copy_to_clipboard_advanced(
    text: String,
    unicode_text: Option<String>,
    #[allow(non_snake_case)]
    unicodeText: Option<String>,
) -> Result<(), String> {
    let u_text = unicode_text.or(unicodeText).unwrap_or_default();

    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::System::DataExchange::{
            CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
        };
        use windows_sys::Win32::System::Memory::{
            GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE,
        };

        if OpenClipboard(std::ptr::null_mut()) != 0 {
            EmptyClipboard();

            // 1. Set CF_TEXT (format 1) for 8-bit ANSI / Windows-1252 (Script fonts in InDesign)
            let ansi_bytes = text.as_bytes();
            let h_ansi = GlobalAlloc(GMEM_MOVEABLE, ansi_bytes.len() + 1);
            if !h_ansi.is_null() {
                let p_ansi = GlobalLock(h_ansi) as *mut u8;
                if !p_ansi.is_null() {
                    std::ptr::copy_nonoverlapping(ansi_bytes.as_ptr(), p_ansi, ansi_bytes.len());
                    *p_ansi.add(ansi_bytes.len()) = 0;
                    GlobalUnlock(h_ansi);
                    SetClipboardData(1, h_ansi); // CF_TEXT
                }
            }

            // 2. Set CF_UNICODETEXT (format 13) for Unicode Telugu (MS Word, Browsers)
            if !u_text.is_empty() {
                let wide: Vec<u16> = u_text.encode_utf16().chain(std::iter::once(0)).collect();
                let h_uni = GlobalAlloc(GMEM_MOVEABLE, wide.len() * 2);
                if !h_uni.is_null() {
                    let p_uni = GlobalLock(h_uni) as *mut u16;
                    if !p_uni.is_null() {
                        std::ptr::copy_nonoverlapping(wide.as_ptr(), p_uni, wide.len());
                        GlobalUnlock(h_uni);
                        SetClipboardData(13, h_uni); // CF_UNICODETEXT
                    }
                }
            }

            CloseClipboard();
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            log::info!("OpenTelugu main window initialized and shown.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_keyboard_hooked,
            start_keyboard_hook,
            stop_keyboard_hook,
            toggle_keyboard,
            set_keyboard_layout,
            get_keyboard_layout,
            get_all_keystroke_rules,
            perform_ocr,
            perform_ocr_file,
            copy_to_clipboard_advanced,
            win_minimize,
            win_toggle_maximize,
            win_close,
            convert_telugu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
