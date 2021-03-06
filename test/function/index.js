'use strict';

let browserJsEnv = require('browser-js-env');
let promisify = require('es6-promisify');
let fs = require('fs');
let path = require('path');
let readFile = promisify(fs.readFile);

const puppeteer = require('puppeteer');

const headlessOpen = async(url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: 'networkidle2'
    });
    return {
        kill: () => {
            browser.close();
        }
    };
};

let runFileInBrowser = (file) => {
    return readFile(file).then((str) => {
        return browserJsEnv(str, {
            testDir: path.join(path.dirname(file), `../../__test/${path.basename(file)}`),
            clean: true,
            open: headlessOpen
        });
    });
};

let testFiles = {
    'base': path.join(__dirname, '../browser/case/base.js'),
    'changeUrl': path.join(__dirname, '../browser/case/changeUrl.js'),
    'jumpBySingleProtocol': path.join(__dirname, '../browser/case/jumpBySingleProtocol.js'),
    'stopPropagation': path.join(__dirname, '../browser/case/stopPropagation.js'),
    'location': path.join(__dirname, '../browser/case/location.js')
};

describe('spa:browser', () => {
    for (let name in testFiles) {
        it(name, () => {
            return runFileInBrowser(testFiles[name]);
        });
    }
});
