
const arrBbox = (data,isSketchTemplate=false)=>{
    const allX = data.map(d=>d[0]|| d.x);
    const allY = data.map(d=>d[1]|| d.y);
    const bbox = {
        minX: Math.min.apply(0,allX ),
        maxX: Math.max.apply(0,allX ),
        minY: Math.min.apply(0,allY ),
        maxY: Math.max.apply(0,allY ),
        W:0,H:0,
        AR:1,
        fr:5,// grid fraction count  Note odd number is better for middle lines
    }
    bbox.W = bbox.maxX-bbox.minX;
    bbox.H = bbox.maxY-bbox.minY;
    bbox.AR=(bbox.W||1)/(bbox.H||1);
    if(isSketchTemplate){
        // center vertical or horzontal strokes, prevent diagonal grid templates
        if(bbox.AR<0.2){
            bbox.minX-=2*bbox.W
            bbox.maxX+=2*bbox.W
            bbox.W= 5*bbox.W;
        } else if(bbox.AR>4){
            bbox.minY-=2*bbox.H
            bbox.maxY+=2*bbox.H
            bbox.H= 5*bbox.H;
        }
    }
    return bbox;
}
// helper for template rotation normalisation
function massPnt(pnts=[]){
    let Mpnt = Array.from({ length:2, ...pnts[0]??[]});
    for(const pnt of pnts) for(let i=0;i<Mpnt.length;i++) Mpnt[i]+=pnt[i]??pnts[0][i]??0;
    for(const x in Mpnt) Mpnt[x]/=pnts.length;
    return Mpnt;
}
function principalAngle(pnts=[]){
    const c = massPnt(pnts);
    let xx = 0,  yy = 0, xy = 0;
    for(const p of pnts){
        const x = ( p[0]) - c[0];
        const y = ( p[1]) - c[1];
        xx += x * x;    yy += y * y;    xy += x * y;
    }
    return 0.5 * Math.atan2(  2 * xy, xx - yy ); // PCA angle
}
// util
Object.defineProperty(Number.prototype,"L",{get(){ return new Array(0+this).fill(0).map((x,i)=>i) }})
Object.defineProperty(Object.prototype,"log",{get(){ let v=this.valueOf  === Object.prototype.valueOf?this:this.valueOf(); console.log(v);return v }})

function norm(v){ let l=Math.hypot(...v);return v.map(x=>x/l) }
var TAU=2*Math.PI;
//// General in Geo Alg: R = vu / |vu| for vecs v,u
function rotor2(angle){
    const h = angle * 0.5;// R is half the angle you actually want e.g.  for 45° use 22.5° vec 
    return [ Math.cos(h), Math.sin(h)]; 
}
/**  use :  `let R = rotor2(Math.PI/2);  rotate2([1,0], R);//[0,1]`  */
function rotate2(v, r){
    const [x=0,y=0] = v;
    if(r[2]<=-100) Object.assign(r,rotor2(r[0])),r[2]=204;
    const [s,b] = r;
    return [ (s*s - b*b)*x - 2*s*b*y, 2*s*b*x + (s*s - b*b)*y ];  // equivalent to sandwich geo product:   v' = R * v * R~
}
function rotor3( angle,axis=[0,0,1],normize=true){
    if(normize) axis = norm(axis);
    let [x,y,z] = axis;
    const h = angle * 0.5 ,  s = Math.cos(h), k = Math.sin(h);
    return [ s, x * k, y * k, z * k ];// R = s + xy e12 + yz e23 + zx e31
}
function rotate3(v, r){
    const [Vx=0,Vy=0,Vz=0] = v;
    if(r[4]<=-100) Object.assign(r,rotor3(r[0],r.slice(1,4),1)),r[4]=204; // simple rotor init for map
    const [ s, yz, zx, xy ] = r;
    // r * v (bi-vec * vec)  -> x y z xyz
    const QVx = s*Vx + zx*Vz - xy*Vy;
    const QVy = s*Vy + xy*Vx - yz*Vz;
    const QVz = s*Vz + yz*Vy - zx*Vx;
    const QVxyz = -yz*Vx - zx*Vy - xy*Vz;
    // result * r~
    return [ QVx*s + QVxyz*-yz + QVy*-xy - QVz*-zx,      QVy*s + QVxyz*-zx + QVz*-yz - QVx*-xy,     QVz*s + QVxyz*-xy + QVx*-zx - QVy*-yz ];
}


