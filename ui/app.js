// OpenTelugu - Professional Desktop Controller
// 100% Offline Native Rust Telugu Unicode to Script Engine
// Refined UX Architecture, Light (Default) & Dark Mode, Phosphor SVG Icons

// ─── 0. GLOBAL ERROR BOUNDARY (Checklist Item 88) ─────────────────────────
window.addEventListener('error', event => {
  console.error('[OpenTelugu Runtime Error]:', event.error || event.message);
  if (typeof showToast === 'function') {
    showToast('Application Error', event.message || 'An unexpected error occurred.', 'error');
  }
});

window.addEventListener('unhandledrejection', event => {
  console.error('[OpenTelugu Unhandled Promise]:', event.reason);
  if (typeof showToast === 'function') {
    const msg = typeof event.reason === 'string' ? event.reason : (event.reason?.message || 'Operation failed');
    showToast('Action Failed', msg, 'error');
  }
});

// ─── 1. TAURI IPC HELPER WITH FULL CLIENT-SIDE FALLBACK ───────────────────
const invoke = async (cmd, args = {}) => {
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke(cmd, args);
  if (window.__TAURI__?.invoke) return window.__TAURI__.invoke(cmd, args);

  // Fallback to client-side JS engine if running in browser
  if (cmd === 'convert_telugu') {
    const raw = args.text || '';
    if (typeof window.os === 'function' && typeof window.cs === 'function') {
      const pua = window.os(raw);
      const ansi = window.cs(pua);
      return { pua_text: pua, ansi_text: ansi, original: raw };
    }
    return { pua_text: raw, ansi_text: raw, original: raw };
  }
  if (cmd === 'is_keyboard_hooked') return false;
  if (cmd === 'toggle_keyboard') return true;
  if (cmd === 'get_all_keystroke_rules') {
    try {
      const res = await fetch('./mappings.json');
      if (res.ok) {
        const data = await res.json();
        return data.map(d => ({
          unicode_char: d.unicode_char,
          eng_keystroke: d.roma_keystroke || d.apple_keystroke || '',
          script_glyph: d.non_unicode_char,
          rule_type: d.is_hallu === 1 ? 'Consonant' : (d.vothu_non_unicode_char && d.vothu_non_unicode_char !== 'null' ? 'Votthu' : 'Gunintham')
        }));
      }
    } catch {}
    return null;
  }
  return null;
};

// ─── 2. DOM ELEMENT REFS ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
  // Titlebar & Window
  btnMinimize:    $('btn-minimize'),
  btnMaximize:    $('btn-maximize'),
  btnClose:       $('btn-close'),
  sectionIndicator:$('tb-section-indicator'),
  btnCmdTrigger:  $('btn-cmd-palette-trigger'),
  btnThemeToggle: $('btn-theme-toggle'),
  themeIcon:      $('theme-icon'),

  // Navigation
  navItems:       document.querySelectorAll('.nav-item[data-page]'),
  pages:          document.querySelectorAll('.page'),

  // Statusbar & Toast
  statusbar:      $('statusbar'),
  statusText:     $('status-text'),
  toastContainer: $('toast-container'),

  // Converter Workbench
  inputText:      $('input-text'),
  outputText:     $('output-text'),
  btnConvert:     $('btn-convert'),
  btnClear:       $('btn-clear'),
  btnSample:      $('btn-sample'),
  btnPasteInput:  $('btn-paste-input'),
  btnCopyOutput:  $('btn-copy-output'),
  copyIcon:       $('copy-icon'),
  copyBtnText:    $('copy-btn-text'),
  liveToggle:     $('live-convert-toggle'),
  livePulseDot:   $('live-pulse-dot'),
  inputCount:     $('input-count'),
  outputCount:    $('output-count'),
  inputEmptyState:$('input-empty-state'),
  outputEmptyState:$('output-empty-state'),
  emptyChipSample:$('empty-chip-sample'),
  emptyChipPaste: $('empty-chip-paste'),

  // Font size stepper
  btnFontDec:     $('btn-font-dec'),
  btnFontInc:     $('btn-font-inc'),
  fontSizeDisplay:$('font-size-display'),

  // OCR Workbench
  ocrDropzone:    $('ocr-dropzone'),
  ocrFileInput:   $('ocr-file-input'),
  ocrPreviewWrap: $('ocr-preview-wrap'),
  ocrPreviewImg:  $('ocr-preview-img'),
  ocrDismiss:     $('ocr-dismiss'),
  ocrBtnExtract:  $('ocr-btn-extract'),
  ocrExtracted:   $('ocr-extracted'),
  ocrBtnSend:     $('ocr-btn-send'),
  ocrCount:       $('ocr-count'),

  // Keyboard Hook
  kbToggleBtn:    $('keyboard-toggle-btn'),
  hookIndicator:  $('hook-indicator'),
  hookStatusText: $('hook-status-text'),
  layoutSelect:   $('layout-select'),
  keymapSearch:   $('keymap-search'),
  keymapTbody:    $('keymap-tbody'),
  catBtns:        document.querySelectorAll('.cat-btn[data-cat]'),

  // Command Palette
  cmdBackdrop:    $('cmd-palette-backdrop'),
  cmdInput:       $('cmd-input'),
  cmdList:        $('cmd-list'),
};

