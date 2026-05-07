// export default { PATH_SIMPLY_CONFIG, ramerDouglasPeuPathFilter, angularVarianceFilter, bbox,dist,wExtend}

// this can convert a user inputed mousemove data with a few hundred points to only 10-30
// it also annotates CORNERS/CURVES, snapps to self-defined grid
//   you can return the snapp points to retrive symmetries
// -> usable as basis to create svg path of simple icons 

// Configuration
const PATH_SIMPLY_CONFIG = {
    // How much the simplified path can deviate from your sketch (in pixels)
    // 1.0 = Very precise, more points. 3.0 = Aggressive rectiving and snapping to corners.
    SIMPLIFY_EPSILON:  2, 
    SNAP_PERCENT:  0.08, // ~0.08 percentage of a width    0.02 (round) ..  0.15 (snapp to grid)
    CORNER_THRESHOLD:  45 / 360 * Math.PI * 2, // ~45 degrees
    STRAIGHT_THRESHOLD:  4 / 360 * Math.PI * 2,      // ~4.5 degrees variance
    MAX_ANCHOR_LOCK_BACK:  4,
    USE_APEX:  false,
    USE_STORE_ANCHORS: true,
}

//// Util 2d helpers for automatic parameter infer
function bbox(pnts) {
    let minX = Infinity, maxX = 0, minY = Infinity, maxY = 0;
    for (const p of pnts) {
        if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
        if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    return [minX, maxX, minY, maxY];
}
function widthExtend(pnts) { const _bbox = bbox(pnts); return _bbox[1] - _bbox[0] }
const dist2d = (p1, p2) => Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);


/** Reduces the amount of lines in Path with a apporpriate aproximation  */
function ramerDouglasPeuPathFilter(pnts, epsilon = PATH_SIMPLY_CONFIG. SIMPLIFY_EPSILON) {
    if (pnts.length <= 2) return pnts;
    let dmax = 0; let maxI = 0; let cdmax = 0;
    const last = pnts.length - 1;
    for (let i = 1; i < last; i++) {
        // if(pnts[i].CMD) dmax=Infinity, maxI=i; // split at a Move or other svg path instruction 
        if ((cdmax = distToSegment(pnts[i], pnts[0], pnts[last])) > dmax) { maxI = i; dmax = cdmax; }
    }
    if (dmax > epsilon) {
        const res1 = ramerDouglasPeuPathFilter(pnts.slice(0, maxI + 1), epsilon);
        const res2 = ramerDouglasPeuPathFilter(pnts.slice(maxI), epsilon);
        return res1.slice(0, res1.length - 1).concat(res2);
    } else {
        return [pnts[0], pnts[last]];
    }
}
// Distance from point p to line segment vw
function distToSegment(p, v, w) {
    const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
    if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1]);
    let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (v[0] + t * (w[0] - v[0])), p[1] - (v[1] + t * (w[1] - v[1])))
}

