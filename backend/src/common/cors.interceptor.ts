import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class CorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Set CORS headers on response
    const origin = request.headers.origin;
    if (origin && origin.startsWith('chrome-extension://')) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      response.setHeader('Access-Control-Allow-Origin', '*');
    }
    response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With, Origin');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id, Content-Type');

    return next.handle().pipe(
      tap(() => {
        // Ensure headers are set after response is sent
        if (origin && origin.startsWith('chrome-extension://')) {
          response.setHeader('Access-Control-Allow-Origin', origin);
        } else {
          response.setHeader('Access-Control-Allow-Origin', '*');
        }
      })
    );
  }
}

