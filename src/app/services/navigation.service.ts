import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private router = inject(Router);

    private readonly APP_NAME = 'IT-KRDATA-APP_NAME_PLACEHOLDER'.includes('PLACEHOLDER') ? 'KRDATA' : 'IT-KRDATA-APP_NAME_PLACEHOLDER';

    private currentTitle = new BehaviorSubject<string>('KRDATA Overview');
    currentTitle$ = this.currentTitle.asObservable();

    private breadcrumbs = new BehaviorSubject<string[]>([this.APP_NAME, 'Overview']);
    breadcrumbs$ = this.breadcrumbs.asObservable();

    constructor() {
        // Update on navigation end
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.updateFromRouteData();
        });

        // Initial update - use setTimeout to ensure router is ready
        setTimeout(() => {
            this.updateFromRouteData();
        }, 100);
    }

    // Manual fallback, but data-driven is preferred
    updatePage(title: string, crumbs: string[]) {
        this.currentTitle.next(title);
        this.breadcrumbs.next(crumbs);
    }

    private updateFromRouteData() {
        try {
            let route = this.router.routerState.root;
            let title = 'KRDATA Overview';
            let breadcrumbs = [this.APP_NAME, 'Overview'];

            // Traverse to the deepest active route to find data
            while (route.firstChild) {
                route = route.firstChild;
            }

            // Get data from the leaf route
            const routeData = route.snapshot.data;
            if (routeData && routeData['title']) {
                title = routeData['title'];
            }
            if (routeData && routeData['breadcrumbs']) {
                breadcrumbs = routeData['breadcrumbs'];
            }

            console.log('🔄 Navigation update:', {
                title,
                breadcrumbs,
                url: this.router.url,
                routeData
            });

            this.currentTitle.next(title);
            this.breadcrumbs.next(breadcrumbs);
        } catch (error) {
            console.error('⚠️ Error updating navigation data:', error);
            // Fallback to default values to avoid UI break
            this.currentTitle.next('KRDATA Overview');
            this.breadcrumbs.next([this.APP_NAME, 'Overview']);
        }
    }
}
