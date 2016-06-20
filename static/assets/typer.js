
// Configuration
var numReferenceLinesToShow = 3;
var numTypeLinesToShow = 2;
var password = "123";

// Options
var allowBackspace = true;
var endless = false;

// Variables
var numCharsPerLine;
var typeText;
var currentIndex = 0;
var textDepleted = false;
var typeDone = false;
var linesDirty = false;
var referenceLines = [];
var typeLines = [];
var highlightedLine;
var curReferenceChar;

var timerInterval;
var elapsedSec10 = 0;
var words = 0;
var hits = 0;
var misses = 0;

var startPrompt = "Click this area to resume; click outside to stop";
var pausePrompt = "Type now! Click again to pause";
var beginPrompt = "Click this area to begin";
var restartPrompt = "Click this area to restart";

// Functions
// Event handlers
$(window).load(function() {
    console.log("Ready!");

    numCharsPerLine = Math.ceil($("#reference-container").width() / 9);

    $("#typer-title,#home-link").click(function(event) {
        $("#main-container").show();
        $("#admin-container").hide();
        $("#admin-link").show();
        $("#home-link").hide();

        resetTyperContainers();

        event.stopPropagation();
    });

    $("#admin-link").click(function(event) {
        if (elapsedSec10 == 0 || typeDone) {
            $("#password-input").val('');
            $("#password-container").show();
            $("#options").hide();

            $("#main-container").hide();
            $("#admin-container").show();
            $("#admin-link").hide();
            $("#home-link").show();

            $("#password-input").focus();
        } else {
            alert("Typing session in progress!")
        }

        event.stopPropagation();
    });

    $("#password-input").keypress(function (e) {
        if (e.which == 13) {
            if ($("#password-input").val() == password) {
                $("#password-container").hide();
                $("#typing-text").val(typeText);
                $("#options").show();
            } else {
                alert($("#password-input").val() + " is not the correct password!");
            }
        }
    });

    $("#update-typing-text").click(function(event) {
        typeText = cleanText($("#typing-text").val());
        resetTyperContainers();
        alert("Update Successful!");

        event.stopPropagation();
    });

    $("#download-data").click(function(event) {
        readFromFile(function (fe, content) {
            console.log(content);
            var downloadA = $("<a>", {download: "data.csv", href: "data:text/csv,"+encodeURIComponent(content)});
            downloadA[0].click();
        });

        event.stopPropagation();
    });

    $("#endless-checkbox").change(function() {
        endless = this.checked;
    });

    $("#backspace-checkbox").change(function(event) {
        allowBackspace = this.checked;
    });

    $("#load-sample-text").click(function(event) {
        typeText = cleanText(sampleText);
        resetTyperContainers();

        event.stopPropagation();
    });

    $("#input-container").click(function(event) {
        if (timerInterval == undefined) {
            if (typeDone) {
                resetTyperContainers();
            }

            startTyping();
        } else {
            stopTyping();
        }

        event.stopPropagation();
    });

    $("body").click(function() {
        if (elapsedSec10 != 0 && timerInterval == undefined && !typeDone) {
            // Paused
            var doStop = confirm("Do you really want to stop?");
            if (doStop) {
                typeDone = true;
                finish();
            }
        }
    });

    if (window.requestFileSystem == undefined) {
        alert("Saving & downloading data won't be available in non Google Chrome browser.");
    }

    // Load sample text
    typeText = cleanText(sampleText);
    resetTyperContainers();
});

function cleanText(text) {
    return text.replace(/( |\r|\r\n|\n)/g, String.fromCharCode(160))
}

// Typing text related
function resetTyperContainers() {
    textDepleted = false;
    currentIndex = 0;
    words = 0;
    hits = 0;
    misses = 0;
    typeDone = false;

    referenceLines = [];
    typeLines = [];

    if (timerInterval != undefined) {
        clearInterval(timerInterval);
    }
    elapsedSec10 = 0;
    timerInterval = undefined;

    for (var i = 0; i < numReferenceLinesToShow; i++) {
        var lineText = getNextLine();
        var line = prepareLine(lineText);
        referenceLines.push(line);

        if (textDepleted) break;
    }
    curReferenceChar = $(referenceLines[0].children()[0]);
    curReferenceChar.addClass("char-highlight");

    updateTyperContainersView();
}

