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
var anyValueModified = false;
var ignoreFieldsChanges = false;
var selectedRow;

function init() {
	extension = chrome.extension.getBackgroundPage();
	ProfileManager = extension.ProfileManager;
	Settings = extension.Settings;
	
	initUI();
	loadOptions();
	checkPageParams();
}

function initUI() {
	$("#tabsContainer div").click(function() {
		$("#tabsContainer div").removeClass("selected").addClass("normal");
		$(this).removeClass("normal").addClass("selected");
		$("#body .tab").hide();
		$("#" + $(this).attr("id") + "Body").show();
	});
	
	$("#chkQuickSwitch").change(function() {
		if ($(this).is(":checked")) {
			$("#quickSwitchTable .option").removeClass("disabled");
			$("#quickSwitchTable .option select").removeAttr("disabled");
		} else {
			$("#quickSwitchTable .option").addClass("disabled");
			$("#quickSwitchTable .option select").attr("disabled", "disabled");
		}
		onFieldModified();
	});

	$("#profileName").bind("keyup change", function() {
		$("td:first", selectedRow).text($(this).val()); // sync profile title changes
		selectedRow[0].profile.name = $(this).val();
		onFieldModified();
	});
	$("#httpProxyHost, #httpProxyPort").change(function() {
		selectedRow[0].profile.proxyHttp = joinProxy($("#httpProxyHost").val(), $("#httpProxyPort").val());
		onFieldModified();
	});
	$("#modeManual, #modeAuto").change(function() {
		if ($("#modeManual").is(":checked")) {
			selectedRow[0].profile.proxyMode = ProfileManager.proxyModes.manual;
			$("#httpRow, #sameProxyRow, #httpsRow, #ftpRow, #socksRow").removeClass("disabled");
			$("#httpRow input, #sameProxyRow input, #httpsRow input, #ftpRow input, #socksRow input").removeAttr("disabled");
			$("#configUrlRow").addClass("disabled");
			$("#configUrlRow input").attr("disabled", "disabled");
			$("#useSameProxy").change();
		} else {
			selectedRow[0].profile.proxyMode = ProfileManager.proxyModes.auto;
			$("#httpRow, #sameProxyRow, #httpsRow, #ftpRow, #socksRow").addClass("disabled");
			$("#httpRow input, #sameProxyRow input, #httpsRow input, #ftpRow input, #socksRow input").attr("disabled", "disabled");
			$("#configUrlRow").removeClass("disabled");
			$("#configUrlRow input").removeAttr("disabled");
		}
		onFieldModified();
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
		onFieldModified();
	});
	$("#httpsProxyHost, #httpsProxyPort").change(function() {
		selectedRow[0].profile.proxyHttps = joinProxy($("#httpsProxyHost").val(), $("#httpsProxyPort").val());
		onFieldModified();
	});
	$("#ftpProxyHost, #ftpProxyPort").change(function() {
		selectedRow[0].profile.proxyFtp = joinProxy($("#ftpProxyHost").val(), $("#ftpProxyPort").val());
		onFieldModified();
	});
	$("#socksProxyHost, #socksProxyPort").change(function() {
		selectedRow[0].profile.proxySocks = joinProxy($("#socksProxyHost").val(), $("#socksProxyPort").val());
		onFieldModified();
	});		
	$("#proxyExceptions").change(function() {
		selectedRow[0].profile.proxyExceptions = $(this).val();
		onFieldModified();
	});		
	$("#proxyConfigUrl").change(function() {
		selectedRow[0].profile.proxyConfigUrl = $(this).val();
		onFieldModified();
	});		
}

