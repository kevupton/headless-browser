import { combineLatest, pipe } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { tap } from 'rxjs/internal/operators/tap';
import { flatMap, mapTo } from 'rxjs/operators';
import { Browser } from './Browser';
import { Manager, NewInstanceConfig } from './Manager';
import { IPagePossibilities, Page } from './Page';

export class PageManager extends Manager<Page> {

  constructor (
    private readonly browser : Browser,
  ) {
    super();
  }

  protected generateNewInstanceConfig () : NewInstanceConfig<Page> {
    const page = new Page(this.browser);
    return {
      instance: page,
      afterSetup: pipe(
        flatMap(() => page.setViewport(1800, 1200)),
        flatMap(() => page.bringToFront()),
      ),
    };
  }

  closeTab (tabToRemove : any) {
    const pages = this.instancesSubject.value;

    if (!pages.length) {
      return of(null);
    }

    return combineLatest(
      pages.map(page => page.equals(tabToRemove).pipe(
        flatMap(isEqual => isEqual && page.destroy() || of(null)),
      )),
    );
  }

  setActiveInstance (index : number) {
    return super.setActiveInstance(index)
      .pipe(
        flatMap(page => page.bringToFront().pipe(mapTo(page))),
      );
  }

  registerPages (pagePossibilities : IPagePossibilities[]) {
    const pages = pagePossibilities.map(possibilities => new Page(this.browser, possibilities));

    if (!pages.length) {
      return of(null);
    }

    return combineLatest(
      pages.map(page => page.setViewport(1800, 1200)),
    )
      .pipe(
        tap(() => pages.forEach(page => this.addInstanceToList(page))),
        mapTo(undefined),
      );
  }

  closeTabAtIndex (tabIndex : number) {
    return this.getInstance(tabIndex).destroy();
  }
}
