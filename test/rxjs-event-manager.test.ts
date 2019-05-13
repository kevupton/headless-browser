import { of } from 'rxjs/internal/observable/of';
import { RxjsBasicEventManager } from '../src/lib/RxjsBasicEventManager';


let callback : any;

const eventManger = new RxjsBasicEventManager(
  (event, cb) => {
    console.log('on', event, cb);
    callback = cb;
    return of(null);
  },
  (event, cb) => {
    console.log('off', event, cb);
    console.log(cb === callback);
    return of(null);
  },
);


const test$ = eventManger.getEvent$('test');

const subscription = test$.subscribe((args : any[]) => console.log(args));

callback(1, 2, 3);

subscription.unsubscribe();
