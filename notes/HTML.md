# Comprehensive Introduction to HTML
## A Rigorous Guide for Mathematicians, Computer Scientists, and C/C++ Programmers

---

## Table of Contents

1. [Purpose & Historical Context](#purpose--historical-context)
2. [Fundamental Concepts](#fundamental-concepts)
3. [Syntax Structure & Formal Grammar](#syntax-structure--formal-grammar)
4. [Semantic Markup & Information Architecture](#semantic-markup--information-architecture)
5. [Security Practices for Cryptographers](#security-practices-for-cryptographers)
6. [HTML's Role in the Web Stack](#htmls-role-in-the-web-stack)
7. [Analysis of the Portfolio Template](#analysis-of-the-portfolio-template)

---

## Purpose & Historical Context

### The Problem It Solved

Before HTML, sharing documents across networked computers required:
- Knowing exact file locations and system paths
- Understanding different operating systems' conventions
- Complex protocols for each type of content
- No standardized way to reference external documents

**Tim Berners-Lee's insight (1989):** Create a *text-based markup format* that could:
1. Describe **document structure** (what is a heading, paragraph, link?)
2. **Link documents together** via hyperlinks (revolutionary at the time)
3. Work on **any computer system** (platform-independent)
4. Be **human-readable** (text, not binary)

### Historical Timeline & Evolution

| Year | Event | Significance |
|------|-------|-------------|
| 1989 | Tim Berners-Lee proposes WWW at CERN | Birth of the web |
| 1991 | First web page goes live; HTML 0 released | ~18 tags, minimal features |
| 1995 | HTML 2.0 standardized | First formal spec |
| 1997 | HTML 4.0 (Strict, Transitional, Frameset) | Separates content from presentation |
| 2000 | XHTML 1.0 (XML-based HTML) | Stricter XML rules applied |
| 2014 | HTML5 becomes W3C recommendation | Modern HTML (what you use today) |
| Present | HTML living standard | Continuously evolves |

### Why This Matters for Your Background

**For mathematicians:** HTML is a **formal language**—it has grammar rules, syntax, semantics. Understanding it rigorously parallels studying formal languages and automata theory.

**For cryptographers:** HTML's role in the browser determines the **attack surface**. Understanding how HTML is parsed, interpreted, and rendered reveals vulnerabilities and how cryptographic controls mitigate them.

**For C/C++ programmers:** HTML is **declarative** (not imperative). You're *describing* what content is, not *commanding* how to display it. This is a different programming paradigm than C's imperative approach.

---

## Fundamental Concepts

### Core Abstraction: Document as a Tree

HTML represents documents as **tree structures** (not linear text):

```
Document
├── <html>
    ├── <head>
    │   ├── <meta> (metadata)
    │   └── <link> (stylesheets)
    └── <body>
        ├── <header>
        ├── <main>
        │   ├── <section>
        │   │   ├── <h1>
        │   │   └── <p>
        │   └── <section>
        └── <footer>
```

**Mathematical perspective:** This is a **directed acyclic graph (DAG)** with:
- **Nodes:** HTML elements
- **Edges:** Parent-child relationships
- **Leaves:** Text content or void elements
- **Root:** Single `<html>` element

**In your portfolio:** The structure you see in `index.html` is exactly this tree. The browser parses the HTML text into this tree in memory, then renders it.

### Elements, Tags, and Attributes

**Element** = Complete unit of meaning
```html
<p class="introduction">Hello world</p>
```

Breaking this down:
- `<p>` = opening tag
- `</p>` = closing tag
- `class="introduction"` = attribute (key-value pair)
- `Hello world` = text content
- **Entire line** = element

**In C++ terms:**
```cpp
// HTML element is like an object with properties:
class HTMLElement {
    std::string tagName;           // "p"
    std::map<std::string, std::string> attributes;  // {"class": "introduction"}
    std::string textContent;       // "Hello world"
    std::vector<HTMLElement*> children;  // nested elements
};
```

### Attributes: Metadata About Elements

Attributes are **name-value pairs** that modify element behavior:

```html
<a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
```

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `href` | URL | Where the link points |
| `target` | `_blank` | Open in new tab (security risk—mitigated by `rel`) |
| `rel` | `noopener noreferrer` | Security policy preventing access to `window.opener` |

**Security insight:** Notice the `rel="noopener noreferrer"`? This is **cryptography in action**—you're restricting what the linked page can access. Without this, a malicious site could:
```javascript
// Malicious code on linked site (if you didn't use rel="...")
window.opener.location = "https://phishing-site.com"  // Redirect YOU
```

---

## Syntax Structure & Formal Grammar

### BNF (Backus-Naur Form) Grammar

As a mathematician, you'll appreciate formal grammar. HTML can be partially described in BNF:

```
document       ::= "<!DOCTYPE html>" element-tree
element-tree   ::= opening-tag content closing-tag
opening-tag    ::= "<" tagname attributes ">"
closing-tag    ::= "</" tagname ">"
attributes     ::= attribute*
attribute      ::= name "=" '"' value '"'
content        ::= (text | element-tree)*
tagname        ::= [a-z0-9-]+
name           ::= [a-z-]+
value          ::= [^"]+ (escaped quotes allowed)
```

**In plain language:** An HTML document is:
1. A DOCTYPE declaration (tells browser which HTML version)
2. A tree of nested elements
3. Each element has opening tag, content, closing tag
4. Elements can contain text or other elements

### Void Elements (Self-Closing Tags)

Some elements have **no content** and **no closing tag**:

```html
<img src="image.png" alt="Description">
<input type="text" placeholder="Enter text">
<br>
<meta charset="UTF-8">
```

These are called **void elements** (or **empty elements**). In XML/XHTML, you might see them as:
```html
<img src="image.png" alt="Description" />
```

The `/` is optional in HTML5 but makes the structure explicit: element opens and closes immediately.

**Formal structure:**
```
void-element ::= "<" tagname attributes ">"  // No closing tag needed
```

### Whitespace Handling

HTML has **collapse semantics** for whitespace:

```html
<!-- These three produce identical output: -->
<p>Hello   world</p>
<p>Hello
world</p>
<p>Hello 
     world</p>
<!-- All render as: "Hello world" (single space) -->
```

**Exception:** The `<pre>` element (preformatted text) **preserves whitespace**:
```html
<pre>
    Lines
    Are
    Preserved
</pre>
```

**Why this matters:** When parsing HTML programmatically (or implementing a browser), you must normalize whitespace. In your portfolio, this is handled automatically by the browser.

### Character Encoding & Entities

**Problem:** How do you display `<` as text without it being parsed as a tag?

**Solution:** HTML Entities—special sequences that represent characters:

```html
<p>5 &lt; 10</p>              <!-- Displays: 5 < 10 -->
<p>A &amp; B</p>              <!-- Displays: A & B -->
<p>&copy; 2025</p>            <!-- Displays: © 2025 -->
<p>&quot;quoted text&quot;</p> <!-- Displays: "quoted text" -->
```

**Formal definition:**
```
entity ::= "&" entity-name ";"
         | "&#" decimal-number ";"
         | "&#x" hexadecimal-number ";"
```

**Security implication (crucial for cryptographers):**

When you display **untrusted input**, you MUST escape it:

```html
<!-- UNSAFE (XSS vulnerability): -->
<p>User said: <script>alert('xss')</script></p>

<!-- SAFE (using entities): -->
<p>User said: &lt;script&gt;alert('xss')&lt;/script&gt;</p>
<!-- Displays literally: <script>alert('xss')</script> (not executed) -->
```

Your portfolio's `sanitizeHTML` function does exactly this:
```javascript
function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;  // Converts characters to entities
    return div.innerHTML;    // Returns escaped version
}
```

---

## Semantic Markup & Information Architecture

### Beyond Visual Presentation: Semantic HTML

In traditional web design, people used:
```html
<div id="header">...</div>
<div id="main">...</div>
<div id="footer">...</div>
```

**Problem:** The browser doesn't know these are structural divisions. It's just text.

**Modern approach (semantic HTML):**
```html
<header>...</header>
<main>...</main>
<footer>...</footer>
```

**Why this matters:**
1. **Accessibility:** Screen readers understand the structure
2. **SEO:** Search engines understand what's important
3. **Code clarity:** You understand the structure
4. **Machine parsing:** You can programmatically extract meaning

### Your Portfolio's Semantic Structure

Let's analyze the structure from your template:

```html
<header>          ← Page header (logo, nav)
    <nav>         ← Navigation container
</header>

<main>            ← Main content (not in nav/header/footer)
    <section>     ← Thematic grouping (hero)
    <section>     ← Thematic grouping (portfolio)
        <article> ← Self-contained content (project card)
        <article> ← Self-contained content (project card)
    </section>
    <section>     ← Thematic grouping (tools)
        <article> ← Self-contained content (tool card)
    </section>
</main>

<footer>          ← Page footer (copyright, etc.)
</footer>
```

**Mathematical interpretation:** This creates a **formal hierarchy**:
- **Level 1:** Document sections (`header`, `main`, `footer`)
- **Level 2:** Content sections (`section` elements within `main`)
- **Level 3:** Individual items (`article` elements within sections)

### Semantic Elements Reference

| Element | Purpose | Contains |
|---------|---------|----------|
| `<header>` | Introductory content | Navigation, site title, branding |
| `<nav>` | Navigation links | `<ul>`, `<a>` elements |
| `<main>` | Main document content | Should appear once per page |
| `<section>` | Thematic grouping | Related content (hero, portfolio, etc.) |
| `<article>` | Self-contained content | Could be republished independently |
| `<aside>` | Tangential content | Sidebars, related links |
| `<footer>` | Footer content | Copyright, author info, links |
| `<figure>` | Self-contained media | `<img>`, `<figcaption>` |

**Your understanding:** Semantic HTML is essentially **formal specification** of document structure. You're declaring "this is what each part means," not "draw this pixel arrangement."

---

## Security Practices for Cryptographers

### Attack Surface: Why HTML Matters to Security

As a cryptographer, you understand **threat models**. HTML is part of the browser's attack surface:

```
Attacker
    ↓
[HTML parsing] ← VULNERABILITY POINT: Malformed HTML
    ↓
[CSS rendering] ← VULNERABILITY POINT: CSS injections
    ↓
[JavaScript execution] ← VULNERABILITY POINT: XSS
    ↓
[HTTP communication] ← VULNERABILITY POINT: Missing HTTPS
```

### 1. Input Validation & Sanitization

**The Threat:** Cross-Site Scripting (XSS)

If your site displays user input without sanitization:
```html
<!-- User enters: <img src=x onerror="stealCookies()"> -->
<p>User said: <img src=x onerror="stealCookies()"></p>
<!-- Browser executes: stealCookies() function! -->
```

**The Defense:** Escape HTML entities

```html
<!-- Same input, sanitized: -->
<p>User said: &lt;img src=x onerror="stealCookies()"&gt;</p>
<!-- Browser displays as text: <img src=x onerror="stealCookies()"> -->
```

**Your portfolio's implementation:**
```javascript
// From your js/app.js
function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;        // Browser converts to safe entities
    return div.innerHTML;           // Get the escaped version
}
```

**Cryptographic connection:** This is **encryption by encoding**—you're transforming dangerous input into safe (inert) form. Not cryptographic encryption, but the principle is similar: transform untrusted input into a safe representation.

### 2. Content Security Policy (CSP)

Your portfolio includes this meta tag:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'">
```

**What this does:**
```
default-src 'self'          = By default, only allow resources from same origin
script-src 'self' 'unsafe-inline'  = Allow inline scripts and same-origin scripts
style-src 'self' 'unsafe-inline'   = Allow inline styles and same-origin styles
```

**What this prevents:**
- External scripts loading from attacker-controlled CDNs
- Inline event handlers (e.g., `<img onerror="attack()">`)
- JavaScript injected into the page dynamically

**Cryptographic analogy:** CSP is like a **certificate pinning** strategy:
- You're saying "I trust ONLY resources I explicitly allow"
- External attacker cannot modify your policies (sent by browser, not modifiable by JS)
- This is **defense in depth**: multiple layers of security

### 3. Attribute Security: The `rel` Attribute

In your portfolio template:
```html
<a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
```

Breaking this down:
- `target="_blank"` = Open in new tab
- `rel="noopener"` = New page cannot access `window.opener`
- `rel="noreferrer"` = Don't send `Referer` header

**Why this matters:**

Without `rel="noopener"`, the linked page could:
```javascript
// Malicious code on github.com (if compromised):
if (window.opener) {
    window.opener.location = "https://phishing-site.com";
    // YOUR browser (the opener) gets redirected!
}
```

With `rel="noopener"`, `window.opener` is `null`, so the attack fails.

**For cryptographers:** This is **access control**—you're declaring "what access does the linked page have to this page's context?" Answer: none.

### 4. Metadata Security

Your `<head>` includes:
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**`charset` is security-critical:**

Different character encodings can hide attacks:
```
UTF-8:     The standard, safest encoding
UTF-7:     Legacy, can hide scripts (example: `+ADw-img` = `<img`)
UTF-16:    Can bypass filters
ISO-2022:  State-based encoding, can flip parser modes
```

By explicitly declaring `UTF-8`, you're saying: "Parse ONLY as UTF-8, nothing else." This prevents **encoding-based attacks**.

**Browser behavior:**
1. Sees `<meta charset="UTF-8">`
2. If content was already parsed differently, re-parses as UTF-8
3. This is why it's the **first element** in `<head>`

### 5. Avoiding Common HTML Security Mistakes

| ❌ Unsafe | ✅ Safe | Why |
|-----------|---------|-----|
| `<div>` for links | `<a href="...">` | Semantic, keyboard accessible |
| `onclick="handler()"` | `addEventListener` in JS | Separates content from behavior |
| `<form>` without CSRF token | Include CSRF token (explained later) | Prevents cross-site attacks |
| `<img src="data:image/svg,<script>...">` | Validate SVG content | SVG in `src` can execute script |
| External `<script src="cdn...">` | Host scripts locally | CSP controls this better |

---

## HTML's Role in the Web Stack

### The Three-Layer Architecture

Modern web development is **layered**:

```
                    USER BROWSER
                         ↑
              ┌───────────┼───────────┐
              ↓           ↓           ↓
        [HTML]      [CSS]        [JavaScript]
     (Structure)  (Presentation) (Behavior)
              ↑           ↑           ↑
    ┌─────────┴───────────┴───────────┴─────────┐
    │                                             │
    │    DOM (Document Object Model)              │
    │    Tree representation in browser memory    │
    │                                             │
    └─────────────────────────────────────────────┘
```

**For C++ programmers:** Think of this like:
- **HTML** = Data structures (what data exists)
- **CSS** = Formatting (how to display the data)
- **JavaScript** = Logic (what the program does)

**The DOM is the interface:** All three layers interact through the DOM:

```javascript
// JavaScript modifies the DOM:
const element = document.querySelector('h1');     // Query HTML structure
element.style.color = 'red';                      // Apply CSS
element.addEventListener('click', handler);       // Add behavior
```

### HTML ↔ CSS Relationship

**CSS needs HTML structure to style it:**

```html
<!-- HTML provides structure and classes: -->
<section class="portfolio">
    <article class="project-card">
        <h3>Project Name</h3>
    </article>
</section>
```

```css
/* CSS targets HTML elements: */
.portfolio {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.project-card {
    background: white;
    padding: 20px;
}
```

**Your portfolio template's `<head>`:**
```html
<link rel="stylesheet" href="css/style.css">
```

This **link element** tells the browser:
1. Fetch `css/style.css`
2. Parse it as CSS
3. Apply it to the HTML elements

**Why separate files?** 
- **Modularity:** Change styling without touching HTML
- **Caching:** Browser caches CSS separately
- **Performance:** Smaller files load faster
- **Separation of concerns:** Different people can edit HTML vs CSS

### HTML ↔ JavaScript Relationship

**JavaScript needs HTML structure to interact with it:**

```html
<!-- HTML provides elements: -->
<button id="myButton">Click me</button>
```

```javascript
// JavaScript finds and manipulates the element:
const button = document.getElementById('myButton');
button.addEventListener('click', function() {
    console.log('Clicked!');
});
```

**Your portfolio's JavaScript:**
```javascript
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    // ↑ JavaScript queries HTML structure
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // ↑ JavaScript attaches behavior to HTML elements
        });
    });
}
```

**In C++ terms:** This is like:
```cpp
// HTML is the data structure
struct HTMLElement {
    std::string tag;
    std::vector<HTMLElement> children;
};

// JavaScript is the algorithms that manipulate it
void processElements(HTMLElement& elem) {
    // Traverse and modify the structure
}
```

### Browser's Parsing Pipeline

When you visit your portfolio:

```
1. Browser receives HTML text
                ↓
2. HTML Parser reads it
   - Tokenizes HTML into tags, text, attributes
   - Builds DOM tree structure
                ↓
3. CSS is fetched and parsed
   - Creates CSSOM (CSS Object Model)
                ↓
4. CSSOM + DOM → Render Tree
   - Combines structure with styling
   - Calculates positions, sizes
                ↓
5. Layout Engine positions elements on screen
                ↓
6. JavaScript engine loaded
   - Executes `<script>` tags
   - Can modify DOM and CSS dynamically
                ↓
7. Browser renders final pixels on screen
```

**Security implications:** At each step, attacks are possible:
- **Step 2:** Malformed HTML parser can be exploited
- **Step 3:** CSS can leak information (CSS history attacks)
- **Step 6:** JavaScript is where most XSS happens
- **Between steps:** Timing attacks possible

This is why your portfolio implements CSP—it **controls step 6** (what JavaScript can run).

---

## Analysis of the Portfolio Template

Let's dissect your HTML template to see these concepts in action:

### 1. Document Head: Metadata & Configuration

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; ...">
    
    <title>Cryptography Portfolio</title>
    <link rel="stylesheet" href="css/style.css">
</head>
```

**Line by line:**

| Line | Purpose | Security Role |
|------|---------|---------------|
| `<!DOCTYPE html>` | Version declaration | Tells browser this is HTML5 |
| `<html lang="en">` | Root element | Indicates English language |
| `<meta charset="UTF-8">` | Character encoding | **Security:** Prevents encoding attacks |
| `<meta viewport>` | Responsive design | Mobile devices |
| `<meta http-equiv="X-UA-Compatible">` | Legacy IE support | (Mostly irrelevant now) |
| `<meta http-equiv="CSP">` | Security policy | **Security:** Restricts what scripts run |
| `<title>` | Browser tab text | Semantic metadata |
| `<link rel="stylesheet">` | CSS link | Styling |

### 2. Header: Navigation Structure

```html
<header>
    <nav class="navbar">
        <div class="nav-container">
            <h1 class="logo">CryptoShop</h1>
            <ul class="nav-links">
                <li><a href="index.html" class="active">Home</a></li>
                <li><a href="#portfolio">Portfolio</a></li>
                ...
            </ul>
        </div>
    </nav>
</header>
```

**Semantic analysis:**

| Element | Role | Why |
|---------|------|-----|
| `<header>` | Semantic wrapper | Declares "this is header content" |
| `<nav>` | Navigation region | Explicitly marks navigation |
| `<ul>` + `<li>` | List structure | Navigation is semantically a list |
| `<a href="...">` | Hyperlinks | Proper linking (not `<div onclick>`) |
| `class="active"` | CSS hook | Styled by CSS for current page |

**Accessibility benefit:** Screen readers understand this is navigation and can offer shortcuts.

### 3. Main Content: Semantic Sections

```html
<main>
    <section class="hero">
        <h1>Welcome to Cryptography Portfolio</h1>
    </section>

    <section id="portfolio" class="portfolio">
        <h2>Research & Projects</h2>
        <div class="projects-grid">
            <article class="project-card">
                <h3>Project Template 1</h3>
                <a href="https://github.com/..." 
                   target="_blank" 
                   rel="noopener noreferrer">
                    View on GitHub →
                </a>
            </article>
        </div>
    </section>
</main>
```

**Security analysis:**

| Feature | Security Benefit |
|---------|------------------|
| `<main>` | Marks primary content (not sidebars) |
| `<section>` | Thematic grouping (structure for parsing) |
| `<article>` | Self-contained cards (could be crawled independently) |
| `rel="noopener noreferrer"` | Prevents reverse tabnapping |
| `target="_blank"` | Opens in new tab without replacing original |

### 4. Heading Hierarchy: Semantic Correctness

Your template uses:
```html
<h1>Welcome to Cryptography Portfolio</h1>      <!-- Main title -->
<h2>Research & Projects</h2>                     <!-- Section heading -->
<h3>Project Template 1</h3>                      <!-- Subsection -->
```

**Why this matters:**

Screen readers expect:
```
Heading Structure (correct):
    H1: Page title
        H2: Section
            H3: Subsection

Heading Structure (incorrect):
    H1: Page title
        H3: Section (skipped H2!)
            H2: Subsection (out of order!)
```

Your template follows the correct hierarchy. This is **formal structure**.

---

## Advanced Topic: HTML as a Formal Language

### HTML as a Context-Free Grammar

Mathematically, HTML can be modeled as a **context-free language** (in formal language theory):

```
Document          → Prolog HTMLElement
Prolog            → "<!DOCTYPE html>"
HTMLElement       → OpenTag Content* CloseTag
                 | VoidElement

OpenTag           → "<" TagName Attributes ">"
CloseTag          → "</" TagName ">"
VoidElement       → "<" TagName Attributes ">"

Attributes        → Attribute*
Attribute         → AttrName "=" '"' AttrValue '"'

Content           → Text | HTMLElement

TagName           → [a-z]+
AttrName          → [a-z-]+
AttrValue         → ~'"'*           (anything but quotes)
Text              → ~<>*            (anything but angle brackets)
```

**Implications:**
- HTML is **unambiguous** (each sequence has exactly one parse tree)
- HTML is **recursive** (elements can contain elements)
- HTML is **not Turing-complete** (it's pure data structure)

### The HTML5 Parser Algorithm

Interestingly, HTML5 has a **detailed state machine** specification for parsing:

```
States in HTML parser:
├─ Data State
├─ Tag Open State
├─ Tag Name State
├─ Before Attribute Name State
├─ Attribute Name State
├─ After Attribute Name State
├─ Before Attribute Value State
├─ Attribute Value (Quoted) State
├─ Attribute Value (Unquoted) State
├─ ...and many more
```

The parser **transitions between states** based on input characters. This is formally a **deterministic finite automaton (DFA)**.

**Security implication:** Parser bugs are security vulnerabilities. Different browsers implement slightly differently, leading to parser discrepancies that attackers exploit.

---

## Conclusion: HTML in Your Learning Journey

### What You Should Understand

1. **HTML is data structure declaration**, not presentation
2. **Semantic markup** creates machine-understandable documents
3. **Security is multi-layered**: entity escaping, CSP, attribute controls
4. **HTML integrates with CSS and JavaScript** through the DOM
5. **Character encoding matters** for security

### Your Next Steps

1. **Understand the DOM:** How HTML elements map to JavaScript objects
   - Modify the portfolio template's elements with CSS classes
   - Use browser DevTools (F12) → Elements tab to inspect the DOM tree

2. **Practice semantic markup:** 
   - Audit your portfolio for semantic correctness
   - Check it on a screen reader (VoiceOver on Mac, NVDA on Windows)

3. **Security hardening:**
   - Understand what each CSP directive does
   - Experiment modifying the CSP to see what breaks
   - Research OWASP Top 10 for web vulnerabilities

4. **Formal grammar study:**
   - Read the HTML5 spec (developer.mozilla.org)
   - Understand browser parsing algorithms
   - Recognize parser vulnerabilities

### Parallels to Your Existing Knowledge

| Your Background | HTML Concept | Connection |
|-----------------|--------------|-----------|
| C/C++ | HTML tree structure | Like recursive data structures |
| Type systems | Semantic HTML tags | Like typed variables (h1, p, section have meaning) |
| Compilers | HTML parser | Like lexer/parser phases |
| Cryptography | Entity escaping | Like encoding untrusted data |
| Access control | CSP + rel attributes | Like permission models |

HTML is fundamentally a **formal language for structured data**. Your mathematical background gives you intuition for understanding its recursive, tree-based nature. Your cryptographic expertise helps you see where security controls apply.
