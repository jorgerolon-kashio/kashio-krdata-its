import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { KrdataApiService } from '../../services/krdata-api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="dashboard-content">
      <div class="kpi-grid">
        <app-kpi-card title="Geography entities" [value]="format(geographyCount())" icon="globe-2" bgColor="rgba(0, 82, 255, 0.1)" iconColor="#0052FF"></app-kpi-card>
        <app-kpi-card title="Financial entities" [value]="format(financialCount())" icon="wallet" bgColor="rgba(67, 24, 255, 0.1)" iconColor="#4318FF"></app-kpi-card>
        <app-kpi-card title="Business entities" [value]="format(businessCount())" icon="briefcase" bgColor="rgba(5, 205, 153, 0.1)" iconColor="#05CD99"></app-kpi-card>
        <app-kpi-card title="Process entities" [value]="format(processCount())" icon="workflow" bgColor="rgba(255, 181, 71, 0.1)" iconColor="#FFB547"></app-kpi-card>
      </div>

      <div class="summary-card">
        <h3>KRDATA Portal</h3>
        <p *ngIf="!loading()">
          Total catalog rows available: <strong>{{ format(totalCount()) }}</strong>.
        </p>
        <p *ngIf="loading()">Loading KRDATA catalog metrics...</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-content { display: flex; flex-direction: column; gap: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .summary-card { background: white; border-radius: 20px; padding: 24px; box-shadow: var(--shadow-soft); }
    .summary-card h3 { margin: 0 0 8px; color: var(--text-primary); }
    .summary-card p { margin: 0; color: var(--text-secondary); }
  `]
})
export class DashboardComponent implements OnInit {
  private krdataApi = inject(KrdataApiService);
  loading = signal(true);
  geographyCount = signal(0);
  financialCount = signal(0);
  businessCount = signal(0);
  processCount = signal(0);
  totalCount = signal(0);

  ngOnInit(): void {
    forkJoin({
      countries: this.krdataApi.getCatalogTotal('geography/countries'),
      territories: this.krdataApi.getCatalogTotal('geography/territories'),
      plazas: this.krdataApi.getCatalogTotal('geography/plazas'),
      timezones: this.krdataApi.getCatalogTotal('geography/timezones'),
      currencies: this.krdataApi.getCatalogTotal('financial/currencies'),
      banks: this.krdataApi.getCatalogTotal('financial/financial-institutions'),
      paymentMethods: this.krdataApi.getCatalogTotal('financial/payment-method-types'),
      languages: this.krdataApi.getCatalogTotal('business/languages'),
      industries: this.krdataApi.getCatalogTotal('business/industries'),
      docTypes: this.krdataApi.getCatalogTotal('business/identity-document-types'),
      processTypes: this.krdataApi.getCatalogTotal('process/process-types'),
      processStatuses: this.krdataApi.getCatalogTotal('process/process-statuses'),
    }).subscribe((totals) => {
      const geography = totals.countries + totals.territories + totals.plazas + totals.timezones;
      const financial = totals.currencies + totals.banks + totals.paymentMethods;
      const business = totals.languages + totals.industries + totals.docTypes;
      const process = totals.processTypes + totals.processStatuses;
      this.geographyCount.set(geography);
      this.financialCount.set(financial);
      this.businessCount.set(business);
      this.processCount.set(process);
      this.totalCount.set(geography + financial + business + process);
      this.loading.set(false);
    });
  }

  format(value: number): string {
    return new Intl.NumberFormat().format(value);
  }
}
