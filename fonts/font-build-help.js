///// HTML/SVG util
const $attrs = (elm = document.body, attrs, val) => {
    attrs && typeof attrs !== "object" ? attrs = { [attrs]: val } : 0;
    if (attrs) for (let a in attrs) elm[attrs[a] == undefined ? 'removeAttribute' : 'setAttribute'](a, attrs[a]);
}
const $New = (tag = "", attrs = {}, childs = [], parent) => {
    let e = document.createElement(tag);
    $attrs(e, attrs);
    childs && e.append(...childs);
    parent?.appendChild?.(e);
    return e;
}
const $SVG = (tag = "", attrs = {}, childs = [], parent) => {
    let e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    $attrs(e, attrs);
    childs && e.append(...childs);
    parent?.appendChild?.(e);
    return e;
}

let fontW = 1000;
let fontH = 1000;

const blurEv = (ev) => {
    const el = ev?.target?.closest?.("pre[name]");
    if (!el) return;
    const W = (el.dataset.w ?? fontW);
    const H = (el.dataset.h ?? fontH);

    let previewSvg = el.lastElementChild;
    if (previewSvg?.localName !== "svg") {
        previewSvg = $SVG("svg", { "viewBox": `0 0 ${W} ${H}`, 'tabindex': 0, }, 0, el);
    }

    // use innerText, cause it deals intelegently with <br> of contenteditable, 
    // but innerText returns nothing if elm hidden in <details>, so for init use textContent as follback, you should use <br> in the static HTML anyway
    const dStr = gridToSvgPath(el.innerText || el.textContent, W, H, previewSvg);

    const pathEl = previewSvg.querySelector(`path[data-gly]`) || $SVG("path", { "data-gly": "" }, 0, previewSvg);

    const minMax = bbox(dStr);
    el.title = JSON.stringify(minMax);
    $attrs(pathEl, "d", dStr);
}
document.body.addEventListener("blur", blurEv, true,);

// init the pre icons in the html


document.body.onload = () => {
    for (const pre of document.querySelectorAll("pre[name]")) {
        blurEv({ target: pre });
    }
}
let _Cache = { grps: null, params: null };


function gridStats(gridString) {
    const lines = gridString.trim().split('\n');
    const gridH = lines.length;
    const gridW = lines.map(l => l.length).reduce((max, ll) => Math.max(max, ll));
    return [lines, gridW, gridH,];
}
// just toPrecision might return scientific notation  e.g. 1000 -> 1.00e3, which BREAKs svg paths
const trimNum = (num = 0, fix) => (+num.toPrecision(fix)).toFixed(3).replace(/(?<=\.\d*[1-9])0+$|\.0*$/, "");

////   THK Gemini    << 🍪🍪🍪
// heavily edited manually, 

const markerChars = { 
    '~': 1, '&': 1, 
    '§': {noData:true}, '-': { free: true,  needNextNum:true }, 
    '+':{needsData:true,format:['xy','xyW','xxyy'],needNextNum:true},
    // is only markers if directly after a vert 
    'x':{after:1,format:['x'],needNextNum:true},'y':{after:1, format:['y'],needNextNum:true}, 
    'X':{after:1,format:['X'],needNextNum:true},'Y':{after:1,format:['Y'],needNextNum:true}, 
    'P':{after:1, format:['XY','XXYY'],needNextNum:true},
    'p':{after:1, format:['xy','xxyy'],needNextNum:true}, 
    // for row columns based meta data
    ':': {needNextNum:true},
    '{':{},'}':{},
};

// grid in most cases only 16x10 or smaller, use UPPERCASE hexadeciaml nums and lowercase hexspell nums 
// to display a range of  -16 -1 15 with only one character cell 
//  -> less reformat need 
//  Ex. datum  07.05.
const compactNums = {
    0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,
    A:10,B:11,C:12,D:13,E:14,F:15,
    // hexspell char to num map tread by optical similarity of lowercase (for  P=-3 UPPER)
    // you may replace the german sharp ß by another symbol 
    l:-1,z:-2,w:-3,n:-4,s:-5,h:-6,t:-7,ß:-8/*gG*/,q:-9,
    a:-10,b:-11,c:-12,d:-13,e:-14,f:-15,
    // large alt letters are ratios
    L:0.1,Z:0.2,W:0.3,N:0.4,S:0.5,H:0.6,T:0.7,ẞ:0.8,Q:-0.9,
    O:0.0,
}
const usesCompactNums = "+";
const compactNumsRE = /^[0-9a-folzwnshtßq]/i;


