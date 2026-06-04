/*  this parses a string into a visually pleasant svg path usable for vector graphics like fonts   */


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
document.body.addEventListener("click",(ev)=>{
    if(ev.target.matches("button.addPanel")) ev.target.before(ev.target.previousElementSibling.cloneNode(true))
});//  ?: .$button.addPanel  .>>-- .>++{}  

let lastBlurPre = null;
const blurEv = (ev) => {
    const el = ev?.target?.closest?.("pre[name]");
    if (!el) return;
    const W = (el.dataset.w ?? window.fontW??1000);
    const H = (el.dataset.h ?? window.fontH??1000);

    let previewSvg = el.querySelector("&>svg");
    if (!previewSvg) {
        previewSvg = $SVG("svg", { "viewBox": `0 0 ${W} ${H}`, 'tabindex': 0, }, 0, el);
    }
    let previewCanvas = el.querySelector("&>canvas");
    if(!previewCanvas){
        previewCanvas = $New("canvas",{width:1000,height:1000,},0,el);
    }

    // use innerText, cause it deals intelegently with <br> of contenteditable, 
    // but innerText returns nothing if elm hidden in <details>, so for init use textContent as follback, you should use <br> in the static HTML anyway
    const dStr = gridToSvgPath(el.innerText || el.textContent, W, H, previewSvg);

    const pathEl = previewSvg.querySelector(`path[data-gly]`) || $SVG("path", { "data-gly": "" }, 0, previewSvg);

    const minMax = bbox(dStr);
    el.title = JSON.stringify(minMax);
    $attrs(pathEl, "d", dStr);
    lastBlurPre = el;
}
document.body.addEventListener("blur", blurEv, true,);

/** only for absolute paths */
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

// init the pre icons in the html
document.body.onload = () => {
    for (const pre of document.querySelectorAll("pre[name]")) {
        blurEv({ target: pre });
    }
}

