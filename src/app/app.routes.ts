import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LayoutComponent } from './components/layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ArgocdComponent } from './pages/argocd/argocd';
import { CompassComponent } from './pages/compass/compass';
import { ApmComponent } from './pages/apm/apm';
import { ApiTestComponent } from './pages/api-test/api-test';
const APP_NAME = 'IT-KOBS-APP_NAME_PLACEHOLDER'.includes('PLACEHOLDER') ? 'KBATCH' : 'IT-KOBS-APP_NAME_PLACEHOLDER';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        canActivate: [MsalGuard],
        children: [
            {
                path: '',
                component: DashboardComponent,
                data: { title: 'Service Validation Dashboard', breadcrumbs: [APP_NAME, 'Overview Dashboard'] }
            },
            {
                path: 'argocd',
                component: ArgocdComponent,
                data: { title: 'ArgoCD Status Monitor', breadcrumbs: [APP_NAME, 'ArgoCD Status'] }
            },
            {
                path: 'compass',
                component: CompassComponent,
                data: { title: 'Compass Explorer', breadcrumbs: [APP_NAME, 'Compass Data'] }
            },
            {
                path: 'apm',
                component: ApmComponent,
                data: { title: 'APM & Performance Dashboard', breadcrumbs: [APP_NAME, 'APM Monitoring'] }
            },
            {
                path: 'api-test',
                component: ApiTestComponent,
                data: { title: 'API Validation Playground', breadcrumbs: [APP_NAME, 'API Test'] }
            },
        ]
    },
    { path: '**', redirectTo: '' }
];
