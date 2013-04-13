function $(i){return document.getElementById(i);}
var P=$('popup'),A=$('astyles'),tab,
	pT=P.querySelector('.top'),pB=P.querySelector('.bot'),
	cT=A.querySelector('.top'),cB=A.querySelector('.bot');
function loadItem(d,c){
	if(c) {
		d.firstChild.innerText=d.symbol;
		d.classList.remove('disabled');
	} else {
		d.firstChild.innerText='';
		d.classList.add('disabled');
	}
}
function addItem(h,t,c){
	var d=document.createElement('div'),s='';
	d.innerHTML='<span></span>'+h;
	if(t) {if(typeof t!='string') t=h;d.title=t;}
	d.className='ellipsis';
	c.holder.appendChild(d);
	if('symbol' in c) d.firstChild.innerText=c.symbol;
	else if('data' in c) c.symbol='✓';
	for(t in c) d[t]=c[t];
	if('data' in c) loadItem(d,c.data);
	return d;
}
function menuStyle(i) {
	var c=_data.map[i],n=c.name?c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('Null name')+'</em>';
	addItem(n,c.name,{holder:pB,data:c.enabled,onclick:function(){
		loadItem(this,c.enabled=!c.enabled);_data.save();
		rt.post('UpdateItem',{cmd:'update',data:_data.ids.indexOf(i),id:i});
		unsafeBroadcast('UpdateStyle',i);
	}});
}
var cur=null,_title;
function alterStyle(i){
	var d=addItem(i,true,{holder:cB,data:i==_title,onclick:function(){
		if(cur) loadItem(cur,false);loadItem(cur=this,true);
		if(tab) rt.post(tab,{topic:'AlterStyle',data:i});
	}});
	if(i==_title) cur=d;
}
function load(o){
	tab=o?o.source:null;
	pT.innerHTML=pB.innerHTML=cT.innerHTML=cB.innerHTML='';
	if(window.external.mxVersion>'4') addItem(_('Manage styles'),true,{holder:pT,symbol:'➤',onclick:function(){
		br.tabs.newTab({url:rt.getPrivateUrl()+'options.html',activate:true});
	}});
	addItem(_('Find styles for this site'),true,{holder:pT,symbol:'➤',onclick:function(){
		br.tabs.newTab({url:'http://userstyles.org/styles/search/'+encodeURIComponent(br.tabs.getCurrentTab().url),activate:true});
	}});
	var d=o&&o.data;
	if(d&&d.astyles&&d.astyles.length) {
		_title=d.cstyle||'';
		addItem(_('Back'),true,{holder:cT,symbol:'◄',onclick:function(){
			A.classList.add('hide');P.classList.remove('hide');
		}});
		cT.appendChild(document.createElement('hr'));
		d.astyles.forEach(alterStyle);
		addItem(_('Alter stylesheet...'),true,{holder:pT,symbol:'➤',onclick:function(){
			P.classList.add('hide');A.classList.remove('hide');
			setTimeout(function(){cB.style.pixelHeight=innerHeight-cB.offsetTop;},0);
		}});
	}
	addItem(_('Enable styles'),true,{holder:pT,data:_data.data.isApplied,onclick:function(){
		_data.set('isApplied',!_data.data.isApplied);loadItem(this,_data.data.isApplied);
		unsafeBroadcast('UpdateStyle');
	}});
	if(d&&d.styles&&d.styles.length) {
		_data.load();
		pT.appendChild(document.createElement('hr'));
		d.styles.forEach(menuStyle);
	}
	if(!o) getPopup();
}
function getPopup(){unsafeExecute(null,'GetPopup');}
rt.listen('GetPopup',getPopup);
rt.listen('SetPopup',load);
br.onBrowserEvent=function(o){
	switch(o.type){
		case 'TAB_SWITCH': getPopup();
	}
};
initFont();load();
