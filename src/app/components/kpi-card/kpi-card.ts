import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="card kpi-card">
      <div class="icon-box" [style.background-color]="bgColor">
        <lucide-icon [name]="icon" [size]="20" [style.color]="iconColor"></lucide-icon>
      </div>
      <div class="kpi-info">
        <span class="kpi-title">{{ title }}</span>
        <span class="kpi-value">{{ value }}</span>
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      transition: transform 0.3s ease;
    }

    .kpi-card:hover {
      transform: translateY(-5px);
    }

    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-title {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }
  `]
})
export class KpiCardComponent {
  @Input() title: string = '';
  @Input() value: string = '';
  @Input() icon: string = '';
  @Input() iconColor: string = '#0052FF';
  @Input() bgColor: string = 'rgba(0, 82, 255, 0.1)';
}
