/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var ProfileManager = {};

ProfileManager.profiles = {};

ProfileManager.proxyModes = {
	direct: "direct",
	manual: "manual",
	auto: "auto"
};

ProfileManager.directConnectionProfile = {
	id: "direct",
	name: "[Direct Connection]",
	proxyMode: ProfileManager.proxyModes.direct
};

ProfileManager.currentProfileName = "<Current Profile>";

ProfileManager.loadProfiles = function loadProfiles() {
	var profiles = Settings.getObject("profiles");
	if (profiles != undefined) {
		for (var i in profiles) {
			var profile = profiles[i];
			profile = ProfileManager.fixProfile(profile);
		}

		ProfileManager.profiles = profiles;
	}
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
		var length = Math.min(name1.length, name2.length);
		for (var i = 0; i < length; i++) {
			var ch1 = name1.charCodeAt(i);
			var ch2 = name2.charCodeAt(i);
			if (ch1 != ch2)
				return ch1 - ch2;
		}
		
		return name1.length - name2.length;
	});
	
	return profileArray;
};

ProfileManager.getSelectedProfile = function getSelectedProfile() {
	var profile = Settings.getObject("selectedProfile");
	if (profile != undefined) {
		profile = ProfileManager.fixProfile(profile);
		profile = ProfileManager.normalizeProfile(profile);
	}
	
	return profile;
};

ProfileManager.getCurrentProfile = function getCurrentProfile() {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var proxyMode;
	var proxyString;
	var proxyExceptions;
	var proxyConfigUrl;
	try {
		proxyMode = plugin.proxyMode;
		proxyString = plugin.proxyServer;
		proxyExceptions = plugin.proxyExceptions;
		proxyConfigUrl = plugin.proxyConfigUrl;
	} catch(ex) {
		Logger.log("Plugin Error @ProfileManager.getCurrentProfile() > " +
			ex.toString(), Logger.types.error);
		
		return {};
	}
	
	if (proxyMode == ProfileManager.proxyModes.direct)
		return ProfileManager.directConnectionProfile;
	
	var profile = ProfileManager.parseProxyString(proxyString);
	profile.proxyMode = proxyMode;
	profile.proxyExceptions = proxyExceptions;
	profile.proxyConfigUrl = proxyConfigUrl;
	profile = ProfileManager.normalizeProfile(profile);
	
	var foundProfile = ProfileManager.contains(profile);
	if (foundProfile)
		return foundProfile;
	
	profile.unknown = true;
	profile.id = "unknown";
	profile.name = ProfileManager.currentProfileName;
	return profile;
};

ProfileManager.applyProfile = function applyProfile(profile) {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var direct = (profile.proxyMode == ProfileManager.proxyModes.direct);
	
	Settings.setObject("selectedProfile", profile);
	
	var proxyString = ProfileManager.buildProxyString(profile);
	try {
		var result;
		if (direct) {
			result = plugin.setDirect(0);
		} else {
			result = plugin.setProxy(profile.proxyMode, proxyString, profile.proxyExceptions, profile.proxyConfigUrl);
		}
		
		if (result != 0 || result != "0")
			throw "Error Code (" + result + ")";
		
		plugin.notifyChanges(0);
	} catch(ex) {
		Logger.log("Plugin Error @ProfileManager.applyProfile(" + ProfileManager.profileToString(profile) + ") > " +
			ex.toString(), Logger.types.error);
	}
};

ProfileManager.profileToString = function profileToString(profile, prettyPrint) {
	if (!prettyPrint)
		return "Profile: " + JSON.stringify(profile);
	
	var result = [];
	if (profile.name != undefined)
		result.push(profile.name); 
	
	if (profile.proxyHttp != undefined && profile.proxyHttp.trim().length > 0)
		result.push("HTTP: " + profile.proxyHttp); 
	
	if (!profile.useSameProxy) {
		if (profile.proxyHttps != undefined && profile.proxyHttps.trim().length > 0)
			result.push("HTTPS: " + profile.proxyHttps); 

		if (profile.proxyFtp != undefined && profile.proxyFtp.trim().length > 0)
			result.push("FTP: " + profile.proxyFtp); 

		if (profile.proxySocks != undefined && profile.proxySocks.trim().length > 0)
			result.push("Socks: " + profile.proxySocks); 
	}

	if (profile.proxyConfigUrl != undefined && profile.proxyConfigUrl.trim().length > 0)
		result.push("Config Script: " + profile.proxyConfigUrl);
	
	return result.join("\n");
};

