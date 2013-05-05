$(document).ready(function() {

	/*
	 * Event handlers
	 */

	$('#input').on('keydown change', '.input', function() {
		setTimeout(populateXmlFromFields, 0);
	});

	$('#input').on('click', '.default', function() {
		var $update = $(this),
			$section = $update.parents('.section'),
		  $input = $section.find('.input');

		if ($section.hasClass('timestamp')) {
			$input.val(prettyTime());
		}

		populateXmlFromFields();
	});

	$('#input').on('click', '.entry .delete', function() {
		var $entry = $(this).parents('.section-group');
		if (confirm('Really delete entry?')) {
			$entry.remove();
		}

		populateXmlFromFields();
	});

	$('#input .add.entry .add').on('click', function() {
		addEntry();
		populateXmlFromFields();
	});

	$('#input').on('click', '.entry .expand', function() {
		var $entry = $(this).parents('.section-group');
		var alreadyExpanded = $entry.hasClass('expanded');
		$('#input .section-group').removeClass('expanded');
		$entry[(alreadyExpanded ? 'remove' : 'add') + 'Class']('expanded');
	});

	$('#output .controls button.download').on('click', function() {
		var blobBuilder = new BlobBuilder();
		blobBuilder.append($('#output .view').text());
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
	$('#input .default').trigger('click');

	populateXmlFromFields();
	$('#input .input').first().focus();

	/*
	 * Auxiliary functions
	 */

	function addEntry() {
		var $entry = $('#entry-template').clone().children();
		var $addEntry = $('#input .add.section-group');
		$addEntry.before($entry);

		$entry.find('.default').trigger('click');

		return $entry;
	}

	function clearEntries() {
		$('.section-group').not('.feed, .add').remove();
	}

	function populateXmlFromFields() {
		var $root = $('<feed xmlns="http://www.w3.org/2005/Atom">');
		var $container = $root;

		$.each($('#input .section-group'), function(_, section) {
			var $sectionGroup = $(this);

			if ($sectionGroup.hasClass('entry')) {
				if ($sectionGroup.hasClass('add')) {
					return true;
				}
				$root.append($container = $('<entry>'));
			}

			$.each($(this).find('.section'), function(_, section) {
				var $section = $(section),
					fieldNames = $section.data('name').split(' '),
					$input = $section.find('.input'),
					fieldValue = $input.val();

				$.each(fieldNames, function(_, fieldName) {
					if ($section.hasClass('timestamp')) {
						var currentTime = moment(fieldValue);
						fieldValue = currentTime !== null && currentTime.isValid()
							? currentTime.utc().format('YYYY-MM-DDThh:mm:ss\\Z')
							: '';
					}

					var $node = $('<' + fieldName + '>');
					$node.text(fieldValue);

					$container.append($node);
				});
			});
		});

		var xmlBodyText = new XMLSerializer().serializeToString($root.get(0));
		var xmlHeaderText = '<?xml version="1.0" encoding="' + document.characterSet + '" ?>'
		$('#output .view').removeClass('prettyprinted').text(vkbeautify.xml(xmlHeaderText + xmlBodyText));

		prettyPrint();
	}

	function populateFieldsFromXml(xml) {
		var xmlParser = new DOMParser();
		var xmlDoc = xmlParser.parseFromString(xml, 'text/xml');
		var $xmlDoc = $(xmlDoc);
		
		(function recurse($nodes, $container) {
			$.each($nodes, function(_, node) {
				var $node = $(node);

				if ($node.is('entry')) {
					recurse($node.children(), addEntry());
				}
				else {
					var fieldName = node.nodeName,
						fieldValue = node.textContent,
						$section = $container.find('.section[data-name="' + fieldName + '"]'),
						$input = $section.find('.input');

					if ($section.hasClass('timestamp')) {
						fieldValue = prettyTime(fieldValue);
					}

					$input.val(fieldValue);
				}
			});
		})($xmlDoc.find('feed > *'), $('#input .feed.section-group'));
	}

	function prettyTime(time) {
		return moment(time).format('MMMM D, YYYY, HH:mm:ss');
	}

});
