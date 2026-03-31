import { getCurve, ECDH, ECDSA } from "../../src/crypto-demos/ec/ec-core";
import { isOnCurve, Point } from "../../src/crypto-demos/ec/ec-math-utils";

describe("getCurve()", () => {
  it('returns a curve for "secp256k1"', () => {
    expect(getCurve("secp256k1")).not.toBeNull();
  });

  it('returns a curve for "P-256"', () => {
    expect(getCurve("P-256")).not.toBeNull();
  });

  it('returns a curve for "test-small"', () => {
    expect(getCurve("test-small")).not.toBeNull();
  });

  it("returns null for an unknown curve name", () => {
    expect(getCurve("unknown-curve")).toBeNull();
  });
});

describe("ECDH on test-small curve", () => {
  const curve = getCurve("test-small")!;
  const ecdh = new ECDH(curve);

  it("generates key pairs without throwing", () => {
    expect(() => ecdh.generateKeyPair()).not.toThrow();
  });

  it("generated public key is on the curve", () => {
    const { publicKey } = ecdh.generateKeyPair();
    expect(isOnCurve(publicKey)).toBe(true);
  });

  it("Alice and Bob compute the same shared secret (x-coordinate)", () => {
    const alice = ecdh.generateKeyPair();
    const bob = ecdh.generateKeyPair();

    const aliceSecret = ecdh.computeSharedSecret(
      alice.privateKey,
      bob.publicKey,
    );
    const bobSecret = ecdh.computeSharedSecret(bob.privateKey, alice.publicKey);

    expect(aliceSecret.x).toBe(bobSecret.x);
  });
});

describe("ECDH.validatePublicKey()", () => {
  const curve = getCurve("test-small")!;
  const ecdh = new ECDH(curve);

  it("throws for the point at infinity", () => {
    const inf = Point.infinity(curve);
    expect(() => ecdh.validatePublicKey(inf)).toThrow();
  });

  it("accepts a legitimately generated public key", () => {
    const { publicKey } = ecdh.generateKeyPair();
    expect(() => ecdh.validatePublicKey(publicKey)).not.toThrow();
  });
});

describe("ECDSA on test-small curve", () => {
  const curve = getCurve("test-small")!;
  const ecdsa = new ECDSA(curve);

  it("sign + verify round-trip returns true", async () => {
    const { privateKey, publicKey } = ecdsa.generateKeyPair();
    const sig = await ecdsa.sign("hello", privateKey);
    expect(await ecdsa.verify("hello", sig, publicKey)).toBe(true);
  });

  it("verifying with a tampered message returns false", async () => {
    const { privateKey, publicKey } = ecdsa.generateKeyPair();
    const sig = await ecdsa.sign("hello", privateKey);
    expect(await ecdsa.verify("HELLO", sig, publicKey)).toBe(false);
  });

  it("verifying with a tampered signature (r+1n, s) returns false", async () => {
    const { privateKey, publicKey } = ecdsa.generateKeyPair();
    const sig = await ecdsa.sign("hello", privateKey);
    const tampered = { r: sig.r + 1n, s: sig.s };
    expect(await ecdsa.verify("hello", tampered, publicKey)).toBe(false);
  });

  it("same message + same key produces identical (r, s) on two calls", async () => {
    const { privateKey, publicKey: _publicKey } = ecdsa.generateKeyPair();
    const sig1 = await ecdsa.sign("deterministic", privateKey);
    const sig2 = await ecdsa.sign("deterministic", privateKey);
    expect(sig1.r).toBe(sig2.r);
    expect(sig1.s).toBe(sig2.s);
  });
});
