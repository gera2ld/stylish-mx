function initEditor(callback,data){
	data=data||{};
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
	if(data.onchange) T.on('change',data.onchange);
	if(data.readonly) T.setOption('readOnly',data.readonly);
	callback(T);
}
