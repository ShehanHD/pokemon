# Card Detail — Inline Owned Copies List

**Date:** 2026-05-09
**Status:** Approved (design)
**Surface:** `app/(catalog)/cards/[id]/page.tsx`

## Problem

To edit, sell, or delete an owned copy today, the user must click a variant chip on the card detail page, which opens `CopiesDialog`. The dialog hosts both the add-form *and* the list of existing copies with inline edit/sell/delete. The detail page itself shows nothing about the user's actual copies — they're hidden behind a modal.

We want to surface the user's owned copies directly on the detail page so editing/selling/deleting does not require opening a dialog. The dialog remains the home for *adding* a new copy.

## Goals

- Owned copies are visible on the card detail page without opening a dialog.
- Edit, sell, and delete happen inline on the page.
- Adding a new copy continues to use `CopiesDialog` (opened via variant chip click).
- Other surfaces that use `CopiesDialog` (browse grid, search results) keep their full behavior unchanged.
- No additional database round-trips: reuse the `copies` array already fetched by the page.

## Non-Goals

- No raw↔graded type switching during inline edit (delete + re-add instead).
- No bulk operations (multi-select, bulk sell, bulk delete).
- No reordering, sorting, or filtering controls in v1.
- No changes to the variant chip layout or behavior.

---

## 1. Scope & Placement

A new "Your copies" section is appended **below** the existing details panel on the card detail page, inside the same right-column container, immediately under the details rows and **before** the back-to-set link.

The section is rendered only when:
- `userId` is present (authenticated), and
- `copies.length > 0`.

For non-authenticated users or cards with zero owned copies, the section is hidden entirely. The page looks unchanged from today in those cases.

`CopiesDialog`, when opened from the detail page, is slimmed to "add only" via a new `mode` prop. The detail page passes `mode="add"`, which hides the embedded copies list inside the dialog. All other call sites continue to use `mode="full"` (default).

## 2. Section Structure

Copies are **grouped by variant**. Each owned variant gets its own subsection:

```
Your copies
─────────────────────────────
NORMAL  ×2
  [row: Raw · NM · €4.20 · 2025-12-01   ✎ € ×]
  [row: Raw · LP · €3.10 · 2025-11-14   ✎ € ×]

REVERSE HOLO  ×1
  [row: PSA 9 · €38.00 · 2026-02-08     ✎ € ×]
```

Variant order matches the order produced by `chipsForCard(card, set)` so chips and sections share the same mental model. Variants with zero owned copies do **not** appear (no empty headers).

The section header (`Your copies`) uses the same typography pattern as the details rows above (small uppercase label, body text). Each variant subsection header shows the variant label and the copy count (`×N`).

## 3. Row — Read View

Each row is a single horizontal line summarizing one copy:

- **Raw:** `Raw · {condition} · €{cost} · {acquiredAt}` (cost and acquiredAt only when present)
- **Graded:** `{gradingCompany} {grade} · €{gradedValue} · {acquiredAt}`

Right-aligned action affordances (icon-only, with `aria-label`):
- `✎` Edit
- `€` Sell
- `×` Delete

Visual style: same `border border-surface0 bg-base rounded` row treatment used elsewhere in the catalog. Hover raises the actions subtly; no other state changes.

## 4. Row — Edit / Sell / Delete Interaction

Click on `✎`, `€`, or `×` switches the row into a corresponding inline mode. Only one row across the section can be in a non-read mode at any time — opening a second row's mode collapses any other open row.

- **Edit mode**: row expands downward into a form mirroring `CopiesDialog`'s edit form (raw vs graded fields chosen by the existing `type`). `[Save] [Cancel]`. Save calls `updateUserCard` server action with `userCardInputSchema`. Cancel collapses without changes. **Type switching (raw↔graded) is not allowed**; the mismatch with the discriminated union and the cognitive cost outweighs the benefit. Users delete + re-add to switch types.
- **Sell mode**: row expands into `[Sold price] [Sold date] [Mark sold] [Cancel]`, mirroring the existing inline-sell pattern in `CopiesDialog`. Calls `markUserCardAsSold` with `markAsSoldInputSchema`.
- **Delete mode**: row collapses to a `Are you sure? [Delete] [Cancel]` confirmation strip. Calls `removeUserCard`.

