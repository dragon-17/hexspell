/*  this parses a string into a visually pleasant svg path usable for vector graphics like fonts   */


///// HTML/SVG util
let $attrs = (elm = document.body, attrs, val) => {
    attrs && typeof attrs !== "object" ? attrs = { [attrs]: val } : 0;
    if (attrs) for (let a in attrs) elm[attrs[a] == undefined ? 'removeAttribute' : 'setAttribute'](a, attrs[a]);
}
let $New = (tag = "", attrs = {}, childs = [], parent) => {
    let e = document.createElement(tag);
    $attrs(e, attrs);
    childs && e.append(...childs);
    parent?.appendChild?.(e);
    return e;
}
let $SVG = (tag = "", attrs = {}, childs = [], parent) => {
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
let lastAscii = null;
const blurEv = (ev) => {
    const el = ev?.target?.closest?.("pre[name]");
    if (!el) return;
    ev?.preventDefault?.();
    const W = (el.dataset.w ?? window.fontW??1000);
    const H = (el.dataset.h ?? window.fontH??1000);

    let previewSvg = el.querySelector("&>svg");
    if (!previewSvg) {
        previewSvg = $SVG("svg", { "viewBox": `0 0 ${W} ${H}`, 'tabindex': 0, }, 0, el);
    }
    let previewCanvas = el.querySelector("&>canvas");
    if(!previewCanvas){
        const openAr = (el.clientWidth-32) / (el.clientHeight-32);//padding 
        previewCanvas = $New("canvas",{width:1000,height: 1000/ openAr,},0,el);
    }

    // use innerText, cause it deals intelegently with <br> of contenteditable, 
    // but innerText returns nothing if elm hidden in <details>, so for init use textContent as fallback, you should use <br> in the static HTML anyway
   
    //  when svg contains text innerText will inlcude this so skip svg
    for(const c of el.children){ if(c.localName=="svg") c.style. display="none" }
    const txt = el.innerText || el.textContent;
    for(const c of el.children){ if(c.localName=="svg") c.style.removeProperty("display") }

    const asciiObj = lastAscii = asciiToSVG(txt, W);
   
    el._asciiObj = asciiObj;
    previewSvg.outerHTML = asciiObj.svg;
    previewSvg = el.querySelector("&>svg");
    previewSvg.setAttribute("tabindex","0")

    // mark first path for the font-builder
    const pathEl = previewSvg.querySelector(`path`) || $SVG("path", { "data-gly": "" }, 0, previewSvg);
    $attrs(pathEl, "data-gly", "true");
    
    lastBlurPre = el;

    // set the canvas from the ascii svg txt sketch
    if(inputedText && window.clearCanvas&&previewSvg){
        inputedText = false;
        const sketchSVG = el.querySelector("&>svg.sketch")
        window?.alignViewPorts?.(previewCanvas,sketchSVG,asciiObj);
        
        // clearSketch(el);
        // const canvasSVG = previewSvg.cloneNode(true);
        // // remove the sketch path-elms
        // canvasSVG.querySelectorAll(".sketch,.spell-circle").forEach(c=>c.remove())
        // drawSVGToCanvas(canvasSVG,previewCanvas,)
    }
    return asciiObj;
}
document.body.addEventListener("blur", blurEv, true,);
const objToURL = (a)=>{
    return URL.createObjectURL(   new Blob([a.svg], { type: "image/svg+xml" }) );
}
document.body.addEventListener("keydown",(ev)=>{
    if(ev.ctrlKey && ev.key=="Enter") blurEv(ev);
    if(ev.ctrlKey && ev.key=="u"){
        const asciiObj = blurEv(ev)
        if(!asciiObj) return;
        const url =objToURL(asciiObj);
        const w = open(url,"_blank");
        w.onload = _=>URL.revokeObjectURL(url);
    }
    if(ev.ctrlKey && ev.key=="s"){
        const asciiObj = blurEv(ev)
        if(!asciiObj) return;
        const url =objToURL(asciiObj);  
        const a = document.$New("a",{download:svg.id||svg.name||"a.svg", href:url});
        a.click();
        URL.revokeObjectURL(url);
    }
}, true,);
let inputedText = false;
document.body.addEventListener("input", (ev)=>  ev.data? inputedText=1:0 , true,);

// init the pre icons in the html
document.body.onload = () => {
    for (const pre of document.querySelectorAll("pre[name]")) {
        blurEv({ target: pre });

    }
}
/* actual ascii to Svg algo starts here  */

function gridStats(gridString) {
    const lines = gridString.split('\n');
    const gridH = lines.length;
    const gridW = lines.map(l => l.length).reduce((max, ll) => Math.max(max, ll));
    return [lines, gridW, gridH,];
}

// by default Line art, use Z to close and fill
//     A#f00  !- red stroke       B#0f0M  !- M means area and is fill
//    last point of chain always wins the attr slot.  maybee in future split by sub node attrs  
let STROKE_DFLT = "currentColor";
let FILL_DFLT = "none";
let FILL_Z_DFLT = STROKE_DFLT;
let STROKE_W_DFLT = 8;
/** set to undefined to not emit this as attr, but needed for non-inline svg */
let XMLNS="http://www.w3.org/2000/svg"

//  use   A#o=o
let LINE_JOINS = {"o=o":"round","<=>":"miter","i=i":"square"};
let LINE_CAPS = {"(=)":"round","M=M":"square","[=]":"butt"};
// for points like <path d="M 30 40 v0 "/>  line join can stay pointe due to option of curve splines
let LINE_CAPS_DFLT = "round";

let ATTR_LOOK_UP = {
    ...LINE_JOINS, ...LINE_CAPS, 
};
let TXT_DFLT = {fill:"currentColor",strokeW:0, };
let TXT_FONT_SIZE_IN_Y_CELLS = 1; // ensures etxt has same look as in ascii
/** if you have text this will be set on the root, fill and stroke-width are elm based cause normal paths use them already */
let TXT_ROOT_ATTR = {"font-family":"monospace"}

const ATTR_2_PROP = {   
    fill:"fill",stroke:"stroke",id:"attrId",
    "stroke-width":"strokeW", 
    "stroke-linejoin":"strokeJoin", 
    "stroke-linecap":"strokeCaps",
    "stroke-dasharray":"strokeDash",
    "stroke-dashoffset":"strokeDashOff",
};

// just toPrecision might return scientific notation  e.g. 1000 -> 1.00e3, which BREAKs svg paths
var TRIM_OUT_SVG_PATH = 3;
const trimNum = (num = 0, fix) => (num.toPrecision(TRIM_OUT_SVG_PATH)).replace(/(?<=\.\d*[1-9])0+$|\.0*$/, "");

////   THK Gemini    << 🍪🍪🍪 for generating first the basis of the asciiToSVG fn
// heavily edited manually, now more than 600lns  

const markerChars = { 
    '~': 1, '&': 1, 
    '§': {noData:true}, '-': { free: true,  needNextNum:true }, 
    '+':{needsData:true,format:['xy','xyW','xxyy'],needNextNum:true},
    // is only markers if directly after a vert 
    'x':{after:1,format:['x'],needNextNum:true},'y':{after:1, format:['y'],needNextNum:true}, 
    'X':{after:1,format:['X'],needNextNum:true},'Y':{after:1,format:['Y'],needNextNum:true}, 
    'P':{after:1, format:['XY','XXYY'],needNextNum:true},
    'p':{after:1, format:['xy','xxyy'],needNextNum:true}, 
    
    '*':{  format:['xy','xxyy'],formatPrePrint:"s", needNextNum:true,passMask:0b10, },// calc after pos offset to get midpoints
    // for row columns based meta data
    ':': {needNextNum:true},
    '{':{},'}':{},
    ";":{noData:true, maxYDist:5},// end Path
    ",":{maxYDist:2, noData:true, passMask:0b10, breakWSConnect:true},// connect to the left
    '!':{ secondChar:"-", wsScope:1},// use !- like a simpler HTML <!-- Comment  -->  space after determins end
    // '#':{  anyNonWSDataConnect:true },
    '#':{  anyNonWSData:true },
    "<":{secondChar:"=<",},
    '"':{ wsScope:1 },// strings
};

// grid in most cases only 16x10 or smaller, use UPPERCASE hexadeciaml nums and lowercase hexspell nums 
// to display a range of  -16 -1 15 with only one character cell 
//  -> less reformat need 
//  Ex. datum  07.05.
const compactNums = {
    0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,
    A:10,B:11,C:12,D:13,E:14,F:15,
    // hexspell char to num map tread by optical similarity of lowercase (for  P=-3 UPPER)
    // you may replace the german sharp-S  ß  by another symbol 
    l:-1,z:-2,w:-3,n:-4,s:-5,h:-6,t:-7,ß:-8/*gG*/,q:-9,
    a:-10,b:-11,c:-12,d:-13,e:-14,f:-15,
    // large alt letters are ratios
    L:0.1,Z:0.2,W:0.3,N:0.4,S:0.5,H:0.6,T:0.7,ẞ:0.8/*gG*/,Q:0.9,
    O:0.0,
}
const usesCompactNums = "+";
const compactNumsRE = /^[0-9a-folzwnshtßq]/i;

/**    A+47   -> cor offset 4,7     B+8,e  -> B.xy+= {x:8,y:14}      
 *    compact wide valid cors to two chars:  D+16,-7  */
function parseCompactNums(str = "", formats = ['xy', 'xyW', 'xxyy'], dataObj={},formatPrePrint="") {
    let format = formats.find(f => str.length <= f.length) ?? formats.at(-1);

    const units = [...format].reduce( (us,f)=>(us.at(-1)==f? 0:us.push(f),us) ,[]); 
    
    const addUnit = (n,i)=> !isNaN(n) &&  (dataObj[formatPrePrint+units[i]] =  +n);

    if(/[+,.-]/.test(str)){// fallback to normal cors seperated via ,
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

function asciiToSVG(gridString, targetW, flipH) {
    let [lines, gridW, gridH] = gridStats(gridString);
    
    //             v~~ monospace chars have aspect of 1:2
    const gridAR = (2 * gridH) / gridW;
    
    const viewH =  1000*  2*gridH / gridW;
    const targetH = viewH;
    let viewBox = 'viewBox="'+ 0 + " " + 0 + " " + targetW + " " + targetH+'"';
    
    const allPoints = [];
    const markers = []; //  ~ und &,  § means 50% round -> &5
    const wsScopes = [];

    let fontSize = TXT_FONT_SIZE_IN_Y_CELLS *  targetH/gridH; 

    const handleHashCSSM = (m,pnt,adjacent=false)=>{
        if(!m.data) return false;
        let [_,fill,stroke,strokeW,strokeJoin,strokeCaps,strokeDash,strokeDashOff,id] = 
        m.data.match(/(?:([0-9a-f]+)M)?(?:#?([0-9a-f]{2,}))?(?:==(\d+))?(o=o|<=>|i=i)?(\(=\)|<=>|\[=\])?(?:=-=([+-]?\d+(?:,\d+)*))?(?:=\+=([+-]?\d+(?:.\d+)*))?(.+)?/i)??[]; 
        const isRefInstead = !adjacent && id;
        if(isRefInstead) return false;
        // set attr
        const obj = {fill,stroke,strokeW,strokeJoin,strokeCaps,strokeDash,strokeDashOff,attrId: id};
        m.CSS={};             
        for(const key in obj){
            if(obj[key]==undefined) continue
            let val = obj[key];
            if(["fill","stroke"].includes(key)) val='#'+val;
            if(ATTR_LOOK_UP[val]) val = ATTR_LOOK_UP[val];
            m.CSS[key]=val;
        }
        return true;
    }

    // 1. Grid parsen
    ln:for (let yCell = 0, line; line = lines[yCell], line !== undefined; yCell++) {
        const y = yCell;
        let lastIsPnt = false;
        let lastIsNoWSPnt = false;
        let openRef=null;
        for (let x = 0, char; char = line[x]; x++) {
            const isNum = /[0-9]/.test(char);
            const charNext =  line[x+1];
            const hasNextChar =  charNext&& !!charNext.trim();
            const nextIsCpNum = charNext&& (compactNumsRE.test(charNext) ||  (".,+-".includes(charNext)&&compactNumsRE.test(line[x+2])) );
            let x0=x;
            let markerT = markerChars[char];
            if ( markerT  && ( ( !markerT.after && !markerT.needNextNum) || lastIsPnt ||  nextIsCpNum) ) {
                if(markerT.secondChar ){
                    if(markerT.secondChar!== line.slice(x+1,x+1+markerT.secondChar.length))continue;
                    char += markerT.secondChar; 
                    x+= markerT.secondChar.length;
                } 
                const marker = { type: char, x, y, data: "",prolong:false, closestPnt: lastIsPnt? allPoints.at(-1) : null };
                let lastPnt = marker.closestPnt;
                const prevChar = line[x-1];

                if(markerT.wsScope){
                    x++;
                    let beginnX = x;
                    wsScopes.push(marker);
                    if(marker.type=='"'){
                        marker.isPathStart = marker.isPathEnd=true;
                        allPoints.push(marker);
                        marker.grp = "txt";
                        marker.id = marker.idNorm = "1_000_000_000";
                        Object.assign(marker,TXT_DFLT);
                        // move one down too not need hanging attr, move one right to skip " and match text with preview"
                        marker.y0 = marker.y;
                        marker.x0 = marker.x ++;
                    }
                    if(x==0|| (line[x]==" "&&line[x+1]==" ")  ){
                        marker.data = line.slice(beginnX);
                        continue ln;
                    }  
                    if(line[x]==" ") while( line[x] && !(line[x]==" "&&line[x+1]==" ") ){x++}
                    else while (line[x] && line[x]!==" "){x++}
                    
                    marker.data = line.slice(beginnX,x);
                    if(marker.type=='"'){// exeption to scope rule for common close strings:   "My String"
                        const endQ_m = line.slice(x).match(/(.*?)"(?:\s|$)/);
                        if(endQ_m){
                            marker.data+= endQ_m[1];
                            x+=  endQ_m[0].length;
                        }
                    }
                    continue;
                }
                // maybe interpret some markers as lines  like a -- emits a <path d="Mx,y H 9999" /> and || a <path d="Mx,y H 9999" />
                //  you can make the line automaticlly very large, and when a seperator token like |; _;  |; ;_ is enountered use this as end 
                if (markerT.free && line[x - 1] == char) {
                    x++;
                    if (markerT.free === true) { continue }
                    marker.type += char;
                }
                let anyData = markerT.anyNonWSData;
                if(lastIsNoWSPnt ) anyData ||= markerT.anyNonWSDataConnect;

                const dataBlockRE =  anyData?  /[^\s;]/ : markerT.format ?  compactNumsRE : /[0-9]/ ;
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
                if ( marker.data && !anyData) {
                    if(markerT.format)  parseCompactNums(marker.data,markerT.format, marker.data={},markerT.formatPrePrint);
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
                if(marker.type=="#"){
                    let lastPnt = allPoints.at(-1);
                    // is no WS before # interpet it as a hex stroke color, hex fill color a id for the object
                    if( handleHashCSSM(marker,lastPnt,lastIsNoWSPnt) ){
                        // handled in fn
                    } else{ // becomes next ref
                        x=x0; // step back and let next be a real point
                        openRef=marker;
                        marker.isPathStart =  prevChar=="-"? "":";";
                    }
                }  
                lastIsPnt = false;
                if(markerT.breakWSConnect) lastIsNoWSPnt = false;

                // parse trailing - to signal that this setting is pronged to the next in chain
                if(line[x+1]=="-" &&line[x+2]!=="-"){
                    marker.prolong = true;
                    x++;
                }

            } else if (isNum || /[A-Za-z]/.test(char)) {
                const pnt = { id: char, char, x, y, grp: isNum ? "num" : /[a-z]/.test(char) ? "lower" : "upper",idNorm:char };
                let refM = openRef;
                let isRefMarker = refM?.type=="#" && !refM.resolved; 
                if(isRefMarker){
                    refM.closestPnt = pnt;
                    refM.resolved=1;
                    (pnt.allMarker??=[]).push(refM);
                }
                const eat = isRefMarker? /[0-9A-Z\-;'/]/i : /[0-9zZ]/; 
                while (eat.test(line[x + 1])) {// allow continuation with numbers like  42 or  A2 B3  and a ending Z to close a path 
                    x++; pnt.id += (line[x]??"");
                    if (!line[x]||  (!isRefMarker &&  "zZ".includes(line[x]) )) break;
                }

                allPoints.push(pnt);
                lastIsPnt = true;
                lastIsNoWSPnt = true;
                if(pnt.id.endsWith("Z")){
                    pnt.close = true;
                    pnt.fill = FILL_Z_DFLT;// close with area fill color
                }
                if(pnt.id.endsWith("z")){
                    pnt.close = true;
                }

                if(isRefMarker && !handleHashCSSM(refM,pnt,false)){
                    let [_,isPathStart=refM.isPathStart,pathCon="",startId="",endId="",lastIsPathEnd=""] = pnt.id.match(/(;)?(-)?[#\/]?((?:[A-Z]\d*|\d+)(?:'\d*)?)(?:-)?[#\/]?([A-Z]?\d*(?:'\d*)?)?(;)?/i)??[]; 
                    if(!pathCon) pnt.idGrp=200;  // emit point(s) after all other, otherwise
                    else isPathStart="";
                    Object.assign(pnt,{isPathStart,pathCon,endId,lastIsPathEnd});
                    pnt.raw = pnt.id;
                    pnt.id= startId;
                    pnt.isRef=true;
                    pnt.x= refM.x;
                }
                pnt.idNorm = pnt.id.match(/[A-Z]?\d*/i)?.[0]??pnt.id;
            } else {
                lastIsPnt = false;
                lastIsNoWSPnt = false;
            } 
        }
    }

    // 2. Gruppieren nach Gehäuse (Upper) und Löchern (Lower,Digits)
    let groups = Object.groupBy(allPoints, p => p.grp);
     
    const idToSortNum = (id,grp=0, offset=0)=> !isNaN(+id)?+id:(grp+id[0].charCodeAt(0))*10000+(isNaN(+id.slice(1))? +id.slice(2)||999 :+id.slice(1)+offset);

    for (const grp in groups) {
        groups[grp].forEach( pnt=>pnt.sortNum=idToSortNum(pnt.id,pnt.idGrp, pnt.idOff) )
        groups[grp] = groups[grp].sort((a, b) => a.sortNum-b.sortNum);
    }
    // for the enumeration order
    groups = { upper: groups.upper, lower: groups.lower, num: groups.num, ...groups }

    const markerAction = (m,pnt,{passMask=0b111111111})=>{

        let markerPassMask = markerChars?.[m.type]?.passMask??1;

        if( ! (markerPassMask & passMask ) || !pnt ) return;

        const isPosMarker = "+xypXYP".includes( m.type);
        const isCurveMarker = "~&".includes( m.type);
        const isScaleMarker = "*".includes(m.type);
        if( isCurveMarker ) pnt.marker = m;

        let allM = pnt.allMarker??=[];
        if(!allM.includes(m)) allM.push(m); 
        let allP = m.allPnts??=[];
        if(!allP.includes(m)) allP.push(pnt); 

        if(m.type==";"){
            if(m.x> (pnt.x0??pnt.x) ) pnt.isPathEnd= true;
            else pnt.isPathStart=true;
        } else if(m.type=="-" ){
            pnt.isPathStart=false;
        } else if( m.type =="," ){
            if(m.snapPnt &&  passMask & 0b10 ){
                pnt.x0 ??= pnt.x;
                pnt.x = m.snapPnt.x;
            }  
        } else if(m.type=="#"){
            Object.assign(pnt,m.CSS);
        }
        if(m.data && isPosMarker){  // set the relativ or position
            for(const u in m.data){
                const lower = u.toLowerCase();
                pnt[lower+"0"] ??= pnt[lower]; 
                pnt[lower] =  lower===u? (pnt[u]||0)+m.data[u]  : m.data[u];
            }
        } else if(isScaleMarker && pnt.bbMid){
            m.data['sy'] ??= m.data['sx']; // just number scale should also scale y
            for(const u in m.data){
                const cor = u.at(-1);
                pnt[cor+"0"] ??= pnt[cor]; 
                pnt[cor] = pnt.bbMid[cor] +  m.data[u] * (pnt[cor]-pnt.bbMid[cor])
            }
        }
    }
    // find closest point for each marker
    for (const m of markers) {
        let dMin = Infinity;
        let closestPnt = m.closestPnt;
        const maxDist = m.maxDist??Infinity;
        const maxYDist = m.maxYDist??Infinity;

        if(m.type==",") closestPnt = null;
        if (!closestPnt) for (const pnt of allPoints) {
            // has already a marker maybe? skip
            // if(pnt?.marker?.type==m.type) continue;
            const py = pnt.y0??pnt.y;
            if(m.y - py> maxYDist) continue
            const px = pnt.x0??pnt.x;
            
            let d = Math.hypot((m.x - px), (m.y - py) * 2);
            
            if( d>maxDist) continue
            
            if (d <= dMin && pnt!==m.snapPnt) {
                dMin = d;
                closestPnt = pnt;
                m.dist = d;
            }
        }
        if (closestPnt){
            m.closestPnt = closestPnt
            if(m.snapPnt){
                // if trailing with WS, snap to the right
                let dxSpnt = Math.abs( m.x - (m.snapPnt.x0??m.snapPnt.x));
                let dxPnt = Math.abs( m.x - (closestPnt.x0??closestPnt.x));
                if(    dxSpnt < dxPnt  ){
                    m.closestPnt = m.snapPnt;
                    m.snapPnt =  closestPnt; 
                } 
            }
            markerAction(m,closestPnt,{passMask:0b01});  
        }  
        m.dist ??= 1;
    }

    let allOrderedPnts = Object.values(groups).flatMap(g=>g??[]);
    
    const calcMidPnt = (pnts)=>{
        if(!pnts) return;
        const minXY=pnts.reduce( (a,p)=>(a[0]=Math.min(a[0],p.x),a[1]=Math.min(a[1],p.y),a)  ,[Infinity,Infinity] );
        const maxXY=pnts.reduce( (a,p)=>(a[0]=Math.max(a[0],p.x),a[1]=Math.max(a[1],p.y),a)  ,[0,0] );
        const mid = {x: minXY[0]+(maxXY[0]- minXY[0])/2,y: minXY[1]+ (maxXY[1]- minXY[1])/2, };
        for(const p of pnts) p.bbMid = mid;
    }

    let fullPath = "";
    let grpSplitCounts={};
    const splitGrp = (grpName)=>{
        let grp= groups[grpName];
        if(!grp) return;
        let splitids =grpSplitCounts[grpName]?? 1;
        let splitIdx = 0;
        let offset = 0;
        while( -1!==(splitIdx=grp.findIndex(  (g,i,a)=>  i>0 && g.isPathStart?(offset=0,1) : g.isPathEnd&&i+1<a.length? (offset=1,1) :0 )) ){
            grp = groups[grpName+"/"+splitids++] = grp.splice(splitIdx+offset);
            grpSplitCounts[grpName]= splitids;
        }
    }
    // split groups by path start end
    for (const grpName in groups){  splitGrp(grpName) }
    
    for (const grpName in groups){  calcMidPnt(groups[grpName]) }
    
    // constraints snap of ,  do only after all offsets have been applied
    for(const m of markers){
        markerAction(m,m.closestPnt,{passMask:0b10});
    }
    const getGrp = (pnt)=>(Object.values(groups)).find(grp=>grp?.includes?.(pnt));

    // prolong markers
    for(const m of markers){
        if(!m.prolong) continue;
        const isCurve = m=> "&~-".includes(m.type);
        const mIsCurve = isCurve(m);
        for(const pnt of m.allPnts??[]){
            const grp = getGrp(pnt);
            let firstIdx = grp.indexOf(pnt);
            for(let i=firstIdx+1;i<grp.length;i++){
                const nxtPnt = grp[i];
                // stop before next prolong marker
                if(nxtPnt?.allMarker?.some?.(mNxt=>mNxt.prolong && "&-~".includes( mNxt.type)  )){ break; }
                // has this marker already
                if(nxtPnt?.allMarker?.some?.(mNxt=>mNxt.type==m.type || (mIsCurve&& isCurve(mNxt)) )){ continue; }
                markerAction(m,nxtPnt,{passMask:0b11});
            }
        }
    }

    let maxRef=2;
    for (const grpName in groups) if(groups[grpName]) for(const pnt of groups[grpName]){
        if(!pnt.isRef||pnt.R>maxRef) continue;
        let startPnt = groups[grpName].find(p=>p!==pnt && !p.isRef && p.idNorm==pnt.id) ?? allOrderedPnts.find(p=>!p.isRef&&p.idNorm==pnt.id);
        let startPntIdx = allOrderedPnts.indexOf(startPnt);
        let endPntIdx = allOrderedPnts.findIndex( p=>!p.isRef && p.idNorm==pnt.endId);
        let insertees;
        let curGrp = groups[grpName];
        if(endPntIdx>=0){ 
            const reversed = endPntIdx<startPntIdx; 
            insertees  = reversed? allOrderedPnts.slice(endPntIdx,startPntIdx+1).reverse() 
                 : allOrderedPnts.slice(startPntIdx,endPntIdx+1) 
            if(reversed){
                insertees[0].isPathEnd = false;
                insertees[insertees.length-1].isPathStart = false;
            }
        }
        else { 
            curGrp = getGrp(startPnt);
            insertees = curGrp.slice( curGrp.indexOf(startPnt), );
        }   
        // base on the first point, -> could implement setting how to align via boundingbox e.g  center or left shift 
        let anchorX = pnt.x - insertees[0]?.x; 
        let anchorY = pnt.y - insertees[0]?.y; 
        let mulM = pnt.allMarker.find(m=>m.type=="*");
        const attrs = {};  // overwrite style attributes
        for(const attr in ATTR_2_PROP){
            const prop = ATTR_2_PROP[attr];
            if(prop in pnt) attrs[prop]=pnt[prop];
        } 

        insertees = insertees.map( (oriP,i)=>{
            p= structuredClone(oriP);
            Object.assign(p,attrs);
            p.x+=anchorX;
            p.y+=anchorY; 
            if(mulM){ // for now scale around first point
                p.x = pnt.x +  mulM.data.sx * (p.x-pnt.x)
                p.y = pnt.y +  mulM.data.sy * (p.y-pnt.y)
            }
            p.R= 1+ (pnt.R??0);// recursiv depth 
            p.copyOf=oriP;
            oriP.copyCnt = (oriP.copyCnt??0)+1;
            p.idNorm = p.idNorm+"'"+ oriP.copyCnt;
            if(i==0&& pnt.isPathStart) p.isPathStart=true;
            if(i==insertees.length-1&&pnt.lastIsPathEnd) p.isPathEnd=true;
            return p;
        } );
        let pntIdx= groups[grpName].indexOf(pnt);
        groups[grpName].splice(pntIdx,1,...insertees);
        let allGrpsIdx = allOrderedPnts.indexOf(pnt);
        allOrderedPnts.splice(allGrpsIdx,0,...insertees);
        splitGrp(grpName);
    }    
    let asciiParsed = { svg:"",allG:[], allD:"", gridW,gridH,gridAR,viewH,wsScopes };// assemble svg and a combination of all paths
  
    const attrStr = (k,v)=> v==undefined?"":" "+k+'="'+v+'"';

    for (const grpName in groups) 
    if (groups?.[grpName]?.length) {
        let nextG = { 
            d:buildSmartPath(groups[grpName], gridW, gridH, targetW, targetH, flipH),
            nodes: groups?.[grpName],
            attr:"", // inlcudes style
        }
        if(grpName.startsWith("txt")){
            nextG.attr+=attrStr("x",nextG.nodes[0].xOut,)+attrStr("y",nextG.nodes[0].yOut,)
        }
        asciiParsed.allG.push(asciiParsed[grpName]=nextG);
        asciiParsed.allD+= asciiParsed[grpName].d+" ";

        for(const attr in ATTR_2_PROP){
            const prop = ATTR_2_PROP[attr];
            let lastZFill = undefined;
            nextG.attr+= attrStr(attr, nextG.nodes.findLast( n=>n.close?(lastZFill=n[prop],0)
                : n[prop]!==undefined )?.[prop]??lastZFill);
        }
    }
    asciiParsed.allD = asciiParsed.allD.trim();
    
    // grp all by attribute and combine same attributes in a sinlge <path>
    //  -> needed for Area substraction
    //  -> TO DO use a other form of id attr to seperate some
    //    or TO DO the ;; as a <g> seperator 
    const attrGrps = Object.groupBy( asciiParsed.allG, g=> g.attr);
    
    let rootAttrs = asciiParsed.allG.length? attrStr("fill",FILL_DFLT)
        + attrStr("stroke",STROKE_DFLT)  + attrStr("stroke-width",STROKE_W_DFLT) 
        + attrStr("stroke-linecap",LINE_CAPS_DFLT) 
        + (wsScopes.some(n=>n.type=='"')?   
            attrStr("font-size",fontSize)
             + Object.entries(TXT_ROOT_ATTR).reduce( (a,[k,v])=>a+attrStr(k,v),"" )
            :"")
        +  attrStr("xmlns",XMLNS)
    :"";
    
    asciiParsed.svg+=`<svg ${viewBox}${rootAttrs}>`;
    
    for(const attrGrpNm in attrGrps){
        const attrGrp = attrGrps[attrGrpNm];
        const firstNode = attrGrp?.[0]?.nodes?.[0];
        if(firstNode?.type=='"'){
            const sane = firstNode.data.replaceAll(/^\s|\s$/g,`&#160;`).replaceAll("<","&lt;");
            asciiParsed.svg+=`\n<text${attrGrp[0].attr}>${sane}</text>`
        } else asciiParsed.svg+=`\n<path${attrGrp[0].attr} d="${attrGrp.reduce( (d,g)=>d+g.d,"")}"/>`;
    }
    asciiParsed.svg+="</svg>"
    
    return asciiParsed;
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
function markerDistToPercent(pnt,baseOffset=0.2) {
    return pnt?.marker?.data !== "" ? pnt.marker.data : Math.round(2 * pnt?.marker.dist) / 10 - baseOffset;
}
function buildSmartPath(points, gridW, gridH, targetW, targetH, flipH = false, fixed = 3) {
    const flipHSub = (flipH ? targetH : 0);
    const flipMul = (flipH ? -1 : 1);
    const map = (x, y,p={}) => trimNum( p.xOut= (x / (gridW - 1)) * targetW, fixed) + " " + trimNum(p.yOut = flipHSub + flipMul * (y / (gridH - 1)) * targetH, fixed);

    let d = `M ${map(points[0].x, points[0].y, points[0])}`;
    let lastPnt = points.at(-1);
    let isClosed = lastPnt.isPathEnd || lastPnt.id.toLowerCase().includes("z");
    
    // insert more points curves to mimic circles/ellipsis
    // without this, the curves would degenerate into straight lines,
    //  which could confuse user (cause ~& marker seem doing nothing) and is useless, so do auto circles
    if(points.length==2 && "&~".includes( points[0].marker?.type) ){
        const ab =  sub(points[0],points[1]);
        const abNormal = {x: -ab.y,y: ab.x };
    }
    // calc all entries and exits
    for (let i = 0; i < points.length; i++) {
        if (points[i]?.marker?.type == "&") {
            let pPrev = points[(i - 1 + points.length) % points.length];
            let maxPrevDist = 1 - (pPrev.dist || 0);
            if (pPrev.quadCP) pPrev = pPrev.quadCP;

            let pNext = points[(i + 1) % points.length];
            if (pNext.quadCP) pNext = pNext.quadCP;// only for last point

            const pnt = points[i];

            let dist = markerDistToPercent(pnt,0.1);
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

        const isEnd = pCurr.isPathEnd ||   i + 1 == points.length;
        if (isEnd &&  !isClosed && !pCurr.isPathEnd ) continue;

        const markerT = pCurr.marker?.type;

        if (markerT === '&') {
            const entry = pCurr.entry
            const exit = pCurr.exit

            if (i == 0) d = "";
            let nextLine = isEnd ? 'Z' : 'L' + map(pNext.x, pNext.y,pNext);

            // if rounded to 50% the Q may ladn already on the next point -> skip L directiv
            if (Math.abs(exit.x - pNext.x) < 0.1 && Math.abs(exit.y - pNext.y) < 0.1) nextLine = ""

            d += `${i == 0 ? 'M' + map(entry.x, entry.y,entry) : ''}Q${map(pCurr.quadCP.x, pCurr.quadCP.y,pCurr.quadCP)} ${map(exit.x, exit.y,exit)}${nextLine}`;
        }
        else if (markerT === '~') {
            // Catmull-Rom zu Cubic Bezier
            const percent = markerDistToPercent(pCurr,0.2);
            const tens = pCurr.marker?.data || 1 - Math.max(-3, Math.min(3, percent));

            const cp1 = calculateCatmullCP(pPrev, pCurr, pNext, pNextNext, 'start', tens);
            const cp2 = calculateCatmullCP(pPrev, pCurr, pNext, pNextNext, 'end', tens);
            d += ` C${map(cp1.x, cp1.y,cp1)} ${map(cp2.x, cp2.y,cp2)} ${map(pNext.x, pNext.y,pNext)}`;
        }
        else if (isEnd) {
            d += 'Z'
        } else {
            // Scharfe Kante
            d += `L${map(pNext.x, pNext.y,pNext)}`;
        }
        // in path closes closes
        if(!(i+2==points.length) && (pNext.id.includes("z")||pNext.id.includes("Z")))d+='Z';
    }
    return d;
}
