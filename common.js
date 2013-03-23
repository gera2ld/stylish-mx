var rt=window.external.mxGetRuntime(),br=rt.create('mx.browser'),
    guid='__{25d5eed5-1c91-4dde-ba91-9b6c9f786b1f}_';
function format(){
	var a=arguments;
	if(a[0]) return a[0].replace(/\$(?:\{(\d+)\}|(\d+))/g,function(v,g1,g2){g1=a[g1||g2];if(g1==undefined) g1=v;return g1;});
}
function _(t){
	var l=t.replace(/[%+=]/g,function(v){return '%'+v.charCodeAt().toString(16);}).replace(/ /g,'+');
	l=rt.locale.t(l);
	return l?JSON.parse(l):t;
};
function initFont(){
	var s=document.createElement('style');
	s.innerHTML=_('__font');
	document.head.appendChild(s);
}
function unsafeExecute(scr){
	var p=document.createElement("script");
	p.innerHTML=scr;
	document.documentElement.appendChild(p);
	document.documentElement.removeChild(p);
}
function unsafeBroadcast(scr){
	scr='unsafeExecute('+JSON.stringify(scr)+');';
	var j,t;for(j=0;t=br.tabs.getTab(j);j++) br.executeScript(scr,t.id);
}

function getItem(key,def){
	var v=localStorage.getItem(key);
	if(v==null&&def) return setItem(key,def);
	try{return JSON.parse(v);}catch(e){return def;}
}
function setItem(key,val){
	localStorage.setItem(key,JSON.stringify(val));
	return val;
}
