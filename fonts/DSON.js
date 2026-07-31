


const DStypes={
    I:"Int",N:"Num",S:"Str",B:"Byte",Bl:"Bool",O:"Obj",L:"Len"
}
const OByte= {B:0};// a this.B byte long array buffer view
const OInt= {I:0, ...Number.prototype};// signed
const ONum= {N:0, ...Number.prototype};// signed
const OBool= {Bl:false, ...Number.prototype};
const OStr= {S:"", ...String.prototype}; // for simplicity assume JS 1char always 1Byte

// for(const Type of [OInt,ONum,OStr,OBool])
// for(k in Type) Object.defineProperty(Type,k,{value:Object.getPrototypeOf( Type.k) , configurable:1} )


let OPersonType = {};// start with Capital O, example of custom obj type name



// give via proto the methods even w/o use of sub prop    myIntVar.I.toFixed(2) SAME  myIntVar.toFixed(2) 
let myIntVar = {I:42, __proto__:OInt};




//=================
//  simple intelisense via   prototypes(ie. the REAL JS inheritance Model) + unused default params


/**  @template T   @param {T} typeEx @returns {T}  DragonScript JS types */
const DS = typeEx=>null;

const _MEV =DS(MouseEvent.prototype);
const _El = HTMLElement.prototype;
const _Obj = DS({ name:"", age:0});

const err = e=>console.error("missing param: ",e)

function onClick(ev=  _MEV??err("ev "+onClick.name),   pseudoJSTypeParam= _Obj?? {age:42} /*in VS COde you may have even here autocomplete*/ ){
    console.log(ev, pseudoJSTypeParam);
}
onClick("ok");
onClick();// throws