function gridStats(gridString) {
    const lines = gridString.split('\n');
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
    ";":{noData:true},// end Path
    ",":{maxDist:2,noData:true},// connect to the left
    '!':{ secondChar:"-", comment:1},// use !- like a simpler HTML <!-- Comment  -->  space after determins end
    '#':{noData:1},
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

    if(/[+,.-]/.test(str)){// fallback to noraml cors seperated via ,
        str.split(",").map( n=> [...n].reduce( (numStr,d)=>compactCombine(numStr,d),"")).forEach(addUnit); 
        return dataObj;
    } 
    let unitI = 0;
    let formatI = 0;
    for (let wrd = "", i = 0, ch; ch = str[i]; i++) {
        wrd = compactCombine(wrd,ch);
        if(i == str.length-1 || (format[formatI+1] && format[formatI+1]!==format[formatI])){
            addUnit(+wrd,unitI++);
            wrd="";
        }
    }
    return dataObj;
}
function compactCombine(wrd,digit){
    const mapped = compactNums[digit];
    if(mapped<0 && wrd!=="") wrd="-"+wrd+ Math.abs(mapped);
    else if(wrd!=="" && mapped> 0 && mapped<1 )  wrd+=  (""+mapped).slice(1); //   5W 5 0.3  ->  '5'+'.3' 5.3 
    else wrd+= mapped ?? digit;
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
    ln:for (let yCell = 0, line; line = lines[yCell], line !== undefined; yCell++) {
        const y = yCell;
        let lastIsPnt = false;
        let openRef=null;
        for (let x = 0, char; char = line[x]; x++) {
            const isNum = /[0-9]/.test(char);
            const charNext =  line[x+1];
            const hasNextChar =  charNext&& !!charNext.trim();
            const nextIsCpNum = charNext&& (compactNumsRE.test(charNext) ||  (".,+-".includes(charNext)&&compactNumsRE.test(line[x+2])) );

            let markerT = markerChars[char];
            if ( markerT  && ( ( !markerT.after && !markerT.needNextNum) || lastIsPnt ||  nextIsCpNum) ) {
                if(markerT.secondChar ){
                    if(markerT.secondChar!==charNext)continue;
                    x++;
                } 

                const marker = { type: char, x, y, data: "", closestPnt: lastIsPnt? allPoints.at(-1) : null };
                
                if(markerT.comment){
                    x++;// lnow after the comment char
                    if(x==0|| (line[x]==" "&&line[x+1]==" ")  ) continue ln;
                    if(line[x]==" ") while( line[x] && !(line[x]==" "&&line[x+1]==" ") ){x++}
                    else while (line[x] && line[x]!==" "){x++}
                    continue;
                }
                // maybee interpret some markers as lines  like a -- emits a <path d="Mx,y H 9999" /> and || a <path d="Mx,y H 9999" />
                //  you can make the line automaticlly very large, and when a seperator token like |; _;  |; ;_ is enountered use this as end 
                if (markerT.free && line[x - 1] == char) {
                    x++;
                    if (markerT.free === true) { continue }
                    marker.type += char;
                }
                const dataBlockRE =  markerT.format ?  compactNumsRE : /[0-9]/ ;
                // allow continuation with numbers like  42 or  A2 B3 
                if (!markerT.noData) while (  
                    (line[x + 1]&&dataBlockRE.test(line[x + 1])) || 
                    /^,?\+?\-?\.?\d/.test(line.slice(x+1))  || 
                    (marker.data && line[x+1]=="."&&/\s/.test(line[x+2])   )  ||
                    (  "+-.,".includes(line[x+1])&&line[x + 2]&&dataBlockRE.test(line[x + 2]) )
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
                }else if(char==","){
                    marker.snapPnt = allPoints.findLast( p=>p.x <= marker.x);
                }
                if(markerChars[char]) markers.push(marker);
                if(marker.type=="#")openRef=marker;
                lastIsPnt = false;

            } else if (isNum || /[A-Za-z]/.test(char)) {
                const pnt = { id: char, char, x, y, grp: isNum ? "num" : /[a-z]/.test(char) ? "lower" : "upper" };
                let refM = openRef;
                let isRefMarker = refM?.type=="#" && !refM.resolved; 
                if(isRefMarker){
                    refM.closestPnt = pnt;
                    refM.resolved=1;
                    (pnt.allMarker??=[]).push(refM);
                    pnt.isRef=true;
                    pnt.x= refM.x;
                }
                const eat = isRefMarker? /[0-9A-Z\-;#/]/i : /[0-9Z]/; 
                while (eat.test(line[x + 1])) {// allow continuation with numbers like  42 or  A2 B3  and a ending Z to close a path 
                    x++; pnt.id += (line[x]??"");
                    if (!line[x]||  (!isRefMarker &&  line[x] == "Z")) break;
                }
                allPoints.push(pnt);
                lastIsPnt = true;
                if(isRefMarker){
                   let [_,isPathStart=";",pathCon="",startId="",endId="",lastIsPathEnd=""] = pnt.id.match(/(;)?(-)?[#\/]?([A-Z]\d*|\d+)(?:-)?[#\/]?([A-Z]?\d*)?(;)?/i)??[]; 
                   if(!pathCon) pnt.idGrp=200;  // emit point(s) after all other, otherwise
                   else isPathStart="";
                   Object.assign(pnt,{isPathStart,pathCon,endId,lastIsPathEnd});
                   pnt.raw = pnt.id;
                   pnt.id= startId;
                }
            } else {
                lastIsPnt = false;
            } 
        }
    }

    // 2. Gruppieren nach Gehäuse (Upper) und Löchern (Lower,Digits)
    let groups = Object.groupBy(allPoints, p => p.grp);
    
    const idToSortNum = (id,grp=0, offset=0)=> !isNaN(+id)?+id:(grp+id[0].charCodeAt(0))*10000+(isNaN(+id.slice(1))?999:+id.slice(1)+offset);

    for (const grp in groups) {
        groups[grp].forEach( pnt=>pnt.sortNum=idToSortNum(pnt.id,pnt.idGrp, pnt.idOff) )
        groups[grp] = groups[grp].sort((a, b) => a.sortNum-b.sortNum);
    }
    // for the enumeration order
    groups = { upper: groups.upper, lower: groups.lower, num: groups.num, ...groups }

    // find closest point for each marker
    for (const m of markers) {
        let dMin = Infinity;
        let closestPnt = m.closestPnt;
        const maxDist = m.maxDist??Infinity;
        if(m.type==",") closestPnt = null;
        if (!closestPnt) for (const pnt of allPoints) {
            // has already a marker skip
            if(pnt?.marker?.type==m.type) continue;

            let d = Math.hypot((m.x - pnt.x), (m.y - pnt.y) * 2);
            if (d <= dMin &&  d<=maxDist && pnt!==m.snapPnt) {
                dMin = d;
                closestPnt = pnt;
                m.dist = d;
            }
        }
        if (closestPnt){
            const isPosMarker = "+xypXYP".includes( m.type);
            const specialMarker = ";,".includes(m.type);
            if(!closestPnt.marker  || !(isPosMarker||specialMarker) ) closestPnt.marker = m;
            m.closestPnt=closestPnt;

            (closestPnt.allMarker??=[]).push(m);

            if(m.type==";"){
                if(m.x>closestPnt.x ) closestPnt.isPathEnd= true;
                else closestPnt.isPathStart=true;
            } else if(m.type=="-" ){
                closestPnt.isPathStart=false;
            }
            if(m.data && isPosMarker){  // set the relativ or position
                for(const u in m.data){
                    const lower = u.toLowerCase();
                    closestPnt[lower] =  lower===u? (closestPnt[u]||0)+m.data[u]  : m.data[u];
                }
            }
        }  
        m.dist ??= 1;
    }
    // constraints snap of , 
    for(const m of markers){
        const mPnt = m.closestPnt;
        const snapPnt = m.snapPnt;
        if(m.type!==","||!mPnt||!snapPnt) continue;
        mPnt.x=snapPnt.x;
    }
    let allOrderedPnts = Object.values(groups).flatMap(g=>g??[]);
    
    let fullPath = "";
    let grpSplitCounts={};
    const splitGrp = (grpName)=>{
        let grp= groups[grpName];
        if(!grp) return;
        let splitids =grpSplitCounts[grpName]?? 1;
        let splitIdx = 0;
        let offset = 0;
        while( -1!==(splitIdx=grp.findIndex(  (g,i,a)=>g.isPathEnd&&i+1<a.length? (offset=1,1) : i>0 && g.isPathStart?(offset=0,1):0 )) ){
            grp = groups[grpName+"/"+splitids++] = grp.splice(splitIdx+offset);
            grpSplitCounts[grpName]= splitids;
        }
    }
    // split groups by path start end
    for (const grpName in groups){  splitGrp(grpName) }
   
    const getGrp = (pnt)=>(Object.values(groups)).find(grp=>grp?.includes?.(pnt));

    let maxRef=0;
    for (const grpName in groups) if(groups[grpName]) for(const pnt of groups[grpName]){
        if(!pnt.isRef||pnt.R>maxRef) continue;
        let startPnt = groups[grpName].find(p=>p!==pnt && p.id==pnt.id) ?? allOrderedPnts.find(p=>p.id==pnt.id);
        let startPntIdx = allOrderedPnts.indexOf(startPnt);
        let endPntIdx = allOrderedPnts.findIndex( p=>p.id==pnt.endId);
        let insertees;
        let curGrp = groups[grpName];
        if(endPntIdx>0){ insertees  = endPntIdx<startPntIdx? allOrderedPnts.slice(endPntIdx,startPntIdx+1).reverse() 
                 : allOrderedPnts.slice(startPntIdx,endPntIdx+1) 
        }
        else { 
            curGrp = getGrp(startPnt);
            insertees = curGrp.slice( curGrp.indexOf(startPnt), );
        }   
        // base on the first point, -> could implement setting how to align via boundingbox e.g  center or left shift 
        let anchorX = pnt.x - insertees[0]?.x; 
        let anchorY = pnt.y - insertees[0]?.y; 
        
        insertees = insertees.map( (oriP,i)=>{
            p= structuredClone(oriP);
            p.x+=anchorX;
            p.y+=anchorY; 
            p.R= 1+ (pnt.R??0);// recursiv depth 
            p.copyOf=oriP;
            if(i==0&&pnt.isPathStart) p.isPathStart=true;
            if(i==insertees.length-1&&pnt.lastIsPathEnd) p.isPathEnd=true;
            return p;
        } );
        let pntIdx= groups[grpName].indexOf(pnt);
        groups[grpName].splice(pntIdx,1,...insertees);
        splitGrp(grpName);
    }    

    for (const grpName in groups)
        if (groups?.[grpName]?.length) {
            fullPath += buildSmartPath(groups[grpName], gridW, gridH, targetW, targetH, flipH) + " ";
        }
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
    let anyClose = false;
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
        const isEnd = pCurr.isPathEnd ||   i + 1 == points.length;
        if (isEnd &&  lastIdChar !== "z" && !pCurr.isPathEnd ) continue;

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

