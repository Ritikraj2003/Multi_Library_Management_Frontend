import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, Input, OnInit, OnChanges } from '@angular/core';
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

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.registrationId) this.loadHistory();
  }

  ngOnChanges(): void {
    if (this.registrationId) this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.apiService.getPaymentHistory(this.registrationId)
      .subscribe({
        next: (res: any) => {
          this.payments = res.data || [];
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Error loading history:', err);
          this.loading = false;
        }
      });
  }
}