function loadOptions() {
	$("#proxyProfiles .tableRow").remove();
	var table = $("#proxyProfiles");
	ProfileManager.loadProfiles();
	var profiles = ProfileManager.getSortedProfileArray();
	var currentProfile = ProfileManager.getCurrentProfile();
	var lastSelectedProfile = selectedRow;
	selectedRow = undefined;
	for (var i in profiles) {
		var profile = profiles[i];
		if (!profile.id || profile.id.length == 0 || profile.id == "unknown")
			generateProfileId(profiles, profile);

		var row = newRow(profile);
		
		if (lastSelectedProfile && ProfileManager.equals(profile, lastSelectedProfile[0].profile))
			$("td:first", row).click(); // selects updated profile
	}
	if (currentProfile.unknown) {
		currentProfile.name = ProfileManager.currentProfileName;
		var row = newRow(currentProfile);
		if (!selectedRow)
			$("td:first", row).click();
	
	} else if (profiles.length == 0) {
		var row = newRow();
		if (!selectedRow)
			$("td:first", row).click();
	}
	
	if (!selectedRow)
		$("#proxyProfiles .tableRow td:first").click();	

	if (Settings.getValue("quickSwitch", false))
		$("#chkQuickSwitch").attr("checked", "checked");
	
	$("#chkQuickSwitch").change();
	
	$("#cmbProfile1, #cmbProfile2").empty();
	var directProfile = ProfileManager.directConnectionProfile;
	var quickSwitchProfiles = Settings.getObject("quickSwitchProfiles") || {};
	var item = $("<option>").attr("value", directProfile.id).text(directProfile.name);
	item[0].profile = directProfile;
	$("#cmbProfile1").append(item);
	item = item.clone();
	item[0].profile = directProfile;
	$("#cmbProfile2").append(item);
	$.each(profiles, function(key, profile) {
		var item = $("<option>").attr("value", profile.id).text(profile.name);
		item[0].profile = profile;
		if (quickSwitchProfiles.profile1 == profile.id)
			item.attr("selected", "selected");
		
		$("#cmbProfile1").append(item);
		
		item = item.clone();
		item[0].profile = profile;
		if (quickSwitchProfiles.profile2 == profile.id)
			item.attr("selected", "selected");

		$("#cmbProfile2").append(item);
	});	
	
	anyValueModified = false;
}

function saveOptions() {
	var currentProfile = ProfileManager.getCurrentProfile();
	var profiles = {};
	var rows = $("#proxyProfiles .tableRow");
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var profile = row.profile;
		if (profile.unknown != undefined) // don't save unknown profiles
			continue;
		
		profile.proxyHttp = fixProxyString(profile.proxyHttp, "80");
		profile.proxyHttps = fixProxyString(profile.proxyHttps, "443");
		profile.proxyFtp = fixProxyString(profile.proxyFtp, "21");
		profile.proxySocks = fixProxyString(profile.proxySocks, "80");
		
		if (profile.proxyHttp == profile.proxyHttps 
			&& profile.proxyHttps == profile.proxyFtp 
			&& profile.proxyFtp == profile.proxySocks)
			profile.useSameProxy = true;
		
		if (profile.proxyMode == ProfileManager.proxyModes.auto && profile.proxyConfigUrl.length == 0)
			profile.proxyMode = ProfileManager.proxyModes.manual;
		
		if (!profile.id || profile.id.length == 0 || profile.id == "unknown")
			generateProfileId(profiles, profile);
		
		profiles[profile.id] = profile;
		
		if (profile.name == currentProfile.name) // reapply current profile (in case it's changed)
			ProfileManager.applyProfile(profile);
	}
	
	ProfileManager.setProfiles(profiles);
	ProfileManager.saveProfiles();
	
	Settings.setValue("quickSwitch", ($("#chkQuickSwitch").is(":checked")));
	var quickSwitchProfiles = {
		profile1: $("#cmbProfile1 option:selected")[0].profile.id,
		profile2: $("#cmbProfile2 option:selected")[0].profile.id
	};
	Settings.setObject("quickSwitchProfiles", quickSwitchProfiles);
	
	extension.setIconInfo();
	
	InfoTip.showMessage("Options Saved..", InfoTip.types.success);
	
	loadOptions();

	anyValueModified = false;
}

function closeWindow() {
	if (anyValueModified && confirm("\nSave changed values?"))
		saveOptions();
	
	window.close();
}

function showLog() {
	var url = "console.html";
//	window.location = url;
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.create({
			url: url,
			index: tab.index + 1
		});
	});
}

function onFieldModified() {
	if (ignoreFieldsChanges) // ignore changes when they're really not changes (populating fields)
		return;

	delete selectedRow[0].profile.unknown; // so it can be saved (when clicking Save)
	selectedRow.removeClass("unknown");
	anyValueModified = true;
}

function generateProfileId(profiles, profile) {
	var profileId = profile.name; // generate unique id
	if (profiles[profileId] != undefined || profileId == ProfileManager.directConnectionProfile.id) {
		for (var j = 2; ; j++) {
			var newId = profileId + j;
			if (profiles[newId] == undefined) {
				profileId = newId;
				break;
			}
		}
	}
	profile.id = profileId;
}

function newRow(profile) {
	var table = $("#proxyProfiles");
	var row = $("#proxyProfiles .templateRow").clone();
	row.removeClass("templateRow").addClass("tableRow");	
	table.append(row);
	
	$("td:first", row).click(onSelectRow);
	
	if (profile) {
		profile = ProfileManager.normalizeProfile(profile);		
		$("td:first", row).text(profile.name);
		$("td:nth(1) div div", row).addClass(profile.color);
		row[0].profile = profile;
		if (profile.unknown)
			row.addClass("unknown");
		
	} else {
		var profileName = $("#proxyProfiles .templateRow td:first").text(); // template name
		row[0].profile = {
			name : profileName,
			proxyMode: ProfileManager.proxyModes.manual,
			proxyHttp : "",
			useSameProxy : true,
			proxyHttps : "",
			proxyFtp : "",
			proxySocks : "",
			proxyExceptions : "<local>; localhost; 127.0.0.1",
			proxyConfigUrl : ""
		};
		
		$("td:first", row).click();
		$("td:nth(1) div div", row).addClass("blue");
		$("#profileName").focus().select();
	}
	return row;
}

