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

// Initiate settings
(function(){	// Upgrade data
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
getItem('installFile',true);
getItem('isApplied',true);
var ids=getItem('ids',[]),map={};
ids.forEach(function(i){map[i]=getItem('us:'+i);});

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
	unsafeBroadcast('window.top.postMessage({topic:"Stylish_UpdateStyle",data:"'+o.id+'"},"*");');
}
rt.listen('RemoveStyle',function(i){
	i=ids.splice(i,1)[0];setItem('ids',ids);
	delete map[i];localStorage.removeItem('us:'+i);
	unsafeBroadcast('window.top.postMessage({topic:"Stylish_UpdateStyle",data:"'+i+'"},"*");');
});
function updateItem(t,i,o,m){rt.post('UpdateItem',{cmd:t,data:i,obj:o,message:m});}

rt.listen('SaveStyle',saveStyle);
rt.listen('EnableStyle',function(o,e){
	e=map[o.id];e.enabled=o.data;saveStyle(e);
	updateItem('update',ids.indexOf(o.id),o);
});
function parseFirefoxCSS(o){
	var c=null,i,p,m,r,code=o.data,data=[],d={},t;
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
	r={error:0};
	if(!code) {
		if(d.id) c=map[d.id];
		else d.id=Date.now()+Math.random().toString().substr(1);
		if(!c) {c=newStyle(d);t='add';}
		else {for(i in d) c[i]=d[i];t='update';}
		c.data=data;saveStyle(c);
	} else {
		r.error=-1;
		r.message=_('Error parsing CSS code!');
	}
	if(o.source) rt.post(o.source,{topic:'ParsedCSS',data:r});
	if(c) updateItem(t,ids.indexOf(c.id),c,_('Style updated.'));
	else return r.message;
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
	var d=o.data,i,j,c,data=[],r={error:0},t='update';
	if(d.status&&d.status!=200) {r.error=-1;r.message=_('Error fetching CSS code!');}
	else try{
		i=d.id;j=JSON.parse(d.code);
		j.sections.forEach(function(i){
			data.push({
				domains:i.domains,
				regexps:i.regexps,
				urlPrefixes:i.urlPrefixes,
				urls:i.urls,
				code:i.code
			});
		});
		if(i&&(c=map[i])) {
			i=ids.indexOf(i);
			c.updated=d.updated;
		} else {
			d.name=j.name;
			d.enabled=1;
			c=newStyle(d);
			t='add';
		}
		c.data=data;
		c.url=j.url;
		c.updateUrl=j.updateUrl;
		saveStyle(c);
	}catch(e){
		console.log(e);
		r.message=_('Error parsing CSS code!');
		r.error=-1;
	}
	rt.post(o.source,{topic:'ParsedCSS',data:r});
	if(c) updateItem(t,i,c,_('Style updated.')); else return r.message;
}
rt.listen('NewStyle',function(o){rt.post('GotStyle',newStyle(null,true).id);});
rt.listen('ImportZip',function(b){
	var z=new JSZip();
	try{z.load(b,{base64:true});}catch(e){rt.post('ShowMessage',_('Error loading zip file.'));return;}
	var count=0;
	z.file(/\.user\.css$/).forEach(function(o){
		if(o.dir) return;
		try{
			var r=parseFirefoxCSS({data:o.asText()});
			if(!r) count++;
		}catch(e){console.log('Error importing data: '+o.name+'\n'+e);}
	});
	rt.post('ShowMessage',format(_('$1 item(s) are imported.'),count));
});
rt.listen('ParseCSS',parseCSS);
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
			var d=testURL(url,map[i]);
			if(typeof d=='string') c[i]=d;
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

rt.listen('GetOptions',function(o){
	for(var i in o) o[i]=getItem(i);
	o.ids=ids;o.map=map;
	rt.post('GotOptions',o);
});
rt.listen('SetOptions',function(o){for(var i in o) setItem(i,o[i]);});

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