// ─── 3. THEME CONTROLLER (LIGHT MODE AS DEFAULT) ───────────────────────────
function initTheme() {
  const saved = localStorage.getItem('opentelugu-theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('opentelugu-theme', theme);

  if (el.themeIcon) {
    if (isDark) {
      // Sun icon when in dark mode (click to switch to light)
      el.themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
      `;
      el.btnThemeToggle?.setAttribute('title', 'Switch to Light Mode');
    } else {
      // Moon icon when in light mode (click to switch to dark)
      el.themeIcon.innerHTML = `
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      `;
      el.btnThemeToggle?.setAttribute('title', 'Switch to Dark Mode');
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  showToast('Theme Changed', `Switched to ${next.toUpperCase()} mode`, 'info');
}

if (el.btnThemeToggle) {
  el.btnThemeToggle.addEventListener('click', toggleTheme);
}

// ─── 4. TOAST NOTIFICATION SYSTEM (Shadcn Sonner style) ────────────────────
function showToast(title, description = '', type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else {
    iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  const descHtml = description ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${description}</div>` : '';
  toast.innerHTML = `
    <div style="flex-shrink:0;margin-top:1px">${iconSvg}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:12px">${title}</div>
      ${descHtml}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// ─── 5. STATUSBAR HELPER ───────────────────────────────────────────────────
let statusTimer = null;
function setStatus(msg, isError = false, duration = 4000) {
  if (!el.statusText) return;
  el.statusText.textContent = msg;
  if (el.statusbar) {
    el.statusbar.classList.toggle('status-error', isError);
  }
  if (statusTimer) clearTimeout(statusTimer);
  if (duration > 0) {
    statusTimer = setTimeout(() => {
      el.statusText.textContent = 'Ready';
      el.statusbar?.classList.remove('status-error');
    }, duration);
  }
}

// ─── 6. ANSI CONVERSION HELPER ─────────────────────────────────────────────
function puaToAnsi(puaText) {
  if (!puaText) return '';
  return Array.from(puaText).map(c => {
    const code = c.codePointAt(0);
    if (code >= 0xF000 && code <= 0xF0FF) {
      return new TextDecoder('windows-1252').decode(new Uint8Array([code & 0xFF]));
    }
    return c;
  }).join('');
}

// ─── 7. EMPTY STATE & STATS CONTROLLER ─────────────────────────────────────
function updateEmptyStatesAndStats() {
  const inVal = el.inputText ? el.inputText.value : '';
  const outVal = el.outputText ? el.outputText.value : '';

  // Input Empty State
  if (el.inputEmptyState) {
    el.inputEmptyState.classList.toggle('hidden', inVal.length > 0);
  }
  // Output Empty State
  if (el.outputEmptyState) {
    el.outputEmptyState.classList.toggle('hidden', outVal.length > 0);
  }

  // Counters
  if (el.inputCount) {
    const chars = inVal.length;
    const words = inVal.trim() ? inVal.trim().split(/\s+/).length : 0;
    const lines = inVal.length > 0 ? inVal.split(/\r\n|\r|\n/).length : 0;
    el.inputCount.textContent = `${chars.toLocaleString()} chars • ${words.toLocaleString()} words • ${lines} lines`;
  }

  if (el.outputCount) {
    el.outputCount.textContent = `${outVal.length.toLocaleString()} characters`;
  }

  if (el.ocrCount && el.ocrExtracted) {
    el.ocrCount.textContent = `${el.ocrExtracted.value.length.toLocaleString()} characters`;
  }
}

// ─── 8. FONT SIZE STEPPER ──────────────────────────────────────────────────
let currentFontSize = 22;
function updateFontSize(newSize) {
  currentFontSize = Math.max(16, Math.min(42, newSize));
  if (el.outputText) {
    el.outputText.style.fontSize = `${currentFontSize}px`;
  }
  if (el.fontSizeDisplay) {
    el.fontSizeDisplay.textContent = `${currentFontSize}px`;
  }
}

if (el.btnFontDec) {
  el.btnFontDec.addEventListener('click', () => updateFontSize(currentFontSize - 2));
}
if (el.btnFontInc) {
  el.btnFontInc.addEventListener('click', () => updateFontSize(currentFontSize + 2));
}

// ─── 9. CORE CONVERSION RUNNER ─────────────────────────────────────────────
async function doConvert(inputEl, outputEl, btn = null, notify = true) {
  const rawText = inputEl ? inputEl.value : '';
  if (!rawText || !rawText.trim()) {
    if (outputEl) outputEl.value = '';
    updateEmptyStatesAndStats();
    if (notify) showToast('Empty input', 'Please type or paste Telugu text to convert.', 'error');
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await invoke('convert_telugu', { text: rawText });
    const puaText = res.pua_text || '';
    const ansiText = res.ansi_text || puaToAnsi(puaText);

    if (outputEl) {
      outputEl.value = puaText;
    }
    updateEmptyStatesAndStats();

    // Dual-format clipboard copy on manual convert or sample load
    if (notify) {
      try {
        await invoke('copy_to_clipboard_advanced', {
          text: ansiText,
          unicodeText: puaText,
          unicodetext: puaText
        });
        showToast('Converted & Copied', 'InDesign ANSI + Unicode dual clipboard ready', 'success');
        setStatus('Copied to Windows clipboard (ANSI + Unicode)');
      } catch (clipErr) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(puaText).catch(() => {});
        }
        showToast('Converted Successfully', 'Ready for InDesign typesetting', 'success');
      }
    }
  } catch (err) {
    console.error('Conversion error:', err);
    showToast('Conversion Error', String(err), 'error');
    setStatus('Conversion error', true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─── 10. LIVE DEBOUNCED CONVERSION ─────────────────────────────────────────
let debounceTimer = null;
if (el.inputText) {
  el.inputText.addEventListener('input', () => {
    updateEmptyStatesAndStats();
    if (el.liveToggle && el.liveToggle.checked) {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (el.livePulseDot) el.livePulseDot.style.opacity = '1';

      debounceTimer = setTimeout(async () => {
        await doConvert(el.inputText, el.outputText, null, false);
        if (el.livePulseDot) el.livePulseDot.style.opacity = '0.5';
      }, 120);
    }
  });
}

// ─── 11. CONVERTER BUTTON ACTIONS ──────────────────────────────────────────
if (el.btnConvert) {
  el.btnConvert.addEventListener('click', () => {
    doConvert(el.inputText, el.outputText, el.btnConvert, true);
  });
}

if (el.btnClear) {
  el.btnClear.addEventListener('click', () => {
    if (el.inputText) el.inputText.value = '';
    if (el.outputText) el.outputText.value = '';
    updateEmptyStatesAndStats();
    el.inputText?.focus();
    setStatus('Workbench cleared');
    showToast('Cleared', 'Input and output have been cleared', 'info');
  });
}

// Clean, secular sample text without religious invocation
const SAMPLE_TEXT = "నమస్కారం, తెలుగు భాషాభిమానులందరికీ హృదయపూర్వక స్వాగతం. ఓపెన్‌తెలుగు డెస్క్‌టాప్ కన్వర్టర్ 100% ఉచితం మరియు ఇంటర్నెట్ లేకుండా పనిచేస్తుంది. అచ్చులు, హల్లులు, గుణింతాలు, సంయుక్తాక్షరాలు మరియు సంశ్లేషాక్షరాలు పరిపూర్ణంగా కన్వర్ట్ అవుతాయి.";

function loadSample() {
  if (el.inputText) el.inputText.value = SAMPLE_TEXT;
  updateEmptyStatesAndStats();
  doConvert(el.inputText, el.outputText, null, true);
}

if (el.btnSample) el.btnSample.addEventListener('click', loadSample);
if (el.emptyChipSample) el.emptyChipSample.addEventListener('click', loadSample);

async function pasteClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && el.inputText) {
      el.inputText.value = text;
      updateEmptyStatesAndStats();
      doConvert(el.inputText, el.outputText, null, true);
    } else {
      showToast('Clipboard empty', 'No text found in clipboard', 'error');
    }
  } catch {
    showToast('Clipboard access', 'Click into the text area and press Ctrl+V', 'info');
  }
}

if (el.btnPasteInput) el.btnPasteInput.addEventListener('click', pasteClipboard);
if (el.emptyChipPaste) el.emptyChipPaste.addEventListener('click', pasteClipboard);

// Copy Button Micro-interaction
if (el.btnCopyOutput) {
  el.btnCopyOutput.addEventListener('click', async () => {
    const val = el.outputText ? el.outputText.value : '';
    if (!val) {
      showToast('Nothing to copy', 'Convert some Telugu text first', 'error');
      return;
    }

    try {
      await invoke('copy_to_clipboard_advanced', {
        text: puaToAnsi(val),
        unicodeText: val,
        unicodetext: val
      });
    } catch {
      if (navigator.clipboard) await navigator.clipboard.writeText(val).catch(() => {});
    }

    // Micro-interaction: transform icon to checkmark
    const copyIcon = document.getElementById('copy-icon');
    const copyBtnText = document.getElementById('copy-btn-text');
    if (copyIcon && copyBtnText) {
      copyIcon.innerHTML = `<polyline points="20 6 9 17 4 12" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      copyBtnText.textContent = 'Copied!';
      setTimeout(() => {
        const curIcon = document.getElementById('copy-icon');
        if (curIcon) {
          curIcon.innerHTML = `<rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`;
        }
        const curText = document.getElementById('copy-btn-text');
        if (curText) curText.textContent = 'Copy Script';
      }, 1800);
    }

    showToast('Copied to Clipboard', 'Dual-Format ready for InDesign & PageMaker', 'success');
  });
}

