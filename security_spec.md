# Security Specification & Threat Model (Firestore)

## 1. Data Invariants
- **Admins (`/admins/{adminId}`)**:
  - `email` must be a valid email string.
  - Read/Write restricted only to existing admins or setup parameters.
- **Rounds (`/rounds/{roundNum}`)**:
  - `roundNum` document IDs must be strings matching valid integers from `"1"` to `"38"`.
  - `round` must be an integer between 1 and 38.
  - `matches` must be an Array (List) of Match objects containing valid dates, times, and teams.
  - **Read Access**: Free public readout (anyone can read match schedules).
  - **Write Access**: Restricted strictly to authenticated users with UID present in the `/admins` collection.

## 2. The "Dirty Dozen" Threat Payloads

The following payload attempts must be strictly evaluated and rejected with `PERMISSION_DENIED` by our security rules:

1. **Unauthenticated Round Creation**: User is not logged in but tries to create a new round.
2. **Non-Admin Round Update**: User is logged in but does not exist in the `/admins` collection, attempting to update game dates.
3. **Admin ID Mimicry**: Creating a document under `/admins/{attackerUid}` where the user tries to register their own email as an admin.
4. **Invalid Round Number (Out of Bounds)**: Admin attempts to write a round with number `99`.
5. **Malicious ID Injection**: Injecting a extremely long string or invalid character ID for a round.
6. **Malicious Empty Matches Array**: Attempting to set `matches` as a non-array or null value.
7. **Bypassing Match Structure**: Attempting to insert a match with no teams or empty dates.
8. **Malicious Timestamp Spoofing**: Setting local client headers or timestamps to trick the server.
9. **Malicious Injection of Massive Payloads (Denial of Wallet)**: Setting a match attribute to a 1MB junk string.
10. **Admin Mutation of Admin List**: Standard admin user trying to modify other admins' documents without master permissions.
11. **Malicious Document Deletion**: A regular user trying to delete a round or any match data.
12. **Blanket Query Scraping**: Triggering bulk reads or unfiltered list queries across restricted collections.

## 3. The Test Suite Draft / Validation Invariants

```typescript
// firestore.rules.test.ts definition outline
describe("Firestore Security Rules Verification", () => {
  it("should deny unauthenticated read/write to /admins", () => {
    // Expect failure
  });

  it("should allow public reads to /rounds/{roundId}", () => {
    // Expect success
  });

  it("should deny non-admin writes to /rounds/{roundId}", () => {
    // Expect failure
  });

  it("should enforce valid round numbers (1-38) in /rounds documents", () => {
    // Expect failure for out of bounds
  });
});
```
