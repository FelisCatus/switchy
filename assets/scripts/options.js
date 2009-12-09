/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
var anyValueModified = false;
var selectedRow;

function init() {
	extension = chrome.extension.getBackgroundPage();
	initUI();
	loadOptions();
	processParams();
}

function loadOptions() {
	$("#proxyProfiles .tableRow").remove();
	var table = $("#proxyProfiles");
	extension.ProfileManager.loadProfiles();
	var profiles = extension.ProfileManager.getSortedProfileArray();
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	for (var i in profiles) {
		var profile = profiles[i];
		var row = newRow(profile);
		if (extension.ProfileManager.equals(profile, currentProfile))
			$("td:first", row).click();
	}
	if (currentProfile.unknown) {
		currentProfile.name = "<Current Profile>";
		var row = newRow(currentProfile);
		$("td:first", row).click();
	} else if (profiles.length == 0) {
		var row = newRow(); //TODO test this
		$("td:first", row).click();
	}
	
	//$("#proxyProfiles .tableRow td:first").click();	
}

function saveOptions() {
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	var profiles = {};
	var rows = $("#proxyProfiles .tableRow");
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var profile = row.profile;
		if (!profile.proxy && profile.useSameProxy)
			continue;
		
		profile.proxy = fixProxyString(profile.proxy, "80");
		profile.proxyHttps = fixProxyString(profile.proxyHttps, "443");
		profile.proxyFtp = fixProxyString(profile.proxyFtp, "21");
		profile.proxySocks = fixProxyString(profile.proxySocks, "80");
		
		var profileId = profile.name;
		if (profiles[profileId] != undefined) {
			for ( var j = 2; ; j++) {
				var temp = profileId + j;
				if (profiles[temp] == undefined) {
					profileId = temp;
					break;
				}
			}
		}
		profiles[profileId] = profile;
		
		if (profile.name == currentProfile.name)
			extension.ProfileManager.applyProfile(profile);
	}
	
	extension.ProfileManager.setProfiles(profiles);
	extension.ProfileManager.saveProfiles();
	
	anyValueModified = false;
	InfoTip.showMessage("Options Saved..", InfoTip.success);
	
	loadOptions();
	extension.setIconInfo();
}

function closeWindow() {
	if (anyValueModified && confirm("\nSave changed values?"))
		saveOptions();
	
	window.close();
}

function showLog() {
	var url = "console.html";
//	window.location = url;
	chrome.tabs.create({
		url: url
	});
}

function initUI() {
	$("#profileName").bind("keyup change", function() {
		$("td:first", selectedRow).text($(this).val());
		selectedRow[0].profile.name = $(this).val();
		anyValueModified = true;
	});
	$("#httpProxyServer, #httpProxyPort").change(function() {
		selectedRow[0].profile.proxy = joinProxy($("#httpProxyServer").val(), $("#httpProxyPort").val());
		anyValueModified = true;
	});
	$("#useSameProxy").change(function() {
		if ($(this).is(":checked")) {
			selectedRow[0].profile.useSameProxy = true;
			$("#httpsRow, #ftpRow, #socksRow").addClass("disabled");
			$("#httpsRow input, #ftpRow input, #socksRow input").attr("disabled", "disabled");
		} else {
			selectedRow[0].profile.useSameProxy = false;
			$("#httpsRow, #ftpRow, #socksRow").removeClass("disabled");
			$("#httpsRow input, #ftpRow input, #socksRow input").removeAttr("disabled");
		}
		anyValueModified = true;
	});
	$("#httpsProxyServer, #httpsProxyPort").change(function() {
		selectedRow[0].profile.proxyHttps = joinProxy($("#httpsProxyServer").val(), $("#httpsProxyPort").val());
		anyValueModified = true;
	});
	$("#ftpProxyServer, #ftpProxyPort").change(function() {
		selectedRow[0].profile.proxyFtp = joinProxy($("#ftpProxyServer").val(), $("#ftpProxyPort").val());
		anyValueModified = true;
	});
	$("#socksProxyServer, #socksProxyPort").change(function() {
		selectedRow[0].profile.proxySocks = joinProxy($("#socksProxyServer").val(), $("#socksProxyPort").val());
		anyValueModified = true;
	});		
	$("#bypassProxy").change(function() {
		selectedRow[0].profile.bypassProxy = $(this).val();
		anyValueModified = true;
	});		
	$("#configUrl").change(function() {
		selectedRow[0].profile.configUrl = $(this).val();
		anyValueModified = true;
	});		
}

