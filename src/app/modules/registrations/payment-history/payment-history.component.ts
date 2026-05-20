import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, Input, OnInit, OnChanges, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: './payment-history.component.html'
})
export class PaymentHistoryComponent implements OnInit, OnChanges {
  @Input() registrationId!: number;
  payments: any[] = [];
  loading = false;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['registrationId'] && this.registrationId) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.apiService.getPaymentHistory(this.registrationId)
      .subscribe({
        next: (res: any) => {
          this.payments = res.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error loading history:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }
}
