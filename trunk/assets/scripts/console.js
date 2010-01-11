/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
var Logger;

function init() {
	extension = chrome.extension.getBackgroundPage();
	Logger = extension.Logger;
	
	initLog();
	loadLog();
}

function closeWindow() {
	window.close();
}

function initLog() {
	Logger.addEventListener(Logger.events.onLog, function(e) {
		loadLog();
	});
}

function loadLog() {
	$("#console").text(Logger.toString());
}

function clearLog() {
	Logger.clear();
	loadLog();
}

function diagnose() {
	extension.diagnose();
	loadLog();
}

function resetOptions() {
	if (!confirm("\nThis will delete all your options permanently, continue?"))
		return;
	
	if (!confirm("\nAre you sure you want to delete all your options permanently?"))
		return;
	
	extension.localStorage.clear();
	alert("\nOptions reset successfully..");
}