function sketchGridId(path,{parsePath0=undefined,bbox0=undefined,denseDrop=0.71}={}){
    const data = parsePath0 ?? ( typeof path=="string"? svgLinePathStrToAbsPntArr(path,1) : path); 
    const bbox =  bbox0?? arrBbox(data,true)
    let p = null;
    let gridIdxs = [];
    let gridIdxsMap = {__proto__:null};
    const addGrdIdx = (grdIdx)=>{
        gridIdxsMap[grdIdx.bin] ??= grdIdx;
        gridIdxsMap[grdIdx.bin].dense = (gridIdxsMap[grdIdx.bin].dense??0)+1;
        gridIdxs.push(grdIdx);
    }
    for(const d of data){
        const x=d.x??d[0],  y=d.y??d[1]; 
        const pNext =  toGridSpace(x,y,bbox);;
        if(!p || d.cmd?.toLowerCase?.()=="m"){  
            p = pNext;
            addGrdIdx( toGridIdx(p,bbox) )
            continue;
        }
        const len = Math.hypot( pNext.x - p.x, pNext.y - p.y);
        const subSect = Math.ceil(len * bbox.fr * 2);
        
        const dx = (pNext.x - p.x )/subSect;
        const dy = (pNext.y - p.y )/subSect;
        for(let sect=1; sect<=subSect;sect++){
            p.x+=dx;
            p.y+=dy;
            addGrdIdx( toGridIdx(p,bbox) )
        }
        p=pNext;
    }
    // drops values whoes density is small than this percentage from the max density
    if(denseDrop>0){
        let maxDens = Math.max( ...Object.values(gridIdxsMap).map(x=>x.dense??1) );
        const cutOff = maxDens*denseDrop;
        for(const key in gridIdxsMap) 
            if(gridIdxsMap[key].dense < cutOff ) delete maxDens[key];
    }
    const num = combine(gridIdxsMap);
    return {num, gridIdxs,gridIdxsMap,bbox};
}
function toGridSpace(x,y,bbox){
    return { x:  (x-bbox.minX)/bbox.W,   y:  (y-bbox.minY)/bbox.H, }
}
function toGridIdx(grdPnt,bbox){
    // linear cont diff between circles and rects
    // const gx =  Math.min(bbox.fr-1, 0|(grdPnt.x * bbox.fr));
    // const gy = Math.min(bbox.fr-1,  0|(grdPnt.y * bbox.fr));
    // skewed
    let x = grdPnt.x; let y = grdPnt.y;
   // convert to centered -1..1
    let cx = x * 2 - 1;
    let cy = y * 2 - 1;
    let r = Math.hypot(cx, cy);
    if (r > 0.5 && r< 1.35 && (x>0.08&&x<0.92)&&(y>0.08&&y<0.92) ){
        // compress corners stronger than edges
        // 0   => no effect   0.2 => subtle   0.35 => strong
        const warp = 1 - 0.25 * (r*r);
        cx *= warp;  cy *= warp;
    }
    // back to 0..1
    x = (cx + 1) * 0.5; y = (cy + 1) * 0.5;
    const gx = Math.min(bbox.fr-1, 0|(x * bbox.fr));
    const gy = Math.min(bbox.fr-1,  0|(y * bbox.fr));

    const gidx = gy*bbox.fr+gx;
    return {gx,gy,  idx: gy*bbox.fr+gx, bin: 1<<gidx  };
}
function combine(gridMap){
    let num=0;
    for(const key in gridMap) num |=(+key);
    return num;
}
/** Usfull info for this string */
function gridNumToAscii(num=0,log=1,bbox){
    if(num<1) return;
    let str="";
    for(let i=0,ni=num; i<25;i++,ni>>=1){
        str+= +(ni&1)?"#":" "
        if(i%5==5-1) str+="\n";
    }
    
    if(log){
        let prettyNum = prettyNumBin(num);
        console.log(`num:${num}  AR:${(bbox?.AR??1).toFixed(2).replace(/\.0+$/,"")} bin: ${prettyNum} (Read R->L)\n${str}\n\npotEnt: "?":{ grid:${prettyNum}, subMask:${prettyNumBin(~num & bin5x5)} },`,
        typeof log=="object"?log:undefined);
    } 
    return str;
}
function prettyNumBin(num){ return "0b"+ num.toString(2).padStart(25,"0").replace(/(.{5})(?!$)/g,"$1_") }
// not complete shape is enough an allows some drawing varity
const sketchBook= {
    "A":{grid: "mm1mm_m1.1m_....._..1.._1m..1",},
    "B":{grid: "1..1._1m..1_..11._1m..1_1.1.."},
    "B:2":{grid: 6042630, subMask: 0,char:"B"},
    "C":{grid: "...1._.1mm._1.mmm_.1mm1_...1."},// little up stroke like G
    "C:2":{grid: "...1._11mmm_1.mmm_11mmm_...1.",char:"C"},// perfect drawn C
    "D":{grid: "1.1m._1..1._1mm.1_1m.1._1.1.."},
    "E":{grid: "1.1.1_1mmmm_1...._1mmmm_1.1.1"},
    "F":{grid: "1.1.1_1.mmm_1mm.._1..mm_1.mmm",highAR:"\b"},
    "G":{grid: "...1._.1mmm_1..11_.1..1_...1."},
    "G:2":{grid: "1..1._1.mmm_1..11_1...1_.1.1.",char:"G"},
    "H":{grid:18406945,   subMask:14680262,},
    "L":{grid: "1.mmm_1.mmm_1.mmm_1...._1.1.1",lowAR:"I",highAR:" "},
    "-":{grid: "mmm.1_mmm.1_mmm.1_....._1.1.1",lowAR:"|",highAR:"\n"},// vertical mirroed L shape
    "T":{grid: "1.1.1_mmm.1_mmm.1_....._mmm.1",lowAR:",",highAR:"."},// inverted L as T
    "M":{grid: "....._.1.1._....._1.1.1_1.1.1"},
    "M:2":{grid: "..mm._1...1_1.1.1_11..1_1.m.1",char:"M"},
    "N":{grid: "..mm._1...1_1.1.1_1mm.1_1mm.1"},
    "N:2":{grid: 296528, subMask: 2097548, char:"N"},// via anding of multiple sketches

    "O":{grid: "m1.1m_11..1_1.m.1_1...1_m1.1m",},
    
    "V":{grid: 2302257, subMask: 25707214},


    "a":{grid: 804128, subMask: 0,},
    "b":{grid: 15531040, subMask: 131996},
    "d":{grid: 23904784, subMask: 47,},
    "e": {grid: 4294270, subMask: 1703936},
    "n":{grid: 18400545, subMask: 15151120,},
    "s":{grid: 7602252, subMask: 32768,},
    "r":{grid: 80, subMask: 30302720},
    "t":{grid: 12845184, subMask: 16899},
    "u":{grid: 837168, subMask: 8394894, lowAR:"U"},
    "u2":{ grid: 6587953, subMask: 16783822, lowAR:"U",char:"u"},

    "/":{grid: 1118480, subMask: 32296687,highAR:"\b",midAR:"\b"},
    "Box":{grid: "1.1.1_1mmm1_1mmm1_1mmm1_1.1.1",},
    "TriU":{grid: 32516164, subMask: 135729},

    "✓":{grid: 2162960, subMask: 25971407,},
}
const intBook = b=>{ for(const k in b){parseGridToNum(b[k])  } }
intBook(sketchBook)

