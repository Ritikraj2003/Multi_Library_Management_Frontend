import { Component, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ApiService } from '../../shared/services/api.service';
import { LoaderService } from '../../shared/services/loader.service';
import { NotificationService } from '../../shared/services/notification.service';
import { finalize } from 'rxjs';

declare var bootstrap: any;
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5themes_Responsive from '@amcharts/amcharts5/themes/Responsive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any;
  loading = true;
  libraryId!: number;
  libraryName = 'Library';
  userFullName: string | undefined;

  revenueAnalytics: any;
  dashboardAlerts: any;

  private modal: any;
  whatsappLoading = false;
  whatsappMessage = '';
  whatsappRecipient = '';
  whatsappPhone = '';

  // Attendance by batch
  batchAttendanceData: any[] = [];
  selectedDate: string = '';
  attendanceLoading = false;

  private paymentRoot: am5.Root | undefined;
  private batchRoot: am5.Root | undefined;
  private attendanceBatchRoot: am5.Root | undefined;
  private revenueRoot: am5.Root | undefined;
  private genderRoot: am5.Root | undefined;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.userFullName = this.authService.currentUserValue?.fullName;
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.libraryName = this.authService.currentUserValue?.libraryName || 'Library';
    // Default to today's date in YYYY-MM-DD format
    this.selectedDate = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadBatchAttendance();
    this.loadRevenueAnalytics();
    this.loadDashboardAlerts();
  }

  loadStats(): void {
    if (!this.libraryId) return;
    this.loaderService.show();
    this.apiService.getDashboardStats(this.libraryId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats = res.data;
        }
        this.loading = false;
        this.loaderService.hide();
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            this.createCharts();
            this.createAttendanceBatchChart();
          }, 100);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      }
    });
  }

  loadBatchAttendance(): void {
    if (!this.libraryId) return;
    this.attendanceLoading = true;
    this.apiService.getAttendanceByBatch(this.libraryId, this.selectedDate).subscribe({
      next: (res: any) => {
        this.batchAttendanceData = res?.success && Array.isArray(res?.data) ? res.data : [];
        this.attendanceLoading = false;
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.createAttendanceBatchChart(), 100);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.batchAttendanceData = [];
        this.attendanceLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onDateChange(): void {
    this.loadBatchAttendance();
  }

  loadRevenueAnalytics(): void {
    if (!this.libraryId) return;
    this.apiService.getRevenueAnalytics(this.libraryId, 'monthly').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.revenueAnalytics = res.data;
          if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => this.createRevenueChart(), 100);
          }
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  loadDashboardAlerts(): void {
    if (!this.libraryId) return;
    this.apiService.getDashboardAlerts(this.libraryId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.dashboardAlerts = res.data;
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  openExpirationWhatsAppModal(student: { name: string; phone: string; plan?: string }): void {
    this.whatsappRecipient = student.name;
    this.whatsappPhone = student.phone;
    const planInfo = student.plan ? ` (${student.plan} batch)` : '';
    this.whatsappMessage =
      `Hello ${student.name},\n\n` +
      `This is a friendly reminder that your library subscription is going to expire *today*${planInfo}.\n\n` +
      `*Please renew your subscription as soon as possible* to continue your studies.\n\n` +
      `🏛️ *${this.libraryName}*\nThank you!`;
    this.showModal('dashboardWhatsappModal');
  }

  sendExpirationWhatsAppMessage(): void {
    if (!this.whatsappPhone) {
      this.notificationService.showError('Recipient phone number is required.');
      return;
    }

    const whatsAppLibId = 'LIB' + String(this.libraryId).padStart(3, '0');
    const body = {
      libraryId: whatsAppLibId,
      number: this.whatsappPhone,
      message: this.whatsappMessage
    };

    this.whatsappLoading = true;
    this.loaderService.show();
    this.cdr.markForCheck();

    this.apiService.sendSingleWhatsAppMessage(body)
      .pipe(finalize(() => {
        this.whatsappLoading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.notificationService.showSuccess('WhatsApp reminder sent successfully!');
            this.hideModal();
          } else {
            this.notificationService.showError(res.message || 'Failed to send WhatsApp reminder.');
          }
        },
        error: (err: any) => {
          const errMsg = err.error?.message || err.message || 'Error occurred. Make sure WhatsApp is connected in settings.';
          this.notificationService.showError(errMsg);
        }
      });
  }

  private showModal(id: string): void {
    this.cdr.detectChanges();
    const el = document.getElementById(id);
    if (el) {
      let modalInstance = bootstrap.Modal.getInstance(el);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(el);
      }
      this.modal = modalInstance;
      this.modal.show();
    }
  }

  hideModal(): void {
    if (this.modal) this.modal.hide();
  }

  createCharts(): void {
    this.createPaymentChart();
    this.createBatchChart();
    this.createGenderChart();
    this.createRevenueChart();
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

  createGenderChart(): void {
    if (this.genderRoot) this.genderRoot.dispose();
    if (!this.stats?.genderStats?.length) return;
    this.genderRoot = this.initDonutChart("genderChartDiv", this.stats.genderStats, "count", "gender", "{value} Students");
  }

  createRevenueChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.revenueRoot) this.revenueRoot.dispose();
    if (!this.revenueAnalytics?.monthlyData?.length) return;

    const chartEl = document.getElementById('revenueChartDiv');
    if (!chartEl) return;

    const root = am5.Root.new(chartEl);
    root.setThemes([am5themes_Animated.new(root)]);
    this.revenueRoot = root;

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX",
        pinchZoomX: true
      })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 70
    });

    xRenderer.labels.template.setAll({
      fontSize: 12,
      fill: am5.color(0x64748b)
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "month",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
      })
    );

    xAxis.data.setAll(this.revenueAnalytics.monthlyData);

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {})
      })
    );

    const series = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: "Revenue",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "revenue",
        categoryXField: "month",
        tooltip: am5.Tooltip.new(root, {
          labelText: "₹{valueY}"
        })
      })
    );

    series.fills.template.setAll({
      visible: true,
      fillOpacity: 0.2
    });

    series.fills.template.set("fillGradient", am5.LinearGradient.new(root, {
      stops: [{
        opacity: 0.6,
        color: am5.color(0x6366f1)
      }, {
        opacity: 0,
        color: am5.color(0x6366f1)
      }],
      rotation: 90
    }));

    series.strokes.template.setAll({
      strokeWidth: 3,
      stroke: am5.color(0x6366f1)
    });

    series.data.setAll(this.revenueAnalytics.monthlyData);
    series.appear(1000);
    chart.appear(1000, 100);
  }

  createAttendanceBatchChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.attendanceBatchRoot) this.attendanceBatchRoot.dispose();
    if (!this.batchAttendanceData.length || this.loading || this.attendanceLoading) return;

    const chartEl = document.getElementById('attendanceBatchChartDiv');
    if (!chartEl) {
      setTimeout(() => this.createAttendanceBatchChart(), 100);
      return;
    }

    const root = am5.Root.new(chartEl);
    root.setThemes([am5themes_Animated.new(root)]);
    this.attendanceBatchRoot = root;

    // Create XY chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout
      })
    );

    // X Axis (batch names)
    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "batchName",
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 20,
          cellStartLocation: 0.15,
          cellEndLocation: 0.85
        }),
        tooltip: am5.Tooltip.new(root, {})
      })
    );

    xAxis.get("renderer").labels.template.setAll({
      fontSize: 13,
      fontWeight: "500",
      fill: am5.color(0x475569),
      paddingTop: 8
    });

    xAxis.get("renderer").grid.template.setAll({ visible: false });

    // Y Axis (count)
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        strictMinMax: true,
        extraMax: 0.15,
        renderer: am5xy.AxisRendererY.new(root, {})
      })
    );

    yAxis.get("renderer").labels.template.setAll({
      fontSize: 12,
      fill: am5.color(0x94a3b8)
    });

    yAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(0xf1f5f9),
      strokeWidth: 1
    });

    // Color set
    const colors = [
      am5.color(0x6366f1),
      am5.color(0x8b5cf6),
      am5.color(0x06b6d4),
      am5.color(0x10b981),
      am5.color(0xf59e0b),
      am5.color(0xef4444),
      am5.color(0xec4899),
      am5.color(0x14b8a6)
    ];

    // Series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueYField: "attendanceCount",
        categoryXField: "batchName",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{categoryX}: {valueY} students"
        })
      })
    );

    series.columns.template.setAll({
      cornerRadiusTL: 8,
      cornerRadiusTR: 8,
      strokeOpacity: 0,
      width: am5.percent(70),
      templateField: "columnSettings"
    });

    // Apply per-bar colors
    const coloredData = this.batchAttendanceData.map((d, i) => ({
      ...d,
      columnSettings: { fill: colors[i % colors.length] }
    }));

    // Bullet labels on top of bars
    series.bullets.push(() =>
      am5.Bullet.new(root, {
        locationY: 1,
        sprite: am5.Label.new(root, {
          text: "{valueY}",
          centerX: am5.percent(50),
          centerY: am5.percent(100),
          dy: -8,
          fontSize: 13,
          fontWeight: "700",
          fill: am5.color(0x334155),
          populateText: true
        })
      })
    );

    xAxis.data.setAll(coloredData);
    series.data.setAll(coloredData);
    series.appear(1000);
    chart.appear(1000, 100);
  }

  private initDonutChart(divId: string, data: any[], valueField: string, categoryField: string, labelText: string): am5.Root {
    let root = am5.Root.new(divId);
    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Responsive.new(root)
    ]);

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
        alignLabels: true
      })
    );

    series.slices.template.set("fillGradient", am5.RadialGradient.new(root, {
      stops: [
        { brighten: -0.8 },
        { brighten: -0.8 },
        { brighten: -0.5 },
        { brighten: 0 },
        { brighten: -0.5 }
      ]
    }));

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

    series.slices.template.states.create("hover", {
      scale: 0.95,
      shadowOpacity: 0.2
    });

    series.labels.template.setAll({
      maxWidth: 150,
      oversizedBehavior: "wrap",
      text: `{category}: ${labelText}`
    });

    let legend = chart.children.push(am5.Legend.new(root, {
      centerX: am5.percent(50),
      x: am5.percent(50),
      marginTop: 15,
      marginBottom: 15,
      layout: root.horizontalLayout
    }));

    // allow wrapping
    legend.labels.template.setAll({
      fontSize: 12,
      fontWeight: "400"
    });
    legend.valueLabels.template.setAll({
      fontSize: 12,
      fontWeight: "500"
    });

    legend.data.setAll(series.dataItems);

    series.data.setAll(data);
    series.appear(1000, 100);
    return root;
  }

  ngOnDestroy(): void {
    if (this.paymentRoot) this.paymentRoot.dispose();
    if (this.batchRoot) this.batchRoot.dispose();
    if (this.attendanceBatchRoot) this.attendanceBatchRoot.dispose();
    if (this.revenueRoot) this.revenueRoot.dispose();
    if (this.genderRoot) this.genderRoot.dispose();
  }
}
