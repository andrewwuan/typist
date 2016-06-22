// Reading & Writing to client browser persistent storage using HTML5 FileSystem API

var storageChunk = 10 * 1024; // 10KB
var storageDelta = 5 * 1024; // 5KB
var currentQuota = storageChunk;

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

function increaseCurrentQuota() {
    currentQuota += storageChunk;
}

function fsErrorHandler(e) {
    var msg = '';

    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'QUOTA_EXCEEDED_ERR';
        break;
        case FileError.NOT_FOUND_ERR:
        msg = 'NOT_FOUND_ERR';
        break;
        case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR';
        break;
        case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR';
        break;
        case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR';
        break;
        default:
        msg = 'Unknown Error';
        break;
    };

    console.log('Error: ' + msg);
}

function queryUsageAndQuota(callback) {
    navigator.webkitPersistentStorage.queryUsageAndQuota (
        function(usedBytes, grantedBytes) {
            callback(usedBytes, grantedBytes);
        }, function(e) {
            console.log("Cannot query usage and quota", e)
        });
}

function appRequestQuota(callback) {
    navigator.webkitPersistentStorage.requestQuota(currentQuota, callback, function (e) {
        alert("Can't get permission to store data. Record will not be saved");
        console.log(e);
    });
}

function appRequestFileSystem(callback) {
    appRequestQuota(function(grantedBytes) {
        window.requestFileSystem(PERSISTENT, grantedBytes, callback, fsErrorHandler);
    });
}

function appGetFileEntry(callback, fileName) {
    appRequestFileSystem(function (fs) {
        fs.root.getFile(fileName, {create: true, exclusive: false}, callback, fsErrorHandler);
    });
}

// Read data from file on disk
function readFromFile(callback, fileName) {
    appGetFileEntry(function(fileEntry) {
        // Read from current file
        fileEntry.file(function(file) {
            var reader = new FileReader();

            reader.onloadend = function(e) {
                callback(fileEntry, this.result);
            };

            reader.readAsText(file);
        }, fsErrorHandler);
    }, fileName);
}

// Append data to file on disk
function appendRowToFile(row, fileName) {
    readFromFile(function(fileEntry, csvContent) {

        // Generate new csv text
        var oldRows = [];
        if (csvContent != '') {
            oldRows = Papa.parse(csvContent, { header: true }).data;
        }

        oldRows.push(row);
        var text = Papa.unparse(oldRows, {quotes: true});

        // Write
        writeToFile(fileEntry, text);
    }, fileName);
}

// Write plain text to file on disk
function writeToFile(fileEntry, text) {
    fileEntry.createWriter(function(fileWriter) {

        fileWriter.onerror = function(e) {
            console.log("Can't write to disk.");
        };

        if (text.length > currentQuota - storageDelta) {
            increaseCurrentQuota();
            appGetFileEntry(function (newFileEntry) {
                console.log("Expanding storage");
                writeToFile(newFileEntry, text);
            });
        }

        var blob = new Blob([text], {type: 'text/plain'});
        fileWriter.write(blob);

    }, fsErrorHandler);
}

// Remove file from disk
function removeFile(fileEntry, callback) {
    fileEntry.remove(callback);
}