/**    A+47   -> cor offset 4,7     B+8,e  -> B.xy+= {x:8,y:14}      
 *    compact wide valid cors to two chars:  D+16,-7  */
function parseCompactNums(str = "", formats = ['xy', 'xyW', 'xxyy'], dataObj={}) {
    let format = formats.find(f => str.length <= f.length) ?? formats.at(-1);

    const units = [...format].reduce( (us,f)=>(us.at(-1)==f? 0:us.push(f),us) ,[]); 
    
    const addUnit = (n,i)=> !isNaN(n) &&  (dataObj[units[i]] =  +n);

    if(/[+,.-]/.test(str)){// normal cors
        str.split(",").map( n=> [...n].reduce( (numStr,d)=>compactCombine(numStr,d),"")).forEach(addUnit); 
        return dataObj;
    } 
    let unitI = 0;
    let formatI = 0;
    for (let wrd = "", i = 0, ch; ch = str[i]; i++) {
        wrd = compactCombine(wrd,compactNums[ch]);
        if(i == str.length-1 || (format[formatI+1] && format[formatI+1]!==format[formatI])){
            addUnit(+wrd,unitI++);
            wrd="";
        }
    }
    return dataObj;
}
function compactCombine(wrd,digit){
    if(digit<0 && wrd!=="") wrd="-"+wrd+ Math.abs(digit);
    else if(wrd!=="" && digit> 0 && digit<1 )  wrd+=  (""+digit).slice(1); //   5W 5 0.3  ->  '5'+'.3' 5.3 
    else wrd+= digit ?? ch;
    return wrd;
}

