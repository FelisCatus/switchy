/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
var anyValueModified = false; //TODO
var selectedRow;

function init() {
	extension = chrome.extension.getBackgroundPage();
	initLogStuff();
	loadOptions();
	initUI();
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
		newRow(profile);
	}
	if (currentProfile.unknown) {
		currentProfile.name = "<Current Profile>";
		newRow(currentProfile);
	} else if (profiles.length == 0) {
		newRow({});
	}
	$("#proxyProfiles .tableRow td:first").click();	
}

function saveOptions() {
	var currentProfile = extension.ProfileManager.getCurrentProfile();
	var profiles = {};
	var rows = $("#proxyProfiles .tableRow");
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var profile = row.profile;
		profiles[profile.name] = profile;
		
		if (extension.ProfileManager.equals(profile, currentProfile))
			extension.ProfileManager.applyProfile(profile);
	}
	
	extension.ProfileManager.profiles = profiles;
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

function initUI() {
	$("#profileName").keyup(function() {
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
}

function newRow(profile) {
	var table = $("#proxyProfiles");
	var row = $("#proxyProfiles .templateRow").clone();
	row.removeClass("templateRow").addClass("tableRow");	
	table.append(row);
	
	$("td:first", row).click(selectRow);
	
	if (profile) {
		var proxyInfo = parseProxy(profile.proxy);
		$("td:first", row).text(profile.name);
		row[0].profile = profile;
		if (profile.unknown)
			row.addClass("unknown");
	} else {
		row[0].profile = { name: "New Proxy Profile", proxy: "", useSameProxy: true, proxyHttps: "",
						   proxyFtp: "", proxySocks: "", bypassProxy: "<local>" };
		
		$("td:first", row).click();
		$("#profileName").focus().select();
	}
}

function deleteRow() {
	var row = event.target.parentNode.parentNode;
	if (confirm("\nAre you sure you want to delete selected profile?" + 
		"\n\nSelected Profile: (" + row.children[0].innerText + ")"))
		$(row).remove();
}

function selectRow() {
	var row = $(this).parent();
	if (selectedRow)
		selectedRow.removeClass("selected");
	
	row.addClass("selected");
	selectedRow = row;
	
	var profile = row[0].profile;
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
	
	if (extension.Logger.haveErrorEntries()) {
		loadLog();
		$("#logger").show();
	}
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

function joinProxy(proxy, port) {
	if (proxy.indexOf(":") > 0)
		return proxy;
	
	if (port.trim().length == 0)
		port = "8080";
	
	return proxy + ":" + port;
}
