import { Component, effect, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApmService } from '../../services/apm.service';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexFill,
  NgApexchartsModule
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  labels: string[];
  legend: ApexLegend;
  subtitle: ApexTitleSubtitle;
  fill: ApexFill;
  colors: string[];
};

@Component({
  selector: 'app-main-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="card chart-card">
      <div class="chart-header">
        <h3 class="chart-title">Global Latency Analysis (p99 vs Avg)</h3>
        <div class="chart-period">
          <button 
            *ngFor="let env of availableEnvs()" 
            class="period-btn" 
            [class.active]="selectedEnv() === env"
            (click)="selectedEnv.set(env)"
          >
            {{ env }}
          </button>
          <button class="period-btn" *ngIf="isLoading() && availableEnvs().length === 0">Loading...</button>
        </div>
      </div>
      <div class="chart-container">
        <apx-chart
          *ngIf="chartOptions && chartOptions.series"
          [series]="chartOptions.series"
          [chart]="chartOptions.chart!"
          [xaxis]="chartOptions.xaxis!"
          [stroke]="chartOptions.stroke!"
          [dataLabels]="chartOptions.dataLabels!"
          [yaxis]="chartOptions.yaxis!"
          [fill]="chartOptions.fill!"
          [colors]="chartOptions.colors!"
        ></apx-chart>
      </div>
    </div>
  `,
  styles: [`
    .chart-card {
      padding: 30px;
      background: white;
      border-radius: 20px;
      box-shadow: var(--shadow-soft);
      margin-bottom: 24px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .chart-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .period-btn {
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      transition: all 0.3s ease;
      background: none;
      border: none;
      cursor: pointer;
    }

    .period-btn.active {
      background: #F4F7FE;
      color: var(--primary);
    }

    .chart-container {
      min-height: 350px;
    }
  `]
})
export class MainChartComponent {
  private apmService = inject(ApmService);
  public chartOptions: Partial<ChartOptions>;
  isLoading = this.apmService.loading;

  selectedEnv = signal('Global');
  availableEnvs = computed(() => {
    const dynamic = this.apmService.dynamicUrls().map((u: any) => u.env);
    return ['Global', ...dynamic];
  });

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        height: 350,
        type: "area",
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        fontFamily: 'Inter, sans-serif'
      },
      colors: ['#EE5D50', '#0052FF'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: "smooth",
        width: 3
      },
      xaxis: {
        type: "category",
        categories: [],
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        },
        labels: {
          style: {
            colors: '#A3AED0',
            fontSize: '11px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#A3AED0',
            fontSize: '11px'
          }
        }
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.0,
          stops: [0, 90, 100]
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right'
      }
    };

    effect(() => {
      const allData = this.apmService.envLatencyData();
      const env = this.selectedEnv();
      const data = allData[env];

      if (data) {
        this.chartOptions.series = [
          {
            name: "p99 Latency (ms)",
            data: data.p99
          },
          {
            name: "Avg Latency (ms)",
            data: data.avg
          }
        ];
        this.chartOptions.xaxis = {
          ...this.chartOptions.xaxis,
          categories: data.labels
        };
      }
    });
  }
}
