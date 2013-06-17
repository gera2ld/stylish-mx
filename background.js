/* ===============Data format 0.3==================
 * ids	List [id]
 * us:id Item	{
 * 		name:	String(stylish-description)
 * 		url:	String		// Homepage
 * 		id:	url||random
 * 		metaUrl:	String	// for update checking
 * 		updateUrl:	String	// for update
 * 		updated:	Int
 * 		enabled:	Boolean
 * 		data:	List	[
 * 					{
 * 					domains:	List	[...]
 * 					regexps:	List	[...]
 * 					urlPrefixes:	List	[...]
 * 					urls:		List	[...]
 * 					code:		String
 * 					}
 * 				]
 * 		}
 */

// Check Maxthon version
(function(v){
	if(getItem('warnObsolete',0)) return;
	setItem('warnObsolete',1);
	function older(a,b,c,d){
		a=a.split('.');b=b.split('.');c=d=0;
		while(a.length||b.length){
			c=parseInt(a.shift())||0;
			d=parseInt(b.shift())||0;
			if(c!=d) break;
		}
		return c<d;
	}
	if(older(v,'4.0.3.5000')) {
		mx.locale();
		var v=mx.getSystemLocale(),o=['en','zh-cn'],i=o.indexOf(v);if(i<0) v=o[0];
		br.tabs.newTab({url:rt.getPrivateUrl()+'oldversion/'+v+'.html',activate:true});
	}
})(window.external.mxVersion);

// Initiate settings
var ids,map,settings={o:['installFile','firefoxCSS','isApplied'],s:[]};
(function(){
	if(localStorage.getItem('ids')) return;
	// upgrade data from Stylish 1 irreversibly
	var k,v=rt.storage.getConfig('data');
	if(v) try{
		rt.storage.setConfig('data',null);
		v=JSON.parse(v);
		setItem('ids',v.ids);
		for(k in v.map) setItem('us:'+k,v.map[k]);
		setItem('installFile',v.installFile);
		setItem('isApplied',v.isApplied);
	}catch(e){}
})();
function init(){
	getItem('installFile',true);
	getItem('isApplied',true);
	getItem('firefoxCSS',false);
}
init();ids=[];map={};
getItem('ids',[]).forEach(function(i){var o=getItem('us:'+i);if(o) {ids.push(i);map[i]=o;}});

function newStyle(c,save){
	var r={
		name:c?c.name:_('New Style'),
		url:c&&c.url,
		id:c&&c.id,
		metaUrl:c&&c.metaUrl,
		updated:c?c.updated:null,
		enabled:c&&c.enabled!=undefined?c.enabled:1,
		data:[]
	};
	if(!r.id) r.id=Date.now()+Math.random().toString().substr(1);
	if(save) saveStyle(r);
	return r;
}
function saveStyle(o){
	if(!map[o.id]) {ids.push(o.id);setItem('ids',ids);}
	setItem('us:'+o.id,map[o.id]=o);
	broadcast('updateStyle('+JSON.stringify(o.id)+');');
}
rt.listen('RemoveStyle',function(i){
	i=ids.splice(i,1)[0];setItem('ids',ids);
	delete map[i];localStorage.removeItem('us:'+i);
	broadcast('updateStyle('+JSON.stringify(i)+');');
});

