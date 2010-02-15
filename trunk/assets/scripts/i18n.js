
function extractI18nElements() {
	var result = "\n";
	
	$("*[i18n-content]").each(function(i, item) {
		result += '"' + item.getAttribute("i18n-content") + '"' +
				  ': { "message": "' + item.innerHTML.replace(/[ \r\n\t]+/g, " ") + '" },\n';
	});
	
	$("*[i18n-values]").each(function(i, item) {
		$(item.getAttribute("i18n-values").split(";")).each(function(i, subItem) {
			var subItemParts = subItem.split(":");
			if (subItemParts.length == 2 && subItemParts[0].charAt(0) != ".") {	
				result += '"' + subItemParts[1] + '"' +
						  ': { "message": "' + item.getAttribute(subItemParts[0]).replace(/[\r\n]/g, "\\n") + '" },\n';
			}
		});
	});
	
	return result;
}

//======================================================================

/**
 * i18nTemplate: http://src.chromium.org/viewvc/chrome/trunk/src/chrome/browser/resources/i18n_template.js
 */
var i18nTemplate = (function() {
	var handlers = {
		/**
		 * This handler sets the textContent of the element.
		 */
		'i18n-content' : function(element, attributeValue) {
			element.innerHTML/*textContent*/ = chrome.i18n.getMessage(attributeValue);
		},

		/**
		 * This is used to set HTML attributes and DOM properties,. The syntax
		 * is: attributename:key; .domProperty:key; .nested.dom.property:key
		 */
		'i18n-values' : function(element, attributeValue) {
			var parts = attributeValue.replace(/\s/g, '').split(/;/);
			for (var j = 0; j < parts.length; j++) {
				var a = parts[j].match(/^([^:]+):(.+)$/);
				if (a) {
					var propName = a[1];
					var propExpr = a[2];

					var value = chrome.i18n.getMessage(propExpr);
					if (propName.charAt(0) == '.') {
						var path = propName.slice(1).split('.');
						var object = element;
						while (object && path.length > 1) {
							object = object[path.shift()];
						}
						if (object) {
							object[path] = value;
							// In case we set innerHTML (ignoring others) we need to
							// recursively check the content
							if (path == 'innerHTML') {
								process(element);
							}
						}
					} else {
						element.setAttribute(propName, value);
					}
				}
			}
		}
	};

	var attributeNames = [];
	for (var key in handlers) {
		attributeNames.push(key);
	}
	var selector = '[' + attributeNames.join('],[') + ']';

	function process(node) {
		var elements = node.querySelectorAll(selector);
		for (var element, i = 0; element = elements[i]; i++) {
			for (var j = 0; j < attributeNames.length; j++) {
				var name = attributeNames[j];
				var att = element.getAttribute(name);
				if (att != null) {
					handlers[name](element, att);
				}
			}
		}
	}

	return {
		process : process
	};
})();
