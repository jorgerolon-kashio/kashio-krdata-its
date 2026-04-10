import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainChartComponent } from '../../components/main-chart/main-chart';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { ApmService } from '../../services/apm.service';

@Component({
  selector: 'app-apm',
  standalone: true,
  imports: [CommonModule, MainChartComponent, KpiCardComponent],
  template: `
    <div class="page-content">
      <div class="kpi-grid">
        <app-kpi-card title="Avg Latency" [value]="currentAvgLatency()" icon="gauge" bgColor="rgba(0, 82, 255, 0.1)" iconColor="#0052FF"></app-kpi-card>
        <app-kpi-card title="Error Rate" [value]="errorRate()" icon="alert-triangle" bgColor="rgba(238, 93, 80, 0.1)" iconColor="#EE5D50"></app-kpi-card>
        <app-kpi-card title="Requests/sec" [value]="requestsPerSec()" icon="activity" bgColor="rgba(5, 205, 153, 0.1)" iconColor="#05CD99"></app-kpi-card>
        <app-kpi-card title="CPU Load" [value]="cpuLoad()" icon="cpu" bgColor="rgba(67, 24, 255, 0.1)" iconColor="#4318FF"></app-kpi-card>
      </div>

      <app-main-chart></app-main-chart>
    </div>
  `,
  styles: [`
    .page-content { display: flex; flex-direction: column; gap: 24px; }
    
    .page-header { margin-bottom: 8px; }
    .header-text h2 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .header-text p { color: var(--text-secondary); font-size: 14px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  `]
})
export class ApmComponent implements OnInit {
  private apmService = inject(ApmService);

  currentAvgLatency = computed(() => {
    const data = this.apmService.envLatencyData()['Global'];
    if (data && data.avg.length > 0) {
      return `${data.avg[data.avg.length - 1]}ms`;
    }
    return '0ms';
  });

  errorRate = this.apmService.errorRate;
  requestsPerSec = this.apmService.requestsPerSec;
  cpuLoad = this.apmService.cpuLoad;

  ngOnInit() {
    console.log('🟡 APM Component initialized');
  }
}

