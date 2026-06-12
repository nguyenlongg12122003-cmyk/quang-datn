# Implementation Plan: B2B Quotation ("Báo giá B2B") Improvements

**STATUS (2026-06-12):** 
- Phase 0 + Phase 1 (cancel, discount removal, explanations, eager expire, draft cleanup) **COMPLETED**.
- Phase 2 (admin PATCH with full itemPriceOverrides + recompute + admin UI inline editor for lines) **COMPLETED**.
- Phase 3 (canonical pricing comments + improved hasWholesale filter + MIRROR comments across duplicates) **COMPLETED**.
- Testing guide created at `docs/B2B_QUOTATION_TESTING_GUIDE.md`.

All critical recommendations addressed. Remaining: deeper pricing migration (optional) and full test runner addition.

## Overview
This plan addresses the 9 specific problem areas and recommendations for the B2B quotation feature. The current flow (approved business profile → cart → CreateQuotationDialog (user-controlled `discount`, always `status='sent'`) → server re-prices via `priceService` using `users.customerType` + `groupPrices`/`wholesalePrice`/`packagingUnits` + customization → admin binary accept/reject/expire via `PATCH /:id/status` → user converts only `'accepted'` quotes (with client+server credit checks in `ConvertQuotationDialog` + `orderService.createOrderTransaction`)) has several issues: user discount abuse potential, no negotiation/edit, no user cancel, unused `'draft'`, lazy-only expiration, severe duplication (types, `QuotationItemsList`, `quotation-utils`, `quotation-print`, `product.ts` pricing mirror of `priceService`), opaque B2B vs retail pricing, and pricing complexity with legacy fields + catalog filter skew.

The plan uses **incremental, safe phases** (high-impact/low-risk first), prefers **no new DB migrations** (reuse `discount`, `note`, `validUntil`, `status`, `updatedAt` on `quotations` + `unitPrice` on `quotation_items`), defines exact API contracts, specifies every file (relative paths from `D:\Theris\QuangProject`), includes TDD/verification steps per ECC guidelines (immutability, small focused functions, 80%+ coverage intent, security-first), backward compat for existing quotations/orders, and risk analysis. Changes are grouped to enable incremental testing and merging.

**Core principles applied (from ECC + project):**
- Plan before code.
- Backend is authoritative for pricing, totals, authz, and state transitions.
- Immutability: always produce new objects/rows; never mutate in place.
- Small functions (<50 LOC where practical).
- Validate at boundaries; never trust client (discount, prices, status, ownership).
- Existing snapshots in `quotation_items.unitPrice` + `quotations.{subtotal,discount,total}` remain for converted orders and historical quotes.

## Requirements
- Users can cancel their own `'sent'` (pending) quotations (new status handling for `'cancelled'`).
- User-provided `discount` at creation is removed/limited (server hardcodes 0 or ignores; control moves to admin).
- Admin can edit a `'sent'` quotation (discount, `validUntil`, `note`, and ideally per-line `unitPrice` overrides) before accept/reject; totals recomputed server-side.
- Clear, consistent user-facing UI that B2B/wholesale/enterprise pricing (via `customerType`) is applied (badges, callouts, dialog text, PurchasePanel/Cart/QuotationsPage).
- Clean up `'draft'`: deprecate for new flows (keep for read/seed compat); always create as `'sent'`.
- Improve expiration (eager calls on more paths + explicit handling; still lazy on lists).
- Pricing complexity: recommend canonical precedence model + migration notes; at minimum deduplicate helpers + fix `hasWholesale` filter skew.
- Reduce duplication where practical (pure utils, shared types note, keep components in sync or extract comments; no forced monorepo shared package in early phases due to CJS vs ESM + separate Vite apps).
- Strengthen backend security/validations (ownership, status guards, server-only discount, input sanitization, credit re-validation on convert remains).

**Success criteria (checklist at end of plan):**
- [ ] User can cancel own `'sent'` quote (UI + API + state update).
- [ ] New quotes created with `discount=0` (user field removed from UI/payload; server ignores/rejects).
- [ ] Admin can successfully PATCH edit key fields + line prices on `'sent'` quotes; totals update; user sees changes.
- [ ] B2B pricing explanations visible in ≥4 key surfaces (PurchasePanel, Cart, Create dialog, Quotation list).
- [ ] `'draft'` removed from creation path + docs; old data readable.
- [ ] Expiration evaluated on cancel/convert/edit/status paths.
- [ ] Pricing helpers deduped (comments + tests); `hasWholesale` filter updated; canonical model documented.
- [ ] No breakage for existing quotes, converted orders, or seed data.
- [ ] Key paths covered by tests/verification (new logic has unit/integration checks); lint/build pass.
- [ ] Security: all new endpoints use proper middleware; client discount ignored server-side.

