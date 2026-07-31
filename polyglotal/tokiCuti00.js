// simple version w/o braces
// may be enough for syntax highlighting  (.map and wrap with code> u>b>i>q combos  Ex <b>const<b> ...)
// easily extensible and keep char index in the input string

// extend as you like token-grps follow a name schema 
const rules1 = { // order important, obj assign order should be kept by JS at runtime
    comment:/\/{2}[^\n]*?(\r?\n|$)|\/\*.*?\*\/|<!--.*?-->/gm,
    RE:/\/((?:[^\v\n])+)\//gm,// RE may not work perfectly, but for highlighting its enough and removing them prevents propagating str problems for JS
    str:/"((?:[^"]|\\.)*)"|'((?:[^']|\\.)*)'|`((?:[^`]|\\.)*)`/gm,
    num: /\b(0[xb])?\d+(?:\.\d*)?\b/g,
    keyword:/\b(?:const|class|let|var|function|for|while|if|else|async)\b/g,
    vari:/\b(?:(?:\.)?([$_\p{L}][\w]*)[^\S\v]*)+([=:]|:=)\b/gui,// for simplicity also matches  obj.key
    op: /=>|>>>|([!#%-/:-@\\^[\]{}])\1?=?/g,
    wordlist: /[^\S\v]*\S+(?:[^\S\v]\S+)*[^\S\v]*/gm, // tries to keep writen text (max 1" ") in 1 token; more semantic tokens
    WS:/[^\S\v]+/g, // to 100% rebuild raw in-str
}
/**   small token cuter keeps str char index */
function tokiCuti(str,rules=rules1,ln0=1){
    let toks = [{rule:"",idx:0,ln:0,raw:"",capt:[""]}];toks.pop();//not needed, but ret type hint
    
    for(const rule in rules){
        str=str.replaceAll(rules[rule],(raw,...m)=>{  
            toks.push({rule, idx:m.at(-2),ln:0,raw,capt:m.slice(0,-2)});
            return "\v".repeat(raw.length);
        }); 
    }
    console.assert(/^\v*$/.test(str),"!! Uneaten tokens !!",str); // not needed but nice warning
    toks.sort((a,b)=>a.idx-b.idx);
    for(const tok of toks) tok.ln=ln0,tok.raw.replaceAll(/\n/g,()=>(ln0++,0)) 
    return toks;
}
// ***** only for nodeCLI
if(!globalThis.CSS) nodeCLI();

async function nodeCLI() {
    const fs = await import("node:fs");
    const fileN = process.argv.at(-1);
    const file = fs.readFileSync(fileN,"utf-8");
    let ast =  tokiCuti(file); 
    
    const param = flag=> process.argv.find( (a,i,argv)=>argv[i-1]==flag )

    if(param("-vari"))  ast=ast.filter(t=>t.rule=="vari")
    if(param("-str"))  ast=ast.filter(t=>t.rule=="str")
    if(param("-RE"))  ast=ast.filter(t=>t.rule=="RE")
    if(param("-fnNames"))  ast=ast.filter(a=>a.rule!=="WS").filter( (t,i,ast)=>t.rule=="wordlist"&&ast[i+1]?.raw=="(")

    if(param("-raw")) ast=ast.map(t=>  [t.raw,t.idx,t.ln]);

    console.log( "["+ast.map(t=> JSON.stringify(t,null,"")).join(",\n")+"]");

    // node tokiCuti00.js -str -raw  tokiCuti00.js   > tokiCuti00.ast.js
    // tail -c +2051  tokiCuti00.js | head -n 3
}