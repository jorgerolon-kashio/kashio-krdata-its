import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { ArgoMonitoringService, ArgoApplication, Pod } from '../../services/argo-monitoring.service';

@Component({
  selector: 'app-argocd',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, KpiCardComponent],
  template: `
    <div class="monitoring-page">
      <!-- KPI Top Bar -->
      <div class="kpi-grid">
        <app-kpi-card 
          title="Global Health" 
          [value]="globalHealth()" 
          icon="activity" 
          [bgColor]="globalHealth() === 'Healthy' ? 'rgba(5, 205, 153, 0.1)' : 'rgba(238, 93, 80, 0.1)'" 
          [iconColor]="globalHealth() === 'Healthy' ? '#05CD99' : '#EE5D50'">
        </app-kpi-card>
        <app-kpi-card title="Apps Synced" [value]="syncedCount().toString() + ' / ' + totalCount().toString()" icon="refresh-cw" bgColor="rgba(0, 82, 255, 0.1)" iconColor="#0052FF"></app-kpi-card>
        <app-kpi-card title="Total Pods" [value]="totalPods().toString()" icon="layers" bgColor="rgba(67, 24, 255, 0.1)" iconColor="#4318FF"></app-kpi-card>
        <app-kpi-card title="Failing Groups" [value]="failingAppsCount().toString()" icon="alert-triangle" [bgColor]="failingAppsCount() > 0 ? 'rgba(255, 181, 71, 0.1)' : 'rgba(163, 174, 208, 0.1)'" iconColor="#FFB547"></app-kpi-card>
      </div>

      <!-- Monitoring Board (The User's Preferred Layout) -->
      <div class="board-container">
        <div class="board-header">
          <div class="col-status">STATUS</div>
          <div class="col-app">APPLICATION / ENVIRONMENT</div>
          <div class="col-sync">SYNC</div>
          <div class="col-pods">PODS</div>
          <div class="col-actions"></div>
        </div>

        <div class="board-body" *ngIf="!loading(); else loader">
          <div class="empty-state" *ngIf="filteredApps().length === 0">
             <lucide-icon name="search-x" [size]="48"></lucide-icon>
             <p>No applications match your search criteria.</p>
          </div>

          <div class="app-row-wrapper" *ngFor="let app of filteredApps()">
            <!-- Main Row -->
            <div class="app-row" [class.has-issues]="app.hasIssues" (click)="toggleApp(app.name)" [class.expanded]="isExpanded(app.name)">
              <div class="col-status">
                <div class="status-indicator" [ngClass]="app.health.toLowerCase()">
                  <span class="pulse" *ngIf="app.health !== 'Healthy'"></span>
                </div>
              </div>
              <div class="col-app">
                <div class="app-identity">
                  <span class="app-title">{{app.name}}</span>
                </div>
              </div>
              <div class="col-sync">
                <div class="sync-badge" [ngClass]="app.sync.toLowerCase()">
                   <lucide-icon [name]="app.sync === 'Synced' ? 'check' : 'refresh-cw'" [size]="12"></lucide-icon>
                   {{app.sync}}
                </div>
              </div>
              <div class="col-pods">
                <div class="pod-summary">
                  <div class="pod-bars">
                    <div class="pod-bar" *ngFor="let pod of app.pods | slice:0:10" [ngClass]="pod.status?.toLowerCase()" [title]="pod.name"></div>
                    <span class="more-pods" *ngIf="app.pods.length > 10">+{{app.pods.length - 10}}</span>
                  </div>
                  <span class="pod-count text-secondary">{{app.pods.length}} Pods</span>
                </div>
              </div>
              <div class="col-actions">
                <lucide-icon [name]="isExpanded(app.name) ? 'chevron-up' : 'chevron-down'" [size]="18"></lucide-icon>
              </div>
            </div>

            <!-- Integrated Details (Table-like, not card-like) -->
            <div class="app-details-integrated" *ngIf="isExpanded(app.name)">
              <div class="sub-list">
                <div class="sub-item" *ngFor="let group of groupPodsByDeployment(app)">
                  <div class="sub-col-info">
                    <lucide-icon name="box" [size]="14"></lucide-icon>
                    <div class="dep-details-box">
                      <span class="dep-name">{{group.name}}</span>
                      <div class="dep-badges">
                        <span class="dep-status" [ngClass]="getGroupStatus(group.pods).toLowerCase()">{{getGroupStatus(group.pods)}}</span>
                        <span class="dep-sync" [ngClass]="getSyncStatus(app, group.name).toLowerCase()" *ngIf="getSyncStatus(app, group.name)">
                          {{getSyncStatus(app, group.name)}}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="sub-col-pods">
                    <div class="pods-horizontal">
                      <div class="tiny-pod" *ngFor="let pod of group.pods" [title]="pod.name + ': ' + pod.status">
                        <span class="tiny-dot" [ngClass]="pod.status?.toLowerCase()"></span>
                        <span class="tiny-name">{{pod.name}}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ng-template #loader>
          <div class="board-loader">
            <div class="spinner"></div>
            <p>Gathering real-time monitoring data...</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .monitoring-page { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
    
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 8px; }

    .board-container { 
      background: white; border-radius: 20px; overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.04), 0 10px 10px -5px rgba(0, 0, 0, 0.01);
      border: 1px solid rgba(163, 174, 208, 0.08);
    }

    .board-header {
      display: grid; grid-template-columns: 80px 1fr 140px 220px 60px;
      padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid rgba(163, 174, 208, 0.1);
      font-size: 11px; font-weight: 800; color: #94A3B8; letter-spacing: 0.1em;
    }

    .app-row {
      display: grid; grid-template-columns: 80px 1fr 140px 220px 60px;
      padding: 18px 24px; border-bottom: 1px solid rgba(163, 174, 208, 0.05);
      align-items: center; cursor: pointer; transition: all 0.2s;
    }
    .app-row:hover { background: #F8FAFC; border-left: 4px solid var(--color-primary); padding-left: 20px; }
    .app-row.expanded { background: #F1F5F9; border-left: 4px solid var(--color-primary); padding-left: 20px; }
    .app-row.has-issues { background: rgba(238, 93, 80, 0.01); }

    .status-indicator { width: 12px; height: 12px; border-radius: 50%; position: relative; margin: 0 auto; }
    .status-indicator.healthy { background: #05CD99; box-shadow: 0 0 8px rgba(5, 205, 153, 0.4); }
    .status-indicator.degraded { background: #EE5D50; }
    .pulse { position: absolute; width: 100%; height: 100%; border-radius: 50%; background: inherit; opacity: 0.6; animation: statusPulse 2s infinite; }
    @keyframes statusPulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }

    .app-title { display: block; font-size: 15px; font-weight: 700; color: #1E293B; }
    .app-meta { font-size: 12px; color: #94A3B8; }

    .sync-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .sync-badge.synced { background: rgba(5, 205, 153, 0.1); color: #05CD99; }
    .sync-badge.outofsync { background: rgba(255, 181, 71, 0.1); color: #FFB547; }
    
    .pod-summary { display: flex; flex-direction: column; gap: 4px; }
    .pod-bars { display: flex; gap: 3px; align-items: center; }
    .pod-bar { width: 12px; height: 12px; border-radius: 3px; background: #E2E8F0; }
    .pod-bar.healthy { background: #05CD99; }
    .pod-bar.degraded { background: #EE5D50; }
    .pod-count { font-size: 11px; font-weight: 600; }

    .col-actions lucide-icon { color: #CBD5E1; transition: color 0.2s; }
    .app-row.expanded .col-actions lucide-icon { color: var(--color-primary); }

    /* Integrated Detail View */
    .app-details-integrated { background: white; border-bottom: 1px solid rgba(163, 174, 208, 0.1); }
    
    .sub-list { padding: 4px 0; }
    .sub-item { 
      display: grid; grid-template-columns: 240px 1fr; padding: 12px 24px 12px 104px;
      border-bottom: 1px solid rgba(163, 174, 208, 0.03); align-items: center;
    }
    .sub-item:last-child { border-bottom: none; }
    
    .sub-col-info { display: flex; align-items: start; gap: 10px; }
    .sub-col-info lucide-icon { color: #A3AED0; margin-top: 2px; }
    .dep-details-box { display: flex; flex-direction: column; gap: 4px; }
    .dep-name { font-weight: 700; font-size: 13px; color: #1E293B; }
    .dep-badges { display: flex; gap: 6px; align-items: center; }
    .dep-status { font-size: 8px; font-weight: 800; padding: 1px 6px; border-radius: 50px; text-transform: uppercase; }
    .dep-status.healthy { background: rgba(5, 205, 153, 0.1); color: #05CD99; }
    .dep-status.degraded { background: rgba(238, 93, 80, 0.1); color: #EE5D50; }
    
    .dep-sync { font-size: 8px; font-weight: 800; padding: 1px 6px; border-radius: 50px; text-transform: uppercase; }
    .dep-sync.synced { background: rgba(5, 205, 153, 0.1); color: #05CD99; }
    .dep-sync.outofsync { background: rgba(255, 181, 71, 0.1); color: #FFB547; }

    .pods-horizontal { display: flex; flex-wrap: wrap; gap: 8px; }
    .tiny-pod { 
      display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: #F8FAFC; border-radius: 6px; 
      border: 1px solid rgba(163, 174, 208, 0.05);
    }
    .tiny-dot { width: 6px; height: 6px; border-radius: 50%; }
    .tiny-dot.healthy { background: #05CD99; }
    .tiny-dot.degraded { background: #EE5D50; }
    .tiny-name { font-size: 10px; font-family: 'Roboto Mono', monospace; color: #64748B; }

    .board-loader { padding: 60px; text-align: center; color: var(--text-secondary); }
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(67, 24, 255, 0.1); border-top-color: #4318FF; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state { padding: 60px; text-align: center; color: #94A3B8; }
    .empty-state p { margin-top: 16px; font-weight: 600; }

    @media (max-width: 1000px) {
      .col-pods, .col-sync { display: none; }
      .board-header, .app-row { grid-template-columns: 60px 1fr 60px; }
    }
  `]
})
export class ArgocdComponent implements OnInit {
  searchTerm = '';
  currentFilter: 'all' | 'Healthy' | 'Degraded' = 'all';
  expandedApps = new Set<string>();
  private readonly ARGO_FILTER = 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER'.includes('PLACEHOLDER') ? '' : 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER';

