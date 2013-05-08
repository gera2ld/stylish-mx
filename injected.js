var p=document.createElement('p');
p.setAttribute('onclick','return window;');
var unsafeWindow=p.onclick();
delete p;

// Message
var rt=window.external.mxGetRuntime(),
		id=Date.now()+Math.random().toString().substr(1),
		frames=[{source:id,origin:window.location.href}];
function post(topic,data,o){
	rt.post(topic,{source:o&&o.id||id,origin:o&&o.origin||window.location.href,data:data});
}
rt.listen(id,function(o){
	if(o.topic=='LoadedStyle') loadStyle(o.data);
	else if(o.topic=='CheckedStyle') {
		if(o.data){
			if(!o.data.updated||o.data.updated<updated) unsafeWindow.fireCustomEvent('styleCanBeUpdated');
			else unsafeWindow.fireCustomEvent('styleAlreadyInstalledChrome');
		} else unsafeWindow.fireCustomEvent('styleCanBeInstalledChrome');
	} else if(o.topic=='ConfirmInstall') {
		if(o.data&&confirm(o.data)) {
			if(installCallback) installCallback(); else {
				post('ParseFirefoxCSS',document.body.innerText);
			}
		}
	} else if(o.topic=='ParsedCSS') {
		if(o.data.error) alert(o.data.message);
		else unsafeWindow.fireCustomEvent('styleInstalled');
	} else if(o.topic=='AlterStyle') alterStyle(o.data);
});
function setPopup(){
	post('SetPopup',{
		styles:_styles,
		astyles:Object.getOwnPropertyNames(astyles),
		cstyle:cur
	});
};
function updateStyle(i){
	var o={frames:frames};if(i) o.id=i;
	post('LoadStyle',o);
}

// CSS applying
var isApplied=true,style=null,styles={},_styles=[],fstyles={};
function styleAdd(i){
	if(!(i in fstyles)) {fstyles[i]=0;_styles.push(i);}fstyles[i]++;
}
function styleRemove(i){
	if(i in fstyles) {fstyles[i]--;if(!fstyles[i]) _styles.splice(_styles.indexOf(i),1);}
}
function loadStyle(o){
	var i,c;
	if('isApplied' in o) isApplied=o.isApplied;
	if(o.data) {
		for(i in o.data)
			if(typeof o.data[i]=='string') {styles[i]=o.data[i];o.data[i]=1;styleAdd(i);}
			else {delete styles[i];o.data[i]=-1;styleRemove(i);}
		// TODO: post styles to top
	}
	if(isApplied) {
		if(!style) {
			style=document.createElement('style');
			document.documentElement.appendChild(style);
		}
		if(styles) {
			c=[];for(i in styles) c.push(styles[i]);
			style.innerHTML=c.join('');
		}
	} else if(style) {
		document.documentElement.removeChild(style);
		style=null;
	}
}
post('LoadStyle');

// Alternative style sheets
var astyles={},cur=undefined;
function addStylesheet(i){
	var c=astyles[i.title];
	if(!c) astyles[i.title]=c=[];
	c.push(i);
	if(cur==undefined) cur=i.title;
}
function alterStyle(s){
	for(var i in astyles) astyles[i].forEach(function(l){l.disabled=i!=s;});cur=s;
}
window.addEventListener('DOMContentLoaded',function(){
	Array.prototype.forEach.call(document.querySelectorAll('link[rel=stylesheet][title]'),addStylesheet);
	Array.prototype.forEach.call(document.querySelectorAll('link[rel="alternate stylesheet"][title]'),addStylesheet);
	post('GetPopup');
},false);

// Stylish fix
function getTime(r){
	var d=new Date(),z,m=r.updated.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)\s+(\+|-)(\d+)/);
	d.setUTCFullYear(parseInt(m[1],10));
	d.setUTCMonth(parseInt(m[2],10)-1);
	d.setUTCDate(parseInt(m[3],10));
	d.setUTCHours(parseInt(m[4],10));
	d.setUTCMinutes(parseInt(m[5],10));
	d.setUTCSeconds(parseInt(m[6],10));
	d.setUTCMilliseconds(0);
	d=d.getTime()/1000;
	z=parseInt(m[8].substr(0,2),10)*60+parseInt(m[8].substr(2),10);z*=60;
	if(m[7]!='-') z=-z;d+=z;
	return d;
}
function fixMaxthon(){
	if(!unsafeWindow.addCustomEventListener) return;
	window.removeEventListener('DOMNodeInserted',fixMaxthon,false);
	function getData(k){
		var s=document.querySelector('link[rel='+k+']');
		if(s) return s.getAttribute('href');
	}
	var id=getData('stylish-id-url'),metaUrl=id+'.json';
	var req = new window.XMLHttpRequest();
	req.open('GET',metaUrl,true);
	req.onloadend=function(){
		if(this.status==200) try{updated=getTime(JSON.parse(req.responseText));} catch(e) {}
		post('CheckStyle',id);
	};
	req.send();

	installCallback=function(){
		post('InstallStyle',{
			id:id,
			metaUrl:metaUrl,
			updated:updated,
			url:getData('stylish-code-chrome'),
		});
		if(installCallback.ping){
			var req=new window.XMLHttpRequest();
			req.open('GET', getData('stylish-install-ping-url-chrome'), true);
			req.send();
		}
	};
	function install(e){installCallback.ping=true;post('InstallStyle');}
	function update(e){installCallback.ping=false;unsafeWindow.stylishInstallChrome(e);}
	unsafeWindow.addCustomEventListener('stylishInstallChrome',install);
	unsafeWindow.addCustomEventListener('stylishUpdate',update);
}
var installCallback=null,updated=0;
if(/\.user\.css$/.test(window.location.href)) (function(){
	function install(){
		if(document&&document.body&&!document.querySelector('title')) post('InstallStyle');
	}
	if(document.readyState!='complete') window.addEventListener('load',install,false);
	else install();
})(); else if(/^http:\/\/userstyles\.org\/styles\//.test(window.location.href))
	window.addEventListener('DOMNodeInserted',fixMaxthon,false);