const spellBook = {
    "Box":{grid: "11111_1mmm1_1mmm1_1mmm1_11111",},
    "O":{grid: "m1.1m_11..1_1.m.1_1...1_m1.1m",},
    "O2":{grid: 15583046, subMask: 137233, char: 'O'},
    "TriU":{grid: 32516164, subMask: 135729},
    U: {grid: 15058481, subMask: 0b10001_00100_00100_01110_01110,},
    // n:{grid: 18399564, subMask:  0b00100_00100_00100_00000_10001},
    "HexU":{grid: 5097316, subMask: 17971329, },//0b00100_11011_10001_11011_00100  read right to left or bottom to top

    'arrR':{grid: 9422824, subMask: 19937299, score: 14},
    "arrRt": { grid:9207560, subMask:24346871,},// thin

    "arrDia":{ grid:0b00100_00100_01110_11011_01110, subMask:0b10001_10001_10001_00000_10001 }, 
    "arrCir":{ grid:0b00100_00100_11111_11011_11111, subMask:0b11011_11011_00000_00100_00000 }, 


    "Column":{ grid:0b11111_00100_00100_00100_00100, subMask:0b00000_10001_10001_10001_11011 },
    "Dispersion":{ grid:0b11111_10101_00100_00100_00100, subMask:0b00000_00000_10001_11011_11011 }, // connected Box
    "Crush":{ grid:0b10101_10101_01010_01010_01010, subMask:0b01010_00000_00000_00000_10101 },
    "Collection":{ grid:0b00000_01010_00000_01010_11111, subMask:0b01110_10001_10001_00100_00000 },
    "Entwine":{ grid:0b11111_10101_00100_11111_10001, subMask:0b00000_00000_11011_00000_01110 },
    "Solidify":{ grid:0b01110_01010_00100_01010_01110, subMask:0b10001_00000_10001_00000_10001 },
    "SightSet": { grid:0b01110_11011_00100_10101_01110, subMask:0b10001_00000_10001_00000_10001 }, 
    "Envelop":{ grid:0b00110_00101_00100_10100_01100, subMask:0b11001_11000_11010_00011_10011 }, 
    "Gather":{ grid:0b10001_01110_00100_01110_00100, subMask:0b00110_10001_01010_00000_10001 },
    "Cross":{ grid:0b00100_00100_11111_00100_00100, subMask:0b11011_10001_00000_10001_11011 },
    "Bolt":{ grid:0b00100_01110_11111_01110_00100, subMask:0b11011_10001_00000_10001_11011 },
    "Glaives":{ grid:0b00100_00100_00100_01110_10101, subMask:0b11011_11011_11011_00000_00000 }, 
    "Pull":{ grid:0b00100_01110_10101_00100_00100, subMask:0b10001_00000_00000_10001_10001 , need:[{child:"TriU"}]}, 
    "Levitate":{ grid:0b00100_00100_10101_11111_01110, subMask:0b10001_11011_01010_00000_10001 },
    "Levitate2":{ grid:0b11111_00100_00100_10101_00100, subMask:0b00000_10001_00000_00000_10001,char: "Levitate"},  
    "Wind":{ grid:0b01000_00110_00011_11011_01110, subMask:0b00111_10001_11000_00000_00000 }, 
    "Weave":{ grid:0b10001_01010_01010_01010_01110, subMask:0b00100_10101_00100_00100_10001 }, 
    "Strengthen":{ grid:0b11111_01010_11011_01110_00100, subMask:0b00000_10101_00100_10001_11011 }, 
    // "Strengthen2":{ grid:0b01110_01010_11111_00100_00100, subMask:0b00000_10101_00000_10001_11011,char:"Strengthen" },  
    "Region":{ grid:0b10001_01010_01010_00100_00100, subMask:0b01110_00100_00000_10001_11011 },
    "L":{ grid:0b10000_10000_10000_10000_11111, subMask:0b01111_00111_00111_10011_00000 },
    "RegionWing":{ grid:0b10001_01010_01110_01110_00100, subMask:0b01100_10001_10001_10001_11011 },
    "ElchTower":{ grid:0b11111_11111_00100_01100_01100, subMask:0b00000_00000_11011_10011_10011 },
    "Diamond":{ grid:0b00100_01010_10001_01010_00100, subMask:0b10001_00100_00100_00100_10001, lowAR:"Bolt" },
    "Limit":{ grid:0b01010_10101_10101_01010_01110, subMask:0b10100_00000_00000_00001_10001 }, 
    "OHalf":{ grid:0b01111_11001_10001_11001_01111, subMask:0b10000_00110_01110_00110_10000 }, 
    // a bit more pointy
    "OHalf2":{ grid:0b00111_01001_10001_11001_01111, subMask:0b11000_10110_01110_00110_10000 }, 
    "Vision":{ grid:0b00100_01110_01110_01110_00100, subMask:0b01010_10001_00000_10001_01010 },
    "Rain":{ grid:0b10101_01110_10001_11111_00100, subMask:0b11000_10000_01100_00000_11011 },  
    "Window":{ grid:0b00100_01110_11011_01110_00100, subMask:0b10001_10001_00100_10001_10001 }, 
    "Radial":{ grid:0b10001_11011_11111_11111_01110, subMask:0b01110_00100_00000_00000_10001 },  
    "Float":{ grid:0b01110_11100_11110_00111_01110, subMask:0b10001_00011_00001_11000_10001 },// thin vert tilde
    "Asteroid":{ grid:0b10001_01110_01010_01110_10001, subMask:0b01110_00001_10101_10001_01110 }, 
    
    "S":{ grid:0b01110_10000_01100_00010_01110, subMask:0b00000_00111_00000_11100_00001, lowAR:"Float" },
}
intBook(spellBook)
let initalSpells = {...spellBook};
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
function copyNewEntries(book=spellBook,clipTimeout=5_000, asAscii=0){
    let str ="";
    for(const k in book) if(!initalSpells[k]){
        str+=`\n"${k}": { grid:${book[k].grid}, subMask:${book[k].subMask},${asAscii?"_ascii:"+`gridNumToAscii(book[k].grid,0)`:""}  ${book[k].char?"char:"+'"'+book[k].char+'",':""}},`;
    }
    console.log(str);
    if(clipTimeout>=0) sleep(clipTimeout).then( _=> navigator.clipboard.writeText(str));
    return str;
}
document.addEventListener("close",()=>{
    let anyUnsaved = !!Object.keys(spellBook).some(k=>!(k in initalSpells))?.length;
    if(anyUnsaved && confirm("Want to save unsaved templates into Clipboard?")) copyNewEntries();
})

function parseGridToNum(entry, str=entry.grid){
    if(typeof entry.grid=="number") return;
    const ln= str.split(/[\n_]+/);
    let nu=0;
    let sub=0;
    let res=0;
    for(let i=0, ch=""; ch=str[i];i++){
        if("\n_".includes(ch)) continue;
        if("1#xX".includes(ch)) res|=1<<nu;
        if("-m".includes(ch))sub|=1<<nu;
        nu++;
    }
    entry.grid=res;
    entry.subMask=sub;
    return res;
}