## Architecture Changes
- **Backend**:
  - `backend/src/routes/quotationRoute.js`: Add user cancel handler, admin edit PATCH (recompute logic), harden POST create (ignore discount), call expireStale more eagerly, extend VALID_STATUSES, update build/map fns if needed (pure where possible).
  - `backend/src/services/priceService.js`: Add/expand pure helpers + canonical comments (no behavior change initially). Export for potential reuse.
  - `backend/src/routes/catalogRoute.js`: Update `hasWholesale` filter condition.
  - No new tables/columns. `status` nvarchar accepts new `'cancelled'`.
  - `backend/src/seed/mockSeed.js`: Optional cleanup of sample `'draft'` or note.
  - (Future) Add simple test files (e.g. via Jest/Supertest once runner added).

- **Frontend (user)**:
  - `frontend-user/src/features/quotations/`: Update `api.ts` (new cancel), `CreateQuotationDialog.tsx` (remove discount), `QuotationsPage.tsx` + `QuotationCard` (cancel button + B2B badge), `quotation-utils.ts` (new `canCancelQuotation`, update labels/expired logic), `Convert...` if needed.
  - `frontend-user/src/pages/CartPage.tsx`: Add B2B explanation near quote button.
  - `frontend-user/src/features/product/PurchasePanel.tsx`: Add customerType-aware B2B badge/callout (uses existing `useAuthStore` + `customerType`).
  - `frontend-user/src/lib/`: `constants.ts` (add `CUSTOMER_TYPE_LABELS` + `'cancelled'` to labels), `product.ts` (sync comments with backend), `api/endpoints/quotations.ts` (types + cancel fn), types unchanged (add `'cancelled'` to `QuotationStatus` union).
  - `frontend-user/src/lib/api/endpoints/quotations.ts`: Payload without `discount`.

- **Frontend (admin)**:
  - `frontend-admin/src/features/quotations/`: New or extended edit UI in `AdminQuotationsPage.tsx` + `QuotationAdminCard` (edit dialog/sheet for discount/validUntil/note/lines), update `api.ts` (new edit mutation), `quotation-utils.ts` (add cancel support + labels), `QuotationItemsList.tsx` (minor for edit mode?).
  - `frontend-admin/src/lib/api/endpoints/quotations.ts`: Add `update` (PATCH) + `cancel`.
  - `frontend-admin/src/lib/constants.ts`: Already has `CUSTOMER_TYPE_LABELS`; ensure `'cancelled'`.
  - `frontend-admin/src/pages/admin/AdminQuotationsPage.tsx`: Wire edit controls.
  - Types: Add `'cancelled'`.

- **Shared/duplication notes**:
  - `QuotationItemsList.tsx` and print fns are near-identical with minor view differences (customer vs admin block) — keep duplicated for now (high sync risk); add header comments "MIRROR: keep in sync with sibling frontend".
  - `quotation-utils.ts` nearly identical — extract pure fns + document.
  - Full types copy-pasted — note in both "Source of truth: backend/API_DOCS... + keep synced".
  - Pricing: `frontend-user/src/lib/product.ts` mirrors `backend/src/services/priceService.js` — add "CANONICAL: see backend priceService + update both on changes".
  - No new shared package in Phase 1-2 (risk to build/CI). Consider root `shared/` + build step in Phase 3+.

- **Other**:
  - `backend/API_DOCS_FOR_FRONTEND_AGENT.md`: Add/update quotation sections (new PATCH, POST cancel, create contract change).
  - Add `docs/B2B_QUOTATION_IMPROVEMENT_PLAN.md` (this plan) + perhaps `docs/pricing-canonical.md`.
  - No change to `orderService` (conversion from quote still passes stored `discount` + re-validates credit for `'credit'` method).
  - Cart items remain price snapshots at add time (document discrepancy risk).

## Implementation Steps

