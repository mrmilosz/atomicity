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
		var $entry = addEntry();
		populateXmlFromFields();
		if ($('#input .expanded.entry').length === 0) {
			$entry.find('.expand').trigger('click');
		}
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
		wireInput($entry.find('.input'));

		return $entry;
	}

	function clearEntries() {
		$('#input .section-group').not('.feed, .add').remove();
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
					fieldValue = $input.val(),
					attr = $section.data('attr'),
					definingAttr = $section.data('defining_attr'),
					definingAttrValue = $section.data('defining_attr_value');

				if ($section.hasClass('timestamp')) {
					var currentTime = moment(fieldValue);
					fieldValue = currentTime !== null && currentTime.isValid()
						? currentTime.utc().format('YYYY-MM-DDThh:mm:ss\\Z')
						: '';
				}

				$.each(fieldNames, function(_, fieldName) {
					if ($section.hasClass('multi')) {
						if (attr !== undefined) {
							var $nodes = $($.map(fieldValue.split(/\s*,\s*/), function(value) {
								return value.length > 0 ? $('<' + fieldName + '/>').attr(attr, value).get(0) : null;
							}));
						}
						else {
							var $nodes = $($.map(fieldValue.split(/\s*,\s*/), function(value) {
								return value.length > 0 ? $('<' + fieldName + '/>').text(value).get(0) : null;
							}));
						}
					}
					else {
						if (attr !== undefined) {
							var $nodes = $('<' + fieldName + '>').attr(attr, fieldValue);
						}
						else {
							var $nodes = $('<' + fieldName + '>').text(fieldValue);
						}
					}

					if (definingAttrValue !== null) {
						$nodes.attr(definingAttr, definingAttrValue);
					}

					$container.append($nodes);
				});
			});
		});

		var xmlBodyText = new XMLSerializer().serializeToString($root.get(0));
		var xmlHeaderText = '<?xml version="1.0" encoding="' + document.characterSet + '" ?>'
		$('#output .view').removeClass('prettyprinted').text(selfCloseTags(vkbeautify.xml(fixHtmlTags(xmlHeaderText + xmlBodyText))));

		prettyPrint();
	}

	function populateFieldsFromXml(xml) {
		var xmlParser = new DOMParser();
		var xmlDoc = xmlParser.parseFromString(xml, 'text/xml');
		var $xmlDoc = $(xmlDoc);

		clearEntries();

		(function recurse($nodes, $container) {
			$.each($nodes, function(_, node) {
				var $node = $(node);

				if ($node.is('entry')) {
					recurse($node.children(), addEntry());
				}
				else {
					var fieldName = node.nodeName,
						$sections = $container.find('.section[data-name~="' + fieldName + '"]');

					var $section = $sections.filter(function() {
						var $section = $(this),
							definingAttribute = $section.data('defining_attr'),
							definingAttributeValue = $section.data('defining_attr_value'),
							nodeDefiningAttributeValue = node.getAttribute(definingAttribute);

						if (definingAttributeValue === undefined && nodeDefiningAttributeValue === null || nodeDefiningAttributeValue === definingAttributeValue) {
							return true;
						}
					});

					var attribute = $section.data('attr'),
						$input = $section.find('.input');

					if (attribute !== undefined) {
						var fieldValue = node.getAttribute(attribute);
					}
					else {
						var fieldValue = node.textContent;
					}

					if ($section.hasClass('timestamp')) {
						fieldValue = prettyTime(fieldValue);
					}

					if ($section.hasClass('multi')) {
						if ($section.hasClass('tag')) {
							$input.tagit('createTag', fieldValue);
						}
						else {
							$input.val(extendCommaSeparatedList($input.val(), fieldValue));
						}
					}
					else {
						if ($section.hasClass('tag')) {
							$.each(commaSeparatedListToArray(fieldValue), function(_, term) {
								$input.tagit('createTag', term);
							});
						}
						else {
							$input.val(fieldValue);
						}
					}
				}
			});
		})($xmlDoc.find('feed > *'), $('#input .feed.section-group'));
	}

	function commaSeparatedListToArray(list) {
		return list.split(/\s*,\s*/);
	}

	function extendCommaSeparatedList(list, value) {
		return /^\s*$/.test(list) ? value : (list.replace(/(?:\s*,\s*)?$/, '') + ', ' + value);
	}

	function prettyTime(time) {
		return moment(time).format('MMMM D, YYYY, HH:mm:ss');
	}

	// Since tagit can't be bound as a live handler
	function wireInput($inputs) {
		$inputs.each(function(_, input) {
			var $input = $(input),
				$section = $input.parents('.section');

			if ($section.hasClass('tag')) {
				var tagitOptions = {
					allowSpaces: true,
					caseSensitive: false,
					removeConfirmation: true
				};

				if ($section.hasClass('select')) {
					$.extend(tagitOptions, {
						autocomplete: {
							delay: 0,
							minLength: 0,
							source: function(request, response) {
								var choices = $section.data('choices');

								if (choices instanceof Array) {
									; // done
								}
								else if (typeof choices === 'string') {
									var parts = choices.split(';'),
										attribute = parts[0],
										source = parts[1];

									if (source === 'other') {
										var $otherSections = $('#input .entry.section-group').not($section.parents('.section-group')).find('.section[data-name~="' + attribute + '"]');
										choices = $.map($otherSections, function(otherSection) {
											return $(otherSection).find('.input').val();
										});
									}

									// TODO more options
									else {
										choices = [];
									}
								}

								var eligibleTerms = $input.tagit('assignedTags')
								var lastTerm = request.term.split(/\s*,\s*/).pop();
								var chosenTerms = $.ui.autocomplete.filter(subtractArray(choices, eligibleTerms), lastTerm);
								response(chosenTerms);
							},
							focus: function() {
								// prevent value inserted on focus
								return false;
							}
						}
					});
				}

				$input.tagit(tagitOptions);
			}
		});
	}

	function subtractArray(minuend, subtrahend) {
		var hash = {};
		$.each(subtrahend, function(_, item) {
			hash[item.toLowerCase()] = 1;
		});
		return $.grep(minuend, function(item) {
			return hash[item.toLowerCase()] === undefined;
		});
	}

	function removeDuplicates(array) {
		var hash = {};
		return $.grep(array, function(item) {
			var returnItem = hash[item] === undefined;
			hash[item] = 1;
			return returnItem;
		});
	}

	function selfCloseTags(xmlString) {
		return xmlString.replace(/><\/.+?>/g, ' />');
	}

	function fixHtmlTags(xmlString) {
		return xmlString.replace(/(<link[^>]*\s*>)/g, '$1</link>');
	}
});
