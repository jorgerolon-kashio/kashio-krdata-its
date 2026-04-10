import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { MainChartComponent } from '../../components/main-chart/main-chart';
import { ArgoMonitoringService } from '../../services/argo-monitoring.service';
import { ApmService } from '../../services/apm.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    KpiCardComponent,
    MainChartComponent
  ],
  template: `
    <div class="dashboard-content">
      <div class="kpi-grid">
        <app-kpi-card 
          title="Global Health" [value]="globalHealth()" icon="check-circle-2"
          [bgColor]="globalHealth() === 'Healthy' ? 'rgba(5, 205, 153, 0.1)' : 'rgba(238, 93, 80, 0.1)'" 
          [iconColor]="globalHealth() === 'Healthy' ? '#05CD99' : '#EE5D50'">
        </app-kpi-card>
        
        <app-kpi-card 
          title="ArgoCD Sync" [value]="globalSync()" icon="refresh-cw"
          [bgColor]="globalSync() === 'Synced' ? 'rgba(0, 82, 255, 0.1)' : 'rgba(255, 181, 71, 0.1)'" 
          [iconColor]="globalSync() === 'Synced' ? '#0052FF' : '#FFB547'">
        </app-kpi-card>
        
        <app-kpi-card 
          title="Avg Performance" [value]="currentAvgLatency()" icon="gauge"
          bgColor="rgba(67, 24, 255, 0.1)" iconColor="#4318FF">
        </app-kpi-card>

        <app-kpi-card 
          title="Service Availability" [value]="serviceAvailability()" icon="activity"
          bgColor="rgba(255, 181, 71, 0.1)" iconColor="#FFB547">
        </app-kpi-card>
      </div>

      <div class="dashboard-main-grid">
        <div class="left-col">
          <app-main-chart></app-main-chart>
        </div>
        
        <div class="right-col">
          <div class="card service-status-card">
            <h3>Pods Fallidos</h3>
            <div class="shortcut-list">
              <div *ngFor="let pod of failedPods()" class="shortcut-item" [ngClass]="pod.hasIssues ? 'danger' : 'warning'">
                <lucide-icon [name]="pod.hasIssues ? 'x-circle' : 'alert-triangle'" [size]="18"></lucide-icon>
                <span>{{ pod.name }}</span>
              </div>
              <div *ngIf="failedPods().length === 0" class="no-failures">
                <lucide-icon name="check-circle" [size]="18"></lucide-icon>
                <span>No failed pods detected</span>
              </div>
              <a routerLink="/argocd" class="view-all-link">Revisar en ArgoCD →</a>
            </div>
          </div>

          <div class="card recent-tests">
            <h3>Endpoint Health</h3>
            <div class="test-list">
              <div *ngFor="let api of criticalApis()" class="test-item" [ngClass]="api.status">
                <span class="dot"></span>
                <span class="name">{{ api.name }}</span>
                <span class="time">{{ api.timeLabel }}</span>
              </div>
              
              <div *ngIf="criticalApis().length === 0" class="no-failures">
                 <lucide-icon name="refresh-cw" [size]="14" class="spin"></lucide-icon>
                 <span>Validando endpoints...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-content { 
      display: flex; 
      flex-direction: column; 
      gap: 24px; 
    }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }

    .dashboard-main-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
    
    .left-col { display: flex; flex-direction: column; gap: 24px; }
    .right-col { display: flex; flex-direction: column; gap: 24px; }
    
    .card { background: white; border-radius: 20px; padding: 24px; box-shadow: var(--shadow-soft); }
    .card h3 { font-size: 16px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
    
    .shortcut-list { display: flex; flex-direction: column; gap: 12px; }
    .shortcut-item { 
      display: flex; align-items: center; gap: 12px; padding: 12px; 
      border-radius: 12px; background: #F8FAFC; color: var(--text-primary);
      text-decoration: none; font-weight: 500; font-size: 14px;
      transition: all 0.2s ease;
    }
    .shortcut-item:hover { background: #EDF2F7; transform: translateX(5px); }
    .shortcut-item lucide-icon { color: var(--primary); }
    
    .shortcut-item.warning lucide-icon { color: #FFB547; }
    .shortcut-item.danger lucide-icon { color: #EE5D50; }
    
    .view-all-link { 
      margin-top: 8px; font-size: 13px; font-weight: 600; color: var(--primary); 
      text-decoration: none; padding-left: 12px; transition: opacity 0.2s;
    }
    .view-all-link:hover { opacity: 0.8; }

    .no-failures {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      color: #05CD99; font-size: 14px; font-weight: 500;
    }

    .test-list { display: flex; flex-direction: column; gap: 16px; }
    .test-item { display: flex; align-items: center; gap: 12px; font-size: 13px; }
    .test-item .dot { width: 8px; height: 8px; border-radius: 50%; }
    .test-item .name { flex: 1; font-weight: 600; color: #4A5568; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .test-item .time { color: #A0AEC0; font-size: 12px; flex-shrink: 0; }
    .test-item.success .dot { background: #05CD99; box-shadow: 0 0 8px rgba(5, 205, 153, 0.4); }
    .test-item.error .dot { background: #EE5D50; box-shadow: 0 0 8px rgba(238, 93, 80, 0.4); }
    .test-item.warning .dot { background: #FFB547; box-shadow: 0 0 8px rgba(255, 181, 71, 0.4); }

    .spin { animation: spin 2s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class DashboardComponent implements OnInit {
  private monitoringService = inject(ArgoMonitoringService);
  private apmService = inject(ApmService);
  private readonly ARGO_FILTER = 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER'.includes('PLACEHOLDER') ? '' : 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER';

  apps = computed(() => this.monitoringService.apps());
  criticalApis = computed(() => this.apmService.criticalApis());
  serviceAvailability = this.apmService.serviceAvailability;

  currentAvgLatency = computed(() => {
    const data = this.apmService.envLatencyData()['Global'];
    if (data && data.avg.length > 0) {
      return `${data.avg[data.avg.length - 1]}ms`;
    }
    return '0ms';
  });

  filteredPods = computed(() => {
    const filters = this.ARGO_FILTER.toLowerCase().split(',').map((f: string) => f.trim()).filter(f => !!f);
    const allPods: any[] = [];

    this.apps().forEach((app: any) => {
      app.pods.forEach((pod: any) => {
        const matches = filters.length === 0 || filters.some((f: string) =>
          pod.name.toLowerCase().includes(f) ||
          pod.deploymentName.toLowerCase().includes(f)
        );
        if (matches) {
          allPods.push(pod);
        }
      });
    });
    return allPods;
  });

  failedPods = computed(() => this.filteredPods().filter(p => p.hasIssues));

  globalHealth = computed(() => {
    const pods = this.filteredPods();
    if (pods.length === 0) return 'Healthy';
    return pods.every(p => !p.hasIssues) ? 'Healthy' : 'Degraded';
  });

  globalSync = computed(() => {
    const filters = this.ARGO_FILTER.toLowerCase().split(',').map((f: string) => f.trim()).filter(f => !!f);
    const outOfSync = this.apps().some((app: any) => {
      if (filters.length === 0) return app.sync === 'OutOfSync';

      return filters.some((f: string) =>
        app.outOfSyncResources?.some((res: any) =>
          res.name.toLowerCase().includes(f)
        )
      );
    });
    return outOfSync ? 'OutOfSync' : 'Synced';
  });

  ngOnInit() {
    console.log('🟣 Dashboard Component initialized');
  }
}
