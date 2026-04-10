import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { InteractionType, IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import {
  MsalGuard,
  MsalInterceptor,
  MsalService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';

import { routes } from './app.routes';
import { msalConfig, loginRequest } from './auth-config';

import {
  LucideAngularModule,
  LayoutDashboard,
  Settings,
  Search,
  Bell,
  Activity,
  Cloud,
  Layers,
  Database,
  RefreshCw,
  Compass,
  Gauge,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  BarChart3,
  XCircle,
  LayoutGrid,
  Clock,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Check,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  SearchX,
  Box,
  Terminal,
  Info,
  ChevronRight,
  FileText,
  Globe,
  Wallet,
  Building,
  GitBranch
} from 'lucide-angular';

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest
  };
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  const API_BASE_URL = 'IT-KRDATA-API_BASE_URL_PLACEHOLDER'.includes('PLACEHOLDER') ? 'http://localhost:3001' : 'IT-KRDATA-API_BASE_URL_PLACEHOLDER';
  protectedResourceMap.set(`${API_BASE_URL}/api/*`, ['User.Read']);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    importProvidersFrom(
      LucideAngularModule.pick({
        LayoutDashboard,
        Settings,
        Search,
        Bell,
        Activity,
        Cloud,
        Layers,
        Database,
        RefreshCw,
        Compass,
        Gauge,
        PlayCircle,
        AlertTriangle,
        CheckCircle2,
        Cpu,
        BarChart3,
        XCircle,
        LayoutGrid,
        Clock,
        ArrowLeft,
        ArrowRight,
        LogOut,
        Check,
        ChevronUp,
        ChevronDown,
        AlertCircle,
        CheckCircle,
        SearchX,
        Box,
        Terminal,
        Info,
        ChevronRight,
        FileText,
        Globe,
        Wallet,
        Building,
        GitBranch
      })
    )
  ]
};
