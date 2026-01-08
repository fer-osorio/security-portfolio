# RSA Interactive Tool - Implementation Plan

### Purpose of This Tool

**Primary Educational Goal:**
Demonstrate the **complete RSA cryptosystem workflow** in an interactive, visual way that bridges theory and practice. This tool will show:

1. **Prime number generation** (with visualization of primality testing)
2. **Key pair generation** (public key `(e, n)` and private key `(d, n)`)
3. **Encryption process** (message → ciphertext using modular exponentiation)
4. **Decryption process** (ciphertext → message using private key)
5. **Security properties** (why RSA works, and what makes it secure)

**Secondary Goal:**
Expose the **practical limitations and security considerations** when implementing RSA in JavaScript.

- JavaScript's number precision limits (and why BigInt is essential)
- Browser security boundaries (where keys can/cannot be stored)
- Performance differences (JavaScript is interpreted, not compiled like C/C++)
- Attack vectors specific to web implementations

---

## Intended User Experience (UX)

### User Journey (Step-by-Step)

```
┌─────────────────────────────────────────────────────────┐
│ LANDING: User arrives at RSA Tool page                  │
│ Sees: Brief explanation of RSA, what they can do here   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Key Generation                                  │
│ • User clicks "Generate RSA Keys"                       │
│ • Option to choose key size: 512, 1024, 2048 bits       │
│ • Visual feedback: "Generating primes..." with progress │
│ • Display: p, q, n, φ(n), e, d with explanations        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Encryption                                      │
│ • User enters plaintext message (text input field)      │
│ • User clicks "Encrypt"                                 │
│ • Display: Numeric representation, ciphertext           │
│ • Show calculation: m^e mod n = c                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Decryption                                      │
│ • Ciphertext automatically populated from encryption    │
│ • User clicks "Decrypt"                                 │
│ • Display: Recovered plaintext                          │
│ • Show calculation: c^d mod n = m                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ EDUCATIONAL FEATURES (Always visible)                   │
│ • "How RSA Works" collapsible section                   │
│ • "Security Notes" explaining limitations               │
│ • "Attack Scenarios" demonstrating common pitfalls      │
└─────────────────────────────────────────────────────────┘
```

### Visual Design Philosophy

**For mathematicians/cryptographers:**

- **Show the math explicitly** - don't hide it behind abstraction
- **Interactive parameters** - let users experiment with key sizes, see what breaks
- **Performance metrics** - display timing for operations (educational: shows computational complexity)
- **Step-by-step breakdown** - each calculation shown in detail

**Interface elements:**

1. **Tabbed sections**: Key Generation | Encryption | Decryption | Security Analysis
2. **Real-time validation**: Show errors immediately (e.g., message too large for key size)
3. **Copy buttons**: Let users copy keys/ciphertext to clipboard
4. **Clear visual hierarchy**: Important outputs (keys, ciphertext) are prominently displayed

---

## Dependencies

### Core JavaScript Libraries

We'll use **minimal, audited dependencies** for security reasons:

#### 1. **BigInteger Library** (Essential)

**Why we need it:**
JavaScript's native `Number` type uses IEEE 754 double-precision (53-bit mantissa). This means:

- Maximum safe integer: 2^53 - 1 ≈ 9 × 10^15
- RSA requires arithmetic on numbers with 512–4096 bits
- **We need arbitrary-precision arithmetic**

**Options:**

- **bn.js** (11KB minified, widely used, audited)
- **JSBI** (JavaScript BigInt library, polyfill for older browsers)
- **Native BigInt** (Built into modern JavaScript, but limited browser support)

**Decision: Use native BigInt with bn.js fallback**

```javascript
// Check if BigInt is available (modern browsers)
const hasBigInt = typeof BigInt !== 'undefined';

// If not, load bn.js as polyfill
if (!hasBigInt) {
    // Load bn.js from CDN
}
```

#### 2. **Crypto-Secure Random Number Generator**

**Why we need it:**
`Math.random()` is **NOT cryptographically secure**. It's predictable and attackers can potentially guess the output.

**Solution: Use Web Cryptography API**

```javascript
// Browser's built-in secure random generator
window.crypto.getRandomValues(new Uint8Array(32));
```

This is backed by the OS's CSPRNG (cryptographically secure pseudorandom number generator), equivalent to `/dev/urandom` on Linux.

#### 3. **Miller-Rabin Primality Test**

**Why implement ourselves:**

- Educational value
- No external dependency for core cryptographic logic
- Control over security parameters (number of rounds)

**The probabilistic primality test:**

- Choose random witnesses `a`
- Test if `a^(n-1) ≡ 1 (mod n)` with specific structure
- Probability of error decreases exponentially with more rounds

We'll implement this in JavaScript with BigInt, showing performance comparison to your C++ version.

### Optional Dependencies (For Enhanced UX)

1. **Chart.js** or **D3.js** (if we visualize prime generation)
2. **Highlight.js** (syntax highlighting for showing code examples)
3.  **Clipboard.js** (easy copy-to-clipboard functionality)

