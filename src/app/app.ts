import { Component, signal, OnInit, Inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { filter } from 'rxjs/operators';
import { EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal(('IT-KRDATA-APP_NAME_PLACEHOLDER'.includes('PLACEHOLDER') ? 'krdata' : 'IT-KRDATA-APP_NAME_PLACEHOLDER').toLowerCase() + '-portal');
  private readonly _destroying$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) { }

  ngOnInit(): void {
    // Handle redirect flow
    this.authService.handleRedirectObservable().pipe(
      takeUntil(this._destroying$)
    ).subscribe({
      next: (result) => {
        // console.log(result);
      },
      error: (error) => console.error(error)
    });
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
