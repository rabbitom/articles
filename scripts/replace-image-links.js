#!/usr/bin/env node

const whatfor = 'Replace image links in original md file for jianshu.'
const parameters = '<original-md-file> <jianshu-image-links> <output-md-file> [--show-details]'

const fs = require('fs');
const path = require('path');

function exit(code, msg) {
    console.log(msg);
    process.exit(code);
}

var argc = process.argv.length;
if (argc < 5)
    exit(1, `${whatfor}\nUsage: ${path.basename(process.argv[1])} ${parameters}`);

var srcFile = process.argv[2];
var imgLinksFile = process.argv[3];
var destFile = process.argv[4];
var showDetails = (process.argv[5] == '--show-details');

function readFileAsString(filePath) {
    var buf = fs.readFileSync(filePath);
    var str = buf.toString();
    return str;
}

const imageLinkPatternParts = /!\[(.*)\]\((.*)\)/;
const imageLinkPatternGlobal = /!\[(.*)\]\((.*)\)/g;

var imageLinksStr = readFileAsString(imgLinksFile);
var imageLinksArr = imageLinksStr.match(imageLinkPatternGlobal);
var imageLinks = {};
for (var imageLink of imageLinksArr) {
    var parts = imageLink.match(imageLinkPatternParts);
    var fileName = parts[1];
    var fileUrl = parts[2];
    imageLinks[fileName] = fileUrl;
}
console.log(`${imageLinksArr.length} new image links loaded.`);

var srcStr = readFileAsString(srcFile);
// for(var fileName in imageLinks) {
//     srcStr.replace('images/'+fileName, imageLinks[fileName]);
// }
var replaceCount = 0,
    skipCount = 0;
var destStr = srcStr.replace(imageLinkPatternGlobal, (link, name, url) => {
    var fileName = path.basename(url);
    var newUrl = imageLinks[fileName];
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