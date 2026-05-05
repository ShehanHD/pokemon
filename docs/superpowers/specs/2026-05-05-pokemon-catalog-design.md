# Pokemon TCG Catalog — Design Spec

**Date:** 2026-05-05  
**Status:** Approved

---

## Overview

A web app for cataloging and tracking Pokémon TCG cards, targeting Italian collectors (EUR pricing via Cardmarket). Built as a personal tool first, designed to grow into a community platform. Revenue via freemium subscriptions and AdSense.

---

## Architecture

**Stack:**
- **Frontend/Backend:** Next.js (App Router) on Vercel
  - SSR card/set/series pages for SEO indexing
  - Client components for interactive collection tracker and price charts
- **Database:** MongoDB Atlas — flexible schema suits card variant complexity
- **Auth:** Auth.js v5 (NextAuth) — credentials + Google OAuth
- **Payments:** Stripe — subscription management for Ad-Free and Pro tiers
- **Ads:** Google AdSense — banner ads on catalog pages for Free tier only
- **Cron:** Vercel Cron Jobs — daily price sync from external APIs

**External APIs:**
- **pokemontcg.io** — primary card catalog source; embeds Cardmarket + TCGPlayer prices
- **TCGdex** (`tcgdex.dev`) — Italian/multilingual card names, holo variant pricing (avg1/avg7/avg30)
- **eBay API** — supplementary completed listings data for market validation

**No Railway.** All infrastructure on Vercel + MongoDB Atlas.

---

## Data Model

### `sets` collection
```
_id, pokemontcg_id, name, series, releaseDate, totalCards, logoUrl, symbolUrl
```

### `cards` collection
```
_id, pokemontcg_id, tcgdex_id, name, name_it, number, set_id,
rarity, types[], subtypes[], supertype, imageUrl,
variants: { normal, holo, reverse, firstEdition }
```

### `price_history` collection
```
_id, card_id, date, source (cardmarket|tcgdex|ebay),
prices: { avg1, avg7, avg30, low, trend, market },
currency: "EUR", variant
```

### `users` collection
```
_id, email, name, image, provider, tier (free|adfree|pro),
stripeCustomerId, stripeSubscriptionId, createdAt
```

### `collection_items` collection
```
_id, user_id, card_id, quantity, condition, variant, language,
purchasePrice, purchaseCurrency, purchaseDate, notes, addedAt
```

---

## Features by Tier

### Free — €0 (ad-supported)
- Browse all cards, sets, series
- Current EUR price (today only)
- 7-day price chart
- Track up to **500 cards** (condition, variant, language per card)
- Total collection value (live)
- Basic wishlist (save cards; no price alerts)
- AdSense banners on catalog pages only — **no ads inside the collection tracker**

### Ad-Free — €0.99/month
- Everything in Free
- No ads anywhere
- Same 500-card limit and basic wishlist

### Pro — €4.99/month (or €39/year)
- Full price history up to 1 year
- avg1 / avg7 / avg30 trend charts (Cardmarket + TCGdex)
- All holo variant prices
- Italian edition pricing and comparisons
- **Unlimited cards** in collection tracker
- Gain/loss vs. purchase price per card
- Collection value history chart
- Export to CSV and PDF
- Price drop/spike alerts (email)
- Wishlist with **target price notifications** (email alert when card hits target)
- Ad-free everywhere
- Priority support

**Upgrade hooks (shown in context, not behind walls):**
- Price chart blurs beyond 7 days for Free/Ad-Free
- Collection counter shows "437 / 500" — visible, not hidden
- Gain/loss column visible but locked with Pro badge

---

## Browse Hierarchy (Series → Sets → Cards)

True drill-down navigation — each level is a real page, not a tab:

```
/browse                 → Series list
/browse/[series]        → Sets within that series
/browse/[series]/[set]  → Cards within that set
/cards/[id]             → Individual card detail page (SSR, SEO indexed)
```

**Series list:** Grid of series cards (icon, name, date range, set count, cards owned). Clicking navigates to sets.

**Sets list:** List of sets with progress bars (owned / total), completion status, estimated collection value. Clicking navigates to cards.

**Cards grid:** 5-column grid with filter chips (All / Owned / Missing / Holo / ex / Secret Rare). Cards show owned badge and current price.

**Breadcrumb:** Updates at each level (e.g., Series › Scarlet & Violet › 151) with clickable back-links.

---

## App Structure

**Sidebar nav:**
- Dashboard (📊) — default landing page
- Browse (📺) — series/sets/cards hierarchy
- My Cards (🗂️)
- Wishlist (⭐)
- Analytics (📈) — Pro only
- Footer: user avatar, name, tier badge

**Dashboard page:**
- 4 stat cards: Cards Owned, Collection Value (EUR), Sets Tracking, Gain/Loss
- AdSense banner (Free tier only)
- "Sets You're Collecting" grid with progress bars and set values

**Topbar:** Page title + global search (cards, sets) + language/currency indicator (🇮🇹 IT · EUR)

---

## Internationalisation

- Initial launch: Italian card names + EUR pricing
- Architecture supports multiple languages and currencies from day one (language field on collection_items, currency stored with prices)
- Future: add EN, DE, FR, ES card names via TCGdex; add non-EUR currency conversion

---

## SEO Strategy

- SSR card detail pages (`/cards/[id]`) indexed by Google
- Set and series pages SSR with structured data
- Free users drive organic traffic; collection tracker is client-side and auth-gated

---

## Key Routes

| Route | Rendering | Auth |
|---|---|---|
| `/` | SSR | None |
| `/browse` | SSR | None |
| `/browse/[series]` | SSR | None |
| `/browse/[series]/[set]` | SSR | None |
| `/cards/[id]` | SSR | None |
| `/dashboard` | Client | Required |
| `/collection` | Client | Required |
| `/wishlist` | Client | Required |
| `/analytics` | Client | Pro |
| `/settings` | Client | Required |

---

## Price Sync (Vercel Cron)

- Daily cron job fetches prices from pokemontcg.io and TCGdex
- Writes to `price_history` collection with date, source, variant
- eBay completed listings fetched weekly for market validation
- Rate limits respected; errors logged but non-fatal (stale prices shown with last-updated timestamp)

---

## Error Handling & Constraints

- All external API data validated with Zod schemas at the ingestion boundary
- Stale price data shown with "last updated" indicator rather than failing
- Collection tracker hard-caps Free/Ad-Free at 500 items enforced server-side
- Stripe webhooks handle subscription state changes (upgrade, downgrade, cancellation)
- Auth-gated routes redirect to `/login` with return URL

---

## Out of Scope (v1)

- Mobile app (web-first; responsive design)
- Social features (trading, public profiles)
- Card scanning via camera
- Non-EUR currencies at launch
- Bulk import from other platforms
