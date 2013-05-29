$(document).ready(function () {

    /*
    * Configuration variables (technically these should be read from elsewhere!)
    */
    var config={
        xmlDirectory: 'xml',
        atomNamespace: 'http://www.w3.org/2005/Atom'
    };

    /*
    * Event handlers
    */

    $('.context-switch').on('click',function () {
        var $button=$(this);
        var currentContextClassName=getContextClassName($button);
        var $allContexts=$('.context');

        if(currentContextClassName===null) {
            var $nextContext=$allContexts.first();
        }
        else {
            var $currentContext=$allContexts.filter('.'+currentContextClassName);
            var $nextContext=$($allContexts.get($currentContext.index()%$allContexts.length));
            $button.removeClass(currentContextClassName)
            $currentContext.removeClass('visible');
        }

        var nextContextClassName=getContextClassName($nextContext);
        $button.addClass(nextContextClassName);
        $nextContext.addClass('visible');
    });

    $('.input-container').on('keydown change','.input',function () {
        var $this=$(this);
        var $context=$this.parents('.context');
        setTimeout(function () {
            populateXmlFromFields($context);
            updateExpandButtonText($this);
            checkForEmptiness($this);
        },0);
    });

    $('.input-container').on('click','.default',function () {
        var $context=$(this).parents('.context'),
            $update=$(this),
            $section=$update.parents('.section'),
            $input=$section.find('.input');

        if($section.hasClass('timestamp')) {
            $input.val(prettyTime());
        }

        populateXmlFromFields($context);
    });

    $('.input-container').on('click','.entry .delete',function () {
        var $context=$(this).parents('.context'),
            $entry=$(this).parents('.section-group');

        if(confirm('Do you really want to delete this entry?')) {
            $entry.remove();
        }

        populateXmlFromFields($context);
    });

    $('.input-container .add.entry .add').on('click',function () {
        var $context=$(this).parents('.context'),
            $entry=addEntry($context);

        populateXmlFromFields($context);

        if($context.find('.input-container .expanded.entry').length===0) {
            $entry.find('.expand').trigger('click');
        }
    });

    $('.input-container').on('click','.entry .expand',function () {
        var $context=$(this).parents('.context');
        var $entry=$(this).parents('.section-group');
        var alreadyExpanded=$entry.hasClass('expanded');
        $context.find('.input-container .section-group').removeClass('expanded');
        $entry[(alreadyExpanded?'remove':'add')+'Class']('expanded');
    });

    $('.output-container .controls button.save').on('click',function () {
        var $context=$(this).parents('.context');
        if($context.find(".input-container .section.invalid").length>0) {
            alert("Can't save while there are errors. correct fields marked in red.");
            return;
        }
        var blobBuilder=new BlobBuilder();
        blobBuilder.append($context.find('.output-container .view').text());
        var blob=blobBuilder.getBlob('data:application/xml;charset='+document.characterSet);
        var formData=new FormData();
        formData.append($context.find('.output-container .controls .filename').val(),blob.data);

        $.ajax({
            url: $(this).data('script'),
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData
        });
    });

    $('.output-container .controls button.download').on('click',function () {
        var $context=$(this).parents('.context');
        if($context.find(".input-container .section.invalid").length>0) {
            alert("Can't save while there are errors. correct fields marked in red.");
            return;
        }

        var blobBuilder=new BlobBuilder();
        blobBuilder.append($context.find('.output-container .view').text());
        var blob=blobBuilder.getBlob('data:application/xml;charset='+document.characterSet);
        saveAs(blob,$context.find('.output-container .controls .filename').val());
    });

    $('.output-container .controls button.upload').on('click',function () {
        if(confirm('Really upload new file and overwrite current XML?')) {
            $(this).parents('.context').find('.hidden-container input.upload-impl').trigger('click');
        }
    });

    $('.hidden-container input.upload-impl').on('change',function (event) {
        var $context=$(this).parents('.context');
        var filename=$(this).val().split(/\\|\//g).pop();
        var reader=new FileReader();

        reader.addEventListener('load',function (event) {
            $context.find('.output-container .controls .filename').val(filename);
            var xml=atob(event.target.result.replace(/^.*,/,'')).replace(/^.*?\?>\n?/,''); // look into cleaner ways of doing this (Blob?)
            populateFieldsFromXml(xml,$context);
            populateXmlFromFields($context);
        });

        reader.readAsDataURL(event.target.files[0]);
    });

    $('.input-container, .output-container').on('submit',false);

    /*
    * Startup
    */

    $('.context').each(function (_,context) {
        var $context=$(context);
        var filename=$context.find('.output-container .controls .filename').val();
        $context.find('.output-container .controls .filename').val(filename); // Fixes a Chrome quirk

        $.ajax({
            url: config.xmlDirectory+'/'+filename,
            dataType: 'text'
        }).done(function (xmlText) {
            xmlText=xmlText.replace(/^.*?\?>\n?/,''); // look into cleaner ways of doing this (Blob?)
            populateFieldsFromXml(xmlText,$context);
        }).fail(function () {
            $context.find('.input-container .default').trigger('click');
        }).always(function () {
            populateXmlFromFields($context);
        });
    });

    $('.context-switch').trigger('click');
    $('.input-container .input').first().focus();

    /*
    * Auxiliary functions
    */

    function addEntry($context) {
        var $entry=$context.find('.hidden-container .templates > .entry').clone().children();

        var $addEntry=$context.find('.input-container .add.section-group');
        $addEntry.before($entry);

        $entry.find('.default').trigger('click');
        wireInput($entry.find('.input'));

        return $entry;
    }

    function clearEntries($context) {
        $context.find('.input-context .section-group').not('.feed, .add').remove();
    }

    function populateXmlFromFields($context,validate) {
        var root = document.createElementNS(config.atomNamespace, 'feed');
        var $root=$(root);
        var $container=$root;

        $.each($context.find('.input-container .section-group'),function (_,sectionGroup) {
            var $sectionGroup=$(sectionGroup);

            if($sectionGroup.hasClass('entry')) {
                if($sectionGroup.hasClass('add')) {
                    return true;
                }
                $root.append($container=$(document.createElementNS(config.atomNamespace, 'entry')));
            }

            $.each($(this).find('.section'),function (_,section) {
                var $section=$(section),
                    fieldNames=$section.data('name').split(' '),
                    $input=$section.find('.input'),
                    fieldValue=$input.val(),
                    attr=$section.data('attr'),
                    definingAttr=$section.data('defining_attr'),
                    definingAttrValue=$section.data('defining_attr_value');


                if($section.hasClass('timestamp')) {
                    var currentTime=moment(fieldValue);
                    fieldValue=currentTime!==null&&currentTime.isValid()
                        ?currentTime.utc().format('YYYY-MM-DDThh:mm:ss\\Z')
                        :'';
                }

                if($section.hasClass("self-incrementing")) {
                    if($input.val()==="") {
                        $input.val($context.find(".input-container .self-incrementing").length);
                        fieldValue=$input.val();
                    }
                }
                if(!fieldValue) {
                    return;
                }

                $.each(fieldNames,function (_,fieldName) {
                    if($section.hasClass('multi')) {
                        if(attr!==undefined) {
                            var $nodes=$($.map(fieldValue.split(/\s*,\s*/),function (value) {
                                return value.length>0?$(document.createElementNS(config.atomNamespace, fieldName)).attr(attr,value).get(0):null;
                            }));
                        }
                        else {
                            var $nodes=$($.map(fieldValue.split(/\s*,\s*/),function (value) {
                                return value.length>0?$(document.createElementNS(config.atomNamespace, fieldName)).text(value).get(0):null;
                            }));
                        }
                    }
                    else {
                        if(attr!==undefined) {
                            var $nodes=$(document.createElementNS(config.atomNamespace, fieldName)).attr(attr,fieldValue);
                        }
                        else {
                            var $nodes=$(document.createElementNS(config.atomNamespace, fieldName)).text(fieldValue);
                        }
                    }

                    if(definingAttrValue!==null) {
                        $nodes.attr(definingAttr,definingAttrValue);
                    }

                    $container.append($nodes);
                });
            });
        });

        var xmlBodyText=new XMLSerializer().serializeToString(root);
        var xmlHeaderText='<?xml version="1.0" encoding="'+document.characterSet+'" ?>'
        $context.find('.output-container .view').removeClass('prettyprinted').text(selfCloseTags(vkbeautify.xml(xmlHeaderText+xmlBodyText)));

        prettyPrint();
    }

    function populateFieldsFromXml(xml,$context) {
        var xmlParser=new DOMParser();
        var xmlDoc=xmlParser.parseFromString(xml,'text/xml');
        var $xmlDoc=$(xmlDoc);

        clearEntries($context);

        (function recurse($nodes,$container) {
            $.each($nodes,function (_,node) {
                var $node=$(node);

                if($node.is('entry')) {
                    recurse($node.children(),addEntry($context));
                }
                else {
                    var fieldName=node.nodeName,
                        $sections=$container.find('.section[data-name~="'+fieldName+'"]');

                    var $section=$sections.filter(function () {
                        var $section=$(this),
                            definingAttribute=$section.data('defining_attr'),
                            definingAttributeValue=$section.data('defining_attr_value'),
                            nodeDefiningAttributeValue=node.getAttribute(definingAttribute);

                        if(definingAttributeValue===undefined&&nodeDefiningAttributeValue===null||nodeDefiningAttributeValue===definingAttributeValue) {
                            return true;
                        }
                    });

                    var attribute=$section.data('attr'),
                        $input=$section.find('.input');

                    if(attribute!==undefined) {
                        var fieldValue=node.getAttribute(attribute);
                    }
                    else {
                        var fieldValue=node.textContent;
                    }

                    if($section.hasClass('timestamp')) {
                        fieldValue=prettyTime(fieldValue);
                    }

                    if($section.hasClass('multi')) {
                        if($section.hasClass('tag')) {
                            $input.tagit('createTag',fieldValue);
                        }
                        else {
                            $input.val(extendCommaSeparatedList($input.val(),fieldValue));
                        }
                    }
                    else {
                        if($section.hasClass('tag')) {
                            $.each(commaSeparatedListToArray(fieldValue),function (_,term) {
                                $input.tagit('createTag',term);
                            });
                        }
                        else {
                            $input.val(fieldValue);
                        }
                    }

                    updateExpandButtonText($input);
                    checkForEmptiness($input);
                }
            });
        })($xmlDoc.find('feed > *'),$context.find('.input-container .feed.section-group'));
    }

    // Since tagit can't be bound as a live handler
    function wireInput($inputs) {
        $inputs.each(function (_,input) {
            var $input=$(input),
                $section=$input.parents('.section');

            if($section.hasClass('tag')) {
                var tagitOptions={
                    allowSpaces: true,
                    caseSensitive: false,
                    removeConfirmation: true
                };

                if($section.hasClass('select')) {
                    $.extend(tagitOptions,{
                        autocomplete: {
                            delay: 0,
                            minLength: 0,
                            source: function (request,response) {
                                var choices=$section.data('choices');

                                if(choices instanceof Array) {
                                    ; // done
                                }
                                else if(typeof choices==='string') {
                                    var parts=choices.split(';'),
                                        attribute=parts[0],
                                        source=parts[1];

                                    if(source==='other') {
                                        var $otherSections=$('.input-container .entry.section-group').not($section.parents('.section-group')).find('.section[data-name~="'+attribute+'"]');
                                        choices=$.map($otherSections,function (otherSection) {
                                            return $(otherSection).find('.input').val();
                                        });
                                    }

                                    // TODO more options
                                    else {
                                        choices=[];
                                    }
                                }

                                var eligibleTerms=$input.tagit('assignedTags')
                                var lastTerm=request.term.split(/\s*,\s*/).pop();
                                var chosenTerms=$.ui.autocomplete.filter(subtractArray(choices,eligibleTerms),lastTerm);
                                response(chosenTerms);
                            },
                            focus: function () {
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

    function subtractArray(minuend,subtrahend) {
        var hash={};
        $.each(subtrahend,function (_,item) {
            hash[item.toLowerCase()]=1;
        });
        return $.grep(minuend,function (item) {
            return hash[item.toLowerCase()]===undefined;
        });
    }

    function removeDuplicates(array) {
        var hash={};
        return $.grep(array,function (item) {
            var returnItem=hash[item]===undefined;
            hash[item]=1;
            return returnItem;
        });
    }

    function selfCloseTags(xmlString) {
        return xmlString.replace(/><\/.+?>/g,' />');
    }

    function commaSeparatedListToArray(list) {
        return list.split(/\s*,\s*/);
    }

    function extendCommaSeparatedList(list,value) {
        return /^\s*$/.test(list)?value:(list.replace(/(?:\s*,\s*)?$/,'')+', '+value);
    }

    function prettyTime(time) {
        return moment(time).format('MMMM D, YYYY, HH:mm:ss');
    }

    function getContextClassName($element) {
        var contextClassName=null;
        $.each(['meta','content'],function (_,contextName) {
            if($element.hasClass(contextName)) {
                contextClassName=contextName;
                return false;
            }
        });
        return contextClassName;
    }

    function updateExpandButtonText($input) {
        if($input.parents('.section').is('[data-name~="title"]')) {
            if(/^\s*$/.test($input.val())) {
                $input.parents('.entry').find('.placeholder .expand').text('');
            }
            else {
                $input.parents('.entry').find('.expand').text($input.val());
            }
        }
    }

    function checkForEmptiness($input) {
        if($input.parents('.section').hasClass('non-empty')) {
            if(/^\s*$/.test($input.val())) {
                $input.parents('.section').addClass('invalid');
            }
            else {
                $input.parents('.section').removeClass('invalid');
            }
        }
    }
});
