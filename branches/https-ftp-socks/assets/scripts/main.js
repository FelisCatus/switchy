/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var appName = "";
var appVersion = "";
var activeIconPath = "assets/images/active.png";
var inactiveIconPath = "assets/images/inactive.png";
var refreshInterval = 10000;
var newVersion = false;
var notifyOnNewVersion = true; //TODO
var plugin;

function init() {
	loadManifestInfo();
	plugin = document.getElementById("plugin");
	ProfileManager.loadProfiles();
	applyOptions();
	checkFirstTime();
	setIconInfo();
	monitorChanges();	
	diagnose();
	
	
	ProfileManager.getCurrentProfile();
}

function loadManifestInfo() {
	var manifest = null;
	var request = new XMLHttpRequest();
	request.open("GET", chrome.extension.getURL("manifest.json"), false);
	request.onreadystatechange = function() {
		if (this.readyState == XMLHttpRequest.DONE) {
			manifest = JSON.parse(this.responseText);
		}
	};
	request.send();	
	
	appName = manifest.name;
	appVersion = manifest.version;
}

function checkFirstTime() {
	if (!Settings.keyExists("firstTime")) {
		Settings.setValue("firstTime", ":]");
		if (!ProfileManager.hasProfiles()) {
			Settings.setValue("version", appVersion.substr(0, 5));
			openOptions(true);
			return;
		}
	}
	
	if (notifyOnNewVersion && Settings.getValue("version") != appVersion.substr(0, 5)) {
		setIconText("Updated to new version (" + appVersion + ")");
		setIconBadge(appVersion.substr(0, 5));
		newVersion = true;
	}
}

function openOptions(firstTime) {
	var url = "options.html";
	if (firstTime)
		url += "?firstTime=true";
	
	chrome.tabs.create({
		url: url
	});
}

function applyOptions() {
	var selectedProfile = Settings.getObject("selectedProfile");
	
	if (selectedProfile && selectedProfile.proxy) {
		selectedProfile = ProfileManager.normalizeProfile(selectedProfile);
		ProfileManager.applyProfile(selectedProfile);
	}
}

function setIconBadge(text) {
	if (text == undefined)
		text = "";
	
//	chrome.browserAction.setBadgeBackgroundColor({ color: [75, 125, 255, 255] });
	chrome.browserAction.setBadgeBackgroundColor({ color: [0, 175, 0, 255] });
	chrome.browserAction.setBadgeText({ text: text });
}

function setIconText(text) {
	if (text == undefined)
		text = "";
	
	chrome.browserAction.setTitle({ title: text });
}

function setIconInfo(profile) {
	if (newVersion)
		return;
	
	if (!profile)
		profile = ProfileManager.getCurrentProfile();
	
	var title = appName + "\n" + profile.name;	
	if (profile.proxy == ProfileManager.directConnectionProfile.proxy) {
		chrome.browserAction.setIcon({ path: inactiveIconPath });
	} else {
		chrome.browserAction.setIcon({ path: activeIconPath });
		title += " (" + profile.proxy + ")";
	}
	chrome.browserAction.setTitle({ title: title });
}

function monitorChanges() {
	setInterval(setIconInfo, refreshInterval);
}

function diagnose() {
	var result = true;
	
	Logger.log("Browser Info: " + navigator.appVersion, Logger.info);
	
	if (document.plugins.length > 0 && plugin == document.plugins[0])
		Logger.log("Plugin loaded successfully..", Logger.success);
	else {
		Logger.log("Plugin not loaded!", Logger.error);
		result = false;
	}
	
	if (typeof plugin.setProxy == "function")
		Logger.log("Plugin working properly..", Logger.success);
	else {
		Logger.log("Plugin not working properly!", Logger.error);
		result = false;
	}
	
	if (localStorage && localStorage.constructor.toString().indexOf("Storage()") >= 0)
		Logger.log("'localStorage' supported..", Logger.success);
	else {
		Logger.log("'localStorage' not supported!", Logger.error);
		result = false;
	}
	
	if (localStorage.config != undefined)
		Logger.log("Wrote to local storage successfully..", Logger.success);
	else {
		Logger.log("Can't write to local storage!", Logger.error);
		result = false;
	}

	return result;
}
