/**
 * vite-plugin-og-image.ts
 *
 * Build-time Open Graph image generator.
 *
 * What it does
 * ─────────────
 * 1. After Vite writes the final dist/ output (closeBundle hook), it launches
 *    a headless Chromium via Puppeteer.
 * 2. It loads a self-contained HTML template (og-image-template.html) that
 *    lives next to this file.
 * 3. It screenshots the page at 1200 × 630 px and writes the PNG to
 *    dist/assets/images/og-image.png.
 * 4. It updates every <meta property="og:image"> and
 *    <meta name="twitter:image"> tag in every dist/**\/\*.html file to point
 *    to the new image (relative or absolute, depending on the base option).
 *
 * Usage — vite.config.ts
 * ──────────────────────
 *   import { defineConfig }   from 'vite'
 *   import ogImagePlugin      from './vite-plugin-og-image'
 *
 *   export default defineConfig({
 *     base: '/security-portfolio/',
 *     plugins: [
 *       ogImagePlugin({
 *         // All fields are optional — defaults shown below
 *         templatePath : './og-image-template.html',
 *         outputPath   : 'assets/images/og-image.png',
 *         baseUrl      : 'https://fer-osorio.github.io/security-portfolio',
 *         width        : 1200,
 *         height       : 630,
 *       }),
 *     ],
 *   })
 *
 * Dependencies
 * ────────────
 *   npm install -D puppeteer
 *   (Puppeteer downloads Chromium automatically on install.)
 *
 * CI / GitHub Actions note
 * ─────────────────────────
 * Puppeteer needs a display server on Linux.  Add these env vars to your
 * workflow:
 *
 *   env:
 *     PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false'
 *
 * And install system deps before npm ci:
 *   - run: npx puppeteer browsers install chrome
 *
 * Or set PUPPETEER_EXECUTABLE_PATH to a pre-installed Chrome/Chromium.
 */

import fs   from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

/* ─── Plugin options ─────────────────────────────────────────────────────── */

export interface OgImagePluginOptions {
  /** Path to the HTML template file, relative to the project root.
   *  @default './og-image-template.html' */
  templatePath?: string

  /** Output path inside dist/, e.g. 'assets/images/og-image.png'.
   *  @default 'assets/images/og-image.png' */
  outputPath?: string

  /** Canonical base URL (no trailing slash) used to rewrite <meta> tags.
   *  If omitted, the plugin rewrites the path relative to the Vite base. */
  baseUrl?: string

  /** Screenshot width in pixels.  @default 1200 */
  width?: number

  /** Screenshot height in pixels.  @default 630 */
  height?: number

  /** Set to false to skip generation (e.g. in dev mode).
   *  @default true */
  enabled?: boolean
}

/* ─── Plugin ─────────────────────────────────────────────────────────────── */

export default function ogImagePlugin(opts: OgImagePluginOptions = {}): Plugin {
  const {
    templatePath = './og-image-template.html',
    outputPath   = 'assets/images/og-image.png',
    baseUrl,
    width        = 1200,
    height       = 630,
    enabled      = true,
  } = opts

  let resolvedConfig: ResolvedConfig

  return {
    name: 'vite-plugin-og-image',
    enforce: 'post',

    configResolved(config) {
      resolvedConfig = config
    },

    async closeBundle() {
      if (!enabled || resolvedConfig.command !== 'build') return

      const root     = resolvedConfig.root
      const outDir   = resolvedConfig.build.outDir
      const distDir  = path.resolve(root, outDir)
      const tmplPath = path.resolve(root, templatePath)
      const imgDest  = path.join(distDir, outputPath)

      /* ── 1. Validate the template exists ── */
      if (!fs.existsSync(tmplPath)) {
        console.warn(`[og-image] Template not found at ${tmplPath} — skipping.`)
        return
      }

      /* ── 2. Ensure the output directory exists ── */
      fs.mkdirSync(path.dirname(imgDest), { recursive: true })

      /* ── 3. Launch Puppeteer and take screenshot ── */
      console.log('[og-image] Generating OG image…')

      let puppeteer: typeof import('puppeteer')
      try {
        puppeteer = await import('puppeteer') as typeof import('puppeteer')
      } catch {
        console.error('[og-image] puppeteer is not installed.  Run: npm install -D puppeteer')
        return
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // Required in Docker / CI
        ],
      })

      try {
        const page = await browser.newPage()
        await page.setViewport({ width, height, deviceScaleFactor: 2 })

        const templateContent = fs.readFileSync(tmplPath, 'utf-8')

        // Load via data URI so all inline assets (fonts, SVG) resolve correctly
        await page.setContent(templateContent, { waitUntil: 'networkidle0' })

        await page.screenshot({
          path: imgDest,
          type: 'png',
          clip: { x: 0, y: 0, width, height },
        })

        console.log(`[og-image] Written → ${path.relative(root, imgDest)}`)
      } finally {
        await browser.close()
      }

      /* ── 4. Rewrite <meta> tags in every HTML file in dist/ ── */
      const viteBase = resolvedConfig.base ?? '/'
      const imagePublicPath = viteBase.replace(/\/$/, '') + '/' + outputPath

      // If caller supplied an absolute baseUrl, build a full URL
      const imageUrl = baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/${outputPath}`
        : imagePublicPath

      const htmlFiles = findHtmlFiles(distDir)
      for (const htmlFile of htmlFiles) {
        let html = fs.readFileSync(htmlFile, 'utf-8')
        html = rewriteOgMeta(html, 'og:image',       imageUrl)
        html = rewriteOgMeta(html, 'og:image:url',   imageUrl)
        html = rewriteOgTwitter(html, 'twitter:image', imageUrl)
        fs.writeFileSync(htmlFile, html, 'utf-8')
      }

      console.log(`[og-image] Updated og:image in ${htmlFiles.length} HTML file(s).`)
    },
  }
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function findHtmlFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findHtmlFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.html')) results.push(full)
  }
  return results
}

function rewriteOgMeta(html: string, property: string, value: string): string {
  // Matches both present and absent content values
  return html.replace(
    new RegExp(
      `(<meta\\s[^>]*property=["']${property}["'][^>]*content=["'])[^"']*(['"][^>]*>)`,
      'gi',
    ),
    `$1${value}$2`,
  ).replace(
    new RegExp(
      `(<meta\\s[^>]*content=["'])[^"']*(['"][^>]*property=["']${property}["'][^>]*>)`,
      'gi',
    ),
    `$1${value}$2`,
  )
}

function rewriteOgTwitter(html: string, name: string, value: string): string {
  return html.replace(
    new RegExp(
      `(<meta\\s[^>]*name=["']${name}["'][^>]*content=["'])[^"']*(['"][^>]*>)`,
      'gi',
    ),
    `$1${value}$2`,
  ).replace(
    new RegExp(
      `(<meta\\s[^>]*content=["'])[^"']*(['"][^>]*name=["']${name}["'][^>]*>)`,
      'gi',
    ),
    `$1${value}$2`,
  )
}
