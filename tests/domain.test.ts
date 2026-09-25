import { test } from "node:test";
import assert from "node:assert/strict";
import { points, ranks, canPredict } from "../src/lib/domain";
import { normalizeAccountIdentifier } from "../src/lib/account";
test("account identifiers normalize email and Indian/international mobile numbers", () => {
  assert.deepEqual(normalizeAccountIdentifier(" MEMBER@Example.COM "), {
    kind: "email",
    value: "member@example.com",
  });
  assert.deepEqual(normalizeAccountIdentifier("98765 43210"), {
    kind: "phone",
    value: "+919876543210",
  });
  assert.deepEqual(normalizeAccountIdentifier("0044 7700 900123"), {
    kind: "phone",
    value: "+447700900123",
  });
  assert.throws(() => normalizeAccountIdentifier("123"));
});
test("scoring awards exactly one of 5, 3 or 0", () => {
  assert.equal(points(2, 1, 2, 1), 5);
  assert.equal(points(1, 0, 2, 1), 3);
  assert.equal(points(1, 1, 2, 1), 0);
  assert.equal(points(1, 1, 0, 0), 3);
  assert.equal(points(0, 0, 0, 0), 5);
  assert.equal(points(null, null, 2, 1), 0);
  assert.equal(points(0, 2, 0, 1), 3);
});
test("shared competition ranks use points, exact, then inclusive correct outcomes", () => {
  assert.deepEqual(
    ranks([
      { points: 8, exact: 1, correct: 2 },
      { points: 8, exact: 1, correct: 2 },
      { points: 8, exact: 1, correct: 1 },
      { points: 8, exact: 0, correct: 3 },
      { points: 3, exact: 0, correct: 1 },
    ]).map((r) => r.rank),
    [1, 1, 3, 4, 5],
  );
});
test("deadline immediately before, at and after; rescheduling and match states", () => {
  const kickoff = "2026-09-25T14:30:00Z";
  assert.equal(
    canPredict("scheduled", kickoff, new Date("2026-09-25T14:24:59.999Z")),
    true,
  );
  assert.equal(
    canPredict("scheduled", kickoff, new Date("2026-09-25T14:25:00.000Z")),
    false,
  );
  assert.equal(
    canPredict("scheduled", kickoff, new Date("2026-09-25T14:25:00.001Z")),
    false,
  );
  assert.equal(
    canPredict(
      "scheduled",
      "2026-09-25T15:30:00Z",
      new Date("2026-09-25T14:25:00Z"),
    ),
    true,
  );
  for (const s of [
    "postponed",
    "cancelled",
    "finalized",
    "in_progress",
    "awaiting_result",
  ] as const)
    assert.equal(
      canPredict(s, kickoff, new Date("2026-09-25T14:00:00Z")),
      false,
    );
});
