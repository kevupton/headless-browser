const { browserManager, updateEnvironment } = require('../lib/app');
const { flatMap, tap, map, first, filter } = require('rxjs/operators');
const { combineLatest } = require('rxjs');
const fs = require('fs');
const path = require('path');

// const content = fs.readFileSync(path.join(__dirname, './test.html'), 'utf-8');

updateEnvironment({ debug: true });

browserManager.activeInstance$.pipe(
  flatMap(browser => browser.activePage$),
  flatMap((page) => combineLatest([
    page.on$('response').pipe(
      map(([response]) => response),
      tap(response => console.log(response.url())),
      filter(response => response.url() === 'https://google.com/'),
      first(),
    ),
    page.open('https://google.com/').pipe(
      tap(result => console.log('done', result)),
      first(),
    ),
  ])),
  first(),
).subscribe(([response]) => console.log(response.headers()));
