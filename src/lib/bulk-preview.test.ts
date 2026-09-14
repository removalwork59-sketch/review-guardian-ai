import { describe, expect, it } from "vitest";

import { canonicalizeUrl, parseUrlList } from "@/lib/case-types";

describe("parseUrlList", () => {
  it("counts a link and its tracking-parameter copy once, like the server", () => {
    const g =
      "https://www.google.com/maps/search/?api=1&query=Googleplex&query_place_id=ChIJj61dQgK6j4AR4GeTYWZsKWw";
    const rows = parseUrlList(
      `${g}\n${g}&utm_source=share\nhttps://example.com/x\nhttps://www.google.com/maps/place/Eiffel+Tower/@48.85,2.29,17z`,
    );
    const valid = rows.filter((row) => row.valid);
    expect(valid).toHaveLength(2);
    expect(new Set(valid.map((row) => canonicalizeUrl(row.url))).size).toBe(valid.length);
    expect(rows.find((row) => row.url.includes("example.com"))?.reason).toBe(
      "Not a Google review link",
    );
  });
});
