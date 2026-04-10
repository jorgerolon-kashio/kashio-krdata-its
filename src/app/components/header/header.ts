import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NavigationService } from '../../services/navigation.service';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { AuthenticationResult, EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <header class="header">
      <div class="header-left">
        <div class="breadcrumbs">
          <ng-container *ngFor="let crumb of breadcrumbs$ | async; let last = last">
            <span [class.root]="!last" [class.current]="last">{{ crumb }}</span>
            <span class="separator" *ngIf="!last">/</span>
          </ng-container>
        </div>
        <h1 class="page-title">{{ title$ | async }}</h1>
      </div>

      <div class="header-right">
        <div class="header-actions">
          <div class="user-profile-card" *ngIf="loginDisplay">
            <div class="user-details">
              <span class="user-fullname">{{ userName }}</span>
              <span class="user-email">{{ userEmail }}</span>
            </div>
            <button class="logout-btn" (click)="logout()" title="Cerrar Sesión">
              <lucide-icon name="log-out" [size]="20"></lucide-icon>
            </button>
          </div>
          
          <button *ngIf="!loginDisplay" class="login-btn" (click)="login()">
             Iniciar Sesión
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: var(--header-height);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 900;
      margin-top: 10px;
    }

    .header-left { display: flex; flex-direction: column; }

    .breadcrumbs { display: flex; gap: 8px; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
    .breadcrumbs .root { color: var(--text-secondary); }
    .breadcrumbs .separator { color: var(--text-secondary); }
    .breadcrumbs .current { color: var(--text-primary); }

    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }

    .header-right { display: flex; align-items: center; gap: 24px; }
    .header-actions { display: flex; align-items: center; gap: 20px; }
    
    .user-profile-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 16px;
      background: #FFFFFF;
      border: 1px solid #E0E5F2;
      border-radius: 30px;
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.02);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-fullname {
      font-size: 14px;
      font-weight: 700;
      color: #1B2559;
      line-height: 1.2;
    }

    .user-email {
      font-size: 12px;
      font-weight: 400;
      color: #A3AED0;
    }

    .logout-btn {
      color: #A3AED0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: color 0.3s;
      background: none;
      border: none;
      padding: 0;
    }

    .logout-btn:hover {
      color: var(--status-failed);
    }
    
    .login-btn {
      padding: 8px 16px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private navService = inject(NavigationService);
  private authService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);

  title$ = this.navService.currentTitle$;
  breadcrumbs$ = this.navService.breadcrumbs$;

  loginDisplay = false;
  userName = '';
  userEmail = '';
  private readonly _destroying$ = new Subject<void>();

  ngOnInit() {
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this._destroying$)
      )
      .subscribe((result: EventMessage) => {
        const payload = result.payload as AuthenticationResult;
        this.authService.instance.setActiveAccount(payload.account);
        this.setLoginDisplay();
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.setLoginDisplay();
      });

    this.setLoginDisplay();
  }

  setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
    if (this.loginDisplay) {
      const account = this.authService.instance.getActiveAccount() || this.authService.instance.getAllAccounts()[0];
      this.userName = account.name || 'User';
      this.userEmail = account.username || '';
    }
  }

  login() {
    this.authService.loginRedirect();
  }

  logout() {
    this.authService.logoutRedirect();
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
