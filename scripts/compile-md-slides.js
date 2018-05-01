#!/usr/bin/env node
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

function readFileAsString(filePath) {
    var buf = fs.readFileSync(filePath);
    var str = buf.toString();
    return str;
}

function exit(code, msg) {
    console.log(msg);
    process.exit(code);
}

if(process.argv.length < 4)
    exit(`Usage: ${process.argv[1]} <template-file> <md-file>`);

var templateFile = process.argv[2];
var templateStr = readFileAsString(templateFile);
var mdFile = process.argv[3];
var mdStr = readFileAsString(mdFile);

const sectionSplitter = '\n\n';
const titleSection = /^##/;
const imageSection = /^!\[(.*)\]\((.*)\)/;

var sections = mdStr.split('\n\n');
var data = [];
var currentArray = [];
for(var i=0, len=sections.length; i<len; ) {
    var currentLine = sections[i++];
    if((i == len) || /^#/.test(sections[i])) {
        if(currentArray.length == 0)
            data.push(currentLine);
        else {
            data.push(currentArray);
            currentArray = [];
        }
    }
    else
        currentArray.push(currentLine);
}

var outputStr = ejs.render(templateStr, {'data': data});
var outputDir = path.dirname(mdFile);
var outputFilename = path.basename(mdFile, 'md');
var outputPath = path.format({
    dir: outputDir,
    name: outputFilename,
    ext: 'html'
});
fs.writeFileSync(outputPath, outputStr);