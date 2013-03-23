var updated=0,style=null,styles={};
function getKeys(d){var k=[];for(i in d) k.push(i);return k;}
var p=document.createElement('p');
p.setAttribute('onclick','return window;');
var unsafeWindow=p.onclick();
delete p;

// Message
var id=Date.now()+Math.random().toString().substr(1);
function post(topic,data){
	rt.post(topic,{source:id,origin:window.location.href,data:data});
}
rt.listen(id,function(o){
	if(o.topic=='ConfirmInstall') {
		if(o.data&&confirm(o.data)) {
			if(installCallback) installCallback(); else {
				var id=Date.now()+Math.random().toString().substr(1);
				_data.temp[id]=document.body.innerText;_data.save();
				post('ParseFirefoxCSS',{id:id});
			}
		}
	} else if(o.topic=='ParsedCSS') {
		if(!o.data.error) unsafeWindow.fireCustomEvent('styleInstalled');
		else alert(o.data.message);
	} else if(o.topic=='AlterStyle') alterStyle(o.data);
});
function setPopup(){
	post('SetPopup',{
		styles:getKeys(styles),
		astyles:getKeys(astyles),
		cstyle:cur
	});
};
unsafeWindow[guid+'GetPopup']=setPopup;

// CSS applying
function loadStyle(e){
	if(!style) {
		style=document.createElement('style');
		style.setAttribute('type', 'text/css');
		document.documentElement.appendChild(style);
	}
	if(styles) {
		var i,c=[];
		for(i in styles) c.push(styles[i]);
		style.innerHTML=c.join('');
	}
}
unsafeWindow[guid+'UpdateStyle']=function(d){
	if(d) {
		_data.load();
		var c=testURL(window.location.href,_data.map[d]);
		if(typeof c=='string') styles[d]=c; else delete styles[d];
		loadStyle();
	} else if(style) {
		document.documentElement.removeChild(style);
		style=null;
	} else loadStyle();
};
function testURL(url,e){
	function str2RE(s){return s.replace(/(\.|\?|\/)/g,'\\$1').replace(/\*/g,'.*?');}
	function testDomain(){
		r=d.domains;
		for(i=0;i<r.length;i++) if(RegExp('://(|[^/]*\\.)'+r[i].replace(/\./g,'\\.')+'/').test(url)) return f=1;
		if(i&&f<0) f=0;
	}
	function testRegexp(){
		r=d.regexps;
		for(i=0;i<r.length;i++) if(RegExp(r[i]).test(url)) return f=1;
		if(i&&f<0) f=0;
	}
	function testUrlPrefix(){
		r=d.urlPrefixes;
		for(i=0;i<r.length;i++) if(url.substr(0,r[i].length)==r[i]) return f=1;
		if(i&&f<0) f=0;
	}
	function testUrl(){
		r=d.urls;
		for(i=0;i<r.length;i++) if(r[i]==url) return f=1;
		if(i&&f<0) f=0;
	}
	var k,f,d,i,r,c=[];
	if(e) for(k=0;k<e.data.length;k++){
		d=e.data[k];f=-1;
		testDomain();testRegexp();testUrlPrefix();testUrl();
		if(f) c.push(e.enabled?d.code:'');
	}
	if(c.length) return c.join('');
}
(function(url){
	if(url.substr(0,5)!='data:') _data.ids.forEach(function(i){
		var d=testURL(url,_data.map[i]);
		if(typeof d=='string') styles[i]=d;
	});
	if(_data.data.isApplied) loadStyle();
})(window.location.href);

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
	setPopup();
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
	req.onload=function(){
		try{
			updated=getTime(JSON.parse(req.responseText));
		} catch(e) {
			alert('Oops! Failed checking for update!');updated=0;
		}
		var c=_data.map[id];
		if(c){
			if(!c.updated||c.updated<updated) unsafeWindow.fireCustomEvent('styleCanBeUpdated');
			else unsafeWindow.fireCustomEvent('styleAlreadyInstalledChrome');
		} else unsafeWindow.fireCustomEvent('styleCanBeInstalledChrome');
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
var installCallback=null;
if(/\.user\.css$/.test(window.location.href)) (function(){
	function install(){
		if(document&&document.body&&!document.querySelector('title')) post('InstallStyle');
	}
	if(document.readyState!='complete') window.addEventListener('load',install,false);
	else install();
})(); else if(/^http:\/\/userstyles\.org\/styles\//.test(window.location.href))
	window.addEventListener('DOMNodeInserted',fixMaxthon,false);
