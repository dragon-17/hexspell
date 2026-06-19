//   replace lines to make fractal from  <path d="M0 100 l 200 0"/>
//  just these 15LoC  
const fractalPass = (ori=[100,100], relLines=[ [200,0] ],n=10,sw=0.1,vb,pAttr,keepLnArr=true)=>{
    for(let i=n;i-->0;){ relLines= relLines.flatMap( (x)=> useFn(x,n-i)  )   }
    return {svg:toSvg(ori,relLines,vb,pAttr,(n<7||sw<0)?"":'stroke-width="'+Math.abs(sw)+'"'), relLines: keepLnArr&&relLines };
}
let nScale = 1.5;// try values from 0.1(tri) -- 0.3(map)  -- 1 (textile)
// base octave function gets a relativ svg line and returns more of them
const l2sawZacLine = ([x,y])=>{
    const xM = x/2 , yM=y/2;
    const xN = nScale * -y, yN = nScale * x;
    return [ [xM-xN,yM-yN], [ 2*xN,2*yN ],[xM-xN,yM-yN] ]
}
let useFn = l2sawZacLine;
const toSvg = (ori,relLines,viewBox="0 0 600 800 ",pAttr='fill="none" stroke="black"',wid="")=>`<svg width="600" viewBox="${viewBox}" ${wid}><path  ${pAttr} d="m${ori[0]} ${ori[1]} l${relLines.map(([x,y])=>[x.toFixed(2),y.toFixed(2)]).join("l")}" /></svg>`
// simplest use, but I have a diashow later in the file
// document.write( fractalPass(undefined,undefined,  7  ,0.1).svg  )  

// CORE end just shapes and some alt fns and diashow HTML
let shapes = { 
    line:[[200,0]], 
    square:[[200,0],[0,200],[-200,0],[0,-200]],
    tri:[ [200,0],[-100,173],[-100,-173] ],
    blob: [ [120,20],[80,60],[40,100],[-20,120], [-80,90],[-110,20],[-70,-70],[20,-100],[100,-60]],
    spiral: [ [80,0],[40,40],[0,60],[-40,40], [-60,0],[-40,-40],[0,-60], [50,-50],[90,10] ],
    ridge: [ [100,20],[70,-40],[90,70], [60,-60],[120,40]],
    //  9 1.414 l2sawZacLine ->  rock texture ;  water waves at viewBox 0 0 6000 3000  
    islands: [ [80,0],[20,30],[50,-10], [10,60],[-40,20],[-70,-30], [-30,-70],[50,-20]],
    flame: [ [80,0],[40,40],[0,60],[-40,40], [-60,0],[-40,-20],[0,-40], [50,-20],[40,10] ,[5,15],[10,-20],[-80,-40],[-5,-25]],
};
let waitTime = 200;
useShape = shapes.square // use other from here
let pause = false;
let rndSeed = (x,y=0,t=0)=>(1+( Math.sin(t+x*7989.3238+y*31459.26575)%1))/2;
document.body.onkeydown = (ev)=> pause = ev.key=="q"
let sleep = (ms)=>new Promise( r=>setTimeout(r,ms) )
const showFractal = async(n,shapNm)=>{
  nScale = n;
  for(let i=0;i<10;i++){
    if( pause && (pause=confirm("Really abort?"))) throw Error("halt"); 
    const myFrac = fractalPass(undefined,shapes[shapNm], i)
    document.body.innerHTML = `<h2>Fractal</h2> <p>fn = ${useFn.name} shape = ${shapNm} depth = ${i} nScale = ${n} <kbd>PRESS [Q] pause/quit</kbd></p>`+myFrac.svg;
    await sleep(waitTime);
 }
}
const speacialN = [0.288675,0.5,0.577,0.707,0.866,1.0,1.414]

