import { BehaviorSubject, combineLatest, Observable, of, UnaryFunction } from 'rxjs';
import { pipe } from 'rxjs/internal/util/pipe';
import { distinctUntilChanged, filter, first, flatMap, map, mapTo, shareReplay, tap } from 'rxjs/operators';
import { ManagerItem } from './ManagerItem';

export interface NewInstanceConfig<T> {
  instance : T;
  afterSetup? : UnaryFunction<any, any>;
}

export abstract class Manager<T extends ManagerItem> {

  protected readonly instancesSubject   = new BehaviorSubject<T[]>([]);
  protected readonly activeIndexSubject = new BehaviorSubject(0);

  public readonly activeInstance$ = combineLatest([
    this.instancesSubject,
    this.activeIndexSubject,
  ]).pipe(
    map(([pages, index]) => pages[index]),
    distinctUntilChanged(),
    flatMap(instance => {
      if (!instance) {
        return this.openNewInstance();
      }
      return of(instance);
    }),
    filter(browser => !!browser),
    shareReplay(1),
    first(),
  );

  get instances () {
    return this.instancesSubject.value.concat();
  }

  constructor () {
    this.keepActiveIndexInsideBounds();
  }

  protected abstract generateNewInstanceConfig () : NewInstanceConfig<T>;

  getInstance (index? : number) {
    index          = index || this.activeIndexSubject.value;
    const instance = this.instancesSubject.value[index];

    if (!instance) {
      throw new Error('Invalid tab index provided. Or invalid active index.');
    }

    return instance;
  }

  setActiveInstance (index : number) {
    const instance = this.getInstance(index);
    this.activeIndexSubject.next(index);
    return of(instance);
  }

  reset () {
    return combineLatest(
      this.instancesSubject.value.map(instance => instance.destroy()),
    ).pipe(
      tap(() => this.activeIndexSubject.next(0)),
      mapTo(undefined),
    );
  }

  openNewInstance () {
    return new Observable<T>(subscriber => {
      const { instance, afterSetup } = this.generateNewInstanceConfig();

      subscriber.add(instance
        .setup()
        .pipe(afterSetup || pipe())
        .subscribe({
          complete: () => {
            this.addInstanceToList(instance);

            subscriber.next(instance);
            subscriber.complete();
          },
        }));
    });
  }

  protected addInstanceToList (...instances : T[]) {
    instances.forEach(instance =>
      instance.destroyed$.subscribe(() => {
        this.instancesSubject.next(
          this.instancesSubject.value.filter(i => i !== instance),
        );
      }));

    this.instancesSubject.next([
      ...this.instancesSubject.value,
      ...instances,
    ]);
  }

  private keepActiveIndexInsideBounds () {
    this.instancesSubject.subscribe(instances => {
      const activeIndex = this.activeIndexSubject.value;
      if (activeIndex < 0) {
        this.activeIndexSubject.next(0);
      }
      else if (activeIndex > instances.length - 1) {
        this.activeIndexSubject.next(instances.length - 1);
      }
    });
  }
}
