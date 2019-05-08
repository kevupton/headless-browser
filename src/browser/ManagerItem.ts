import { AsyncSubject, Observable, Subscription } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { mapTo, shareReplay, tap } from 'rxjs/operators';

export enum SetupStage {
  Inactive,
  Constructed,
  Destructed
}

export abstract class ManagerItem {

  private setupStage                  = SetupStage.Inactive;
  private readonly destroyedSubject   = new AsyncSubject<void>();
  private readonly constructedSubject = new AsyncSubject<void>();
  private readonly subscriptions      = new Subscription();

  get destroyed$ () {
    return this.destroyedSubject.asObservable();
  }

  get constructed$ () {
    return this.constructedSubject.asObservable();
  }

  setup () : Observable<this> {
    if (this.setupStage !== SetupStage.Inactive) {
      throw new Error('Object is not in a correct state in order setup');
    }

    return (this.handleConstruction() || of(null))
      .pipe(
        tap(() => {
          this.constructedSubject.next();
          this.constructedSubject.complete();
          this.setupStage = SetupStage.Constructed;
        }),
        mapTo(this),
        shareReplay(1),
      );
  }

  protected abstract handleConstruction () : Observable<any> | void;

  destroy () : Observable<void> {
    if (this.setupStage === SetupStage.Destructed) {
      throw new Error('Object has already been destructed');
    }
    if (this.setupStage !== SetupStage.Constructed) {
      throw new Error('Object has not be constructed. Therefore it cannot be destructed.');
    }

    this.setupStage = SetupStage.Destructed;
    this.subscriptions.unsubscribe();

    return (this.handleDestruct() || of(null))
      .pipe(
        tap(() => {
          this.destroyedSubject.next();
          this.destroyedSubject.complete();
        }),
        mapTo(undefined),
        shareReplay(1),
      );
  }

  protected setConstructed() {
    this.setupStage = SetupStage.Constructed;
  }

  protected abstract handleDestruct () : Observable<any> | void;

  protected unsubscribeOnDestroy (subscription : Subscription) {
    this.subscriptions.add(subscription);
  }
}
