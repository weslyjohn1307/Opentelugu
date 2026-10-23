# Changelog

All notable changes to **OpenTelugu** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-23

### Added
- **Core Conversion Engine**:
  - Full bidirectional Telugu Unicode to legacy script font conversion matching authentic DTP ligatures.
  - Vowel sign reordering (`oo`), *ra-vatthu* reordering (`ro`), and tri-consonant conjunct handling.
  - Sub-millisecond pure Rust conversion pipeline.
- **System-Wide Keyboard Hook (`WH_KEYBOARD_LL`)**:
  - Native Windows global low-level keyboard hook supporting direct typing in InDesign, Photoshop, and PageMaker.
  - Four authentic DTP keyboard layouts: Roma (Phonetic), Apple Telugu, Modular, and DOE (InScript).
  - Global <kbd>F12</kbd> toggle hotkey.
  - Recursion guard with `dwExtraInfo = 0x12345678`.
- **100% Offline OCR (Image to Text)**:
  - Bundled standalone Tesseract 5 LSTM neural network engine.
  - Offline `tel.traineddata` (Telugu) and `eng.traineddata` (English numerals).
  - Drag-and-drop and clipboard screenshot paste (<kbd>Ctrl+V</kbd>).
- **Dual-Clipboard Injection**:
  - Simultaneous `CF_TEXT` (8-bit ANSI for legacy DTP software) and `CF_UNICODETEXT` (UTF-16 for modern editors).
- **Modern User Interface**:
  - Clean editorial design system featuring dual light/dark themes and subtle paper textures.
  - Default Light Mode and high-contrast Dark Mode with persistent theme switching.
  - Full keyboard accessibility and global Command Palette (<kbd>Ctrl+K</kbd>).
  - 567-rule searchable Keystroke Directory with one-click insertion.
  - Global error boundaries and graceful notification toast system.
- **Packaging & Distribution**:
  - Standalone portable executable (`OpenTelugu.exe`).
  - Professional Windows NSIS Installer (`OpenTelugu_1.0.0_x64-setup.exe`).

