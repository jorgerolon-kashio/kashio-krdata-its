import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as yaml from 'js-yaml';

interface ApiEndpoint {
  path: string;
  method: string;
  summary?: string;
  tags?: string[];
}

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h3>KRDATA API Playground</h3>
      <p class="sub">Base URL: {{ baseUrl() }}</p>

      <div class="row">
        <label>Filter endpoints</label>
        <input [(ngModel)]="search" placeholder="countries, currencies, process..." />
      </div>

      <div class="row">
        <label>Endpoint</label>
        <select [(ngModel)]="selectedKey">
          <option *ngFor="let e of filteredEndpoints()" [value]="e.method + ' ' + e.path">
            {{ e.method }} {{ e.path }}
          </option>
        </select>
      </div>

      <div class="row">
        <label>Query params (JSON)</label>
        <textarea [(ngModel)]="queryJson" rows="4"></textarea>
      </div>

      <button (click)="run()" [disabled]="running() || !selectedKey">Run request</button>

      <div class="result" *ngIf="response()">
        <h4>Response</h4>
        <pre>{{ response() | json }}</pre>
      </div>

      <div class="result error" *ngIf="error()">
        <h4>Error</h4>
        <pre>{{ error() | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: var(--shadow-soft); }
    .sub { color: var(--text-secondary); margin: 6px 0 16px; }
    .row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    input, select, textarea { border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; font-size: 13px; }
    button { background: #2563EB; color: #fff; border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .result { margin-top: 16px; }
    .error h4 { color: #B91C1C; }
    pre { background: #0F172A; color: #E2E8F0; border-radius: 8px; padding: 12px; overflow: auto; }
  `]
})
export class ApiTestComponent implements OnInit {
  private http = inject(HttpClient);

  private readonly API_BASE_PLACEHOLDER = 'IT-KRDATA-API_BASE_URL_PLACEHOLDER';
  baseUrl = signal(this.API_BASE_PLACEHOLDER.includes('PLACEHOLDER') ? 'http://localhost:3001/api/v1' : `${this.API_BASE_PLACEHOLDER.replace(/\/$/, '')}/api/v1`);

  endpoints = signal<ApiEndpoint[]>([]);
  search = '';
  selectedKey = '';
  queryJson = '{}';
  running = signal(false);
  response = signal<any>(null);
  error = signal<any>(null);

  filteredEndpoints = computed(() => {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.endpoints();
    return this.endpoints().filter((e) => `${e.method} ${e.path} ${e.summary ?? ''}`.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.http.get('/docs/krdata.yaml', { responseType: 'text' }).subscribe((content) => {
      const doc: any = yaml.load(content);
      const parsed: ApiEndpoint[] = [];
      Object.keys(doc?.paths ?? {}).forEach((path) => {
        const methods = doc.paths[path];
        Object.keys(methods).forEach((method) => {
          parsed.push({
            path,
            method: method.toUpperCase(),
            summary: methods[method]?.summary,
            tags: methods[method]?.tags ?? []
          });
        });
      });
      this.endpoints.set(parsed);
      if (parsed.length > 0) this.selectedKey = `${parsed[0].method} ${parsed[0].path}`;
    });
  }

  run(): void {
    const [method, ...pathParts] = this.selectedKey.split(' ');
    const path = pathParts.join(' ');
    if (!method || !path) return;

    let query: any = {};
    try {
      query = this.queryJson.trim() ? JSON.parse(this.queryJson) : {};
    } catch {
      this.error.set({ message: 'Invalid query JSON' });
      return;
    }

    const url = new URL(`${this.baseUrl()}${path}`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });

    this.running.set(true);
    this.response.set(null);
    this.error.set(null);

    this.http.request(method, url.toString(), { observe: 'response' }).subscribe({
      next: (res) => {
        this.response.set({ status: res.status, statusText: res.statusText, body: res.body });
        this.running.set(false);
      },
      error: (err) => {
        this.error.set({ status: err.status, message: err.message, error: err.error });
        this.running.set(false);
      }
    });
  }
}
