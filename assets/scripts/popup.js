/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;

function init() {
	extension = chrome.extension.getBackgroundPage();

	rebuildProxyMenuItems();
	buildDirectConnectionMenuItem();
	
	$("#about").click(closePopup);
	$("#about .versionNumber").text(extension.appVersion);
	
	checkNewVersionBadge();
}

function closePopup() {
	window.close();
}

function openOptions() {
	extension.openOptions();
}

function openContactEmail() {
	chrome.tabs.create({
		url: 'mailto:Mhd Hejazi <mohammadhi+switchy@gmail.com>?subject=[Switchy!] Contact'
	});
}

function openWebsite() {
	chrome.tabs.create({
		url: 'http://www.samabox.com/projects/chrome/switchy/'
	});
}

function showAbout() {
	$("#menu, #about").toggle();
	$(document.body).height($("#about").height());
	$(window).height($("#about").height());
}

function selectProxyItem() {
	if (!event || !event.target)
		return;
	
	var item = (event.target.id) ? $(event.target) : $(event.target.parentNode);
	var profile = item[0].profile;
	extension.ProfileManager.applyProfile(profile);
	extension.setIconInfo(profile);

	closePopup();

	$("#menu .item").removeClass("checked");
	item.addClass("checked");
}

function clearProxyMenuItems() {
	$("#proxies .item").remove();
}

function buildProxyMenuItems() {
	var profiles = extension.ProfileManager.getSortedProfileArray();
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	var menu = $("#proxies");
	var templateItem = $("#proxies .templateItem");
	for (var i in profiles) {
		var profile = profiles[i];
		var item = templateItem.clone().attr({
			"id": profile.proxy,
			"name": profile.name,
			"title": "Proxy (" + profile.proxy + ")",
			"class": "item proxy"
		});
		$("span", item).text(profile.name);
		item.click(selectProxyItem);
		item[0].profile = profile;
		if (extension.ProfileManager.equals(profile, currentProfile))
			item.addClass("checked");
		
		menu.append(item);
	}
	$("#menu .separator:first").show();
	if (currentProfile.unknown) {
		var item = templateItem.clone().attr({
			"id": currentProfile.proxy,
			"name": currentProfile.name,
			"title": "Proxy (" + currentProfile.proxy + ")",
			"class": "item proxy checked"
		});
		$("span", item).text(currentProfile.proxy);
		item.click(selectProxyItem);
		item[0].profile = currentProfile;
		
		menu.append(item);
	} else if (profiles.length == 0) {
		$("#menu .separator:first").hide();
	}
}

function rebuildProxyMenuItems() {
	clearProxyMenuItems();
	buildProxyMenuItems();
}

function buildDirectConnectionMenuItem() {
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	var item = $("#directConnection");
	item.click(selectProxyItem);
	item[0].profile = extension.ProfileManager.directConnectionProfile;
	if (item[0].profile.proxy == currentProfile.proxy)
		item.addClass("checked");
}

function checkNewVersionBadge() {
	if (extension.newVersion) {
		extension.newVersion = false;
		extension.Settings.setValue("version", extension.appVersion.substr(0, 5));
		extension.setIconBadge("");
		extension.setIconInfo();
		
		$("#developer").height(30).addClass("important").css("text-align", "center");
		$("#developer").text("Updated to a new version (" + extension.appVersion + ")");
		$("#menu").hide();
		$("#about").show();
	}
}
