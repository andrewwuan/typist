
// Configuration
var numReferenceLinesToShow = 3;
var numTypeLinesToShow = 2;

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

var startPrompt = "Click this area to resume";
var pausePrompt = "Type now! Click again to pause";
var beginPrompt = "Click this area to begin";
var restartPrompt = "Click this area to restart";

// Functions
// Event handlers
$(document).ready(function() {
    console.log("Ready!");

    numCharsPerLine = Math.ceil($("#reference-container").width() / 9);

    $("#text-input-submit").click(function() {
        typeText = cleanText($("#text-input-box").val());
        resetTyperContainers();
    });

    $("#endless-checkbox").change(function() {
        endless = this.checked;
    });

    $("#backspace-checkbox").change(function() {
        allowBackspace = this.checked;
    });

    $("#load-sample-text").click(function() {
        typeText = cleanText(sampleText);
        resetTyperContainers();
    });

    $("#reference-container").click(function() {

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

    // Load sample text
    typeText = cleanText(sampleText);
    resetTyperContainers();
});

function cleanText(text) {
    return text.replace(/( |\r|\r\n|\n)/g, String.fromCharCode(160))
}

// Typing text related
function resetTyperContainers() {
    currentIndex = 0;
    words = 0;
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
    $("#elapsed-time-value-number").text(String(elapsedSec10 / 10));
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
                $("#elapsed-time-value-number").text(String(elapsedSec10 / 10));
                $("#average-speed-value-number").text(String(Math.ceil(words * 60 * 10 / elapsedSec10)));
            }
        }, 100);
    }
}

function getWords() {
    var counter = 0;
    for (var i = 0; i < typeLines.length; i++) {
        var lineCounter = 0;
        var chars = typeLines[i].children();
        var lastSpace = false;
        var seenError = false;
        for (var j = 0; j < chars.length; j++) {
            if ($(chars[j]).hasClass("char-incorrect")) {
                seenError = true;
            }

            if ($(chars[j]).text() == String.fromCharCode(160)) {
                if ((!seenError) && (!lastSpace)) lineCounter++;
                lastSpace = true;
                seenError = false;
            } else {
                lastSpace = false;
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
        char.addClass("char-correct");
    } else {
        char.addClass("char-incorrect");
    }
    line.append(char);
}

function finish() {
    stopTyping();
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
            typeText = typeText + ' ' + typeText;
        }
    }

    if (currentIndex + numCharsPerLine >= typeText.length - 1) {
        // If remaining text doesn't fill one line, return everything left
        currentIndex = typeText.length;
        textDepleted = true
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

var sampleText = "Censorship in the People's Republic of China is implemented or mandated by the PRC's ruling party, the Communist Party of China. The government censors content for mainly political reasons, but also to maintain its control over the populace. The Chinese government asserts that it has the legal right to control the internet's content within their territory, and their censorship rules do not infringe on the citizen's right to free speech. Censored media include essentially all capable of reaching a wide audience including television, print media, radio, film, theater, text messaging, instant messaging, video games, literature and the Internet. Chinese officials have access to uncensored information via an internal document system. Reporters Without Borders ranks China's press situation as \"very serious\", the worst ranking on their five-point scale. In August 2012 the OpenNet Initiative classified Internet censorship in China as \"pervasive\" in the political and conflict/security areas and \"substantial\" in the social and Internet tools areas, the two most extensive classifications of the five they use. Freedom House ranks the press there as \"not free\", the worst ranking, saying that \"state control over the news media in China is achieved through a complex combination of party monitoring of news content, legal restrictions on journalists, and financial incentives for self-censorship,\" and an increasing practice of \"cyber-disappearance\" of material written by or about activist bloggers. Other views suggest that local Chinese businesses such as Baidu, Tencent and Alibaba, some of the world's largest internet enterprises, benefited from the way China has blocked international rivals from the market, encouraging domestic competition."
