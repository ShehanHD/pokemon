# Scroll Restoration

Status: shipped 2026-05-13

## Problem

Catalog navigation kept losing the user's place:

- `/browse` → click set → set page → back: returned to top of `/browse`.
- Set page → click card → card detail → back: returned to top of the card grid.

Next.js App Router defaults to resetting `scrollTop` to 0 on navigation, and the
app's scroll container is `<main className="flex-1 overflow-y-auto p-4">` — not
the window — so the framework's built-in restoration doesn't apply.

## Solution

Element-anchored scroll restoration in `components/layout/ScrollRestorer.tsx`,
mounted inside `<main>` in both `(app)/layout.tsx` and `(catalog)/layout.tsx`.

### Save

1. Listen to `scroll` on the `<main>` element.
2. Debounce 150 ms after the last scroll event ("settle") — this drops momentum
   frames so we record the position the user paused on, not where their flick
   coasted to.
3. Find the topmost `[id]` element inside `<main>` whose top is at or near the
   viewport top (`>= -8 px`) and store `{ id, offset }` plus a pixel fallback
   in `sessionStorage` under `pv:scroll:${pathname}${?search}`.
4. Skip persisting `scrollTop === 0` unless the user actually scrolled there
   (proven by a recent `wheel` / `touchmove` / `keydown`). This prevents
   Next.js's programmatic reset-to-0 on navigation from clobbering a real
   saved position.

### Restore (in `useLayoutEffect`)

1. Read the stored payload.
2. If anchor form: locate element by id; `desired = scrollTop + (currentOffset − savedOffset)`.
3. If pixel form (or anchor element missing): `desired = savedScrollTop`.
4. Clamp to `[0, scrollHeight − clientHeight]` and apply.
5. Re-run on `requestAnimationFrame` for up to 1.5 s — content height grows as
   images and lazy grid rows resolve, so we must keep correcting until we
   actually sit at the desired position.
6. Abort the loop the moment the user interacts (`wheel` / `touchstart` /
   `keydown`) — never fight the user.

### Stable IDs

Element-anchored only works if grid items have stable IDs:

- `components/catalog/SetCard.tsx` — root: `id={`set-${set.tcgdex_id}`}`
- `components/catalog/CardSearchResult.tsx` — root: `id={`card-${card.pokemontcg_id}`}`
- `components/catalog/CardsGrid.tsx` — tile root: `id={`card-${card.pokemontcg_id}`}`

## Why element-anchored, not pixel-only

Pixel-based restoration landed on the saved `scrollTop` exactly, but the
*visual* position was wrong because content height between save and restore
differed (lazy-loaded card images, grid reflow). Anchoring to a DOM element
that exists in both renders pins the same card to the same viewport offset,
which survives layout shifts.

## Storage format

```ts
type Stored =
  | { kind: 'anchor'; anchor: { id: string; offset: number }; scrollTop: number }
  | { kind: 'pixel'; scrollTop: number }
```

Legacy bare-number entries are still parsed for backwards compatibility.

## Files

- `components/layout/ScrollRestorer.tsx` — save/restore logic.
- `components/catalog/SetCard.tsx` — stable set id.
- `components/catalog/CardSearchResult.tsx` — stable card id.
- `components/catalog/CardsGrid.tsx` — stable card id.
- `app/(app)/layout.tsx`, `app/(catalog)/layout.tsx` — mounts `<ScrollRestorer />`.