function gridToSvgPath(gridString, targetW, targetH, svg, flipH) {
    let [lines, gridW, gridH] = gridStats(gridString);
    
    // align svg viewBox aspect ratio with grid dimension;  Overlay is NOT PERFECT, but OK 
    if (svg) {
        //           v~~ monospace chars have aspect of 1:2
        const AR = (2 * gridH) / gridW;
        const vb = svg.viewBox.baseVal;
        const W = vb.width;
        targetW ??= W;
        if (!targetH) {
            targetH ??= vb.height;
            vb.height = W * AR;
            svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.width + " " + vb.height)
        }
    }
    const allPoints = [];
    const markers = []; //  ~ und &,  § means 50% round -> &5

    // 1. Grid parsen
    for (let yCell = 0, line; line = lines[yCell], line !== undefined; yCell++) {
        const y = yCell;
        let lastIsPnt = false;
        for (let x = 0, char; char = line[x]; x++) {
            const isNum = /[0-9]/.test(char);
            const charNext =  line[x+1];
            const hasNextChar =  charNext&& !!charNext.trim();
            const nextIsCpNum = charNext&& (compactNumsRE.test(charNext) ||  (".,+-".includes(charNext)&&compactNumsRE.test(line[x+2])) );

            let markerT = markerChars[char];
            
            if ( markerT  && ( ( !markerT.after && !markerT.needNextNum) || lastIsPnt ||  nextIsCpNum) ) {

                const marker = { type: char, x, y, data: "", closestPnt: lastIsPnt? allPoints.at(-1) : null };

                // maybee interpret some markers as lines  like a -- emits a <path d="Mx,y H 9999" /> and || a <path d="Mx,y H 9999" />
                //  you can make the line automaticlly very large, and when a seperator token like |; _;  |; ;_ is enountered use this as end 
                if (markerT.free && line[x - 1] == char) {
                    x++;
                    if (markerT.free === true) { continue }
                    marker.type += char;
                }
                const dataBlockRE =  markerT.format ?  compactNumsRE : /[0-9]/ ;
                // allow continuation with numbers like  42 or  A2 B3 
                if (!markerT.noData) while (  (line[x + 1]&&dataBlockRE.test(line[x + 1])) || 
                    /^,?\+?\-?\.?\d/.test(line.slice(x+1))  || (marker.data && line[x+1]=="."&&/\s/.test(line[x+2])   )  
                ) {
                    x++;
                    marker.data += line[x];
                }
                if (marker.data) {
                    if(markerT.format)  parseCompactNums(marker.data,markerT.format, marker.data={});
                    // use as lerp radius or for catmull as tension
                    else if (marker.data.includes(".")) marker.data = Number(marker.data);
                    else marker.data = (Number(marker.data)) / 10 ** (marker.data.length);
                } 
                if (char == "§") {
                    marker.type = "&";
                    marker.char = "§";
                    marker.data = 0.5;
                }
                if(markerChars[char]) markers.push(marker);
                lastIsPnt = false;

            } else if (isNum || /[A-Za-z]/.test(char)) {
                
                const pnt = { id: char, char, x, y, grp: isNum ? "num" : /[a-z]/.test(char) ? "lower" : "upper" };
                while (/[0-9Z]/.test(line[x + 1])) {// allow continuation with numbers like  42 or  A2 B3  and a ending Z to close a path 
                    x++; pnt.id += line[x];
                    if (line[x] == "Z") break;
                }
                allPoints.push(pnt);
                lastIsPnt = true;
            } else {
                lastIsPnt = false;
            } 
        }
    }

    // 2. Gruppieren nach Gehäuse (Upper) und Löchern (Lower,Digits)
    let groups = Object.groupBy(allPoints, p => p.grp);

    for (const grp in groups) {
        groups[grp] = groups[grp].sort((a, b) => a.id.localeCompare(b.id));
    }
    // for the enumeration order
    groups = { upper: groups.upper, lower: groups.lower, num: groups.num, ...groups }

    // find closest point for each marker
    for (const m of markers) {
        let dMin = Infinity;
        let closestPnt = m.closestPnt;
        if (!closestPnt) for (const pnt of allPoints) {
            // has already a marker skip
            if(pnt?.marker?.type==m.type) continue;

            let d = Math.hypot((m.x - pnt.x), (m.y - pnt.y) * 2);
            if (d < dMin) {
                dMin = d;
                closestPnt = pnt;
                m.dist = d;
            }
        }
        if (closestPnt){
            const isPosMarker = "+xypXYP".includes( m.type);
            if(!closestPnt.marker  || !isPosMarker) closestPnt.marker = m;

            (closestPnt.allMarker??=[]).push(m);

            if(m.data && isPosMarker){  // set the relativ or position
                for(const u in m.data){
                    const lower = u.toLowerCase();
                    closestPnt[lower] =  lower===u? (closestPnt[u]||0)+m.data[u]  : m.data[u];
                }
            }
        }  
        m.dist ??= 1;
    }
    let fullPath = "";

    for (const grpName in groups)
        if (groups?.[grpName]?.length) {
            fullPath += buildSmartPath(groups[grpName], gridW, gridH, targetW, targetH, flipH) + " ";
        }
    _Cache.grps = groups;
    _Cache.params = [gridW, gridH, targetW, targetH, flipH];

    return fullPath.trim();
}

function lerp(a, b, t) { return { x: (a.x + t * (b.x - a.x)), y: (a.y + t * (b.y - a.y)) } }
function add(a, b) { return { x: a.x + (b.x ?? b), y: a.y + (b.y ?? b) } }
function sub(a, b) { return { x: a.x - (b.x ?? b), y: a.y - (b.y ?? b) } }
function mul(a, b) { return { x: a.x * (b.x ?? b), y: a.y * (b.y ?? b) } }
function div(a, b) { return { x: a.x / (b.x ?? b), y: a.y / (b.y ?? b) } }

function calculateCatmullCP(pPrev, pCurr, pNext, pNextNext, type = 'start', tension = 0.8) {
    if (type == "start") { return add(pCurr, div(sub(pNext, pPrev), 6 * tension)) }
    return sub(pNext, div(sub(pNextNext, pCurr), 6 * tension))
}