  constructor(private monitoringService: ArgoMonitoringService) { }

  ngOnInit() {
    console.log('🔵 ArgoCD Monitoring Board initialized');
  }

  loading = computed(() => this.monitoringService.loading());
  apps = computed(() => this.monitoringService.apps());

  filteredApps = computed(() => {
    const term = this.searchTerm.toLowerCase();

    // 1. Transformar cada app de Argo (entorno) para que solo contenga pods que coincidan con los filtros dinámicos
    const filters = this.ARGO_FILTER.toLowerCase().split(',').map((f: string) => f.trim()).filter(f => !!f);
    let list = this.apps().map(app => {
      const kbatchPods = app.pods.filter(p =>
        filters.length === 0 ||
        filters.some((f: string) =>
          p.name.toLowerCase().includes(f) ||
          p.deploymentName.toLowerCase().includes(f)
        )
      );

      // Obtener nombres únicos de los deployments/recursos relevantes
      const relevantResourceNames = [...new Set(kbatchPods.map(p => p.deploymentName))];

      // Calcular salud: es Healthy solo si todos los pods de kbatch están bien
      const subHealth = (kbatchPods.length > 0 && kbatchPods.every(p => !p.hasIssues)) ? 'Healthy' :
        (kbatchPods.length === 0 ? app.health : 'Degraded');

      // Calcular sync: es Synced solo si todos los recursos relacionados con kbatch están sincronizados
      const isOutOfSync = relevantResourceNames.some(name => app.resourceSync?.[name] === 'OutOfSync');
      const subSync = isOutOfSync ? 'OutOfSync' : 'Synced';

      // Problemas si la salud no es óptima o está desincronizado
      const kbatchHasIssues = subHealth !== 'Healthy' || subSync !== 'Synced';

      return {
        ...app,
        health: subHealth, // Sobreescribimos para la visualización
        sync: subSync,     // Sobreescribimos para la visualización
        pods: kbatchPods,
        hasIssues: kbatchHasIssues
      };
    });

    // 2. Solo mostrar aplicaciones que efectivamente tengan componentes que coincidan con el filtro
    list = list.filter(a => a.pods.length > 0);

    // 3. Aplicar búsqueda adicional del usuario si existe
    if (term) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.namespace?.toLowerCase().includes(term) ||
        a.health.toLowerCase().includes(term)
      );
    }

