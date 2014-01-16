(function(){
var $=document.getElementById.bind(document),
		N=$('main'),L=$('sList'),O=$('overlay');
zip.workerScriptsPath='lib/zip.js/';
function getDate(t){var d=new Date();d.setTime(t);return d.toLocaleDateString();}
function getName(n){
	return n.name?n.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('labelNoName')+'</em>';
}

// Main options
function modifyItem(d,r){
	if(r) {
		if(r.message) d.querySelector('.message').innerHTML=r.message;
		var u=d.querySelector('.update');
		if(r.hideUpdate) u.classList.add('hide');
		else u.classList.remove('hide');
	}
}
function loadItem(o,r){
	var d=o.div,n=o.obj;
	d.innerHTML='<a class="name ellipsis" target=_blank></a>'
	+'<span class=updated>'+(n.updated?_('labelLastUpdated')+getDate(n.updated):'')+'</span>'
	+(n.metaUrl?'<a href=# data=update class=update>'+_('anchorUpdate')+'</a> ':'')
	+'<span class=message></span>'
	+'<div class=panel>'
		+'<button data=edit>'+_('buttonEdit')+'</button> '
		+'<button data=enable>'+(n.enabled?_('buttonDisable'):_('buttonEnable'))+'</button> '
		+'<button data=remove>'+_('buttonRemove')+'</button>'
	+'</div>';
	d.className=n.enabled?'':'disabled';
	setTimeout(function(){
		var a=d.firstChild;
		if(n.url) a.href=n.url;
		a.title=n.name;
		a.innerHTML=getName(n);
		modifyItem(d,r);
	},0);
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
			post({cmd:'GetStyle',data:ids[M.cur=i]},edit);
			break;
		case 'enable':
			e=map[ids[i]].obj;
			post({cmd:'EnableStyle',data:{id:e.id,data:!e.enabled}});
			break;
		case 'remove':
			post({cmd:'RemoveStyle',data:i});
			delete map[ids.splice(i,1)[0]];
			L.removeChild(p);
			break;
		case 'update':
			post({cmd:'CheckUpdate',data:ids[i]});
			break;
	}
};
$('bNew').onclick=function(){post({cmd:'NewStyle'},edit);};
$('bUpdate').onclick=function(){post({cmd:'CheckUpdateAll'});};
var panel=N;
function switchTo(D){
	panel.classList.add('hide');D.classList.remove('hide');panel=D;
}
var dialogs=[];
function showDialog(D,z){
	if(!dialogs.length) {
		O.classList.remove('hide');
		setTimeout(function(){O.classList.add('overlay');},1);
	}
	if(!z) z=dialogs.length?dialogs[dialogs.length-1].zIndex+1:1;
	dialogs.push(D);
	O.style.zIndex=D.style.zIndex=D.zIndex=z;
	D.classList.remove('hide');
	D.style.top=(window.innerHeight-D.offsetHeight)/2+'px';
	D.style.left=(window.innerWidth-D.offsetWidth)/2+'px';
}
function closeDialog(){
	dialogs.pop().classList.add('hide');
	if(dialogs.length) O.style.zIndex=dialogs.length>1?dialogs[dialogs.length-1]:1;
	else {
		O.classList.remove('overlay');
		setTimeout(function(){O.classList.add('hide');},500);
	}
}
O.onclick=function(){
	if(dialogs.length) (dialogs[dialogs.length-1].close||closeDialog)();
};
function confirmCancel(dirty){
	return !dirty||confirm(_('confirmNotSaved'));
}
initCSS();initI18n();

// Advanced
var A=$('advanced'),H=$('iImport');
$('cReload').onchange=function(){post({cmd:'SetOption',data:{key:'startReload',value:this.checked}});};
$('bAdvanced').onclick=function(){showDialog(A);};
$('aExport').onclick=function(){showDialog(X);xLoad();};
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
$('aImport').onclick=function(){
	var e=document.createEvent('MouseEvent');
	e.initMouseEvent('click',true,true,window,0,0,0,0,0,false,false,false,false,0,null);
	H.dispatchEvent(e);
};
A.close=$('aClose').onclick=closeDialog;

// Export
var X=$('export'),xL=$('xList'),xE=$('bExport'),xF=$('cFirefox');
function xLoad() {
	xL.innerHTML='';xE.disabled=false;xE.innerHTML=_('buttonExport');
	ids.forEach(function(i){
		var d=document.createElement('div');
		d.className='ellipsis';
		d.title=map[i].obj.name;
		d.innerHTML=getName(map[i].obj);
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
$('bSelect').onclick=function(){
	var c=xL.childNodes,v,i;
	for(i=0;i<c.length;i++) if(!c[i].classList.contains('selected')) break;
	v=i<c.length;
	for(i=0;i<c.length;i++) if(v) c[i].classList.add('selected'); else c[i].classList.remove('selected');
};
X.close=$('bClose').onclick=closeDialog;
xE.onclick=function(e){
	e.preventDefault();
	this.disabled=true;this.innerHTML=_('buttonExporting');
	var i,c=[];
	for(i=0;i<ids.length;i++)
		if(xL.childNodes[i].classList.contains('selected')) c.push(ids[i]);
	post({cmd:'ExportZip',data:c},exported);
};
function getFirefoxCSS(c){
	var d=[];
	['id','name','url','metaUrl','updateUrl','updated','enabled'].forEach(function(i){
		if(c[i]!=undefined) d.push('/* @'+i+' '+String(c[i]).replace(/\*/g,'+')+' */');
	});
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
					X.close();
				});
			}
		}
		adding=false;
	}
	function addFile(o){
		files.push(o);
		if(!adding) addFiles();
	}
	var writer=null,files=[],adding=false,xH=$('xHelper'),
			n,_n,names={},s={settings:o.settings};
	o.styles.forEach(function(c){
		var j=0;
		n=_n=c.name||'Noname';
		while(names[n]) n=_n+'_'+(++j);names[n]=1;
		if(xF.checked) addFile({name:n+'.user.css',content:getFirefoxCSS(c)});
		else addFile({name:n+'.json',content:JSON.stringify(c)});
	});
	addFile({name:'Stylish',content:JSON.stringify(s)});
	addFile({});	// finish adding files
}