function deleteRow() {
	var row = event.target.parentNode.parentNode;
	if (confirm("\nAre you sure you want to delete selected profile?" + 
		"\n\nSelected Profile: (" + row.children[0].innerText + ")")) {
		if (selectedRow[0] == row)
			onSelectRow({}); // to clear fields.
		
		$(row).remove();
		
		saveOptions();
		loadOptions();
		extension.setIconInfo();
		InfoTip.showMessage("Profile Deleted..", InfoTip.types.note);
	}
}

function changeColor() {
	var cell = $(event.target);
	var profile = event.target.parentNode.parentNode.parentNode.profile;
	var color;
	
	if (cell.attr("class") == "" || cell.hasClass("blue"))
		color = "green";
	else if (cell.hasClass("green"))
		color = "red";
	else if (cell.hasClass("red"))
		color = "yellow";
	else if (cell.hasClass("yellow"))
		color = "blue";
	
	cell.attr("class", color);
	profile.color = color;
}

function onSelectRow(e) {
	var profile;
	if (e.target) { // fired on event?
		var row = $(this).parent();
		if (selectedRow)
			selectedRow.removeClass("selected");
		
		row.addClass("selected");
		selectedRow = row;
		
		profile = row[0].profile;
		
	} else { // or by calling
		profile = e;
	}
	
	ignoreFieldsChanges = true;
	
	var proxyInfo;
	$("#profileName").val(profile.name || "");
	
	proxyInfo = parseProxy(profile.proxyHttp || "");
	$("#httpProxyHost").val(proxyInfo.host);
	$("#httpProxyPort").val(proxyInfo.port);
	
	if (profile.useSameProxy) {
		$("#useSameProxy").attr("checked", "checked");
	}
	else {
		$("#useSameProxy").removeAttr("checked");
	}
	$("#useSameProxy").change();

	if (profile.proxyMode == ProfileManager.proxyModes.manual) {
		$("#modeManual").attr("checked", "checked");
		$("#modeAuto").removeAttr("checked");
	}
	else {
		$("#modeManual").removeAttr("checked");
		$("#modeAuto").attr("checked", "checked");
	}
	$("#modeManual").change();
	
	proxyInfo = parseProxy(profile.proxyHttps || "");
	$("#httpsProxyHost").val(proxyInfo.host);
	$("#httpsProxyPort").val(proxyInfo.port);

	proxyInfo = parseProxy(profile.proxyFtp || "");
	$("#ftpProxyHost").val(proxyInfo.host);
	$("#ftpProxyPort").val(proxyInfo.port);

	proxyInfo = parseProxy(profile.proxySocks || "");
	$("#socksProxyHost").val(proxyInfo.host);
	$("#socksProxyPort").val(proxyInfo.port);
	
	$("#proxyExceptions").val(profile.proxyExceptions || "");
	
	$("#proxyConfigUrl").val(profile.proxyConfigUrl || "");

	$("#profileName").focus().select();

	ignoreFieldsChanges = false;
}

function getQueryParams() {
	var query = document.location.search || "";
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

function checkPageParams() {
	var params = getQueryParams();
	if (params["firstTime"] == "true") 
		InfoTip.showMessage(
			"Welcome first time user! To start using Switchy, set up some proxy profiles below and then press 'Save'.", 
			InfoTip.types.note, 25000);
}

function parseProxy(proxy, port) {
	if (proxy == undefined || proxy.length == 0) {
		return {
			host : "",
			port : ""
		};
	}
	
	proxy = fixProxyString(proxy, port);
	var parts = proxy.split(":");
	return {
		host : parts[0],
		port : parts[1]
	};
}

function joinProxy(proxy, port, defaultPort) {
	if (proxy.indexOf(":") >= 0)
		return proxy;
	
	if (port != undefined && port.trim().length == 0)
		port = defaultPort || "80";
	
	return proxy + ":" + port;
}

function fixProxyString(proxy, defaultPort) {
	if (proxy == undefined || proxy.length == 0)
		return "";
	
	if (proxy.indexOf(":") > 0)
		return proxy;

	if (proxy.indexOf(":") == 0)
		return "";
		
	defaultPort = defaultPort || "80";
	return proxy + ":" + defaultPort;
}