### Phase 0: Prep, Audit, Docs, Test Foundation (Low risk, enables everything)
1. **Create docs + capture baseline** (Files: `docs/B2B_QUOTATION_IMPROVEMENT_PLAN.md` (write this plan), `backend/API_DOCS_FOR_FRONTEND_AGENT.md` (append quotation contracts if missing))
   - Action: mkdir docs if needed; paste full plan; audit current quotation flows (list all call sites via grep); document current API exactly from code.
   - Why: Single source for team; baseline for regression.
   - Dependencies: None.
   - Risk: Low. TDD: Manual verification of existing happy paths (create → list → admin accept → convert).

2. **Add 'cancelled' to types + labels + VALID** (Files: `frontend-user/src/types/index.ts`, `frontend-admin/src/types/index.ts`, `frontend-user/src/lib/constants.ts`, `frontend-admin/src/lib/constants.ts`, `backend/src/routes/quotationRoute.js`)
   - Action: Extend `QuotationStatus` union and `QUOTATION_STATUS_LABELS` (add `cancelled: 'Đã hủy'`); update `VALID_STATUSES` array in backend (include 'cancelled'); update `EXPIRABLE_STATUSES` if needed (exclude cancelled).
   - Why: Backward-compat string value; enables cancel without new columns.
   - Dependencies: None.
   - Risk: Low (string enum-like).

3. **Update expiration helper + add eager calls** (File: `backend/src/routes/quotationRoute.js`)
   - Action: Refactor `expireStaleQuotations` to be idempotent/pure where possible; call it inside `PATCH /:id/status`, `POST /:id/convert`, and new cancel/edit handlers (before status checks). Keep lazy on GETs.
   - Why: Reduces "stale visible until refresh" complaints.
   - Dependencies: Step 2.
   - Risk: Low. TDD: Verify with a quote having past `validUntil` — list shows expired; convert attempt fails.

4. **(Optional but recommended) Add minimal test scaffolding** (per ECC)
   - Action: Add `vitest` + `@testing-library/react` + `supertest` (or jest) to relevant package.json; create `backend/src/routes/__tests__/quotation.test.js` skeleton + FE test stubs for utils.
   - Why: Enables TDD for new endpoints.
   - Risk: Medium (new deps/CI); scope to quotation modules only.

### Phase 1: Quick Wins — Cancel + Discount Removal + Explanations + Draft Cleanup (High impact, low-medium risk)
5. **Implement user self-cancel for pending quotes** (Files: `backend/src/routes/quotationRoute.js` (new `router.post('/:id/cancel', authMiddleware, ...)` — load, expire, ownership check (`userId === req.user.userId`), status must be 'sent' (post-expire), set 'cancelled' + updatedAt, return updated), `frontend-user/src/lib/api/endpoints/quotations.ts` (add `cancel(id)`), `frontend-user/src/features/quotations/api.ts` (add `useCancelQuotation` mutation + invalidate), `frontend-user/src/features/quotations/quotation-utils.ts` (add `canCancelQuotation(q: Quotation): boolean { return q.status === 'sent' && !isQuotationExpired(q) && !q.convertedOrderId; }`), `frontend-user/src/pages/QuotationsPage.tsx` + `QuotationCard` (show Cancel button when `canCancelQuotation`, wire mutation + toast + confirm), update `getQuotationStatusLabel` to treat cancelled correctly).
   - Admin side (bonus same phase): wire similar in admin card if desired (admin can force-cancel).
   - API contract: `POST /api/quotations/:id/cancel` (auth, 200 `{message, quotation?}` or just message; errors 403/400/404). Idempotent (already cancelled ok?).
   - Why: Directly addresses #1; user empowerment without admin.
   - Dependencies: Phase 0 (types + expire eager).
   - Risk: Medium (state machine change). Mitigate: server re-checks expiration/ownership. TDD: Write test for cancel happy + unauthorized + expired cases first (RED), implement (GREEN).