// ─── 12. NAVIGATION CONTROLLER ─────────────────────────────────────────────
const pageTitles = {
  'page-converter': 'Telugu Unicode to Script',
  'page-ocr': 'Image to Text OCR',
  'page-keyboard': 'System-wide Telugu Typing Hook',
  'page-about': 'About & Documentation',
};

function navigate(pageId) {
  el.pages.forEach(p => p.classList.toggle('active', p.id === pageId));
  el.navItems.forEach(n => n.classList.toggle('active', n.dataset.page === pageId));
  if (el.sectionIndicator && pageTitles[pageId]) {
    el.sectionIndicator.textContent = pageTitles[pageId];
  }
  if (pageId === 'page-converter') {
    el.inputText?.focus();
  }
}

el.navItems.forEach(nav => {
  nav.addEventListener('click', () => navigate(nav.dataset.page));
});

// ─── 13. COMMAND PALETTE WITH AUTHENTIC PHOSPHOR / LUCIDE SVG ICONS ────────
// Zero colorful emojis! Professional monochrome SVG paths only.
const COMMANDS = [
  {
    id: 'convert',
    title: 'Convert Unicode to Script',
    category: 'Actions',
    kbd: 'Ctrl+Enter',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
    run: () => el.btnConvert?.click()
  },
  {
    id: 'copy',
    title: 'Copy Script Text (Dual-Format)',
    category: 'Actions',
    kbd: 'Ctrl+Shift+C',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    run: () => el.btnCopyOutput?.click()
  },
  {
    id: 'paste',
    title: 'Paste from Clipboard',
    category: 'Actions',
    kbd: 'Ctrl+V',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1"/></svg>`,
    run: () => pasteClipboard()
  },
  {
    id: 'sample',
    title: 'Load Telugu Sample Text',
    category: 'Actions',
    kbd: '',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    run: () => loadSample()
  },
  {
    id: 'clear',
    title: 'Clear Workbench',
    category: 'Actions',
    kbd: 'Ctrl+L',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>`,
    run: () => el.btnClear?.click()
  },
  {
    id: 'nav-conv',
    title: 'Go to Converter Workbench',
    category: 'Navigation',
    kbd: 'Ctrl+1',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    run: () => navigate('page-converter')
  },
  {
    id: 'nav-ocr',
    title: 'Go to Image to Text OCR',
    category: 'Navigation',
    kbd: 'Ctrl+2',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    run: () => navigate('page-ocr')
  },
  {
    id: 'nav-kb',
    title: 'Go to System Keyboard Hook',
    category: 'Navigation',
    kbd: 'Ctrl+3',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>`,
    run: () => navigate('page-keyboard')
  },
  {
    id: 'nav-about',
    title: 'Go to About & Documentation',
    category: 'Navigation',
    kbd: 'Ctrl+4',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    run: () => navigate('page-about')
  },
  {
    id: 'toggle-theme',
    title: 'Toggle Light / Dark Mode',
    category: 'Preferences',
    kbd: '',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
    run: () => toggleTheme()
  },
  {
    id: 'toggle-live',
    title: 'Toggle Live Conversion',
    category: 'Preferences',
    kbd: '',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
    run: () => {
      if (el.liveToggle) {
        el.liveToggle.checked = !el.liveToggle.checked;
        showToast('Live Convert', el.liveToggle.checked ? 'Enabled' : 'Disabled', 'info');
      }
    }
  },
  {
    id: 'font-inc',
    title: 'Increase Script Font Size',
    category: 'Preferences',
    kbd: '',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M7 16h10M12 4v12M8 8l4-4 4 4"/></svg>`,
    run: () => updateFontSize(currentFontSize + 2)
  },
  {
    id: 'font-dec',
    title: 'Decrease Script Font Size',
    category: 'Preferences',
    kbd: '',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M7 16h10M12 4v12M8 12l4 4 4-4"/></svg>`,
    run: () => updateFontSize(currentFontSize - 2)
  },
];

