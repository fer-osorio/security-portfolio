import {
  Point,
  CurveParams,
  isOnCurve,
  validateCurveParameters,
  pointNegate,
  pointAdd,
  pointDouble,
  scalarMultiply,
  scalarMultiplySecure,
  pointOrder,
} from "../../src/crypto-demos/ec/ec-math-utils";

// Small test curve: y² = x³ + 7 (mod 23)
// Generator G = (6, 4) has order 28.
const curve: CurveParams = { a: 0n, b: 7n, p: 23n };

describe("isOnCurve()", () => {
  it("accepts valid point (6, 4)", () => {
    // 4² = 16 ≡ 6³ + 7 = 223 ≡ 16 (mod 23)
    const P = new Point(6n, 4n, curve);
    expect(isOnCurve(P)).toBe(true);
  });

  it("rejects invalid point (5, 5)", () => {
    // 5² = 25 ≡ 2 ≠ 5³ + 7 = 132 ≡ 17 (mod 23)
    const P = new Point(5n, 5n, curve);
    expect(isOnCurve(P)).toBe(false);
  });

  it("accepts the point at infinity", () => {
    expect(isOnCurve(Point.infinity(curve))).toBe(true);
  });
});

describe("validateCurveParameters()", () => {
  it("accepts the non-singular test curve", () => {
    // 4(0)³ + 27(7)² = 1323 ≡ 12 (mod 23) ≠ 0
    expect(validateCurveParameters(curve)).toBe(true);
  });

  it("rejects a singular curve (4a³ + 27b² ≡ 0)", () => {
    // y² = x³ (mod 7): a=0, b=0 → discriminant = 0
    expect(validateCurveParameters({ a: 0n, b: 0n, p: 7n })).toBe(false);
  });
});

describe("pointNegate()", () => {
  it("negates (6, 4) to (6, 19)", () => {
    // -4 mod 23 = 19
    const neg = pointNegate(new Point(6n, 4n, curve));
    expect(neg.x).toBe(6n);
    expect(neg.y).toBe(19n);
  });

  it("negation of the point at infinity is still infinity", () => {
    expect(pointNegate(Point.infinity(curve)).isInfinity).toBe(true);
  });
});

describe("pointAdd()", () => {
  it("P(6,4) + Q(11,2) = R(8,6)", () => {
    const P = new Point(6n, 4n, curve);
    const Q = new Point(11n, 2n, curve);
    const R = pointAdd(P, Q);
    expect(R.x).toBe(8n);
    expect(R.y).toBe(6n);
  });

  it("P + ∞ = P (right identity)", () => {
    const P = new Point(6n, 4n, curve);
    const R = pointAdd(P, Point.infinity(curve));
    expect(R.x).toBe(P.x);
    expect(R.y).toBe(P.y);
  });

  it("∞ + P = P (left identity)", () => {
    const P = new Point(6n, 4n, curve);
    const R = pointAdd(Point.infinity(curve), P);
    expect(R.x).toBe(P.x);
    expect(R.y).toBe(P.y);
  });

  it("P + (−P) = ∞", () => {
    const P = new Point(6n, 4n, curve);
    const negP = pointNegate(P);
    const R = pointAdd(P, negP);
    expect(R.isInfinity).toBe(true);
  });
});

describe("pointDouble()", () => {
  it("2 × (6, 4) = (15, 1)", () => {
    const P = new Point(6n, 4n, curve);
    const R = pointDouble(P);
    expect(R.x).toBe(15n);
    expect(R.y).toBe(1n);
  });

  it("doubling the point at infinity returns infinity", () => {
    expect(pointDouble(Point.infinity(curve)).isInfinity).toBe(true);
  });
});

describe("scalarMultiply() vs scalarMultiplySecure()", () => {
  const P = new Point(6n, 4n, curve);

  it("k=3 gives the same result", () => {
    const r1 = scalarMultiply(3n, P);
    const r2 = scalarMultiplySecure(3n, P);
    expect(r1.x).toBe(r2.x);
    expect(r1.y).toBe(r2.y);
  });

  it("k=7 gives the same result", () => {
    const r1 = scalarMultiply(7n, P);
    const r2 = scalarMultiplySecure(7n, P);
    expect(r1.x).toBe(r2.x);
    expect(r1.y).toBe(r2.y);
  });

  it("0·P = ∞", () => {
    expect(scalarMultiply(0n, P).isInfinity).toBe(true);
  });

  it("1·P = P", () => {
    const r = scalarMultiply(1n, P);
    expect(r.x).toBe(P.x);
    expect(r.y).toBe(P.y);
  });
});

describe("pointOrder()", () => {
  it("order of G=(1,10) on test curve is 24", () => {
    const G = new Point(1n, 10n, curve);
    expect(pointOrder(G)).toBe(24n);
  });

  it("order of the point at infinity is 1", () => {
    expect(pointOrder(Point.infinity(curve))).toBe(1n);
  });
});
