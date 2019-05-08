import { of } from 'rxjs/internal/observable/of';
import { RxjsBasicEventManager } from '../src/lib/RxjsBasicEventManager';

const eventManger = new RxjsBasicEventManager(
  (event, cb) => {
    console.log('on', event, cb);
    return of(null);
  },
  (event, cb) => {
    console.log('off', event, cb);
    return of(null);
  },
);


const test$ = eventManger.getEvent$('test');

const subscription = test$.subscribe((args : any[]) => console.log(args));
subscription.unsubscribe();