6. **Remove/limit user discount at creation** (Files: `backend/src/routes/quotationRoute.js` (in POST `/`: destructure but ignore `discount` or `const normalizedDiscount = 0;`, add comment "User discount removed per B2B negotiation policy; admin edits later"), `frontend-user/src/lib/api/endpoints/quotations.ts` (remove `discount` from `CreateQuotationPayload`), `frontend-user/src/features/quotations/CreateQuotationDialog.tsx` (remove discount input/state/submit field + interface), `frontend-user/src/pages/CartPage.tsx` (payload no longer spreads discount), update any callers/docs).
   - API contract update: POST create body no longer documents `discount`; server always uses 0 for new rows.
   - Why: Addresses #2 (abuse vector); moves power to admin edit.
   - Dependencies: None (independent of cancel).
   - Risk: Low (existing rows keep their discount; new ones 0). Backward: old quotes unaffected. TDD: Assert create response has `discount: 0` even if client sends value.

7. **Add clear B2B pricing explanations (UI only + minor backend enrichment)** (Files: `frontend-user/src/features/product/PurchasePanel.tsx` (after customerType fetch, if !== 'retail' render badge/callout "Giá {CUSTOMER_TYPE_LABELS[customerType]} đang áp dụng (theo hồ sơ DN đã duyệt của bạn)"), `frontend-user/src/pages/CartPage.tsx` (near "Tạo báo giá B2B" button: small text "Giá B2B sẽ được áp dụng khi tạo báo giá dựa trên customerType của tài khoản."), `frontend-user/src/features/quotations/CreateQuotationDialog.tsx` (enhance description: "Tạm tính giỏ hàng (giá bán lẻ hiện tại). Báo giá sẽ được tính lại theo giá B2B/sỉ/đại lý theo hồ sơ doanh nghiệp của bạn và gửi admin duyệt. Bạn có thể hủy báo giá đang chờ ('Đã gửi') trước khi admin duyệt."), `frontend-user/src/pages/QuotationsPage.tsx` + cards (subtle "B2B pricing applied" if user has profile), optional: backend quotation response can include `pricingNote` or just rely on client), sync `CUSTOMER_TYPE_LABELS` to user `constants.ts` (copy from admin), update `frontend-user/src/lib/product.ts` header comment.
   - Why: Addresses #4; reduces surprise "cart price != quote price".
   - Dependencies: Phase 1 step 6 (dialog changes).
   - Risk: Very low. Note cart snapshot vs server reprice (document in UI: "Giá trong giỏ là snapshot lúc thêm; báo giá dùng giá hiện tại theo hồ sơ DN").

8. **Draft cleanup + minor expiration/UX polish** (Files: `backend/src/routes/quotationRoute.js` (keep 'draft' in VALID for reads; creation still hardcodes 'sent'; add comment "draft deprecated for creation — legacy seed data only"), update seed note or leave quo-004, `frontend-user/src/features/quotations/quotation-utils.ts` + pages (remove or de-emphasize draft in filters/labels if shown), admin list filter already supports via labels).
   - Also: ensure `isQuotationExpired` + label logic treats 'cancelled' + 'converted' correctly (no auto-expire).
   - Why: Addresses #5.
   - Risk: Low.

**Phase 1 verification**: Manual E2E (approved user: add to cart at B2B price → create quote (discount=0) → see explanations + cancel button → cancel → list shows 'Đã hủy'; admin sees it; non-owner cannot cancel). Run any new tests.

### Phase 2: Admin Negotiation/Edit Capability (Core value, medium risk)
9. **Backend admin edit endpoint + recompute** (File: `backend/src/routes/quotationRoute.js`)
   - Action: Add `router.patch('/:id', authMiddleware, adminMiddleware, async ...)` 
     - Load quotation + items (authz already in GET but re-validate admin).
     - Only allow if current (post-expire) status in `['sent', 'draft']` (not accepted/rejected/converted/cancelled/expired).
     - Body schema (validate): `{ discount?: number (>=0), validUntil?: string (parsable future date), note?: string | null, itemPriceOverrides?: Record<number, {unitPrice: number}> }` (item id from quotation_items.id).
     - Apply: immutable copies; if overrides, update matching items' unitPrice (keep qty/pack/customization as snapshot), recalc `subtotal = sum(unitPrice * quantity)`, `total = max(0, subtotal - discount)`.
     - Persist: UPDATE quotations (discount, validUntil, note, subtotal, total, updatedAt); UPDATE quotation_items for changed unitPrices.
     - Return full mapped quotation (like GET).
     - Also call expire first.
   - Harden create further if needed.
   - API contract:
     ```
     PATCH /api/quotations/:id
     Auth: admin
     Body (partial):
     {
       "discount": 150000,
       "validUntil": "2026-07-20T23:59:59Z",
       "note": "Giá đã điều chỉnh theo đàm phán",
       "itemPriceOverrides": { "123": { "unitPrice": 4800 } }  // quotation_items.id
     }
     200: full Quotation (with updated fields + items)
     Errors: 400 (invalid status/fields/negative), 403/404, 409 (already converted)
     ```
   - Why: Addresses #3 (negotiation). Snapshot model preserved for orders.
   - Dependencies: Phase 1 (cancel + discount removal; status handling).
   - Risk: **Medium-High** (recompute invariants, existing data, concurrent edits). Mitigations: server recomputes everything; optimistic locking via updatedAt (optional simple check); only on 'sent'; tests for subtotal/total math + overrides + no-override case. Never touch convertedOrderId.