let selectedCmdIdx = 0;
let filteredCmds = [...COMMANDS];

function renderCmdList() {
  if (!el.cmdList) return;
  if (filteredCmds.length === 0) {
    el.cmdList.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">No matching commands found</div>`;
    return;
  }

  let html = '';
  let lastCat = '';
  filteredCmds.forEach((cmd, idx) => {
    if (cmd.category !== lastCat) {
      lastCat = cmd.category;
      html += `<div class="cmd-group-title">${cmd.category}</div>`;
    }
    const isSel = idx === selectedCmdIdx ? 'selected' : '';
    html += `
      <div class="cmd-item ${isSel}" data-idx="${idx}">
        <div class="cmd-item-left">
          <span class="cmd-item-icon">${cmd.iconSvg}</span>
          <span>${cmd.title}</span>
        </div>
        ${cmd.kbd ? `<span class="kbd">${cmd.kbd}</span>` : ''}
      </div>
    `;
  });
  el.cmdList.innerHTML = html;

  // Add click handlers
  el.cmdList.querySelectorAll('.cmd-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx, 10);
      executeCommand(idx);
    });
  });
}

function openCmdPalette() {
  if (!el.cmdBackdrop) return;
  el.cmdBackdrop.classList.add('open');
  if (el.cmdInput) {
    el.cmdInput.value = '';
    el.cmdInput.focus();
  }
  filteredCmds = [...COMMANDS];
  selectedCmdIdx = 0;
  renderCmdList();
}

