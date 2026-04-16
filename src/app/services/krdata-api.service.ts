import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

type QueryValue = string | number | boolean;

@Injectable({
  providedIn: 'root'
})
export class KrdataApiService {
  private readonly API_BASE_PLACEHOLDER = 'IT-KRDATA-API_BASE_URL_PLACEHOLDER';

  get API_BASE_URL(): string {
    const value = this.API_BASE_PLACEHOLDER.includes('PLACEHOLDER')
      ? 'https://krdata-ms-215989210525.europe-west1.run.app'
      : this.API_BASE_PLACEHOLDER;
    return `${value.replace(/\/$/, '')}/api/v1`;
  }

  constructor(private http: HttpClient) { }

  getCatalog(path: string, query: Record<string, QueryValue> = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, val]) => {
      params = params.set(key, String(val));
    });

    return this.http.get<any>(`${this.API_BASE_URL}/${path}`, { params });
  }

  getCatalogTotal(path: string): Observable<number> {
    return this.getCatalog(path, { page: 1, limit: 1 }).pipe(
      map((res) => this.extractTotal(res)),
      catchError(() => of(0))
    );
  }

  extractRows(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    return [];
  }

  extractTotal(response: any): number {
    if (typeof response?.meta?.total === 'number') return response.meta.total;
    if (typeof response?.pagination?.total === 'number') return response.pagination.total;
    if (typeof response?.total === 'number') return response.total;
    return this.extractRows(response).length;
  }
}
