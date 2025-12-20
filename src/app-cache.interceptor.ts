import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AppCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext) {
    const hostType = context.getType();
    if (hostType === 'http') {
      const request = context.switchToHttp().getRequest();
      const { method, url, user } = request;
      const excludePaths: string[] = []; // Define your exclusion paths
      if (excludePaths.some((path) => url.startsWith(path))) {
        return undefined; // Do not cache
      }
      if (method === 'GET' && /\/me(?:\/|$)/.test(url) && user) {
        return url.concat(`(me=${user.id})`);
      }
    }
    return super.trackBy(context);
  }
}
