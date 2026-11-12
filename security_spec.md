# Security Specification — Bostraloy Clothing Store Management

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every document in `/shops`, `/products`, `/customers`, `/sales`, and `/expenses` belongs strictly to a single shop owner (`ownerId == request.auth.uid`). For `/shops/{shopId}`, `shopId` must also equal `request.auth.uid`. No user may read, list, update, or delete another shop owner's records.
2. **Verified Identity**: All mutations (`create`, `update`, `delete`) require a signed-in user with a verified email (`request.auth.token.email_verified == true`).
3. **Immutable Ownership & Creation Time**: `ownerId` and `createdAt` can never be mutated during an `update`.
4. **Temporal Integrity**: `createdAt` on creation and `updatedAt` on update must equal `request.time`.
5. **Volumetric & Key Bounds**: All strings enforce strict `minLength` and `maxLength` bounds matching `firebase-blueprint.json`, `priceCodeKey` must be exactly 10 characters, all numbers enforce domain constraints, and `keys().hasAll(...)` / `keys().hasOnly(...)` block shadow fields.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on ShopProfile or Product Create**: `{ ..., isAdmin: true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Cross-Tenant Ownership Spoofing**: `{ ownerId: "other-user-uid", ... }` -> Rejected by `data.ownerId == request.auth.uid`.
3. **Unverified Email Write**: Auth token with `email_verified: false` -> Rejected by `isVerifiedUser()`.
4. **Oversized ID Poisoning**: Document ID > 128 chars or containing special characters (`../`) -> Rejected by `isValidId(id)`.
5. **String Buffer Overflow on Product Name**: `name` with 500 characters -> Rejected by `data.name.size() <= 120`.
6. **Negative Stock, Capital, or Price Poisoning**: `stock: -5` or `workingCapital: -100` -> Rejected by numeric bounds (`>= 0`).
7. **Immutable Field Mutation on Update**: Changing `createdAt` or `ownerId` during `update` -> Rejected by immutability gate.
8. **Client-Spoofed Timestamp**: Setting `createdAt` to past/future timestamp -> Rejected by `incoming().createdAt == request.time`.
9. **Blanket List Query Scraping**: Querying `/products` or `/customers` without filtering `ownerId == request.auth.uid` -> Rejected by `allow list` checking `existing().ownerId == request.auth.uid`.
10. **PII Leak on ShopProfile or Customer Profile**: Authenticated non-owner performing `get` on `/shops/{shopId}` or `/customers/{customerId}` -> Rejected by `existing().ownerId == request.auth.uid`.
11. **Value Poisoning on Update**: Updating `workingCapital` on `/shops/{shopId}` with a string instead of a number -> Rejected because `isValidShopProfile(incoming())` wraps the entire `allow update` expression.
12. **Invoice Mutation Attack**: Attempting to update an already finalized `/sales/{saleId}` invoice -> Rejected because `allow update: if false` on `/sales/{saleId}` (terminal state lock).
