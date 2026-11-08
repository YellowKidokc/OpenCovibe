import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRouting } from "./conversation.js";
test("only discussion mode repeats calls", () => {
  assert.equal(validateRouting(["claude", "gpt"], "once", 5).rounds, 1);
  assert.equal(validateRouting(["claude", "gpt"], "turns", 5).rounds, 1);
  assert.equal(validateRouting(["claude", "gpt"], "discuss", 2).rounds, 2);
});
test("rejects duplicate participants, empty selection and unbounded rounds", () => {
  for (const args of [
    [[], "once", 1],
    [["echo", "echo"], "once", 1],
    [["echo"], "discuss", 6],
    [["echo"], "discuss", 1.5],
    [["echo"], "loop", 1],
  ]) {
    assert.throws(() => validateRouting(...args));
  }
});