rt.listen('SaveStyle',saveStyle);
rt.listen('EnableStyle',function(e,o){
	o=map[e.id];o.enabled=e.data;saveStyle(o);
	rt.post('UpdateItem',{status:2,item:ids.indexOf(o.id),obj:o});
});
function parseFirefoxCSS(o){
	var c=null,i,p,m,r,code=o.data,data=[],d={};
	code.replace(/\/\*\s+@(\w+)\s+(.*?)\s+\*\//g,function(v,g1,g2){
		if(d[g1]==undefined) {
			d[g1]=g2;
			if(['updated','enabled'].indexOf(g1)>=0)
				try{d[g1]=JSON.parse(d[g1]);}catch(e){delete d[g1];}
		}
	});
	while(code){
		i=code.indexOf('@-moz-document');if(i<0) break;
		p=code.indexOf('{',i);
		m=code.slice(i,p);r={domains:[],regexps:[],urlPrefixes:[],urls:[]};
		m.replace(/([\w-]+)\(('|")?(.*?)\2\)/g,function(v,g1,g2,g3){
			try{g3=JSON.parse('"'+g3+'"');}catch(e){}
			if(g1=='url-prefix') r.urlPrefixes.push(g3);
			else if(g1=='url') r.urls.push(g3);
			else if(g1=='domain') r.domains.push(g3);
			else if(g1=='regexp') r.regexps.push(g3);
		});
		for(m=0,i=p;i<code.length;i++)
			if(code[i]=='{') m++;
			else if(code[i]=='}') {m--;if(!m) break;}
		if(m) break;
		r.code=code.slice(p+1,i).replace(/^\s+|\s+$/g,'');
		code=code.slice(i+1).replace(/^\s+/,'');
		data.push(r);
	}
	r={status:0,message:_('Style updated.')};
	if(d.id) r.item=ids.indexOf(d.id);
	if(!code) {
		if(d.id) c=map[d.id];
		else d.id=Date.now()+Math.random().toString().substr(1);
		if(!c) {c=newStyle(d);r.status=1;}
		else for(i in d) c[i]=d[i];
		c.data=data;saveStyle(c);
		r.item=ids.indexOf(c.id);r.obj=c;
	} else {
		r.status=-1;
		r.message=_('Error parsing CSS code!');
	}
	if(o.source) rt.post(o.source,{topic:'ParsedCSS',data:r});
	rt.post('UpdateItem',r);
}
function fetchURL(url, load){
	var req=new XMLHttpRequest();
	if(load) req.onloadend=load;
	if(url.length>2000) {
		var parts=url.split('?');
		req.open('POST',parts[0],true);
		req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
		req.send(parts[1]);
	} else {
		req.open('GET', url, true);
		req.send();
	}
}
function parseCSS(o){
	var d=o.data,j=null,c,data=[],r={status:0,message:_('Style updated.')};
	if(d.id) r.item=ids.indexOf(d.id);
	if(d.status&&d.status!=200) {r.status=-1;r.message=_('Error fetching CSS code!');}
	else try{
		j=JSON.parse(d.code);
	}catch(e){
		r.message=_('Error parsing CSS code!')+'\n'+e.stack;
		r.status=-1;
	}
	if(j) {
		j.sections.forEach(function(i){
			data.push({
				domains:i.domains,
				regexps:i.regexps,
				urlPrefixes:i.urlPrefixes,
				urls:i.urls,
				code:i.code
			});
		});
		if(d.id&&(c=map[d.id])) {
			r.item=ids.indexOf(d.id);
			c.updated=d.updated;
		} else {
			r.item=ids.length;
			d.name=j.name;
			d.enabled=1;
			c=newStyle(d);
			r.status=1;
		}
		c.data=data;c.url=j.url;c.updateUrl=j.updateUrl;
		saveStyle(c);r.obj=c;
	}
	if(o.source) rt.post(o.source,{topic:'ParsedCSS',data:r});
	rt.post('UpdateItem',r);
}
function parseJSON(o){
	var r={status:0,message:_('Style updated.')},c;
	try{
		o=JSON.parse(o.data);
		if(!map[o.id]) {
			r.status=1;
			r.message=_('Style installed.');
		}
		c=newStyle(o);
		o.data.forEach(function(i){
			c.data.push({
				name:i.name||'',
				domains:i.domains,
				regexps:i.regexps,
				urlPrefixes:i.urlPrefixes,
				urls:i.urls,
				code:i.code||'',
			});
		});
		saveStyle(c);
	}catch(e){
		console.log(e);
		r.status=-1;
		r.message=_('Error parsing CSS code!');
	}
	if(o.source) rt.post(o.source,{topic:'ParsedCSS',data:r});
	if(c) {r.item=ids.indexOf(c.id);rt.post('UpdateItem',r);}
	return r;
}
rt.listen('NewStyle',function(o){rt.post('GotStyle',newStyle(null,true));});
rt.listen('ExportZip',function(o){
	var r={data:[],settings:{}};
	o.data.forEach(function(c){var o=map[c];if(o) r.data.push(o);});
	settings.o.concat(settings.s).forEach(function(i){r.settings[i]=getItem(i);});
	rt.post('ExportStart',r);
});
rt.listen('ParseCSS',parseCSS);
rt.listen('ParseJSON',parseJSON);
rt.listen('ParseFirefoxCSS',parseFirefoxCSS);
rt.listen('InstallStyle',function(o){
	if(!o.data) {
		if(getItem('installFile')) rt.post(o.source,{topic:'ConfirmInstall',data:_('Do you want to install this style?')});
	} else fetchURL(o.data.url,function(){
		o.data.status=this.status;o.data.code=this.responseText;parseCSS(o);
	});
});
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
rt.listen('LoadStyle',function(o){
	function load(source,url,id){
		function getCSS(i){
			var d=testURL(url,map[i]);c[i]=d;
		}
		var c={};
		if(id) getCSS(id); else ids.forEach(getCSS);
		c={topic:'LoadedStyle',data:{isApplied:isApplied,data:c}};
		rt.post(source,c);
	}
	var isApplied=getItem('isApplied'),d=o.data;
	if(d&&d.frames) d.frames.forEach(function(i){load(i.source,i.origin,d.id);});
	else load(o.source,o.origin,d&&d.id);
});
rt.listen('CheckStyle',function(o){rt.post(o.source,{topic:'CheckedStyle',data:map[o.data]});});

rt.listen('GetOptions',function(){
	var r={ids:ids,map:map};
	settings.o.forEach(function(i){r[i]=getItem(i);});
	rt.post('GotOptions',r);
});
rt.listen('SetOption',function(o){
	if(o.wkey) window[o.wkey]=o.data;
	setItem(o.key,o.data);
});

var optionsURL=new RegExp('^'+(rt.getPrivateUrl()+'options.html').replace(/\./g,'\\.'));
br.onBrowserEvent=function(o){
	switch(o.type){
		case 'TAB_SWITCH': case 'ON_NAVIGATE':
			var tab=br.tabs.getCurrentTab(),i,t;
			if(optionsURL.test(tab.url)) for(i=0;t=br.tabs.getTab(i);i++) if(t.id!=tab.id&&optionsURL.test(t.url)) {
				tab.close();t.activate();
			}
	}
};