function closeCmdPalette() {
  if (!el.cmdBackdrop) return;
  el.cmdBackdrop.classList.remove('open');
}

function executeCommand(idx) {
  const cmd = filteredCmds[idx];
  if (cmd) {
    closeCmdPalette();
    cmd.run();
  }
}

if (el.btnCmdTrigger) {
  el.btnCmdTrigger.addEventListener('click', openCmdPalette);
}

if (el.cmdInput) {
  el.cmdInput.addEventListener('input', () => {
    const q = el.cmdInput.value.toLowerCase().trim();
    if (!q) {
      filteredCmds = [...COMMANDS];
    } else {
      filteredCmds = COMMANDS.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    selectedCmdIdx = 0;
    renderCmdList();
  });

  el.cmdInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedCmdIdx = (selectedCmdIdx + 1) % Math.max(1, filteredCmds.length);
      renderCmdList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedCmdIdx = (selectedCmdIdx - 1 + filteredCmds.length) % Math.max(1, filteredCmds.length);
      renderCmdList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(selectedCmdIdx);
    } else if (e.key === 'Escape') {
      closeCmdPalette();
    }
  });
}

el.cmdBackdrop?.addEventListener('click', e => {
  if (e.target === el.cmdBackdrop) closeCmdPalette();
});