**Decision for Phase 1:** No optional dependencies. Keep it pure JavaScript for maximum learning.

---

## Security Awareness (Critical for Web Implementation)

### 1. **Client-Side Cryptography Limitations**

**Problem: All code runs in the user's browser**

Unlike C/C++ applications where compiled binaries protect implementation details, JavaScript source code is **fully visible** to anyone using the site.

**Implications:**

- **Keys generated client-side are visible in browser memory** (DevTools can inspect)
- **Private keys should NEVER be transmitted to servers** (even over HTTPS)
- **This is purely educational** - production RSA should use server-side key management

**What we'll do:**

- Add a prominent **"Educational Use Only"** warning
- Explain that real-world RSA uses Hardware Security Modules (HSMs)
-  Show what NOT to do (as education for security awareness)

### 2. **JavaScript Number Precision (BigInt Requirement)**

**Problem: JavaScript's Number type is insufficient**

```javascript
// WITHOUT BigInt (WRONG):
let p = 1000000007;  // Prime
let q = 1000000009;  // Prime
let n = p * q;       // 1000000016000000063
console.log(n);      // 1000000016000000100 (WRONG! Lost precision)

// WITH BigInt (CORRECT):
let p = 1000000007n;
let q = 1000000009n;
let n = p * q;       // 1000000016000000063n (CORRECT)
```

### 3. **Timing Attacks (Side-Channel Vulnerability)**

**Problem: JavaScript execution timing is observable**

Attackers can measure how long operations take and infer information about secret keys.

**Example vulnerability:**

```javascript
// VULNERABLE CODE (simplified):
function decrypt(ciphertext, privateKey) {
    let result = 1n;
    let base = ciphertext;
    let exp = privateKey.d;

    // Simple exponentiation (TIMING LEAK!)
    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % privateKey.n;
        }
        base = (base * base) % privateKey.n;
        exp = exp / 2n;
    }
    return result;
}
```

**Why it's vulnerable:**
The number of iterations depends on the bit pattern of the private exponent `d`. An attacker timing many decryptions can reconstruct `d`.

**What we'll do:**

- Implement **constant-time exponentiation** (Montgomery ladder or similar)
- Add educational comments explaining the vulnerability
- Include a "Vulnerable vs. Secure" comparison toggle

This is the same issue as timing attacks on C++ implementations. The web makes it worse because:

- JavaScript is interpreted (more timing variability)
- Network latency can be measured by attackers
- Browser performance APIs give high-resolution timing

### 4. **XSS Vulnerabilities (Web-Specific)**

**Problem: User input could inject malicious code**

If a user enters:

```
<img src=x onerror="alert('XSS')">
```

And we naively display it with `innerHTML`, we execute their code.

**What we'll do:**

- **Always sanitize input** before displaying
- Use `textContent` instead of `innerHTML`
- Validate input is numeric/text before processing

This is like SQL injection or buffer overflows in C++, but for the web. The attack vector is different, but the principle is the same: never trust user input.

### 5. **Message Padding (Textbook RSA Vulnerability)**

**Problem: Textbook RSA (raw modular exponentiation) is insecure**

Without padding:

- **Deterministic**: Same message always produces same ciphertext
- **Malleable**: Attacker can manipulate ciphertext predictably
- **Small message space**: Attacker can precompute encryptions

**Standard solution: OAEP (Optimal Asymmetric Encryption Padding)**

**What we'll do:**

