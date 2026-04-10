import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, catchError, of, interval, startWith, switchMap, map, forkJoin } from 'rxjs';
import { ArgoMonitoringService } from './argo-monitoring.service';
import { EnvironmentService } from './environment.service';

export interface LatencyData {
    p99: number[];
    avg: number[];
    labels: string[];
}

export interface CriticalApiStatus {
    name: string;
    url: string;
    status: 'success' | 'warning' | 'error';
    lastCheck: Date;
    timeLabel: string;
}
@Injectable({
    providedIn: 'root'
})
export class ApmService {
    private readonly argoService = inject(ArgoMonitoringService);
    private readonly envService = inject(EnvironmentService);

    envLatencyData = signal<Record<string, LatencyData>>({
        'Global': {
            p99: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            avg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            labels: ["90s ago", "80s ago", "70s ago", "60s ago", "50s ago", "40s ago", "30s ago", "20s ago", "10s ago", "Now"]
        }
    });

    criticalApis = signal<CriticalApiStatus[]>([]);
    errorRate = signal<string>("0.00%");
    requestsPerSec = signal<string>("0.0");
    cpuLoad = signal<string>("0%");
    serviceAvailability = signal<string>("100.00%");
    loading = signal<boolean>(true);

    private readonly API_HEALTH_PLACEHOLDER = 'IT-KBATCH-API_HEALTH_PLACEHOLDER';
    private readonly ARGO_FILTER_PLACEHOLDER = 'IT-KBATCH-ARGO_FILTER_PLACEHOLDER';
    private readonly ARGO_FILTER = this.ARGO_FILTER_PLACEHOLDER.includes('PLACEHOLDER') ? '' : this.ARGO_FILTER_PLACEHOLDER;

    // URL de Salud completa para el ambiente seleccionado actualmente basada en el path de la variable de entorno
    API_HEALTH = computed(() => {
        let value = this.API_HEALTH_PLACEHOLDER;

        // Si no ha sido reemplazada (dev local), no devolvemos nada para que no intente peticiones erróneas
        if (value.includes('PLACEHOLDER')) return '';

        // Si ya es una URL absoluta, la devolvemos tal cual
        if (value.startsWith('http')) return value;

        // Si es un path relativo (como se espera dinámicamente), construimos la URL completa:
        const currentEnv = this.envService.getCurrentEnv()().toLowerCase();
        const cleanPath = value.startsWith('/') ? value : `/${value}`;

        const domain = this.envService.getDomainByEnv(currentEnv);

        return `https://${currentEnv}-api.${domain}${cleanPath}`;
    });



    // Calculamos las URLs dinámicamente basadas en los ambientes encontrados por el filtro
    dynamicUrls = computed(() => {
        const apps = this.argoService.apps();
        const filters = this.ARGO_FILTER.toLowerCase().split(',').map(f => f.trim()).filter(f => !!f);
        const currentHealth = this.API_HEALTH();

        if (!currentHealth) return [];

        let domain = '';
        let path = '';
        let protocol = 'https';

        try {
            const urlObj = new URL(currentHealth);
            path = urlObj.pathname + urlObj.search;
            protocol = urlObj.protocol.replace(':', '');

            // Extraer el dominio base del host (ej: dev-api.kashio-dev.net -> kashio-dev.net)
            const hostParts = urlObj.hostname.split('-api.');
            domain = hostParts.length > 1 ? hostParts[1] : urlObj.hostname;
        } catch (e) {
            return [];
        }

        // Encontrar apps que coincidan con el filtro (o todas si no hay filtro)
        const relevantEnvs = apps.filter(app =>
            filters.length === 0 ||
            app.pods.some(pod =>
                filters.some(f =>
                    pod.name.toLowerCase().includes(f) ||
                    pod.deploymentName.toLowerCase().includes(f)
                )
            )
        ).map(app => app.name)
            .filter((name: string) => !!name && name.trim().length > 0);

        if (relevantEnvs.length > 0) {
            return relevantEnvs.map(env => {
                const envLower = env.toLowerCase();
                const envDomain = this.envService.getDomainByEnv(envLower);

                return {
                    env: env.toUpperCase(),
                    url: `${protocol}://${envLower}-api.${envDomain}${path}`
                };
            });
        }

        return [];
    });

    constructor(private http: HttpClient) {
        interval(10000).pipe(
            startWith(0),
            switchMap(() => this.getLatencyMetrics())
        ).subscribe({
            next: () => {
                this.loading.set(false);
            }
        });

        this.initCriticalApisMonitoring();

        interval(10000).subscribe(() => {
            const current = this.criticalApis();
            if (current.length > 0) {
                const updated = current.map(api => ({
                    ...api,
                    timeLabel: this.formatRelativeTime(api.lastCheck)
                }));
                this.criticalApis.set(updated);
            }
        });
    }

    private initCriticalApisMonitoring() {
        const initialSub = interval(3000).pipe(
            startWith(0),
            switchMap(() => this.checkCriticalApis())
        ).subscribe(statuses => {
            if (statuses.length > 0) {
                statuses.sort((a, b) => a.name.localeCompare(b.name));
                this.criticalApis.set(statuses);
                this.updateGlobalMetrics(statuses);
                initialSub.unsubscribe();
                this.startRegularCriticalApiPolling();
            }
        });
    }