function newRow(profile) {
	var table = $("#proxyProfiles");
	var row = $("#proxyProfiles .templateRow").clone();
	row.removeClass("templateRow").addClass("tableRow");	
	table.append(row);
	
	$("td:first", row).click(selectRow);
	
	if (profile) {
		profile = extension.ProfileManager.normalizeProfile(profile);
		
		var proxyInfo = parseProxy(profile.proxy);
		$("td:first", row).text(profile.name);
		row[0].profile = profile;
		if (profile.unknown) {
			delete profile.unknown;
			row.addClass("unknown");
		}
	} else {
		var profileName = $("#proxyProfiles .templateRow td:first").text();
		row[0].profile = { name: profileName, proxy: "", useSameProxy: true, proxyHttps: "",
						   proxyFtp: "", proxySocks: "", bypassProxy: "<local>", configUrl: "" };
		
		$("td:first", row).click();
		$("#profileName").focus().select();
	}
	return row;
}

function deleteRow() {
	var row = event.target.parentNode.parentNode;
	if (confirm("\nAre you sure you want to delete selected profile?" + 
		"\n\nSelected Profile: (" + row.children[0].innerText + ")")) {
		if (selectedRow[0] == row)
			selectRow({});
		
		$(row).remove();
		
		saveOptions();
		loadOptions();
		extension.setIconInfo();
		InfoTip.showMessage("Profile Deleted..", InfoTip.note);
	}
}

function selectRow(e) {
	if (e.target) { // fired on event?
		var row = $(this).parent();
		if (selectedRow)
			selectedRow.removeClass("selected");
		
		row.addClass("selected");
		selectedRow = row;
		
		var profile = row[0].profile;
	} else {
		var profile = e;
	}
	
	var proxy;
	$("#profileName").val(profile.name || "");
	
	proxy = parseProxy(profile.proxy || "");
	$("#httpProxyServer").val(proxy.proxy);
	$("#httpProxyPort").val(proxy.port);
	if (profile.useSameProxy)
		$("#useSameProxy").attr("checked", "checked");
	else
		$("#useSameProxy").removeAttr("checked");
	
	$("#useSameProxy").change();
	
	proxy = parseProxy(profile.proxyHttps || "");
	$("#httpsProxyServer").val(proxy.proxy);
	$("#httpsProxyPort").val(proxy.port);
	proxy = parseProxy(profile.proxyFtp || "");
	$("#ftpProxyServer").val(proxy.proxy);
	$("#ftpProxyPort").val(proxy.port);
	proxy = parseProxy(profile.proxySocks || "");
	$("#socksProxyServer").val(proxy.proxy);
	$("#socksProxyPort").val(proxy.port);
	
	$("#bypassProxy").val(profile.bypassProxy || "");
	
	$("#configUrl").val(profile.configUrl || "");

	$("#profileName").focus().select();
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

function parseProxy(proxy, port) {
	if (proxy == undefined)
		proxy = "";

	if (port == undefined)
		port = "";

	var parts;
	if (proxy && proxy.indexOf(":") >= 0)
		parts = proxy.split(":");
	else
		parts = [proxy, port];
	
	return { proxy: parts[0], port: parts[1] };
}

function joinProxy(proxy, port, defaultPort) {
	if (proxy.indexOf(":") > 0)
		return proxy;
	
	if (port != undefined && port.trim().length == 0)
		port = defaultPort || "80";
	
	return proxy + ":" + port;
}

function fixProxyString(proxy, defaultPort) {
	if (!proxy)
		return "";
	
	if (proxy.indexOf(":") > 0)
		return proxy;
		
	defaultPort = defaultPort || "80";
	return proxy + ":" + defaultPort;
}
