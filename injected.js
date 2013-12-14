(function(){
// Messages
var rt=window.external.mxGetRuntime(),id=Date.now()+Math.random().toString().slice(1),
		callbacks={},B='Background',P='Popup';
function post(d,o,callback){
	o.src={id:id,url:window.location.href};
	if(callback) {
		o.callback=Math.random().toString();
		callbacks[o.callback]=callback;
	}
	rt.post(d,o);
}
rt.listen(id,function(o){
	var maps={
		AlterStyle:alterStyle,
		Callback:function(o){
			var f=callbacks[o.id];
			if(f) f(o.data);
			delete callbacks[o.id];
		},
	},f=maps[o.cmd];
	if(f) f(o.data);
});

function fireEvent(t){
	var e=document.createEvent('Events');
	e.initEvent(t,false,false);
	document.dispatchEvent(e);
}
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
window.updateStyle=function(id,o){	// o==-1 for disabled, 0 for removed, 1 for enabled
	if(o>0||!id) post(B,{cmd:'LoadStyle',data:id},loadStyle);
	else {var d={};d[id]=o?'':false;loadStyle({styles:d});}
};
window.setPopup=function(){
	post(P,{cmd:'SetPopup',data:{
		styles:_styles,
		astyles:Object.getOwnPropertyNames(astyles),
		cstyle:cur
	}});
};

// CSS applying
var isApplied=true,style=null,styles={},_styles=[],fstyles={};
function styleAdd(i){
	if(!(i in fstyles)) {fstyles[i]=0;_styles.push(i);}fstyles[i]++;
}
function styleRemove(i){
	if((i in fstyles)&&!--fstyles[i]) _styles.splice(_styles.indexOf(i),1);
}
function loadStyle(o){
	var i,c;
	if('isApplied' in o) isApplied=o.isApplied;
	if(o.styles) {
		for(i in o.styles) {
			if(typeof o.styles[i]=='string') {styles[i]=o.styles[i];styleAdd(i);}
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
post(B,{cmd:'LoadStyle'},loadStyle);

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
	post(P,{cmd:'GetPopup'});
},false);

// Stylish fix
var data=null,ping=null;
function fixMaxthon(){
	function getData(k){
		var s=document.querySelector('link[rel='+k+']');
		if(s) return s.getAttribute('href');
	}
	var url=getData('stylish-id-url'),metaUrl=url+'.json',req=new window.XMLHttpRequest();
	req.open('GET',metaUrl,true);
	req.onloadend=function(){
		if(this.status==200) try{
			data.updated=new Date(JSON.parse(req.responseText).updated).getTime();
		} catch(e) {}
		post(B,{cmd:'CheckStyle',data:url},function(o){
			if(o){
				if(!o.updated||o.updated<data.updated) fireEvent('styleCanBeUpdatedChrome');
				else fireEvent('styleAlreadyInstalledChrome');
				data.id=o.id;
			} else fireEvent('styleCanBeInstalledChrome');
		});
	};
	req.send();

	data={
		url:url,
		metaUrl:metaUrl,
	};
	function update(){
		data.updateUrl=getData('stylish-code-chrome');
		post(B,{cmd:'InstallStyle'},function(o){
			if(o&&confirm(o)) post(B,{cmd:'InstallStyle',data:data},function(o){
				if(o.status<0) alert(o.message);
				else fireEvent('styleInstalled');
			});
		});
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
if(/\.user\.css$|\.json$/.test(window.location.href)) {
	function rawInstall(){
		function installed(o){showMessage(o.message);}
		if(document&&document.body&&!document.querySelector('title')) post(B,{cmd:'InstallStyle'},function(o){
			if(o&&confirm(o)) {
				o=document.body.innerText;
				if(/\.json$/.test(window.location.href)) post(B,{cmd:'ParseJSON',data:{code:o}},installed);
				else post(B,{cmd:'ParseFirefoxCSS',data:o},installed);
			}
		});
	}
	if(document.readyState!='complete') window.addEventListener('load',rawInstall,false);
	else rawInstall();
} else if(/^http:\/\/userstyles\.org\/styles\//.test(window.location.href))
	window.addEventListener('DOMContentLoaded',fixMaxthon,false);
})();