10. **Admin frontend edit UI + wiring** (Files: `frontend-admin/src/lib/api/endpoints/quotations.ts` (add `update(id, patch: Partial<...>)`), `frontend-admin/src/features/quotations/api.ts` (add `useUpdateQuotation` or extend), `frontend-admin/src/features/quotations/QuotationItemsList.tsx` (perhaps make editable rows in edit mode or use separate form), `frontend-admin/src/pages/admin/AdminQuotationsPage.tsx` + `QuotationAdminCard` (when 'sent' && !expired: "Chỉnh sửa" button → Dialog/Sheet with inputs for discount, date picker for validUntil, textarea note, table of items with editable unitPrice inputs (controlled, local state), "Preview total" computed client-side for UX, submit calls PATCH), reuse existing CurrencyInput/inputs, invalidate queries on success, toast. Update utils if needed for "editable" state).
    - Also expose cancel for admin.
    - Why: Usable negotiation UI.
    - Dependencies: Step 9 (backend first — TDD order).
    - Risk: Medium (form state, number parsing). Mitigate: server is source of truth; client preview only.

11. **Update quotation list/detail after edits + print compat** (Minor updates to both frontends' quotation pages, print (discount row already handles >0)).
    - TDD: Write failing integration test for PATCH (before/after totals) first.

**Phase 2 verification**: Admin edits discount + one line price on a 'sent' quote → user list refreshes (or manual) sees new total/subtotal/items + note → can still convert if later accepted. Try invalid cases (edit accepted quote → blocked).

### Phase 3: Pricing Cleanup, Duplication Reduction, Security Hardening, Polish (Addresses #7-9)
12. **Canonical pricing model + dedup + filter fix** (Files: `backend/src/services/priceService.js` (add top-level comment block with exact precedence + examples from seed level2 overrides), `backend/src/routes/catalogRoute.js` (update hasWholesale condition: `... OR (groupPrices IS NOT NULL AND LEN(groupPrices) > 2) OR (packagingUnits IS NOT NULL AND packagingUnits LIKE '%"price"%')` — test the TSQL), `frontend-user/src/lib/product.ts` (identical comment + "MUST stay in sync with backend priceService; changes here require backend change + test"), update `backend/src/utils/mapRows.js` / seed comments if needed. Add pure helper tests for priceService (e.g. packaging + groupPrices + flash + customization combos). Optional: expose a backend "price preview" util or lightweight endpoint for cart reprice warning.
    - Recommend (doc only): Future migration — backfill groupPrices from wholesalePrice where missing; add product flag `hasB2BPricing`; deprecate wholesalePrice column (read-only fallback).
    - Why: Addresses #7.
    - Risk: Medium (filter SQL edge cases on old data). Test with seed products that use groupPrices only.

13. **Duplication reduction & shared knowledge** (Files: Add comments in all 4-5 duplicated files (types, utils, lists, print, product/pricing); update `frontend-user/src/features/quotations/quotation-utils.ts` and admin sibling to share more pure logic if easy (e.g. move common to a `lib/quotation.ts` in each or accept dupe); update API docs with "B2B pricing model" section + "Quotation lifecycle & edit rules". Consider lightweight shared types via copy or future workspace package.
    - Strengthen security: in new edit/cancel, add rate limiting notes (if global middleware exists), strict input validation (zod or manual Number.isFinite), ensure no PII leak in errors.
    - Also: in quotation create/convert, ensure credit/business checks remain server-only where they matter.
    - Why: Addresses #8 + #9.

14. **Final polish, docs, verification, risks review** (All prior files + `backend/API_DOCS...`, root README if needed, any ProductCard/ProductGrid if they surface wholesale).
    - Run full manual flows + any tests.
    - Update seed/reseed if new statuses affect.
    - TDD: Add coverage for priceService canonical cases + edit math.

**Phase 3 verification**: Pricing filter now surfaces groupPrices-only products; UI shows consistent B2B messaging; old + new quotes behave; no dupe logic drift.

## Testing Strategy
- **Unit**: `priceService.js` (all resolution paths, edge: no tiers, packaging price vs tier, customization extra, flash), `quotation-utils.ts` (canCancel, isExpired, labels), status transitions.
- **Integration**: quotationRoute (create ignores discount, cancel ownership+status, admin PATCH with/without overrides + recompute totals, convert still works post-edit, expire on critical paths). Use in-memory or test DB where possible; supertest.
- **E2E / manual critical journeys** (use Playwright per ECC if harness exists, else documented steps):
  1. Approved B2B user: cart (see B2B prices/explain) → create quote (no discount field, explanations) → quotations list (B2B note, cancel available) → cancel → status 'cancelled'.
  2. Admin: list 'sent' → edit (discount + line price + validUntil + note) → save → totals change in response + user view → accept → user convert (uses possibly-edited discount/total).
  3. Non-approved / non-owner blocked.
  4. Expired quote: cannot cancel/convert/edit.
  5. Legacy quote (with old discount, 'draft', converted): readable, no regression.
- Coverage target: new/changed quotation + pricing modules ≥80%.
- Run before/after: `npm run lint/build/check`, seed reset + manual.

## Risks & Mitigations
- **Risk**: Price recompute or edit changes totals unexpectedly for users/admins (or floating point).
  - Mitigation: Server always recomputes from items; use DECIMAL; client preview matches server formula; clear "admin revised" in note.
- **Risk**: Stale cart prices vs server quote (or customerType change mid-flow).
  - Mitigation: UI explanations + "B2B reprice on quote" callouts; cart is snapshot by design (like orders).
- **Risk**: Existing seed/converted data breaks (quo-004 draft, old discounts, converted with discount).
  - Mitigation: No schema change; creation path only; conversion uses stored snapshot; document in plan + seed comments.
- **Risk**: Admin edit on quote that user is viewing/converting concurrently.
  - Mitigation: Simple updatedAt (future); status guard; last-write wins acceptable for this domain.
- **Risk**: Dupe components drift (QuotationItemsList, print, utils, types).
  - Mitigation: Explicit "MIRROR / KEEP IN SYNC" comments in every file; update both in same PR.
- **Risk**: Adding test runner/deps impacts CI or existing builds.
  - Mitigation: Phase 0 optional/scaffolding only; quotation tests can start with manual + node --check; full runner later.
- **Risk**: Catalog hasWholesale TSQL filter false positives/negatives on JSON.
  - Mitigation: Conservative LIKE/NULL checks; test with level2 seed products; fallback to client or note limitation.
- **Security risks (per ECC)**: Client discount, unauthorized status, price tampering, credit bypass.
  - Mitigation: Server ignores discount on create; all mutating routes use auth + role + ownership + status machine checks; credit only in orderService on convert; validate numbers/dates strictly; no secrets.
- **Backward/compat**: All old quotations load/display/convert exactly as before (except user can now cancel pre-admin ones, and admin can edit pre-accept).

## Implementation Order & Dependencies Summary
Phase 0 → Phase 1 (steps 5-8 independent-ish; do cancel + discount first) → Phase 2 (backend edit before FE) → Phase 3 (can run partially in parallel with 2).
Each phase produces mergeable value. Test after every phase.

## Success Criteria (full)
- [ ] All from "Requirements" + "Overview" checklist above.
- [ ] All new/changed code follows immutability, small fns, validation.
- [ ] 80%+ coverage intent on quotation + pricing paths (or documented verification).
- [ ] No hardcoded secrets, all inputs validated, proper authz.
- [ ] Docs updated (API + this plan + pricing model).
- [ ] Manual E2E journeys pass for happy + error paths.
- [ ] Existing converted orders + seed data unaffected.
- [ ] Builds/lint clean on all three packages.

---

**Plan generated by planner subagent on 2026-06-12. Execute Phase 1 first (quick wins).**