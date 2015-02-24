(function(){
var $=document.getElementById.bind(document),P=$('popup'),
	A=$('astyles'),tab,pR=P.querySelector('.expand'),
	pT=P.querySelector('td'),pB=P.querySelector('.expanda'),
	cT=A.querySelector('td'),cB=A.querySelector('.expanda');
function loadItem(d,c){
	d.data=c;
	if(d.symbols) {
		d.firstChild.className='fa '+d.symbols[c?1:0];
		if(d.symbols.length>1) {
			if(c) d.classList.remove('disabled');
			else d.classList.add('disabled');
		}
	}
}
function addItem(h,c){
	var d=document.createElement('div');
	d.innerHTML='<i></i> '+h;
	if('title' in c) {
		d.title=typeof c.title=='string'?c.title:h;
		delete c.title;
	}
	c.holder.appendChild(d);
	for(h in c) d[h]=c[h];
	if(d.symbols) loadItem(d,d.data);
	return d;
}
function menuStyle(c) {
	var n=c.name?c.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('labelNoName')+'</em>';
	n=addItem(n,{
		holder:pB,
		symbols: ['fa-times','fa-check'],
		className: 'ellipsis',
		data:c.enabled,
		title:c.name,
		onclick:function(){
			post({cmd:'EnableStyle',data:{id:c.id,data:!n.data}},function(o){loadItem(n,!n.data);});
		},
	});
}
var cur=null,_title,count=0;
function alterStyle(i){
	var d=addItem(i,{
		holder:cB,
		symbols: ['fa-square-o','fa-check-square-o'],
		data:i==_title,
		title:true,
		onclick:function(){
			if(cur) loadItem(cur,false);
			loadItem(cur=this,true);
			if(tab) rt.post(tab,{cmd:'AlterStyle',data:i});
		},
	});
	if(i==_title) cur=d;
}
function getPopup(){
	count++;	// avoid frequent asking for popup menu
	setTimeout(function(){
		if(!--count) injectContent('setPopup();');
	},200);
}
function load(o,src,callback){
	tab=src&&src.id;
	pT.innerHTML=pB.innerHTML=cT.innerHTML=cB.innerHTML='';
	addItem(_('menuManageStyles'),{
		holder:pT,
    symbols: ['fa-hand-o-right'],
		//title:true,
		onclick:function(){
			br.tabs.newTab({url:rt.getPrivateUrl()+'options.html',activate:true});
		},
	});
	if(o) addItem(_('menuFindStyles'),{
		holder:pT,
		symbols: ['fa-hand-o-right'],
		//title:true,
		onclick:function(){
			br.tabs.newTab({url:'http://userstyles.org/styles/search/'+encodeURIComponent(br.tabs.getCurrentTab().url),activate:true});
		},
	});
	if(o&&o.astyles&&o.astyles.length) {
		_title=o.cstyle||'';
		addItem(_('menuBack'),{
			holder:cT,
      symbols: ['fa-arrow-left'],
			//title:true,
			onclick:function(){
				A.classList.add('hide');P.classList.remove('hide');
			},
		});
		o.astyles.forEach(alterStyle);
		addItem(_('menuAlterStylesheet'),{
			holder:pT,
			symbols: ['fa-hand-o-right'],
			//title:true,
			onclick:function(){
				P.classList.add('hide');A.classList.remove('hide');
			},
		});
	}
	var a=addItem(_('menuStylesEnabled'),{
		holder:pT,
		symbols: ['fa-times','fa-check'],
		//title:true,
		onclick:function(e){
			post({cmd:'SetOption',data:{key:'isApplied',value:!a.data}},function(o){
				loadItem(a,!a.data);rt.icon.setIconImage('icon'+(a.data?'':'w'));
			});
			broadcast('updateStyle();');
		},
	});
	post({cmd:'GetOption',data:'isApplied'},function(o){loadItem(a,o);});
	if(o&&o.styles&&o.styles.length) {
		pR.classList.remove('hide');
		post({cmd:'GetMetas',data:o.styles},function(o){
			o.forEach(menuStyle);
		});
	} else pR.classList.add('hide');
	if(!o) getPopup();
}
rt.listen('Popup',function(o){
	var maps={
		GetPopup:getPopup,
		SetPopup:load,
	},f=maps[o.cmd];
	function callback(d){
		rt.post(o.src.id,{cmd:'Callback',data:{id:o.callback,data:d}});
	}
	if(f) f(o.data,o.src,callback);
});
var post=initMessage({});load();
br.onBrowserEvent=function(o){
	switch(o.type){
		case 'TAB_SWITCH':
		case 'ON_NAVIGATE':
			load();
	}
};
})();
