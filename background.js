(function(){
function older(a,b,c,d){
	a=a.split('.');b=b.split('.');c=d=0;
	while(a.length||b.length){
		c=parseInt(a.shift())||0;
		d=parseInt(b.shift())||0;
		if(c!=d) break;
	}
	return c<d;
}

// Check Maxthon version
(function(l,v){
	if(older(l,v)) {	// first use or new update
		localStorage.lastVersion=v;
		if(older(v,'4.1.1.1600'))	// early versions may have bugs
			br.tabs.newTab({url:'https://github.com/gera2ld/Stylish-mx/wiki/ObsoleteMaxthon',activate:true});
	}
})(localStorage.lastVersion||'',window.external.mxVersion);

function initDb(callback){
	var request=indexedDB.open('Stylish',1);
	request.onsuccess=function(e){db=request.result;if(callback) callback();};
	request.onerror=function(e){console.log('IndexedDB error: '+e.target.error.message);};
	request.onupgradeneeded=function(e){
		var r=e.target.result,o;
		// styles: id url name idUrl md5Url md5 updateUrl updated enabled data[name domains regexps urlPrefixes urls code]
		o=r.createObjectStore('styles',{keyPath:'id',autoIncrement:true});
		o.createIndex('idUrl','idUrl');	// should be unique or empty
	};
}
function upgradeData(callback){
	function finish(){if(callback) callback();}
	function upgrade04(){
		function dbError(t,e){console.log('Database error: '+e.message);}
		function toList(x){return x.split('\n').filter(function(x){return x;});}
		var d=openDatabase('Stylish','0.4','Stylish data',10*1024*1024);
		d.transaction(function(t){
			t.executeSql('SELECT id,name,url,updateUrl,updated,enabled FROM metas',[],function(t,r){
				function clear(){
					function executeSql(_t,r){
						var s=sql.shift();
						if(s) t.executeSql(s,[],executeSql,dbError);
						else finish();
					}
					var sql=[
						//'CREATE TABLE IF NOT EXISTS metas(id INTEGER PRIMARY KEY,name VARCHAR,url VARCHAR,metaUrl VARCHAR,updateUrl VARCHAR,updated INTEGER,enabled INTEGER)',
						//'CREATE TABLE IF NOT EXISTS styles(metaId INTEGER,name VARCHAR,domains TEXT,regexps TEXT,urlPrefixes TEXT,urls TEXT,code TEXT)',
						'DROP TABLE IF EXISTS metas',
						'DROP TABLE IF EXISTS styles',
					];
					executeSql();
				}
				function getStyle(){
					if(i<r.rows.length) {
						var o=r.rows.item(i);
						o={
							id:o.id,
							name:o.name,
							url:o.url,
							idUrl:o.url,
							updateUrl:o.updateUrl,
							updated:o.updated,
							enabled:o.enabled,
							data:[],
						};
						t.executeSql('SELECT name,domains,regexps,urlPrefixes,urls,code FROM styles WHERE metaId=?',[o.id],function(t,s){
							for(var j=0;j<s.rows.length;j++) {
								t=s.rows.item(j);
								t={
									name:t.name,
									domains:toList(t.domains),
									regexps:toList(t.regexps),
									urlPrefixes:toList(t.urlPrefixes),
									urls:toList(t.urls),
									code:t.code,
								};
								o.data.push(t);
							}
							t=db.transaction('styles','readwrite').objectStore('styles');
							t.put(o);i++;getStyle();
						},dbError);
					} else clear();
				}
				var i=0;getStyle();
			},dbError);
		});
	}
	var version=localStorage.version_storage||'',i=0,cur='0.5';
	if(older(version,cur)) {
		if(version=='0.4') upgrade04();
		localStorage.version_storage=0.5;
	} else finish();
}
function getMeta(o){
	return {
		id:o.id,
		name:o.name,
		url:o.url,
		md5Url:o.md5Url,
		updated:o.updated,
		enabled:o.enabled,
	};
}
function getMetas(d,src,callback){
	function loop(){
		var i=parseInt(d.shift());
		if(i) {
			var o=db.transaction('styles').objectStore('styles');
			o.get(i).onsuccess=function(e){
				var r=e.target.result;
				if(r) data.push(getMeta(r));
				loop();
			};
		} else callback(data);
	}
	var data=[];
	loop();
}
function newStyle(c){
	c=c||{};
	var r={
		url:c.url||'',
		name:c.name||_('labelNewStyle'),
		idUrl:c.idUrl||'',
		md5Url:c.md5Url||'',
		md5:c.md5||'',
		updateUrl:c.updateUrl||'',
		updated:c.updated||null,
		enabled:c.enabled!=undefined?c.enabled:1,
		data:[]
	};
	return r;
}
function enableStyle(d,src,callback){
	var o=db.transaction('styles','readwrite').objectStore('styles');
	o.get(d.id).onsuccess=function(e){
		var r=e.target.result,i;
		if(!r) return;r.enabled=d.data;
		o.put(r).onsuccess=function(e){	// store script without another transaction
			broadcast('updateStyle('+r.id+','+(r.enabled?1:-1)+')');
			updateItem({id:d.id,obj:getMeta(r),status:2});
		};
	};
	if(callback) callback();
}
function saveStyle(d,src,callback,m){
	function finish(){
		broadcast('updateStyle('+d.id+','+(d.enabled?1:-1)+')');
		updateItem(r);
		if(callback) callback(r);
	}
	var r={status:0,message:m||''},
			o=db.transaction('styles','readwrite').objectStore('styles');
	if(!d.id) {r.status=1;r.message=_('msgInstalled');}
	d=JSON.parse(JSON.stringify(d));
	o.put(d).onsuccess=function(e){
		r.id=d.id=e.target.result;r.obj=getMeta(d);finish();
	};
}
function removeStyle(id,src,callback){
	var o=db.transaction('styles','readwrite').objectStore('styles');
	o.delete(id);
	if(callback) callback();
}
function getStyle(id,src,callback){
	var o=db.transaction('styles').objectStore('styles');
	o.get(id).onsuccess=function(e){
		var r=e.target.result;callback(r);
	};
}
function exportZip(d,src,callback){
	function loop(){
		var i=d.shift();
		if(i) o.get(i).onsuccess=function(e){
			var r=e.target.result;
			if(r) s.push(r);loop();
		}; else {data.styles=s;callback(data);}
	}
	var data={settings:settings},o=db.transaction('styles').objectStore('styles'),s=[];
	loop();
}
function str2RE(s){return s.replace(/(\.|\?|\/)/g,'\\$1').replace(/\*/g,'.*?');}
function testURL(url,d){
	function testDomain(i){
		return RegExp('://(|[^/]*\\.)'+i.replace(/\./g,'\\.')+'/').test(url);
	}
	function testRegexp(i){
		return RegExp(i).test(url);
	}
	function testUrlPrefix(i){
		return url.slice(0,i.length)==i;
	}
	function testUrl(i){
		return i==url;
	}
	function test(k){
		if(f>0) return;
		var r=d[k],i,o;
		if(k=='domains') o=testDomain;
		else if(k=='regexps') o=testRegexp;
		else if(k=='urlPrefixes') o=testUrlPrefix;
		else if(k=='urls') o=testUrl;
		if(r.some(o)) {f=1;return;}
		if(r.length&&f<0) f=0;
	}
	var f=-1;
	test('domains');test('regexps');test('urlPrefixes');test('urls');
	if(f) return d.code;
}
function loadStyle(d,src,callback) {
	function finish(){
		callback({isApplied:settings.isApplied,styles:data});
	}
	function load(c){
		var o=null;
		c.data.forEach(function(s){
			var d=testURL(src.url,s);
			if(d!=null) {
				if(!o) o=[];
				if(d&&c.enabled) o.push(d);	// ignore null string
			}
		});
		if(o) o=o.join('\n');
		data.push([c.id,o]);
	}
	var data=[],o=db.transaction('styles').objectStore('styles');
	if(d) o.get(d).onsuccess=function(e){
		var r=e.target.result;
		if(r) load(r);
		finish();
	}; else o.openCursor().onsuccess=function(e){
		var r=e.target.result;
		if(r) {
			load(r.value);
			r.continue();
		} else finish();
	};
}
function getData(d,src,callback) {
	function getStyles(){
		var o=db.transaction('styles').objectStore('styles');
		o.openCursor().onsuccess=function(e){
			var r=e.target.result,v;
			if(r) {
				v=r.value;
				data.styles.push(getMeta(v));
				r.continue();
			} else callback(data);
		};
	}
	var data={settings:settings,styles:[]};
	getStyles();
}
function fetchURL(url, cb){
	var req=new XMLHttpRequest();
	if(cb) req.onloadend=cb;
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
function checkStyle(d,src,callback){
	var o=db.transaction('styles').objectStore('styles');
	o.index('idUrl').get(d).onsuccess=function(e){
		var r=e.target.result;
		if(r) r=getMeta(r);
		callback(r);
	};
}
function installStyle(o,src,callback){
	if(o) fetchURL(o.updateUrl,function(){
		o.status=this.status;o.code=this.responseText;parseCSS(o,src,callback);
	}); else callback(_('msgConfirm'));
}
function queryStyle(d,callback){
	var o=db.transaction('styles').objectStore('styles');
	function finish(r){
		if(!r) r=newStyle(d);
		if(callback) callback(r);
	}
	function queryUrl(){
		if(d.idUrl) o.index('idUrl').get(d.idUrl).onsuccess=function(e){
			finish(e.target.result);
		}; else finish();
	}
	function queryId(){
		if(d.id) o.get(d.id).onsuccess=function(e){
			var r=e.target.result;
			if(r) finish(r); else queryUrl();
		}; else queryUrl();
	}
	queryId();
}
function parseFirefoxCSS(d,src,callback){
	var i,p,m,r,code=d.code.replace(/\s+$/,''),data=[];d={};
	m=code.match(/^\/\* ==UserCSS==\s+([\s\S]*?)\s+==\/UserCSS== \*\/\s*/m);
	if(m) {
		m[1].replace(/@(\w+)\s+(.*?)\n/g,function(v,g1,g2){
			if(d[g1]===undefined) d[g1]=g2;
		});
		d=newStyle(d);code=code.slice(m[0].length);
	}
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
	if(!code) {
		queryStyle(d,function(c){
			allowedProps.forEach(function(i){if(d[i]) c[i]=d[i];});
			c.data=data;c.updated=Date.now();
			saveStyle(c,src,callback,_('msgUpdated'));
		});
	} else
		callback({status:-1,message:_('msgErrorParsing')});
}
function parseCSS(d,src,callback){
	var j,s=[];
	if(d.status!=200) {
		callback({id:d.id,status:-1,message:_('msgErrorFetchingStyle')});
		return;
	}
	try{
		j=JSON.parse(d.code);
	}catch(e){
		callback({id:d.id,status:-1,message:_('msgErrorParsing')});
		return;
	}
	j.sections.forEach(function(i){
		s.push({
			name:i.name||'',
			domains:i.domains.concat(),
			regexps:i.regexps.concat(),
			urlPrefixes:i.urlPrefixes.concat(),
			urls:i.urls.concat(),
			code:i.code||''
		});
	});
	queryStyle(d,function(c){
		if(!c.id) c.name=j.name;
		c.data=s;c.updated=Date.now();c.md5=d.md5;
		//c.updateUrl=j.updateUrl;
		saveStyle(c,src,callback,_('msgUpdated'));
	});
}
function parseJSON(d,src,callback){
	try{
		d=JSON.parse(d.code);
		var c=newStyle(d);
		d.data.forEach(function(i){
			c.data.push({
				name:i.name||'',
				domains:i.domains.concat(),
				regexps:i.regexps.concat(),
				urlPrefixes:i.urlPrefixes.concat(),
				urls:i.urls.concat(),
				code:i.code||'',
			});
		});
		saveStyle(c,src,callback,_('msgUpdated'));
	}catch(e){
		console.log(e);
		callback({status:-1,message:_('msgErrorParsing')});
	}
}
var _update={};
function checkUpdateO(o){
	if(_update[o.id]) return;_update[o.id]=1;
	function finish(){delete _update[o.id];}
	var r={id:o.id,updating:1,status:2};
	if(o.md5Url) {
		r.message=_('msgCheckingForUpdate');updateItem(r);
		fetchURL(o.md5Url,function(){
			r.message=_('msgErrorFetchingUpdateInfo');
			delete r.updating;
			if(this.status==200) try{
				var md5=this.responseText;
				if(o.md5!=md5) {
					if(o.updateUrl) {
						r.message=_('msgUpdating');
						r.updating=1;
						fetchURL(o.updateUrl,function(){
							parseCSS({status:this.status,id:o.id,md5:md5,updated:d,code:this.responseText});
						});
					} else r.message='<span class=new>'+_('msgNewVersion')+'</span>';
				} else r.message=_('msgNoUpdate');
			} catch(e) {console.log(e);}
			updateItem(r);finish();
		});
	} else finish();
}
function checkUpdate(id,src,callback){
	var o=db.transaction('styles').objectStore('styles');
	o.get(id).onsuccess=function(e){
		var r=e.target.result;
		if(r) checkUpdateO(r);
		if(callback) callback();
	};
}
function checkUpdateAll(o,src,callback){
	var o=db.transaction('styles').objectStore('styles');
	o.openCursor().onsuccess=function(e){
		var r=e.target.result;
		if(!r) {
			if(callback) callback();
			return;
		}
		checkUpdateO(r.value);
		r.continue();
	};
}

function getOption(k,src,callback){
	var v=localStorage.getItem(k)||'',r=true;
	try{
		v=JSON.parse(v);
		settings[k]=v;
	}catch(e){
		v=null;
		r=false;
	}
	if(callback) callback(v);
	return r;
}
function setOption(o,src,callback){
	if(!o.check||(o.key in settings)) {
		localStorage.setItem(o.key,JSON.stringify(o.value));
		settings[o.key]=o.value;
	}
	if(callback) callback(o.value);
}
function initSettings(){
	function init(k,v){
		if(!getOption(k)) setOption({key:k,value:v});
	}
	init('isApplied',true);
	init('startReload',true);
	init('firefoxCSS',false);
}
function reinit(){
	var f=function(f){
		var c=0;
		if(!f) f=window.delayedReload=function(){
			c++;
			setTimeout(function(){
				if(!--c) location.reload();
			},1000);
		};
		f();
	};
	f='('+f.toString()+')(window.delayedReload)';
	f='(function(s){var o=document.createElement("script");o.innerHTML=s;document.body.appendChild(o);document.body.removeChild(o);})('+JSON.stringify(f)+')';
	broadcast(f);
}
function updateItem(r){rt.post('UpdateItem',r);}

var db,settings={};
initSettings();
initDb(function(){
	upgradeData(function(){
		rt.listen('Background',function(o){
			/*
			 * o={
			 * 	cmd: String,
			 * 	src: {
			 * 		id: String,
			 * 		url: String,
			 * 	},
			 * 	callback: String,
			 * 	data: Object
			 * }
			 */
			function callback(d){
				rt.post(o.src.id,{cmd:'Callback',data:{id:o.callback,data:d}});
			}
			var maps={
				GetData:getData,
				GetOption:getOption,
				SetOption:setOption,
				GetStyle:getStyle,	// for user edit
				ParseFirefoxCSS:parseFirefoxCSS,
				ParseJSON:parseJSON,
				EnableStyle:enableStyle,
				RemoveStyle:removeStyle,
				NewStyle:function(o,src,callback){callback(newStyle());},
				SaveStyle:saveStyle,
				CheckUpdate:checkUpdate,
				CheckUpdateAll:checkUpdateAll,
				CheckStyle:checkStyle,
				InstallStyle:installStyle,
				ExportZip:exportZip,
				LoadStyle:loadStyle,
				GetMetas:getMetas,
				/*
				GetMetas:function(ids,src,callback){	// for popup menu
					var d=[];
					ids.forEach(function(i){d.push(metas[i]);});
					callback(d);
				},
				*/
			},f=maps[o.cmd];
			if(f) f(o.data,o.src,callback);
			return true;
		});
		rt.icon.setIconImage('icon'+(settings.isApplied?'':'w'));
		if(settings.startReload) reinit();
	});
});

(function(url){
	var l=url.length,tids={};
	br.onBrowserEvent=function(o){
		var t,tab;
		switch(o.type){
			case 'TAB_SWITCH':
				tab=br.tabs.getCurrentTab();
				if(tab.url.slice(0,l)==url) {
					for(var i=0;i<br.tabs.length;i++) {
						t=br.tabs.getTab(i);
						if(t.id!=tab.id&&t.url.slice(0,l)==url) {
							tab.close();t.activate();
						}
					}
				}
		}
	};
})(rt.getPrivateUrl()+'options.html');
})();