function updateTyperContainersView() {
    $("#reference-text").empty();
    for (var i = Math.max(0, referenceLines.length - numReferenceLinesToShow); i < referenceLines.length; i++) {
        $("#reference-text").append(referenceLines[i]);
    }

    $("#input-text").empty();
    for (var i = Math.max(0, typeLines.length - numTypeLinesToShow); i < typeLines.length; i++) {
        $("#input-text").append(typeLines[i]);
    }
}

function updateStatsView() {
    $("#elapsed-time-value-number").text(Math.floor(String(elapsedSec10 / 10)));
    $("#word-count-value-number").text(String(words));
    $("#average-speed-value-number").text(String(Math.ceil(words * 60 * 10 / elapsedSec10)));
}

// Typing related
function startTyping() {
    $("#input-container").removeClass("input-inactive").removeClass("input-idle").addClass("input-active");
    $(document).unbind("keypress").bind("keypress", keyPressHandler);
    $(document).unbind("keydown").bind("keydown", keyDownHandler);
    $(document).unbind("keyup").bind("keyup", keyUpHandler);

    $("#click-prompt").text(pausePrompt);

    if (timerInterval == undefined) {
        timerInterval = setInterval(function () {
            elapsedSec10++;
            if (elapsedSec10 % 10 == 0) {
                updateStatsView();
            }
        }, 100);
    }
}

function getWords() {
    var counter = 0;
    for (var i = 0; i < typeLines.length; i++) {
        var lineCounter = 0;
        var chars = typeLines[i].children();
        var referenceChars = referenceLines[i].children();
        var newWord = false;
        var seenError = false;
        for (var j = 0; j < chars.length; j++) {
            var jqChar = $(chars[j]);
            var jqReferenceChar = $(referenceChars[j]);
            if (jqChar.hasClass("char-incorrect")) {
                seenError = true;
            }

            var notSpace = jqReferenceChar.text() != String.fromCharCode(160);
            if (!newWord && notSpace) {
                seenError = false;
            }
            newWord = notSpace;

            if (newWord && !seenError && (j == referenceChars.length - 1 || $(referenceChars[j + 1]).text() == String.fromCharCode(160))) {
                lineCounter++;
            }
        }
        counter += lineCounter;
    }
    return counter;
}

function stopTyping() {
    $("#input-container").removeClass("input-inactive").removeClass("input-active");
    if (typeDone) {
        $("#input-container").addClass("input-idle");
        $("#click-prompt").text(restartPrompt);
    } else {
        $("#input-container").addClass("input-inactive");
        $("#click-prompt").text(startPrompt);
    }
    $(document).unbind("keypress", keyPressHandler);
    $(document).unbind("keydown", keyDownHandler);
    $(document).unbind("keyup", keyUpHandler);

    if (timerInterval != undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }
}

function keyPressHandler(event) {
    // Ignore new line
    if (event.which == 13) {
        return;
    }

    var line;
    if (typeLines.length == 0) {
        line = prepareLine("", false);
        typeLines.push(line);
        linesDirty = true;
    } else {
        var currentLine = typeLines[typeLines.length - 1];
        if (currentLine.children().length == referenceLines[typeLines.length - 1].children().length) {
            if (referenceLines.length > typeLines.length) {
                // Line full, create another line
                line = prepareLine("", false);
                typeLines.push(line);
                linesDirty = true;
            }
        } else {
            line = typeLines[typeLines.length - 1];
        }
    }

    if (linesDirty) {
        fillReferenceLineIfNeeded();
        updateTyperContainersView();
    }

    // Update current reference character and point to next reference character
    var referenceCharText = curReferenceChar.text();
    curReferenceChar.removeClass("char-highlight");
    var nextReferenceChar = curReferenceChar.next();
    if (nextReferenceChar.length == 0) {
        // Next character at the start of the next line
        if (referenceLines.length == typeLines.length) {
            // Typing done
            typeDone = true;
        } else {
            nextReferenceChar = $(referenceLines[typeLines.length ].children()).first();
        }
    }
    curReferenceChar = nextReferenceChar;

    if (typeDone) {
        finish();
    } else {
        curReferenceChar.addClass("char-highlight");
    }

    var match;
    var charText;
    if (event.charCode == 32) {
        charText = String.fromCharCode(160);
    } else {
        charText = String.fromCharCode(event.charCode);
    }
    match = referenceCharText == charText;

    var char = prepareChar(charText, false);
    if (match) {
        hits++;
        char.addClass("char-correct");
    } else {
        misses++;
        char.addClass("char-incorrect");
    }
    line.append(char);
}

