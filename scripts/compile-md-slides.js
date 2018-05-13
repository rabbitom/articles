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
    exit(1, `Usage: ${process.argv[1]} <md-file> [template-file]`);

var mdFile = process.argv[2];
var templateFile = (process.argv.length >= 4) ? process.argv[3] : null;

var compileSlides = require('./slides.js');
compileSlides(mdFile, templateFile);