// Style Editor
var M=$('editor'),S=$('mSection'),I=$('mName'),
    rD=$('mDomain'),rR=$('mRegexp'),rP=$('mUrlPrefix'),rU=$('mUrl'),
    eS=$('mSave'),eSC=$('mSaveClose'),T;
function edit(o){
	switchTo(M);M.css=o;M.data=o.data;
	S.innerHTML='';S.cur=0;S.dirty=false;
	eS.disabled=eSC.disabled=true;
	I.value=M.css.name;
	if(M.data.length) for(var i=0;i<M.data.length;i++) mAddItem(M.data[i].name);
	else addSection();
	mShow();
}
function mAddItem(n){
	var d=document.createElement('div');
	S.appendChild(d);
	d.innerText=n||S.childNodes.length;
	return d;
}
function split(t){return t.replace(/^\s+|\s+$/g,'').split(/\s*\n\s*/).filter(function(e){return e;});}
function mSection(r){
	if(M.data[S.cur]){
		if(S.dirty){
			S.dirty=false;
			M.data[S.cur].domains=split(rD.value);
			M.data[S.cur].regexps=split(rR.value);
			M.data[S.cur].urlPrefixes=split(rP.value);
			M.data[S.cur].urls=split(rU.value);
			M.data[S.cur].code=T.getValue();T.clearHistory();
		}
		if(r) S.childNodes[S.cur].classList.remove('selected');
	}
}
function mSave(e){
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
function mClose(){
	switchTo(N);
	loadName(L.childNodes[M.cur],map[ids[M.cur]]);
	M.cur=M.css=null;
}
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
$('mNew').onclick=addSection;
$('mDel').onclick=function(){
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
$('mRen').onclick=function(){
	renameSection(S.childNodes[S.cur]);
};
eS.onclick=mSave;
eSC.onclick=function(){mSave();mClose();};
M.close=$('mClose').onclick=function(){if(confirmCancel(!eS.disabled)) mClose();};
function ruleFocus(e){e.target.parentNode.style.width='50%';}
function ruleBlur(e){e.target.parentNode.style.width='';}
[rD,rR,rP,rU].forEach(function(i){i.onfocus=ruleFocus;i.onblur=ruleBlur;});
initEditor(function(o){T=o;},{onchange:S.markDirty});

// Load at last
var ids,map,post=initMessage({});
rt.listen('UpdateItem',function(r){
	if(!r.id) return;
	var m=map[r.id];
	if(!m) map[r.id]=m={};
	if(r.obj) m.obj=r.obj;
	switch(r.status){
		case 0:loadItem(m,r);break;
		case 1:ids.push(r.id);addItem(m);break;
		default:modifyItem(m.div,r);
	}
});
post({cmd:'GetData'},function(o){
	L.innerHTML='';ids=[];map={};
	o.styles.forEach(function(i){
		ids.push(i.id);addItem(map[i.id]={obj:i});
	});
	$('cReload').checked=o.settings.startReload;
	xF.checked=o.settings.firefoxCSS;
});
})();
