import { PhantomController } from '../http/PhantomController';
import { Router } from '../system/Router';
import { DomController } from '../http/DomController';

export function www (router : Router) {
  router.get('active', PhantomController);
  router.get('active_url', PhantomController);
  router.get('cookies', PhantomController);
  router.get('download', PhantomController);
  router.get('display', PhantomController);
  router.get('back', PhantomController);
  router.get('get/:url', PhantomController, 'get');
  router.post('headers', PhantomController);

  // Dom manipulation
  router.post('click', DomController);
  router.post('fill', DomController);
  router.post('type', DomController);
  router.post('hover', DomController);
}