    // 4. Aplicar filtro de estado
    if (this.currentFilter !== 'all') {
      list = list.filter(a => a.health === this.currentFilter);
    }

    return list.sort((a, b) => {
      if (a.hasIssues && !b.hasIssues) return -1;
      if (!a.hasIssues && b.hasIssues) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  // KPIs enfocados solo en los componentes kbatch dentro de los entornos
  totalCount = computed(() => this.filteredApps().length);
  syncedCount = computed(() => this.filteredApps().filter(a => a.sync === 'Synced').length);
  failingAppsCount = computed(() => this.filteredApps().filter(a => a.hasIssues).length);
  totalPods = computed(() => this.filteredApps().reduce((acc, a) => acc + a.pods.length, 0));
  globalHealth = computed(() => this.failingAppsCount() === 0 ? 'Healthy' : 'Degraded');

  filterStatus(status: 'all' | 'Healthy' | 'Degraded') {
    this.currentFilter = status;
  }

  toggleApp(name: string) {
    if (this.expandedApps.has(name)) this.expandedApps.delete(name);
    else this.expandedApps.add(name);
  }

  isExpanded(name: string) {
    return this.expandedApps.has(name);
  }

  getFailingPods(app: ArgoApplication): Pod[] {
    return app.pods.filter(p => p.hasIssues);
  }

  groupPodsByDeployment(app: ArgoApplication): { name: string, pods: Pod[] }[] {
    const groups: { [key: string]: Pod[] } = {};
    app.pods.forEach(pod => {
      const depName = pod.deploymentName || 'Other';
      if (!groups[depName]) groups[depName] = [];
      groups[depName].push(pod);
    });
    return Object.entries(groups).map(([name, pods]) => ({ name, pods }));
  }

  getGroupStatus(pods: Pod[]): string {
    if (pods.some(p => p.hasIssues)) return 'Degraded';
    return 'Healthy';
  }

  getSyncStatus(app: ArgoApplication, deploymentName: string): string {
    if (!app.resourceSync) return '';
    return app.resourceSync[deploymentName] || '';
  }
}
