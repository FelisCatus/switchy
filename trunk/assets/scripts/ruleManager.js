/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/


var RuleManager = {};

RuleManager.rules = {};

RuleManager.patternTypes = {
	wildcard: "wildcard",
	regex: "regex"
};

RuleManager.enabled = true;

RuleManager.ruleListEnabled = false;

RuleManager.autoPacScriptPath = undefined;

RuleManager.socksPacScriptPath = undefined;

RuleManager.defaultRule = {
	id: "defaultRule",
	name: "Default Rule",
	urlPattern: "",
	patternType: RuleManager.patternTypes.wildcard,
	profileId : ProfileManager.directConnectionProfile.id
};

RuleManager.load = function loadRules() {
	var rules = Settings.getObject("rules");
	if (rules != undefined) {
		for (var i in rules) {
			var rule = rules[i];
			rule = RuleManager.fixRule(rule);
		}

		RuleManager.rules = rules;
	}
	
	RuleManager.enabled = Settings.getValue("switchRules", true);
	
	var rule = Settings.getObject("defaultRule");
	if (rule != undefined)
		RuleManager.defaultRule = rule;

	RuleManager.ruleListEnabled = Settings.getValue("ruleListEnabled", false);
};

RuleManager.save = function saveRules() {
	Settings.setObject("rules", RuleManager.rules);
	Settings.setValue("switchRules", RuleManager.enabled);		
	Settings.setObject("defaultRule", RuleManager.defaultRule);
	Settings.setValue("ruleListEnabled", RuleManager.ruleListEnabled);		
};

RuleManager.isEnabled = function isEnabled() {
	return RuleManager.enabled;
};

RuleManager.setEnabled = function setEnabled(enabled) {
	RuleManager.enabled = (enabled == true);
};

RuleManager.isRuleListEnabled = function isRuleListEnabled() {
	return RuleManager.ruleListEnabled;
};

RuleManager.setRuleListEnabled = function setRuleListEnabled(enabled) {
	RuleManager.ruleListEnabled = (enabled == true);
};

RuleManager.getDefaultRule = function getDefaultRule() {
	return RuleManager.defaultRule;
};

RuleManager.setDefaultRule = function setDefaultRule(rule) {
	RuleManager.defaultRule = rule;
};

RuleManager.getRules = function getRules() {
	var rules = {};
	for (var i in RuleManager.rules) {
		var rule = RuleManager.rules[i];
		rule = RuleManager.normalizeRule(rule);
		rules[i] = rule;
	}
	
	return rules;
};

RuleManager.setRules = function setRules(rules) {
	rules = $.extend(true, {}, rules);
	RuleManager.rules = rules;
};

RuleManager.addRule = function addRule(rule) {
	RuleManager.rules[rule.id] = rule;
	RuleManager.save();
	
	if (RuleManager.isAutomaticModeEnabled(undefined))
		ProfileManager.applyProfile(RuleManager.getAutomaticModeProfile(true));
};

RuleManager.getSortedRuleArray = function getSortedRuleArray() {
	var rules = RuleManager.getRules();
	var ruleArray = [];
	for (var i in rules)
		ruleArray[ruleArray.length] = rules[i];

	ruleArray = ruleArray.sort(Utils.compareNamedObjects);
	return ruleArray;
};

RuleManager.getAssociatedRule = function getAssociatedRule(url) {
	var rules = RuleManager.rules;
	for (var i in rules) {
		var rule = rules[i];
		if (RuleManager.matchPattern(url, rule.urlPattern, rule.patternType))
			return rule;
	}
	return undefined;
};

RuleManager.ruleExists = function ruleExists(urlPattern, patternType) {
	var rules = RuleManager.rules;
	for (var i in rules) {
		var rule = rules[i];
		if (rule.patternType == patternType && rule.urlPattern == urlPattern)
			return true;
	}
	return false;
};

RuleManager.saveAutoPacScript = function saveAutoPacScript() {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var script = RuleManager.generateAutoPacScript();
	try {
		var result = plugin.writeAutoPacFile(script);
		if (result != 0 || result != "0")
			throw "Error Code (" + result + ")";
		
	} catch(ex) {
		Logger.log("Plugin Error @RuleManager.saveAutoPacScript() > " + ex.toString(), Logger.types.error);		
		return false;
	}
};

RuleManager.saveSocksPacScript = function saveSocksPacScript(profile) {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var script = RuleManager.generateSocksPacScript(profile);
	try {
		var result = plugin.writeSocksPacFile(script);
		if (result != 0 || result != "0")
			throw "Error Code (" + result + ")";
		
	} catch(ex) {
		Logger.log("Plugin Error @RuleManager.saveSocksPacScript() > " + ex.toString(), Logger.types.error);		
		return false;
	}
};

