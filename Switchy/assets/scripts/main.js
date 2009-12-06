/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var appName = "Switchy!";
var appVersion = "0.9.3";
var activeIconPath = "assets/images/active.png";
var inactiveIconPath = "assets/images/inactive.png";
var refreshInterval = 10000;
var newVersion = false;
var plugin;

function init() {
	plugin = document.getElementById("plugin");
	ProfileManager.loadProfiles();
	applyOptions();
	checkFirstTime();
	setIconInfo();
	monitorChanges();	
	diagnose();
}

function checkFirstTime() {
	if (!Settings.keyExists("firstTime")) {
		Settings.setValue("firstTime", ":]");
		if (ProfileManager.profiles.length == 0) {
			Settings.setValue("version", appVersion);
			openOptions(true);
			return;
		}
	}
	
	if (Settings.getValue("version") != appVersion) {
		setIconText("Updated to new version (" + appVersion + ")");
		setIconBadge(appVersion);
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
	var bypassLocal = Settings.getValue("bypassLocal");
	
	if (selectedProfile && selectedProfile.proxy) {
		selectedProfile.bypassLocal = bypassLocal;
		ProfileManager.applyProfile(selectedProfile);
	}
}

function setIconBadge(text) {
	if (text == undefined)
		text = "";
	
	chrome.browserAction.setBadgeBackgroundColor({ color: [150, 180, 255, 255] });
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
	
	if (typeof plugin.notifyIE == "function" && typeof plugin.proxyEnabled == "string")
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
