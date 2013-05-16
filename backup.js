(function(){
	if(localStorage.getItem('ids')) return;
	// restore data from backup
	if(v=rt.storage.getConfig('backup')) try{
		v=JSON.parse(v);
		for(k in v) localStorage.setItem(k,v[k]);
	}catch(e){}
})();

// Backup data to rt.storage
function initBackup(){
	function save(){
		if(!--count) {
			rt.storage.setConfig('backup',JSON.stringify(localStorage));
			_changed=false;
		}
	}
	function backup(){count++;setTimeout(save,3e4);}
	var _setItem=setItem,_changed=false,count=0;
	setItem=function(k,v){
		_changed=true;
		if(autoBackup) backup();
		return _setItem(k,v);
	};
	autoBackup=getItem('autoBackup',false);
	settings.o.push('autoBackup');
}
window.addEventListener('DOMContentLoaded',initBackup,false);
