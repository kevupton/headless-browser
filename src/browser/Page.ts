import { WebPage as PhantomPage } from 'phantom';
import {
  Browser as Chrome,
  ClickOptions,
  Cookie,
  DirectNavigationOptions,
  ElementHandle,
  EmulateOptions,
  EvaluateFn,
  NavigationOptions,
  Page as ChromePage,
  PageEventObj,
  ScreenshotOptions,
} from 'puppeteer';
import { AsyncSubject, combineLatest, Observable } from 'rxjs';
import { from } from 'rxjs/internal/observable/from';
import { of } from 'rxjs/internal/observable/of';
import { tap } from 'rxjs/internal/operators/tap';
import { flatMap, map, mapTo } from 'rxjs/operators';
import { EventCallback, RxjsBasicEventManager } from '../lib/RxjsBasicEventManager';
import { Browser } from './Browser';
import { ManagerItem } from './ManagerItem';

export interface IPage {

  equals(obj : any) : Observable<boolean>;

  getContent () : Observable<string>;

  setHeaders (headers : Record<string, string>) : Observable<void>;

  open (url : string, options? : DirectNavigationOptions) : Observable<IOpenResponse>;

  run (fn : EvaluateFn, ...args : any[]) : Observable<void>;

  on$<K extends keyof PageEventObj> (event : K) : Observable<[PageEventObj[K], ...any[]]>;

  contains (options? : DomOptions) : Observable<boolean>;

  getValues (options? : DomOptions) : Observable<any[]>;

  click (options? : DomOptions & IClickOptions) : Observable<void>;

  hover (options? : DomOptions) : Observable<void>;

  focus (options? : DomOptions) : Observable<void>;

  type (options? : DomOptions & TypeOptions) : Observable<void>;

  awaitPageLoad (duration : number) : Observable<void>;

  setScrollTop (options? : DomOptions & ScrollTopOptions) : Observable<boolean>;

  emulate (options? : IEmulateOptions) : Observable<void>;

  scrollTo (options? : DomOptions) : Observable<IScrollToResult>;

  captureScreenshot (options? : ScreenshotOptions) : Observable<Buffer>;

  refresh (options? : NavigationOptions) : Observable<void>;

  getUrl () : Observable<string>;

  setViewport (width : number, height : number) : Observable<void>;

  bringToFront () : Observable<void>;

  setContent (html : string) : Observable<void>;
}

export interface IEmulateOptions extends EmulateOptions {

}

export interface IOpenResponse {
  status : number;
}

export interface IClickOptions {
  options? : ClickOptions;
}

export interface IScrollToResult {
  scrolled : boolean;
  error? : string;
  scrollTop? : number;
}

export interface IPagePossibilities {
  phantomPage? : PhantomPage;
  chromePage? : ChromePage;
}

export interface DomOptions {
  selector : string;
  xpath? : boolean;
}

export interface TypeOptions {
  options? : {
    delay : number;
  };
  text : string;
}

export interface ScrollTopOptions {
  top : number;
}

export class Page extends ManagerItem implements IPage {

  private readonly pageSubject  = new AsyncSubject<IPagePossibilities>();
  private readonly eventManager = new RxjsBasicEventManager(
    (event, fn) => this.registerEvent(event, fn),
    (event, fn) => this.deregisterEvent(event, fn),
  );

  constructor (
    private readonly browser : Browser,
    existingPage? : IPagePossibilities,
  ) {
    super();

    if (existingPage) {
      this.setConstructed();
      this.pageSubject.next(existingPage);
      this.pageSubject.complete();
    }
  }

  on$<K extends keyof PageEventObj> (event : K) : Observable<[PageEventObj[K], ...any[]]> {
    return this.eventManager.getEvent$(event);
  }

  getContent () : Observable<string> {
    return this.caseManager(
      chromePage => from(chromePage.content()),
    );
  }

  emulate (options : IEmulateOptions) {
    return this.caseManager(
      chromePage => from(chromePage.emulate(options)),
    );
  }

  open (url : string, options? : DirectNavigationOptions) : Observable<IOpenResponse> {
    return this.caseManager(
      chromePage => from(chromePage.goto(url, options))
        .pipe(
          map(response => ({
            status: response && response.status() || null,
          })),
        ),
    );
  }