    private startRegularCriticalApiPolling() {
        interval(30000).pipe(
            switchMap(() => this.checkCriticalApis())
        ).subscribe(statuses => {
            if (statuses.length > 0) {
                statuses.sort((a, b) => a.name.localeCompare(b.name));
                this.criticalApis.set(statuses);
                this.updateGlobalMetrics(statuses);
            }
        });
    }

    private getLatencyMetrics(): Observable<null> {
        const urlsToTest = this.dynamicUrls();

        if (urlsToTest.length === 0) {
            const allEnvData = { ...this.envLatencyData() };
            const globalData = allEnvData['Global'];
            allEnvData['Global'] = {
                ...globalData,
                p99: [...globalData.p99.slice(1), 0],
                avg: [...globalData.avg.slice(1), 0]
            };
            this.envLatencyData.set(allEnvData);
            this.cpuLoad.set("0%");
            this.requestsPerSec.set("0.0");
            return of(null);
        }

        const measurements = urlsToTest.map(item => {
            const startTime = Date.now();
            return this.http.get<any>(item.url).pipe(
                map(response => {
                    const duration = Date.now() - startTime;
                    const data = response?.data || response;
                    const processCount = data?.processTypes?.length || (Array.isArray(data) ? data.length : 0);
                    const estimatedCpu = Math.min(95, 20 + (processCount * 5) + (Math.random() * 5));
                    return { env: item.env, duration, processCount, cpu: estimatedCpu };
                }),
                catchError(() => of(null))
            );
        });

        return forkJoin(measurements).pipe(
            map(results => {
                const validResults = results.filter(r => r !== null) as any[];
                const allEnvData = { ...this.envLatencyData() };
                const globalData = allEnvData['Global'];

                urlsToTest.forEach(item => {
                    const envName = item.env;
                    if (!allEnvData[envName]) {
                        allEnvData[envName] = {
                            p99: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            avg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            labels: globalData.labels
                        };
                    }

                    const result = validResults.find(r => r.env === envName);
                    const history = allEnvData[envName];

                    if (result) {
                        allEnvData[envName] = {
                            ...history,
                            p99: [...history.p99.slice(1), Math.floor(result.duration * 1.2)],
                            avg: [...history.avg.slice(1), result.duration]
                        };
                    } else {
                        allEnvData[envName] = {
                            ...history,
                            p99: [...history.p99.slice(1), 0],
                            avg: [...history.avg.slice(1), 0]
                        };
                    }
                });

                const totalDuration = validResults.reduce((sum, r) => sum + r.duration, 0);
                const avgDuration = urlsToTest.length > 0 ? totalDuration / urlsToTest.length : 0;
                const totalProcessCount = validResults.reduce((sum, r) => sum + r.processCount, 0);
                const avgCpu = urlsToTest.length > 0 ? (validResults.reduce((sum, r) => sum + r.cpu, 0) + (urlsToTest.length - validResults.length) * 0) / urlsToTest.length : 0;

                this.requestsPerSec.set((totalProcessCount * 0.8).toFixed(1));
                this.cpuLoad.set(`${avgCpu.toFixed(1)}%`);

                allEnvData['Global'] = {
                    ...globalData,
                    p99: [...globalData.p99.slice(1), Math.floor(avgDuration * 1.2)],
                    avg: [...globalData.avg.slice(1), Math.floor(avgDuration)]
                };

                this.envLatencyData.set(allEnvData);
                return null;
            })
        );
    }

    private checkCriticalApis(): Observable<CriticalApiStatus[]> {
        const items = this.dynamicUrls();
        if (items.length === 0) return of([]);

        const now = new Date();
        const requests = items.map((item: { env: string, url: string }) => {
            return this.http.get(item.url, { observe: 'response' }).pipe(
                map((res: HttpResponse<any>) => ({
                    name: item.env,
                    url: item.url,
                    status: (res.status >= 200 && res.status < 300) ? 'success' : 'warning',
                    lastCheck: now,
                    timeLabel: 'Just now'
                } as CriticalApiStatus)),
                catchError(() => of({
                    name: item.env,
                    url: item.url,
                    status: 'error',
                    lastCheck: now,
                    timeLabel: 'Just now'
                } as CriticalApiStatus))
            );
        });

        return forkJoin(requests) as Observable<CriticalApiStatus[]>;
    }

    private formatRelativeTime(date: Date): string {
        const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 5) return 'Just now';
        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        return `${Math.floor(diffInSeconds / 60)}m ago`;
    }

    private updateGlobalMetrics(statuses: CriticalApiStatus[]) {
        if (statuses.length === 0) {
            this.serviceAvailability.set("100.00%");
            this.errorRate.set("0.00%");
            return;
        }

        const successCount = statuses.filter(s => s.status === 'success').length;
        const failCount = statuses.filter(s => s.status === 'error').length;
        const total = statuses.length;

        const availability = (successCount / total) * 100;
        this.serviceAvailability.set(`${availability.toFixed(2)}%`);

        const errors = (failCount / total) * 100;
        this.errorRate.set(`${errors.toFixed(2)}%`);
    }
}
