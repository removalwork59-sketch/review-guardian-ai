import { describe, expect, it } from "vitest";

import { FriendlyError, isGoogleHost, parseGoogleReference } from "@/lib/google.server";
import { detectPlatform } from "@/lib/platforms";
import { canonicalizeUrl } from "@/lib/review-pipeline.server";

describe("parseGoogleReference", () => {
  it("reads the business name and coordinates from a place link", () => {
    const reference = parseGoogleReference(
      "https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z",
    );
    expect(reference.searchText).toBe("Eiffel Tower");
    expect(reference.bias).toEqual({ latitude: 48.8583701, longitude: 2.2944813 });
    expect(reference.reviewId).toBeUndefined();
  });

  it("derives the decimal Maps CID and the review id from a review share link", () => {
    const reference = parseGoogleReference(
      "https://www.google.com/maps/reviews/@48.85,2.29,17z/data=!3m1!4b1!4m6!14m5!1m4!2m3!1sChZDSUhNMG9nS0VJQ0FnSURyZXNvbHZlcnRlc3QQAQ!2m1!1s0x47e66e2964e34e2d:0x8ddca9ee380ef7e0",
    );
    expect(reference.cid).toBe(BigInt("0x8ddca9ee380ef7e0").toString());
    expect(reference.reviewId).toBe("ChZDSUhNMG9nS0VJQ0FnSURyZXNvbHZlcnRlc3QQAQ");
    expect(reference.placeId).toBeUndefined();
  });

  it("uses an explicit place id, but never mistakes a hex CID for one", () => {
    expect(
      parseGoogleReference(
        "https://www.google.com/maps/search/?api=1&query=Cafe&query_place_id=ChIJLU7jZClu5kcR4PcOOO6p3I0",
      ).placeId,
    ).toBe("ChIJLU7jZClu5kcR4PcOOO6p3I0");
    expect(
      parseGoogleReference("https://www.google.com/maps?q=Cafe&place_id=0x1:0x2").placeId,
    ).toBeUndefined();
  });

  it("reads a place id carried in the q parameter", () => {
    const reference = parseGoogleReference(
      "https://www.google.com/maps/place/?q=place_id:ChIJj61dQgK6j4AR4GeTYWZsKWw",
    );
    expect(reference.placeId).toBe("ChIJj61dQgK6j4AR4GeTYWZsKWw");
    expect(reference.searchText).toBeUndefined();
  });

  it("rejects links that are not Google", () => {
    expect(() => parseGoogleReference("https://evil.example/maps/place/Cafe")).toThrow(
      FriendlyError,
    );
    expect(() => parseGoogleReference("https://google.com.evil.io/maps/place/Cafe")).toThrow(
      FriendlyError,
    );
  });

  it("rejects Google links that don't point at a business", () => {
    expect(() => parseGoogleReference("https://www.google.com/maps")).toThrow(FriendlyError);
  });
});

describe("isGoogleHost", () => {
  it.each([
    "www.google.com",
    "maps.google.co.uk",
    "google.com.au",
    "maps.app.goo.gl",
    "g.page",
    "business.g.page",
  ])("accepts %s", (host) => expect(isGoogleHost(host)).toBe(true));

  it.each([
    "evilgoogle.com",
    "google.com.evil.io",
    "goo.gl.evil.com",
    "evilgoo.gl",
    "notg.page.example.com",
    "localhost",
  ])("rejects %s", (host) => expect(isGoogleHost(host)).toBe(false));
});

describe("canonicalizeUrl and platform detection", () => {
  it("removes tracking parameters and fragments so the same link isn't scanned twice", () => {
    expect(canonicalizeUrl("https://maps.app.goo.gl/abc?utm_source=share&utm_medium=x#top")).toBe(
      "https://maps.app.goo.gl/abc",
    );
  });

  it("detects the platform from the pasted link", () => {
    expect(detectPlatform("https://maps.app.goo.gl/abc")).toBe("google");
    expect(detectPlatform("https://www.facebook.com/page/reviews")).toBe("facebook");
    expect(detectPlatform("https://example.com")).toBe("unknown");
  });
});
