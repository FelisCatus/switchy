/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
//var ProfileManager;
//var RuleManager;
//var Settings;
var activeTabUrl = undefined;

function init() {
	buildMenuItems();
	
	$("#about, #addRule .close").click(closePopup);
	$("#about .versionNumber").text(extension.appVersion);
	
	checkNewVersionBadge();
	
	
//	showAbout();
}

function quickSwitchProxy() {
	extension = chrome.extension.getBackgroundPage();
	ProfileManager = extension.ProfileManager;
	RuleManager = extension.RuleManager;
	Settings = extension.Settings;

	if (extension.newVersion) // allow new version menu to appear.
		return;
	
	var quickSwitch = Settings.getValue("quickSwitch", false);
	if (!quickSwitch)
		return;
	
	var profile = undefined;
	var profiles = ProfileManager.getSortedProfileIdArray();
	var currentProfile = ProfileManager.getCurrentProfile();
	var quickSwitchType = Settings.getValue("quickSwitchType", "binary");
	if (quickSwitchType == "binary") {
		var quickSwitchProfiles = Settings.getObject("quickSwitchProfiles") || {};
		if (!quickSwitchProfiles.profile1 || !quickSwitchProfiles.profile2)
			return;
		
		var profileId;
		if (currentProfile.id == quickSwitchProfiles.profile1)
			profileId = quickSwitchProfiles.profile2;
		else
			profileId = quickSwitchProfiles.profile1;

		if (profileId == ProfileManager.directConnectionProfile.id)
			profile = ProfileManager.directConnectionProfile;
		else
			profile = ProfileManager.getProfile(profileId);
		
	} else {
		var index = profiles.indexOf(currentProfile.id);
		if (index == -1)
			profile = ProfileManager.getProfile(profiles[0]);
		else if (index == profiles.length - 1)
			profile = ProfileManager.directConnectionProfile;
		else
			profile = ProfileManager.getProfile(profiles[index + 1]);
	}
	
	if (profile == undefined)
		return;

	window.stop();
	
	ProfileManager.applyProfile(profile);
	extension.setIconInfo(profile);	
	
	window.close();
}

function closePopup() {
	window.close();
}

function openOptions() {
	closePopup();
	extension.openOptions();
}

function openContactEmail() {
	closePopup();
	chrome.tabs.create({
		url: 'mailto:Mhd Hejazi <mohammadhi+switchy@gmail.com>?subject=[Switchy!] Contact'
	});
}

function openMainWebsite() {
	closePopup();
	chrome.tabs.create({
		url: 'http://www.samabox.com/projects/chrome/switchy'
	});
}

function openSupportWebsite() {
	closePopup();
	chrome.tabs.create({
		url: 'http://code.google.com/p/switchy/issues/list'
	});
}

function openExtensionGalleryWebsite() {
	closePopup();
	chrome.tabs.create({
		url: 'https://chrome.google.com/extensions/detail/caehdcpeofiiigpdhbabniblemipncjj'
	});
}

function showAbout() {
	$("#menu").hide();
	$("#about").show();
	$(document.body).height($("#about").height());
	$(window).height($("#about").height());
}

function showAddRule() {
	var lastProfileId = Settings.getValue("quickRuleProfileId");
	var lastPatternType = Settings.getValue("quickRulePatternType", RuleManager.patternTypes.wildcard);
	if (lastPatternType == "regex") // backward compatibility
		lastPatternType = RuleManager.patternTypes.regexp;

	var combobox = $("#cmbProfileId");
	var profiles = ProfileManager.getSortedProfileArray();
	var directProfile = ProfileManager.directConnectionProfile;
	var item = $("<option>").attr("value", directProfile.id).text(directProfile.name);
	item[0].profile = directProfile;
	combobox.append(item);
	$.each(profiles, function(key, profile) {
		var item = $("<option>").attr("value", profile.id).text(profile.name);
		item[0].profile = profile;		
		combobox.append(item);
		if (lastProfileId == profile.id)
			item.attr("selected", "selected");
	});
	
	$("#cmbPatternType option[value='" + lastPatternType + "']").attr("selected", "selected");
	$("#txtUrlPattern, #cmbPatternType").change(function() {
		var patternField = $("#txtUrlPattern");
		var patternTypeField = $("#cmbPatternType option:selected");
		if (this.id == "cmbPatternType") {
			var previousPatternType;
			if (patternTypeField.val() == RuleManager.patternTypes.regexp)
				previousPatternType = RuleManager.patternTypes.wildcard;
			else
				previousPatternType = RuleManager.patternTypes.regexp;
			
			if (patternField.val() == RuleManager.urlToRule(activeTabUrl, previousPatternType).urlPattern)
				patternField.val(RuleManager.urlToRule(activeTabUrl, patternTypeField.val()).urlPattern);
		}
		
		if (RuleManager.ruleExists(patternField.val(), patternTypeField.val())) {
			$("#addRule .note").show();
			patternField.addClass("invalid");
		} else {
			$("#addRule .note").hide();
			patternField.removeClass("invalid");
		}

	}).keyup(function() {
		$(this).change();
	});
	
	chrome.tabs.getSelected(undefined, function(tab) {
		activeTabUrl = tab.url;
		var rule = RuleManager.urlToRule(tab.url, $("#cmbPatternType option:selected").val());
		$("#addRule")[0].rule = rule;
		$("#txtUrlPattern").val(rule.urlPattern).change();
		$("#txtRuleName").val(rule.name);
		$("#txtRuleName").focus().select();
	});
	
	$("#menu").hide();
	$("#addRule").show();
	$(document.body).height($("#addRule").height());
	$(window).height($("#addRule").height());	
}

