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

/* ===============Data format 0.4==================
 * Database: Stylish
 * metas: {
 * 		id: Auto
 * 		name: String
 * 		url: String
 * 		metaUrl: String
 * 		updateUrl: String
 * 		updated: Integer
 * 		enabled: 0|1
 * }
 * styles: {
 * 		metaId: Integer
 * 		name: String
 * 		domains: List
 * 		regexps: List
 * 		urlPrefixes: List
 * 		urls: List
 * 		code: String
 * }
 */
function dbError(t,e){
	var n=window.webkitNotifications.createNotification('','Error - Violentmonkey','Database error >>> '+e.message);
	n.show();
	console.log('Database error: '+e.message);
}
function initDatabase(callback){
	db=openDatabase('Stylish','0.4','Stylish data',10*1024*1024);
	db.transaction(function(t){
		function executeSql(_t,r){
			var s=sql.shift();
			if(s) t.executeSql(s,[],executeSql,dbError);
			else if(callback) callback();
		}
		var count=0,sql=[
			'CREATE TABLE IF NOT EXISTS metas(id INTEGER PRIMARY KEY,name VARCHAR,url VARCHAR,metaUrl VARCHAR,updateUrl VARCHAR,updated INTEGER,enabled INTEGER)',
			'CREATE TABLE IF NOT EXISTS styles(metaId INTEGER,name VARCHAR,domains TEXT,regexps TEXT,urlPrefixes TEXT,urls TEXT,code TEXT)',
		];
		executeSql();
	});
}
function upgradeData(callback){
	function finish(){if(callback) callback();}
	function upgrade04(){
		var k,v;
		while(k=localStorage.key(i)) {
			if(k in settings) {i++;continue;}
			v=localStorage.getItem(k);
			localStorage.removeItem(k);
			if(/^us:/.test(k)) {
				o=JSON.parse(v);
				if(/^https?:/.test(o.id)&&!o.url) o.url=o.id;
				delete o.id;
				if(o.updated&&o.updated<1e12) o.updated*=1000;
				saveStyle(o,null,upgrade04);
				return;
			}
		}
		localStorage.version_storage=0.4;
		finish();
	}
	var version=localStorage.version_storage||'',i=0;
	if(older(version,'0.4')) upgrade04();
	else finish();
}
function getMeta(o){
	return {
		id:o.id,
		name:o.name,
		url:o.url,
		metaUrl:o.metaUrl,
		updateUrl:o.updateUrl,
		updated:o.updated,
		enabled:o.enabled,
	};
}
function getSection(o){
	function notEmpty(i){return i;}
	return {
		name:o.name||'',
		domains:o.domains.split('\n').filter(notEmpty),
		regexps:o.regexps.split('\n').filter(notEmpty),
		urlPrefixes:o.urlPrefixes.split('\n').filter(notEmpty),
		urls:o.urls.split('\n').filter(notEmpty),
		code:o.code||'',
	};
}
function initStyles(callback){
	ids=[];metas={};
	db.readTransaction(function(t){
		t.executeSql('SELECT * FROM metas',[],function(t,r){
			var i,o;
			for(i=0;i<r.rows.length;i++) {
				o=r.rows.item(i);
				ids.push(o.id);metas[o.id]=getMeta(o);
			}
			if(callback) callback();
		});
	});
}
function newStyle(c){
	c=c||{};
	var r={
		name:c.name||_('labelNewStyle'),
		url:c.url,
		id:c.id,
		metaUrl:c.metaUrl,
		updated:c.updated||null,
		enabled:c.enabled!=undefined?c.enabled:1,
		data:[]
	};
	return r;
}
function enableStyle(o,src,callback){
	var s=metas[o.id];if(!s) return;
	s.enabled=o.data?1:0;
	db.transaction(function(t){
		t.executeSql('UPDATE metas SET enabled=? WHERE id=?',[s.enabled,o.id],function(t,r){
			if(r.rowsAffected) {
				if(s.enabled) t.executeSql('SELECT * FROM styles WHERE metaId=?',[o.id],function(t,r){
					var d=[],i;
					if(r.rows.length) for(i=0;i<r.rows.length;i++) d.push(getSection(r.rows.item(i)));
				});
				broadcast('updateStyle('+o.id+','+(s.enabled?1:-1)+')');
				updateItem({id:o.id,status:2});
				if(callback) callback();
			}
		},dbError);
	});
}
function saveStyle(o,src,callback,m){
	function finish(){
		if(o.data) {
			broadcast('updateStyle('+o.id+','+(o.enabled?1:-1)+')');
			delete o.data;
		}
		updateItem(s);
		if(callback) callback(o);
	}
	var s={status:0,message:m==null?_('msgUpdated'):m};
	db.transaction(function(t){
		var d=[];
		d.push(parseInt(o.id)||null);
		d.push(o.name);
		d.push(o.url);
		d.push(o.metaUrl);
		d.push(o.updateUrl);
		d.push(o.updated||0);
		d.push(o.enabled);
		t.executeSql('REPLACE INTO metas(id,name,url,metaUrl,updateUrl,updated,enabled) VALUES(?,?,?,?,?,?,?)',d,function(t,r){
			s.id=o.id=r.insertId;
			if(!(o.id in metas)) {ids.push(o.id);s.status=1;s.message=_('msgInstalled');}
			s.obj=metas[o.id]=o;
			if(o.data) t.executeSql('DELETE FROM styles WHERE metaId=?',[o.id],function(t,r){
				var i=0;
				function addSection(){
					var d=[],r=o.data[i++];
					if(r) {
						d.push(o.id);
						d.push(r.name||'');
						d.push(r.domains.join('\n'));
						d.push(r.regexps.join('\n'));
						d.push(r.urlPrefixes.join('\n'));
						d.push(r.urls.join('\n'));
						d.push(r.code);
						t.executeSql('INSERT INTO styles(metaId,name,domains,regexps,urlPrefixes,urls,code) VALUES(?,?,?,?,?,?,?)',d,addSection,dbError);
					} else finish();
				}
				addSection();
			},dbError); else finish();
		},dbError);
	});
}
function removeStyle(i,src,callback){
	var id=ids.splice(i,1)[0];
	db.transaction(function(t){
		t.executeSql('DELETE FROM metas WHERE id=?',[id],function(t,r){
			t.executeSql('DELETE FROM styles WHERE metaId=?',[id],function(t,r){
				delete metas[id];
				broadcast('updateStyle('+id+')');
			},dbError);
		},dbError);
	});
}
function getStyle(id,src,callback,t){
	function get(t){
		t.executeSql('SELECT * FROM styles WHERE metaId=?',[id],function(t,r){
			var o=metas[id];
			if(o) {
				o=getMeta(o);o.data=[];
				for(i=0;i<r.rows.length;i++) o.data.push(getSection(r.rows.item(i)));
				if(callback) callback(o);
			}
		});
	}
	if(t) get(t); else db.readTransaction(get);
}
function getStyles(ids,src,callback){
	var d=[];
	db.readTransaction(function(t){
		function loop(){
			var id=ids.shift();
			if(id) getStyle(id,src,function(o){
				d.push(o);loop();
			},t); else callback(d);
		}
		loop();
	});
}
function exportZip(o,src,callback){
	var data={settings:settings};
	getStyles(o,src,function(s){
		data.styles=s;callback(data);
	});
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
function loadStyle(o,src,callback) {
	function loaded(t,r){
		var i,v,s,d,o,c={};
		for(i=0;i<r.rows.length;i++) {
			v=r.rows.item(i);
			s=getSection(v);
			d=testURL(src.url,s);
			if(d!=null) {
				o=c[v.metaId];
				if(!o) o=c[v.metaId]=[];
				if(d&&metas[v.metaId].enabled) o.push(d);	// ignore null string
			}
		}
		for(i in c) c[i]=c[i].join('\n');
		callback({isApplied:settings.isApplied,styles:c});
	}
	db.readTransaction(function(t){
		if(o) t.executeSql('SELECT * FROM styles WHERE metaId=?',[o],loaded,dbError);
		else t.executeSql('SELECT * FROM styles ORDER BY metaId',[],loaded,dbError);
	});
}
function getData(d,src,callback) {
	var data={styles:[],settings:settings};
	ids.forEach(function(i){
		var o=metas[i];
		data.styles.push(o);
	});
	if(callback) callback(data);
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
	db.readTransaction(function(t){
		t.executeSql('SELECT * FROM metas WHERE url=?',[d],function(t,r){
			var o=null;
			if(r.rows.length) o=getMeta(r.rows.item(0));
			callback(o);
		},dbError);
	});
}
function installStyle(o,src,callback){
	if(o) fetchURL(o.updateUrl,function(){
		o.status=this.status;o.code=this.responseText;parseCSS(o,src,callback);
	}); else callback(_('msgConfirm'));
}
function parseFirefoxCSS(d,src,callback){
	var c=null,i,p,m,r,code=d.code.replace(/\s+$/,''),data=[];
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
	if(!code) {
		c=metas[d.id];
		if(!c) c=newStyle(d);
		else for(i in d) c[i]=d[i];
		c.data=data;
		saveStyle(c,src,callback);
	} else
		callback({status:-1,message:_('msgErrorParsing')});
}
function parseCSS(o,src,callback){
	var j,c=null,d=[];
	if(o.status!=200) {
		callback({id:o.id,status:-1,message:_('msgErrorFetchingStyle')});
		return;
	}
	try{
		j=JSON.parse(o.code);
	}catch(e){
		console.log(e);
		callback({id:o.id,status:-1,message:_('msgErrorParsing')});
		return;
	}
	j.sections.forEach(function(i){
		d.push({
			name:i.name||'',
			domains:i.domains,
			regexps:i.regexps,
			urlPrefixes:i.urlPrefixes,
			urls:i.urls,
			code:i.code
		});
	});
	c=o.id&&metas[o.id];
	if(!c) {
		o.name=j.name;
		c=newStyle(o);
	} else c.updated=o.updated;
	c.data=d;
	c.updateUrl=j.updateUrl;
	saveStyle(c,src,callback);
}
function parseJSON(o,src,callback){
	try{
		o=JSON.parse(o.code);
		var c=newStyle(o);
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
		saveStyle(c,src,callback);
	}catch(e){
		console.log(e);
		callback({status:-1,message:_('msgErrorParsing')});
	}
}
var _update={};
function checkUpdateO(o){
	if(_update[o.id]) return;_update[o.id]=1;
	function finish(){delete _update[o.id];}
	var r={id:o.id,hideUpdate:1,status:2};
	if(o.metaUrl) {
		r.message=_('msgCheckingForUpdate');updateItem(r);
		fetchURL(o.metaUrl,function(){
			r.message=_('msgErrorFetchingUpdateInfo');
			delete r.hideUpdate;
			if(this.status==200) try{
				var d=new Date(JSON.parse(this.responseText).updated).getTime();
				if(!o.updated||o.updated<d) {
					if(o.updateUrl) {
						r.message=_('msgUpdating');
						r.hideUpdate=1;
						fetchURL(o.updateUrl,function(){
							parseCSS({status:this.status,id:o.id,updated:d,code:this.responseText});
						});
					} else r.message='<span class=new>'+_('msgNewVersion')+'</span>';
				} else r.message=_('msgNoUpdate');
			} catch(e) {console.log(e);}
			updateItem(r);finish();
		});
	} else finish();
}
function checkUpdate(id,src,callback){
	checkUpdateO(metas[id]);
}
function checkUpdateAll(o,src,callback){
	ids.forEach(function(i){
		var o=metas[i];
		if(o.metaUrl) checkUpdateO(o);
	});
}

function getOption(k,src,callback){
	var v=localStorage.getItem(k)||'';
	try{
		v=JSON.parse(v);
	}catch(e){
		return false;
	}
	settings[k]=v;
	if(callback) callback(v);
	return true;
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
function updateItem(r){
	r.obj=metas[r.id];
	rt.post('UpdateItem',r);
}

var db,settings={},ids,metas;
initSettings();
initDatabase(function(){
	initStyles(function(){
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
					LoadStyle:loadStyle,
					ParseFirefoxCSS:parseFirefoxCSS,
					CheckStyle:checkStyle,
					InstallStyle:installStyle,
					ParseJSON:parseJSON,
					GetMetas:function(ids,src,callback){	// for popup menu
						var d=[];
						ids.forEach(function(i){d.push(metas[i]);});
						callback(d);
					},
					EnableStyle:enableStyle,
					RemoveStyle:removeStyle,
					GetOption:getOption,
					SetOption:setOption,
					NewStyle:function(o,src,callback){callback(newStyle());},
					GetStyle:getStyle,	// for user edit
					SaveStyle:function(o,src,callback){saveStyle(o,src,callback,'');},
					CheckUpdate:checkUpdate,
					CheckUpdateAll:checkUpdateAll,
					ExportZip:exportZip,
				},f=maps[o.cmd];
				if(f) f(o.data,o.src,callback);
				return true;
			});
			rt.icon.setIconImage('icon'+(settings.isApplied?'':'w'));
			if(settings.startReload) reinit();
		});
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
