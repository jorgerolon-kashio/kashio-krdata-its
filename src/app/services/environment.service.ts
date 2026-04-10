import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class EnvironmentService {
    private readonly ENV_PLACEHOLDER = 'IT-KRDATA-ENV_PLACEHOLDER';
    private readonly STORAGE_KEY = 'it-krdata-selected-env';

    private readonly DOMAIN_PE_PLACEHOLDER = 'IT-KRDATA-DOMAIN_PE_PLACEHOLDER';
    private readonly DOMAIN_DEV_PLACEHOLDER = 'IT-KRDATA-DOMAIN_DEV_PLACEHOLDER';
    private readonly DOMAIN_MX_PLACEHOLDER = 'IT-KRDATA-DOMAIN_MX_PLACEHOLDER';
    private readonly DOMAIN_CL_PLACEHOLDER = 'IT-KRDATA-DOMAIN_CL_PLACEHOLDER';

    private readonly DOMAIN_PE = this.DOMAIN_PE_PLACEHOLDER.includes('PLACEHOLDER') ? 'kashio.com.pe' : this.DOMAIN_PE_PLACEHOLDER;
    private readonly DOMAIN_DEV = this.DOMAIN_DEV_PLACEHOLDER.includes('PLACEHOLDER') ? 'kashio-dev.net' : this.DOMAIN_DEV_PLACEHOLDER;
    private readonly DOMAIN_MX = this.DOMAIN_MX_PLACEHOLDER.includes('PLACEHOLDER') ? 'kashio.com.mx' : this.DOMAIN_MX_PLACEHOLDER;
    private readonly DOMAIN_CL = this.DOMAIN_CL_PLACEHOLDER.includes('PLACEHOLDER') ? 'kashio.cl' : this.DOMAIN_CL_PLACEHOLDER;

    private environments = signal<string[]>([]);
    private selectedEnv = signal<string>('');

    constructor() {
        this.initEnvironments();
    }

    private initEnvironments() {
        // Fallback for local development if placeholder is not replaced
        let envSource = this.ENV_PLACEHOLDER;
        if (envSource.includes("PLACEHOLDER")) {
            envSource = '{dev-qa-stg,prod(peru),multipais}';
        }

        // Limpiar formato {dev,prod} y parsear
        const cleaned = envSource.replace(/[{}]/g, '').trim();
        let envList = cleaned.split(',')
            .map((e: string) => e.trim().toLowerCase())
            .filter((e: string) => e.length > 0 && e !== 'it-krdata-env_placeholder');

        this.environments.set(envList);

        let savedEnv = localStorage.getItem(this.STORAGE_KEY);
        if (savedEnv) savedEnv = savedEnv.trim().toLowerCase();

        if (savedEnv && envList.includes(savedEnv)) {
            this.selectedEnv.set(savedEnv);
        } else if (envList.length > 0) {
            this.selectedEnv.set(envList[0]);
        }
    }

    getAvailableEnvironments() {
        return this.environments;
    }

    getCurrentEnv() {
        return this.selectedEnv;
    }

    getDomainByEnv(env: string): string {
        const envLower = env.toLowerCase();
        if (envLower.startsWith('q') || envLower.startsWith('d') || envLower.startsWith('s')) {
            return this.DOMAIN_DEV;
        } else if (envLower.startsWith('mx')) {
            return this.DOMAIN_MX;
        } else if (envLower.startsWith('cl')) {
            return this.DOMAIN_CL;
        }
        return this.DOMAIN_PE;
    }

    setEnv(env: string) {
        if (this.environments().includes(env)) {
            this.selectedEnv.set(env);
            localStorage.setItem(this.STORAGE_KEY, env);
            window.location.reload();
        }
    }
}
