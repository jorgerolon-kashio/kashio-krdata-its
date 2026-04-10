import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EnvironmentService } from '../../services/environment.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="logo-area">
          <lucide-icon name="activity" class="pulse-icon" [size]="28"></lucide-icon>
          <div class="logo-text-container">
            <span class="logo-subtitle">IT-SERVICE-PORTAL</span>
            <span class="logo-title">{{ appName }}</span>
          </div>
        </div>
        <div class="version-text">{{ appVersion }}</div>
      </div>

      <!-- Environment Selector -->
      <div class="env-selector-container" *ngIf="envService.getAvailableEnvironments()().length > 0">
        <div class="env-label">ENVIRONMENT</div>
        <div class="env-dropdown">
          <select (change)="onEnvChange($event)">
            <option *ngFor="let env of envService.getAvailableEnvironments()()" 
                    [value]="env"
                    [selected]="env === envService.getCurrentEnv()()">
              {{ env | uppercase }}
            </option>
          </select>
          <lucide-icon name="chevron-down" class="dropdown-icon" [size]="16"></lucide-icon>
        </div>
      </div>

      <div class="header-divider"></div>

      <nav class="nav-menu">
        <ul>
          <li *ngFor="let item of menuItems">
            <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
              <lucide-icon [name]="item.icon" [size]="18" class="nav-icon"></lucide-icon>
              <span>{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      background-color: #0B112B;
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1000;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
    }

    .sidebar-header {
      padding: 32px 24px 12px;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 2px;
    }

    .pulse-icon {
      color: #3B82F6;
      stroke-width: 3px;
    }

    .logo-text-container {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .logo-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #64748B;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .logo-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.8px;
    }

    .version-text {
      font-size: 11px;
      color: #64748B;
      font-family: 'Inter', sans-serif;
      padding-left: 40px;
      margin-top: 4px;
    }

    /* Environment Selector Styles */
    .env-selector-container {
      margin: 16px 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      transition: all 0.3s ease;
    }
    .env-selector-container:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #2563EB;
    }
    .env-label {
      font-size: 9px;
      font-weight: 800;
      color: #64748B;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .env-dropdown {
      position: relative;
      display: flex;
      align-items: center;
    }
    .env-dropdown select {
      width: 100%;
      padding: 4px 24px 4px 0;
      font-size: 13px;
      font-weight: 600;
      color: white;
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      appearance: none;
      text-transform: uppercase;
    }
    .dropdown-icon {
      position: absolute;
      right: 0;
      pointer-events: none;
      color: #3B82F6;
    }

    .header-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 8px 0 24px 0;
    }

    .nav-menu {
      flex: 1;
      padding: 0 16px;
    }

    .nav-menu ul {
      display: flex;
      flex-direction: column;
      gap: 6px;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      color: #CBD5E1;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .nav-link.active {
      background: #2563EB;
      color: white;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .nav-icon {
      opacity: 0.85;
      pointer-events: none;
    }

    .nav-link.active .nav-icon {
      opacity: 1;
    }

  `]
})
export class SidebarComponent {
  public envService = inject(EnvironmentService);

  readonly appName = 'IT-KRDATA-APP_NAME_PLACEHOLDER'.includes('PLACEHOLDER') ? 'KRDATA' : 'IT-KRDATA-APP_NAME_PLACEHOLDER';
  readonly appVersion = 'IT-KRDATA-APP_VERSION_PLACEHOLDER'.includes('PLACEHOLDER') ? 'v1.0.0.0-dev' : 'IT-KRDATA-APP_VERSION_PLACEHOLDER';
  readonly menuItems = [
    { label: 'Overview', icon: 'layout-dashboard', path: '/' },
    { label: 'Geography', icon: 'globe', path: '/geography' },
    { label: 'Financial', icon: 'wallet', path: '/financial' },
    { label: 'Business', icon: 'building', path: '/business' },
    { label: 'Process', icon: 'git-branch', path: '/process' },
    { label: 'API Playground', icon: 'play-circle', path: '/api-test' },
  ];

  onEnvChange(event: any) {
    this.envService.setEnv(event.target.value);
  }
}
