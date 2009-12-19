/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var InfoTip = {};

///// Message Types //////
InfoTip.types = {
	note: "note",
	info: "info",
	success: "success",
	warning: "warning",
	error: "error"
};

InfoTip._timer;

InfoTip.showMessage = function showMessage(message, type, timeout) {
	if (timeout == undefined)
		timeout = 2500;
	
	if (InfoTip._timer) {
		clearTimeout(InfoTip._timer);
		InfoTip._timer = undefined;
	}
	var note = $("#note");
	note.attr("class", type);
	note.children(":first").html(message);
	note.animate({ top: -1 }, "fast");
	InfoTip._timer = setTimeout(function() {
		note.animate({ top: -100 }, "slow");
		InfoTip._timer = undefined;
	}, timeout);
};