// other function, but also determinittic (no RND num)
function moreChaos([x,y]){
    const xM = x/2 , yM=y/2;
    const xN = nScale * -y, yN = nScale * x;
   return [ [xM-xN,yM-yN],  [1.3*xN,0.7*yN], [xM+xN,yM+yN] ]
}
function dragonLine([x,y]){
    return [  [nScale*(x-y)/2, (y+x)/2], [(x+y)/2/nScale, (y-x)/2]];
}
function kochLine([x,y]){
    const a = [x/3, y/3];
    const cos = 0.5 * nScale;
    const sin = 0.8660254;
    const rx = ( a[0]*cos - a[1]*sin);
    const ry = (a[0]*sin + a[1]*cos);
    return [a,[rx-a[0], ry-a[1]],[a[0]-rx, a[1]-ry],a].map(p=>p.map(x=>1.5*x));
}
function levyLine([x,y]){
    return [ [nScale*(x-y)/2, (x+y)/2], [(x+y)/2/nScale, (y-x)/2]];
}
let flip = 1;
function dragonAlt([x,y]){
    flip *= -1;
    return [ [nScale*(x-flip*y)/2, (y+flip*x)/2], [(x+flip*y)/2/nScale, (y-flip*x)/2]];
}
function hexFractal([x,y]){
    const s = nScale;
    return [  [x*s,y*s], [-y*s,x*s], [x*s,y*s], [y*s,-x*s], [x*s,y*s],];
}
function noisy([x,y]){// clean continent, but no mountains/rivers
    const n = (Math.random()-0.5)*nScale;
    const xN = -y*n;
    const yN = x*n;
    return [ [x/2-xN, y/2-yN], [2*xN,2*yN], [x/2-xN, y/2-yN] ];
}
let SEED = 42;
function noisySeed([x,y]){
    const n = (rndSeed(x,y,SEED)-0.5)*nScale;
    const xN = -y*n;
    const yN = x*n;
    return [ [x/2-xN, y/2-yN], [2*xN,2*yN], [x/2-xN, y/2-yN] ];
}
const rules = [ l2sawZacLine, moreChaos, dragonAlt];
function rndRule(l){
    return rules[Math.random()*rules.length|0](l);   
}
const smartRule = ([x,y],depth)=>{// flowers
    const len = Math.hypot(x,y);
    const s =Math.random()*0.4 + 0.1 + 0.4*Math.sin(depth*0.7);
    return [  [x/2+s*-y, y/2+s*x], [x/2-s*-y, y/2-s*x]];
}
const ridgeNoise = ([x,y])=>{
    const len = Math.hypot(x,y);
    const n = (   Math.sin(len*0.03) + Math.random()*0.7 ) * 0.35;
    const xN = -y*n;
    const yN = x*n;
    return [ [x*0.45-xN, y*0.45-yN], [2*xN,2*yN], [x*0.55, y*0.55] ];
}
const erosion = ([x,y])=>{// for mountain ridges
    const n = Math.random()* nScale;
    return [ [x*0.3,y*0.3], [-y*n,x*n], [x*0.4,y*0.4], [y*n*0.5,-x*n*0.5],[x*0.3,y*0.3]];
}
// call animation loop for bunch of shapes/nScale params
useFn=moreChaos;
( async x=>{
for(let shapNm in shapes) 
for(let n=0.2;n<1.3;n+=0.1)
// for(let n of speacialN)
     await showFractal(n,shapNm);
})()

// simple continent or even world map img
function atlasFrac(nScaleP=0.6, useFnP=noisy, depth=8,shape=shapes.tri){
    nScale=nScaleP;useFn=useFnP;
    const myFrac = fractalPass([0,0],shape, depth,0.5,'-50 -50 300 300')
    document.body.innerHTML = `<h2> Continent/Atlas Fractal</h2>`+myFrac.svg;;1;
    // style colors
    const contNt= document.querySelector("path");
    contNt.setAttribute("stroke","#ccd")
    contNt.setAttribute("fill","#cda")//#b85
    const svg= document.querySelector("svg");
    svg.style.background = "#abd";
    svg.setAttribute("stroke-linejoin","round");
    return myFrac;
}
