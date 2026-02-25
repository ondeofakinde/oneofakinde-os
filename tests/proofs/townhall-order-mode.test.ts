import assert from "node:assert/strict";
import test from "node:test";
import { parseTownhallOrderMode } from "../../lib/townhall/order";

test("townhall order mode parser defaults to constitutional", () => {
  assert.equal(parseTownhallOrderMode(undefined), "constitutional");
  assert.equal(parseTownhallOrderMode(null), "constitutional");
  assert.equal(parseTownhallOrderMode(""), "constitutional");
  assert.equal(parseTownhallOrderMode("unknown"), "constitutional");
});

test("townhall order mode parser accepts canonical values and aliases", () => {
  assert.equal(parseTownhallOrderMode("latest"), "latest");
  assert.equal(parseTownhallOrderMode("most_collected"), "most_collected");
  assert.equal(parseTownhallOrderMode("most-collected"), "most_collected");
  assert.equal(parseTownhallOrderMode("most-watched"), "most_watched");
  assert.equal(parseTownhallOrderMode(["latest"]), "latest");
});
