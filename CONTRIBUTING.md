# Contributing to OpenTelugu

Thank you for your interest in contributing to **OpenTelugu**! 

OpenTelugu is a community-driven, open-source project dedicated to advancing Telugu language desktop publishing and typography.

---

## 1. Clean-Room & Intellectual Property Standards (CRITICAL)

To maintain our legal protections under software interoperability exemptions and copyright law:

1. **NO PROPRIETARY CODE:** You must **never** submit code, algorithms, or snippets decompiled from proprietary software (such as commercial Anu, Modular, or Shree-Lipi software binaries). All submissions must be your original work or licensed under compatible permissive open-source licenses.
2. **NO PROPRIETARY FONT FILES:** Do **not** commit or create pull requests containing commercial third-party font binaries (`.ttf`, `.otf`, `.fon`).
3. **Factual Mappings Only:** Font compatibility tables must represent functional character code mappings derived purely for interoperability purposes.
4. **License Agreement:** By submitting a pull request, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

---

## 2. Development Setup

### Prerequisites
- [Rust 1.85+](https://rustup.rs/) (`rustc`, `cargo`)
- [Node.js 18+](https://nodejs.org/)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/<your-username>/opentelugu.git
cd opentelugu

# Run test suite
cd src-tauri
cargo test

# Launch dev application
cargo run
```

---

## 3. Pull Request Guidelines

1. **Focus on Quality:** Keep PRs focused on a single bug fix, feature, or typographic enhancement.
2. **Run Tests:** Ensure all unit tests pass with `cargo test` before submitting.
3. **Commit Messages:** Use clear, descriptive commit messages following the Conventional Commits specification (e.g. `feat: add support for tri-consonant ligature`, `fix: handle edge case in ra-vatthu reordering`).
4. **Code Formatting:** Run `cargo fmt` to maintain consistent Rust formatting.
