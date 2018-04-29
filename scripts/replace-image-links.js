#!/usr/bin/env node

const whatfor = 'Replace image links in original md file.'
const parameters = '<original-md-file> < -p prefix | -j jianshu-image-links > <output-md-file> [--show-details]'

const fs = require('fs');
const path = require('path');

function exit(code, msg) {
    console.log(msg);
    process.exit(code);
}

var argc = process.argv.length;
if (argc < 6)
    exit(1, `${whatfor}\nUsage: ${path.basename(process.argv[1])} ${parameters}`);

var srcFile = process.argv[2];
var mode = process.argv[3];
var modeParameters = process.argv[4];
var destFile = process.argv[5];
var showDetails = (process.argv[6] == '--show-details');

function readFileAsString(filePath) {
    var buf = fs.readFileSync(filePath);
    var str = buf.toString();
    return str;
}

const imageLinkPatternParts = /!\[(.*)\]\((.*)\)/;
const imageLinkPatternGlobal = /!\[(.*)\]\((.*)\)/g;

var getNewUrl;

if (mode == '-j') {
    var imageLinksFile = modeParameters;
    var imageLinksStr = readFileAsString(imageLinksFile);
    var imageLinksArr = imageLinksStr.match(imageLinkPatternGlobal);
    var imageLinks = {};
    for (var imageLink of imageLinksArr) {
        var parts = imageLink.match(imageLinkPatternParts);
        var fileName = parts[1];
        var fileUrl = parts[2];
        imageLinks[fileName] = fileUrl;
    }
    console.log(`${imageLinksArr.length} new image links loaded.`);
    getNewUrl = function(url) {
        var fileName = path.basename(url);
        return imageLinks[fileName];
    }
}
else if(mode == '-p') {
    var prefix = modeParameters;
    getNewUrl = function(url) {
        return prefix + url;
    }
}
else
    exit(1, 'invalid mode: ' + mode);

var srcStr = readFileAsString(srcFile);
// for(var fileName in imageLinks) {
//     srcStr.replace('images/'+fileName, imageLinks[fileName]);
// }
var replaceCount = 0,
    skipCount = 0;
var destStr = srcStr.replace(imageLinkPatternGlobal, (link, name, url) => {
    var newUrl = getNewUrl(url);
    if (newUrl) {
        replaceCount++;
        if (showDetails)
            console.log(`Replaced ${url} with ${newUrl}`);
        return `![${name}](${newUrl})`;
    } else {
        skipCount++;
        if (showDetails)
            console.log('Skipped ' + link);
        return link;
    }
});
console.log(`${replaceCount} image links replaced in original file, ${skipCount} skipped.`);

fs.writeFileSync(destFile, destStr);