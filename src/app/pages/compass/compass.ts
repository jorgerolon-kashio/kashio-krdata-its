import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CompassService } from '../../services/compass.service';
import { CompassComponent as CompassModel, GraphNeighbors } from '../../models/compass.models';

interface GraphNode {
  id: string;
  name: string;
}

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="compass-container">
      <div class="compass-shell">
        <!-- Main Content de Compass -->
        <main class="compass-main">
          <div class="canvas">
            <!-- Organic Graph Explorer Section -->
            <section *ngIf="selectedComponent()" class="explorer-view">
              <div class="graph-hub">

                <!-- TOP: Context -->
                <div class="hub-spoke context-spoke" *ngIf="contextNodes().length">
                  <div class="spoke-label">Contained in</div>
                  <div class="spoke-nodes horizontal">
                    <div *ngFor="let node of contextNodes()" class="context-path-item">
                      <div class="node-pill structural mini" (click)="selectFromDependency(node.id)">
                        {{ node.name }}
                      </div>
                    </div>
                  </div>
                  <div class="structural-spine top-spine"></div>
                </div>

                <!-- LEFT: Dependencies -->
                <div class="hub-spoke depends-on-spoke" *ngIf="dependsOnNodes().length">
                  <div class="spoke-label">Depends On</div>
                  <div class="spoke-nodes vertical">
                    <div *ngFor="let node of dependsOnNodes()" class="node-pill primary"
                      (click)="selectFromDependency(node.id)">
                      <span class="pill-arrow outgoing">←</span>
                      {{ node.name }}
                    </div>
                  </div>
                </div>

                <!-- CENTER: Focus Node -->
                <div class="central-node shadow-glow">
                  <div class="focus-type">{{ selectedComponent()?.type }}</div>
                  <h2 class="focus-name">{{ selectedComponent()?.name }}</h2>

                  <div class="focus-decoration"></div>
                  <p class="focus-desc">{{ selectedComponent()?.description }}</p>

                  <button *ngIf="isArgoCompatible(selectedComponent())" class="info-btn-center"
                    (click)="showArgoInfo($event, selectedComponent()!)">
                    Recursos
                  </button>

                  <!-- ArgoCD Info Integration -->
                  <ng-container *ngIf="isArgoCompatible(selectedComponent())">
                    <div *ngIf="loadingArgo()" class="argo-loader center">
                      <div class="spinner"></div> Consultando ArgoCD...
                    </div>

                    <div *ngIf="argoTried() && (!podInfo() || podInfo()?.length === 0)" class="argo-error-msg">
                      No se encontraron recursos para este componente en ninguna aplicación de ArgoCD.
                    </div>

                    <div *ngIf="podInfo() && podInfo()!.length > 0" class="pod-metrics-overlay multi-env">
                      <div class="metrics-summary-title">Recursos por Aplicación</div>
                      <div class="metrics-table-header">
                        <span>Tenant</span>
                        <span>Reps</span>
                        <span>CPU</span>
                        <span>Mem</span>
                      </div>
                      <div class="metrics-table-body scrollable-metrics">
                        <div *ngFor="let info of podInfo()" class="metrics-table-row">
                          <span class="row-tenant" [title]="info.appName">{{ info.appName }}</span>
                          <span class="row-value">{{ info.replicas }}</span>
                          <span class="row-value">{{ info.cpu }}</span>
                          <span class="row-value">{{ info.memory }}</span>
                        </div>
                      </div>
                    </div>
                  </ng-container>
                </div>

                <!-- RIGHT: Dependents -->
                <div class="hub-spoke dependents-spoke" *ngIf="dependentsNodes().length">
                  <div class="spoke-label">Depended on by</div>
                  <div class="spoke-nodes vertical">
                    <div *ngFor="let node of dependentsNodes()" class="node-pill dependent"
                      (click)="selectFromDependency(node.id)">
                      {{ node.name }}
                      <span class="pill-arrow incoming">→</span>
                    </div>
                  </div>
                </div>

                <!-- BOTTOM: Containment -->
                <div class="hub-spoke contains-spoke" *ngIf="containsNodes().length">
                  <div class="structural-spine bottom-spine"></div>
                  <div class="spoke-label">Contains</div>
                  <div class="spoke-nodes horizontal">
                    <div *ngFor="let node of containsNodes()" class="node-pill structural"
                      (click)="selectFromDependency(node.id)">
                      <span class="type-dot"></span>
                      {{ node.name }}
                    </div>
                  </div>
                </div>

              </div>
            </section>

            <!-- Loading/Welcome State -->
            <div *ngIf="!selectedComponent()" class="welcome-hero">
              <div *ngIf="loading(); else welcome" class="argo-loader center">
                <div class="spinner"></div> Cargando grafo de dependencias...
              </div>
              <ng-template #welcome>
                <div class="hero-icon">🕸️</div>
                <h2>Graph Explorer</h2>
                <p>No se ha seleccionado ningún componente para explorar.</p>
              </ng-template>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      --primary: #6366f1;
      --secondary: #ec4899;
      --accent: #10b981;
      --bg-dark: transparent;
      --text-main: #1B254B;
      --text-dim: #A3AED0;
    }

    .compass-container {
      min-height: calc(100vh - 100px);
      background: var(--bg-dark);
      border-radius: 20px;
      overflow: hidden;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .compass-shell {
      flex: 1;
      display: flex;
    }

    .compass-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .canvas {
      flex: 1;
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2rem;
      /* Background cleaner without grid */
      background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 70%);
    }

    .explorer-view {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 600px;
    }

    .graph-hub {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    .central-node {
      width: 480px; /* Increased from 320px */
      background: white;
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 24px;
      padding: 2rem;
      text-align: center;
      z-index: 20;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.08);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      color: var(--text-main);
    }

    .focus-type {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 0.15em;
      margin-bottom: 0.5rem;
    }

    .focus-name {
      margin: 0 0 0.75rem 0;
      font-size: 1.4rem; /* Increased font size */
      font-weight: 800;
      color: #1E293B;
    }

    .focus-desc {
      font-size: 13px;
      color: #64748B;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .hub-spoke {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      z-index: 10;
    }

    .spoke-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #94A3B8;
      letter-spacing: 0.08em;
      background: #F8FAFC;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(163, 174, 208, 0.15);
      margin-bottom: 4px;
    }

    .spoke-nodes {
      display: flex;
      gap: 0.75rem;
    }

    .spoke-nodes.vertical {
      flex-direction: column;
      max-height: 300px; /* Increased */
      overflow-y: auto;
      padding: 0.5rem;
    }

    .spoke-nodes.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 700px; /* Increased */
      max-height: 200px; /* Increased */
      overflow-y: auto;
      padding: 0.5rem;
    }

    /* Adjusted positions to accommodate larger central card and prevent overlap */
    .context-spoke { top: 50%; transform: translateY(-380px); }
    .contains-spoke { bottom: 50%; transform: translateY(380px); }
    .dependents-spoke { left: 50%; transform: translateX(380px); }
    .depends-on-spoke { right: 50%; transform: translateX(-380px); }

    .node-pill {
      background: white;
      border: 1px solid rgba(163, 174, 208, 0.2);
      padding: 10px 18px; /* Increased padding */
      border-radius: 12px;
      font-size: 12px; /* Increased font size */
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      color: #334155;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    }

    .node-pill:hover {
      transform: translateY(-3px);
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.02);
      box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
    }

    .structural-spine {
      position: absolute;
      width: 1px;
      background: linear-gradient(to bottom, var(--primary), transparent);
      opacity: 0.1;
      z-index: 1;
    }

    .top-spine { top: 100%; height: 180px; background: linear-gradient(to top, var(--primary), transparent); }
    .bottom-spine { bottom: 100%; height: 180px; background: linear-gradient(to bottom, var(--primary), transparent); }

    .info-btn-center {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      color: var(--primary);
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 1rem;
    }

    .info-btn-center:hover {
      background: var(--primary);
      color: #fff;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .dependents-spoke { transform: translateX(240px); }
      .depends-on-spoke { transform: translateX(-240px); }
    }

    @media (max-width: 768px) {
      .graph-hub {
        flex-direction: column;
        gap: 3rem;
        height: auto;
      }
      .hub-spoke {
        position: relative;
        transform: none !important;
        left: auto !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        width: 100%;
      }
      .central-node {
        order: 2;
        width: 100%;
        max-width: 400px;
      }
      .context-spoke { order: 1; }
      .depends-on-spoke { order: 3; }
      .dependents-spoke { order: 4; }
      .contains-spoke { order: 5; }
      .structural-spine { display: none; }
      .spoke-nodes.horizontal { max-width: 100%; }
    }

    .info-btn-center:hover {
      background: var(--primary);
      color: #fff;
      transform: translateY(-2px);
    }

    .argo-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 12px;
      color: #64748B;
      padding: 1rem;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(99, 102, 241, 0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .pod-metrics-overlay {
      margin-top: 1rem;
      background: #F8FAFC;
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid #E2E8F0;
    }

    .metrics-summary-title {
      font-size: 11px;
      color: var(--primary);
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      text-align: left;
    }

    .metrics-table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      font-size: 10px;
      color: #94A3B8;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .metrics-table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      font-size: 11px;
      padding: 0.5rem 0;
      border-top: 1px solid #E2E8F0;
      color: #334155;
    }

    .row-tenant { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .row-value { color: var(--accent); font-weight: 700; }

    .welcome-hero {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .hero-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.2; }
    .welcome-hero h2 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #1E293B; }
    .welcome-hero p { color: #64748B; max-width: 400px; font-size: 14px; }
  `]
})
export class CompassComponent implements OnInit {
  resources = signal<CompassModel[]>([]);
  selectedComponent = signal<CompassModel | null>(null);
  loading = signal<boolean>(true);

  // ArgoCD Pod Info
  podInfo = signal<any[] | null>(null);
  loadingArgo = signal<boolean>(false);
  argoTried = signal<boolean>(false);

  // Explorer Graph specific data
  contextNodes = signal<GraphNode[]>([]);
  containsNodes = signal<GraphNode[]>([]);
  dependsOnNodes = signal<GraphNode[]>([]);
  dependentsNodes = signal<GraphNode[]>([]);
  private readonly COMPASS_FILTER = 'IT-KBATCH-COMPASS_FILTER_PLACEHOLDER'.includes('PLACEHOLDER') ? '' : 'IT-KBATCH-COMPASS_FILTER_PLACEHOLDER';
  private readonly ARGO_FILTER = 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER'.includes('PLACEHOLDER') ? '' : 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER';

  constructor(private compassService: CompassService) { }

  ngOnInit() {
    this.compassService.getAllComponents().subscribe({
      next: (data) => {
        this.resources.set(data);
        this.loading.set(false);

        // Intentar seleccionar el componente predeterminado o el primero
        if (data.length > 0) {
          const filter = this.COMPASS_FILTER.toLowerCase();
          const defaultComp = filter ? data.find(c => c.name.toLowerCase().includes(filter)) || data[0] : data[0];
          this.selectComponent(defaultComp);
        }
      },
      error: (err) => {
        console.error('Error fetching components:', err);
        this.loading.set(false);
      }
    });
  }

  selectComponent(component: CompassModel) {
    this.selectedComponent.set(component);
    this.podInfo.set(null);
    this.argoTried.set(false);

    this.compassService.getComponentRelations(component.id).subscribe(neighbors => {
      if (neighbors.component) {
        this.selectedComponent.set(neighbors.component);
      }

      this.contextNodes.set(neighbors.containedIn.map(n => ({ id: n.id, name: n.name })));
      this.containsNodes.set(neighbors.contains.map(n => ({ id: n.id, name: n.name })));
      this.dependsOnNodes.set(neighbors.dependsOn.map(n => ({ id: n.id, name: n.name })));
      this.dependentsNodes.set(neighbors.dependedOnBy.map(n => ({ id: n.id, name: n.name })));
    });
  }

  showArgoInfo(event: Event, component: CompassModel) {
    event.stopPropagation();

    this.loadingArgo.set(true);
    this.argoTried.set(false);
    this.podInfo.set(null);

    let appName = component.name.toUpperCase();
    appName = appName.replace('BACKEND - ', '').replace('FRONTEND - ', '');
    appName = appName.toLowerCase().trim().replace(/\s+/g, '-');

    console.log('🔍 Compass - Fetching Argo info for:', appName);

    this.compassService.getPodInfo(appName).subscribe({
      next: (response) => {
        console.log('✅ Compass - Pod info response:', response);
        this.podInfo.set(response);
        this.loadingArgo.set(false);
        this.argoTried.set(true);
      },
      error: (err) => {
        console.error('❌ Compass - Error fetching Argo info:', err);
        this.podInfo.set(null);
        this.loadingArgo.set(false);
        this.argoTried.set(true);
      }
    });
  }

  selectFromDependency(id: string) {
    let comp = this.resources().find(r => r.id === id);
    if (!comp) {
      const allNeighbors = [
        ...this.contextNodes(),
        ...this.containsNodes(),
        ...this.dependsOnNodes(),
        ...this.dependentsNodes()
      ];
      const neighbor = allNeighbors.find(n => n.id === id);
      if (neighbor) {
        comp = { id, name: neighbor.name, type: 'component' };
      } else {
        comp = { id, name: 'Loading...', type: 'component' };
      }
    }

    this.selectComponent(comp);
  }

  isArgoCompatible(comp: CompassModel | null): boolean {
    if (!comp) return false;
    const name = comp.name.toUpperCase();
    return name.includes('BACKEND - ') || name.includes('FRONTEND - ');
  }
}
