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

var fontW = 1000;
var fontH = 1000;

//*** Load other svg font input logic
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