Save/sell/delete actions show a transient pending state (button disabled, label "Saving…" / "Selling…" / "Deleting…"). On success, the action returns and the page revalidates via the existing `revalidatePath` calls in the server actions; the new copies array flows back through props on next render.

## 5. Component Breakdown

New components in `components/collection/`:

### `OwnedCopiesList.tsx` (client component)
Props:
- `cardId: string`
- `card: Card`
- `set: Set | null`
- `copies: UserCard[]`

Responsibilities:
- Group copies by variant in chip order.
- Render variant subsections.
- Owns the `mode: { type: 'edit' | 'sell' | 'delete', userCardId: string } | null` state, so opening one row's mode collapses any other open row.
- Renders one `<OwnedCopyRow>` per copy, passes the row's mode.

### `OwnedCopyRow.tsx` (client component)
Props:
- `copy: UserCard`
- `cardId: string`
- `mode: 'read' | 'edit' | 'sell' | 'delete'`
- `onEnterMode(mode)`, `onLeaveMode()`

Responsibilities:
- Render read view, edit form, sell form, or delete confirmation based on `mode`.
- Call the appropriate server action and call `onLeaveMode()` on success.
- Uses `userCardInputSchema` for client-side parsing before submitting (mirrors `CopiesDialog`).

### `CopiesDialog.tsx` (existing — modified)
Add prop:
- `mode?: 'full' | 'add'` (default `'full'`)

When `mode === 'add'`:
- Hide the embedded existing-copies list and its inline edit/sell/delete UI.
- Show only the add form.
- Title remains "Add copy — {variant}" or similar.

All existing call sites (`OwnedCounter`, `CardsGrid`, `CardSearchResult`) default to `'full'` except `OwnedCounter`, which passes `'add'`.

### `app/(catalog)/cards/[id]/page.tsx` (existing — modified)
- After the details panel, when `userId && copies.length > 0`, render `<OwnedCopiesList cardId={card.pokemontcg_id} card={card} set={set} copies={copies} />`.
- No change to data fetching: the `copies` already exist in the `Promise.all`.

## 6. Server Actions & Validation

All three actions already exist in `app/(catalog)/cards/[id]/actions.ts`:
- `updateUserCard(userCardId, cardId, input)` → parses with `userCardInputSchema`, updates by `_id`, revalidates `/cards/[id]` + layout.
- `markUserCardAsSold(userCardId, cardId, input)` → parses with `markAsSoldInputSchema`, sets `status: 'sold'`, revalidates `/cards/[id]`, `/sold`, layout.
- `removeUserCard(userCardId, cardId)` → deletes by `_id`, revalidates `/cards/[id]` + layout.

No schema changes are required. Both Zod schemas (`userCardInputSchema`, `markAsSoldInputSchema`) are already the source of truth and are reused unchanged.

## 7. Empty / Error / Loading States

- **Zero owned copies**: section not rendered. The page looks identical to today's.
- **Server action error**: surface inline at the row, using the same error-message pattern as `CopiesDialog` (small red text below the form). Form stays open so the user can retry or cancel.
- **Loading**: inline buttons disable + show pending labels. No section-level skeleton — the section is server-rendered and present on first paint.
- **Placement order in the right column**: `Your copies` appears **before** the back-to-set link, immediately under the details rows (so it's not hidden below an outbound link).

## 8. Testing

Manual:
- Card with 0 copies: section absent.
- Card with copies in 1 variant: one subsection, correct count.
- Card with copies in 2+ variants: subsections in chip order.
- Edit raw copy: form prefilled, save updates row, no page reload.
- Edit graded copy: graded fields shown, save updates row.
- Sell: row disappears (status becomes `sold`), shows up under `/sold`.
- Delete: confirmation strip, confirm removes the row; cancel restores read view.
- Open one row's edit, then click another row's edit: first collapses.
- Browse grid + search results: clicking a card's chip still opens the full dialog with the embedded copies list (regression check).

Validation:
- Submitting invalid edit input is rejected client-side via `userCardInputSchema.safeParse`; server action also re-parses.

---

## Out of Scope (Future)

- Filter / sort controls on the inline list.
- Bulk select + bulk actions.
- Inline raw↔graded type switching.
- Per-row notes preview.
