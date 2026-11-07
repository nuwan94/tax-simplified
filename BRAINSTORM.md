# Tax Simplified: Brainstorm Synthesis

*Three perspectives (Taxpayer · IRD Officer · Bank Manager) — 2026-11-07*

> Every figure marked **VERIFY** must be checked against IRD/CBSL sources before it goes into code.

---

## 1. Where all three agree (strong signals)

| Theme | Taxpayer | IRD Officer | Bank Manager |
|---|---|---|---|
| **Interest / WHT (AIT) mismatch** is the #1 problem | "Can I get my WHT back?" | #1 query trigger in RAMIS cross-matching | #1 counter complaint at FD renewal |
| **"Do I even need to file?"** confusion | Biggest anxiety | "APIT deducted = done" myth | Retirees under threshold lose refunds |
| **Never take RAMIS / bank passwords** | Instant uninstall | Legal boundary; no auto-login | Compliance non-negotiable |
| **Rules must be versioned per Year of Assessment** with source | "Stale slabs = never trust again" | Act/amendment/Gazette citation; flag Budget *proposals* | Mid-year circular changes → liability |
| **Notice explainer** | Panic → to-do | Classify + statutory clocks | Phishing look-alikes risk |
| **Installment reminders + correct payment refs** | Penalty interest leak | Mis-allocated payments = big IRD workload | Wrong slip codes = weeks to fix |
| **Sinhala / Tamil / English, properly** | Real tax vocabulary | Cage-by-cage guide in 3 languages | Counter explainer cards |
| **Traceability** (every number → a document) | "Must match RAMIS screens" | Show full working | Loan pack must mark self-declared vs verified |

## 2. Product principles (derived)

1. **Companion, not agent.** The user submits in RAMIS and pays themselves. Tool prepares, validates, explains.
2. **Rules engine is data, not code.** `rules/YA-2025-26.json` with rate, effective date, legal source, status (`enacted` / `proposed`).
3. **Every number is traceable** to an uploaded document or a user-declared entry (clearly labelled).
4. **Privacy by default.** On-device storage preferred, PDPA No. 9 of 2022 compliance, "delete everything" button, no ads, no cross-selling.
5. **Honest about limits.** "Estimate" language; escalate residency, business-vs-employment, appeals to a registered tax representative.
6. **Mobile-first, low bandwidth**, works on mid-range Android.

## 3. Feature map

### Tier 1: MVP ("the one screen")
*"What I owe or am owed this year, and exactly what to type into each RAMIS cage."*

- **"Do I need to file?" wizard** (60 s, 3 languages)
- **Document upload + parse** — APIT/T-10, bank interest/WHT certificates, statements (password-protected PDFs, multi-bank layouts) with user confirmation step
- **Multi-bank interest & WHT ledger** per YA (handles the 5% → 10% rate split, **VERIFY**)
- **Tax computation with full working** — gross → reliefs → taxable → slabs → credits → payable/refund
- **Refund finder** (over-deducted WHT/APIT)
- **RAMIS mirror / filing companion** — cage-by-cage "type this here"
- **Deadline calendar** — 30 Nov return, quarterly installments, final payment (**VERIFY** dates)

### Tier 2: Make it sticky
- **Notice decoder** (photo/paste SMS/letter → type, urgency, deadline, next step; appeal clocks)
- **Missing-certificate detector + request letter** to bank/employer
- **Installment planner** + correct **payment slip/reference generator** (TIN, tax type, period)
- **Pre-filing validation** (RAMIS cage logic, double-counted income, expired reliefs, year-over-year anomalies)
- **Senior citizen declaration helper** with annual April renewal reminder (**VERIFY** threshold/form)
- **"What changed this year" card** applied to the user's own numbers
- **Encrypted document vault** with export bundle (5-year retention, **VERIFY**)

### Tier 3: Personas & growth
- **Freelancer mode** — remittance import (Payoneer/Wise/SWIFT), CBSL rate per date, service-export classification (15% from Apr 2025, **VERIFY**)
- **Shop "cash-book to tax"** — daily one-line log, voice/photo of bills
- **Family/helper delegate mode** with audit trail (anti-coercion)
- **TIN registration walkthrough** + "TIN ready" card
- **Loan-ready income pack** (verified vs self-declared clearly separated)
- **Query response pack** (reconciliation bundle for IRD queries)
- **Paid human review** by a registered tax practitioner (~Rs 1,500–3,000)
- **Plan-ahead slider** (what-if)

### Bold / later
- **Shadow assessment** — estimate what IRD sees (bank WHT + employer APIT) and flag gaps before filing
- **First-filer / regularisation path** (**VERIFY** any amnesty/disclosure scheme)
- **Bank-signed certificates** (PDF + QR/JSON) → kills forged-certificate refund fraud
- **CGT on investment assets** module

## 4. Tensions to resolve

| Tension | Notes |
|---|---|
| Bank co-branding vs. trust | Banks want distribution; taxpayers distrust upselling. → Keep product offers out of tax flows entirely. |
| Refund messaging vs. phishing | "You're owed money!" is a scam template. → No links in SMS, verified domain, in-app verification page. |
| Simplicity vs. correctness | Taxpayer wants one number; IRD wants full working. → One headline number, expandable working beneath. |
| Liability for wrong numbers | Users want a guarantee; that's risky. → Estimate language + optional paid practitioner review. |
| Cloud vs. on-device | Multi-bank picture is a honeypot. → On-device first; sync opt-in. |