// ─── 14. GLOBAL DESKTOP KEYBOARD SHORTCUTS ─────────────────────────────────
document.addEventListener('keydown', e => {
  // Ctrl+K -> Command Palette
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (el.cmdBackdrop?.classList.contains('open')) {
      closeCmdPalette();
    } else {
      openCmdPalette();
    }
    return;
  }

  // Esc -> Close palette
  if (e.key === 'Escape') {
    closeCmdPalette();
  }

  // Ctrl+Enter -> Convert
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    el.btnConvert?.click();
  }

  // Ctrl+Shift+C -> Copy Output
  if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
    el.btnCopyOutput?.click();
  }

  // Ctrl+L -> Clear
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault();
    el.btnClear?.click();
  }

  // Ctrl+1..4 -> Navigation
  if (e.ctrlKey && e.key === '1') { e.preventDefault(); navigate('page-converter'); }
  if (e.ctrlKey && e.key === '2') { e.preventDefault(); navigate('page-ocr'); }
  if (e.ctrlKey && e.key === '3') { e.preventDefault(); navigate('page-keyboard'); }
  if (e.ctrlKey && e.key === '4') { e.preventDefault(); navigate('page-about'); }
});

// ─── 15. OCR (IMAGE TO TEXT) CONTROLLER ────────────────────────────────────
async function handleOcrImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Invalid file', 'Please select a valid image file (PNG, JPG, TIFF, WebP)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async ev => {
    const dataUrl = ev.target.result;
    if (el.ocrPreviewImg) el.ocrPreviewImg.src = dataUrl;
    if (el.ocrPreviewWrap) el.ocrPreviewWrap.classList.add('visible');

    showToast('Running OCR', 'Extracting Telugu text with Tesseract LSTM...', 'info', 2500);
    setStatus('Running Tesseract OCR...');

    try {
      const text = await invoke('perform_ocr', { imageBase64: dataUrl });
      const clean = (text || '').trim();
      if (el.ocrExtracted) {
        el.ocrExtracted.value = clean;
      }
      updateEmptyStatesAndStats();
      showToast('Extraction Complete', 'Telugu text extracted successfully', 'success');
      setStatus('OCR extraction complete');
    } catch (err) {
      console.error('OCR error:', err);
      showToast('OCR Failed', String(err), 'error');
      setStatus('OCR failed', true);
    }
  };
  reader.readAsDataURL(file);
}

