/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/


var RuleManager = {};

RuleManager.rules = {};

RuleManager.enabled = true;

RuleManager.pacScriptPath = undefined;

RuleManager.defaultRule = {
	id: "defaultRule",
	name: "Default Rule",
	urlPattern: "",
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
};

RuleManager.save = function saveRules() {
	Settings.setObject("rules", RuleManager.rules);
	Settings.setValue("switchRules", RuleManager.enabled);		
	Settings.setObject("defaultRule", RuleManager.defaultRule);
};

RuleManager.isEnabled = function isEnabled() {
	return RuleManager.enabled;
};

RuleManager.setEnabled = function setEnabled(enabled) {
	RuleManager.enabled = (enabled == true);
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
	var rules = $.extend(true, {}, rules);
	RuleManager.rules = rules;
};

RuleManager.addRule = function addRule(rule) {
	RuleManager.rules[rule.id] = rule;
	RuleManager.save();
	
	if (RuleManager.isAutomaticModeEnabled())
		ProfileManager.applyProfile(RuleManager.getAutomaticModeProfile(true));
};

RuleManager.getSortedRuleArray = function getSortedRuleArray() {
	var rules = RuleManager.getRules();
	var ruleArray = [];
	for (var i in rules)
		ruleArray[ruleArray.length] = rules[i];

	ruleArray = ruleArray.sort(function(rule1, rule2) {
		var name1 = rule1.name.toLowerCase();
		var name2 = rule2.name.toLowerCase();
		var length = Math.min(name1.length, name2.length);
		for (var i = 0; i < length; i++) {
			var ch1 = name1.charCodeAt(i);
			var ch2 = name2.charCodeAt(i);
			if (ch1 != ch2)
				return ch1 - ch2;
		}
		
		return name1.length - name2.length;
	});
	
	return ruleArray;
};

RuleManager.getAssociatedRule = function getAssociatedRule(url) {
	var rules = RuleManager.rules;
	for (var i in rules) {
		var rule = rules[i];
		if (RuleManager.shExpMatch(url, rule.urlPattern))
			return rule;
	}
	return undefined;
};

RuleManager.applyRules = function applyRules() {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	var script = RuleManager.generatePacScript();
	try {
		var result = plugin.writePacFile(script);
		if (result != 0 || result != "0")
			throw "Error Code (" + result + ")";
		
	} catch(ex) {
		Logger.log("Plugin Error @RuleManager.applyRules() > " + ex.toString(), Logger.types.error);		
		return false;
	}
};

RuleManager.shExpMatch = function shExpMatch(url, pattern) {
	pattern = pattern.replace(/\./g, '\\.');
	pattern = pattern.replace(/\*/g, '.*');
	pattern = pattern.replace(/\?/g, '.');
	var rex = new RegExp('^' + pattern + '$');
	return rex.test(url);
};

RuleManager.urlToRule = function urlToRule(url) {
	var urlParts = parseUri(url);
	var pattern = "*://" + urlParts["authority"] + "/*";
	var nameId = RuleManager.generateId("Quick Rule ");
	var rule = {
		id: nameId,
		name: nameId,
		urlPattern: pattern,
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
	
	if (rule.urlPattern != undefined && rule.urlPattern.trim().length > 0)
		result.push("URL Pattern: " + rule.urlPattern); 
	
	if (rule.profileId != undefined && rule.profileId.trim().length > 0)
		result.push("Proxy Profile: " + ProfileManager.getProfiles()[rule.profileId]);
	
	return result.join("\n");
};

RuleManager.ruleToScript = function ruleToScript(rule) {
	var proxy = "DIRECT";
	if (rule.profileId != ProfileManager.directConnectionProfile.id) {
		var profile = ProfileManager.getProfile(rule.profileId);
		if (profile != undefined) {
			if (profile.proxySocks && profile.proxySocks.length > 0)
				proxy = "SOCKS " + profile.proxySocks;
			else if (profile.proxyHttp && profile.proxyHttp.length > 0)
				proxy = "PROXY " + profile.proxyHttp;
		}
	}
	if (rule.urlPattern.indexOf("://*.") > 0 || rule.urlPattern.indexOf("*.") == 0)
		var pattern2 = rule.urlPattern.replace("*.", "");
	
	var script = "if (";
	script += "shExpMatch(url, '" + rule.urlPattern + "')";
	if (rule.urlPattern.indexOf("://*.") > 0 || rule.urlPattern.indexOf("*.") == 0)
		script += " || shExpMatch(url, '" + rule.urlPattern.replace("*.", "") + "')";

	return script + ") return '" + proxy + "';";
};

RuleManager.generatePacScript = function generatePacScript() {
	var script = [];
	var rules = RuleManager.rules;
	
	script.push("function FindProxyForURL(url, host) {");
	for (var i in rules) {
		var rule = rules[i];
		script.push("\t" + RuleManager.ruleToScript(rule));
	}
	
	var proxy = "DIRECT";
	var profile = RuleManager.getAutomaticModeProfile();
	if (profile != undefined) {
		if (profile.proxySocks && profile.proxySocks.length > 0)
			proxy = "SOCKS " + profile.proxySocks;
		else if (profile.proxyHttp && profile.proxyHttp.length > 0)
			proxy = "PROXY " + profile.proxyHttp;
	}
	script.push("\t" + "return '" + proxy + "';");
	script.push("}");
	
	return script.join("\r\n");
};

RuleManager.getPacScriptPath = function getPacScriptPath() {
	var plugin = chrome.extension.getBackgroundPage().plugin;
	if (RuleManager.pacScriptPath == undefined) {
		try {
			RuleManager.pacScriptPath = plugin.pacScriptPath;
		} catch(ex) {
			Logger.log("Plugin Error @RuleManager.getPacScriptPath() > " + ex.toString(), Logger.types.error);
			return undefined;
		}
	}
	return RuleManager.pacScriptPath;
};

RuleManager.getAutomaticModeProfile = function getAutomaticModeProfile(withSalt) {
	var rule = RuleManager.getDefaultRule();
	var profile = ProfileManager.getProfile(rule.profileId);
	if (profile == undefined)
		return undefined;
	
	profile.id = "";
	profile.proxyMode = ProfileManager.proxyModes.auto;
	profile.proxyConfigUrl = RuleManager.getPacScriptPath() + (withSalt ? "?" + new Date().getTime() : "");
	profile.color = "auto";
	profile.name = "Auto Swtich Mode";
	profile.isAutomaticModeProfile = true;
	return profile;
};

RuleManager.isAutomaticModeEnabled = function isAutomaticModeEnabled(currentProfile) {
	if (currentProfile == undefined)
		currentProfile = ProfileManager.getCurrentProfile();
	
	if (currentProfile.proxyMode != ProfileManager.proxyModes.auto)
		return false;
	
	var autoProfile = RuleManager.getAutomaticModeProfile();
	var length = autoProfile.proxyConfigUrl.length;
	if (currentProfile.proxyConfigUrl.length > length && currentProfile.proxyConfigUrl.charAt(length) != '?')
		return false;
	
	return (currentProfile.proxyConfigUrl.substring(0, length) == autoProfile.proxyConfigUrl);
};

RuleManager.normalizeRule = function normalizeRule(rule) {
	var newRule = {
		name: "",
		urlPattern: "",
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

