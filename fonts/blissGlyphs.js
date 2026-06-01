let blissChars=`[]|_-"()/\\=:,'+*!<>^voOV`

// cell is 8x*16y  1/2 like a proper monospace font
let cW=8; let cH = 16;
let blissPathMap = {
    '|':{ d:"m4 0 v16 m4-16" },
    '_':{ d:"m0 16 h8 m0-16"},
    '-':{ d:"m0 8 h8 m0-8"},
    '"':{ d:"h8"},
    
    '.':{d:"m8 0"},// use point in words as space
    ' ':{d:"m8 0"},
    ':':{d:"m4 8v0m4-8"},// use as middle point egg for orientation left ":|" right "|:"

    '[':{d:"v16 v-16 h8"}, // currently top corners
    ']':{d:"h8 v16 v-16"},
    'L':{d:"v16m0 0h8m0-16"},
    'J':{d:"m0 16h8v-16"},
    'T':{d:"m4 16v-16h-4 h8"},
    '+':{d:"m0 8 h8h-4v8v-16m4 0"},

    '=':{d:"m0 4 h 8 m -8 8 h8 m0-12"},

    0:{ d:"m4 0 a4 8  0 1 1  0 16 a4 8  0 1 1  0-16 m4 0" },
    O:{ d:"m4 0 a8 8  0 1 1  0 16 a8 8  0 1 1  0-16 m4 0" },
    o:{ d:"m4 4 a4 4  0 1 1  0 8  a4 4  0 1 1  0-8 m4 -4" },
    // upper and lower circle
    P:{ d:"m4 0 a4 4  0 1 1  0 8  a4 4  0 1 1  0-8 m4  0" },
    b:{ d:"m4 8 a4 4  0 1 1  0 8  a4 4  0 1 1  0-8 m4 -8" },

    U:{ d:"v12 a4 4  0 0 0  8 0 v-12"},
    u:{ d:"m0 8 v4  a4 4  0 0 0  8 0 v-4 m0-8"},

    // upsside down big U,  
    ß:{ d:"m0 16 v-4  a4 4  0 0 1  8 0 v4 m0-16"},
    n:{ d:"m0 16 v-4  a4 4  0 0 1  8 0 v4 m0-16"},

    '/':{d:"m0 16 l8 -16"},
    '\\':{d:"l8 16 m0 -16"},
    
    '<':{d:"m8 12 l-8 -4 l8-4 m0-4"},
    '>':{d:"m0 4 l8 4 l-8 4 m8-12"},
    'v':{d:"m0 8 l4 8 l4 -8 m0-8"},
    '^':{d:"m0 8 l4 -8 l4 8 m0-8"},
    
    'A':{d:"m0 16 l4 -16 l4 16 m0-16"},
    'V':{d:"l4 16 l4 -16"},

    // curved corners  
    'l':{d: "v8 a8 8  0 0 0  8 8 m0-16"},
    'j':{d: "m0 16 a8 8  0 0 0  8 -8 v-8"},
    'f':{d:"m0 16 v-8 a8 8 0 0 1 8 -8"},
    'i':{d:"a8 8 0 0 1 8 8 v8 m0-16"},
     
    // make them into combined top open shape that can be filled
    // or use the l__j fro a bowl
    "UU":{d:"v8 a8 8  0 0 0  8 8 a8 8  0 0 0  8 -8 v-8", shape:1},
    "uu":{d:"m0 8 v2 a6 6  0 0 0  6 6 h4  a6 6  0 0 0  6 -6 v-2 m0-8", shape:1},
}

function buildBliss(word="",{padStroke=2,strokeCap="round",fill="none"}={}){
    let d ="";
    let lnI=0;
    let lines=[ {len:0,d:""} ];
    let line = lines.at(-1);
    for(let i=0,ch;ch=word[i];i++  ){
        if(i==0 && ch=="\n") continue;
        
        let biWord = word.slice(i,i+2);
        if(biWord in blissPathMap){ i++; ch=biWord;  }

        if(ch==";"||ch=="\n"){ 
            lines.push( {len:0,d:"",} ); lnI=0; line = lines.at(-1) 
            continue;
        }
        // draw over the line
        if(ch=="§"){
            if(line.len){
                line.sectionLen = line.len; // for now use first len for all section
                line.d+=`m${- (line.sectionLen)*cW } 0`;
            } 
            continue;
        }
        line.d  += blissPathMap[ch]?.d?? blissPathMap['.'].d;
        if(line.sectionLen) continue;
        line.len+=ch.length;
    }
    let maxLnI = Math.max.apply(null, lines.map(l=>l.len));

    return `<svg viewBox="${-padStroke} ${-padStroke} ${cW*maxLnI+2*padStroke} ${cH *lines.length+2*padStroke
    }"><path fill="${fill}" stroke="currentColor" stroke-linecap="${strokeCap}" d="${
        lines.reduce( (d,l,i=0)=>d+(   ("M0 "+i*cH) + (maxLnI- l.len? 'm'+ ((maxLnI- l.len)/2*cW) +" 0" :'') 
          + l.d
    ),"")
    }"/></svg>`;
}

const R = String.raw;
let bsps= [
R`["""]   f"""i   [""\§ ono
L___J   l___j   l__J§  `,    
    
R`..../....
.../ \...
--/   \__
__\   /..
...\ /...
..../....`,

`[""""];|.o.o.|;L....J`,//box+eyes

R`<-->
vv_AA
|| ||
VV...

\> </> `,

`["""o]
L__0o0
oooo .`, // roboter
`v==^ A==V f__j  [==]

bPbP  bPbP  bPbP
L---J
o
0O0
oo§++
f""""i`
];



const sane = (x)=>x.replaceAll("&","&amp;").replaceAll("<","&lt;");

function previewBliss(str=`"""o]
L 0_0;oooo.`,   includeSVGCode=true){
    if(!window.blissPreviewBox){
        document.body.append($New("div",{id:"blissPreviewBox",style:"width:min(400px,95vw);padding: 1rem;white-space: pre-wrap;font-family: monospace , system-ui",contentEditable:true}))
        let dirty = false;
        blissPreviewBox.onkeydown = (ev)=>{ dirty=true; if(ev.key=="Enter"){ ev.preventDefault();document.execCommand("insertHTML",0,"\n") }  }
        blissPreviewBox.onblur = ()=>dirty?(dirty=false,previewBliss( ( window.blissInText??window.blissPreviewBox).innerText.trimEnd())):0;
    } 
    const svgStr = buildBliss( str );

    // keeps Ctrl+Z undo
    const el = window.blissPreviewBox;
    getSelection().setBaseAndExtent(el,0,el,el.childElementCount);

    document.execCommand("insertHTML",false, `<code id="blissInText" contenteditabl="plaintext-only" >${sane(str)} </code><hr>${svgStr}${
        includeSVGCode? `<hr><output>${sane(svgStr)}</output>`:""}`
    )
}