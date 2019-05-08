const { browserManager, updateEnvironment } = require('../lib/app');
const { flatMap, tap, map, first, filter } = require('rxjs/operators');
const { combineLatest } = require('rxjs');
const fs = require('fs');
const path = require('path');

// const content = fs.readFileSync(path.join(__dirname, './test.html'), 'utf-8');

updateEnvironment({ debug: true, headless: false });

let browser;
browserManager.activeInstance$.pipe(
  tap(b => browser = b),
  flatMap(browser => browser.activePage$),
  flatMap((page) => page.open('https://google.com/', { waitUntil: 'networkidle0' })),
  tap(() => console.log('resetting')),
  flatMap(() => browser.reset()),
).subscribe(() => console.log('Complete'));