function reverse(n){ return parseInt(  [...n.toString(2)].reverse().join("")) }
/** select depending on the aspect artio a char  */
function aspectAlts(entry,name,asp){
    const k = entry[name]?.char ?? name;
    return (   asp<0.55? entry.lowAR : asp>1.3? entry.highAR : asp<0.8?entry.midAR :asp>1.15?entry.lAR : k) ?? k;
}
let maxSubFalse= 4;
function lookUpSketch(num=0,AR,book=sketchBook){
    const canidates = [];
    let sub=0;
    for(const k in book){
        const grid = book[k].grid;
        if(   (grid&num) == grid && maxSubFalse>(sub=count1s(num&book[k].subMask)) ){
            canidates.push( {name:aspectAlts(book[k],k,AR),score: (book[k].score??=count1s(grid))- sub } );
        } 
    }
    const res= canidates.sort((a,b)=>b.score-a.score);
    return res;
}
function count1s(num){
    let cnt=0;
    for(let ni=num;ni;ni>>=1) cnt+=ni&1;
    return cnt;
}
function lookUpClosests(num=0,AR,book=sketchBook){
    const canidates = [];
    let sub=0;
    for(const k in book){
        const grid = book[k].grid;
        sub=count1s(num&book[k].subMask);
        score = (count1s(num&grid))- sub - (count1s( ~num& grid & bin5x5) );
        book[k].score??=(count1s(grid))- sub;
        canidates.push( {name:aspectAlts(book[k],k,AR),score, relScore: score/book[k].score ,  } );
    }
    const res= canidates.sort((a,b)=>b.score-a.score);
    return res;
}


/// Mouse input

let openPath = [];
let prevTouch = null;
let openSvg = null;
let debugPath = null;
let openCanvas = null;
let canvasContours = null;
let initialSel = null;
let lastMouseDown = [0,0];
let maxDebugPaths = 10;

let brushes= {
    square(ctx,x,y,size){ ctx.fillRect(x-size/2,y-size/2,size,size); },
    circle(ctx,x,y,size){   ctx.arc(x-size/2,y-size/2,size/2,0,2*Math.PI); },
    flatStick(ctx,x,y,size){  ctx.fillRect(x-size/2,y-size/8,size,size/4); },
}

let lastSketch = {  
    raw:[], ramen:[], epsPercent: 0.03 /* a small part of view port */ ,eps:5,  grid:null,
    allowConnect:false, snap:1.5, intoText: true, noCurves:false,
    lessBoxify: 0,
    logStroke:0,
    logCountours:1,
    lastMasks:[],
    logMasks:0,
    el: null,
    insertFound: false,
    insertedChar:false,

    brushEpsPercent: 0.02,
    brushFixEps: undefined,// no scaling with figure boundingbox, better for large connected figures
    brushUseCurve:0,
    brushSnap: undefined,// -> auto
    brushSize:  0.01,// percent of canvas width
    brushLenMul: 2,
    brushFn: brushes.square,
    brushColor: "#002",
    svgClassify:1,
};
initBrushInputs()
function initBrushInputs(){
    const inFn = window.brushFn;
    if(!inFn) return;
    inFn.value = lastSketch.brushFn.name;
    inFn.onchange=(ev)=> lastSketch.brushFn=brushes[ev.target.value]
    
    const inSizeRn = window.brushSize;
    const inSizeNu = window.brushSizeNumber;
    inSizeRn.min= inSizeNu.min=0;
    inSizeRn.max= inSizeNu.max= 0.4;
    inSizeRn.value = inSizeNu.value = lastSketch.brushSize;
    inSizeNu.oninput =(ev)=> lastSketch.brushSize = inSizeRn.value  = ev.target.valueAsNumber;
    inSizeRn.oninput =(ev)=> lastSketch.brushSize = inSizeNu.value  = ev.target.valueAsNumber;

    const logCountours = window.logCounturs;
    logCountours.checked = lastSketch.logCountours;
    logCountours.onchange = (ev)=> lastSketch.logCountours=ev.target.checked;
    
    const inBoxify = window.boxify;
    inBoxify.checked = lastSketch.lessBoxify;
    inBoxify.onchange = (ev)=> lastSketch.lessBoxify=ev.target.checked;
}
document.body.onkeydown= (ev=KeyboardEvent.prototype)=>{
    const el =   ev?.target?.closest?.("pre[name],[sketch]");
    if(!el|| initialSel) return;
    if(ev.altKey && ev.key=="i"){
        const url = prompt(`Enter a Url for a reference image\n(use query parameters for advanced CSS placement:  <URL>?css=width:200px;top:40px )`,"");
        const style=url.match(/css=([^&]+)/)?.[0];
        const img = $New("img",{class:"reference",style,src:url, tabindex:0},0,el);
        if(location.protocol!=="file") img.setAttribute("crossOrigin","Anonymous");
        if(style){
            const label=$New("label",{},["Ref:"],el);
            const input = $New("input",{class:"reference",style},0,label);
            input.onchange= (ev)=>  img.style= ev.target.value;
        }
        ev.preventDefault();
    }
    if(ev.altKey&&ev.key=="p"){
        const url = prompt(`Enter a Url to draw onto the canvas:`,"");
        if(url){
            let [_,x,y,W,H] =  style=url.match(/(x=\d+)|(y=\d+)|(W=\d+)|(H=\d+)/g)??[];
            drawImgToCanvas(url,el.querySelector("canvas"),{x,y,W,H});
        }
        ev.preventDefault();
    }
    if(ev.altKey&&ev.key=="Backspace"){
        clearSketch(el);
    }
    if(ev.altKey&&ev.key=="r" && lastBlurPre){
        let registerName = prompt(`Register last sketches as stroke template. Enter the register name:`,"");
        const svg = lastBlurPre.querySelector("svg");
        classifySVGPaths(svg,{log:1,storeLogMasks:registerName,book:spellBook,match:".sketch.brush",rotate:1});

        if(confirm(`Look at console if combined grid is sensible?\nStill register "${registerName}"`)){
            registerLastSketch(registerName,spellBook);
        }
    }
}


