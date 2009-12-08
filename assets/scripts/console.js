/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;

function init() {
	extension = chrome.extension.getBackgroundPage();
	initLog();
	loadLog();
}

function loadLog() {
	$("#console").text(extension.Logger.toString());
}

function clearLog() {
	extension.Logger.clear();
	loadLog();
}

function diagnose() {
	extension.diagnose();
	loadLog();
}

function initLog() {
	extension.Logger.addEventListener(extension.Logger.onLog, function(e) {
		loadLog();
	});
}
