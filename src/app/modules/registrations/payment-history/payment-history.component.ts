import { Component, Input, OnInit, OnChanges, ChangeDetectorRef, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../shared/services/api.service';
import { LoaderService } from '../../../shared/services/loader.service';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-history.component.html'
})
export class PaymentHistoryComponent implements OnInit, OnChanges {
  @Input() registrationId!: number;
  @Output() printPayment = new EventEmitter<any>();
  payments: any[] = [];
  loading = false;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['registrationId'] && this.registrationId) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    this.loading = true;
    this.loaderService.show();
    this.cdr.detectChanges();
    this.apiService.getPaymentHistory(this.registrationId)
      .subscribe({
        next: (res: any) => {
          this.payments = res.data || [];
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error loading history:', err);
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        }
      });
  }
}
