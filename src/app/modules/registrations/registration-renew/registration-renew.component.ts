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
  isRazorpayVerified = false;

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
    this.loadRazorpayStatus();
  }

  private loadRazorpayStatus(): void {
    if (this.libraryId <= 0) return;
    this.apiService.isRazorpayVerified(this.libraryId).subscribe({
      next: (res: any) => {
        this.isRazorpayVerified = res.success && !!(res.data ?? res.Data);
        const mode = this.renewForm.get('paymentMode')?.value;
        if (!this.isRazorpayVerified && mode === 'Razorpay') {
          this.renewForm.patchValue({ paymentMode: 'Cash' });
        }
        if (mode === 'Cheque') {
          this.renewForm.patchValue({ paymentMode: 'Cash' });
        }
      },
      error: () => {
        this.isRazorpayVerified = false;
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
