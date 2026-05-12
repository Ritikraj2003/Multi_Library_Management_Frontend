import { Component, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import { ApiService } from '../../shared/services/api.service';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any;
  loading = true;
  libraryId!: number;
  userFullName: string | undefined;
  private paymentRoot: am5.Root | undefined;
  private batchRoot: am5.Root | undefined;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.userFullName = this.authService.currentUserValue?.fullName;
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
  }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    if (!this.libraryId) return;
    this.apiService.getDashboardStats(this.libraryId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats = res.data;
          if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => this.createCharts(), 100);
          }
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  createCharts(): void {
    this.createPaymentChart();
    this.createBatchChart();
  }

  createPaymentChart(): void {
    if (this.paymentRoot) this.paymentRoot.dispose();
    if (!this.stats?.paymentModes?.length) return;
    this.paymentRoot = this.initDonutChart("paymentChartDiv", this.stats.paymentModes, "totalAmount", "mode", "₹{value}");
  }

  createBatchChart(): void {
    if (this.batchRoot) this.batchRoot.dispose();
    if (!this.stats?.batchStats?.length) return;
    this.batchRoot = this.initDonutChart("batchChartDiv", this.stats.batchStats, "studentCount", "batchName", "{value} Students");
  }

  private initDonutChart(divId: string, data: any[], valueField: string, categoryField: string, labelText: string): am5.Root {
    let root = am5.Root.new(divId);
    root.setThemes([am5themes_Animated.new(root)]);

    let chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(65),
        layout: root.verticalLayout
      })
    );

    let series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: valueField,
        categoryField: categoryField,
        alignLabels: false
      })
    );

    // Styling slices for a premium rounded look
    series.slices.template.setAll({
      cornerRadius: 10,
      stroke: am5.color(0xffffff),
      strokeWidth: 3,
      shadowColor: am5.color(0x000000),
      shadowBlur: 15,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
      shadowOpacity: 0.1,
      toggleKey: "none",
      cursorOverStyle: "pointer"
    });

    // Hover state
    series.slices.template.states.create("hover", {
      scale: 0.95,
      shadowOpacity: 0.2
    });

    series.labels.template.setAll({
      maxWidth: 100,
      oversizedBehavior: "wrap",
      text: `{category}: ${labelText}`
    });

    series.data.setAll(data);
    series.appear(1000, 100);
    return root;
  }

  ngOnDestroy(): void {
    if (this.paymentRoot) this.paymentRoot.dispose();
    if (this.batchRoot) this.batchRoot.dispose();
  }
}