function finish() {
    stopTyping();

    // Build CSV row
    var row = {};
    row["finish time"] = timeStamp();
    row["duration"] = Math.floor(elapsedSec10 / 10);
    row["words"] = words;
    row["wpm"] = Math.round(words * 10 * 60 / elapsedSec10);
    row["hits"] = hits;
    row["misses"] = misses;
    row["hit rate"] = ((hits / (hits + misses)) * 100).toFixed(2) + "%";

    appendRowToFile(row);

    readFromFile(function(fileEntry, text) {console.log(text);});
}

function fillReferenceLineIfNeeded() {
    if (referenceLines.length <= typeLines.length && !textDepleted) {
        var lineText = getNextLine();
        var line = prepareLine(lineText);
        referenceLines.push(line);
    }
}

function keyDownHandler(event) {
    if (event.keyCode == 8) {
        // Prevent browser from capturing the backspace event and navigate back
        event.preventDefault();
        if (allowBackspace && typeLines.length > 0) {
            var oldLine = typeLines[typeLines.length - 1];
            if (oldLine.children().length == 1) {
                // Remove a type line
                typeLines.pop();
                updateTyperContainersView();
            } else {
                $(".char", oldLine).last().remove();
            }

            if (referenceLines.length - typeLines.length >= numReferenceLinesToShow && typeLines.length > 0) {
                currentIndex -= referenceLines[referenceLines.length - 1].children().length;
                referenceLines.pop();
                updateTyperContainersView();
            }
            curReferenceChar.removeClass("char-highlight");
            var prevReferenceChar = curReferenceChar.prev();
            if (prevReferenceChar.length == 0) {
                prevReferenceChar = $(referenceLines[typeLines.length - 1].children()).last();
            }
            curReferenceChar = prevReferenceChar;
            curReferenceChar.addClass("char-highlight");
        }
    }
}

function keyUpHandler() {
    // update words
    words = getWords();
    updateStatsView();
}

function prepareLine(lineText) {
    var line = $("<div>", {class: 'line'});
    for (var i = 0; i < lineText.length; i++) {
        line.append(prepareChar(lineText[i]));
    }

    return line;
}

function prepareChar(charText) {
    var char = $("<span>", {class: 'char'});
    char.text(charText);
    return char;
}

// Get the next line that'll fill numCharsPerLine, respecting spaces
function getNextLine() {
    // Preserve the current index
    var index = currentIndex;

    if (endless) {
        while (currentIndex + numCharsPerLine >= typeText.length - 1) {
            typeText = typeText + String.fromCharCode(160) + typeText;
            console.log("Expanded. typeText = " + typeText);
        }
    }

    if (currentIndex + numCharsPerLine >= typeText.length - 1) {
        // If remaining text doesn't fill one line, return everything left
        currentIndex = typeText.length;
        textDepleted = true;
        return typeText.substring(index, typeText.length);
    } else {
        var breakIndex = currentIndex + numCharsPerLine - 1;
        while (breakIndex > currentIndex && typeText.charAt(breakIndex) != String.fromCharCode(160)) {
            breakIndex--;
        }

        if (breakIndex == currentIndex) {
            // No space found, use entire line
            currentIndex = currentIndex + numCharsPerLine;
            return typeText.substring(index, currentIndex);
        } else {
            currentIndex = breakIndex + 1;
            return typeText.substring(index, currentIndex);
        }
    }
}

var sampleText = "The Solar System consists of the Sun Moon and Planets. It also consists of comets, meteoroids and asteroids. The Sun is the largest member of the Solar System. In order of distance from the Sun, the planets are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune and Pluto; the dwarf planet. The Sun is at the centre of the Solar System and the planets, asteroids, comets and meteoroids revolve around it."