if (el.ocrDropzone) {
  el.ocrDropzone.addEventListener('click', e => {
    if (e.target.closest('#ocr-dismiss') || e.target.closest('#ocr-btn-extract')) return;
    el.ocrFileInput?.click();
  });

  el.ocrFileInput?.addEventListener('change', e => {
    if (e.target.files?.[0]) handleOcrImage(e.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach(evt => {
    el.ocrDropzone.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      el.ocrDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    el.ocrDropzone.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      el.ocrDropzone.classList.remove('drag-over');
    });
  });

  el.ocrDropzone.addEventListener('drop', e => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleOcrImage(file);
  });
}

if (el.ocrDismiss) {
  el.ocrDismiss.addEventListener('click', e => {
    e.stopPropagation();
    if (el.ocrPreviewWrap) el.ocrPreviewWrap.classList.remove('visible');
    if (el.ocrPreviewImg) el.ocrPreviewImg.src = '';
    if (el.ocrFileInput) el.ocrFileInput.value = '';
  });
}

if (el.ocrBtnSend) {
  el.ocrBtnSend.addEventListener('click', () => {
    const text = el.ocrExtracted ? el.ocrExtracted.value : '';
    if (!text) {
      showToast('No extracted text', 'Extract or type text before sending to converter', 'error');
      return;
    }
    if (el.inputText) el.inputText.value = text;
    navigate('page-converter');
    doConvert(el.inputText, el.outputText, null, true);
  });
}

// ─── 16. KEYBOARD HOOK CONTROLLER ──────────────────────────────────────────
function updateHookUI(isActive) {
  if (el.hookIndicator) {
    el.hookIndicator.classList.toggle('active', isActive);
  }
  if (el.hookStatusText) {
    el.hookStatusText.textContent = isActive ? 'Active • Intercepting Keys' : 'Inactive';
    el.hookStatusText.style.color = isActive ? 'var(--success)' : 'var(--text-secondary)';
  }
  if (el.kbToggleBtn) {
    el.kbToggleBtn.textContent = isActive ? 'Disable Keyboard Hook' : 'Enable Keyboard Hook';
    el.kbToggleBtn.className = isActive ? 'btn btn-outline' : 'btn btn-primary';
  }
}

invoke('is_keyboard_hooked')
  .then(res => updateHookUI(!!res))
  .catch(() => updateHookUI(false));

if (el.kbToggleBtn) {
  el.kbToggleBtn.addEventListener('click', async () => {
    try {
      const state = await invoke('toggle_keyboard');
      updateHookUI(!!state);
      showToast('Keyboard Hook', state ? 'Enabled (Press F12 anywhere to toggle)' : 'Disabled', state ? 'success' : 'info');
      if (state) {
        await invoke('win_minimize').catch(() => {});
      }
    } catch (err) {
      showToast('Hook Error', String(err), 'error');
    }
  });
}

if (el.layoutSelect) {
  el.layoutSelect.addEventListener('change', async () => {
    const layout = el.layoutSelect.value;
    try {
      await invoke('set_keyboard_layout', { layout });
      showToast('Layout Switched', `Active layout: ${layout.toUpperCase()}`, 'info');
    } catch (err) {
      console.error('Layout error:', err);
    }
  });
}

if (window.__TAURI__?.event?.listen) {
  window.__TAURI__.event.listen('is-keyboard-hooked', ev => {
    updateHookUI(!!ev.payload);
  });
}

// Keystroke table category filter & search
let allRules = [];
let activeCategory = 'all';

