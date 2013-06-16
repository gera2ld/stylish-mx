var rt=window.external.mxGetRuntime(),br=rt.create('mx.browser');
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
function initI18n(){
	window.addEventListener('DOMContentLoaded',function(){
		var nodes=document.querySelectorAll('.i18n'),i;
		for(i=0;i<nodes.length;i++) nodes[i].innerHTML=_(nodes[i].innerHTML);
	},true);
}
function broadcast(s){
	var j,t;for(j=0;t=br.tabs.getTab(j);j++) br.executeScript(s,t.id);
}

function getItem(key,def){
	var v=localStorage.getItem(key);
	if(!v&&def!=undefined) return setItem(key,def);
	try{return JSON.parse(v);}catch(e){return def;}
}
function setItem(key,val){
	localStorage.setItem(key,JSON.stringify(val));
	return val;
}
