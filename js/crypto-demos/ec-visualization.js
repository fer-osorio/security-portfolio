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
 * INTERACTIVE FEATURES:
 * - Click points to select them
 * - Animate point addition (chord-and-tangent method)
 * - Animate scalar multiplication (repeated doubling)
 * - Pan and zoom for exploration
 *
 * MATHEMATICAL VISUALIZATION:
 * - Geometric interpretation of point addition
 * - Tangent lines for point doubling
 * - Reflection across x-axis
 * - Identity element (point at infinity)
 *
 * This bridges the gap between:
 * - Abstract algebra (group operations)
 * - Analytic geometry (curves, lines, intersections)
 * - Finite field arithmetic (discrete points)
 *
 * ============================================================================
 */

/**
 * Elliptic Curve Visualizer
 *
 * Manages canvas rendering and animation for elliptic curve operations
 */
class ECVisualizer {
    /**
     * @param {String} canvasId - Canvas element ID
     * @param {Object} options - Visualization options
     */
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element '${canvasId}' not found`);
        }

        this.ctx = this.canvas.getContext('2d');

        // Visualization mode: 'real' or 'finite'
        this.mode = options.mode || 'real';

        // Current curve (will be set via setCurve)
        this.curve = null;

        // Viewport settings (for panning and zooming)
        this.viewport = {
            minX: options.minX || -10,
            maxX: options.maxX || 10,
            minY: options.minY || -10,
            maxY: options.maxY || 10
        };

        // Selected points (for interactive operations)
        this.selectedPoints = [];

        // Animation state
        this.isAnimating = false;
        this.animationFrame = null;

        // Colors from Config
        this.colors = Config.ECC.COLORS;

        // Point visualization settings
        this.pointRadius = Config.ECC.POINT_RADIUS.BIG;

        // Set default dimensions before first resize attempt
        // This ensures canvas has non-zero dimensions even in hidden tabs
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.width = 800;
        this.height = 600;

        // Resize canvas to fill container
        this.resizeCanvas();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Resize canvas to match display size (for high DPI displays)
     *
     * FIX: Handle case where canvas is in hidden tab (getBoundingClientRect returns 0x0)
     * If dimensions are zero, fall back to CSS-defined dimensions or sensible defaults
     */
    resizeCanvas() {
        // Get dimensions from parent container, not canvas itself
        // Canvas has width: 100%, so its getBoundingClientRect() returns resolved min-width
        // We want the container's width instead
        const container = this.canvas.parentElement;
        const rect = container ? container.getBoundingClientRect() : this.canvas.getBoundingClientRect();

        // If canvas is hidden (0x0), use fallback dimensions
        let width = rect.width;
        let height = rect.height;

        if (width === 0 || height === 0) {
            // Try to get dimensions from CSS
            const style = window.getComputedStyle(this.canvas);
            width = parseInt(style.width) || 800;   // Fallback to 800px
            height = parseInt(style.height) || 600; // Fallback to 600px

            console.log(`Canvas ${this.canvas.id} dimensions from computed style: ${width}x${height}`);
        }

        // Set actual size in memory (scaled for high DPI)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        // Scale context to match
        this.ctx.scale(dpr, dpr);

        // Set display size (CSS pixels)
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Store dimensions for coordinate conversion
        this.width = width;
        this.height = height;

        console.log(`Canvas ${this.canvas.id} resized to ${width}x${height} (display) / ${this.canvas.width}x${this.canvas.height} (internal)`);
    }

    /**
     * Set up mouse/touch event listeners for interactivity
     */
    setupEventListeners() {
        // Click to select points
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Resize on window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });

        // Re-resize when tab becomes visible
        this.canvas.addEventListener('tab-visible', () => {
            console.log(`Canvas ${this.canvas.id} tab became visible - resizing`);
            this.resizeCanvas();
            this.render();
        });
    }

    /**
     * Set curve to visualize
     *
     * @param {Object} curve - Curve parameters {a, b, p} or EllipticCurve
     */
    setCurve(curve) {
        this.curve = curve;

        // Auto-adjust viewport based on mode
        if (this.mode === 'finite' && curve.p) {
            const p = Number(curve.p);
            if (p < Config.ECC.MAX_POINT_AMOUNT) {
                // Small field: show all points
                this.viewport = {
                    minX: -1,
                    maxX: p + 1,
                    minY: -1,
                    maxY: p + 1
                };
            }
        } else if (this.mode === 'real') {
            // Auto-adjust viewport for real curves
            this.viewport = this.calculateOptimalViewport(curve);
        }

        this.render();
    }

    /**
     * Calculate optimal viewport for real curve visualization
     *
     * MATHEMATICAL APPROACH:
     * For y² = x³ + ax + b, the curve exists where x³ + ax + b ≥ 0
     *
     * STRATEGY:
     * 1. Find critical points where dy/dx = 0 (local extrema)
     * 2. Find inflection point (typically around x = 0 for standard curves)
     * 3. Sample the curve to find actual y-range
     * 4. Add padding for better visualization
     *
     * CRITICAL POINTS:
     * From implicit differentiation: 2y(dy/dx) = 3x² + a
     * At extrema: dy/dx = 0, so we need y = 0 or the tangent is vertical
     * This occurs when 3x² + a = 0 → x = ±√(-a/3) (if a < 0)
     *
     * @param {Object} curve - {a, b}
     * @returns {Object} - {minX, maxX, minY, maxY}
     */
    calculateOptimalViewport(curve) {
        const a = Number(curve.a);
        const b = Number(curve.b);

        // Find x-range by analyzing the cubic
        // We want to find where x³ + ax + b = 0 (curve touches x-axis)
        // and extend a bit beyond that

        let xMin, xMax;

        // For standard curves like y² = x³ + 7, the curve extends from negative to positive
        // Find approximate root of x³ + ax + b = 0 for left boundary

        // Heuristic: For a = 0 (Koblitz curves), use cube root of -b
        if (Math.abs(a) < 0.01) {
            // y² = x³ + b
            // Curve starts around x = ∛(-b) if b > 0
            const criticalX = b > 0 ? -Math.pow(b, 1/3) : -Math.pow(-b, 1/3);
            xMin = criticalX - 2;
            xMax = Math.abs(criticalX) + Math.abs(b) + 5;
        } else if (a < 0) {
            // Curve has a local maximum/minimum
            // Critical point at x = √(-a/3)
            const criticalX = Math.sqrt(-a / 3);
            xMin = -criticalX - 3;
            xMax = criticalX + 3;
        } else {
            // a ≥ 0: curve is monotonic, use heuristic range
            xMin = -5;
            xMax = 5;
        }

        // Sample the curve to find y-range
        let yMin = 0, yMax = 0;
        const samples = 200;
        const step = (xMax - xMin) / samples;

        for (let i = 0; i <= samples; i++) {
            const x = xMin + i * step;
            const ySquared = x * x * x + a * x + b;

            if (ySquared >= 0) {
                const y = Math.sqrt(ySquared);
                yMin = Math.min(yMin, -y);
                yMax = Math.max(yMax, y);
            }
        }

        // Add 20% padding for better visualization
        const xPadding = (xMax - xMin) * 0.2;
        const yPadding = (yMax - yMin) * 0.2;

        // Ensure viewport is centered around origin if curve is symmetric
        // Most elliptic curves are symmetric about x-axis
        const yAbsMax = Math.max(Math.abs(yMin), Math.abs(yMax));

        return {
            minX: xMin - xPadding,
            maxX: xMax + xPadding,
            minY: -yAbsMax - yPadding,
            maxY: yAbsMax + yPadding
        };
    }

    // ========================================================================
    // COORDINATE CONVERSION
    // ========================================================================

    /**
     * Convert curve coordinates to canvas pixels
     *
     * COORDINATE SYSTEMS:
     * - Curve: Mathematical coordinates (can be large or negative)
     * - Canvas: Pixel coordinates (0,0 at top-left, y increases downward)
     *
     * TRANSFORMATION:
     * x_pixel = (x_curve - minX) / (maxX - minX) * width
     * y_pixel = height - (y_curve - minY) / (maxY - minY) * height
     *
     * @param {Number} x - Curve x-coordinate
     * @param {Number} y - Curve y-coordinate
     * @returns {Object} - {x, y} in canvas pixels
     */
    curveToCanvas(x, y) {
        const xRange = this.viewport.maxX - this.viewport.minX;
        const yRange = this.viewport.maxY - this.viewport.minY;

        const canvasX = ((x - this.viewport.minX) / xRange) * this.width;
        const canvasY = this.height - ((y - this.viewport.minY) / yRange) * this.height;

        return { x: canvasX, y: canvasY };
    }

    /**
     * Convert canvas pixels to curve coordinates
     *
     * @param {Number} canvasX - Canvas x-coordinate
     * @param {Number} canvasY - Canvas y-coordinate
     * @returns {Object} - {x, y} in curve coordinates
     */
    canvasToCurve(canvasX, canvasY) {
        const xRange = this.viewport.maxX - this.viewport.minX;
        const yRange = this.viewport.maxY - this.viewport.minY;

        const x = (canvasX / this.width) * xRange + this.viewport.minX;
        const y = ((this.height - canvasY) / this.height) * yRange + this.viewport.minY;

        return { x, y };
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Main render function
     *
     * RENDERING ORDER:
     * 1. Clear canvas
     * 2. Draw axes
     * 3. Draw curve
     * 4. Draw selected points
     * 5. Draw operation lines (if any)
     */
    render() {
        if (!this.curve) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw coordinate axes
        this.drawAxes();

        // Draw curve (mode-dependent)
        if (this.mode === 'real') {
            this.drawRealCurve();
        } else if (this.mode === 'finite') {
            this.drawFiniteFieldCurve();
        }

        // Draw selected points
        this.drawSelectedPoints();
    }

    /**
     * Draw coordinate axes with grid
     */
    drawAxes() {
        const ctx = this.ctx;

        // Grid lines (light gray)
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        // Vertical grid lines
        const xStep = this.mode === 'finite' && this.curve.p < 50 ? 1 :
        (this.viewport.maxX - this.viewport.minX) / 10;
        for (let x = Math.ceil(this.viewport.minX); x <= this.viewport.maxX; x += xStep) {
            const pos = this.curveToCanvas(x, 0);
            ctx.beginPath();
            ctx.moveTo(pos.x, 0);
            ctx.lineTo(pos.x, this.height);
            ctx.stroke();
        }

        // Horizontal grid lines
        const yStep = this.mode === 'finite' && this.curve.p < 50 ? 1 :
        (this.viewport.maxY - this.viewport.minY) / 10;
        for (let y = Math.ceil(this.viewport.minY); y <= this.viewport.maxY; y += yStep) {
            const pos = this.curveToCanvas(0, y);
            ctx.beginPath();
            ctx.moveTo(0, pos.y);
            ctx.lineTo(this.width, pos.y);
            ctx.stroke();
        }

        // Main axes (darker)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;

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
     * APPROACH:
     * 1. Sample x values densely
     * 2. For each x, solve y² = x³ + ax + b
     * 3. Plot both +y and -y solutions
     * 4. Handle discontinuities (curve may have 1 or 2 components)
     *
     * MATHEMATICAL NOTE:
     * Curve may be disconnected if discriminant changes sign
     */
    drawRealCurve() {
        const ctx = this.ctx;
        const { a, b } = this.curve;

        ctx.strokeStyle = this.colors.CURVE;
        ctx.lineWidth = 2;

        // Sample points
        const numSamples = 500;
        const xStep = (this.viewport.maxX - this.viewport.minX) / numSamples;

        let upperPath = [];
        let lowerPath = [];

        for (let i = 0; i <= numSamples; i++) {
            const x = this.viewport.minX + i * xStep;

            // Compute y² = x³ + ax + b
            const ySquared = x * x * x + Number(a) * x + Number(b);

            if (ySquared >= 0) {
                const y = Math.sqrt(ySquared);
                upperPath.push({ x, y });
                lowerPath.push({ x, y: -y });
            } else {
                // Discontinuity: start new path
                if (upperPath.length > 1) {
                    this.drawPath(upperPath);
                    this.drawPath(lowerPath);
                }
                upperPath = [];
                lowerPath = [];
            }
        }

        // Draw remaining paths
        if (upperPath.length > 1) {
            this.drawPath(upperPath);
            this.drawPath(lowerPath);
        }
    }

    /**
     * Draw a path through points
     *
     * @param {Array} points - Array of {x, y} in curve coordinates
     */
    drawPath(points) {
        if (points.length < 2) return;

        const ctx = this.ctx;
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
     * APPROACH:
     * 1. For each x ∈ [0, p), compute y² = x³ + ax + b (mod p)
     * 2. Check if y² is a quadratic residue (has square root)
     * 3. If yes, find y and plot both (x, y) and (x, -y)
     *
     * QUADRATIC RESIDUES:
     * For prime p, exactly (p-1)/2 non-zero elements are QRs
     * Use Euler's criterion: a^((p-1)/2) ≡ 1 (mod p) iff a is QR
     */
    drawFiniteFieldCurve() {
        const ctx = this.ctx;
        const { a, b, p } = this.curve;

        // Only plot if p is reasonably small
        if (!p || p > BigInt(Config.ECC.MAX_POINT_AMOUNT)) {
            ctx.fillStyle = '#666';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Finite field too large to visualize', this.width / 2, this.height / 2);
            ctx.fillText(`(p = ${p})`, this.width / 2, this.height / 2 + 20);
            return;
        }

        const points = this.computeFiniteFieldPoints();

        // Draw points
        if(p < BigInt(Config.ECC.MAX_POINT_AMOUNT) / 64n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.BIG;
        } else if(p < BigInt(Config.ECC.MAX_POINT_AMOUNT) / 16n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.MEDIUM;
        } else if(p < BigInt(Config.ECC.MAX_POINT_AMOUNT) / 4n) {
            this.pointRadius = Config.ECC.POINT_RADIUS.SMALL;
        } else {
            this.pointRadius = Config.ECC.POINT_RADIUS.TINY;
        }
        console.log("this.pointRadius = ", this.pointRadius);
        ctx.fillStyle = this.colors.POINT;
        for (const point of points) {
            this.drawPoint(Number(point.x), Number(point.y), this.pointRadius);
        }

        // Display point count
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${points.length} points on E(F_${p})`, 10, 20);
    }

    /**
     * Compute all points on curve over F_p
     *
     * @returns {Array} - Array of {x, y} points (BigInt coordinates)
     */
    computeFiniteFieldPoints() {
        const { a, b, p } = this.curve;
        const points = [];

        // Try each x value
        for (let xNum = 0; xNum < Number(p); xNum++) {
            const x = BigInt(xNum);

            // Compute y² = x³ + ax + b (mod p)
            const x2 = ECMathUtils.modMul(x, x, p);
            const x3 = ECMathUtils.modMul(x2, x, p);
            const ax = ECMathUtils.modMul(a, x, p);
            const ySquared = ECMathUtils.modAdd(ECMathUtils.modAdd(x3, ax, p), b, p);

            // Check if ySquared is a quadratic residue
            const y = ECMathUtils.modSqrt(ySquared, p);

            if (y !== null) {
                points.push({ x, y });

                // Add -y if y ≠ 0
                if (y !== 0n) {
                    const negY = p - y;
                    points.push({ x, y: negY });
                }
            }
        }

        return points;
    }

    /**
     * Draw a single point
     *
     * @param {Number} x - Curve x-coordinate
     * @param {Number} y - Curve y-coordinate
     * @param {Number} radius - Point radius in pixels
     * @param {String} color - Fill color (optional)
     */
    drawPoint(x, y, radius, color = null) {
        const pos = this.curveToCanvas(x, y);

        this.ctx.fillStyle = color || this.colors.POINT;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    /**
     * Draw selected points with labels
     */
    drawSelectedPoints() {
        const ctx = this.ctx;

        for (let i = 0; i < this.selectedPoints.length; i++) {
            const point = this.selectedPoints[i];
            const label = String.fromCharCode(65 + i); // A, B, C, ...

            // Draw point
            this.drawPoint(Number(point.x), Number(point.y), this.pointRadius * 1.5, '#e74c3c');

            // Draw label
            const pos = this.curveToCanvas(Number(point.x), Number(point.y));
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
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
     * @param {Object} P - Point {x, y} (BigInt or Number)
     * @param {Object} Q - Point {x, y} (BigInt or Number)
     * @param {Function} callback - Called when animation completes
     */
    async animatePointAddition(P, Q, callback = null) {
        if (this.isAnimating) return;

        this.isAnimating = true;
        const ctx = this.ctx;

        // Convert to Numbers for visualization
        const px = Number(P.x), py = Number(P.y);
        const qx = Number(Q.x), qy = Number(Q.y);

        // Step 1: Highlight points
        this.render();
        this.drawPoint(px, py, this.pointRadius * 2, '#e74c3c');
        this.drawPoint(qx, qy, this.pointRadius * 2, '#e74c3c');
        await this.delay(500);

        // Step 2: Draw line/tangent
        ctx.strokeStyle = this.colors.OPERATION_LINE;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const pCanvas = this.curveToCanvas(px, py);
        const qCanvas = this.curveToCanvas(qx, qy);

        ctx.beginPath();
        ctx.moveTo(pCanvas.x, pCanvas.y);
        ctx.lineTo(qCanvas.x, qCanvas.y);

        // Extend line across canvas
        const dx = qCanvas.x - pCanvas.x;
        const dy = qCanvas.y - pCanvas.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const extend = Math.max(this.width, this.height) * 2;

        ctx.lineTo(pCanvas.x + (dx / length) * extend, pCanvas.y + (dy / length) * extend);
        ctx.moveTo(pCanvas.x, pCanvas.y);
        ctx.lineTo(pCanvas.x - (dx / length) * extend, pCanvas.y - (dy / length) * extend);
        ctx.stroke();
        ctx.setLineDash([]);

        await this.delay(1000);

        // Step 3: Compute result
        let result;
        if (this.mode === 'finite') {
            // Use actual ECC operations
            const Ppoint = new ECMathUtils.Point(P.x, P.y, this.curve);
            const Qpoint = new ECMathUtils.Point(Q.x, Q.y, this.curve);

            if (px === qx && py === qy) {
                result = ECMathUtils.pointDouble(Ppoint);
            } else {
                result = ECMathUtils.pointAdd(Ppoint, Qpoint);
            }

            if (!result.isInfinity) {
                this.drawPoint(Number(result.x), Number(result.y), this.pointRadius * 2, this.colors.RESULT);
            }
        } else {
            // For real curves, show approximate third intersection
            // (actual computation would require solving cubic)
            ctx.fillStyle = '#666';
            ctx.font = '12px sans-serif';
            ctx.fillText('Result point shown in discrete mode', 10, this.height - 10);
        }

        await this.delay(1000);

        this.isAnimating = false;

        if (callback) callback(result);
    }

    /**
     * Animate scalar multiplication: kP
     *
     * SHOWS: Binary decomposition and double-and-add algorithm
     *
     * @param {BigInt} k - Scalar
     * @param {Object} P - Point
     * @param {Function} callback - Called when complete
     */
    async animateScalarMultiplication(k, P, callback = null) {
        if (this.isAnimating) return;
        if (this.mode !== 'finite') {
            UIUtils.showWarning('Scalar multiplication animation only available in finite field mode');
            return;
        }

        this.isAnimating = true;

        // Show binary representation
        const binary = k.toString(2);
        console.log(`Computing ${k}P using binary: ${binary}`);

        let result = ECMathUtils.Point.infinity(this.curve);
        let temp = new ECMathUtils.Point(P.x, P.y, this.curve);

        for (let i = 0; i < binary.length; i++) {
            const bit = binary[binary.length - 1 - i];

            if (bit === '1') {
                this.render();
                this.drawPoint(Number(temp.x), Number(temp.y), this.pointRadius * 2, '#e74c3c');
                await this.delay(300);

                result = ECMathUtils.pointAdd(result, temp);

                if (!result.isInfinity) {
                    this.drawPoint(Number(result.x), Number(result.y), this.pointRadius * 2, this.colors.RESULT);
                }
                await this.delay(300);
            }

            temp = ECMathUtils.pointDouble(temp);
        }

        this.isAnimating = false;

        if (callback) callback(result);
    }

    /**
     * Delay helper for animations
     *
     * @param {Number} ms - Milliseconds to wait
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================================================
    // INTERACTIVITY
    // ========================================================================

    /**
     * Handle canvas click
     *
     * BEHAVIOR:
     * - In finite field mode: Select nearest point on curve
     * - In real mode: Show coordinates
     *
     * @param {MouseEvent} event
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;

        const curveCoords = this.canvasToCurve(canvasX, canvasY);

        if (this.mode === 'finite') {
            // Find nearest point on curve
            const nearestPoint = this.findNearestPoint(curveCoords.x, curveCoords.y);

            if (nearestPoint) {
                this.selectPoint(nearestPoint);
            }
        } else {
            console.log(`Clicked: (${curveCoords.x.toFixed(2)}, ${curveCoords.y.toFixed(2)})`);
        }
    }

    /**
     * Find nearest point on curve to given coordinates
     *
     * @param {Number} x - Target x
     * @param {Number} y - Target y
     * @returns {Object|null} - Nearest point {x, y} or null
     */
    findNearestPoint(x, y) {
        if (!this.curve.p) return null;

        const points = this.computeFiniteFieldPoints();

        let minDist = Infinity;
        let nearest = null;

        for (const point of points) {
            const dx = Number(point.x) - x;
            const dy = Number(point.y) - y;
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
     * Select a point for operations
     *
     * @param {Object} point - Point {x, y}
     */
    selectPoint(point) {
        // Limit to 2 points
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
    clearSelection() {
        this.selectedPoints = [];
        this.render();
    }

    /**
     * Get selected points
     *
     * @returns {Array} - Array of selected points
     */
    getSelectedPoints() {
        return this.selectedPoints;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof window !== 'undefined') {
    window.ECVisualizer = ECVisualizer;
    console.log('✓ EC Visualizer module loaded');
}
