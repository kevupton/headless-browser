import { Express, Request, Response } from 'express';
import { Observable } from 'rxjs';
import { first } from 'rxjs/internal/operators/first';
import { BrowserManager } from '../browser/BrowserManager';
import { environment } from '../lib/Environment';
import { Controller } from './Controller';
import { HTTPRequest } from './HTTPRequest';
import { HTTPResponse } from './HTTPResponse';
import { ExceptionHandler } from './exceptions/ExceptionHandler';
import { Exception } from './exceptions/Exception';

export class Router {
  constructor (
    private readonly express : Express,
    private readonly browserManager : BrowserManager,
  ) {}

  /**
   * Get request
   *
   * @param path
   * @param controller
   * @param method
   */
  get (path : string, controller : typeof Controller, method?: string) {
    this.call('get', path, controller, method);
  }

  /**
   * Post request
   *
   * @param path
   * @param controller
   * @param method
   */
  post (path : string, controller : typeof Controller, method?: string) {
    this.call('post', path, controller, method);
  }

  private call (route : 'post' | 'get', path : string, controller : typeof Controller, method?: string) {
    path = path.replace(/^\s*\/|\/\s*$/, '');
    if (!method) {
      method = path.split('/')[0];
    }

    this.express[route](`/${path}`, async (req : Request, res : Response) => {
      const request  = new HTTPRequest(req);
      const response = new HTTPResponse(res);

      if (environment.debug) {
        console.log(`[LOG] Received request for ${path}.`);
      }

      try {
        const ctrl = new controller(request, response, this.browserManager);
        let error  = null;

        if (!method) {
          throw new Error('No method found in route');
        }

        if (typeof ctrl[method] === 'function') {
          try {
            const send = (d : any) => response.send(d || null);
            const data = await ctrl[method](Object.assign(req.query, req.params, request.body));
            if (data instanceof Observable) {
              data.pipe(first()).subscribe(send)
            }
            else {
              send(data);
            }
          }
          catch (e) {
            error = e;
          }
        }
        else {
          throw new Exception(`'${method}' does not exist on Controller`);
        }

        ctrl.destructor();
        if (error) throw error;
      }
      catch (e) {
        new ExceptionHandler(e, request, response);
      }
    });
  }
}