// I maybee try to add a little scripting language for complex data types thats types are validate against a implicit schema
// my Type System, more compact and readable than JSON or XML Schema
let Types = {
    O:{V:{},name:"Object",JS:Object}, // All other types are objects or primitves which have a 1-to-1 mapping to a Object via a capital Type key
    // also for user defiend object forms   OPerson_friend: {}  or {name:"",age:0,O:"#Person"}
    I:{V:0,name:"Integer",JS:Number},//     9265   ^=  {  I: 9265 }   -> pseudo JSON-Schema { type:"int"  }
    N:{V:0,name:"Number",JS:Number}, //      3.1415   ^=  {  N: 3.1415 }   ->  { type:"number"  }
    S:{V:"",name:"String",JS:String},//  "abc"  ^=  {S:"abc"} ->   {type:"string"}
    // cause type is given by S key implicit conversions are allowed  {S:65} -> NormDSON  {S:"A"}    {S:[1,2,3]} CTRL-CHARS "\x01\x02\x03"
    // also for other Types   {I:"12223323344.33"} to long for JS Num but pot Bigint custom impl.
    //   restrict implicit conversion via Asserts: 
    //          {I:"3238", "!I":{I:0} }   ASSERT KEY "I"   : TYPE INT
    //                fails, cause KEY I of this obj is not of type int
    B:{V:0,name:"Byte",JS:Array},  //     any binary data/buffer   {B:8} -> a buffer with 8 bytes size 
    //  special in that it determins the size a integer,number or string {I:0,B:8} a int with byte size 8 (int64bit)  {S:"",B:32} a 32 byte long string
    //  you don't need to rembember in DSON if a char is 16 or 8 bit use a  {I:0,B:16}
    BT:{V:false,name:"Bit",JS:Boolean},// same as byte but counts bit, is also a boolean maybee
    L:{V:[],name:"List",JS:Array}, // makes a object into a array of this length  {I:45} (JS: 45)  {I:45, L:3} expands to [{I:45},{I:45},{I:45}] (JS: [45,45,45]) 
    // note every number sub key can be different to enforce a same key or a unique key you need to add asserts like 
    //    {I:5,"!==":5, L:5}  -> [{I:5,"!==":5},{I:5,"!==":5,},...]  ->  [5,5,5,5,5]  "!==" asserts Equality
    // of course you could also use Byte size or !< !>=
    // the L is desinged to be working out of the box if you change a scalar type into a list type
    // also I think I'll add a {"!#":2} ASSERT-MAX-DUBLICATION-COUNT / INVERSE-UNIQUE 
    //  L is only the inital size of the JS array, for strict array sizes use  {S:"","!<L":10} 
    // any L even as virtuall asserts type indicates a List     
    // L is by default {"!>=L":0} MoreEqual Len 0, as logical for sizes
    RE:{V:/(?:)/,name:"Regex",JS:RegExp},
    K:{V:"",name:"Key",JS:String},// needed for DSON flat LISP like Object with KEY constraints
    // allows to specify a type for variables and their values seperatly, good for code gen with dynamic progamms
    V:{V:"",name:"Value",JS:Object},// the V key has always prio over all other Keys, may save memory, more easiyl value change at runtime w/o needing to check all Type Keys (I,S,N,...)  
    //    {V:"actual long value ...",I:0,S:0}
    D:{V:0,name:"Date",JS:Date}, //     new Date("2004")  ^=  {D:"<Date-Str>"} or {D:1213}/*1970ms*/   -> {type:"Date"}
    
    A:{V:0,name:"Assert",JS:String},// Stringified !  e.g.   "AI_age":4 could mean  ASSERT TYPE INT for Key age, _ is optional for readability

    // this schema stores type info and default object at the same time, 
    // type&asserts can be kept without interference at runtime in seperate props marked by starting ! or Type 
    //  { "key": 33 }  is normed [{K:"key",I:33},{I:33}] or 
    // runtime JS-Obj form {"key":33,"Ikey":1 }   already a compact JSON Schema
    // for runtime-form the keys that start with a ! or a type are virtual schema keys and others are actual data so yuu can split it easily back into the obj and the type
    //   {"key":33,"Ikey":1,"!>key":0 } ->  {"key":33} /*Obj*/   {"Ikey":1,"!>key":0} /* Type-Schema */
    //   shorthand combined as initialiser  {"keyI!>0": 33}   ->  {"key":33,"Ikey":true,"!>key":0 } /*JS-Form*/ or ... DSON-Array
    //       pros: no need to retype the key name, less typos
  
    // null type is just optional
    //  {Ikey:true}/{Ikey:1} -> added to type union  (in lax mode you could allow anything not null, which is optional)
    // {Ikey:null} -> key optional Int
    // {!Ikey:true} ->  required int for key is enabled
    //  {!Ikey:false}  -> all but type Int   

    // compact inline obj a parser may expand a sinlge no-WS word into a proper JSON obj, inspired by Math vectors and Physiks units
    //   4x7y ->  {x:4, y:7 }
    // same for strings and braces as long as there is a identifier with no white space after it
    //    [1,2,3]x   -> { x:[1,2,3] } 
    // "John"name"Smith"lname  {name:"John",lname:"Smith"}
    // could use no-WS comma to share a value
    //       0x,y  {x:0,y:0}
    //
    //  these shorthands combine well with DSON Type key annos
    //    myPrice =  45N  ->   [ {K:"myPrice",N:45}, {N:45}]    so myPrice+=.1 will be valid
    //    minAge = 18I -> [{K:"minAge",I:18},{I:18}]    minAge= 16.5 is invalid
    //  or for def of ranges
    //  sensible:     10L  ->  {L:10,} ->  [0,1,2,...9]   // generic buffer data, could still be a string or smth else
    //        5I10L    {I:5,L:10} -> [0,.5,1 ,...,4.5, 5]       
    //     {"I0":5,  L:10}   [5,6,..., 10]
    //     {"I0":5,"I1":7,  L:10}   [5,7,9,11,13,15,17,19,21,23]
    //     {S:"a",dS:1,B:4}  ->  "abcd"   use d<TYPE> for delta on binary representation
    //     aArr =  10L !>L 5  ->   [{K:"aArr"}, {L:10}  , {OP:"!>"}, 5 ]  -> after LISP eval [{K:"aArr"},  {L:10,"!>L":5}   ]
}
// A normed DSON obj is a array where keys are identified via objects formed {K: ... }, values can use {V:...} or are just between detected {K:...}  
//  both keys and values can get Types or Asserts
let ExampleDSON = [
    {K:"fname"},  {S:"John"},
    {K:"age","I":true},  {I:42},// KEY type is Int, value is just a placeholder, Value Type is also Int
    {K:"lname","!":true}, {S:"Smith","!>B":0}, // Ex. with required KEY object and Assertion that byte size of value must be above 0
    //   during parsing and norming of a DSON the asserts of the value/s is implitly added to the KEY if no such assert is present
    //   this is similar to auto Type inference and saves you the work of having errors cause the type of KEY and VALUE do not add up after code changes
    // values of keys end at the next Key/arrayEnd; so this is a list: 
    {K:"favovriteAnimals",S:"",L:3}, {S:"Cats"}, {S:"Squirils"}, {S:"Dragons"},
    // represents { ... "favovriteAnimals":["Cats","Squirils","Dragons"]  ... }
    // but type of Key is fixed to STRING and LIST of length 3, wrong reassing will fail
    // you could shorten this before init to just SL:3 which also means STRING_LIST, but the seperate form is the runtime standard
    {K:"autoConvertable"},  "a primitiv Str", // could be more compact  norm should covnert this during initialisation 
    {K:"twoToTau",I:true,"!>=":2,"!<=I":6.28},  5.3, //  is int type and "!>=" tests for all types the value for greater than-eq 2
    // you can limit for composite type ( {I:3,S:"3.0"}) the assert to a type property like "!<=I" to only type Int, makes here no difference

    // you can use a key regex to validate/set values for multiple props
    {KRE:"address\\d",   },  
    // this is a nested obj indicated via a increased lv., I currently think using a flat list with LV makes code more compact
    //  but there will be a aufBäumen function to represent nested obj as DSON array  [{K:"a"},[{K:"a.b"},1] ]
    {K:"city",LV:1}, "city",
    {K:"zip",LV:1}, 0,
    // KEY obj with no LV means LV 0 and when LV goes down nested obj ends implicitly

    // i think shorthand Key object should say the type first and then Key , also at init verbose type names may be allowed
    {IK:"5", STRING_KEY:"5",NUMBER_KEY_RE:"\\d+\\.?\\d+", L:10,"!<L":100}, {I:0},// this is a array  with assert for the Keys
    // INT_KEY, 
    
    // same Key allowed for XML/HTML Schemas
    {K:"<div>"},  
        "Text Content",  
        {K:"id",LV:"+1"},{S:"myID-454214",LV:"+2"}, // attr for first div resolved via LV depth, intend not neccecary, only for readability
        {K:"<p>",LV:"+1"},
    {K:"<div>"}, "text",
    {K:"<div>"}, [ "text content first attrs afterwards",[{K:"<nest>"}],"cause Keys end at next key" , {K:"class"},"myClass",  ],  // at init it will be flattend and LV given
];
// DSON obj have lengths which is the amount of unnested(LV=0|undefined) Keys, 
// their array length is the JS array length

