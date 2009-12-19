/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
var ProfileManager;
var Settings;

function init() {
//	extension = chrome.extension.getBackgroundPage();
//	ProfileManager = extension.ProfileManager;
//	Settings = extension.Settings;

	buildMenuItems();
	
	$("#about").click(closePopup);
	$("#about .versionNumber").text(extension.appVersion);
	
	checkNewVersionBadge();
}

function switchProxy() {
	extension = chrome.extension.getBackgroundPage();
	ProfileManager = extension.ProfileManager;
	Settings = extension.Settings;

	var quickSwitch = Settings.getValue("quickSwitch", false);
	if (!quickSwitch)
		return;
	
	var quickSwitchProfiles = Settings.getObject("quickSwitchProfiles") || {};
	if (!quickSwitchProfiles.profile1 || !quickSwitchProfiles.profile2)
		return;
	
	window.stop();
	
	var profiles = ProfileManager.getProfiles();
	var currentProfile = ProfileManager.getCurrentProfile();
	var profileId;
	if (currentProfile.id == quickSwitchProfiles.profile1)
		profileId = quickSwitchProfiles.profile2;
	else
		profileId = quickSwitchProfiles.profile1;
	
	var profile;
	if (profileId == ProfileManager.directConnectionProfile.id)
		profile = ProfileManager.directConnectionProfile;
	else
		profile = profiles[profileId];
	
	if (profile == undefined)
		return;
	
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

function showAbout() {
	$("#menu, #about").toggle();
	$(document.body).height($("#about").height());
	$(window).height($("#about").height());
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
			"class": "item proxy"
		});
		$("span", item).text(profile.name);
		item.click(onSelectProxyItem);
		item[0].profile = profile;
		if (ProfileManager.equals(profile, currentProfile))
			item.addClass("checked");
		
		menu.append(item);
	}
	
	$("#menu .separator:first").show();
	
	if (currentProfile.unknown) {
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

function buildMenuItems() {
	var currentProfile = ProfileManager.getCurrentProfile();
	clearMenuProxyItems();
	buildMenuProxyItems(currentProfile);
	buildMenuDirectConnectionItem(currentProfile);
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
}

function checkNewVersionBadge() {
	if (extension.newVersion) {
		extension.newVersion = false;
		extension.Settings.setValue("version", extension.appVersion);
		extension.setIconBadge("");
		extension.setIconInfo();
		
		$("#developer").addClass("important");
		$("#developer").text("Updated to a new version (" + extension.appVersion + ")");
		$("#changeLog").show();
		$("#menu").hide();
		$("#about").show();
	}
}