async function loadKeystrokeRules() {
  const staticFallback = [
    { unicode_char: 'క', eng_keystroke: 'k', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'కా', eng_keystroke: 'kaa', script_glyph: '', rule_type: 'Gunintham' },
    { unicode_char: 'కి', eng_keystroke: 'ki', script_glyph: '', rule_type: 'Gunintham' },
    { unicode_char: 'కీ', eng_keystroke: 'kee', script_glyph: '', rule_type: 'Gunintham' },
    { unicode_char: 'క్ష', eng_keystroke: 'ksha / ksh', script_glyph: '', rule_type: 'Votthu' },
    { unicode_char: 'గ', eng_keystroke: 'g', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'చ', eng_keystroke: 'ch', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'జ', eng_keystroke: 'j', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'త', eng_keystroke: 'th / t', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'ద', eng_keystroke: 'd', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'న', eng_keystroke: 'n', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'ప', eng_keystroke: 'p', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'మ', eng_keystroke: 'm', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'య', eng_keystroke: 'y', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'ర', eng_keystroke: 'r', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'ల', eng_keystroke: 'l', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'వ', eng_keystroke: 'v / w', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'శ', eng_keystroke: 'sh', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'స', eng_keystroke: 's', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'హ', eng_keystroke: 'h', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'ళ', eng_keystroke: 'L', script_glyph: '', rule_type: 'Consonant' },
    { unicode_char: 'శ్రీ', eng_keystroke: 'shree / Sri', script_glyph: '', rule_type: 'Special' },
  ];

  try {
    const rules = await invoke('get_all_keystroke_rules');
    if (Array.isArray(rules) && rules.length > 0) {
      allRules = rules.map(r => ({
        unicode_char: r.unicode_char,
        eng_keystroke: r.eng_keystroke || r.roma_keystroke || '',
        script_glyph: r.script_glyph || r.non_unicode_char || '',
        rule_type: r.rule_type || (r.is_hallu ? 'Consonant' : 'Gunintham')
      }));
    } else {
      allRules = staticFallback;
    }
  } catch {
    allRules = staticFallback;
  }
  filterAndRenderRules();
}

function filterAndRenderRules() {
  if (!el.keymapTbody) return;
  const q = el.keymapSearch ? el.keymapSearch.value.toLowerCase().trim() : '';

  const filtered = allRules.filter(r => {
    const matchSearch = !q ||
      (r.unicode_char && r.unicode_char.includes(q)) ||
      (r.eng_keystroke && r.eng_keystroke.toLowerCase().includes(q)) ||
      (r.rule_type && r.rule_type.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (activeCategory === 'all') return true;
    const rt = (r.rule_type || '').toLowerCase();
    if (activeCategory === 'hallu') return rt.includes('consonant') || rt.includes('hallu');
    if (activeCategory === 'gunintham') return rt.includes('gunintham');
    if (activeCategory === 'votthu') return rt.includes('votthu');
    if (activeCategory === 'special') return rt.includes('special');
    return true;
  });

  if (filtered.length === 0) {
    el.keymapTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">No matching keystrokes found</td></tr>`;
    return;
  }

  el.keymapTbody.innerHTML = filtered.slice(0, 100).map(r => `
    <tr>
      <td><span class="telugu-glyph">${r.unicode_char}</span></td>
      <td><code>${r.eng_keystroke}</code></td>
      <td><span style="font-family:var(--font-telugu-script);font-size:18px">${r.script_glyph}</span></td>
      <td><span class="badge">${r.rule_type || 'Standard'}</span></td>
    </tr>
  `).join('');
}

if (el.catBtns) {
  el.catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      filterAndRenderRules();
    });
  });
}

if (el.keymapSearch) {
  el.keymapSearch.addEventListener('input', filterAndRenderRules);
}

// ─── 17. WINDOW CONTROLS ───────────────────────────────────────────────────
el.btnMinimize?.addEventListener('click', () => {
  invoke('win_minimize').catch(() => window.__TAURI__?.window?.getCurrent()?.minimize());
});

el.btnMaximize?.addEventListener('click', () => {
  invoke('win_toggle_maximize').catch(() => window.__TAURI__?.window?.getCurrent()?.toggleMaximize());
});

el.btnClose?.addEventListener('click', () => {
  invoke('win_close').catch(() => window.__TAURI__?.window?.getCurrent()?.close());
});

// ─── 18. INITIALIZATION ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateEmptyStatesAndStats();
  loadKeystrokeRules();
  el.inputText?.focus();
  setStatus('OpenTelugu ready • 100% offline & free');
});