let Ops = {
    "":function REQuired(K,V,TK,TV,obj=this){ if(!K in obj) obj["~~>"](`Missing Required Key ${K}`) },
    "~~>":function(msg){throw Error(msg)},
    ">":function GreaterThan(K,V,TK,TV,obj=this){ if(V<TV)obj["~~>"](`Key ${K} is not greater than ${SV}`) },
    ">=":function GreaterThanEqual(K,V,TK,TV,obj=this){ if(V<=TV)obj["~~>"](`Key ${K} is not greater than equal ${SV}`) },
    "<":function LessThan(K,V,TK,TV,obj=this){ if(V>TV)obj["~~>"](`Key ${K} is not less than ${SV}`) },
    "<=":function LessThanEqual(K,V,TK,TV,obj=this){ if(V>=TV)obj["~~>"](`Key ${K} is not less than equal ${SV}`) },
};

let person = {
    name: "Lyn",
    "!name":1,// required KEY name: true   // undefiend|null -> optional, false -> should not have KEY
    "Sname":1,// TYPE STRING name: true    // condition when this type is valid
    even:4,
    "!%2even":0,//  modulo, number belongs to key, if key has number use _ to seperate asertion from key  !%1_2even -> "2even"
    //   if num missing uses 1 whiich means no fractional part
    "!even":{   I:0, N:0 }, // required with some type def
    "!>even":0,// bounds
}
let stringOrInt = {  I:42,  S:"Hello" }; // is string or int
let mustBeRE = { RE:"","!RE":1} // JSON RE syntax via DSON type indicator and strict typing via required to be a RE like object
//   /abc/ against this validates, but  "bla" whicht is in DSON {S:"bla"} misses the requried RE key and fails
let stringXorInt = {
    S:"By", 
    "!S":"!('I' in this)",
    "!I":".S==undefined" 
    // condition throws if value tested against has both I ans S 
}; 
//    {I:45} and {S:"a str"} are ok but  {I:4,S:"aa"} fails

const DSON={
    // parse a DSON Array from a 
    
    ofJS(jsObj){

    },
    // side note: maybe code more compact if I just write a testDSON-Form and convert a runtime-JS-Form first into this, which I need anyway
    test(obj=this){
        for(const key in obj){
            if(key[0]=="!"){  
                let _m=key.match(/^!(\W*)(.*)$/);
                let opFn= Ops[_m?.[1]]; 
                if(opFn){
                    let V = obj?.[_m[2]];
                    if(typeof V=="object") for(const K in V) opFn(key+K,V?.[K],key,obj?.[key],V);
                    else  opFn(_m[2],obj?.[_m[2]],key,obj?.[key],obj);
                } 
            }
        }
    },
    // should parse and seperate inline Types and Asserts   { "asciiI7BT!>=20": 50 } ->  
    // {  "ascii":50,
    // "Iascii":1, // type Int for KEY ascii
    // "BTascii":7, // KEY ascii is 7 BIT big
    // "!>=ascii":20, // ASSERT KEY ascii greater-eq 20 
    // }
    norm(){
        // To Do
    }
}
//                     Object Type          String ASSERT LessThan Bytes 80     Int 8 Bytes ASSERT above 0 ASSERT below 130   
let demoTypedFormObj= {O:"#Form","#":"yourId",nameSALTB80:"Ottgar", "ageI8B!>0!<130":20};
//                              use _ for readabi. nameS_A_LT_B80 is still uniquqe for the parser (goes until next 'A')
//          there may be a partial verbose mode    nameS_ASSERT_LT_BYTES80:"" , that could be more readable
//                 I strongly recommend the use of operators for Assertion and only the Type is a Uppercase letter with optional Byte List size as in age, which is readable