// get path data from user input
const sketchMouse = (ev=MouseEvent.prototype)=>{
    const el =   ev?.target?.closest?.("pre[name],[sketch]");
    if(!el|| initialSel) return;
    
    if(ev.type.startsWith("touch")) ev= touchEvToMouse(ev,el);

    const isDraw = ev.buttons || +ev.shiftKey;
    if(isDraw){
        initialSel ??= !getSelection().isCollapsed  || 10>Math.hypot( ev.offsetX-lastMouseDown?.[0], ev.offsetY-lastMouseDown?.[1]);
        if(initialSel) return;
        else el.dataset.isSketching=true;
       
        openSvg ??= el.querySelector("&>svg");
        openCanvas ??= el.querySelector("&>canvas")??false;
        
        let connect=false;
        if( !openPath.length && (lastSketch.allowConnect  && lastSketch.el==el)){
            const posSvgSpace = toOtherSpace( ev.offsetX,ev.offsetY,el.clientWidth,el.clientHeight,);
            const eps=lastSketch.eps*2;
            connect = ( lastSketch.raw.findLast( p=>eps>Math.hypot(p[0]-posSvgSpace[0],p[1]-posSvgSpace[1]) ))
            if(connect){
                openPath = lastSketch.raw;
                debugPath ??=[...openSvg.querySelectorAll("path.sketch")]?.at?.(-1)
                if(debugPath)debugPath.dataset.isSketching=true;
            }
        }
        if(openSvg) debugPath ??= $SVG("path",{class:"sketch",},0,openSvg);
       
        if( ev.movementX || ev.movementY ){
            let [x,y]=  connect?.length?  connect  : [ev.offsetX,ev.offsetY];
            let newPnt=toOtherSpace( ev.offsetX,ev.offsetY,el.clientWidth,el.clientHeight,);
            openPath.push(newPnt);
        
            if(connect  ){
                debugPath.dataset.connect=true;
                const  lastRam = lastSketch.ramen.at(-1);
                if(( Math.abs( connect[0]-lastRam[0]) >10   && Math.abs( connect[1]-lastRam[1]) >10    )) {
                    newPnt.cmd="M";
                }
            }
            if(debugPath) debugPath.setAttribute("d",pntsToPathD(openPath));
            
            if(openCanvas){
                // use double click or rightclick
                const erase = ev.altKey || ev.detail>1;
                const clearCanvas = erase && ev.detail>1;
                brushToCanvas( openCanvas, openPath.at(-2), newPnt, clearCanvas, erase   );
            } 
            ev.preventDefault?.();
        } 
    } else if(isDraw==0 && openPath.length){

        let ramenCountours= lastSketch.ramenCountours =[];// 2d shape
        if(openCanvas){
            //   brushWholePath(lastSketch.ramen);
            openSvg.querySelectorAll("path.brush").forEach(oldP=>oldP.remove());
            let canvasContours = extractAllContours(openCanvas);
            // snap desinged for a single form so make snap size automatically smaller for multiforms
            let multiglyphSnap = (lastSketch.brushSnap??0)/(2*canvasContours.length);
            for(let contur of canvasContours){
                const eps = lastSketch.brushFixEps ?? findEps(contur,lastSketch.brushEpsPercent);
                if(contur.length>5000) contur= contur.filter((c,i)=>i%8==0);
                let lessBoxy = lastSketch.lessBoxify ^ ev.ctrlKey;
                let ramen = ramerDouglasPeuPathFilter(contur,(lessBoxy?0.5:1)* eps);
                let angular = angularVarianceFilter(ramen, ramen.length>30? multiglyphSnap : lastSketch.brushSnap);
                let path = $SVG("path",{class:"sketch brush", d: pntsToPathD(angular,  lastSketch.brushUseCurve) });
                openSvg.append(path);
                ramenCountours.push(angular);
                path._countour = angular;
            }
            if(lastSketch.svgClassify){
                if(lastSketch.logCountours) console.clear()
                classifySVGPaths(openSvg,{log:lastSketch.logCountours,match:".sketch.brush",rotate:1});
            } 
        } 
        const detected = simplifyLastSketch(openPath);
        lastSketch.insertedChar=false;
        if(lastSketch.insertFound && detected){
            const char = detected.name.replace(/:.+$/,"");
            document.execCommand( char=="\b"? "delete": "insertHTML",false,char);
            lastSketch.insertedChar=true;
            debugPath.dataset.char=char;
        }
        else if(lastSketch.intoText) {
            if(lastSketch.intoText!==2) ramenCountours=[lastSketch.ramen];
             
            sketchIntoText(el,ramenCountours)
        }
        delete el.dataset.isSketching;
         lastSketch.el=el;
        // console.log("sketch end x y", ...openPath.at(-1) );
        // console.log( "raw len",lastSketch.raw.length,"\nramen", lastSketch.ramen,);
        if(debugPath){
            const curveCnt = lastSketch.ramen.reduce((cnt,r)=>cnt+(r.type=="CURVE"?1:0),0);
            const debugPnts = (lastSketch.noCurves?? curveCnt< 0.5*lastSketch.ramen.length)? 
                lastSketch.ramen.filter(r=>r.type=="CORNER"):lastSketch.ramen;
            debugPath.setAttribute("d",pntsToPathD(debugPnts));
            delete debugPath.dataset.isSketching;
        } 
      
        openPath.length=0;
        const allP = openSvg.querySelectorAll("path.sketch");
        if(allP.length>maxDebugPaths) allP[0]?.remove?.();

        openSvg= null; debugPath = null; openCanvas= null; prevTouch=null;
        ev.preventDefault?.();
    }
}
document.body.onmousemove = sketchMouse;
const sketchUp = (ev)=>{
    if(ev.target.dataset.isSketching) delete ev.target.dataset.isSketching;
    if(initialSel==false){ 
        ev.preventDefault(); getSelection?.()?.collapseToEnd?.(); 
        initialSel=null; 
        return
    }
    lastMouseDown= [ev.offsetX,ev.offsetY];
    initialSel=null;
}
document.body.onmouseup = sketchUp;

