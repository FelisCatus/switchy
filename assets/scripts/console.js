/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var os = {
	isMac: (/mac/i).test(navigator.userAgent), // maybe should test |navigator.platform| instead?
	isWindows: (/win/i).test(navigator.userAgent),
	isLinux: (/linux/i).test(navigator.userAgent)
};

var extension;
var Logger;

function init() {
	extension = chrome.extension.getBackgroundPage();
	Logger = extension.Logger;
	
	initLog();
	initDiagnose();
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

function initDiagnose() {
	var plugin = extension.plugin;
	
	// Test #1
	$("#test1 .title").removeClass("inactive");
	if (typeof plugin.setProxy == "function") {
		$("#test1 .icon").addClass("success");
		
		// Test #2
		$("#test2 .title").removeClass("inactive");
		try {
			var pluginDiagnoseResult = plugin.diagnose(0);
			if (pluginDiagnoseResult == "OK") {
				$("#test2 .icon").addClass("success");
				
				// Test #3
				$("#test3 .title").removeClass("inactive");
				try {
					var pluginCheckResult = plugin.checkEnvironment(0);
					if (pluginCheckResult == "OK") {
						Logger.log("Everything is OK", Logger.types.success);
						$("#test3 .icon").addClass("success");
					}
					else {
						Logger.log("Plugin error: " + pluginCheckResult, Logger.types.error);
						$("#test3 .icon").addClass("error");
						$("#test3 .description").text("(Plugin error: " + pluginCheckResult + ")");
					}
				} catch (e) {
					Logger.log("Error checking the environment!", Logger.types.error);
					$("#test3 .icon").addClass("error");
					$("#test3 .description").text("(Error checking the environment!)");
				}			
			}
			else {
				Logger.log("Plugin error: " + pluginDiagnoseResult, Logger.types.error);
				$("#test2 .icon").addClass("error");
				$("#test2 .description").text("(Plugin error: " + pluginDiagnoseResult + ")");
			}
		} catch (e) {
			Logger.log("Error diagnosing the plugin!", Logger.types.error);
			$("#test2 .icon").addClass("error");
			$("#test2 .description").text("(Error diagnosing the plugin!)");
		}
	}
	else {
		Logger.log("Plugin not loaded!", Logger.types.error);
		$("#test1 .icon").addClass("error");
		if (os.isMac)
			$("#test1 .description").html("(Sorry, Mac OS X isn't supported yet, you can star this " +
					"<a href='http://code.google.com/p/switchy/issues/detail?id=4'>issue</a> " +
					"to keep track of changes)");
		else
			$("#test1 .description").html(
					"(Can't load the plugin, please " +
					"<a href='http://code.google.com/p/switchy/issues/list'>" +
					"file an issue</a> about this problem)");
	}
}

function diagnose() {
	extension.diagnose();
	initDiagnose();
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
