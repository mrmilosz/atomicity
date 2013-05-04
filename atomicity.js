$(document).ready(function() {

	/*
	 * Event handlers
	 */

	$('#input').on('keydown change', '.field', function() {
		setTimeout(populateXmlFromFields, 0);
	});

	$('#output .controls button.download').on('click', function() {
		var blobBuilder = new BlobBuilder();
		blobBuilder.append($('#output .field').text());
		var blob = blobBuilder.getBlob('data:application/xml;charset=' + document.characterSet);
		saveAs(blob, $('#output .controls .filename').val());
	});

	$('#output .controls button.upload').on('click', function() {
		$('#hidden input.upload-impl').trigger('click');
	});

	$('#hidden input.upload-impl').on('change', function(event) {
		var filename = $(this).val().split(/\\|\//g).pop();
		var reader = new FileReader();

		reader.addEventListener('load', function(event) {
			$('#output .controls .filename').val(filename);
			var xml = atob(event.target.result.replace(/^.*,/, '')).replace(/^.*?\?>\n?/, ''); // look into cleaner ways of doing this (Blob?)
			populateFieldsFromXml(xml);
			populateXmlFromFields();
		});

		reader.readAsDataURL(event.target.files[0]);
	});

	$('#input, #output').on('submit', false);

	/*
	 * Startup
	 */

	$('#output .controls .filename').val($('#output .controls .filename').val()); // Fixes a Chrome quirk

	populateXmlFromFields();
	$('#input .field').first().focus();

	/*
	 * Auxiliary functions
	 */

	function populateXmlFromFields() {
		var $root = $('<feed xmlns="http://www.w3.org/2005/Atom">');
		$.each($('#input .field'), function(_, field) {
			var $field = $(field),
				fieldName = $field.attr('name'),
				fieldValue = null;

			if ($field.hasClass('timestamp')) {
				fieldValue = new Date().toISOString();
			}
			else {
				fieldValue = $field.val();
			}

			var $node = $('<' + fieldName + '>');
			$node.text(fieldValue);
			$root.append($node);
		});

	new Date().toISOString()

		var xmlBodyText = new XMLSerializer().serializeToString($root.get(0));
		var xmlHeaderText = '<?xml version="1.0" encoding="' + document.characterSet + '" ?>'
		$('#output .view.field').removeClass('prettyprinted').text(vkbeautify.xml(xmlHeaderText + xmlBodyText));

		prettyPrint();
	}

	function populateFieldsFromXml(xml) {
		var xmlParser = new DOMParser();
		var xmlDoc = xmlParser.parseFromString(xml, 'text/xml');
		var $xmlDoc = $(xmlDoc);
		var $nodes = $xmlDoc.find('feed > *');
		$.each($nodes, function(_, node) {
			var fieldName = node.nodeName,
				fieldValue = node.textContent;

			$('#input .field[name="' + fieldName + '"]').val(fieldValue);
		});
	}

});
