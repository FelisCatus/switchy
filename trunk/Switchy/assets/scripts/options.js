/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
var anyValueModified = false;

function init() {
	extension = chrome.extension.getBackgroundPage();
	initLogStuff();
	loadOptions();
	processParams();
	
	$("#chkBypassLocal").click(function() {
		anyValueModified = true;
	});
}

function loadOptions() {
	$("#proxyProfiles .tableRow").remove();
	var table = $("#proxyProfiles");
	var profiles = extension.ProfileManager.getSortedProfileArray();
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	for (var i in profiles) {
		var profile = profiles[i];
		newRow(profile);
	}
	if (currentProfile.unknown) {
		currentProfile.name = "<Current Profile>";
		newRow(currentProfile);
	} else if (profiles.length == 0) {
		newRow({});
	}
	
	var bypassLocal = extension.Settings.getValue("bypassLocal");
	if (bypassLocal)
		$("#chkBypassLocal").attr("checked", "checked");
}

function saveOptions() {
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	var profiles = {};
	var rows = $("#proxyProfiles .tableRow");
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var profileProxyServer = $(".profileProxyServer", row).text();
		if (!profileProxyServer || profileProxyServer.length < 3)
			continue;
		
		var profileName = $(".profileName", row).text();
		var profileProxyPort = $(".profileProxyPort", row).text();
		var profileProxy = joinProxy(profileProxyServer, profileProxyPort);
		var profile = { name: profileName, proxy: profileProxy };
		profiles[profileProxy] = profile;
		
		if (row.profile && row.profile.proxy == currentProfile.proxy)
			extension.ProfileManager.applyProfile(profile);
	}
	
	var bypassLocal = $("#chkBypassLocal").is(":checked");
	extension.Settings.setValue("bypassLocal", bypassLocal);
	
	extension.ProfileManager.profiles = profiles;
	extension.ProfileManager.saveProfiles();
	
	anyValueModified = false;
	InfoTip.showMessage("Options Saved..", InfoTip.success);
	
	loadOptions();
}

function closeWindow() {
	if (anyValueModified && confirm("\nSave changed values?"))
		saveOptions();
	
	window.close();
}

function enterFieldEditMode(cell) {
	var input = $("input", cell);
	var span = $("span", cell);
	if (input.is(":visible"))
		return;
	
	input.val(span.text());
	input.toggle();
	span.toggle();
	input.focus();
}

function exitFieldEditMode(cell) {
	var input = $("input", cell);
	var span = $("span", cell);
	var newValue = input.val();
	if (newValue == "")
		newValue = "\x0b\x20"; // workaround for jQuery bug (toggling an empty span).
		
	if (span.hasClass("profileProxyServer") && newValue.indexOf(":") > 0) {
		var proxyInfo = parseProxy(newValue);
		newValue = proxyInfo.proxy;
		$("span", cell.parentNode.nextElementSibling).text(proxyInfo.port);
	}
	if (!anyValueModified)
		anyValueModified = (span.text() != newValue);
	
	span.text(newValue);
	input.toggle();
	span.toggle();
}

function newRow(profile) {
	var table = $("#proxyProfiles");
	var row = $("#proxyProfiles .templateRow").clone();
	var cell = row.children(":first-child");
	row.removeClass("templateRow").addClass("tableRow");	
	table.append(row);
	
	$("td", row).click(function() {
		enterFieldEditMode(this);
	});
	$("input", row).blur(function() {
		exitFieldEditMode(this.parentNode);
	}).keypress(function() {
		if (event.keyCode == 13)
			$(event.target).blur();
	});
	
	if (profile) {
		var proxyInfo = parseProxy(profile.proxy);
		$(".profileName", row).text(profile.name);
		$(".profileProxyServer", row).text(proxyInfo.proxy);
		$(".profileProxyPort", row).text(proxyInfo.port);
		row[0].profile = profile;
		if (profile.unknown)
			row.addClass("unknown");
	} else {
		$("td:first", row).click();
	}
}

function deleteRow() {
	var row = event.target.parentNode.parentNode;
	if (confirm("\nAre you sure you want to delete selected profile?" + 
		"\n\nSelected Profile: (" + row.children[0].innerText + ")"))
		$(row).remove();
}

function parseProxy(proxy, port) {
	var parts;
	if (proxy && proxy.indexOf(":") > 0)
		parts = proxy.split(":");
	else
		parts = [proxy, port];
	
	return { proxy: parts[0], port: parts[1] };
}

function joinProxy(proxy, port) {
	if (proxy.indexOf(":") > 0)
		return proxy;
	
	if (port.trim().length == 0)
		port = "8080";
	
	return proxy + ":" + port;
}

function toggleImportExportArea() {
	var profiles = extension.ProfileManager.getSortedProfileArray();
	var text = JSON.stringify(profiles);
	text = text.replace(/},/g, "},\n") + "\n";
	var textArea = $('#proxyProfilesImportExport textarea').text(text);
	$('#proxyProfilesImportExport').toggle();
	textArea.focus();
}

function loadLog() {
	$("#console").text(extension.Logger.toString());
}

function clearLog() {
	extension.Logger.clear();
	loadLog();
}

function diagnose() {
	extension.diagnose();
	loadLog();
}

function initLogStuff() {
	extension.Logger.addEventListener(extension.Logger.onLog, function(e) {
		loadLog();
	});
	
	$("#header .title").css("cursor", "pointer").toggle(function() {
		loadLog();
		$("#logger").toggle();
	}, function() {
		$("#logger").toggle();
	});
	
//	if (extension.Logger.haveErrorEntries()) {
		loadLog();
		$("#logger").show();
//	}
	
//	$("#header img").css("cursor", "pointer").click(function() {
//		$("#logger").toggle();
//	});
	
//	$("#btnViewLog").toggle(function() {
//		$(this).text("Hide Log");
//		$("#console").text(extension.Logger.toString()).show();
//	}, function() {
//		$(this).text("View Log");
//		$("#console").hide();
//	});
}

function getQueryParams() {
	var query = document.location.search;
	if (query.indexOf("?") == 0)
		query = query.substring(1);
	
	query = query.split("&");
	
	var params = [];
	for (i in query) {
		var pair = query[i].split("=");
		params[pair[0]] = pair[1];
	}
	
	return params;
}

function processParams() {
	var params = getQueryParams();
	if (params["firstTime"] == "true") 
		InfoTip.showMessage(
			"Welcome first time user! To start using Switchy, set up some proxy profiles below and then press 'Save'.", 
			InfoTip.note, 25000);
}