document.body.addEventListener("touchmove",(ev)=>{
    if(ev.touches.length>1) return 
    sketchMouse(ev);
}  ,{passive:false})
document.body.ontouchend = sketchMouse;


function touchEvToMouse(ev,el){
    const bR = el.getBoundingClientRect();
    const touch = ev.touches[0] ?? prevTouch ?? {clientX:0,clientY:0};
    const mEv= Object.assign(ev, {
        offsetX: touch.clientX-bR.x,offsetY: touch.clientY-bR.y,
        buttons:ev.type=="touchmove"?1:0, // if the left mouse is pressed
        movementX: touch.pageX-(prevTouch?.pageX??0),movementY: touch.pageY-(prevTouch?.pageY??0),
    })
    prevTouch = touch;
    return mEv;
}

function toOtherSpace(x,y,gw,gh,outW=1000,outH=1000 ,padding=16){
    return [  (x-padding)/(gw-2*padding)*outW, (y-padding)/(gh-2*padding)*outH];
}

function findEps(pnts,epsPercent=lastSketch.epsPercent){
    const bbox = arrBbox(pnts);
    const maxWH = Math.max( bbox.W,bbox.H);
    const minFac = 0.3;
    return  (1-minFac)* maxWH * (maxWH<200?2:1) * epsPercent + 1000* minFac *epsPercent; 
}

function simplifyLastSketch(path=lastSketch.raw){
    lastSketch.raw = [...path];
    lastSketch.eps = findEps(lastSketch.raw) 
    
    lastSketch.ramen = ramerDouglasPeuPathFilter( lastSketch.raw , lastSketch.eps);
    if(lastSketch.snap) lastSketch.ramen = angularVarianceFilter( lastSketch.ramen ,(lastSketch.snap||1)* lastSketch.epsPercent);


    
    const grid= lastSketch.grid = sketchGridId(lastSketch.ramen);
    
    let AR = grid.bbox.AR;
    lastSketch.match= lookUpSketch(lastSketch.grid.num,AR );
    // console.log("All even nonmatched by closest similaity",lookUpClosests(lastSketch.grid.num,AR))
    gridNumToAscii(lastSketch.grid.num,lastSketch.logStroke,grid.bbox);
    // console.log("Match",lastSketch.match?.[0]?.name??"",lastSketch.match);
    
    loglastMasks(lastSketch.logMasks,debugPath?.dataset?.connect)

    return lastSketch.match[0];
}
function pntsToPathD(pnts,useCurves=true){
    return pnts.map( (p,i,pnts)=> (i>0&&useCurves? pntsCurveToBecir(p,i,pnts):null) ??(p.cmd?? (i==0?"M":"L"))+ p[0].toFixed(0)+" "+p[1].toFixed(0)).join("");
}
function pntsCurveToBecir(p,i,pnts){
    if( p.type!=="CURVE") return;
    const p0 = pnts[i-1]??p;
    const p1 = p;
    const p2 = pnts[i+1]??p;
    const p3 = pnts[i+2]??p;
    let b1x = p1[0] + (p2[0] - p0[0]) / 6;
    let b1y = p1[1] + (p2[1] - p0[1]) / 6;
    let b2x = p2[0] - (p3[0] - p1[0]) / 6;
    let b2y = p2[1] - (p3[1] - p1[1]) / 6;
    let b3x = p2[0];
    let b3y = p2[1];
    return ` C ${b1x.toFixed(0)},${b1y.toFixed(0)} ${b2x.toFixed(0)},${b2y.toFixed(0)} ${b3x.toFixed(0)},${b3y.toFixed(0)}`;
}

function sketchIntoText(el,countours){
    if(!window.gridStats) return;
    let [lines, gridW, gridH] =  gridStats(el.innerText);

    let pointMap = {__proto__:null};
    let letters = ["1"];
    for(const countour of countours){
        const mapped = countour.map( p=> toOtherSpace(p[0],p[1],1000,1000,gridW,gridH,0)  );
        let placesCtrl=100;
        for(const pnt of mapped){
            const intX = pnt[0]|0;
            const intY = pnt[1]|0;
            const frX = Math.floor((pnt[0]-intX)*placesCtrl)/placesCtrl;
            const frY = Math.floor((pnt[1]-intY)*placesCtrl)/placesCtrl;
            
            const key =  intX+","+intY;
            const arr = pointMap[key]??=[];
            arr.push();
        }
    }
    // document.execCommand("innertText",false,linesCp.join("\n"));
}

// for subMasks
const bin5x5 = 0b11111_11111_11111_11111_11111;

function loglastMasks(log=1,isConnect=false,setMasks){
    if(isConnect){
        lastSketch.lastMasks[lastSketch.lastMasks.length-1]=lastSketch.grid.num;
    } else lastSketch.lastMasks.push(lastSketch.grid.num);
    
    if(lastSketch.lastMasks.length>20) lastSketch.lastMasks.splice(0,1);
    
    if(setMasks) lastSketch.lastMasks=setMasks;
    
    lastSketch.lastMaskAnd = lastSketch.lastMasks.reduce( (a,n)=>a&n ,-1);
    lastSketch.lastMaskFree = lastSketch.lastMasks.reduce( (a,n)=>a& ((~n)&bin5x5) ,bin5x5);
    
    if(log){
        console.log("**lastMasksAnd",lastSketch.lastMaskAnd," total len",lastSketch.lastMasks.length,)
        gridNumToAscii(lastSketch.lastMaskAnd,1);
        
        console.log("**lastMasksFree",lastSketch.lastMaskFree,)
        gridNumToAscii(lastSketch.lastMaskFree,1);
        console.log("****",)
    }
}
function registerLastSketch(name,dict=sketchBook){
    if(dict[name]) {
        return console.error(`${name} exists already in sketchbook use a number if this is a variant d => d2`);
    }
    if(lastSketch.lastMasks.length==0) {return console.error(`No last Combined Sketches`)}
    let char = name.match(/\d+$/);
    console.log('registerd',name,'in this session', dict[name]={grid: lastSketch.lastMaskAnd, subMask: lastSketch.lastMaskFree},
            '\nIf you dont copy save the current sketchbook the sketch is lost')
    lastSketch.lastMasks.length==0;
    if(char) dict[name].char=name.slice(0,- char.length);  
}
const step7SkyRotors = 7 .L.map( (n,_a)=> ({angle: _a=((n+1)/8)*TAU,angleDeg:_a/TAU*360, rotor: rotor2(_a)}) );
const step16SkyRotors = 15 .L.map( (n,_a)=> ({angle: _a=((n+1)/16)*TAU,angleDeg:_a/TAU*360, rotor: rotor2(_a)}) );

