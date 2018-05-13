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

if(process.argv.length < 3)
    exit(`Usage: ${process.argv[1]} <md-file> [template-file]`);

var mdFile = process.argv[2];
var mdStr = readFileAsString(mdFile);
var templateFile;
if (process.argv.length >= 4)
    templateFile = process.argv[3];
else {
    templateFile = mdFile.replace(/\.md$/, '.ejs');
    if(!fs.existsSync(templateFile))
        templateFile = 'slides.ejs';
}
var templateStr = readFileAsString(templateFile);

const sectionSplitter = '\n\n';
const titleSection = /^#/;
const imageSection = /^\s*!\[(.*)\]\((.*)\)$/;

var sections = mdStr.split('\n\n');
var data = [];
var currentArray = [];
for(var i=0, len=sections.length; i<len; ) {
    var currentSection = sections[i++];
    if(imageSection.test(currentSection)) {
        var parts = currentSection.match(imageSection);
        var imageTitle = parts[1];
        if(imageTitle == '')
            currentSection = {
                background: parts[2]
            }
        else
            currentSection = parts[1] + '\n' + parts[0];
    }
    if((i == len) || titleSection.test(sections[i])) {
        if(currentArray.length == 0)
            data.push(currentSection);
        else {
            currentArray.push(currentSection);
            data.push(currentArray);
            currentArray = [];
        }
    }
    else
        currentArray.push(currentSection);
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