  run (fn : EvaluateFn, ...args : any[]) : Observable<any> {
    return this.caseManager(
      chromePage => from(chromePage.mainFrame()
        .evaluate(fn, ...args)),
    );
  }

  contains ({ selector, xpath } : DomOptions) : Observable<boolean> {
    return this.caseManager(
      chromePage => {
        return this.getChromeItems(chromePage, selector, xpath)
          .pipe(
            map(items => items.length > 0),
          );
      },
    );
  }

  getValues ({ selector, xpath } : DomOptions) : Observable<any[]> {
    return this.caseManager(
      chromePage => {
        return this.getChromeItems(chromePage, selector, xpath)
          .pipe(
            flatMap(items => from(chromePage.evaluate((...elements) => {
              return elements.map(element => element.value || element.nodeValue || element.textContent);
            }, ...items))),
          );
      },
    );
  }

  click ({ selector, xpath, options } : DomOptions & IClickOptions) : Observable<void> {
    return this.caseManager(
      chromePage => {
        return this.getChromeItems(chromePage, selector, xpath)
          .pipe(
            flatMap(items => {
              if (!items.length) {
                return of(null);
              }
              return combineLatest(items.map(item => from(item.click(options))));
            }),
          );
      },
    );
  }

  setHeaders (headers : Record<string, string>) {
    return this.caseManager(
      chromePage => from(chromePage.setExtraHTTPHeaders(headers)),
    );
  }

  hover ({ selector, xpath } : DomOptions) {
    return this.caseManager(
      chromePage => {
        return this.getChromeItems(chromePage, selector, xpath)
          .pipe(
            flatMap(elements => {
              if (!elements.length) {
                return of(null);
              }
              return combineLatest(elements.map(element => from(element.hover())));
            }),
          );
      },
    );
  }

  focus ({ selector, xpath } : DomOptions) {
    return this.caseManager(
      chromePage => {
        return this.getChromeItems(chromePage, selector, xpath)
          .pipe(
            flatMap(elements => {
              if (!elements.length) {
                return of(null);
              }
              return combineLatest(elements.map(element => from(element.focus())));
            }),
          );
      },
    );
  }

  type ({ xpath, selector, options, text } : DomOptions & TypeOptions) {
    return this.caseManager(
      chromePage => {
        return this.getChromeItems(chromePage, selector, xpath)
          .pipe(
            flatMap(elements => {
              if (!elements.length) {
                return of(null);
              }
              return combineLatest(elements.map(element => from(element.type(text, options))));
            }),
          );
      },
    );
  }

