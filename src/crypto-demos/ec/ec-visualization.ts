/**
 * ============================================================================
 * ELLIPTIC CURVE VISUALIZATION - CANVAS RENDERING
 *
 * This module translates abstract elliptic curve mathematics into visual
 * representations on HTML5 canvas.
 *
 * DUAL VISUALIZATION MODES:
 * 1. Real curve: y² = x³ + ax + b over ℝ (smooth, continuous)
 * 2. Finite field: Points satisfying equation mod p (discrete scatter plot)
 *
 * DISCRIMINATED UNION:
 * VisualizerCurve = RealCurve | FiniteFieldCurve
 * Narrowed throughout via `'p' in curve` (p only exists on FiniteFieldCurve).
 *
 * ============================================================================
 */

import { Point, pointAdd, pointDouble } from './ec-math-utils';
import { modSqrt, modAdd, modMul, isDivisibleBySmallPrime } from '../rsa/math-utils';
import { Config } from '../../config';
import { UIUtils } from '../../ui-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ECVisualizerOptions {
    mode?:  'real' | 'finite';
    minX?:  number;
    maxX?:  number;
    minY?:  number;
    maxY?:  number;
}

/** Private to module — not exported */
interface Viewport {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface RealCurve {
    name: string;
    a:    number;
    b:    number;
}

export interface FiniteFieldCurve {
    name: string;
    a:    bigint;
    b:    bigint;
    p:    bigint;
}

export type VisualizerCurve = RealCurve | FiniteFieldCurve;

/** Finite-field point with BigInt coordinates */
interface FiniteFieldPoint { x: bigint; y: bigint }

/** Canvas-space coordinate pair */
interface CanvasCoord { x: number; y: number }

type PointAdditionCallback  = (result: Point) => void;
type ScalarMultiplyCallback = (result: Point) => void;

// ============================================================================
// ELLIPTIC CURVE VISUALIZER
// ============================================================================

/**
 * Elliptic Curve Visualizer
 *
 * Manages canvas rendering and animation for elliptic curve operations
 */
export class ECVisualizer {
    private canvas:         HTMLCanvasElement;
    private ctx:            CanvasRenderingContext2D;
    private mode:           'real' | 'finite';
    private curve:          VisualizerCurve | null;
    private viewport:       Viewport;
    private selectedPoints: FiniteFieldPoint[];
    private isAnimating: boolean;
    private colors:      typeof Config.ECC.COLORS;
    private pointRadius:    number;
    private width:          number;
    private height:         number;