/** further away marker like rund & or catrom ~, the higher the radius or tension, but if a number after marker use this as data value */
function markerDistToPercent(pnt) {
    return pnt?.marker?.data !== "" ? pnt.marker.data : Math.round(2 * pnt?.marker.dist) / 10 - 0.1;
}
function buildSmartPath(points, gridW, gridH, targetW, targetH, flipH = false, fixed = 3) {
    const flipHSub = (flipH ? targetH : 0);
    const flipMul = (flipH ? -1 : 1);
    const map = (x, y) => trimNum((x / (gridW - 1)) * targetW, fixed) + " " + trimNum(flipHSub + flipMul * (y / (gridH - 1)) * targetH, fixed);

    let d = `M ${map(points[0].x, points[0].y)}`;

    // calc all entries and exits
    for (let i = 0; i < points.length; i++) {
        if (points[i]?.marker?.type == "&") {
            let pPrev = points[(i - 1 + points.length) % points.length];
            let maxPrevDist = 1 - (pPrev.dist || 0);
            if (pPrev.quadCP) pPrev = pPrev.quadCP;

            let pNext = points[(i + 1) % points.length];
            if (pNext.quadCP) pNext = pNext.quadCP;// only for last point

            const pnt = points[i];

            let dist = markerDistToPercent(pnt);
            // do not go more radius, than the previous had
            let pdist = 1 - Math.max(0, Math.min(maxPrevDist, dist));
            pnt.entry = lerp(pPrev, pnt, pdist);

            let ndist = Math.max(0, Math.min(1, dist));
            pnt.dist = ndist;
            pnt.exit = lerp(pnt, pNext, ndist);

            pnt.quadCP = { x: pnt.x, y: pnt.y };
            pnt.x = pnt.entry.x;
            pnt.y = pnt.entry.y;
        }
    }

    for (let i = 0; i < points.length; i++) {
        let pPrev = points[(i - 1 + points.length) % points.length];
        if (pPrev.exit) pPrev = pPrev.exit;
        const pCurr = points[i];
        const pNext = points[(i + 1) % points.length];
        let pNextNext = points[(i + 2) % points.length];
        if (pNext.exit) pNextNext = pNext.exit;

        const lastIdChar = pCurr.id.at(-1).toLowerCase();
        const isEnd = i + 1 == points.length;
        if (isEnd && lastIdChar !== "z") continue;


        const markerT = pCurr.marker?.type;

        if (markerT === '&') {
            const entry = pCurr.entry
            const exit = pCurr.exit

            if (i == 0) d = "";
            let nextLine = isEnd ? 'Z' : 'L' + map(pNext.x, pNext.y);

            // if rounded to 50% the Q may ladn already on the next point -> skip L directiv
            if (Math.abs(exit.x - pNext.x) < 0.1 && Math.abs(exit.y - pNext.y) < 0.1) nextLine = ""

            d += `${i == 0 ? 'M' + map(entry.x, entry.y) : ''}Q${map(pCurr.quadCP.x, pCurr.quadCP.y)} ${map(exit.x, exit.y)}${nextLine}`;
        }
        else if (markerT === '~') {
            // Catmull-Rom zu Cubic Bezier
            const percent = markerDistToPercent(pCurr);
            const tens = pCurr.marker?.data || 1 - Math.max(-3, Math.min(3, percent));
            const cp1 = calculateCatmullCP(pPrev, pCurr, pNext, pNextNext, 'start', tens);
            const cp2 = calculateCatmullCP(pPrev, pCurr, pNext, pNextNext, 'end', tens);
            d += ` C${map(cp1.x, cp1.y)} ${map(cp2.x, cp2.y)} ${map(pNext.x, pNext.y)}`;
        }
        else if (isEnd) {
            d += 'Z'
        } else {
            // Scharfe Kante
            d += `L${map(pNext.x, pNext.y)}`;
        }
    }
    return d;
}

function bbox(string = "") {
    const d = string || string?.getAttribute?.("d");
    const cors = d.match(/\d+(\.\d*)?/g);// uses no H or V so simple algo enough
    const grps = Object.groupBy(cors, (c, i) => i % 2 == 0 ? "x" : "y");
    for (const grp in grps) {
        const cors = grps[grp];
        const min = Math.min.apply(null, cors);
        const max = Math.max.apply(null, cors);
        grps[grp] = { min, max };
    }
    return grps;
}