  awaitPageLoad () {
    return this.caseManager(
      chromePage => from(chromePage.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 120000,
      })),
    );
  }

  setScrollTop ({ selector, xpath, top } : DomOptions & ScrollTopOptions) : Observable<boolean> {
    const xpathCmd = `
      const itemsXpath = document
            .evaluate(
                ${ JSON.stringify(selector) },
                document,
                null,
                XPathResult.ANY_TYPE,
                null
            )
            .singleNodeValue;
      let item;
      const items = [];
      
      while (item = itemsXpath.iterateNext()) {
        items.push(item);
      }
      `;

    const querySelectorCmd = `const items = Array.from(document.querySelectorAll(${ JSON.stringify(selector) }));`;

    const evaluateCommand = `(() => {
      const top = ${ JSON.stringify(top) };
      ${ xpath ? xpathCmd : querySelectorCmd }
      
      if (!items.length) {
        return false;
      }
      
      items.forEach(item => item.scrollTop = top);
      return true;
    })()`;

    return this.caseManager(
      chromePage => from(chromePage.evaluate(evaluateCommand)),
    );
  }

  scrollTo ({ selector, xpath } : DomOptions) : Observable<IScrollToResult> {

    const xpathQuery = `document
            .evaluate(
                ${ JSON.stringify(selector) },
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            )
            .singleNodeValue;`;

    const querySelectorQuery = `document.querySelector(${ JSON.stringify(selector) });`;

    const command = `(() => {
      const item = ${ xpath ? xpathQuery : querySelectorQuery }
      const parent = item.parentElement;
      
      return new Promise(res => {
        if (!item) {
          res({ error: 'No item found', scrolled: false });
          return;
        }
        
        const bounds = item.getBoundingClientRect();
        item.scrollIntoView({ block: 'start', behavior: 'smooth' });
        setTimeout(() => {
          if (bounds.top !== item.getBoundingClientRect().top) {
            try {
              res({ scrolled: true, scrollTop: parent.scrollTop });
            }
            catch (e) {
              res({ scrolled: true, error: e + "", t });
            }
          }
          else {
            res({ scrolled: false, error: 'Already at bottom' });
          }
        }, 500);
      });
    })()`;

    return this.caseManager(
      chromePage => from(chromePage.evaluate(command)),
    );
  }

  captureScreenshot (options? : ScreenshotOptions) : Observable<Buffer> {
    return this.caseManager(
      chromePage => from(chromePage.screenshot(options)),
    );
  }

  back () : Observable<void> {
    return this.caseManager(
      chromePage => from(chromePage.goBack()),
    );
  }

  refresh (options? : NavigationOptions) : Observable<void> {
    return this.caseManager(
      chromePage => from(chromePage.reload(options)),
    );
  }

  getCookies () : Observable<Cookie[]> {
    return this.caseManager(
      chromePage => from(chromePage.cookies()),
    );
  }

  getUrl () : Observable<string> {
    return this.caseManager(
      chromePage => of(chromePage.url()),
    );
  }

  setViewport (width : number, height : number) : Observable<void> {
    return this.caseManager(chromePage => {
      return from(chromePage.setViewport({ width, height }));
    });
  }

  protected handleDestruct () {
    return this.caseManager(
      chromePage => from(chromePage.close()),
      phantomPage => from(phantomPage.close()),
    );
  }

  equals (test : any) {
    return this.pageSubject.pipe(
      map(({ chromePage, phantomPage }) => chromePage === test || phantomPage === test || test === this),
    );
  }

  setContent (html : string) : Observable<void> {
    return this.caseManager(
      chromePage => from(chromePage.setContent(html)),
    );
  }

  bringToFront () {
    return this.caseManager(
      chromePage => from(chromePage.bringToFront()),
    );
  }

  protected handleConstruction () {
    return this.browser.browser$.pipe(
      flatMap(({ chromeBrowser, phantomBrowser }) => {
        if (chromeBrowser) {
          return this.createNewChromiumPage(chromeBrowser);
        }
        else if (phantomBrowser) {
          throw new Error('PhantomJS Page not implemented');
        }
        else {
          throw new Error('Not sure how we got here...');
        }
      }),
    );
  }

  private createNewChromiumPage (browser : Chrome) {
    return from(browser.newPage())
      .pipe(
        tap(page => {
          this.pageSubject.next({ chromePage: page });
          this.pageSubject.complete();
        }),
        mapTo(undefined),
      );
  }

  private caseManager (
    chromeMethod : (page : ChromePage) => Observable<any>,
    phantomMethod? : (page : PhantomPage) => Observable<any>,
  ) : Observable<any> {
    return this.pageSubject.pipe(
      flatMap(({ chromePage, phantomPage }) => {
        if (chromePage) {
          return chromeMethod(chromePage);
        }
        else if (phantomPage) {
          if (!phantomMethod) {
            throw new Error('PhantomJS Pages have not been implemented yet.');
          }
          else {
            return phantomMethod(phantomPage);
          }
        }
        else {
          throw new Error('Unexpected error trying to handle a case');
        }
      }),
    );
  }

  private getChromeItems (chromePage : ChromePage, selector : string, xpath? : boolean) : Observable<ElementHandle[]> {
    return xpath ? from(chromePage.$x(selector)) : from(chromePage.$$(selector));
  }

  private registerEvent (event : any, fn : EventCallback) {
    return this.caseManager(
      chromePage => {
        chromePage.on(event, fn);
        return of(null);
      },
    );
  }

  private deregisterEvent (event : any, fn : EventCallback) {
    return this.caseManager(
      chromePage => {
        chromePage.off(event, fn);
        return of(null);
      },
    );
  }
}