/* clasifies the svg path elm or all matching queried children  */
function classifySVGPaths(elm,{match="", log=1,book=spellBook, storeLogMasks="", rotate=0,skyDirs=step16SkyRotors}={}){
    let gridNums = [] ;
    let paths = elm.localName=="path"?[elm]:elm.querySelectorAll("path");
    let founPaths = [];
    for(let p of paths){
        let d = p.getAttribute("d")??"";
        if( (match&&!p.matches(match))||d=="") continue;
        
        let pnts = (p._countour?.map?.(p=>[p.x??p[0],p.y??p[1]])) ?? svgLinePathStrToAbsPntArr(d,1);
        const pba = principalAngle(pnts);

        let grid = sketchGridId(d,{parsePath0:pnts});
        p._bbox = grid.bbox;
        let num= grid.num; 
        let feat = lookUpSketch(num,grid.bbox,book); 
        const Mpnt = massPnt(pnts);
        p._mPnt=Mpnt;
        if(rotate){
            let dev=[];
    

            for(const dir of skyDirs){
                let rotPnts = pnts.map( p=>rotate2( [p[0]  - Mpnt[0],p[1]  - Mpnt[1],],dir.rotor) );
                if(rotate>1){// for debuggin use 2 and you see the emited points
                    let pCl = p.cloneNode();
                    pCl.className="";
                    dev.forEach(pCl=> pCl.style.stroke="grey" )
                    pCl.style.stroke="orange";
                    dev.push(pCl );
                    p.after(pCl);
                    pCl.setAttribute("d", pntsToPathD( rotPnts.map( p=> [p[0]  + Mpnt[0],p[1]  + Mpnt[1],] )))
                }
                let rotGrid = sketchGridId(d,{parsePath0:rotPnts});
                // gridNumToAscii(rotGrid.num,log?p:false,rotGrid.bbox)
                feat.push( ...lookUpSketch( rotGrid.num,rotGrid.bbox,book).map(s=>({...s,angle:dir.angle,angleDeg:dir.angleDeg,bW:rotGrid.bbox.W,bH:rotGrid.bbox.H}))); 
            }
            dev.map(d=>d.remove());
            feat.sort( (a,b)=>b.score-a.score);
        }

        if( log&&feat.length){
            founPaths.push(p);
            console.log("Match Countur "+feat[0].name,feat,p);
            p.dataset.form=  feat[0].name+" "+feat[0].score+"score";
        } else delete p.dataset.form;
         
        if(storeLogMasks)gridNums.push(num);
        
        p.dataset.pbangle=pba;
        p.dataset.pbangleDeg=pba/TAU*360;
        
        p.innerHTML="<title>ASCII:\n"+gridNumToAscii(num,log?p:false,grid.bbox)+"\n"+ feat.map(x=>JSON.stringify(x)) +"</title>";
    }
    if(gridNums.length) {
        loglastMasks(1,0,gridNums);
    }
    buildContourHierarchy(founPaths); 
}
function clearSketch(elm){
    elm.querySelectorAll("path").forEach(p=>p.remove());
    elm.querySelector("canvas").getContext("2d").clearRect(0,0,10_000,10_000)
}
function buildContourHierarchy(paths, eps=0.0001){
    for(let i=0;i<paths.length;i++){
        const p = paths[i];
        p._children = [];
        p._parent = null;
        p._depth = 0;
        p._idx = i;
        p._area = (p._bbox.W * p._bbox.H)
    }
    let maxArea=0;
    for(let i=0;i<paths.length;i++){ // smallest containing bbox wins
        const a = paths[i];
        let bestParent = null;
        let bestArea = Infinity;
        const ab = a._bbox;

        for(let j=0;j<paths.length;j++){
            if(i===j) continue;
            const b = paths[j];
            const bb = b._bbox;
            // does B contain A ?
            if( ab.minX >= bb.minX - eps && ab.maxX <= bb.maxX + eps && 
                ab.minY >= bb.minY - eps && ab.maxY <= bb.maxY + eps 
            ){
                const area = b._area;// use unrotate bounding box
                // choose smallest containing box
                if(area < bestArea){
                    if(maxArea<area) maxArea=area;
                    bestArea = area;
                    bestParent = b;
                }
            }
        }
        if(bestParent){
            a._parent = bestParent;
            bestParent._children.push(a);
        }
    }
    // compute nesting depth
    for(const p of paths){
        let d = 0;
        let q = p._parent;
        while(q){
            d++;
            q = q._parent;
        }
        p._depth = d;
        p.dataset.depth= d % 5;
        if(p._children.length==1){
            let childAr = p._children[0]._area;
            if( Math.abs(p._area-childAr)/p._area < 0.25  ) {
                p._children[0].dataset.innerCountour="";
                p._children[0]._isInnerCountour=true;
            }
        } 
    }
    
    return paths;
}

