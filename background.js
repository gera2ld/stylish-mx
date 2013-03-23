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

rt.listen('Vacuum',function(callback){
	setTimeout(function(){
		var k,s,i,cc={};
		_data.ids.forEach(function(i){
			k=_data.map[i];
			if(k.meta.icon) cc[k.meta.icon]=1;
			if(k.meta.require) k.meta.require.forEach(function(i){cc[i]=1;});
			if(k.meta.resources) for(i in k.meta.resources) cc[i]=1;
		});
		for(i in cc) if(!_data.cache[i]) fetchCache(i);
		for(i in _data.cache) if(!cc[i]) delete _data.cache[i];
		_data.data.temp={};_data.save();
		if(callback) callback();
	},0);
	rt.post('Vacuumed');
});

function newStyle(c,save){
	var r={
		name:c?c.name:_('New Style'),
		id:c&&c.id,
		metaUrl:c&&c.metaUrl,
		updated:c?c.updated:null,
		enabled:c?c.enabled:1,
		data:[]
	};
	if(!r.id) r.id=Date.now()+Math.random().toString().substr(1);
	if(save) saveStyle(r);
	return r;
}
function saveStyle(o){
	if(!_data.map[o.id]) _data.ids.push(o.id);_data.map[o.id]=o;_data.save();
	unsafeBroadcast('UpdateStyle',o.id);
}
function removeStyle(i){
	i=_data.ids.splice(i,1)[0];delete _data.map[i];_data.save();
	unsafeBroadcast('UpdateStyle',i);
}
function updateItem(t,i,o,m){rt.post('UpdateItem',{cmd:t,data:i,id:o,message:m});}

rt.listen('ParseFirefoxCSS',function(o){
	var c=null,i,p,m,r,code,data=[],d=o.data,t='update';
	_data.load();code=_data.temp[d.id];delete _data.temp[d.id];
	code.replace(/\/\*\s+@(\w+)\s+(.*?)\s+\*\//g,function(v,g1,g2){d[g1]=g2;});
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
		c=_data.map[d.id];
		if(!c) {d.enabled=1;c=newStyle(d);t='add';}
		for(i in d) c[i]=d[i];
		c.data=data;saveStyle(c);
	} else {
		r.error=-1;
		r.message=_('Error parsing CSS code!');
	}
	rt.post(o.source,{topic:'ParsedCSS',data:r});
	if(c) updateItem(t,_data.ids.indexOf(c.id),c.id,_('Style updated.'));
	else return r.message;
});
function fetchURL(url, load){
	var req=new XMLHttpRequest();
	if(load) req.onload=load;
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
		i=d.id;
		if(!d.code) {_data.load();d.code=_data.temp[i];delete _data.temp[i];}
		j=JSON.parse(d.code);
		j.sections.forEach(function(i){
			data.push({
				domains:i.domains,
				regexps:i.regexps,
				urlPrefixes:i.urlPrefixes,
				urls:i.urls,
				code:i.code
			});
		});
		if(i&&(c=_data.map[i])) {
			i=_data.ids.indexOf(i);
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
	if(c) updateItem(t,i,c.id,_('Style updated.')); else return r.message;
}
rt.listen('NewStyle',function(o){rt.post('GotStyle',newStyle(null,true).id);});
rt.listen('Reload',function(){_data.load();});
rt.listen('ParseCSS',parseCSS);
rt.listen('InstallStyle',function(o){
	if(!o.data) {
		if(_data.data.installFile) rt.post(o.source,{topic:'ConfirmInstall',data:_('Do you want to install this style?')});
	} else fetchURL(o.data.url,function(){
		o.data.status=this.status;o.data.code=this.responseText;parseCSS(o);
	});
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
