import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, interval, startWith, switchMap, forkJoin, map } from 'rxjs';
import { EnvironmentService } from './environment.service';

export interface Pod {
    name: string;
    deploymentName: string;
    status?: string;
    hasIssues?: boolean;
}

export interface ArgoApplication {
    name: string;
    health: string;
    sync: string;
    revision: string;
    pods: Pod[];
    hasIssues: boolean;
    namespace?: string;
    resourceSync?: { [key: string]: string }; // name -> status (Synced/OutOfSync)
    outOfSyncResources?: { name: string, kind: string }[];
}
@Injectable({
    providedIn: 'root'
})
export class ArgoMonitoringService {
    private readonly API_BASE_URL_PLACEHOLDER = 'IT-KOBS-API_BASE_URL_PLACEHOLDER';

    get API_BASE_URL(): string {
        const base = this.API_BASE_URL_PLACEHOLDER.includes('PLACEHOLDER')
            ? 'https://kobs-svc-dev-162532850005.us-central1.run.app'
            : this.API_BASE_URL_PLACEHOLDER;
        return `${base}/argo`;
    }

    private envService = inject(EnvironmentService);

    apps = signal<ArgoApplication[]>([]);
    loading = signal<boolean>(true);

    constructor(private http: HttpClient) {
        this.initArgoMonitoring();
    }

    private initArgoMonitoring() {
        // Reintentar cada 3 segundos hasta tener la primera carga exitosa de apps
        const initialSub = interval(3000).pipe(
            startWith(0),
            switchMap(() => this.getApplicationsWithPods())
        ).subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.apps.set(data);
                    this.loading.set(false);
                    initialSub.unsubscribe();
                    this.startRegularPolling();
                }
            },
            error: (err) => {
                console.error('Initial Argo fetch failed, retrying in 3s...', err);
            }
        });
    }

    private startRegularPolling() {
        interval(30000).pipe(
            switchMap(() => this.getApplicationsWithPods())
        ).subscribe({
            next: (data) => {
                this.apps.set(data);
            },
            error: (err) => {
                console.error('Error in Argo monitoring loop:', err);
            }
        });
    }

    private getApplicationsWithPods(): Observable<ArgoApplication[]> {
        const params = new HttpParams().set('env', this.envService.getCurrentEnv()());

        return this.http.get<any>(`${this.API_BASE_URL}/applications`, { params }).pipe(
            switchMap((response: any) => {
                const items = response.items || [];
                if (items.length === 0) return of([]);

                const detailRequests = items.map((app: any) => {
                    const appName = app.metadata.name;

                    // Extraer estados de sync de recursos individuales
                    const resourceSync: { [key: string]: string } = {};
                    const outOfSyncResources: { name: string, kind: string }[] = [];

                    if (app.status?.resources) {
                        app.status.resources.forEach((res: any) => {
                            // Priorizamos OutOfSync si hay duplicados de nombre
                            if (!resourceSync[res.name] || res.status === 'OutOfSync') {
                                resourceSync[res.name] = res.status;
                            }

                            if (res.status === 'OutOfSync') {
                                outOfSyncResources.push({ name: res.name, kind: res.kind });
                            }
                        });
                    }

                    const detailParams = new HttpParams().set('env', this.envService.getCurrentEnv()());
                    return this.http.get<any>(`${this.API_BASE_URL}/applications/${appName}/resource-tree`, { params: detailParams }).pipe(
                        map((tree: any) => {
                            const podNodes = (tree.nodes || []).filter((n: any) => n.kind === 'Pod');
                            const pods = podNodes.map((node: any) => {
                                const parts = node.name.split('-');
                                let simplifiedName = node.name;
                                if (parts.length > 2) simplifiedName = parts.slice(0, -2).join('-');
                                else if (parts.length === 2) simplifiedName = parts[0];

                                return {
                                    name: node.name,
                                    deploymentName: simplifiedName,
                                    status: node.health?.status || 'Unknown',
                                    hasIssues: node.health?.status !== 'Healthy'
                                };
                            });

                            return {
                                name: appName,
                                health: app.status.health.status,
                                sync: app.status.sync.status,
                                revision: app.status.sync.revision,
                                pods: pods,
                                hasIssues: app.status.health.status !== 'Healthy' || app.status.sync.status !== 'Synced' || pods.some((p: any) => p.hasIssues),
                                namespace: app.metadata.namespace,
                                resourceSync: resourceSync,
                                outOfSyncResources: outOfSyncResources
                            } as ArgoApplication;
                        }),
                        catchError(() => of({
                            name: appName,
                            health: app.status.health.status,
                            sync: app.status.sync.status,
                            revision: app.status.sync.revision,
                            pods: [],
                            hasIssues: app.status.health.status !== 'Healthy' || app.status.sync.status !== 'Synced',
                            namespace: app.metadata.namespace,
                            resourceSync: resourceSync,
                            outOfSyncResources: outOfSyncResources
                        } as ArgoApplication))
                    );
                });

                return forkJoin(detailRequests) as Observable<ArgoApplication[]>;
            }),
            catchError(err => {
                console.error('Error fetching Argo applications:', err);
                return of([]);
            })
        );
    }
}
