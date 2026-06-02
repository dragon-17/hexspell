/**
 * Different hex spell fonts 
 * 
 * HexHex  ->  text to hexspell              Hello -> 6e110
 *     - uses own designed font-glyphs for 0-9a-f
 * HexTxt  ->  hex ASCII to normal ASCII     6e110 -> Hello  
 *     - 
 * HexBin  ->  hex binary to normal ASCII    0x5e  0x11 0x00  -> Hello 
 *     !- problem alignment     hexspell 4bit  normal ASCII 7bit  
 *     !- UTF-8 problem   << use old 255 win codepage 
 * 
 * Maybee in future
 * a cursive writing with own 16 symbol alphapeth (look notes on my physical note block)
 *      - has esc 3 and other ctrl glyphs as smaller glyph at start of stroke to differentiate from normal hex values
 *      - monospace for monospace obj
 * 
 * font for:
special spell encryption language  (looks kryptic, can be read out loud, maps to colors/?elements, save as compact binary)
in spell txt desc:  fireball cast 5 meter go!
to hexspell:        f12eba1100ca5700350044e7e200903E       ( short letter map explain:  0:o 1:il 2:rz 3:x 4:n 44:m 5:s 6:hp 7:t 8:i' ' 88:ii,ou,oo 9:gyj a:a b:bk c:cuv cc:w d:dj e:e f:f fd:v 74:k 7b:z 6b:p 3x:0-9 3a-b: : .,; ESC <hexData> ! ?)
                       ^magic writing notation, you can still read it; also mostly reversable

How to pronounce it:
use a number spellout based mapping table (best in a foreign language, for me (DE) english, use latin etc.):
    1-> on(e)  2-> two/du  3-> (th)ree/thee  4-> four/fu/fur   5-> (f)iv(e)
    6-> (s)ix  7->(se)v(e)n   8->eig(ht)  9->(n)ine
    0->(o)h/(n)ull  # to speak out explicit space between words   

                    f-one-two-eba-one-one  null-null ... nine-null three-e

your spell in a magic language: 
                     1 2     1  1   0 0     5 7  3   5  4 4    7   2  9  0    3   e(3e is hexspell '!')
                    fonwoeba-on-on ('o'o) caivee hreeiv urfure-vne-wo ineull  THEEE
pronounce options:      ö(DE)      ohhhh(Space) h're-I(DE)ve       du   oi(DE)
                                   ^cast/charge time 

Spelling easily decipherable on paper. Write Number letter over/under replaced word and you can read original message again.  
                            
You can map the hexspelled words to CSS #rgb/#rrggbb colors, which in turn can represent elements. 
Use grayscales for less than 3-components #g/#gg, use transparency for 4 #rgba, and split words (during incantation) at achive different colors/elemnts
                           f12eba11                   ca57            35      44e7e2                         903E
 Valid CSS colors:         #f12 #eba         #11(1)     #ca57       #35(3535) #44e #7e2                     #903E
 Color Cube Region Names:  red light.purple  black   yellowTrsprt   grey     blue  light.green/green-yellow   #purple.lightTransparent
                               aka violet

 *              
 * Generall Fonts
 * binHex  ->  open bin file in texteditor and see byte as hex pairs (similar HexBin)
 * binTxt  ->  advanced binHex plus mix as subscript the glyph with the actual symbol and its hex code
 * 
 * 
 * 
 */



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
window.addPanel.onclick = (ev)=>{
    ev.target.before(ev.target.previousElementSibling.cloneNode(true))
}
let fontW = 1000;
let fontH = 1000;

const blurEv = (ev) => {
    const el = ev?.target?.closest?.("pre[name]");
    if (!el) return;
    const W = (el.dataset.w ?? fontW);
    const H = (el.dataset.h ?? fontH);

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
}
document.body.addEventListener("blur", blurEv, true,);

// init the pre icons in the html


document.body.onload = () => {
    for (const pre of document.querySelectorAll("pre[name]")) {
        blurEv({ target: pre });
    }
}

const fontBaseIn = document.querySelector("#fontBaseIn");
const svgIframe = $New('iframe',{hidden:1,},0,document.body);

let svgFontElm = null;

