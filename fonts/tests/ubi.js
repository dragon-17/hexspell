
var _Va;
window.addEventListener("click", e => {
    let t = e.target;
    if (e.button == 0 && t.parentElement?.matches?.("u:has(i:only-child)")) {
        const c = document.body.contentEditable;
        document.body.contentEditable = false;
        t.parentElement.tabindex = 0;
        _Va ??= (_Va = document.createElement("a"), document.body.append(_Va), _Va.hidden = true, _Va);
        let href = ((t.nextSibling ?? t).textContent).trim();
        // if(!href.test(/#|http|file|data|ws|ssh/)) href="#"+href;
        console.log("clicked on a", href);
        _Va.href = href
        _Va.click();
        t.parentElement.classList.add("visited");
        document.body.contentEditable = c;
    }
})

// to insert <br> instead of spliting into <div> keeps all HTML complete ubi+<br>, alt would be pre
window.addEventListener("keydown",  (ev)=>{ 
    if(!ev.ctrlKey && ev.key=="Enter"&&!selIsTable()){ 
        ev.preventDefault();document.execCommand("insertHTML",0,"<br>") 
    }
    if(ev.ctrlKey && ev.key=="m"){
        ev.preventDefault(); 
        let b=document.body;
        b.hasAttribute("contenteditable")? b.removeAttribute("contenteditable"):b.setAttribute("contenteditable","true") }
})

function selIsTable(){
    const s = getSelection();
    let n=s.focusNode;
    if(!s.focusNode.data) n=n.parentElement;
    const pp=n.parentElement?.parentElement;
    return pp?.localName=="u"&&pp.firstElementChild?.nextElementSibling?.localName=="b";
}