RuleManager.wildcardToRegexp = function wildcardToRegexp(pattern) {
	pattern = pattern.replace(/([\\\+\|\{\}\[\]\(\)\^\$\.\#])/g, "\\$1");
//	pattern = pattern.replace(/\./g, "\\.");
	pattern = pattern.replace(/\*/g, ".*");
	pattern = pattern.replace(/\?/g, ".");
	var regex = /*new RegExp*/("^" + pattern + "$");
	return regex;
};

RuleManager.shExpMatch = function shExpMatch(url, pattern) {
	pattern = pattern.replace(/\./g, "\\.");
	pattern = pattern.replace(/\*/g, ".*");
	pattern = pattern.replace(/\?/g, ".");
	var regex = new RegExp("^" + pattern + "$");
	return regex.test(url);
};

RuleManager.regexMatch = function regexMatch(url, pattern) {
	var regex = new RegExp(pattern);
	return regex.test(url);
};

RuleManager.matchPattern = function matchPattern(url, pattern, patternType) {
	if (patternType == RuleManager.patternTypes.regex)
		return RuleManager.regexMatch(url, pattern);
	
	return RuleManager.shExpMatch(url, pattern);
};

RuleManager.urlToRule = function urlToRule(url, patternType) {
	var urlParts = parseUri(url);
	var pattern = "*://" + urlParts["authority"] + "/*";
	var nameId = RuleManager.generateId("Quick Rule ");
	var rule = {
		id: nameId,
		name: nameId,
		urlPattern: (patternType == RuleManager.patternTypes.regex ? RuleManager.wildcardToRegexp(pattern) : pattern),
		patternType: patternType,
		profileId : ProfileManager.directConnectionProfile.id
	};
	return rule;
};

RuleManager.generateId = function generateId(ruleName) {
	var rules = RuleManager.rules;
	var ruleId = ruleName;
	if (rules[ruleId] != undefined) {
		for (var j = 2; ; j++) {
			var newId = ruleId + j;
			if (rules[newId] == undefined) {
				ruleId = newId;
				break;
			}
		}
	}
	return ruleId;
};

RuleManager.ruleToString = function ruleToString(rule, prettyPrint) {
	if (!prettyPrint)
		return "Rule: " + JSON.stringify(rule);
	
	var result = [];
	if (rule.name != undefined)
		result.push(rule.name); 
	
	if (rule.urlPattern != undefined && rule.urlPattern.trim().length > 0) {
		result.push("URL Pattern: " + rule.patternType + "(" + rule.urlPattern + ")"); 
	}
	if (rule.profileId != undefined && rule.profileId.trim().length > 0)
		result.push("Proxy Profile: " + ProfileManager.getProfiles()[rule.profileId]);
	
	return result.join("\n");
};

RuleManager.ruleToScript = function ruleToScript(rule) {
	var proxy = "DIRECT";
	if (rule.profileId != ProfileManager.directConnectionProfile.id) {
		var profile = ProfileManager.getProfile(rule.profileId);
		if (profile != undefined && profile.proxyMode == ProfileManager.proxyModes.manual) {
			if (profile.proxyHttp && profile.proxyHttp.length > 0)
				proxy = "PROXY " + profile.proxyHttp;
			
			if (profile.proxySocks && profile.proxySocks.length > 0
				&& !profile.useSameProxy && profile.proxySocks != profile.proxyHttp) { // workaround for Gnome
				if (profile.socksVersion == 5)
					proxy = "SOCKS5 " + profile.proxySocks + "; " + proxy;
				else
					proxy = "SOCKS " + profile.proxySocks + "; " + proxy;
			} 
		}
	}
	
	var matchFunc = (rule.patternType == RuleManager.patternTypes.regex ? "regExpMatch" : "shExpMatch");
	var script = "if (";
	script += matchFunc + "(url, '" + rule.urlPattern + "')";
	if (rule.patternType != RuleManager.patternTypes.regex
		&& (rule.urlPattern.indexOf("://*.") > 0 || rule.urlPattern.indexOf("*.") == 0))
		script += " || shExpMatch(url, '" + rule.urlPattern.replace("*.", "") + "')";

	return script + ") return '" + proxy + "';";
};

RuleManager.generatePacScript = function generatePacScript(rules, defaultProfile) {
	var script = [];	
	script.push("function regExpMatch(url, pattern) {");
	script.push("\ttry { return new RegExp(pattern).test(url); } catch(ex) {}");
	script.push("}\n");
	script.push("function FindProxyForURL(url, host) {");
	for (var i in rules) {
		var rule = rules[i];
		script.push("\t" + RuleManager.ruleToScript(rule));
	}
	
	var proxy = "DIRECT";
	var profile = defaultProfile;
	if (profile != undefined && 
		(profile.isAutomaticModeProfile || profile.proxyMode == ProfileManager.proxyModes.manual)) {
		if (profile.proxyHttp && profile.proxyHttp.length > 0)
			proxy = "PROXY " + profile.proxyHttp;
		
		if (profile.proxySocks && profile.proxySocks.length > 0
			&& !profile.useSameProxy && profile.proxySocks != profile.proxyHttp) { // workaround for useSameProxy in Gnome
			if (profile.socksVersion == 5)
				proxy = "SOCKS5 " + profile.proxySocks + "; " + proxy;
			else
				proxy = "SOCKS " + profile.proxySocks + "; " + proxy;
		} 
	}
	script.push("\t" + "return '" + proxy + "';");
	script.push("}");
	
	return script.join("\r\n");
};

RuleManager.generateAutoPacScript = function generateAutoPacScript() {
	var rules = RuleManager.rules;
	var defaultProfile = RuleManager.getAutomaticModeProfile(false);
	
	if (RuleManager.isRuleListEnabled()) {
		var ruleListRules = Settings.getObject("ruleListRules");
		var ruleListProfileId = Settings.getValue("ruleListProfileId");
		if (ruleListRules != undefined) {
			for (var i = 0; i < ruleListRules.wildcard.length; i++) {
				var urlPattern = ruleListRules.wildcard[i];
				rules["__ruleW" + i] = {
					urlPattern: urlPattern,
					patternType: RuleManager.patternTypes.wildcard,
					profileId : ruleListProfileId
				};
			}
			for (var i = 0; i < ruleListRules.regexp.length; i++) {
				var urlPattern = ruleListRules.regexp[i];
				rules["__ruleR" + i] = {
					urlPattern: urlPattern,
					patternType: RuleManager.patternTypes.regexp,
					profileId : ruleListProfileId
				};
			}
		}
	}
	
	return RuleManager.generatePacScript(rules, defaultProfile);
};

RuleManager.generateSocksPacScript = function generateSocksPacScript(profile) {
	return RuleManager.generatePacScript([], profile);
};

RuleManager.getAutoPacScriptPath = function getAutoPacScriptPath(withSalt) {
	if (RuleManager.autoPacScriptPath == undefined) {
		var plugin = chrome.extension.getBackgroundPage().plugin;
		try {
			RuleManager.autoPacScriptPath = plugin.autoPacScriptPath;
		} catch(ex) {
			Logger.log("Plugin Error @RuleManager.getAutoPacScriptPath() > " + ex.toString(), Logger.types.error);
			return undefined;
		}
	}
	
	return RuleManager.autoPacScriptPath + (withSalt ? "?" + new Date().getTime() : "");
};

RuleManager.getSocksPacScriptPath = function getSocksPacScriptPath(withSalt) {
	if (RuleManager.socksPacScriptPath == undefined) {
		var plugin = chrome.extension.getBackgroundPage().plugin;
		try {
			RuleManager.socksPacScriptPath = plugin.socksPacScriptPath;
		} catch(ex) {
			Logger.log("Plugin Error @RuleManager.getSocksPacScriptPath() > " + ex.toString(), Logger.types.error);
			return undefined;
		}
	}
	
	return RuleManager.socksPacScriptPath + (withSalt ? "?" + new Date().getTime() : "");
};

RuleManager.getAutomaticModeProfile = function getAutomaticModeProfile(withSalt) {
	var rule = RuleManager.getDefaultRule();
	var profile = ProfileManager.getProfile(rule.profileId);
	if (profile == undefined)
		return undefined;
	
	profile.id = "";
	profile.proxyMode = ProfileManager.proxyModes.auto;
	profile.proxyConfigUrl = RuleManager.getAutoPacScriptPath(withSalt);
	profile.color = "auto-blue";
	profile.name = "Auto Swtich Mode";
	profile.isAutomaticModeProfile = true;
	return profile;
};

RuleManager.isAutomaticModeEnabled = function isAutomaticModeEnabled(currentProfile) {
	if (currentProfile == undefined)
		currentProfile = ProfileManager.getCurrentProfile();
	
	if (currentProfile.proxyMode != ProfileManager.proxyModes.auto)
		return false;
	
	var autoProfile = RuleManager.getAutomaticModeProfile(false);
	var length = autoProfile.proxyConfigUrl.length;
	if (currentProfile.proxyConfigUrl.length > length && currentProfile.proxyConfigUrl.charAt(length) != '?')
		return false;
	
	return (currentProfile.proxyConfigUrl.substr(0, length) == autoProfile.proxyConfigUrl);
};

RuleManager.isModifiedSocksProfile = function isModifiedSocksProfile(profile) {
	if (profile.proxyMode != ProfileManager.proxyModes.auto)
		return false;
	
	var scriptPath = RuleManager.getSocksPacScriptPath(false);
	var length = scriptPath.length;
	if (profile.proxyConfigUrl.length > length && profile.proxyConfigUrl.charAt(length) != '?')
		return false;
	
	return (profile.proxyConfigUrl.substr(0, length) == scriptPath);
};

RuleManager.reloadRuleList = function reloadRuleList(scheduleNextReload) {
	if (!RuleManager.isRuleListEnabled())
		return;
	
	if (scheduleNextReload) {
		var interval = Settings.getValue("ruleListReload", 1) * 1000 * 60;
		setTimeout(function() {
			RuleManager.reloadRuleList(true);
		}, interval);
	}
	
	var ruleListUrl = Settings.getValue("ruleListUrl");
	if (!(/^https?:\/\//).test(ruleListUrl)) {
		Logger.log("Invalid rule list url: (" + ruleListUrl + ")", Logger.types.error);
		return;
	}

	$.ajaxSetup({ cache: false });
	$.get(
		ruleListUrl,
		undefined,
		function(data, textStatus){
			if (data.length <= 1024 * 1024) // bigger than 1 megabyte
				RuleManager.parseRuleList(data);
			else {
				Logger.log("Too big rule list file!", Logger.types.error);
			}
		},
		"text"
	);
};

RuleManager.parseRuleList = function parseRuleList(data) {
	data = (/#BEGIN((?:.|[\n\r])+)#END/i).exec(data);
	if (data == null || data.length < 2)
		return;
	
	data = data[1].trim();
	var lines = data.split(/[\r\n]+/);
	var rules = {
		wildcard: [],
		regexp: []
	};
	var patternType = RuleManager.patternTypes.wildcard;
	for (var index = 0; index < lines.length; index++) {
		var line = lines[index].trim();
		
		if (line.length == 0 || line[0] == ';' || line[0] == '!') // comment line
			continue;
		
		if (line.toLowerCase() == "[wildcard]") {
			patternType = RuleManager.patternTypes.wildcard;
			continue;
		}
		
		if (line.toLowerCase() == "[regexp]") {
			patternType = RuleManager.patternTypes.regex;
			continue;
		}

		if (line[0] == '[') // unknown section
			continue;
		
		rules[patternType].push(line);
	}
	
	Settings.setObject("ruleListRules", rules);
	
	if (RuleManager.isAutomaticModeEnabled(undefined)) {
		var profile = RuleManager.getAutomaticModeProfile(true);
		ProfileManager.applyProfile(profile);
	}
//	console.log(rules);
};

RuleManager.normalizeRule = function normalizeRule(rule) {
	var newRule = {
		name: "",
		urlPattern: "",
		patternType: RuleManager.patternTypes.wildcard,
		profileId : ProfileManager.directConnectionProfile.id
	};
	$.extend(newRule, rule);
	return newRule;
};

RuleManager.fixRule = function fixRule(rule) {
	return rule;
};

RuleManager.hasRules = function hasRules() {
	var result = false;
	for (i in RuleManager.rules) {
		result = true;
		break;
	}
	
	return result;
};

RuleManager.equals = function equals(rule1, rule2) {
	return (rule1.urlPattern == rule2.urlPattern
			&& rule1.patternType == rule2.patternType
			&& rule1.profileId == rule2.profileId);
};

RuleManager.contains = function contains(rule) {
	var rules = RuleManager.getRules();
	for (i in rules) {
		if (RuleManager.equals(rules[i], rule))
			return rules[i];
	}
	return undefined;
};

///////////////////////////////////////////////////////////////////////////
//   parseUri 1.2.2                                                      //
//   (c) Steven Levithan <stevenlevithan.com>                            //
//   MIT License                                                         //
///////////////////////////////////////////////////////////////////////////

function parseUri(str) {
	var options = parseUri.options;
	var matches = options.parser[options.strictMode ? "strict" : "loose"].exec(str);
	var uri = {};
	var i = 14;

	while (i--) {
		uri[options.key[i]] = matches[i] || "";
	}
	uri[options.query.name] = {};
	uri[options.key[12]].replace(options.query.parser, function($0, $1, $2) {
		if ($1)
			uri[options.query.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode : false,
	key : [ "source", "protocol", "authority", "userInfo", "user", "password",
			"host", "port", "relative", "path", "directory", "file", "query",
			"anchor" ],
	query : {
		name : "queryKey",
		parser : /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser : {
		strict : /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose : /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