## 5. Business model sketch
- **Free:** salaried + interest (the bulk of filers)
- **Paid (< Rs 1,000 → higher for complexity):** freelancer, business, rent, notice handling
- **Add-on:** practitioner review per return
- **B2B:** bank white-label / per-active-user; mortgage desks pay for loan-ready packs
- **Never:** ads, data sales, product commissions tied to tax flows

## 6. Rule verification (checked 2026-11-07)

Machine-readable rules: [rules/ya-2025-26.json](rules/ya-2025-26.json). Sources: IRD *Guide to fill the Return of Income YA 2025/26*, IRD *Tax Calendar 2026*, IRD notice *SEC/PN/IT/2026/02* (8 Jun 2026, on Amendment Act No. 11 of 2026).

| # | Item | Status | Finding |
|---|---|---|---|
| 1 | Personal relief & slabs | ✅ IRD | Rs 1,800,000; 6% / 18% / 24% / 30% / 36% on Rs 1M + 0.5M + 0.5M + 0.5M + balance. Guide's worked example reproduces exactly. |
| 2 | Interest WHT/AIT | ✅ IRD | 10%; **creditable** for residents (Sch. 7), final for non-residents. Self-declaration only if *no taxable income*; false declaration → up to Rs 200,000 penalty. |
| 2b | Senior-citizen interest exemption | ⚠️ Not found | No separate senior exemption in the 2025/26 guide or 2026 notice; blogs conflict. Treat as **not available** until IRD confirms. Seniors *may* file on paper from YA 2025/26 (✅). |
| 3 | Foreign service / foreign-source income | ✅ IRD | Taxable from 1 Apr 2025; progressive rates **capped at 15%** if received in FX and remitted via a licensed bank (6% on first Rs 1M, then 15%). Cage 809B. |
| 4 | Dates (YA 2025/26) | ✅ IRD | Instalments 15 Aug, 15 Nov 2025, 15 Feb, 15 May 2026; final payment 30 Sep 2026; **return due 30 Nov 2026**. Payment codes 25261–25264, 25260; tax type 05. |
| 4b | Instalments from YA 2026/27 | ✅ IRD | SET discontinued; instalments based on **previous year's tax**. Procedure for lower-income years "in due course". |
| 5 | When no return is needed | ✅ IRD | Only employment income fully under APIT (+ interest ≤ Rs 5,000), no instalments/final payment due, and no file opened by CGIR. |
| 6 | Reliefs | ✅ IRD | Rent 25%; solar panels up to Rs 600,000/yr; qualifying payments (Sch. 5); unused govt donations carry forward. |
| 7 | Penalties | ✅ IRD | Late return: greater of 5% + 1%/month or Rs 50,000 + Rs 10,000/month. Missed instalment 10%; unpaid tax 20%; interest 1.5%/month. False statement ≥ Rs 50,000. |
| 7b | Interest waiver | ✅ IRD | Interest up to YA 2024/25 waived if principal paid by **2 Dec 2026** — time-critical feature opportunity. |
| 8 | Appeals | 🟡 Secondary | Administrative review to CGIR, then Tax Appeals Commission within 30 days of CGIR decision (s.139/140; TAC Act No. 23 of 2011). Check Act text. |
| 9 | TIN | ✅ IRD | Mandatory for: opening any account at a financial institution, building plans, vehicle registration/licence renewal, land registration, business registration, share transfers, credit cards. Takes effect once CGIR issues verification specs (press reports: 1 Nov 2026). |
| 10 | PDPA | 🟡 Secondary | Core provisions (Part I, Part III) in force **1 Jan 2027** per Gazette 2498/16; data-subject rights/penalties timing unclear. |
| 10b | CBSL tech-risk | ❌ Not checked | Only relevant to a bank partnership. |
| 11 | Record retention | ❌ Not found | Not in guide or notice; check the Act. |
| 12 | Tax representatives / RAMIS API | ❌ Not found | Return declaration lets a paid preparer be named (Part A). No public RAMIS API found. |
| — | CGT | ✅ IRD | 10% for YA 2025/26; **15% for individuals from 3 Jun 2026**. |
| — | YA 2026/27 rates | 🟡 Inferred | No change to relief or slabs in the 2026 amendment notice; confirm when the YA 2026/27 guide is published. |

**Product notes from verification**
- RAMIS already **pre-fills** interest, rent and employment data; the tool's value is checking that pre-fill against the user's certificates, not re-entering it.
- A **simplified return** exists for employment + interest only → the MVP persona maps onto it directly.
- Banks must issue WHT certificates **free of charge**; the certificate-request letter can cite this.
- 5% WHT now applies to many freelancer professions (IT, photography, coaching, etc.) on payments > Rs 100,000/month → freelancers have credits to claim.

## 7. Suggested next steps
1. Build the **verified rules table** for YA 2025/26 (from IRD publications) — everything depends on it.
2. Pick the MVP persona: **salaried + FD interest** (largest group, simplest rules, highest refund value).
3. Collect 5–10 real (redacted) bank WHT certificates & T-10s to design the parser.
4. Map the RAMIS individual return cages for the filing companion.
5. Decide stack (mobile-first PWA vs. native Android).
