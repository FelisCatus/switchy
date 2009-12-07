/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var ProfileManager = {};

ProfileManager.profiles = {};

ProfileManager.directConnectionProfile = { name: "[Direct Connection]", proxy: "directConnection" };

ProfileManager.loadProfiles = function loadProfiles() {
	var profiles = Settings.getObject("profiles");
	if (profiles)
		ProfileManager.profiles = profiles;
};

ProfileManager.saveProfiles = function saveProfiles() {
	Settings.setObject("profiles", ProfileManager.profiles);
};

ProfileManager.getProfiles = function getProfiles() {
	return ProfileManager.profiles;
};

ProfileManager.getSortedProfileArray = function getSortedProfileArray() {
	profiles = [];
	for (var i in ProfileManager.profiles)
		profiles[profiles.length] = ProfileManager.profiles[i];

	profiles = profiles.sort(function(a, b) {
		var name1 = a.name.toLowerCase();
		var name2 = b.name.toLowerCase();
		if (name1.charCodeAt(0) != name2.charCodeAt(0))
			return name1.charCodeAt(0) - name2.charCodeAt(0);
		else if (name1.length > 1 && name2.length > 1)
			return name1.charCodeAt(1) - name2.charCodeAt(1);
	});
	
	return profiles;
};

ProfileManager.getCurrentProfile = function getCurrentProfile() {	
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var proxyEnabled;
	var proxy;
	try {
		proxyEnabled = plugin.proxyEnabled;
		proxy = plugin.proxyServer;
	} catch(ex) {
		Logger.log("Plugin Error @ProfileManager.getCurrentProfile() > " +
			ex.toString(), Logger.error);
		
		return {};
	}
	
	if (proxyEnabled !== true && proxyEnabled !== "True" && proxyEnabled !== "true")
		return ProfileManager.directConnectionProfile;
	
	if (ProfileManager.profiles[proxy])
		return ProfileManager.profiles[proxy];
	
	return { name: "", proxy: proxy, unknown: true };
};

ProfileManager.applyProfile = function applyProfile(profile) {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var direct = (profile.proxy == ProfileManager.directConnectionProfile.proxy);
	
	Settings.setObject("selectedProfile", profile);
	
	try {
		plugin.proxyEnabled = !direct;
		if (!direct)
			plugin.proxyServer = profile.proxy;
		
		if (profile.bypassLocal != undefined)
			plugin.proxyBypassLocal = profile.pypassLocal;
		
		plugin.notifyIE(0);
	} catch(ex) {
		Logger.log("Plugin Error @ProfileManager.applyProfile(" + ProfileManager.profileToString(profile) + ") > " +
			ex.toString(), Logger.error);
	}
};

ProfileManager.profileToString = function profileToString(profile) {
	return "Profile: " + JSON.stringify(profile);
};

ProfileManager.hasProfiles = function hasProfiles() {
	var result = false;
	for (i in ProfileManager.profiles) {
		result = true;
		break;
	}
	
	return result;
};

ProfileManager.equals = function equals(profile1, profile2) {
	if (profile1.proxy != profile2.proxy || profile1.useSameProxy != profile2.useSameProxy)
		return false;
	
	if (profile1.useSameProxy)
		return true;
	
	return profile1.proxyHttps != profile2.proxyHttps
		&& profile1.proxyFtp != profile2.proxyFtp
		&& profile1.proxySocks != profile2.proxySocks;
};
