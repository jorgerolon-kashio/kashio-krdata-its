import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { CompassComponent, GraphNeighbors } from '../models/compass.models';
import { EnvironmentService } from './environment.service';
@Injectable({
    providedIn: 'root'
})
export class CompassService {
    private readonly API_BASE_URL_PLACEHOLDER = 'IT-KOBS-API_BASE_URL_PLACEHOLDER';

    get API_BASE_URL(): string {
        return this.API_BASE_URL_PLACEHOLDER.includes('PLACEHOLDER')
            ? 'https://kobs-svc-dev-162532850005.us-central1.run.app'
            : this.API_BASE_URL_PLACEHOLDER;
    }

    private envService = inject(EnvironmentService);

    constructor(private http: HttpClient) { }

    /**
     * Obtiene todos los componentes desde el backend especializado.
     */
    getAllComponents(): Observable<CompassComponent[]> {
        return this.http.get<CompassComponent[]>(`${this.API_BASE_URL}/components`).pipe(
            catchError(err => {
                console.error('Error fetching Compass components:', err);
                return of([]);
            })
        );
    }

    /**
     * Obtiene las relaciones de un componente específico desde el backend especializado.
     * @param componentId ID del componente (ej: ari:cloud:compass:...)
     */
    getComponentRelations(componentId: string): Observable<GraphNeighbors> {
        return this.http.get<GraphNeighbors>(`${this.API_BASE_URL}/relations`, {
            params: { componentId }
        }).pipe(
            catchError(err => {
                console.error('Error fetching Compass relations:', err);
                return of({ contains: [], containedIn: [], dependsOn: [], dependedOnBy: [] });
            })
        );
    }

    getPodInfo(appName: string): Observable<any> {
        const params = new HttpParams().set('env', this.envService.getCurrentEnv()());
        return this.http.get<any>(`${this.API_BASE_URL}/argo/pod-info/${appName}`, { params })
            .pipe(
                catchError(err => {
                    console.error('Error fetching Argo info from backend:', err);
                    return of(null);
                })
            );
    }
}
