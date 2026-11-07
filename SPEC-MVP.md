# Tax Simplified: MVP Spec (v0.1 draft)

*2026-11-07 · Builds on [BRAINSTORM.md](BRAINSTORM.md) · Rules: [rules/ya-2025-26.json](rules/ya-2025-26.json)*

---

## 1. Goal

For a **salaried Sri Lankan resident with bank interest**, answer on one screen:

> **"Do I need to file? What do I owe or get back? And exactly what goes into each RAMIS box?"**

with every number traceable to a document the user provided.

**Why this persona:** it's the largest group of filers, uses only verified rules, fits IRD's **Simplified Return** (employment + interest only), and has the most hidden money at stake:
- Low earners are often **owed refunds** of the 10% interest deduction.
- Anyone in the 18%+ bands **owes more** on interest than the 10% the bank took. Most people don't know this (see test case T2).

## 2. Scope

### In scope
- Resident individuals, YA 2025/26 (rules engine ready for 2026/27).
- Income: employment (one primary + optional secondary employer, local, LKR) and interest from Sri Lankan banks / finance companies.
- Credits: APIT (primary, secondary), AIT/WHT on interest.
- Relief: personal relief only (Rs 1,800,000).
- Languages: Sinhala, Tamil, English.

### Out of scope (MVP) → routed to "Not covered yet" with a reason
Rent, business, freelance/foreign income, dividends, capital gains, terminal benefits, qualifying payments / solar relief, non-residents, joint accounts, prior-year amendments, IRD notices, payments, bank partnerships.

> If the user reports any out-of-scope item, the tool **stops calculating** and says: "Your situation needs the Standard Return. Here's what to do," rather than producing a partial number.

### Non-goals (permanent)
- Never ask for or store RAMIS, internet-banking passwords or OTPs.
- Never submit to RAMIS or pay on the user's behalf.
- No ads, no product offers, no data sharing.

## 3. User flow

```
Start → Language → Eligibility check → Add documents → Confirm figures → Result → RAMIS guide → Export
```

### 3.1 Eligibility check ("Do I need to file?")
Questions (one per screen, yes/no or amount):
1. Were you a Sri Lankan tax resident for YA 2025/26 (1 Apr 2025 – 31 Mar 2026)?
2. Income other than salary and bank interest? (rent, business, freelance, foreign, dividends, sale of property/shares) → **yes = out of scope**
3. Did all your employers deduct APIT? / Did you have more than one employer?
4. Total bank interest for the year, roughly?
5. Has IRD opened a tax file for you / have you filed before?
6. Did you make any qualifying payments or solar investments? → **yes = out of scope**

**Outcome rules** (IRD notice SEC/PN/IT/2026/02 §12):

| Condition | Outcome |
|---|---|
| Only employment income fully under APIT, interest ≤ Rs 5,000, no instalment/final payment due, **and** no IRD file opened | **No return needed.** Still show the estimate if they want it. |
| IRD file exists | **Must file** (until the file is closed). |
| Anything else in scope | **File the Simplified Return.** Continue. |

"Fully subject to APIT" can't be confirmed from answers alone. After the calculation, if balance ≠ 0, the outcome changes to "must file". Show this as "Likely no return needed. We'll confirm after your numbers."

### 3.2 Add documents
| Document | Source | Fields captured |
|---|---|---|
| APIT certificate (annual, per employer) | Employer | Employer name, TIN, gross remuneration, APIT deducted, primary/secondary |
| Interest / AIT certificate (per account or per bank) | Bank | Bank, account ref (last 4 only), gross interest, AIT deducted, period |
| Bank statement (optional, fallback) | Internet banking PDF | Interest credits, tax lines |

- **Input methods:** PDF upload (including password-protected; the user types the password, which is used once and never stored), photo/camera, or **manual entry**. Manual entry must always work.
- **Parsing:** best-effort extraction pre-fills fields. The user must **confirm every figure** before it is used. Each figure stores `source: {docId, page, method: parsed|manual}`.
- **Missing-certificate prompt:** if the user lists a bank with no certificate, offer a request letter (EN/SI/TA) noting that certificates must be issued free of charge (notice §10.5).
- **Sanity checks:** AIT ≈ 10% of gross interest (±1%), else warn ("Is this the net figure?"). APIT ≤ gross remuneration. Period falls within YA.

