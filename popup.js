function $(i){return document.getElementById(i);}
var P=$('popup'),A=$('astyles'),tab,pR=P.querySelector('.expand'),
	pT=P.querySelector('td'),pB=P.querySelector('.expanda'),
	cT=A.querySelector('td'),cB=A.querySelector('.expanda');
function loadItem(d,c){
	if(c) {
		d.firstChild.innerText=d.symbol;
		d.classList.remove('disabled');
	} else {
		d.firstChild.innerText='';
		d.classList.add('disabled');
	}
}
function addItem(h,c){
	var d=document.createElement('div');
	d.innerHTML='<span></span>'+h;
	if('title' in c) {
		d.title=typeof c.title=='string'?c.title:h;
		delete c.title;
	}
	d.className='ellipsis';
	c.holder.appendChild(d);
	if('symbol' in c) d.firstChild.innerText=c.symbol;
	else if('data' in c) c.symbol='✓';
	for(h in c) d[h]=c[h];
	if('data' in c) loadItem(d,c.data);
	return d;
}
function menuStyle(i) {
	var c=getItem('us:'+i),n=c.name?c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('Null name')+'</em>';
	addItem(n,{holder:pB,data:c.enabled,title:c.name,onclick:function(){
		loadItem(this,c.enabled=!c.enabled);rt.post('EnableStyle',{id:i,data:c.enabled});
	}});
}
var cur=null,_title;
function alterStyle(i){
	var d=addItem(i,{holder:cB,data:i==_title,title:true,onclick:function(){
		if(cur) loadItem(cur,false);loadItem(cur=this,true);
		if(tab) rt.post(tab,{topic:'AlterStyle',data:i});
	}});
	if(i==_title) cur=d;
}
var isApplied=getItem('isApplied');
function getPopup(){
	getPopup.flag++;	// avoid frequent asking for popup menu
	setTimeout(function(){
		if(!--getPopup.flag) br.executeScript('try{setPopup();}catch(e){}');
	},200);
}
getPopup.flag=0;
function load(o){
	tab=o?o.source:null;
	pT.innerHTML=pB.innerHTML=cT.innerHTML=cB.innerHTML='';
	addItem(_('Manage styles'),{holder:pT,symbol:'➤',title:true,onclick:function(){
		br.tabs.newTab({url:rt.getPrivateUrl()+'options.html',activate:true});
	}});
	if(o) addItem(_('Find styles for this site'),{holder:pT,symbol:'➤',title:true,onclick:function(){
		br.tabs.newTab({url:'http://userstyles.org/styles/search/'+encodeURIComponent(br.tabs.getCurrentTab().url),activate:true});
	}});
	var d=o&&o.data;
	if(d&&d.astyles&&d.astyles.length) {
		_title=d.cstyle||'';
		addItem(_('Back'),{holder:cT,symbol:'◄',title:true,onclick:function(){
			A.classList.add('hide');P.classList.remove('hide');
		}});
		d.astyles.forEach(alterStyle);
		addItem(_('Alter stylesheet...'),{holder:pT,symbol:'➤',title:true,onclick:function(){
			P.classList.add('hide');A.classList.remove('hide');
		}});
	}
	addItem(_('Enable styles'),{holder:pT,data:isApplied,title:true,onclick:function(){
		loadItem(this,setItem('isApplied',isApplied=!isApplied));
		broadcast('updateStyle();');
	}});
	if(d&&d.styles&&d.styles.length) {
		pR.classList.remove('hide');
		d.styles.forEach(menuStyle);
	} else pR.classList.add('hide');
	if(!o) getPopup();
}
initFont();
load();
rt.listen('GetPopup',getPopup);
rt.listen('SetPopup',load);
br.onBrowserEvent=function(o){
	switch(o.type){
		case 'TAB_SWITCH':
		case 'ON_NAVIGATE':
			load();
	}
};
