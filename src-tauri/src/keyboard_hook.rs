// OpenTelugu - Native System-Wide Keyboard Hook Module (WH_KEYBOARD_LL)
// Intercepts keystrokes globally across Windows and injects legacy Old Script characters
// into external desktop applications (Adobe InDesign, Photoshop, Word, PageMaker)

use std::sync::atomic::{AtomicBool, AtomicIsize, AtomicU32, AtomicU8, Ordering};
use std::sync::Mutex;
use crate::keystroke_table::{KeystrokeRule, KEYSTROKE_RULES};

pub const OPENTELUGU_EXTRA_INFO: usize = 0x12345678;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum KeyboardLayout {
    Roma = 0,
    Apple = 1,
    Modular = 2,
    Doe = 3,
}

impl From<u8> for KeyboardLayout {
    fn from(val: u8) -> Self {
        match val {
            1 => KeyboardLayout::Apple,
            2 => KeyboardLayout::Modular,
            3 => KeyboardLayout::Doe,
            _ => KeyboardLayout::Roma,
        }
    }
}

static HOOK_ACTIVE: AtomicBool = AtomicBool::new(false);
static CURRENT_LAYOUT: AtomicU8 = AtomicU8::new(0);
static HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);
static HHOOK_HANDLE: AtomicIsize = AtomicIsize::new(0);

// Typing state tracking
struct TypingState {
    buffer: String,
    last_emitted_len: usize,
    prev_was_hallu: bool,
    hotkey_vk: u32, // Default F12
}

static STATE: Mutex<TypingState> = Mutex::new(TypingState {
    buffer: String::new(),
    last_emitted_len: 0,
    prev_was_hallu: false,
    hotkey_vk: 0x7B, // VK_F12
});

pub fn is_hook_active() -> bool {
    HOOK_ACTIVE.load(Ordering::SeqCst)
}

pub fn get_current_layout() -> KeyboardLayout {
    KeyboardLayout::from(CURRENT_LAYOUT.load(Ordering::SeqCst))
}

pub fn set_layout(layout: KeyboardLayout) {
    CURRENT_LAYOUT.store(layout as u8, Ordering::SeqCst);
    if let Ok(mut state) = STATE.lock() {
        state.buffer.clear();
        state.last_emitted_len = 0;
        state.prev_was_hallu = false;
    }
}

pub fn set_hotkey(vk: u32) {
    if let Ok(mut state) = STATE.lock() {
        state.hotkey_vk = vk;
    }
}

pub fn start_hook(layout: KeyboardLayout) -> Result<bool, String> {
    if HOOK_ACTIVE.load(Ordering::SeqCst) {
        set_layout(layout);
        return Ok(true);
    }

    set_layout(layout);
    HOOK_ACTIVE.store(true, Ordering::SeqCst);

    #[cfg(target_os = "windows")]
    {
        std::thread::spawn(move || {
            unsafe { run_hook_message_loop(); }
        });
    }

    Ok(true)
}

pub fn stop_hook() -> Result<bool, String> {
    HOOK_ACTIVE.store(false, Ordering::SeqCst);

    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::{PostThreadMessageW, WM_QUIT};
        let tid = HOOK_THREAD_ID.load(Ordering::SeqCst);
        if tid != 0 {
            PostThreadMessageW(tid, WM_QUIT, 0, 0);
        }
    }

    if let Ok(mut state) = STATE.lock() {
        state.buffer.clear();
        state.last_emitted_len = 0;
        state.prev_was_hallu = false;
    }

    Ok(false)
}

pub fn toggle_hook() -> Result<bool, String> {
    if is_hook_active() {
        stop_hook()?;
        Ok(false)
    } else {
        start_hook(get_current_layout())?;
        Ok(true)
    }
}

