import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LayoutComponent } from './components/layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ApiTestComponent } from './pages/api-test/api-test';
import { KrdataDomainComponent } from './pages/krdata-domain/krdata-domain';
const APP_NAME = 'IT-KRDATA-APP_NAME_PLACEHOLDER'.includes('PLACEHOLDER') ? 'KRDATA' : 'IT-KRDATA-APP_NAME_PLACEHOLDER';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        canActivate: [MsalGuard],
        children: [
            {
                path: '',
                component: DashboardComponent,
                data: { title: 'KRDATA Overview', breadcrumbs: [APP_NAME, 'Overview'] }
            },
            {
                path: 'geography',
                component: KrdataDomainComponent,
                data: {
                    title: 'Geography Catalogs',
                    breadcrumbs: [APP_NAME, 'Geography'],
                    domainTitle: 'Geography domain',
                    endpoints: [
                        { name: 'Countries', path: 'geography/countries' },
                        { name: 'Territories', path: 'geography/territories' },
                        { name: 'Plazas', path: 'geography/plazas' },
                        { name: 'Timezones', path: 'geography/timezones' }
                    ]
                }
            },
            {
                path: 'financial',
                component: KrdataDomainComponent,
                data: {
                    title: 'Financial Catalogs',
                    breadcrumbs: [APP_NAME, 'Financial'],
                    domainTitle: 'Financial domain',
                    endpoints: [
                        { name: 'Currencies', path: 'financial/currencies' },
                        { name: 'Financial Institutions', path: 'financial/financial-institutions' },
                        { name: 'Payment Method Types', path: 'financial/payment-method-types' }
                    ]
                }
            },
            {
                path: 'business',
                component: KrdataDomainComponent,
                data: {
                    title: 'Business Catalogs',
                    breadcrumbs: [APP_NAME, 'Business'],
                    domainTitle: 'Business domain',
                    endpoints: [
                        { name: 'Languages', path: 'business/languages' },
                        { name: 'Industries', path: 'business/industries' },
                        { name: 'Identity Document Types', path: 'business/identity-document-types' }
                    ]
                }
            },
            {
                path: 'process',
                component: KrdataDomainComponent,
                data: {
                    title: 'Process Catalogs',
                    breadcrumbs: [APP_NAME, 'Process'],
                    domainTitle: 'Process domain',
                    endpoints: [
                        { name: 'Process Types', path: 'process/process-types' },
                        { name: 'Process Statuses', path: 'process/process-statuses' }
                    ]
                }
            },
            {
                path: 'api-test',
                component: ApiTestComponent,
                data: { title: 'KRDATA API Playground', breadcrumbs: [APP_NAME, 'API Test'] }
            },
        ]
    },
    { path: '**', redirectTo: '' }
];