ProfileManager.parseProxyString = function parseProxyString(proxyString) {
	if (!proxyString)
		return {};
	
	var profile;
	if (proxyString.indexOf(";") > 0 || proxyString.indexOf("=") > 0) {
		var proxyParts = proxyString.toLowerCase().split(";");
		profile = { useSameProxy: false, proxyHttp: "", proxyHttps: "", proxyFtp: "", proxySocks: "" };
		for ( var i = 0; i < proxyParts.length; i++) {
			var part = proxyParts[i];
			if (part.indexOf("=:") > 0) // no host value
				continue;
			
			if (part.indexOf("http=") == 0) {
				profile.proxyHttp = part.substring(5);
			} else if (part.indexOf("https=") == 0) {
				profile.proxyHttps = part.substring(6);
			} else if (part.indexOf("ftp=") == 0) {
				profile.proxyFtp = part.substring(4);
			} else if (part.indexOf("socks=") == 0) {
				profile.proxySocks = part.substring(6);
			}
		}
	} else {
		profile = { proxyHttp: proxyString, useSameProxy: true };
	}
	
	return profile;
};

ProfileManager.buildProxyString = function buildProxyString(profile) {
	if (!profile)
		return "";
	
	if (profile.useSameProxy)
		return profile.proxyHttp;
	
	var proxy = [];
	if (profile.proxyHttp)
		proxy.push("http=" + profile.proxyHttp);
	
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
		proxyMode: ProfileManager.proxyModes.direct,
		proxyHttp : "",
		useSameProxy : true,
		proxyHttps : "",
		proxyFtp : "",
		proxySocks : "",
		proxyExceptions : "",
		proxyConfigUrl : "",
		color: "blue"
	};
	$.extend(newProfile, profile);
	return newProfile;
};

ProfileManager.fixProfile = function fixProfile(profile) {
	if (profile.proxy != undefined) {
		profile.proxyHttp = profile.proxy;
		delete profile.proxy;
	}
	if (profile.bypassProxy != undefined) {
		profile.proxyExceptions = profile.bypassProxy;
		delete profile.bypassProxy;
	}
	if (profile.configUrl != undefined) {
		profile.proxyConfigUrl = profile.configUrl;
		delete profile.configUrl;
	}
	if (profile.proxyMode == undefined) {
		if (profile.proxyConfigUrl != undefined && profile.proxyConfigUrl.trim().length > 0)
			profile.proxyMode = ProfileManager.proxyModes.auto;
		else
			profile.proxyMode = ProfileManager.proxyModes.manual;
	}
	
	return profile;
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
	if (profile1.proxyMode != profile2.proxyMode)
		return false;
	
	if (profile1.proxyMode == ProfileManager.proxyModes.direct)
		return true;
	
	if (profile1.proxyMode == ProfileManager.proxyModes.manual) {
		if (profile1.proxyHttp != profile2.proxyHttp || profile1.useSameProxy != profile2.useSameProxy)
			return false;

		if (profile1.useSameProxy)
			return true;

		return (profile1.proxyHttps == profile2.proxyHttps
				&& profile1.proxyFtp == profile2.proxyFtp
				&& profile1.proxySocks == profile2.proxySocks);
	}
	
	if (profile1.proxyMode == ProfileManager.proxyModes.auto)
		return (profile1.proxyConfigUrl == profile2.proxyConfigUrl);
};

/**
 * Checks if the given profile exists in profiles array.
 * @param profile
 * @return the found profile, undefined otherwise.
 */
ProfileManager.contains = function contains(profile) {
	var profiles = ProfileManager.getProfiles();
	for (i in profiles) {
		if (ProfileManager.equals(profiles[i], profile))
			return profiles[i];
	}
	return undefined;
};