function angularVarianceFilter(points, snapPercent = PATH_SIMPLY_CONFIG.SNAP_PERCENT, wExtend = widthExtend(points)) {
    if (points.length < 2) return points;
    const snapThreshold = snapPercent * wExtend;
    
    let didSnap = 0;
    let lastDeltaSnapDist=Infinity;
    
    // Helpers to snap value to a set of visited coordinates
    const snap = (val, set,) => {
        for (let v of set) if (Math.abs(val - v) < snapThreshold) { didSnap = v; return v; }
        didSnap = 0; return val;
    };
    const deltaSnap = (val, dval, set, lastAnchorXorY,minOtherSnapp=Infinity) => {
        const threshold = Math.min(snapThreshold, minOtherSnapp )
        for (let v of set){
            lastDeltaSnapDist = Math.abs(Math.abs(dval) - v); 
            if ( lastDeltaSnapDist < threshold) {
                didSnap = v; return lastAnchorXorY + Math.sign(dval) * v; // keep the input direction sign but use this dxy scale
            }
        } 
        didSnap = 0;
        return val;
    }
    const visitedX = new Set();
    const visitedY = new Set();
    const visitedDX = new Set(); // only dx between following corners or maybee curve extrem values
    const visitedDY = new Set();
    const processed = [];

    // 1. Calculate angles and classify points
    const metadata = points.map((p, i) => {
        // if (i === 0 || i === points.length - 1) return { type: 'CORNER', ...p };

        const prev = points[i-1]??[1,0], next = points[ i + 1]??points[0];
        const dxIn = p[0] - prev[0], dyIn = p[1] - prev[1];
        const dxOut = next[0] - p[0], dyOut = next[1] - p[1];

        const angleIn = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
        const angleOut = Math.atan2(next[1] - p[1], next[0] - p[0]);

        let diff = Math.abs(angleOut - angleIn);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        // APEX DETECTION: Sign change in movement (Local Min/Max)
        const isApex = PATH_SIMPLY_CONFIG.USE_APEX && ((Math.sign(dxIn) !== Math.sign(dxOut) && dxOut !== 0) ||
            (Math.sign(dyIn) !== Math.sign(dyOut) && dyOut !== 0));

        if ( i==0 || i==points.length-1 || diff >  PATH_SIMPLY_CONFIG.CORNER_THRESHOLD|| p.CMD=="M") return { type: 'CORNER', angle: angleOut,...p };
        if (isApex) return { type: 'APEX', angle: angleOut, ...p }; // The "tip" of the curve
        if (diff < PATH_SIMPLY_CONFIG.STRAIGHT_THRESHOLD) return { type: 'STRAIGHT', angle: angleOut,...p };
        return { type: 'CURVE', angle: angleOut, ...p };
    });
    let lastAnchorX = [];
    let lastAnchorY = [];
    const allPntsSet = new Set();
    // 2. Process with Spatial Memory
    points.forEach((p, i) => {
        let {0:x, 1:y} = p;
        const meta = metadata[i];

        if (meta.type === 'CORNER' || meta.type === 'APEX') {
            let minXSnapp = Infinity; let minYSnapp = Infinity;
            x = snap(x, visitedX); // Corners are anchors: they snap to memory AND update memory
            if(didSnap) meta.snapX=didSnap,minXSnapp=0;
            y = snap(y, visitedY);
            if(didSnap) meta.snapY=didSnap,minYSnapp=0;
            visitedX.add(x);
            visitedY.add(y);
            // search n previous points for straight/intresting lines to determine delta snapp distances
            for (let i = 0; i < lastAnchorX.length; i++) { 
                const anchorX = lastAnchorX[i]; const anchorY = lastAnchorY[i];
                let cdx = x - anchorX; // !!! do not yet call .abs , direction is needed in deltasnap
                let cdy = y - anchorY;
                if(minXSnapp>0){
                    x = deltaSnap(x, cdx, visitedDX, anchorX,minXSnapp);
                    if(didSnap)  meta.snapDX=didSnap,minXSnapp=lastDeltaSnapDist;
                } 
                if(minYSnapp>0){
                    y = deltaSnap(y, cdy, visitedDY, anchorY,minYSnapp);
                    if(didSnap)  meta.snapDY=didSnap,minYSnapp=minYSnapp;
                }
                cdx = Math.abs(cdx);
                cdy = Math.abs(cdy);

                // compare with previous to estalblished new snap deltas
                if ( cdx > 0 && cdx < snapThreshold && cdy!==0) { // vertical line
                    visitedDX.add( cdx );
                }
                if ( cdy > 0 && Math.abs(cdy) < snapThreshold && cdx!==0) { // horizonatal line
                    visitedDY.add( cdy );
                }
                if(  ((cdy / cdx)-1) < 0.05  ){ // 45deg line
                    visitedDX.add(cdx);
                    visitedDY.add(cdy);
                }
            }
            lastAnchorX.push(x);
            lastAnchorY.push(y);
            if (lastAnchorX.length >= PATH_SIMPLY_CONFIG.MAX_ANCHOR_LOCK_BACK) { lastAnchorX.shift(); lastAnchorY.shift(); }
        }
        else if (meta.type === 'STRAIGHT') {
            // Straight lines snap to axis (0, 45, 90...)
            const angle = meta.angle;
            const sector = Math.round(angle / (Math.PI / 4));
            const targetAngle = sector * (Math.PI / 4);

            // Re-calculate X/Y based on snapped angle from previous point
            const prev = processed[i - 1]??[0,0];
            const dist = Math.hypot(x - prev[0], y - prev[1]);

            x = Math.round(prev[0] + dist * Math.cos(targetAngle));
            y = Math.round(prev[1] + dist * Math.sin(targetAngle));
            // Also try to snap to global X/Y memory
            x = snap(x, visitedX);
            y = snap(y, visitedY);
        }
        // If meta.type === 'CURVE', we do nothing. No snapping. Pure raw data.

        if (allPntsSet.has(x + "," + y)){
            meta.overlapps= true;
            if(x==processed[0][0] && y==processed[0][1] ){
                meta.closed = true;
            }
        }
        allPntsSet.add(x + "," + y);
        processed.push({ ...meta, 0: x, 1: y });
    });
    if(PATH_SIMPLY_CONFIG. USE_STORE_ANCHORS){
        const nonEnumProps =  {visitedX, visitedY, visitedDX,visitedDY};
        for(const key in nonEnumProps) nonEnumProps[key] = {value:nonEnumProps[key]};
        Object.defineProperties(processed, nonEnumProps);
    }
    return processed;
}