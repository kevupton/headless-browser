import { Observable, Subject } from 'rxjs';
import { finalize, share } from 'rxjs/operators';

export type EventCallback = (...args : any[]) => any;

export class RxjsBasicEventManager {
  private readonly eventToObservable = new Map<string, Observable<any>>();
  private readonly resetSubject      = new Subject<void>();

  constructor (
    private readonly onEventHandler : (event : string, fn : EventCallback) => Observable<any>,
    private readonly offEventHandler : (event : string, fn : EventCallback) => Observable<any>,
  ) {}

  reset () {
    this.resetSubject.next();
    this.eventToObservable.clear();
  }

  getEvent$ (event : string) {
    let obs$ = this.eventToObservable.get(event);
    if (obs$) {
      return obs$;
    }

    obs$ = this.generateEventListener(event);
    this.eventToObservable.set(event, obs$);

    return obs$;
  }

  private generateEventListener (event : string) : Observable<any[]> {
    let fnToRegister : EventCallback;

    return new Observable<any[]>(subscriber => {
      fnToRegister = (...args : any[]) => subscriber.next(args);

      subscriber.add(this.onEventHandler(event, fnToRegister).subscribe());
      subscriber.add(this.resetSubject.subscribe(() => subscriber.complete())); // complete the observable when reset has fired.
    }).pipe(
      finalize(() => this.offEventHandler(event, fnToRegister).subscribe()),
      share(),
    );
  }
}
