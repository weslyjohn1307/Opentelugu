# Legal Notices, Interoperability Declaration & Fair Use Policy

**OpenTelugu** is an independent, free, and open-source software project distributed under the [MIT License](./LICENSE).

---

## 1. Interoperability & Clean-Room Reimplementation

OpenTelugu was developed independently to provide format interoperability between modern international character encoding standards (Unicode ISO/IEC 10646) and legacy non-Unicode Telugu desktop publishing (DTP) typesetting font encodings commonly used across India in Adobe InDesign, Photoshop, Illustrator, and PageMaker.

### Statutory Safe Harbors & Legal Basis:

1. **India — Section 52(1)(ab) of the Copyright Act, 1957:**
   > *"The following acts shall not constitute an infringement of copyright, namely: ... the doing of any act necessary to obtain information essential for operating inter-operability of an independently created computer programme with other programmes by a lawful user of or person having a right to use a computer programme of which such information is not so readily obtainable..."*
   
   The glyph mapping algorithms and keystroke translation tables implemented in OpenTelugu are purely functional interface specifications required to enable cross-system interoperability for lawful users possessing legitimate licenses to DTP software and legacy fonts.

2. **United States — 17 U.S.C. § 1201(f) (Reverse Engineering for Interoperability):**
   > *"A person who has lawfully obtained the right to use a copy of a computer program may circumvent a technological measure that effectively controls access to a particular portion of that program for the sole purpose of identifying and analyzing those elements of the program that are necessary to achieve interoperability of an independently created computer program with other programs..."*
   
   Furthermore, established US Federal Court precedents firmly protect interoperability interfaces and functional character mapping:
   - *Google LLC v. Oracle America, Inc.*, 141 S. Ct. 1183 (2021) — Functional declaring code, interface definitions, and structural mappings are fair use as a matter of law.
   - *Sega Enterprises Ltd. v. Accolade, Inc.*, 977 F.2d 1510 (9th Cir. 1992) & *Sony Computer Entertainment, Inc. v. Connectix Corp.*, 203 F.3d 596 (9th Cir. 2000) — Reverse engineering to discover functional interfaces and compatibility specifications is protected fair use.
   - *Feist Publications, Inc. v. Rural Telephone Service Co.*, 499 U.S. 340 (1991) — Raw factual mapping tables and coordinate pairings lack the requisite originality to claim copyright monopoly.

3. **European Union — Directive 2009/24/EC (Article 6):**
   > Decompilation and technical analysis are explicitly permitted without authorization of the rightsholder when indispensable to obtain the information necessary to achieve the interoperability of an independently created computer program.

---

## 2. Clean-Room Architecture

- All conversion engines, Unicode normalization routines, Win32 low-level keyboard hooks (`WH_KEYBOARD_LL`), clipboard handlers, and desktop user interfaces in OpenTelugu were **authored from scratch** in Rust, JavaScript, and HTML/CSS.
- No proprietary source code, decompiled binary files, or confidential trade secrets were used, included, or derived in the creation of OpenTelugu.

---

## 3. Strict Exclusion of Proprietary Font Binaries

OpenTelugu **does not include, bundle, or distribute any proprietary third-party font files** (such as `.ttf`, `.otf`, or font binaries from Anu Graphic Systems, Modular Systems, Shree-Lipi, or other commercial font foundries).

- Any fonts required to display legacy DTP output in publishing suites (such as InDesign or PageMaker) must be independently and lawfully acquired and licensed by the user directly from the respective font vendors.
- OpenTelugu acts solely as a text data transformer that outputs character byte streams compatible with standard font encodings.

---

## 4. Non-Affiliation & Endorsement Disclaimer

OpenTelugu is an independent, non-commercial open-source project. It is **not affiliated with, maintained by, sponsored by, or endorsed by**:
- Anu Graphic Systems
- Modular Infotech Pvt. Ltd.
- Adobe Inc.
- Microsoft Corporation
- Apple Inc.

All product names, logos, brands, and registered trademarks mentioned within the source code, documentation, or user interface are the property of their respective owners. Their mention is strictly for technical identification, compatibility reference, and format specification purposes under the doctrine of **Nominative Fair Use**.

---

## 5. Limitation of Liability

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
