# Security Specification - Bento Group Buy

## Data Invariants
1. An order must have a non-empty `customerName`.
2. `quantity` must be at least 1 and no more than 100.
3. `price` and `totalPrice` must be positive.
4. `orderDate` must match YYYY-MM-DD format.
5. `createdAt` must be set to `request.time`.

## The Dirty Dozen (Attack Payloads)
1. **Empty Name**: `{ customerName: "", bentoName: "...", ... }` -> REJECT
2. **Negative Quantity**: `{ quantity: -1, ... }` -> REJECT
3. **Huge Quantity**: `{ quantity: 999999, ... }` -> REJECT
4. **Invalid Price spoof**: `{ price: 0.1, totalPrice: 0.1, ... }` -> REJECT (should match menu)
5. **Future Date Injection**: `{ orderDate: "2099-01-01", ... }` -> REJECT
6. **Malicious ID Injection**: Doc ID with 1KB of junk characters -> REJECT (handled by path hardening)
7. **Client Timestamp Spoof**: `{ createdAt: "2000-01-01T00:00:00Z" }` -> REJECT (must be server time)
8. **Field Injection (Privilege Escalation)**: `{ isAdmin: true, ... }` -> REJECT (strict keys)
9. **Cross-User Delete**: Delete an order without being an admin -> REJECT
10. **Bulk Scrape**: Unauthorized list query -> REJECT
11. **Type Poisoning**: `quantity: "three"` -> REJECT
12. **Missing Required Fields**: `{ customerName: "John" }` -> REJECT

## Test Runner
Wait, I don't have a test runner environment ready, but I will provide the rules.
