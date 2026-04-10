import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

interface PodStatus {
  name: string;
  deploymentName: string;
  status: string;
  hasIssues: boolean;
}

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="card table-card">
      <div class="table-header">
        <h3 class="table-title">{{ title }}</h3>
        <button class="view-all" routerLink="/argocd">View Details</button>
      </div>
      
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>POD NAME</th>
              <th>DEPLOYMENT</th>
              <th>HEALTH</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let pod of pods">
              <td class="pod-name">{{ pod.name }}</td>
              <td>{{ pod.deploymentName }}</td>
              <td>
                <span class="badge" [ngClass]="'badge-' + pod.status.toLowerCase()">
                  {{ pod.status }}
                </span>
              </td>
            </tr>
            <tr *ngIf="pods.length === 0">
              <td colspan="3" style="text-align: center; padding: 40px; color: #A0AEC0;">
                No matching pods found for the current filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .table-card {
      padding: 30px;
      background: white;
      border-radius: 20px;
      box-shadow: var(--shadow-soft);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .table-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .view-all {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
      background: rgba(0, 82, 255, 0.05);
      padding: 8px 16px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
    }

    .table-responsive {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      padding: 12px 16px;
      border-bottom: 1px solid rgba(163, 174, 208, 0.1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 16px;
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
    }

    tr {
      transition: background 0.3s ease;
    }

    tr:hover {
      background: rgba(244, 247, 254, 0.5);
    }

    .pod-name {
      font-weight: 600;
      color: #2D3748;
      font-family: 'Courier New', Courier, monospace;
    }

    .usage {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      color: #4A5568;
    }

    .badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }

    .badge-healthy {
      background: rgba(5, 205, 153, 0.1);
      color: #05CD99;
    }
    
    .badge-degraded, .badge-failed {
      background: rgba(238, 93, 80, 0.1);
      color: #EE5D50;
    }
    
    .badge-moving, .badge-progressing, .badge-syncing {
      background: rgba(255, 181, 71, 0.1);
      color: #FFB547;
    }
  `]
})
export class TransactionsTableComponent {
  @Input() title: string = 'Service Status';

  @Input() pods: PodStatus[] = [];
}