function addSwitchRule() {
	closePopup();
	var rule = $("#addRule")[0].rule;
	rule.name = $("#txtRuleName").val();
	rule.urlPattern = $("#txtUrlPattern").val();
	rule.patternType = $("#cmbPatternType option:selected").val();
	rule.profileId = $("#cmbProfileId option:selected")[0].profile.id;
	RuleManager.addRule(rule);
	
	// notify 'Options' tabs
	try {
		var tabs = chrome.extension.getExtensionTabs();
		for (var i in tabs) {
			var tab = tabs[i];
			if (tab.location.pathname == "/options.html") {
				tab.loadOptions();
			}
		}
	} catch (e) {}
	
	Settings.setValue("quickRuleProfileId", rule.profileId);
	Settings.setValue("quickRulePatternType", rule.patternType);
}

function clearMenuProxyItems() {
	$("#proxies .item").remove();
}

function buildMenuProxyItems(currentProfile) {	
	var profiles = ProfileManager.getSortedProfileArray();
	var menu = $("#proxies");
	var templateItem = $("#proxies .templateItem");
	for (var i in profiles) {
		var profile = profiles[i];
		var item = templateItem.clone().attr({
			"id": profile.id || profile.name,
			"name": profile.name,
			"title": ProfileManager.profileToString(profile, true),
			"class": "item proxy " + profile.color
		});
		$("span", item).text(profile.name);
		item.click(onSelectProxyItem);
		item[0].profile = profile;
		if (ProfileManager.equals(profile, currentProfile))
			item.addClass("checked");
		
		menu.append(item);
	}
	
	$("#menu .separator:first").show();
	
	if (currentProfile.unknown && currentProfile.proxyMode != ProfileManager.proxyModes.direct) {
		var item = templateItem.clone().attr({
			"id": currentProfile.id,
			"name": currentProfile.name,
			"title": ProfileManager.profileToString(currentProfile, true),
			"class": "item proxy checked"
		});
		$("span", item).text(currentProfile.name);
		item.click(onSelectProxyItem);
		item[0].profile = currentProfile;
		
		menu.append(item);
		
	} else if (profiles.length == 0) {
		$("#menu .separator:first").hide();
	}
}

function buildMenuDirectConnectionItem(currentProfile) {
	var item = $("#directConnection");
	item.click(onSelectProxyItem);
	item[0].profile = ProfileManager.directConnectionProfile;
	if (currentProfile.proxyMode == ProfileManager.proxyModes.direct)
		item.addClass("checked");
}

function buildMenuAutomaticModeItem(currentProfile) {
	var item = $("#automaticMode");
	if (!RuleManager.isEnabled()) {
		item.hide();
		$("#menuAddRule").hide();
		$("#separatorRules").hide();
		return;
	}
	var autoProfile = RuleManager.getAutomaticModeProfile(true);
	item.click(onSelectProxyItem);
	item[0].profile = autoProfile;
	if (RuleManager.isAutomaticModeEnabled(currentProfile)) {
		item.addClass("checked");
		delete currentProfile.unknown; // to prevent adding <current profile> item.
	}
}

function buildMenuItems() {
	var currentProfile = ProfileManager.getCurrentProfile();
	clearMenuProxyItems();
	buildMenuDirectConnectionItem(currentProfile);
	buildMenuAutomaticModeItem(currentProfile);
	buildMenuProxyItems(currentProfile);
}

function onSelectProxyItem() {
	if (!event || !event.target)
		return;
	
	var item = (event.target.id) ? $(event.target) : $(event.target.parentNode); // click on the item or its child?
	var profile = item[0].profile;
	
	ProfileManager.applyProfile(profile);
	extension.setIconInfo(profile);

	closePopup();

	$("#menu .item").removeClass("checked");
	item.addClass("checked");
	
	if (profile.isAutomaticModeProfile)
		checkRulesFirstTimeUse();
}

function checkRulesFirstTimeUse() {
	if (!Settings.keyExists("rulesFirstTime")) {
		Settings.setValue("rulesFirstTime", ";]");
		if (!RuleManager.hasRules()) {
			var url = "options.html?rulesFirstTime=true&tab=rules";
			chrome.tabs.create({ url: url });
		}
	}
}

function checkNewVersionBadge() {
	if (extension.newVersion) {
		extension.newVersion = false;
		extension.Settings.setValue("version", extension.appVersion);
		extension.setIconBadge("");
		extension.setIconInfo();
		
		$("#developer").addClass("important");
		$("#developer").text("You've been updated to a new version.");
		$("#changeLog").show();
		$("#menu").hide();
		$("#about").show();
	}
}
