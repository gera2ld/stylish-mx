(function(){
var $=document.querySelector.bind(document),L=$('#sList'),cur=null,C=$('.content');
zip.workerScriptsPath='lib/zip.js/';
initI18n();
function getDate(t){var d=new Date();d.setTime(t);return d.toLocaleDateString();}
function getName(d,n){
	d.title=n||'';
	d.innerHTML=n?n.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('labelNoName')+'</em>';
}

// Main options
function modifyItem(r){
	var o=map[r.id],d=o.div,n=o.obj;
	if(r.message) d.querySelector('.message').innerHTML=r.message;
	d.className=n.enabled?'':'disabled';
	var a=d.querySelector('.update');
	if(a) a.disabled=r.updating;
	a=d.querySelector('.name');
	if(n.url) a.href=n.url;
	getName(a,n.name);
	a=d.querySelector('.enable');
	a.innerHTML=n.enabled?_('buttonDisable'):_('buttonEnable');
}
function loadItem(o,r){
	var d=o.div,n=o.obj;if(!r) r={id:n.id};
	d.innerHTML='<a class="name ellipsis" target=_blank></a>'
	+'<span class=updated>'+(n.updated?_('labelLastUpdated')+getDate(n.updated):'')+'</span><br>'
	+'<div class=panel>'
		+'<button data=edit>'+_('buttonEdit')+'</button> '
		+'<button data=enable class=enable></button> '
		+'<button data=remove>'+_('buttonRemove')+'</button> '
		+(n.md5Url?'<button data=update class=update>'+_('buttonUpdate')+'</button> ':'')
		+'<span class=message></span>'
	+'</div>';
	setTimeout(function(){modifyItem(r);},0);
}
function addItem(o){
	o.div=document.createElement('div');
	loadItem(o);
	L.appendChild(o.div);
}
L.onclick=function(e){
	var o=e.target,d=o.getAttribute('data'),p;
	if(!d) return;
	e.preventDefault();
	for(p=o;p&&p.parentNode!=L;p=p.parentNode);
	var i=Array.prototype.indexOf.call(L.childNodes,p);
	switch(d){
		case 'edit':
			post({cmd:'GetStyle',data:ids[i]},edit);
			break;
		case 'enable':
			e=map[ids[i]].obj;
			post({cmd:'EnableStyle',data:{id:e.id,data:!e.enabled}});
			break;
		case 'remove':
			post({cmd:'RemoveStyle',data:ids[i]});
			delete map[ids.splice(i,1)[0]];
			L.removeChild(p);
			break;
		case 'update':
			post({cmd:'CheckUpdate',data:ids[i]});
			break;
	}
};
$('#bNew').onclick=function(){post({cmd:'NewStyle'},edit);};
$('#bUpdate').onclick=function(){post({cmd:'CheckUpdateAll'});};
function switchTab(e){
	var h,o;
	if(e) {
		e=e.target;h=e.getAttribute('href').substr(1);
	} else {
		h=location.hash||'#Installed';
		h=h.substr(1);
		e=$('#sm'+h);
	}
	o=C.querySelector('#tab'+h);
	if(!o) return switchTab({target:$('#smInstalled')});
	if(cur) {
		cur.menu.classList.remove('selected');
		cur.tab.classList.add('hide');
	}
	cur={menu:e,tab:o};
	e.classList.add('selected');
	o.classList.remove('hide');
	switch(h) {	// init
		case 'Settings':xLoad();break;
	}
}
$('.sidemenu').onclick=switchTab;
function confirmCancel(dirty){
	return !dirty||confirm(_('confirmNotSaved'));
}

// Advanced
var H=$('#iImport');
$('#cReload').onchange=function(){post({cmd:'SetOption',data:{key:'startReload',value:this.checked}});};
H.onchange=function(e){
	zip.createReader(new zip.BlobReader(e.target.files[0]),function(r){
		r.getEntries(function(e){
			function getFiles(){
				var i=e.shift();
				if(i) i.getData(writer,function(t){
					post({cmd:/\.json$/.test(i.filename)?'ParseJSON':'ParseFirefoxCSS',data:{code:t}});
					count++;
					getFiles();
				}); else {
					alert(_('msgImported',[count]));
					location.reload();
				}
			}
			var i,s={},writer=new zip.TextWriter(),count=0;
			for(i=0;i<e.length;i++) if(e[i].filename=='Stylish') break;
			if(i<e.length) e.splice(i,1)[0].getData(writer,function(t){
				try{
					s=JSON.parse(t);
				}catch(e){
					s={};
					console.log('Error parsing Stylish configuration.');
				}
				getFiles();
			}); else getFiles();
		});
	});
};
$('#bImport').onclick=function(){
	var e=document.createEvent('MouseEvent');
	e.initMouseEvent('click',true,true,window,0,0,0,0,0,false,false,false,false,0,null);
	H.dispatchEvent(e);
};

// Export
var xL=$('#xList'),xE=$('#bExport'),xF=$('#cFirefox');
function xLoad() {
	xL.innerHTML='';xE.disabled=false;
	ids.forEach(function(i){
		var d=document.createElement('div');
		d.className='ellipsis selected';
		getName(d,map[i].obj.name);
		xL.appendChild(d);
	});
}
xF.parentNode.title=_('hintFirefoxCSS');
xF.onchange=function(){post({cmd:'SetOption',data:{key:'firefoxCSS',value:this.checked}});};
xL.onclick=function(e){
	var t=e.target;
	if(t.parentNode!=this) return;
	t.classList.toggle('selected');
};
$('#bSelect').onclick=function(){
	var c=xL.childNodes,v,i;
	for(i=0;i<c.length;i++) if(!c[i].classList.contains('selected')) break;
	v=i<c.length;
	for(i=0;i<c.length;i++) if(v) c[i].classList.add('selected'); else c[i].classList.remove('selected');
};
xE.onclick=function(e){
	e.preventDefault();
	xE.disabled=true;
	var i,c=[];
	for(i=0;i<ids.length;i++)
		if(xL.childNodes[i].classList.contains('selected')) c.push(ids[i]);
	post({cmd:'ExportZip',data:c},exported);
};
function getFirefoxCSS(c){
	var d=[];
	allowedProps.forEach(function(i){
		if(c[i]!=undefined) d.push('@'+i+' '+String(c[i]).replace(/\*/g,'+'));
	});
	if(d.length) {
		d.unshift('/* ==UserCSS==');
		d.push('==/UserCSS== */');
		d=[d.join('\n')];
	}
	c.data.forEach(function(i){
		var p=[];
		i.domains.forEach(function(j){p.push('domain('+JSON.stringify(j)+')');});
		i.regexps.forEach(function(j){p.push('regexp('+JSON.stringify(j)+')');});
		i.urlPrefixes.forEach(function(j){p.push('url-prefix('+JSON.stringify(j)+')');});
		i.urls.forEach(function(j){p.push('url('+JSON.stringify(j)+')');});
		d.push('@-moz-document '+p.join(',\n')+'{\n'+i.code+'\n}\n');
	});
	return d.join('\n');
}
function exported(o){
	function addFiles(){
		if(!writer) {	// create writer
			zip.createWriter(new zip.BlobWriter(),function(w){writer=w;addFiles();});
			return;
		}
		adding=true;
		var i=files.shift();
		if(i) {
			if(i.name) {	// add file
				writer.add(i.name,new zip.TextReader(i.content),addFiles);
				return;
			} else {	// finished
				writer.close(function(b){
					var u=URL.createObjectURL(b),e=document.createEvent('MouseEvent');
					e.initMouseEvent('click',true,true,window,0,0,0,0,0,false,false,false,false,0,null);
					xH.href=u;
					xH.download='styles.zip';
					xH.dispatchEvent(e);
					writer=null;
					URL.revokeObjectURL(u);
					xH.removeAttribute('href');
					xH.removeAttribute('download');
					xE.disabled=false;
				});
			}
		}
		adding=false;
	}
	function addFile(o){
		files.push(o);
		if(!adding) addFiles();
	}
	var writer=null,files=[],adding=false,xH=$('#xHelper'),
			n,_n,names={},s={settings:o.settings};
	o.styles.forEach(function(c){
		var j=0;
		n=_n=c.name||'NoName';
		while(names[n]) n=_n+'_'+(++j);names[n]=1;
		if(xF.checked) addFile({name:n+'.user.css',content:getFirefoxCSS(c)});
		else addFile({name:n+'.css.json',content:JSON.stringify(c)});
	});
	addFile({name:'Stylish',content:JSON.stringify(s)});
	addFile({});	// finish adding files
}

// Style Editor
var M=$('#wndEditor'),S=$('#mSection'),I=$('#mName'),
    rD=$('#mDomain'),rR=$('#mRegexp'),rP=$('#mUrlPrefix'),rU=$('#mUrl'),
    eS=$('#mSave'),eSC=$('#mSaveClose'),R=$('.rules'),T,cR=null;
function edit(o){
	M.classList.remove('hide');
	M.css=o;M.data=o.data;
	S.innerHTML='';S.cur=0;S.dirty=false;
	eS.disabled=eSC.disabled=true;
	I.value=o.name;
	if(M.data.length) {
		for(var i=0;i<M.data.length;i++) mAddItem(M.data[i].name);
		mShow();
	} else addSection();
}
function mAddItem(n){
	var d=document.createElement('div');
	S.appendChild(d);
	d.innerText=n||S.childNodes.length;
	return d;
}
function toList(x){return x.split('\n').filter(function(x){return x;});}
function mSection(r){
	if(M.data[S.cur]){
		if(S.dirty){
			S.dirty=false;
			M.data[S.cur].domains=toList(rD.value);
			M.data[S.cur].regexps=toList(rR.value);
			M.data[S.cur].urlPrefixes=toList(rP.value);
			M.data[S.cur].urls=toList(rU.value);
			M.data[S.cur].code=T.getValue();T.clearHistory();
		}
		if(r) S.childNodes[S.cur].classList.remove('selected');
	}
}
function mSave(){
	M.css.name=I.value;
	mSection();
	eS.disabled=eSC.disabled=true;
	post({cmd:'SaveStyle',data:M.css});
}
function mShow(){
	var c=S.childNodes[S.cur];S.dirty=true;
	if(c) {
		S.childNodes[S.cur].classList.add('selected');
		rD.value=M.data[S.cur].domains.join('\n');
		rR.value=M.data[S.cur].regexps.join('\n');
		rP.value=M.data[S.cur].urlPrefixes.join('\n');
		rU.value=M.data[S.cur].urls.join('\n');
		T.setValueAndFocus(M.data[S.cur].code);
	} else T.setValueAndFocus(rD.value=rR.value=rP.value=rU.value='');
	T.clearHistory();S.dirty=false;
}
function mClose(){M.classList.add('hide');M.css=null;}
function bindChange(e,f){e.forEach(function(i){i.onchange=f;});}
M.markDirty=function(){eS.disabled=eSC.disabled=false;};
S.markDirty=function(){if(S.dirty) return;S.dirty=true;M.markDirty();};
bindChange([rD,rR,rP,rU],S.markDirty);
bindChange([I],M.markDirty);
S.onclick=function(e){
	var t=e.target;
	if(t.parentNode!=this) return;
	if(!t.classList.contains('selected')) {
		mSection(1);
		S.cur=Array.prototype.indexOf.call(S.childNodes,t);
		mShow();
	} else renameSection(t);
};
function addSection(){
	var d={name:'',domains:[],regexps:[],urlPrefixes:[],urls:[],code:''};
	mSection(1);
	S.cur=M.data.length;
	M.data.push(d);
	mAddItem();
	mShow();
}
function renameSection(t){
	if(!t) return;
	var o=prompt(_('msgRename',[t.innerText]));
	if(o!=null) {
		M.data[S.cur].name=o;
		t.innerText=o||S.cur+1;
		M.markDirty();
	}
}
$('#mNew').onclick=addSection;
$('#mDel').onclick=function(){
	if(M.data.length>1) {
		M.data.splice(S.cur,1);
		S.removeChild(S.lastChild);
		for(var i=S.cur;i<M.data.length;i++) {
			S.childNodes[i].innerText=M.data[i].name||i+1;
		}
		if(S.cur==M.data.length) S.cur--;
		M.markDirty();mShow();
	}
};
$('#mRen').onclick=function(){
	renameSection(S.childNodes[S.cur]);
};
eS.onclick=mSave;
eSC.onclick=function(){mSave();mClose();};
M.close=$('#mClose').onclick=function(){if(confirmCancel(!eS.disabled)) mClose();};
function ruleFocus(e){
	if(cR&&(!e||e.type=='blur'&&cR===e.target.parentNode)) {
		cR.classList.remove('focus');cR=null;
	}
	if(e.type=='focus') {
		cR=e.target.parentNode;cR.classList.add('focus');
		R.classList.add('focus');
	} else R.classList.remove('focus');
}
R.addEventListener('focus',ruleFocus,true);
R.addEventListener('blur',ruleFocus,true);
initEditor(function(o){T=o;},{onchange:S.markDirty});
M.addEventListener('keydown',function(e){
	switch(e.keyCode) {
		case 83:
			if(e.ctrlKey)
				mSave();	// C-S
			break;
		case 27:
			M.close();	// Esc
			break;
	}
},false);

// Load at last
var ids,map,post=initMessage({});
rt.listen('UpdateItem',function(r){
	if(!r.id) return;
	var m=map[r.id];
	if(!m) map[r.id]=m={};
	if(r.obj) m.obj=r.obj;
	switch(r.status){
		case 0:loadItem(m,r);break;
		case 1:ids.push(r.id);addItem(m);if(M.css&&!M.css.id) M.css.id=r.id;break;
		default:modifyItem(r);
	}
});
post({cmd:'GetData'},function(o){
	L.innerHTML='';ids=[];map={};
	o.styles.forEach(function(i){
		ids.push(i.id);addItem(map[i.id]={obj:i});
	});
	$('#cReload').checked=o.settings.startReload;
	xF.checked=o.settings.firefoxCSS;
	switchTab();
});
switchTab();
})();
