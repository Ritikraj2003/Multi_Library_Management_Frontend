declare var Razorpay: any;
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';
import { LoaderService } from '../../../shared/services/loader.service';

@Component({
  selector: 'app-registration-renew',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-renew.component.html'
})
export class RegistrationRenewComponent implements OnInit {
  @Input() registrationId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  renewForm: FormGroup;
  loading = false;
  libraryId!: number;
  isRazorpayVerified: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private loaderService: LoaderService
  ) {
    this.renewForm = this.fb.group({
      months: [1, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      paymentMode: ['Cash', [Validators.required]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.apiService.getSettingsByLibraryId(this.libraryId).subscribe(res => {
      if (res.success && res.data) {
        const razorpaySetting = res.data.find((s: any) => s.key === 'isRazorpayVerified');
        if (razorpaySetting && razorpaySetting.value === 'true') {
          this.isRazorpayVerified = true;
        }
      }
    });
  }

  onSubmit(): void {
    if (this.renewForm.invalid) return;

    this.loading = true;
    this.loaderService.show();
    const body = { 
      ...this.renewForm.value, 
      registrationId: this.registrationId,
      libraryId: this.libraryId,
      createdBy: this.authService.currentUserValue?.userId 
    };

    if (body.paymentMode === 'Razorpay') {
      const orderReq = {
        libraryId: this.libraryId,
        amount: Number(body.amount),
        currency: 'INR'
      };

      this.apiService.createRazorpayOrder(orderReq).subscribe({
        next: (orderRes: any) => {
          this.loaderService.hide();
          if (orderRes.success) {
            const options = {
              key: orderRes.key,
              amount: orderRes.amount,
              currency: orderRes.currency,
              name: 'Jesses Library',
              description: 'Student Renewal Fee',
              order_id: orderRes.orderId,
              handler: (response: any) => {
                this.loaderService.show();
                const verifyReq = {
                  libraryId: this.libraryId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature
                };
                this.apiService.verifyRazorpayPayment(verifyReq).subscribe({
                  next: (verifyRes: any) => {
                    if (verifyRes.success) {
                      this.saveRenewal(body);
                    } else {
                      this.loaderService.hide();
                      this.loading = false;
                      alert('Payment verification failed!');
                    }
                  },
                  error: () => {
                    this.loaderService.hide();
                    this.loading = false;
                    alert('Error verifying payment.');
                  }
                });
              },
              theme: { color: '#3399cc' }
            };
            const rzp = new Razorpay(options);
            rzp.open();
          } else {
            this.loading = false;
            alert('Failed to create Razorpay order.');
          }
        },
        error: () => {
          this.loaderService.hide();
          this.loading = false;
          alert('Error initializing Razorpay.');
        }
      });
    } else {
      this.saveRenewal(body);
    }
  }

  private saveRenewal(body: any): void {
    this.apiService.renewRegistration(body)
      .pipe(finalize(() => {
        this.loading = false;
        this.loaderService.hide();
      }))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.saved.emit();
          } else {
            alert(res.message);
          }
        },
        error: (err: any) => console.error('Error renewing registration:', err)
      });
  }
}