    constructor(canvasId: string, options: ECVisualizerOptions = {}) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!canvas) {
            throw new Error(`Canvas element '${canvasId}' not found`);
        }
        this.canvas = canvas;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error(`Failed to get 2D context for canvas '${canvasId}'`);
        }
        this.ctx = ctx;

        // Visualization mode: 'real' or 'finite'
        this.mode = options.mode ?? 'real';

        // Current curve (will be set via setCurve)
        this.curve = null;

        // Viewport settings
        this.viewport = {
            minX: options.minX ?? -16,
            maxX: options.maxX ?? 16,
            minY: options.minY ?? -16,
            maxY: options.maxY ?? 16,
        };

        // Selected points (for interactive operations)
        this.selectedPoints = [];

        // Animation state
        this.isAnimating = false;

        // Colors from Config
        this.colors = Config.ECC.COLORS;

        // Point visualization settings
        this.pointRadius = Config.ECC.POINT_RADIUS.BIG;

        // Set default dimensions before first resize attempt
        this.canvas.width  = 800;
        this.canvas.height = 600;
        this.width         = 800;
        this.height        = 600;

        // Resize canvas to fill container
        this.resizeCanvas();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Resize canvas to match display size (for high DPI displays)
     *
     * Handles the case where the canvas is in a hidden tab (0×0 rect).
     */
    resizeCanvas(): void {
        const container = this.canvas.parentElement;
        const rect = container
            ? container.getBoundingClientRect()
            : this.canvas.getBoundingClientRect();

        let width  = rect.width;
        let height = rect.height;

        if (width === 0 || height === 0) {
            // Try to get dimensions from CSS
            const style = window.getComputedStyle(this.canvas);
            width  = parseInt(style.width)  || 800;
            height = parseInt(style.height) || 600;
            console.log(`Canvas ${this.canvas.id} dimensions from computed style: ${width}x${height}`);
        }

        // Set actual size in memory (scaled for high DPI)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width  = width  * dpr;
        this.canvas.height = height * dpr;

        // Scale context to match
        this.ctx.scale(dpr, dpr);

        // Set display size (CSS pixels)
        this.canvas.style.width  = width  + 'px';
        this.canvas.style.height = height + 'px';

        // Store dimensions for coordinate conversion
        this.width  = width;
        this.height = height;

        console.log(
            `Canvas ${this.canvas.id} resized to ${width}x${height} (display) / ` +
            `${this.canvas.width}x${this.canvas.height} (internal)`,
        );
    }

    /**
     * Set up mouse/touch event listeners for interactivity
     */
    setupEventListeners(): void {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });

        this.canvas.addEventListener('tab-visible', () => {
            console.log(`Canvas ${this.canvas.id} tab became visible - resizing`);
            this.resizeCanvas();
            this.render();
        });

        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.render();
            });
        }
    }

    /**
     * Set curve to visualize
     */
    setCurve(curve: VisualizerCurve): void {
        this.curve = curve;

        // Auto-adjust viewport based on mode
        if (this.mode === 'finite' && 'p' in curve) {
            // Primality test for p
            if (isDivisibleBySmallPrime(curve.p)) {
                throw new Error(`Number p (='${curve.p}') is not a prime`);
            }
            const p = Number(curve.p);
            if (p < Config.ECC.MAX_POINT_AMOUNT) {
                // Small field: show all points
                this.viewport = {
                    minX: -1,
                    maxX: p + 1,
                    minY: -1,
                    maxY: p + 1,
                };
            }
        }

        this.render();
    }

    // ========================================================================
    // COORDINATE CONVERSION
    // ========================================================================

    /**
     * Convert curve coordinates to canvas pixels
     *
     * x_pixel = (x_curve - minX) / (maxX - minX) * width
     * y_pixel = height - (y_curve - minY) / (maxY - minY) * height
     */
    curveToCanvas(x: number, y: number): CanvasCoord {
        const xRange = this.viewport.maxX - this.viewport.minX;
        const yRange = this.viewport.maxY - this.viewport.minY;

        const canvasX = ((x - this.viewport.minX) / xRange) * this.width;
        const canvasY = this.height - ((y - this.viewport.minY) / yRange) * this.height;

        return { x: canvasX, y: canvasY };
    }

    /**
     * Convert canvas pixels to curve coordinates
     */
    canvasToCurve(canvasX: number, canvasY: number): { x: number; y: number } {
        const xRange = this.viewport.maxX - this.viewport.minX;
        const yRange = this.viewport.maxY - this.viewport.minY;

        const x = (canvasX / this.width)             * xRange + this.viewport.minX;
        const y = ((this.height - canvasY) / this.height) * yRange + this.viewport.minY;

        return { x, y };
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Main render function
     */
    render(): void {
        if (!this.curve) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Invert colors for dark theme
        const userPreference = localStorage.getItem('theme');
        if (userPreference) {
            this.ctx.filter = userPreference === 'dark' ? 'invert(1)' : 'none';
        }

        // Draw coordinate axes
        this.drawAxes();

        // Draw curve (mode-dependent)
        if (this.mode === 'real') {
            this.drawRealCurve();
        } else if (this.mode === 'finite') {
            this.drawFiniteFieldCurve();
            this.drawSelectedPoints();
        }
    }

    /**
     * Draw coordinate axes with grid
     */
    drawAxes(): void {
        const ctx = this.ctx;

        // Grid lines (light gray)
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth   = 0.5;

        const isSmallFinite =
            this.mode === 'finite' &&
            this.curve !== null &&
            'p' in this.curve &&
            this.curve.p < 50n;

        // Vertical grid lines
        const xStep = isSmallFinite ? 1 : (this.viewport.maxX - this.viewport.minX) / 16;
        for (let x = Math.ceil(this.viewport.minX); x <= this.viewport.maxX; x += xStep) {
            const pos = this.curveToCanvas(x, 0);
            ctx.beginPath();
            ctx.moveTo(pos.x, 0);
            ctx.lineTo(pos.x, this.height);
            ctx.stroke();
        }

        // Horizontal grid lines
        const yStep = isSmallFinite ? 1 : (this.viewport.maxY - this.viewport.minY) / 16;
        for (let y = Math.ceil(this.viewport.minY); y <= this.viewport.maxY; y += yStep) {
            const pos = this.curveToCanvas(0, y);
            ctx.beginPath();
            ctx.moveTo(0, pos.y);
            ctx.lineTo(this.width, pos.y);
            ctx.stroke();
        }

        // Main axes (darker)
        ctx.strokeStyle = '#333';
        ctx.lineWidth   = 1.5;

        // X-axis
        const xAxisY = this.curveToCanvas(0, 0).y;
        if (xAxisY >= 0 && xAxisY <= this.height) {
            ctx.beginPath();
            ctx.moveTo(0, xAxisY);
            ctx.lineTo(this.width, xAxisY);
            ctx.stroke();
        }

        // Y-axis
        const yAxisX = this.curveToCanvas(0, 0).x;
        if (yAxisX >= 0 && yAxisX <= this.width) {
            ctx.beginPath();
            ctx.moveTo(yAxisX, 0);
            ctx.lineTo(yAxisX, this.height);
            ctx.stroke();
        }
    }

    /**
     * Draw curve over real numbers
     *
     * Samples x values, solves y² = x³ + ax + b, plots ±y solutions.
     * Uses bisection to find exact roots when ySquared changes sign.
     */
    drawRealCurve(): void {
        if (!this.curve || 'p' in this.curve) return;
        const curve = this.curve; // RealCurve

        const ctx   = this.ctx;
        const { a, b } = curve;

        ctx.strokeStyle = this.colors.CURVE;
        ctx.lineWidth   = 2;

        const numSamples = 500;
        const xStep      = (this.viewport.maxX - this.viewport.minX) / numSamples;

        let upperPath: { x: number; y: number }[] = [];
        let lowerPath: { x: number; y: number }[] = [];
        let prevYSquared: number | null = null;
        let prevX:        number | null = null;

        for (let i = 0; i <= numSamples; i++) {
            const x        = this.viewport.minX + i * xStep;
            const ySquared = x * x * x + a * x + b;

            if (ySquared === 0) {
                if (prevYSquared !== null && prevYSquared > 0) {
                    upperPath.push({ x, y: 0 });
                    lowerPath.push({ x, y: 0 });
                    if (upperPath.length > 1) {
                        this.drawPath(upperPath);
                        this.drawPath(lowerPath);
                    }
                    upperPath = [];
                    lowerPath = [];
                } else {
                    upperPath = [{ x, y: 0 }];
                    lowerPath = [{ x, y: 0 }];
                }
            } else if (prevYSquared !== null && prevX !== null && prevYSquared * ySquared < 0) {
                // Sign change — find exact root
                const root = this.findCubicRoot(prevX, x, a, b);
                if (root !== null) {
                    if (prevYSquared > 0 && ySquared < 0) {
                        // Curve ending
                        upperPath.push({ x: root, y: 0 });
                        lowerPath.push({ x: root, y: 0 });
                        if (upperPath.length > 1) {
                            this.drawPath(upperPath);
                            this.drawPath(lowerPath);
                        }
                        upperPath = [];
                        lowerPath = [];
                    } else {
                        // Curve starting
                        upperPath = [{ x: root, y: 0 }];
                        lowerPath = [{ x: root, y: 0 }];
                    }
                }
            }

            if (ySquared > 0) {
                const y = Math.sqrt(ySquared);
                upperPath.push({ x, y });
                lowerPath.push({ x, y: -y });
            }

            prevYSquared = ySquared;
            prevX        = x;
        }

        // Draw remaining paths
        if (upperPath.length > 1) {
            this.drawPath(upperPath);
            this.drawPath(lowerPath);
        }
    }

    /**
     * Find root of x³ + ax + b = 0 in interval [x1, x2] using bisection
     *
     * ALGORITHM: Bisection method — guaranteed convergence for continuous functions.
     * O(log(1/ε)) iterations for precision ε.
     */
    findCubicRoot(x1: number, x2: number, a: number, b: number): number | null {
        const f = (x: number) => x * x * x + a * x + b;

        const tolerance    = 1e-3;
        const maxIterations = 25;

        let left   = x1;
        let right  = x2;
        let fLeft  = f(left);
        let fRight = f(right);

        // Sanity check: ensure opposite signs
        if (fLeft * fRight > 0) {
            return null;
        }

        for (let iter = 0; iter < maxIterations; iter++) {
            const mid  = (left + right) / 2;
            const fMid = f(mid);

            if (Math.abs(fMid) < tolerance) {
                return mid;
            }

            if (fLeft * fMid < 0) {
                right  = mid;
                fRight = fMid;
            } else {
                left  = mid;
                fLeft = fMid;
            }

            if (Math.abs(right - left) < tolerance) {
                return (left + right) / 2;
            }
        }

        return (left + right) / 2;
    }

    /**
     * Draw a path through points (in curve coordinates)
     */
    drawPath(points: { x: number; y: number }[]): void {
        if (points.length < 2) return;

        const ctx   = this.ctx;
        ctx.beginPath();

        const start = this.curveToCanvas(points[0].x, points[0].y);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < points.length; i++) {
            const pos = this.curveToCanvas(points[i].x, points[i].y);
            ctx.lineTo(pos.x, pos.y);
        }

        ctx.stroke();
    }

    /**
     * Draw curve over finite field F_p
     *
     * For each x ∈ [0, p), computes y² = x³ + ax + b (mod p) and
     * plots both (x, y) and (x, -y) when a square root exists.
     */
    drawFiniteFieldCurve(): void {
        if (!this.curve || !('p' in this.curve)) return;
        const curve = this.curve; // FiniteFieldCurve

        const ctx = this.ctx;
        const { p } = curve;

        // Only plot if p is reasonably small
        if (p > BigInt(Config.ECC.MAX_POINT_AMOUNT)) {
            ctx.fillStyle   = '#666';
            ctx.font        = '14px sans-serif';
            ctx.textAlign   = 'center';
            ctx.fillText('Finite field too large to visualize', this.width / 2, this.height / 2);
            ctx.fillText(`(p = ${p})`, this.width / 2, this.height / 2 + 20);
            return;
        }

        const points = this.computeFiniteFieldPoints();

        // Choose point radius based on field size
        const maxAmt = BigInt(Config.ECC.MAX_POINT_AMOUNT);
        if (p < maxAmt / 64n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.BIG;
        } else if (p < maxAmt / 16n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.MEDIUM;
        } else if (p < maxAmt / 4n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.SMALL;
        } else if (p < maxAmt / 2n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.TINY;
        } else {
            this.pointRadius = Config.ECC.POINT_RADIUS.EXTRA_TINY;
        }

        ctx.fillStyle = this.colors.POINT;
        for (const point of points) {
            this.drawPoint(Number(point.x), Number(point.y), this.pointRadius);
        }

        // Display point count
        ctx.fillStyle = '#666';
        ctx.font      = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${points.length} points on E(F_${p})`, 10, 20);
    }

    /**
     * Compute all points on curve over F_p
     *
     * @returns Array of {x, y} points with BigInt coordinates
     */
    computeFiniteFieldPoints(): FiniteFieldPoint[] {
        if (!this.curve || !('p' in this.curve)) return [];
        const { a, b, p } = this.curve;

        const points: FiniteFieldPoint[] = [];

        for (let xNum = 0; xNum < Number(p); xNum++) {
            const x = BigInt(xNum);

            // Compute y² = x³ + ax + b (mod p)
            const x2       = modMul(x, x, p);
            const x3       = modMul(x2, x, p);
            const ax       = modMul(a, x, p);
            const ySquared = modAdd(modAdd(x3, ax, p), b, p);

            // Check if ySquared is a quadratic residue
            const y = modSqrt(ySquared, p);

            if (y !== null) {
                points.push({ x, y });

                // Add -y if y ≠ 0
                if (y !== 0n) {
                    points.push({ x, y: p - y });
                }
            }
        }

        return points;
    }

    /**
     * Draw a single point (in curve coordinates)
     */
    drawPoint(x: number, y: number, radius: number, color: string | null = null): void {
        const pos = this.curveToCanvas(x, y);

        this.ctx.fillStyle = color ?? this.colors.POINT;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    /**
     * Draw selected points with labels
     */
    drawSelectedPoints(): void {
        const ctx = this.ctx;

        for (let i = 0; i < this.selectedPoints.length; i++) {
            const point = this.selectedPoints[i];
            const label = String.fromCharCode(65 + i); // A, B, C, ...

            this.drawPoint(Number(point.x), Number(point.y), this.pointRadius * 1.5, '#e74c3c');

            const pos = this.curveToCanvas(Number(point.x), Number(point.y));
            ctx.fillStyle  = '#000';
            ctx.font       = 'bold 14px sans-serif';
            ctx.textAlign  = 'center';
            ctx.fillText(label, pos.x, pos.y - 15);
        }
    }

    // ========================================================================
    // ANIMATIONS
    // ========================================================================

    /**
     * Animate point addition: P + Q
     *
     * ANIMATION SEQUENCE:
     * 1. Highlight P and Q
     * 2. Draw line through P and Q (or tangent if P = Q)
     * 3. Show third intersection R with curve
     * 4. Reflect R across x-axis to get P + Q
     *
     * The callback is only invoked in finite-field mode.
     */
    async animatePointAddition(
        P:         FiniteFieldPoint,
        Q:         FiniteFieldPoint,
        callback?: PointAdditionCallback,
    ): Promise<void> {
        if (this.isAnimating) return;

        this.isAnimating = true;
        const ctx = this.ctx;

        // Convert to numbers for visualization
        const px = Number(P.x), py = Number(P.y);
        const qx = Number(Q.x), qy = Number(Q.y);

        // Step 1: Highlight points
        this.render();
        this.drawPoint(px, py, this.pointRadius * 2, '#e74c3c');
        this.drawPoint(qx, qy, this.pointRadius * 2, '#e74c3c');
        await this.delay(500);

        // Step 2: Draw line/tangent
        ctx.strokeStyle = this.colors.OPERATION_LINE;
        ctx.lineWidth   = 2;
        ctx.setLineDash([5, 5]);

        const pCanvas = this.curveToCanvas(px, py);
        const qCanvas = this.curveToCanvas(qx, qy);

        ctx.beginPath();
        ctx.moveTo(pCanvas.x, pCanvas.y);
        ctx.lineTo(qCanvas.x, qCanvas.y);

        // Extend line across canvas
        const dx     = qCanvas.x - pCanvas.x;
        const dy     = qCanvas.y - pCanvas.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const extend = Math.max(this.width, this.height) * 2;

        ctx.lineTo(pCanvas.x + (dx / length) * extend, pCanvas.y + (dy / length) * extend);
        ctx.moveTo(pCanvas.x, pCanvas.y);
        ctx.lineTo(pCanvas.x - (dx / length) * extend, pCanvas.y - (dy / length) * extend);
        ctx.stroke();
        ctx.setLineDash([]);

        await this.delay(1000);

        // Step 3: Compute result (finite mode only)
        if (this.mode === 'finite' && this.curve !== null && 'p' in this.curve) {
            const finiteCurve = this.curve; // FiniteFieldCurve satisfies CurveParams

            const Ppoint = new Point(P.x, P.y, finiteCurve);
            const Qpoint = new Point(Q.x, Q.y, finiteCurve);

            let result: Point;
            if (px === qx && py === qy) {
                result = pointDouble(Ppoint);
            } else {
                result = pointAdd(Ppoint, Qpoint);
            }

            if (!result.isInfinity) {
                this.drawPoint(
                    Number(result.x), Number(result.y),
                    this.pointRadius * 2,
                    this.colors.RESULT,
                );
            }

            await this.delay(1000);
            this.isAnimating = false;

            if (callback) callback(result);
            return;
        }

        // Real mode — show informational message
        ctx.fillStyle = '#666';
        ctx.font      = '12px sans-serif';
        ctx.fillText('Result point shown in discrete mode', 10, this.height - 10);

        await this.delay(1000);
        this.isAnimating = false;
    }

    /**
     * Animate scalar multiplication: kP
     *
     * Shows binary decomposition and double-and-add algorithm.
     * Only available in finite-field mode.
     */
    async animateScalarMultiplication(
        k:         bigint,
        P:         FiniteFieldPoint,
        callback?: ScalarMultiplyCallback,
    ): Promise<void> {
        if (this.isAnimating) return;
        if (this.mode !== 'finite') {
            UIUtils.showWarning('Scalar multiplication animation only available in finite field mode');
            return;
        }

        if (!this.curve || !('p' in this.curve)) return;
        const finiteCurve = this.curve; // FiniteFieldCurve

        this.isAnimating = true;

        // Show binary representation
        const binary = k.toString(2);
        console.log(`Computing ${k}P using binary: ${binary}`);

        let result: Point = Point.infinity(finiteCurve);
        let temp:   Point = new Point(P.x, P.y, finiteCurve);

        for (let i = 0; i < binary.length; i++) {
            const bit = binary[binary.length - 1 - i];

            if (bit === '1') {
                this.render();
                this.drawPoint(Number(temp.x), Number(temp.y), this.pointRadius * 2, '#e74c3c');
                await this.delay(300);

                result = pointAdd(result, temp);

                if (!result.isInfinity) {
                    this.drawPoint(
                        Number(result.x), Number(result.y),
                        this.pointRadius * 2,
                        this.colors.RESULT,
                    );
                }
                await this.delay(300);
            }

            temp = pointDouble(temp);
        }

        this.isAnimating = false;

        if (callback) callback(result);
    }

    /**
     * Delay helper for animations
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================================================
    // INTERACTIVITY
    // ========================================================================

    /**
     * Handle canvas click
     *
     * In finite-field mode: selects nearest point on curve.
     * In real mode: logs coordinates.
     */
    handleClick(event: MouseEvent): void {
        const rect    = this.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;

        const curveCoords = this.canvasToCurve(canvasX, canvasY);

        if (this.mode === 'finite') {
            const nearestPoint = this.findNearestPoint(curveCoords.x, curveCoords.y);

            if (nearestPoint) {
                this.selectPoint(nearestPoint);
            }
        } else {
            console.log(`Clicked: (${curveCoords.x.toFixed(2)}, ${curveCoords.y.toFixed(2)})`);
        }
    }

    /**
     * Find nearest point on curve to given canvas coordinates
     */
    findNearestPoint(x: number, y: number): FiniteFieldPoint | null {
        if (!this.curve || !('p' in this.curve)) return null;

        const points = this.computeFiniteFieldPoints();

        let minDist = Infinity;
        let nearest: FiniteFieldPoint | null = null;

        for (const point of points) {
            const dx   = Number(point.x) - x;
            const dy   = Number(point.y) - y;
            const dist = dx * dx + dy * dy;

            if (dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        }

        // Only select if reasonably close
        const threshold = (this.viewport.maxX - this.viewport.minX) * 0.05;
        if (minDist < threshold * threshold) {
            return nearest;
        }

        return null;
    }

    /**
     * Select a point for operations (max 2 points)
     */
    selectPoint(point: FiniteFieldPoint): void {
        if (this.selectedPoints.length >= 2) {
            this.selectedPoints = [];
        }

        this.selectedPoints.push(point);
        this.render();

        console.log(`Selected point: (${point.x}, ${point.y})`);
    }

    /**
     * Clear selected points
     */
    clearSelection(): void {
        this.selectedPoints = [];
        this.render();
    }

    /**
     * Get selected points
     */
    getSelectedPoints(): FiniteFieldPoint[] {
        return this.selectedPoints;
    }
}