fontBaseIn.onchange =async (ev)=>{
    const file = ev.target.files[0];
    let svg  = $SVG("svg");
    const svgStr =  (await ev.target.files[0].text())
    // ?.replace?.(/<\?xml.*?\n(\s*<!DOC.*?\n)/i,"");
    svgIframe.contentDocument.body.innerHTML = svgStr;
    
    svgFontElm= svgIframe.contentDocument.querySelector("svg");  
    const glyphs = svgIframe.contentDocument.querySelectorAll('glyph');
    const msg =  `${glyphs.length} Glyphs where found in ${file.name}`
    ev.target.nextSibling.data = msg;
    console.log(`${glyphs.length} Glyphs wher found in ${file.name}.`);
    btnHexspellHex.disabled = false;
    btnHexspellBin.disabled = false;
}

let _Cache = { grps: null, params: null };


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
        '#': 'ee',
        // "&#xb4;":'660','&#x60;':'099',

        '&#x26;': 'e7', '$': '3c5d',// ESC USD -> us-dollar
        '€': '3ec2',

        // just escapes
        '=': '3d3d',

        '&#xe4;': 'ae',
        '&#xf6;': '0e',
        '&#xfc;': 'ce',

    }
const esc = x=>x.startsWith("&#")?x:x.replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('&','&amp;');
const useBg = document.querySelector("#inHexBg");
/** build an svg web font to download and then use a online converter */
function buildWebFont({ name = "hexSpellVxExport", hAdv = 500, adjtX = -0.5,
        mapping= asciiToHex, baseFontElm=null, glypPathQuery=".font pre[name]",
        fillUnmapped=false,maxFillCode= 4096,
        useBgHelper= useBg.checked ,
    } = {}, download) {

    let glypsSVG = "";

    const hexGlyps = {};

    const glyphsPres = baseFontElm?.querySelectorAll?.("glyph")?? document.querySelectorAll(glypPathQuery);
    const copiedBaseFontFaceElm = baseFontElm?.querySelector?.("font-face");
    const copiedBaseFontFace = copiedBaseFontFaceElm?.outerHTML;
    if(copiedBaseFontFaceElm){
        hAdv =    +copiedBaseFontFaceElm.getAttribute("horiz-adv-x") || hAdv; 
    }

    const filledMap = { ...mapping};
    if(useBgHelper){
        const mappedFromKey= k=> [...k].map( ch=>mapping[ch]??ch ).join("");
        for(const k in backgroundHelper.isGrid) filledMap[k]= mappedFromKey(k);
        for(const k in backgroundHelper.isBox) filledMap[k]= mappedFromKey(k);
    }
    let isLoaded = !!baseFontElm;

    for (const elm of glyphsPres) {
        if (elm.hasAttribute("ignore")) continue;
        const unicode = elm.getAttribute("unicode") || elm.dataset.unicode ;
        if (!unicode) continue

        // you must recalculate fliped path, cause fonts/postscript corrdinate system starts in lower left corner, not svg top-left.
        let dFlipped = isLoaded||elm.hasAttribute("d")? elm.getAttribute("d") ||"" 
                : gridToSvgPath(elm.innerText || elm.textContent, fontW, fontH, 0, true);
        
        // parse all svg paths
        let xyAltCntr = 0;  let isVv = 0;
        let data = [];
        dFlipped.replace(/([+-]?\d+(?:\.\d+)?)|(z|Z|[^\d\s+-]+)/g, (_m, num, cmd,) => {
            data.push(  num ? ( !isVv && xyAltCntr++ % 2 == 0 ? { x: num } : { y: num }) 
                : (isVv="vV".includes(cmd), xyAltCntr=0, { cmd }) 
            )
            return "";
        });
        hexGlyps[unicode] = { str: dFlipped, data };
        if(fillUnmapped && !filledMap[unicode]  && unicode[0].charCodeAt()<maxFillCode) filledMap[unicode] = unicode;
    }

    const isLowerCase = x=>x.toLowerCase()==x;

    for (const uni in filledMap) {
        // multiply the x of n-glyps with the hAdvment
        let isRel = false;
        let out = [...filledMap[uni]].map(
            (c, i) =>
                 hexGlyps[c].data.reduce((agg, p) => agg + ( p.cmd?(isRel=isLowerCase(p.cmd),p.cmd)  
                :  (p.y ??  (isRel? p.x :  +p.x + (i+adjtX) * hAdv )) + " "), "")
        ).join("\n");

        // just append background ligiture path
        if(useBgHelper && backgroundHelper.isGrid[uni]){
            out +='\n'+ backgroundHelper.grid.apply(null,backgroundHelper.isGrid[uni]);
        }
        if(useBgHelper && backgroundHelper.isBox[uni]){
            out +='\n'+ backgroundHelper.box.apply(null,backgroundHelper.isBox[uni]);
        }

        const hori = ` horiz-adv-x="${hAdv * filledMap[uni].length}" `;

        glypsSVG += `<glyph unicode="${esc(uni)}" d="${out}"${hori}/>\n`;

        if ( !isLoaded && uni.length == 1 && uni.toUpperCase() !== uni) {
            glypsSVG += `<glyph unicode="${esc(uni.toUpperCase())}" d="${out}"${hori}/>\n`;
        }
    }

    
    

    const svgBase = `<?xml version="1.0" standalone="yes"?>
<svg width="100%" height="100%"
 xmlns = 'http://www.w3.org/2000/svg'>
  <defs>
    <font id="${name}">${
        copiedBaseFontFace ||
        `<font-face 
      font-family="${name}" 
      units-per-em="1000" 
      ascent="900" 
      descent="0" 
      cap-height="700"
      x-height="450"
      alphabetic="0"
      line-gap="0"
      horiz-adv-x="${hAdv}"
       />`
    }
      <missing-glyph><path d="M 261 750L261 83.3L696 83.3L696 750Z M 652 125L304 125L304 708L652 708Z"/></missing-glyph>
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
const U = 1000; // Standard unit (2 glyph widths or 1 glyph height)
const backgroundHelper = {
    isGrid: {
        '##':[8,8],
        '###':[16,8],
        '##2':[8,2],
    },
    isBox:{
        '[]1':[1,1],
        '[**]':[2,2],
        '[**]1':[2,1],
        '[****]':[6,6],
        '[****]1':[6,1],
        '[****]3':[6,3],
        '[****]12':[6,12],
        '[******]':[8,8],
        '[******]1':[8,1],
        '[******]3':[8,3],
        '[******]4':[8,4],
        '[******]12':[8,12],
        
        '[********]':[16,16],
        '[********]1':[16,1],
        '[********]8':[16,8],
    },
    grid: (cellW, cellH,thick=10) => {
        let path = `M 0 ${U-thick/2} `;
        const width = cellW * U;
        const height = cellH * U;
        // Horizontal lines
        for (let i = 0; i <= cellH; i++) {
            path += `m 0 ${ (i === 0 ? 0 : -U+thick/2)} h ${width} v ${thick} h ${-width} `;
        }
        // Vertical lines
        path += `M 0 ${U-thick/2} `; // Reset to top-left
        for (let i = 0; i <= cellW; i++) {
            path += `m ${(i === 0 ? 0 : U-thick)} 0 v ${-height} h ${thick} v ${height} `;
        }
        return path.trim();
    },
    box(cellW, cellH,thick=50){
        const width = cellW * U;
        const height = cellH * U;
        const thick2 = thick/2;
        return `M${-thick2} ${U+thick2} h${width+thick}v${-height-thick}h${-width-thick}z M ${thick2} ${U-thick2} v ${-height+thick} h${width-thick} v${height-thick}z`
    },
};

const btnHexspellHex = document.querySelector("#btnHexspellHex");
const btnHexspellBin = document.querySelector("#btnHexspellBin");

btnHexspellHex.onclick = buildFontHexHex; 
btnHexspellBin.onclick = buildFontHexBin; 

function buildFontHexHex(){
    if(!svgFontElm) return console.warn("No font file uploaded");
    buildWebFont({name:"hexspellTxt",  baseFontElm: svgFontElm ,mapping:hexToASCIIMap, adjtX:0,fillUnmapped:true }, true);
}


function buildFontHexBin(){
    if(!svgFontElm) return console.warn("No font file uploaded");
    const binMap = buildBinMap();
    buildWebFont({name:"hexspellBin",  baseFontElm: svgFontElm ,mapping:binMap, adjtX:0, fillUnmapped:false }, true);
}
function buildBinMap(includeLigas=true){
    const binTable = {}; 

    for(let i=0;i<255;i++){
        let key = i;
        if(i<32&&i!==9) key = 256 +key;
        const ashex =  i.toString(16).padStart(  2,"0");
        const hexCode = "&#x"+key.toString(16).padStart( key<256? 2:4,"0")+";"
        if(hexToASCIIMap[ashex]){
            binTable[hexCode] = hexToASCIIMap[ashex]; 
        } else {
            let leftNible = hexToASCIIMap[ashex.at(-2)];
            let rightNible = hexToASCIIMap[ashex.at(-1)];
            if(leftNible && rightNible){
                binTable[hexCode] = leftNible + rightNible;
            }
        }
    }
    if(includeLigas) for(const key in hexToASCIIMap) if(key.length==4){
        let keyA = parseInt(key.slice(0,2),16);
        if(keyA<32&&keyA!==9){
            keyA = ""+1+keyA.toString(16).padStart(  2,"0")
            // continue;
        } 
        let keyB = parseInt(key.slice(2),16);
        if(keyB<32&&keyB!==9){
            keyB = ""+1+keyB.toString(16).padStart(  2,"0")
            // continue
        } 
        binTable[ "&#x"+(keyA||99) +";"+ "&#x"+(keyB||99) +";" ] = hexToASCIIMap[key];
    }
    return binTable;
}
const findInBiMap = (ch,ents)=> ents.filter(x=>x[1].includes(ch)).map( e=>[ parseInt(  e[0].slice(3),16),String.fromCharCode(  parseInt(  e[0].slice(3),16) ) , e[1]] )

// a simpler version may not be the one used by decoder
const hexToASCIIMap = {
    0: 'o', 1: 'l', 2: 'r',
    3: 'x', 4: 'n', 5: 's',
    6: 'h', 7: 't',
    8: 'i',
    9: 'g',
    '00': ' ',

    30: '0', 31: '1', 32: '2', 33: '3', 34: '4',
    35: '5', 36: '6', 37: '7', 38: '8', 39: '9',
    a: 'a', b: 'b', c: 'u',
    d: 'd', e: 'e', f: 'f',

    44: 'm',
    cc: 'w',
    '74': 'k',
    'fb': 'c',
    '7b': 'z',
    'fd': 'v',
    '9f': 'h',
    '6b': 'p',
    '97': 'y',

    '3add': "+",
    '35cb': "-",
    '344c': "*",
    '3d1f': "/",

    '88': ' ',
    'aaa': '(',
    'aaa0': '(',
    'fff': ')',
    'fff0': ')',

    'bbb': '[',
    'bbb0': '[',
    'ddd': ']',
    'ddd0': ']',
    '00ee': '#',
    '9b': 'qu',
    '9d': 'j',
    '97': 'y',
    'bf': 'x',

    '3a': ':',
    '3b': ';',
    '3c': 'c',
    '3d': '@',
    '3e': '!',
    '3f': '?',
    'bb': '-',
    'dd': '+',
    'ee':'#',

    'e5c1':'l',
    'e5c2':'r',
    'e5c3':'x',
    'e5c4':'n',
    'e5c5':'s',
    'e5c6':'h',
    'e5c7':'t',
    'e5c8':'i',
    'e5c9':'g',
    'e5c0':'o',
    'e5ca':'a',
    'e5cb':'b',
    'e5cc':'c',
    'e5cd':'d',
    'e5ce':'e',
    'e5cf':'f',

    '5b': 'sk',
    '5bb': 's-',
    '2b': 'rk',
    '5b9': 'sky',
    '2b9': 'rky',
    'b9': 'by',

    'b97': 'by',
    'b97e': 'byte',
    'b9e': 'bye',
    '5b97': 'sky',
    '2b97': 'rky',

    '91': 'gy',
    '91c': 'gic',
    '19': 'ig',
    '197': 'iy',
    '19d': 'ij',
    '918': 'gli',
    '49e': 'nge',

    '81': 'il',
    '21': 'rl',
    '18': 'li',

    'a11': 'all',
    'e11': 'ell',
    '011': 'oll',
    'c11': 'ull',
    '111': 'ill',
    'b15': 'bis',

    'f12': 'fir',
    '811': 'ill',
    'f1a': 'fla',
   
    '886': 'oop',
    '886b': 'oop',
    '1ee': 'lee',
    '1eee': 'ieee',
    'd4': 'nn',
    'd44': 'dm',

    '66b': 'pp',

    '16b': 'lp',
    '1446': 'imp',
    'e446': 'emp',
    'e446b': 'emp',

    '90c': 'you',
    '0017': ' it',
    '0015': ' is',

    '14400': 'im ',
    '2c00': 'zu ',
    'e2c': 'erc',
    'e2c9': 'ercy',
    '2c9': 'zug',
    '1446': 'imp',
    '1446b': 'imp',
    '1c9': 'lug',
    '04ce': 'once',
    '1400': 'in ',
    'c08': 'cou',

    '1ce': 'ice',

    '0c9': 'oug',
    '0c5': 'ous',
    'o67': 'opt',
    'c67': 'upt',
    '2ce': 'rce',

    'c11': 'ull',
    'c12': 'cir',

    'c5e': 'use',

    'e14': 'ein',
    'a14': 'ain',
    'e114': 'elln',
    'e1c1': 'eici',

    '9b14': 'quin',
    '9b15': 'quis',
    '9bb': 'g-',

    '5c1': 'sci',
    '4c1': 'nci',
    'c7': 'ut',
    'c74': 'uk',

    'a6': 'ap', 'e6': 'ep', '16': 'ip',
    '86': 'ip',
    'c6b': 'up',

    '00c600': ' up ',
    '446': 'mp',
    '446b': 'mp',
    '86b': 'ip',


    '06': 'op',
    '06b': 'op',
    '064': 'ohn',
    '0644': 'ohm',

    '26': 'rp',
    '067': 'opt',
    '2067': 'roht',

    '0062': ' pr',

    '66': 'pp',




    'a66': 'app',
    'e66': 'epp',
    '166': 'ipp',
    '066': 'opp',
    'c66': 'upp',

    'c66b': 'chp',
    'a66b': 'app',
    'e66b': 'epp',
    '166b': 'ipp',

    'e6e': 'ehe',
    'e6b': 'ep',
    'e6e1': 'ehei',
    'e6e12': 'epell',
    'ee6': 'eep',
    'ee6b': 'eep',
    'bfce': 'xce',

    '6d': 'ph',
    '6df': 'pdf',
    'c6d': 'chd',
    '4466': 'mph',
    '466': 'nph',

    '69': 'hy',
    'a69': 'apy', 'e69': 'epy', '169': 'ipy', 'c69': 'chy', '069': 'opy',
    '269': 'rpy',
    '29': 'ry',
    '297': 'ry',
    '2976': 'ryth',

    '449': 'my',
    '59': 'sy',
    '79': 'ty',
    '4497': 'my',
    '59b': 'squ',
    '79b': 'tqu',

    '61': 'hi',
    '61a': 'pla',
    '61e': 'ple',
    '610': 'plo',
    '61c': 'hic',
    '16b': 'ick',

    'b1': 'bl',
    '748': 'kl',
    '6e0': 'peo',
    '74811': 'kill',

    '562': 'spr',
    'c6':'ch',
    '5c6': 'sch',
    'ac6': 'ach',
    '1c6': 'ich',
    '164': 'ihn',

    'e5b6': 'esch',
    'b14': 'bin',
    '1644': 'ihm',
    'ece': 'eue',
    'e4ce': 'ence',
    'f1cfb': 'fluc',
    'c4d': 'und',
    '5c8': 'sci',
    'cfb': 'uc',
    'fbc': 'cu',
    'fd08d': 'void',
    '8ece': 'iece',
    '01c6': 'olch',
    '01c6b': 'olup',
    'ec6': 'ech',
    'oc6': 'och',
    'ccc': 'wu',
    'tc6e': 'tche',
    '2c6e': 'rche',
    '7c6b': 'tup',
    '7c6': 'tch',


    'ec7': 'ect',
    'ec74': 'eck',
    '017': 'oit',
    '08': 'ou',
    '086': 'oup',
    '086b': 'oup',
    '0811': 'oill', /* ill (double l) is more common than ull */
    'ec4': 'eun',
    'ec44': 'eum',
    'ecd': 'eud',
    'ecd4': 'eunn',
    'ecd44': 'eudm',

    'a4c8': 'anci',
}