// Message
var rt=window.external.mxGetRuntime(),
		id=Date.now()+Math.random().toString().substr(1),
		frames=[{source:id,origin:window.location.href}];
function post(topic,data,o){
	rt.post(topic,{source:o&&o.id||id,origin:o&&o.origin||window.location.href,data:data});
}
function fireEvent(t){
	var e=document.createEvent('Events');
	e.initEvent(t,false,false,document.defaultView,null);
	document.dispatchEvent(e);
}
rt.listen(id,function(o){
	if(o.topic=='LoadedStyle') loadStyle(o.data);
	else if(o.topic=='CheckedStyle') {
		if(o.data){
			if(!o.data.updated||o.data.updated<data.updated) fireEvent('styleCanBeUpdated');
			else fireEvent('styleAlreadyInstalledChrome');
		} else fireEvent('styleCanBeInstalledChrome');
	} else if(o.topic=='ConfirmInstall') {
		if(o.data&&confirm(o.data)) {
			if(installCallback) installCallback();
			else if(/\.json$/.test(window.location.href)) post('ParseJSON',document.body.innerText);
			else post('ParseFirefoxCSS',document.body.innerText);
		}
	} else if(o.topic=='ParsedCSS') {
		if(location.host=='userstyles.org') {
			if(o.data.status<0) alert(o.data.message);
			else fireEvent('styleInstalled');
		} else showMessage(o.data.message);
	} else if(o.topic=='AlterStyle') alterStyle(o.data);
});
function showMessage(data){
	var d=document.createElement('div');
	d.setAttribute('style','position:fixed;border-radius:5px;background:orange;padding:20px;z-index:9999;box-shadow:5px 10px 15px rgba(0,0,0,0.4);transition:opacity 1s linear;opacity:0;text-align:left;');
	document.body.appendChild(d);d.innerHTML=data;
	d.style.top=(window.innerHeight-d.offsetHeight)/2+'px';
	d.style.left=(window.innerWidth-d.offsetWidth)/2+'px';
	function close(){document.body.removeChild(d);delete d;}
	d.onclick=close;	// close immediately
	setTimeout(function(){d.style.opacity=1;},1);	// fade in
	setTimeout(function(){d.style.opacity=0;setTimeout(close,1000);},3000);	// fade out
}
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
		for(i in o.data) {
			if(typeof o.data[i]=='string') {styles[i]=o.data[i];styleAdd(i);}
			else {delete styles[i];styleRemove(i);}
		}
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
var data=null,ping=null;
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
	function getData(k){
		var s=document.querySelector('link[rel='+k+']');
		if(s) return s.getAttribute('href');
	}
	var url=getData('stylish-id-url'),metaUrl=url+'.json',req=new window.XMLHttpRequest();
	req.open('GET',metaUrl,true);
	req.onloadend=function(){
		if(this.status==200) try{
			data.updated=getTime(JSON.parse(req.responseText));
		} catch(e) {}
		post('CheckStyle',url);
	};
	req.send();

	data={
		id:url,
		metaUrl:metaUrl,
	};
	function update(){
		data.url=getData('stylish-code-chrome');
		post('InstallStyle',data);
	}
	function install(){
		ping=function(){
			var req=new window.XMLHttpRequest();
			req.open('GET', getData('stylish-install-ping-url-chrome'), true);
			req.send();
		};
		update();
	}
	document.addEventListener('stylishInstallChrome',install,false);
	document.addEventListener('stylishUpdateChrome',update,false);
}
if(/\.user\.css$|\.json$/.test(window.location.href)) (function(){
	function install(){
		if(document&&document.body&&!document.querySelector('title')) post('InstallStyle');
	}
	if(document.readyState!='complete') window.addEventListener('load',install,false);
	else install();
})(); else if(/^http:\/\/userstyles\.org\/styles\//.test(window.location.href))
	window.addEventListener('DOMContentLoaded',fixMaxthon,false);
