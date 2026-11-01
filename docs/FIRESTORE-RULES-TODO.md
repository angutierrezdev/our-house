# Firestore Rules TODO — `gastos_ubicaciones` + deploying rules from CI

Tracked as **[angutierrezdev/our-house#14](https://github.com/angutierrezdev/our-house/issues/14)**.

> **Status (2026-10-31):** sections 1–3 done — #15 (rules + tests) and #16
> (CI deploy) merged to `pwa`; first CI run passed 32/32 and released the rules.
> Only section 4 remains.

## Overview

Two pieces of work that both live here because **Firestore has a single rule set
per database**. `firestore.rules` is owned by this repo and deploys from it;
partial rules cannot be pushed from two repositories without one overwriting the
other. Single ownership is correct — what is missing is the process.

```
1. gastos_ubicaciones in the rules   ← small, unblocks control-gastos
2. deploying the rules from CI       ← the real work
```

**What is blocked right now:** `control-gastos` has shipped the capture app's
nearby-business suggestions (US-3, FR-U-01) on branch `feat/captura-rapida`. Its
code and tests are green, but **no write to `gastos_ubicaciones` has ever been
accepted by the real rules** — the collection does not exist in them, so today
it is unwritable. FR-U-01 is not genuinely verified until this merges to `pwa`
and deploys.

Background and the decisions behind it:
`control-gastos/docs/lifecycle/captura-rapida/referencia/firestore-rules-gastos-ubicaciones.md`
(ADR 0008 creates the collection, ADR 0015 decides rules deploy from CI, ADR
0019 is the quota constraint).

> **Reminder:** this repo's production branch is `pwa`, not `main`.

---

## 1. The collection in `firestore.rules`

- [x] Add the match block beside the other twelve `gastos_*` collections, under
      the same `hasGastosAccess(householdId)` — no access control of its own:

```
match /households/{householdId}/gastos_ubicaciones/{docId} {
  allow read, write: if hasGastosAccess(householdId);
}
```

Document shape, for reference (one row per branch, foreign key to the business —
the Oxxo near home and the one by the office are one `Negocio` with two
locations):

```ts
{ id: string, negocioId: string, lat: number, lon: number }
```

- [x] No composite indexes are needed and none should be added. Proximity is an
      in-memory scan over tens of rows (`packages/core/src/geo.ts` in
      control-gastos), not a geospatial query. That is deliberate.

Volume is not a concern: writes are deduplicated by a 75 m radius *before they
leave the client* (`decidirEscrituraUbicacion`), so returning to the same shop
writes nothing. Without that, every capture would leave a new row forever, on a
Spark plan whose 20 000 daily writes are shared by four apps and were already
exhausted once (2026-07-13).

---

## 2. Its case in `tests/rules/firestore.spec.ts`

- [x] Add the cases next to `describe('gastos (regression)')` /
      `describe('gastos ingestion (credit-card email)')`. Three that matter:
  - [x] a member **with** `canAccessGastos` reads and writes (covered by
        `alice`, the admin — no non-admin flagged fixture exists);
  - [x] a member **without** the flag and not admin, denied;
  - [x] someone from **another household**, denied — the tenant boundary, and
        the only one whose failure would be serious.

The fixtures already exist: `alice` (admin), `bob` (member without the flag),
`carol` (another household).

---

## 3. Deploying the rules from CI — this is the big one

`deploy.yml` deploys the app to GitHub Pages and **does not deploy the rules**.
There is no `firebase deploy` in any workflow in this repo. Today the security
perimeter of four apps and every household is deployed **by hand from a
development machine**: no CI, no record of which version is live, and nothing
forcing `npm run test:rules` to have passed first.

The decision: **deploy on merge to `pwa`, with the emulator suite as the gate.**

- [x] Add a rules job to CI (or a separate workflow) triggered on push to `pwa`.
- [x] Gate it on `npm run test:rules`
      (`firebase emulators:exec --only firestore "vitest run tests/rules"`).
      **The runner must provide Java** — the Firestore emulator needs it, which
      is also why that suite is not run locally in control-gastos.
- [x] Deploy with `firebase deploy --only firestore:rules`.
- [x] Create the service account and store its key as a secret — done as
      `FIREBASE_RULES_DEPLOYER_KEY` in the `firestore-rules` environment,
      deployable from `pwa` only. Roles: Firebase Rules Admin + Service Usage
      Consumer.

### Two consequences worth keeping in view

- **This introduces the most dangerous credential in the set**: a service
  account able to rewrite the security perimeter of four apps and every
  household. Scope it to Firestore rules and nothing else — not Hosting, not
  Auth, not data.
- The emulator suite needs Java, so the runner has to install it (e.g.
  `actions/setup-java`) or the gate silently stops being a gate.

---

## 4. After it deploys

- [ ] Tell `control-gastos` — FR-U-01 is only verified once a real write to
      `gastos_ubicaciones` has been accepted by the deployed rules.
- [ ] Close #14.