// Find rule matching the keystroke string in current layout
fn lookup_keystroke(key_str: &str, layout: KeyboardLayout) -> Option<&'static KeystrokeRule> {
    for rule in KEYSTROKE_RULES {
        let pattern = match layout {
            KeyboardLayout::Roma => rule.roma_keystroke,
            KeyboardLayout::Apple => rule.apple_keystroke,
            KeyboardLayout::Modular => rule.modular_keystroke,
            KeyboardLayout::Doe => rule.doe_keystroke,
        };
        if pattern == key_str {
            return Some(rule);
        }
    }
    None
}

// Check if any rule starts with this prefix in current layout
fn has_prefix_match(prefix: &str, layout: KeyboardLayout) -> bool {
    for rule in KEYSTROKE_RULES {
        let pattern = match layout {
            KeyboardLayout::Roma => rule.roma_keystroke,
            KeyboardLayout::Apple => rule.apple_keystroke,
            KeyboardLayout::Modular => rule.modular_keystroke,
            KeyboardLayout::Doe => rule.doe_keystroke,
        };
        if pattern.starts_with(prefix) && pattern != prefix {
            return true;
        }
    }
    false
}

#[cfg(target_os = "windows")]
unsafe fn run_hook_message_loop() {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::System::Threading::GetCurrentThreadId;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage, UnhookWindowsHookEx,
        MSG, WH_KEYBOARD_LL, HHOOK,
    };

    unsafe {
        let tid = GetCurrentThreadId();
        HOOK_THREAD_ID.store(tid, Ordering::SeqCst);

        let hook_handle: HHOOK = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(low_level_keyboard_proc),
            std::ptr::null_mut(),
            0,
        );

        if hook_handle.is_null() {
            log::error!("Failed to install global keyboard hook via SetWindowsHookExW");
            HOOK_ACTIVE.store(false, Ordering::SeqCst);
            return;
        }

        HHOOK_HANDLE.store(hook_handle as isize, Ordering::SeqCst);
        log::info!("Global WH_KEYBOARD_LL Hook installed successfully! Thread ID: {}", tid);

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, 0 as HWND, 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        let h = HHOOK_HANDLE.swap(0, Ordering::SeqCst) as HHOOK;
        if !h.is_null() {
            UnhookWindowsHookEx(h);
            log::info!("Keyboard hook removed successfully.");
        }
        HOOK_THREAD_ID.store(0, Ordering::SeqCst);
        HOOK_ACTIVE.store(false, Ordering::SeqCst);
    }
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn low_level_keyboard_proc(
    n_code: i32,
    w_param: windows_sys::Win32::Foundation::WPARAM,
    l_param: windows_sys::Win32::Foundation::LPARAM,
) -> windows_sys::Win32::Foundation::LRESULT {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_MENU, VK_SHIFT, VK_BACK,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, KBDLLHOOKSTRUCT, WM_KEYDOWN, WM_SYSKEYDOWN,
    };

    let hhook = HHOOK_HANDLE.load(Ordering::SeqCst) as windows_sys::Win32::UI::WindowsAndMessaging::HHOOK;

    if n_code < 0 {
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    let kbd = unsafe { *(l_param as *const KBDLLHOOKSTRUCT) };

    // 1. RECURSION GUARD: Ignore self-injected inputs
    if kbd.dwExtraInfo == OPENTELUGU_EXTRA_INFO {
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    // Only process keydown
    if w_param as u32 != WM_KEYDOWN && w_param as u32 != WM_SYSKEYDOWN {
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    let vk = kbd.vkCode;

    // Check hotkey toggle (e.g. F12 = 0x7B)
    let hotkey = {
        STATE.lock().map(|s| s.hotkey_vk).unwrap_or(0x7B)
    };
    if vk == hotkey {
        let next_state = !HOOK_ACTIVE.load(Ordering::SeqCst);
        HOOK_ACTIVE.store(next_state, Ordering::SeqCst);
        log::info!("Keyboard hook hotkey pressed. New state: {}", next_state);
        if let Ok(mut state) = STATE.lock() {
            state.buffer.clear();
            state.last_emitted_len = 0;
            state.prev_was_hallu = false;
        }
        return 1; // Suppress hotkey
    }

    // If hook is disabled, pass through
    if !HOOK_ACTIVE.load(Ordering::SeqCst) {
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    // If Ctrl or Alt is pressed, pass through and reset buffer
    let ctrl_down = (unsafe { GetAsyncKeyState(VK_CONTROL as i32) } as u16 & 0x8000) != 0;
    let alt_down = (unsafe { GetAsyncKeyState(VK_MENU as i32) } as u16 & 0x8000) != 0;
    if ctrl_down || alt_down {
        if let Ok(mut state) = STATE.lock() {
            state.buffer.clear();
            state.last_emitted_len = 0;
            state.prev_was_hallu = false;
        }
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    // Check special keys
    if vk == VK_BACK as u32 {
        if let Ok(mut state) = STATE.lock() {
            if !state.buffer.is_empty() {
                state.buffer.pop();
            }
            state.last_emitted_len = 0;
            state.prev_was_hallu = false;
        }
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    // Boundary keys reset buffer and pass through
    if vk == 0x20 || vk == 0x0D || vk == 0x09 || vk == 0x1B { // Space, Enter, Tab, Esc
        if let Ok(mut state) = STATE.lock() {
            state.buffer.clear();
            state.last_emitted_len = 0;
            state.prev_was_hallu = false;
        }
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    // Check shift state
    let shift_down = (unsafe { GetAsyncKeyState(VK_SHIFT as i32) } as u16 & 0x8000) != 0;

    // Convert VK to character representation matching keystroke table
    let key_char = vk_to_char(vk, shift_down);
    if key_char.is_empty() {
        return unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) };
    }

    let layout = get_current_layout();

    if let Ok(mut state) = STATE.lock() {
        // Try appending key to buffer
        let mut test_buf = state.buffer.clone();
        test_buf.push_str(&key_char);

        // 1. Direct match with test_buf
        if let Some(rule) = lookup_keystroke(&test_buf, layout) {
            // Found full match!
            // Backspace previous output
            if state.last_emitted_len > 0 {
                unsafe { send_backspaces(state.last_emitted_len); }
            }

            // Emit the Anu font characters
            let wide_chars: Vec<u16> = rule.non_unicode_char.encode_utf16().collect();
            unsafe { send_unicode_chars(&wide_chars); }

            state.last_emitted_len = wide_chars.len();
            state.prev_was_hallu = rule.is_hallu;
            state.buffer = test_buf;

            // If no longer prefix to a longer sequence, flush buffer keeping consonant state
            if !has_prefix_match(&state.buffer, layout) {
                state.buffer.clear();
                state.last_emitted_len = 0;
            }

            return 1; // Suppress the physical key!
        }

        // 2. Single key direct match (resetting buffer)
        if let Some(rule) = lookup_keystroke(&key_char, layout) {
            // Check if previous was hallu and this is hallu -> can it form a vothu?
            if state.prev_was_hallu && rule.is_hallu && rule.vothu_non_unicode_char.is_some() {
                let vothu_str = rule.vothu_non_unicode_char.unwrap();
                let wide_vothu: Vec<u16> = vothu_str.encode_utf16().collect();
                unsafe { send_unicode_chars(&wide_vothu); }

                state.last_emitted_len = wide_vothu.len();
                state.prev_was_hallu = false;
                state.buffer.clear();
                return 1;
            }

            // Standard fresh character emission
            let wide_chars: Vec<u16> = rule.non_unicode_char.encode_utf16().collect();
            unsafe { send_unicode_chars(&wide_chars); }

            state.last_emitted_len = wide_chars.len();
            state.prev_was_hallu = rule.is_hallu;
            state.buffer = key_char;

            return 1;
        }

        // If no match found, clear state and let key through
        state.buffer.clear();
        state.last_emitted_len = 0;
        state.prev_was_hallu = false;
    }

    unsafe { CallNextHookEx(hhook, n_code, w_param, l_param) }
}

fn vk_to_char(vk: u32, shift: bool) -> String {
    let base = match vk {
        0x41..=0x5A => {
            let c = ((vk - 0x41) as u8 + b'a') as char;
            if shift {
                format!("+{}", c)
            } else {
                c.to_string()
            }
        }
        0x30..=0x39 => {
            let c = ((vk - 0x30) as u8 + b'0') as char;
            if shift {
                match c {
                    '1' => "+1".into(),
                    '2' => "+2".into(),
                    '3' => "+3".into(),
                    '4' => "+4".into(),
                    '5' => "+5".into(),
                    '6' => "+6".into(),
                    '7' => "+7".into(),
                    '8' => "+8".into(),
                    '9' => "+9".into(),
                    '0' => "+0".into(),
                    _ => c.to_string(),
                }
            } else {
                c.to_string()
            }
        }
        0xBA => if shift { "+;".into() } else { ";".into() }, // OEM_1 (;:)
        0xBB => if shift { "+=".into() } else { "=".into() }, // OEM_PLUS (=+)
        0xBC => if shift { "+,".into() } else { ",".into() }, // OEM_COMMA (,<)
        0xBD => if shift { "+-".into() } else { "-".into() }, // OEM_MINUS (-_)
        0xBE => if shift { "+.".into() } else { ".".into() }, // OEM_PERIOD (.>)
        0xBF => if shift { "+/".into() } else { "/".into() }, // OEM_2 (/?)
        0xC0 => if shift { "+`".into() } else { "`".into() }, // OEM_3 (`~)
        0xDB => if shift { "+[".into() } else { "[".into() }, // OEM_4 ([{)
        0xDC => if shift { "+\\".into() } else { "\\".into() }, // OEM_5 (\|)
        0xDD => if shift { "+]".into() } else { "]".into() }, // OEM_6 (]})
        0xDE => if shift { "d_quote".into() } else { "s_quote".into() }, // OEM_7 ('")
        _ => String::new(),
    };
    base
}

#[cfg(target_os = "windows")]
pub unsafe fn send_backspaces(count: usize) {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_BACK,
    };

    if count == 0 {
        return;
    }

    let mut inputs: Vec<INPUT> = Vec::with_capacity(count * 2);
    for _ in 0..count {
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_BACK,
                    wScan: 0,
                    dwFlags: 0,
                    time: 0,
                    dwExtraInfo: OPENTELUGU_EXTRA_INFO,
                },
            },
        });
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_BACK,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: OPENTELUGU_EXTRA_INFO,
                },
            },
        });
    }

    unsafe {
        SendInput(
            inputs.len() as u32,
            inputs.as_ptr(),
            std::mem::size_of::<INPUT>() as i32,
        );
    }
}

#[cfg(target_os = "windows")]
pub unsafe fn send_unicode_chars(chars: &[u16]) {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE,
    };

    if chars.is_empty() {
        return;
    }

    let mut inputs: Vec<INPUT> = Vec::with_capacity(chars.len() * 2);
    for &ch in chars {
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: 0,
                    wScan: ch,
                    dwFlags: KEYEVENTF_UNICODE,
                    time: 0,
                    dwExtraInfo: OPENTELUGU_EXTRA_INFO,
                },
            },
        });
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: 0,
                    wScan: ch,
                    dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: OPENTELUGU_EXTRA_INFO,
                },
            },
        });
    }

    unsafe {
        SendInput(
            inputs.len() as u32,
            inputs.as_ptr(),
            std::mem::size_of::<INPUT>() as i32,
        );
    }
}

#[cfg(not(target_os = "windows"))]
pub unsafe fn send_backspaces(_count: usize) {}

#[cfg(not(target_os = "windows"))]
pub unsafe fn send_unicode_chars(_chars: &[u16]) {}
