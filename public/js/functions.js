/*global $, alert */

function SetUrl(url) {

    "use strict";

    //e.preventDefault();
    /*
		if uncomment the above line, html5 nonsupported browers won't change the url but will display the ajax content;
		if commented, html5 nonsupported browers will reload the page to the specified link.
	*/

    //get the link location that was clicked
    var pageurl = url;

    //to change the browser URL to the given link location
    if (pageurl !== window.location) {
        window.history.pushState({
            path: pageurl
        }, '', pageurl);
    }
    //stop refreshing to the page given in
    return false;
}

function CopyNote(event,noteLineID) {
    var noteVal = ''
    $(noteLineID).each(function(index, val) {
        $line = $(val).find(".lineVal");
        noteVal += $($line).html() + '\r\n';//.replace(/<br>/g, "\n") + "\n";
    });

    var clipboard = event.clipboardData;
    clipboard.setData("text/plain", noteVal);
    alert("Note was copied to the clipboard!");
}

function BindClipboard(copyID, noteLineID) {

    //Create the client
    var client = new ZeroClipboard($("#" + copyID));

    //Set our binding values
    client.noteBinding = noteLineID;

    //Setup the function
    client.on("copy", function(event) {
        CopyNote(event,"#" + this.noteBinding);
    });  
}

function setupAccordian() {
    "use strict";
    $("#template-list li")
        .draggable({
            appendTo: "body",
            helper: "clone"
        });

    $(".ui-accordion-content")
        .css("height", "");
}

var Functions = (function () {
    "use strict";
    return {
        JQueryUI: (function () {
            return {
                enableAccordian: function () {
                    setupAccordian();
                },
                enableEditor: function () {
                    $(".note-content")
                        .droppable({
                            activeClass: "ui-state-default",
                            hoverClass: "ui-state-hover",
                            accept: ":not(.ui-sortable-helper)",
                            drop: function (event, ui) {
                                var category = ui.draggable.attr('data-category');
                                $(this).controller().addLineFromDrop(category, ui.draggable.data('index'));
                            }
                        });
                }
            };
        }())
    };
}());





function hex(x) {
    "use strict";
    return ("0" + parseInt(x, 10).toString(16)).slice(-2);
}

$.cssHooks.backgroundColor = {
    get: function (elem) {
        "use strict";
        var bg;
        if (elem.currentStyle) {
            bg = elem.currentStyle.backgroundColor;
        } else if (window.getComputedStyle) {
            bg = document.defaultView.getComputedStyle(elem, null).getPropertyValue("background-color");
        }
        if (bg.search("rgb") === -1) {
            return bg;
        } else {
            bg = bg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            
            return hex(bg[1]) + hex(bg[2]) + hex(bg[3]);
        }
    }
};

String.prototype.nl2br = function () {
    "use strict";
    return this.replace(/\n/g, "<br>");
};