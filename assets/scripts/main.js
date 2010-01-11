/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var appName = "";
var appVersion = "";
var iconDir = "assets/images/";
var iconInactivePath = "assets/images/inactive.png";
var refreshInterval = 10000;
var refreshTimer = undefined;
var newVersion = false;
var notifyOnNewVersion = true;
var currentProfile = undefined;
var plugin;

function init() {
	plugin = document.getElementById("plugin");
	loadManifestInfo();
	ProfileManager.load();
	RuleManager.load();

	applySavedOptions();

	if (!checkFirstTime())
		checkNewVersion();
	
	setIconInfo(undefined);
	monitorProxyChanges(false);
	diagnose();
	
	chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
		chrome.tabs.get(tabId, function(tab) {
			setAutoSwitchIcon(tab.url);
		});
	});
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		if (changeInfo.status == "complete")
			setAutoSwitchIcon(tab.url);
	});
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
			Settings.setValue("version", appVersion);
			openOptions(true);
			return true;
		}
	}
	return false;
}

function checkNewVersion() {
	if (notifyOnNewVersion && Settings.getValue("version") != appVersion) {
		
		if (Settings.getValue("version") == "1.4.1" || Settings.getValue("version") == "1.4.2") return; //// TODO remove this
		
		setIconTitle("You've been updated to a new version (" + appVersion + ")");
		setIconBadge(appVersion);
		newVersion = true;
	}
}

function openOptions(firstTime) {
	var url = "options.html";
	if (firstTime)
		url += "?firstTime=true";
	
	var fullUrl = chrome.extension.getURL(url);
	chrome.tabs.getAllInWindow(null, function(tabs) {
		for (var i in tabs) { // check if Options page is open already
			var tab = tabs[i];
			if (tab.url == fullUrl) {
				chrome.tabs.update(tab.id, { selected: true }); // select the tab
				return;
			}
		}
		chrome.tabs.getSelected(null, function(tab) { // open a new tab next to currently selected tab
			chrome.tabs.create({
				url: url,
				index: tab.index + 1
			});
		});
	});
}

function applySavedOptions() {
	if (!Settings.getValue("reapplySelectedProfile", true))
		return;
	
	var selectedProfile = ProfileManager.getSelectedProfile();
	if (selectedProfile != undefined)
		ProfileManager.applyProfile(selectedProfile);
}

function setIconBadge(text) {
	if (text == undefined)
		text = "";
	
	chrome.browserAction.setBadgeBackgroundColor({ color: [75, 125, 255, 255] });
	chrome.browserAction.setBadgeText({ text: text });
}

function setIconTitle(title) {
	if (title == undefined)
		title = "";
	
	chrome.browserAction.setTitle({ title: title });
}

function setIconInfo(profile, preventProxyChanges) {
	if (newVersion)
		return;
	
	if (!profile) {
		profile = ProfileManager.getCurrentProfile();
		if (preventProxyChanges) {
			var selectedProfile = ProfileManager.getSelectedProfile();
			if (!ProfileManager.equals(profile, selectedProfile)) {
				profile = selectedProfile;
				ProfileManager.applyProfile(profile);
			}
		}
	}
	
	currentProfile = profile;
	var autoProfile = RuleManager.getAutomaticModeProfile();
	if (RuleManager.isAutomaticModeEnabled(profile)) {
//		profile = autoProfile;
//		profile.proxyConfigUrl = "";
//		profile.color = "auto-blue";
		
		setAutoSwitchIcon();
		return;
	}
	
	var title = appName + "\n";	
	if (profile.proxyMode == ProfileManager.proxyModes.direct) {
		chrome.browserAction.setIcon({ path: iconInactivePath });
		title += profile.name;
	} else {
		var iconPath = iconDir + "icon-" + (profile.color || "blue") + ".png";
		chrome.browserAction.setIcon({ path: iconPath });
		title += ProfileManager.profileToString(profile, true);
	}
	
	setIconTitle(title);
}

function setAutoSwitchIcon(url) {
	if (!RuleManager.isAutomaticModeEnabled(currentProfile))
		return;
	
	if (url == undefined) {
		chrome.tabs.getSelected(undefined, function(tab) {
			setAutoSwitchIcon(tab.url);
		});
		return;
	}
	
	var rule = RuleManager.getAssociatedRule(url) || RuleManager.getDefaultRule();
	var color = undefined;
	var profileName = ProfileManager.directConnectionProfile.name;
	if (rule != undefined) {
		var profile = ProfileManager.getProfile(rule.profileId);
		color = profile.color;
		profileName = profile.name;
	}
	var iconPath = iconDir + "icon-auto-" + (color || "blue") + ".png";
	chrome.browserAction.setIcon({ path: iconPath });

	var title = appName + "\nAuto Switch Mode\nActive Page Proxy: " + profileName;	
	setIconTitle(title);
}

function monitorProxyChanges(checkIfMonitorRunning) {
	if (checkIfMonitorRunning && refreshTimer)
		return;
	
	if (Settings.getValue("monitorProxyChanges", true)) {
		setIconInfo(undefined, Settings.getValue("preventProxyChanges", false));
		refreshTimer = setTimeout(monitorProxyChanges, refreshInterval, undefined);
	}
	else
		refreshTimer = undefined;
}

function diagnose() {
	var result = true;
	
	Logger.log("Extension Info: v" + appVersion, Logger.types.info);
	Logger.log("Browser Info: " + navigator.appVersion, Logger.types.info);
	
	if (document.plugins.length > 0 && plugin == document.plugins[0])
		Logger.log("Plugin loaded successfully..", Logger.types.success);
	else {
		Logger.log("Plugin not loaded!", Logger.types.error);
		result = false;
	}
	
	if (typeof plugin.setProxy == "function") {
		var pluginDiagnoseResult = plugin.diagnose(0);
		if (pluginDiagnoseResult == "OK")
			Logger.log("Plugin working properly..", Logger.types.success);
		else {
			Logger.log("Plugin not working properly! Internal error: " + pluginDiagnoseResult, Logger.types.error);
			result = false;
		}
	}
	else {
		Logger.log("Plugin not working properly!", Logger.types.error);
		result = false;
	}
	
	if (localStorage && localStorage.constructor.toString().indexOf("Storage()") >= 0)
		Logger.log("'localStorage' supported..", Logger.types.success);
	else {
		Logger.log("'localStorage' not supported!", Logger.types.error);
		result = false;
	}
	
	if (localStorage.config != undefined)
		Logger.log("Wrote to local storage successfully..", Logger.types.success);
	else {
		Logger.log("Can't write to local storage!", Logger.types.error);
		result = false;
	}

	return result;
}