- **Phase 1**: Implement textbook RSA (with warnings)
- **Phase 2**: Add OAEP padding (with explanation of why it's necessary)
- Show side-by-side comparison of vulnerabilities

OAEP adds:

- Random padding (makes encryption probabilistic)
- Hash function (provides integrity)
- MGF (mask generation function) for security proof

We'll implement a simplified version for educational purposes.

### 6. **Key Storage (Never Store Private Keys)**

**Problem: localStorage/sessionStorage are not secure**

Anything stored client-side can be:

- Accessed by XSS attacks
- Stolen by malicious browser extensions
- Persisted across sessions (privacy issue)

**What we'll do:**

- **Never persist private keys** - they exist only in memory during the session
- Add a "Download Key" button (let users save to their own secure storage)
- Explain HSM and proper key management practices

### 7. **Browser Security Boundaries**

**Important limitations:**

- **Same-Origin Policy**: JavaScript can only access resources from the same domain
- **HTTPS requirement**: Web Cryptography API only works on HTTPS or localhost
- **Content Security Policy**: Our CSP header limits what scripts can do

**What we'll do:**

- Check `window.isSecureContext` before running crypto operations
- Display warning if not on HTTPS
- Explain why these boundaries exist (security defense-in-depth)

---

## Implementation Architecture

### Module Structure

```
js/crypto-demos/
├── rsa-demo.js              # Main controller (UI logic)
├── rsa-core.js              # Core RSA implementation
│   ├── generatePrime()
│   ├── millerRabin()
│   ├── generateKeyPair()
│   ├── encrypt()
│   └── decrypt()
├── math-utils.js            # Mathematical utilities
│   ├── gcd()
│   ├── extendedGCD()
│   ├── modInverse()
│   └── modPow()
└── security-utils.js        # Security-specific functions
    ├── sanitizeInput()
    ├── validateKeySize()
    └── constantTimeCompare()
```

**Why this structure:**

- **Separation of concerns**: UI separate from crypto logic (like MVC architecture)
- **Testable**: Each module can be tested independently
- **Reusable**: `math-utils.js` can be used for other cryptographic demos
- **Auditable**: Security-critical code isolated in `rsa-core.js`

### Data Flow

```
User clicks "Generate Keys"
        ↓
rsa-demo.js (validate input: key size)
        ↓
rsa-core.js::generateKeyPair()
        ↓
generatePrime() → millerRabin() [parallel for p and q]
        ↓
math-utils.js::gcd(), modInverse() [compute e, d]
        ↓
Return { publicKey: {e, n}, privateKey: {d, n} }
        ↓
rsa-demo.js (display keys in UI)
        ↓
User enters message → encrypt()
        ↓
math-utils.js::modPow(m, e, n)
        ↓
Display ciphertext
```

### Performance Considerations

**Key generation timing (estimate):**

- 512-bit RSA: ~100-500ms (acceptable)
- 1024-bit RSA: ~500-2000ms (tolerable with progress indicator)
- 2048-bit RSA: ~2-10 seconds (requires "Please wait..." message)
- 4096-bit RSA: ~30-60 seconds (probably too slow for web demo)

JavaScript is **50-100x slower** than optimized C/C++ for cryptographic operations because:

- Interpreted execution (vs. compiled machine code)
- No SIMD instructions (unless using WebAssembly)
- Garbage collection pauses

**Optimization strategies we'll use:**

1. **Web Workers** (offload computation to background thread, keep UI responsive)
2. **Incremental rendering** (show progress, don't block UI)
3. **Caching** (precompute common values)

---

## Educational Features (What Makes This Tool Special)

### 1. **Step-by-Step Mathematical Breakdown**

For each operation, show:

```
Encryption: m^e mod n = c

Given:
  m = 123 (your message as a number)
  e = 65537 (public exponent)
  n = 3233 (modulus)

Calculation:
  123^65537 mod 3233
  = 123^(2^16 + 2^0) mod 3233    [binary exponentiation]
  = (123^65536 * 123^1) mod 3233
  = ...
  = 855

Therefore: ciphertext = 855
```

### 2. **Interactive Parameter Exploration**

Let users:

- Change key sizes and see how it affects security/performance
- Try encrypting the same message multiple times with and without OAEP padding (show it's deterministic and why OAEP is necessary)
- See what happens with messages larger than the key size (error)
- Experiment with weak keys (e.g., p and q very close together)

### 3. **Attack Demonstrations**

**Included attacks:**

- **Timing attack simulation** (show how execution time leaks information)
- **Small exponent attack** (what happens with e = 3)
- **Common modulus attack** (two users sharing n)

Each attack has:

- Explanation of the vulnerability
- Code demonstration
- Mitigation strategy

### 4. **Comparison to Other Algorithms**

Quick comparison table:

```
| Algorithm | Key Size | Speed    | Use Case                 |
|-----------|----------|----------|--------------------------|
| RSA       | 2048-bit | Slow     | Key exchange, signatures |
| AES       | 256-bit  | Fast     | Bulk data encryption     |
| ECC       | 256-bit  | Medium   | Modern alternative to RSA|
```

---

## Implementation Phases

### Phase 1: Core Functionality (Week 7)

- [x] BigInt arithmetic
- [x] Prime generation (small primes for testing)
- [x] Key generation (512-bit only)
- [x] Basic encryption/decryption
-   [x] Simple UI

### Phase 2: Security Hardening (Week 8)

- [x] Miller-Rabin primality testing (full implementation)
- [ ] Constant-time operations
- [ ] Input validation and sanitization
- [x] Error handling
-  [x] Security warnings

### Phase 3: Educational Features (Week 9)

- [x] Step-by-step calculation display
- [ ] Attack demonstrations
- [ ] Performance metrics
-  [x] Interactive parameter tuning

### Phase 4: Polish & Optimization (Week 10)

- [ ] Web Workers for background computation
- [x] Progress indicators
- [ ] Responsive design refinement
- [ ] Documentation and code comments
- [x] Enhance Step-by-step calculation display

---

## Testing Strategy

### Unit Tests (for core functions)

```javascript
// Example test for modPow
assert(modPow(2n, 10n, 1000n) === 24n);
assert(modPow(3n, 5n, 7n) === 5n);
```

### Integration Tests (full workflow)

```javascript
// Generate keys → encrypt → decrypt → verify
const keys = generateKeyPair(512);
const plaintext = "Hello";
const ciphertext = encrypt(plaintext, keys.publicKey);
const decrypted = decrypt(ciphertext, keys.privateKey);
assert(decrypted === plaintext);
```

### Security Tests

- [ ] XSS injection attempts
- [ ] Timing attack measurement
-  [ ] Key validation (reject weak keys)

