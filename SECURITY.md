# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

The maintainers of OpenTelugu take software security seriously. If you discover a security vulnerability, please report it responsibly:

1. **Do NOT report security vulnerabilities via public GitHub issues.**
2. Send an email to the project maintainers or submit a private security advisory via GitHub's "Report a vulnerability" tab.
3. Include details of the vulnerability:
   - Operating system and version.
   - Exact steps or proof-of-concept (PoC) to reproduce the issue.
   - Potential impact of the issue.

We will acknowledge receipt of your report within 48 hours and coordinate a fix and release advisory.

---

## Key Security Architecture

- **Sandboxed WebView:** Frontend UI operates with local resource boundaries (`csp: null` handled via strict local asset isolation).
- **Keyboard Hook Recursion Guard:** Win32 low-level hooks utilize `dwExtraInfo = 0x12345678` signature on synthetic events to eliminate any recursive infinite loop risks.
- **Zero Remote Dependencies:** All OCR models and native conversions execute locally with no dynamic remote code execution.