/** build an svg web font to download and then use a online converter */
function buildWebFont({ name = "hexSpellVxExport", hAdv = 500 } = {}, download) {

    let glypsSVG = "";

    const hexGlyps = {};

    const glyphsPres = document.querySelectorAll(".font pre[name]");
    for (const pre of glyphsPres) {
        if (pre.hasAttribute("ignore")) continue;
        const unicode = pre.dataset.unicode;
        if (!unicode) continue

        // you must recalculate fliped path, cause fonts/postscript corrdinate system starts in lower left corner, not svg top-left.
        const dFlipped = gridToSvgPath(pre.innerText || el.textContent, fontW, fontH, 0, true);
        let evenCntr = 0;
        // parse parst of all paths
        let data = [];
        dFlipped.replace(/(\d+(?:\.\d+)?)|([^\d\s]+)/g, (_m, num, cmd,) => {
            data.push(num !== undefined ? (evenCntr++ % 2 == 0 ? { x: num } : { y: num }) : { cmd })
            return "";
        });

        hexGlyps[unicode] = { str: dFlipped, data };

        // glypsSVG += `<glyph unicode="${unicode}" d="${dFlipped}" />\n`;
    }
    const asciiToHex = {
        a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f',
        g: '9', h: '6', i: '1', j: '9', k: 'b', l: '1', m: '44',
        n: '4', o: '0', p: '6', q: '9b', r: '2', s: '5', t: '7', u: 'c', v: 'c', w: 'cc',
        x: '3', y: '9', z: '2',
        '&#x20;': '00', '&#x0a;': '0000',
        ':': '3a', '=': '3a', ';': '3b', '.': '3b', ',': '3b',

        '1': '31', '2': '32', '3': '33', '4': '34', '5': '35',
        '6': '36', '7': '37', '8': '38', '9': '39', '0': '30',

        '!': '3e', '?': '3f',

        '+': 'dd', '-': 'bb', '*': '344c', '/': '3d1f',

        // experimental
        "{": 'aaa', '}': 'fff',
        "[": 'bbb', ']': 'ddd',
        "(": 'aaa', ')': 'fff',
        "&#x27;": '660', '&#x22;': "099",
        // "&#xb4;":'660','&#x60;':'099',

        '&#x26;': 'e7', '$': '3c5d',// ESC USD -> us-dollar
        '€': '3ec2',

        // just escapes
        '=': '3d3d',

        '&#xe4;': 'ae',
        '&#xf6;': '0e',
        '&#xfc;': 'ce',

    }

    for (const uni in asciiToHex) {
        // multiply the x of n-glyps with the hAdvment
        const out = [...asciiToHex[uni]].map(
            (c, i) => hexGlyps[c].data.reduce((agg, p) => agg + (p.cmd ?? (p.y ?? +p.x + i * hAdv) + " "), "")
        ).join("\n");

        const hori = ` horiz-adv-x="${hAdv * asciiToHex[uni].length}" `;

        glypsSVG += `<glyph unicode="${uni}" d="${out}"${hori}/>\n`;

        if (uni.length == 1 && uni.toUpperCase() !== uni) {
            glypsSVG += `<glyph unicode="${uni.toUpperCase()}" d="${out}"${hori}/>\n`;
        }
    }

    // list of symbols you wish to escape via emiting 3d<ASCII>
    const toEscape = [];

    const svgBase = `<?xml version="1.0" standalone="yes"?>
<svg width="100%" height="100%"
 xmlns = 'http://www.w3.org/2000/svg'>
  <defs>
    <font id="Font2">
      <font-face font-family="${name}" font-weight="normal" font-style="italic"
          units-per-em="1000" cap-height="600" x-height="400"
          ascent="700" descent="300" horiz-adv-x="${hAdv}"
          alphabetic="0" mathematical="350" ideographic="400" hanging="500">
      </font-face>
      <missing-glyph><path d="M0,0h200v200h-200z"/></missing-glyph>
      ${`<!--
        <glyph unicode="!" horiz-adv-x="300">  < !-- Outline of exclam. pt. glyph -- >  </glyph>
        -->`, ''}
${glypsSVG}
    </font>
  </defs>
</svg>`;

    if (download) {
        const urlObj = URL.createObjectURL(new Blob([svgBase], { type: "text/plain" }));
        const a = $New("a", { href: urlObj, download: name + ".svg" }, 0, document.body);
        a.click();
        setTimeout(() => a.remove() || URL.revokeObjectURL(urlObj), 0);
    }
    return svgBase;
}