### 3.3 Result screen (the "one screen")
```
┌────────────────────────────────────────────┐
│  YA 2025/26 · Simplified Return            │
│                                            │
│   You owe  Rs 11,200                       │  ← or "You're owed Rs 30,000"
│   Pay by 30 Sep 2026 (passed: penalty may  │     or "Nothing to pay"
│   apply) · File by 30 Nov 2026             │
│                                            │
│  ▸ How we worked it out                    │  ← expandable full working
│  ▸ Where each number came from             │
│  ▸ What to type into RAMIS                 │
│  [ Export PDF ]  [ Change figures ]        │
└────────────────────────────────────────────┘
```
- Date-aware banners: deadline countdown; overdue final payment warns of the 20% penalty + 1.5%/month and links to "how to pay" (info only).
- Always shows "Estimate based on what you entered · Rules for YA 2025/26 · Source: IRD guide".

### 3.4 RAMIS filing guide
- Step-by-step walkthrough mirroring RAMIS screens: log in → select YA → Simplified Return → each field → declaration → submit.
- For each field: label as RAMIS shows it, value to enter, source document, and a **"Check pre-filled value"** step. RAMIS pre-fills employment and interest data, so the main job is **comparing** pre-fill against the certificates and flagging mismatches.
- Screenshots or field names need capturing from RAMIS. **Open task: map the Simplified Return fields** (§10).

### 3.5 Export
- PDF "Tax pack": summary, working, document list, RAMIS field values, and a disclaimer. Used for the user's records and for a helper/accountant.
- JSON export/import of the user's data (backup, device change).

## 4. Calculation engine

Pure function; no I/O. Inputs are confirmed figures plus a rules file.

```
assessable   = Σ employment.gross + Σ interest.gross
relief       = min(rules.reliefs.personal.amount, assessable)
taxable      = assessable − relief
tax          = progressive(taxable, rules.progressiveRates.bands)
credits      = Σ apit.primary + Σ apit.secondary + Σ interest.ait
balance      = tax − credits          // > 0 payable, < 0 refund
```

- Integer rupees internally; round each band to the nearest rupee, matching the IRD example.
- Output includes a **trace**: every line with its formula, the rule used (with source citation) and the input IDs.
- Rules are loaded by YA. If the YA's file is missing or `status != "enacted"`, refuse with "Rules for this year aren't confirmed yet."

### 4.1 Required test cases (must pass before release)
| ID | Scenario | Employment | APIT | Interest | AIT | Expected tax | Expected balance |
|---|---|---|---|---|---|---|---|
| T1 | **IRD guide Example 01** | 2,880,000 | 74,400 | 140,000 | 14,000 | 99,600 | **+11,200** |
| T2 | Mid earner: interest under-taxed | 3,600,000 | 222,000 | 600,000 | 60,000 | 390,000 | **+108,000** |
| T3 | Below threshold: refund | 1,440,000 | 0 | 300,000 | 30,000 | 0 | **−30,000** |
| T4 | High earner | 6,000,000 | 1,032,000 | 2,000,000 | 200,000 | 1,752,000 | **+520,000** |
| T5 | Relief exceeds income | 0 | 0 | 900,000 | 90,000 | 0 | −90,000 |
| T6 | Salary only, APIT exact | 3,600,000 | 222,000 | 0 | 0 | 222,000 | 0 → "no return needed" (if no file) |
| T7 | Interest ≤ 5,000 edge | 3,600,000 | 222,000 | 5,000 | 500 | 223,200 | +700 → **must file** (balance ≠ 0) |

T1 comes from IRD. T2–T7 are computed from verified rules (APIT assumed to be tax on salary alone after relief). Add secondary-employer cases once the APIT tax tables are verified.

## 5. Rules engine

- One file per YA: `rules/ya-YYYY-YY.json` (YA 2025/26 done).
- Every value carries `source`. The file carries `status` (`enacted` | `proposed`) and `verifiedOn`.
- The app shows rule provenance in the "How we worked it out" panel.
- Updates ship as a signed rules bundle, so no app release is needed. Clients verify the signature.
- **Annual process:** after each Budget/amendment, create the next YA file as `proposed`, then promote it to `enacted` with the IRD guide citation.

