import assert from "node:assert/strict";
import { test } from "node:test";
import { isTextAllowed } from "../src/lib/profanity.js";

test("мат и оскорбления не проходят, обычные слова — проходят", () => {
  for (const text of ["ну ты сука", "заебал уже", "Бля, опять", "what the fuck"]) {
    assert.equal(isTextAllowed(text), false, text);
  }
  for (const text of ["колебания цены", "Привет, всем хорошего эфира!", "психология", "употреблять"]) {
    assert.equal(isTextAllowed(text), true, text);
  }
});