// you shoud center these eventually
const signsToPaths= {
    "Box":{d:`M 0 0 L 100 0 L 100 100 L 0 100 L0 0`},
    "Column":{ d:"M105 60L105 60L105 134L141 134L141 147L62 147L62 134L98 134L98 66L105 60", },
    "Dispersion":{d:`M304 60L304 60L304 134L340 134L340 147L261 147L261 134L297 134L297 66L304 60
         M266 152L291 169L315 169L338 152L346 159L328 175L297 181L269 169L266 159L266 152`},
    "Levitate":{d:`M504 58L531 90L531 96L523 96L510 83L510 126L531 126L531 139L479 139L479 126L500 126L499 83L485 96L479 90L504 58`},
    "Crush":{d:`M869 81L899 112L929 81L959 112L959 125L944 106L930 94L899 125L869 96L846 127L835 125L837 119L869 81`},
    "Envelop":{d:`M901 429L939 472L932 472L901 450L901 570L901 570L863 532L863 525L894 554L894 435L901 429`},
    "Limit":{d:`M500 422L519 428L530 445L517 489L555 473L570 479L582 489L576 519L560 533L517 510L531 555L525 570L505 582L489 579L478 554L500 515L449 531L434 525L423 506L426 489L440 478L460 477L500 489L473 449L479 434L500 422
M509 434L496 434L483 446L489 466L503 487L520 455L509 434
M558 485L540 488L514 503L538 516L558 521L570 505L570 499L558 485
M453 487L431 495L444 518L462 518L490 499L474 492L453 487
M503 515L485 548L485 558L495 570L508 570L521 558L516 538L503 515`},
    "TriU": {d:`M460 271L546 271L551 271L506 357L496 357L460 279L460 271`},
    "Diamond":{d:`M701 240L743 301L701 366L659 301L701 240`},
    "Region":{d:`M303 263L352 324L352 324L303 279L263 324L254 324L303 263`},
    "RegionWing":{d:`M303 263L352 324L352 324L303 279L263 324L254 324L303 263`},
    "Collection":{d:`M67 453L147 453L111 503L147 542L147 552L103 513L67 552L67 542L96 503L67 464L67 453`},
    "Rain":{d:`M899 606L906 612L907 650L912 626L920 630L921 649L968 632L952 680L971 681L975 689L950 694L995 699L991 707L950 708L975 713L972 721L951 723L969 768L922 753L920 773L912 776L907 752L902 796L894 791L893 752L888 776L880 773L879 753L833 771L848 722L828 721L825 713L850 708L805 703L810 695L850 694L825 689L829 681L849 679L835 633L879 649L880 628L888 626L894 649L898 606
        M947 651L910 661L852 651L861 685L852 751L890 741L947 751L939 717L947 651`},
    "Weave":{d:`M495 613L545 624L579 658L590 709L568 760L587 787L553 760L578 719L570 663L545 636L509 624L464 633L434 663L426 719L451 760L417 787L436 760L414 709L422 664L454 627L495 613`},
    "Eye":{d:`M699 401L630 409L608 433L606 481L624 540L667 564L712 566L749 555L790 535L811 506L811 479L793 479L757 434L699 401
M689 465L738 473L761 495L767 516L746 533L716 542L656 533L633 516L655 479L689 465
M709 476L669 483L647 512L678 530L724 530L755 512L740 488L709 476
M697 487L708 488L716 497L716 507L709 516L697 516L685 508L686 494L697 487`},


};


function selectWithAllChildren(path){
    return [path,...path._children?.flatMap?.(c=>selectWithAllChildren(c))];
}

let saveImg = null;
function brushToCanvas(openCanvas, pnt0, pntN,restore=0,erase=0){
    if(openPath.length<2) return;
    /** @type {CanvasRenderingContext2D} */
    const ctx = openCanvas.getContext("2d"); 
    if(restore){
        ctx.canvas.width = 1000;
        ctx.canvas.height = 1000;
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    }
    if(pnt0.cmd=="M") return;
    let [x0,y0] = toOtherSpace(pnt0[0],pnt0[1],1000,1000, ctx.canvas.width,ctx.canvas.height); 
    let [x1,y1]= toOtherSpace(pntN[0],pntN[1],1000,1000, ctx.canvas.width,ctx.canvas.height);
    // padding of canvas
    // x0+=16; y0+=16;
    // x1+=16; y1+=16;

    ctx.fillStyle= erase?"#fff":lastSketch.brushColor;

    const brushSize = ctx.canvas.width * lastSketch.brushSize;
    const steps = lastSketch.brushLenMul *  Math.min(30_000, Math.max(1,Math.hypot( x1-x0, y1-y0 )));
    const xStep= (x1-x0)/steps;
    const yStep= (y1-y0)/steps;
    ctx.beginPath();
    for(let i=0;i<steps;i++){
        x= x0+ i*xStep;
        y= y0+ i*yStep;
        lastSketch.brushFn( ctx, x,y,brushSize,)
    }
    ctx.fill();
    ctx.closePath();
}
function brushWholePath(openPath){
    for(let i=1;i<openPath.length;i++){
        brushToCanvas(openCanvas, openPath[i-1],openPath[i],i==1?1:0);
    }
}
function urlContentToDataUri(url){
    return  fetch(url).then( response => response.blob() ).then( blob => new Promise( callback =>{
        let reader = new FileReader() ;
        reader.onload = function(){ callback(this.result) } ;
        reader.readAsDataURL(blob) ;
    }) ) ;
}
async function drawImgToCanvas(imgURL,canvas=openCanvas,{x=5,y=5,W=undefined,H=undefined}={},img,){
    let imgI = !img?.src?  $New("img",{src:await urlContentToDataUri(imgURL)}):img;
    imgI.onload= ()=>{
        let ctx = canvas.getContext("2d");
        let size = canvas.width-5;//padding
        ctx.drawImage(imgI,x,y,W??size,H?? ((size/imgI.width)*imgI.height))
        imgI.hidden=1;
    }
    return imgI;
}


// any svg path to data util
function svgLinePathStrToAbsPntArr(svgPathD="",useArrs=false/* loses command info */){
    let xyAltCntr = 0;  let isVv = 0; let openCmd=null; let isRel=false;
    let data = [];
    const makeLastAbs = ()=>{
        const prev2 = data.at(-2);
        if(isRel&&prev2){// make last abs
            if('x' in openCmd) openCmd.x0 = openCmd.x; 
            if('y' in openCmd) openCmd.y0 = openCmd.y; 
            openCmd.x = prev2.x+(openCmd.x||0);
            openCmd.y = prev2.y+(openCmd.y||0);
        }
    }
    svgPathD.replace(/([+-]?\d+(?:\.\d+)?)|(z|Z|[^\d\s+-]+)/g, (_m, num, cmd,) => {
        if(num){
            openCmd[!isVv && xyAltCntr++ % 2 == 0 ?'x':'y'] =  +num||0; 
        } else {
            xyAltCntr=0;
            isVv="vV".includes(cmd);// vertical start with y not x 
            if(isRel) makeLastAbs();
            isRel= cmd.toLowerCase()==cmd;
            data.push( openCmd = { cmd,x:0,y:0 });
        } 
        return "";
    });
    if(isRel) makeLastAbs();
    return useArrs? data.map(p=>[p.x,p.y]): data;
}