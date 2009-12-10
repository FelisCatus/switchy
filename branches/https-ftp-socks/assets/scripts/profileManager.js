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
	var profiles = {};
	for (var i in ProfileManager.profiles) {
		var profile = ProfileManager.profiles[i];
		profile = ProfileManager.normalizeProfile(profile);
		profiles[i] = profile;
	}
	
	return profiles;
};

ProfileManager.setProfiles = function setProfiles(profiles) {
	var profiles = $.extend(true, {}, profiles);
	ProfileManager.profiles = profiles;
};

ProfileManager.getSortedProfileArray = function getSortedProfileArray() {
	var profiles = ProfileManager.getProfiles();
	var profileArray = [];
	for (var i in profiles)
		profileArray[profileArray.length] = profiles[i];

	profileArray = profileArray.sort(function(profile1, profile2) {
		var name1 = profile1.name.toLowerCase();
		var name2 = profile2.name.toLowerCase();
		if (name1.charCodeAt(0) != name2.charCodeAt(0))
			return name1.charCodeAt(0) - name2.charCodeAt(0);
		else if (name1.length > 1 && name2.length > 1)
			return name1.charCodeAt(1) - name2.charCodeAt(1);
	});
	
	return profileArray;
};

ProfileManager.getCurrentProfile = function getCurrentProfile() {	
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var proxyEnabled;
	var proxyString;
	var bypassProxy;
	var configUrl;
	try {
		proxyEnabled = plugin.proxyEnabled;
		proxyString = plugin.proxyServer;
		bypassProxy = plugin.proxyExceptions;
		configUrl = plugin.proxyConfigUrl;
	} catch(ex) {
		Logger.log("Plugin Error @ProfileManager.getCurrentProfile() > " +
			ex.toString(), Logger.error);
		
		return {};
	}
	
	if (proxyEnabled !== true && proxyEnabled !== "True" && proxyEnabled !== "true")
		return ProfileManager.directConnectionProfile;
	
	var profile = ProfileManager.parseProxyString(proxyString);
	profile.bypassProxy = bypassProxy;
	profile.configUrl = configUrl;
	profile = ProfileManager.normalizeProfile(profile);
	
	var foundProfile = ProfileManager.contains(profile);
	if (foundProfile)
		return foundProfile;
	
	profile.unknown = true;
	profile.name = "<Current Profile>";
	return profile;
};

ProfileManager.applyProfile = function applyProfile(profile) {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var direct = (profile.proxy == ProfileManager.directConnectionProfile.proxy);
	
	Settings.setObject("selectedProfile", profile);
	
	var proxy = ProfileManager.buildProxyString(profile);
	try {
		var result;
		if (direct) {
			result = plugin.setDirect(0);
		} else {
			result = plugin.setProxy(proxy, profile.bypassProxy, profile.configUrl);
		}
		
		if (result != 0 || result != "0")
			throw "Error Code (" + result + ")";
		
		plugin.notifyChanges(0);
	} catch(ex) {
		Logger.log("Plugin Error @ProfileManager.applyProfile(" + ProfileManager.profileToString(profile) + ") > " +
			ex.toString(), Logger.error);
	}
};

ProfileManager.profileToString = function profileToString(profile, prettyPrint) {
	if (!prettyPrint)
		return "Profile: " + JSON.stringify(profile);
	
	var result = [];
	if (profile.name != undefined)
		result.push(profile.name); 
	
	if (profile.proxy != undefined && profile.proxy.trim().length > 0)
		result.push("HTTP: " + profile.proxy); 
	
	if (!profile.useSameProxy) {
		if (profile.proxyHttps != undefined && profile.proxyHttps.trim().length > 0)
			result.push("HTTPS: " + profile.proxyHttps); 

		if (profile.proxyFtp != undefined && profile.proxyFtp.trim().length > 0)
			result.push("FTP: " + profile.proxyFtp); 

		if (profile.proxySocks != undefined && profile.proxySocks.trim().length > 0)
			result.push("Socks: " + profile.proxySocks); 
	}

	if (profile.configUrl != undefined && profile.configUrl.trim().length > 0)
		result.push("Config Script: " + profile.configUrl);
	
	return result.join("\n");
};

ProfileManager.parseProxyString = function parseProxyString(proxyString) {
	if (!proxyString)
		return {};
	
	var profile;
	if (proxyString.indexOf(";") > 0 || proxyString.indexOf("=") > 0) {
		var proxyParts = proxyString.toLowerCase().split(";");
		profile = { useSameProxy: false, proxy: "", proxyHttps: "", proxyFtp: "", proxySocks: "" };
		for ( var i = 0; i < proxyParts.length; i++) {
			var part = proxyParts[i];
			if (part.indexOf("http=") == 0) {
				profile.proxy = part.substring(5);
			} else if (part.indexOf("https=") == 0) {
				profile.proxyHttps = part.substring(6);
			} else if (part.indexOf("ftp=") == 0) {
				profile.proxyFtp = part.substring(4);
			} else if (part.indexOf("socks=") == 0) {
				profile.proxySocks = part.substring(6);
			}
		}
	} else {
		profile = { proxy: proxyString, useSameProxy: true };
	}
	
	return profile;
};

ProfileManager.buildProxyString = function buildProxyString(profile) {
	if (!profile)
		return "";
	
	if (profile.useSameProxy)
		return profile.proxy;
	
	var proxy = [];
	if (profile.proxy)
		proxy.push("http=" + profile.proxy);
	
	if (profile.proxyHttps)
		proxy.push("https=" + profile.proxyHttps);
	
	if (profile.proxyFtp)
		proxy.push("ftp=" + profile.proxyFtp);
	
	if (profile.proxySocks)
		proxy.push("socks=" + profile.proxySocks);
	
	proxy = proxy.join(";");
	return proxy;
};

ProfileManager.normalizeProfile = function normalizeProfile(profile) {
	var newProfile = {
		name: "",
		proxy : "",
		useSameProxy : true,
		proxyHttps : "",
		proxyFtp : "",
		proxySocks : "",
		bypassProxy : "",
		configUrl : ""
	};
	$.extend(newProfile, profile);
	return newProfile;
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
		return (profile1.configUrl == profile2.configUrl);
	
	return (profile1.proxyHttps == profile2.proxyHttps
		&& profile1.proxyFtp == profile2.proxyFtp
		&& profile1.proxySocks == profile2.proxySocks
		&& profile1.configUrl == profile2.configUrl);
};

ProfileManager.contains = function contains(profile) {
	var profiles = ProfileManager.getProfiles();
	for (i in profiles) {
		if (ProfileManager.equals(profiles[i], profile))
			return profiles[i];
	}
	return undefined;
};
