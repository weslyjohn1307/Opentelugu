# OpenTelugu — System Architecture & Design Specification

This document provides a comprehensive technical overview of OpenTelugu's subsystem boundaries, data flow pipelines, memory model, and operating system interfaces.

---

## 1. High-Level Architecture Overview

OpenTelugu is built as an offline-first desktop application combining a high-performance **Rust native backend** with a lightweight **Tauri v2 web view controller**.

```text
 ╭──────────────────────────────────────────────────────────────────────╮
 │                       DESKTOP APPLICATION WINDOW                     │
 │  ╭────────────────────────────────────────────────────────────────╮  │
 │  │                     TAURI WEBVIEW FRONTEND                     │  │
 │  │   [Editorial Design System • Dual Themes • Font Previews]     │  │
 │  │   [Converter Workbench]   [OCR Studio]   [Keyboard Sandbox]    │  │
 │  │   [Global Ctrl+K Palette] [Keystroke Layout Directory]         │  │
 │  ╰────────────────────────────────────────────────────────────────╯  │
 ╰──────────────────────────────────┬───────────────────────────────────╯
                                    │ Tauri IPC (JSON Commands)
                                    ▼
 ╭──────────────────────────────────────────────────────────────────────╮
 │                       NATIVE RUST CORE ENGINE                        │
 │                                                                      │
 │  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────┐  │
 │  │   Ligature Engine     │  │   WH_KEYBOARD_LL      │  │ Tesseract│  │
 │  │ (src/converter.rs)    │  │ (src/keyboard_hook.rs)│  │ 5.3 LSTM │  │
 │  │ - 631 Ligature Rules  │  │ - Low-level Win32 Hook│  │ (Offline)│  │
 │  │ - Vowel Reordering    │  │ - 4 DTP Layouts       │  │ (src/    │  │
 │  │ - Subscript Vatthulu  │  │ - Recursion Guard     │  │  ocr.rs) │  │
 │  └───────────┬───────────┘  └───────────┬───────────┘  └────┬─────┘  │
 │              │                          │                   │        │
 │              ▼                          ▼                   ▼        │
 │  ┌────────────────────────────────────────────────────────────────┐  │
 │  │             WIN32 OPERATING SYSTEM INTERFACES                  │  │
 │  │  • CF_TEXT (8-Bit ANSI for InDesign / PageMaker)               │  │
 │  │  • CF_UNICODETEXT (UTF-16 for Modern Word Processors)          │  │
 │  │  • SendInput Event Injection with dwExtraInfo Tag              │  │
 │  └────────────────────────────────────────────────────────────────┘  │
 ╰──────────────────────────────────────────────────────────────────────╯
```

---

## 2. Core Subsystems

### 2.1 The Ligature Conversion Pipeline (`src/converter.rs`)
- **Deterministic Tokenization:** Deconstructs Telugu Unicode clusters into base consonants (*hallu*), vowel signs (*gunintham*), and virama-consonant conjuncts (*vatthu*).
- **Phonetic & Positional Reordering:**
  - *ra-vatthu* (`ro`) reordering: Repositions post-base r-sound glyphs to adhere to classic typography rules.
  - Vowel sign shift (`oo`): Shifts dependent vowel signs preceding or following consonants.
  - Multi-ligature substitutions: Matches complex tri-consonant clusters (e.g., `క్ష్మ`, `స్త్ర`, `ర్త్య`).
- **Dual-Output Emission:** Emits both 16-bit Private Use Area (PUA) codes for internal font preview and 8-bit ANSI byte sequences (`Windows-1252`) for legacy publishing suites.

### 2.2 System-Wide Keyboard Hook (`src/keyboard_hook.rs`)
- **Hook Technique:** Installs a Windows `WH_KEYBOARD_LL` hook using `SetWindowsHookExW`.
- **Recursion Guard:** When OpenTelugu intercepts a key event, it injects synthetic character keystrokes using Win32 `SendInput`. To avoid recursive interception loops, all synthetic events are stamped with:
  ```rust
  const RECURSION_GUARD: usize = 0x12345678;
  ```
  The hook procedure immediately ignores any key event carrying this signature.
- **Layout State Machine:**
  - **Roma:** Phonetic transliteration buffer.
  - **Apple:** Classic mechanical keyboard layout.
  - **Modular:** Standard Telugu DTP layout.
  - **DOE (InScript):** National standard Indian script layout.

### 2.3 Offline OCR Subsystem (`src/ocr.rs`)
- **Embedded Engine:** Incorporates a standalone portable Tesseract 5.3 binary distribution.
- **Neural Models:** Pairs the engine with the official LSTM `tel.traineddata` (Telugu) and `eng.traineddata` (Numerals and Latin punctuation).
- **Execution Lifecycle:**
  1. Image buffer received via Base64 IPC.
  2. Written to a secure, temporary file in `%TEMP%`.
  3. Tesseract executes locally via child process with stdout redirection.
  4. Temporary file securely unlinked; extracted Unicode text returned to UI.
- **Network Egress:** Exactly 0 bytes. All inference runs locally on the host CPU.

---

## 3. Data Integrity & Concurrency

- **Memory Safety:** Implemented in 100% safe Rust with zero `unsafe` blocks outside necessary Win32 FFI bindings.
- **Thread Isolation:** Background keyboard interception runs on a dedicated Windows message pump thread (`GetMessageW`), preventing UI freezes during high-speed typing.
- **Zero Disk Persistence:** Converted documents and clipboard payloads exist purely in volatile memory (RAM) and are never written to permanent storage.
