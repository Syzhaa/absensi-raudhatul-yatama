import assert from "node:assert/strict";
import { menuForRole, canAccessPath } from "./accessPolicy.js";

const guruMenus = menuForRole("guru");
assert.deepEqual(
  guruMenus.map((item) => item.path),
  ["/", "/scan", "/attendance", "/profile"],
);
assert.equal(canAccessPath("guru", "/students"), false);
assert.equal(canAccessPath("guru", "/teachers"), false);
assert.equal(canAccessPath("guru", "/users"), false);
assert.equal(canAccessPath("guru", "/settings"), false);
assert.equal(canAccessPath("guru", "/attendance"), true);
console.log("PASS guru navigation policy");