## 6. Data model (on-device)

```ts
Profile      { id, language, residentConfirmed, hasIrdFile, tin? }      // TIN optional, masked
TaxYear      { ya: "2025/2026", profileId, eligibility: {...}, status }
Document     { id, kind: "apit_cert"|"interest_cert"|"statement", fileRef, addedAt }
Employment   { id, ya, employerName, employerTin?, isPrimary, gross, apit, sourceDocId?, method }
Interest     { id, ya, institution, accountLast4, gross, ait, sourceDocId?, method }
Result       { ya, rulesVersion, inputsHash, assessable, taxable, tax, credits, balance, trace[] }
```

- No NIC, full account numbers or passwords stored.
- `Result` is snapshotted with `rulesVersion` + `inputsHash`, so a past result can be re-explained later.

## 7. Platform & architecture

- **Mobile-first PWA** (installable, works offline after first load, runs on mid-range Android, no app-store gatekeeping). Native app later if needed.
- **All processing on-device:** IndexedDB (encrypted with a key derived from a user PIN), pdf.js for PDF text, on-device OCR (e.g. Tesseract.js) behind a "photo" option.
- **Backend (minimal):** static hosting + rules bundle + (optional) anonymous crash reporting. **No user financial data leaves the device** in MVP.
- **"Delete everything"** wipes all local data in one tap.

## 8. Language & content

- All UI strings and tax terms in EN/SI/TA from day one. The glossary is reviewed by a native-speaking tax practitioner, not machine translation.
- Use RAMIS's own terms (e.g. "Return of Income", "Simplified Return", "APIT", "AIT") with plain-language explanations.
- Language switcher on every screen.

## 9. Trust, legal & safety

- Disclaimers: "estimate", "not tax advice", "you submit in RAMIS yourself". No IRD logo, no "IRD approved".
- Anti-phishing: no links in any SMS/notification. A published "we will never ask for your password/OTP" statement. One official domain.
- PDPA (core provisions effective 1 Jan 2027): privacy notice, consent for optional telemetry, on-device by default. Even before the law applies, build as if it already does.
- Escalation copy for anything uncertain: "Talk to IRD (hotline) or a registered tax practitioner."

## 10. Open questions / tasks before build

1. **Map Simplified Return fields in RAMIS** (needs a walkthrough by someone with a TIN). This is a blocker for §3.4.
2. Collect 5–10 **redacted** APIT and bank interest certificates (BOC, People's, Commercial, HNB, Sampath, NSB) for parser design.
3. Verify **APIT tax tables** (primary vs secondary employer) for YA 2025/26, which are needed for secondary-employer handling and T6/T7 assumptions.
4. Confirm whether the **senior-citizen interest exemption** exists (currently treated as not available).
5. Confirm YA 2026/27 rules when IRD publishes the guide (needed by Apr 2027 for the next filing season).
6. Name, domain, branding; native-speaker reviewers for SI/TA.
7. Funding model for MVP (free tier is the plan).

## 11. Timeline reality check

- YA 2025/26 returns are due **30 Nov 2026** (23 days away). The full MVP will **not** be ready for this season.
- **Option A (now):** ship a **calculator-only web page** (eligibility + manual entry + result + working) before 30 Nov. Low effort, real user feedback.
- **Option B (main):** the full MVP for the **YA 2026/27 season** (returns due 30 Nov 2027). Target beta by Aug 2027.

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Calculation engine + rules loader | T1–T7 pass; trace output complete |
| M1 | Calculator web page (Option A) | Eligibility + manual entry + result in EN; deployed |
| M2 | Languages | SI/TA reviewed glossary; all screens translated |
| M3 | Document capture | Manual + PDF parse for 3 banks + 1 employer cert format; confirm step |
| M4 | RAMIS guide | Simplified Return field map + mismatch checker |
| M5 | Export + vault | PDF pack, encrypted storage, delete-all |
| M6 | Beta | 30 real users file with it; zero calculation mismatches vs RAMIS |

## 13. Success metrics

- % users who reach the Result screen (target > 70% of starters).
- Calculation mismatches reported vs RAMIS (target 0).
- Users who discover a refund or an unexpected balance (the "aha" rate).
- Time from start to result (target < 10 minutes with certificates in hand).
