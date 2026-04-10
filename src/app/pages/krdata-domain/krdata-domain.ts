import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { KrdataApiService } from '../../services/krdata-api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-krdata-domain',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <h3>{{ title() }}</h3>
      <p class="sub">{{ subtitle() }}</p>
      <div *ngIf="loading()">Loading domain data...</div>
      <table *ngIf="!loading()" class="table">
        <thead>
          <tr>
            <th>Catalog</th>
            <th>Total Rows</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows()">
            <td>{{ row.name }}</td>
            <td>{{ row.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: var(--shadow-soft); }
    h3 { margin: 0; color: var(--text-primary); }
    .sub { margin: 8px 0 18px; color: var(--text-secondary); }
    .table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 6px; border-bottom: 1px solid #E2E8F0; }
    th { color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
  `]
})
export class KrdataDomainComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(KrdataApiService);

  title = signal('KRDATA domain');
  subtitle = signal('Catalog summary by endpoint');
  rows = signal<Array<{ name: string; total: number }>>([]);
  loading = signal(true);

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    const domainTitle = data['domainTitle'] as string;
    const endpoints = (data['endpoints'] as Array<{ name: string; path: string }>) ?? [];

    this.title.set(domainTitle ?? 'KRDATA domain');

    if (endpoints.length === 0) {
      this.rows.set([]);
      this.loading.set(false);
      return;
    }

    forkJoin(
      endpoints.map((endpoint) =>
        this.api.getCatalogTotal(endpoint.path)
      )
    ).subscribe((totals) => {
      this.rows.set(endpoints.map((endpoint, idx) => ({ name: endpoint.name, total: totals[idx] ?? 0 })));
      this.loading.set(false);
    });
  }
}
