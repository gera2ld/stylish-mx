function initEditor(callback,data){
	data=data||{};
	addCSS({href:'lib/CodeMirror.css'});
	addScript({src:'lib/CodeMirror.js'},function(){
		var T=CodeMirror(document.getElementById('mCode'),{
			continueComments:true,
			matchBrackets:true,
			autoCloseBrackets:true,
			highlightSelectionMatches:true,
			lineNumbers:true,
			mode:'text/css',
			lineWrapping:true,
			indentUnit:4,
			indentWithTabs:true,
			styleActiveLine:true,
			foldGutter:true,
			gutters:['CodeMirror-linenumbers','CodeMirror-foldgutter'],
		});
		T.clearHistory=function(){T.getDoc().clearHistory();};
		T.setValue(' ');	// fix CodeMirror for setting null string as value
		T.setValueAndFocus=function(v){T.setValue(v);T.focus();};
		T.getWrapperElement().setAttribute('style','position:absolute;height:100%;width:100%;');
		if(data.onchange) T.on('change',data.onchange);
		if(data.readonly) T.setOption('readOnly',data.readonly);
		callback(T);
	});
}
