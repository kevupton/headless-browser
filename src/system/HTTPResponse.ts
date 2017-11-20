
import { Response } from 'express';
import { Exception } from '../exceptions/Exception';

export class HTTPResponse {
  responseObj = {
    status_code: 200
  };

  constructor (
    private response : Response
  ) {}

  send (data) {
    this._send({data});
  }

  error (error : any) {
    const obj: any = {
      status_code: 500,
      error_message: `Uncaught '${error.name}': ${error.message}`
    };
    if (error instanceof Exception) {
      obj.status_code = error.code;
    }
    if (process.env.APP_ENV !== 'production') {
      obj.stack_trace = error.stack;
    }
    this._send(obj);
  }

  private _makeResponse (obj) {
    return Object.assign({}, this.responseObj, obj);
  }

  private _send (obj, code = 200) {
    this.response.status(code);
    this.response.header({'Content-type': 'application/json'});
    this.response.send(JSON.stringify(this._makeResponse(obj)));
  }
}