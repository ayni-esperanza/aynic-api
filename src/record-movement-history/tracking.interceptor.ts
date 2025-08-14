import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor para extraer información de tracking de las requests
 * Agrega IP y User-Agent al contexto de la request
 */
@Injectable()
export class TrackingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extraer IP address
    const ipAddress = this.getClientIp(request);
    
    // Extraer User-Agent
    const userAgent = request.headers['user-agent'] || null;

    // Agregar al contexto de la request para que esté disponible en los controladores
    request.trackingContext = {
      ipAddress,
      userAgent,
    };

    return next.handle();
  }

  private getClientIp(request: any): string | null {
    // Revisar varios headers para obtener la IP real
    const possibleHeaders = [
      'cf-connecting-ip', // Cloudflare
      'x-real-ip', // Nginx
      'x-forwarded-for', // Proxies
      'x-client-ip',
      'x-forwarded',
      'x-cluster-client-ip',
      'forwarded-for',
      'forwarded',
    ];

    for (const header of possibleHeaders) {
      const headerValue = request.headers[header];
      if (headerValue) {
        // x-forwarded-for puede contener múltiples IPs separadas por comas
        const ip = headerValue.split(',')[0].trim();
        if (this.isValidIp(ip)) {
          return ip;
        }
      }
    }

    // Fallback a la IP de la conexión
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           request.ip || 
           null;
  }

  private isValidIp(ip: string): boolean {
    // Verificar que no sea una IP privada o localhost para casos de proxy
    const privateRanges = [
      /^127\./, // localhost
      /^10\./, // 10.x.x.x
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.x.x - 172.31.x.x
      /^192\.168\./, // 192.168.x.x
      /^::1$/, // IPv6 localhost
      /^fc00:/, // IPv6 private
    ];

    return !privateRanges.some(range => range.test(ip)) && ip !== '::1';
  }
}

// Extender el tipo Request para incluir trackingContext
declare global {
  namespace Express {
    interface Request {
      trackingContext?: {
        ipAddress?: string | null;
        userAgent?: string | null;
      };
    }
  }
}