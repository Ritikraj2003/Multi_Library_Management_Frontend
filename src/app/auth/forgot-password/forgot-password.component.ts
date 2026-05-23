import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  styleUrls: ['../login/login.component.css'],
  template: `
    <div class="login-card p-4 shadow-lg animate__animated animate__fadeInDown">
      <div class="text-center mb-4">
        <div class="logo-placeholder mb-3">
          <img src="assets/images/slm.png" alt="SLM Logo" class="img-fluid" style="max-height: 150px; object-fit: contain;" />
        </div>
        <h3 class="fw-bold">Forgot Password?</h3>
        <p class="text-muted small">Enter your email and we'll send you a link to reset your password.</p>
      </div>

      <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
        <div class="mb-4">
          <label class="form-label fw-semibold">Email Address</label>
          <div class="input-group">
            <span class="input-group-text bg-transparent border-end-0">
              <i class="bi bi-envelope text-muted"></i>
            </span>
            <input type="email" formControlName="email" class="form-control border-start-0 ps-0" 
                   [ngClass]="{ 'is-invalid': submitted && f['email'].errors }" placeholder="name@example.com">
          </div>
          <div *ngIf="submitted && f['email'].errors" class="invalid-feedback d-block">
            <div *ngIf="f['email'].errors['required']">Email is required</div>
            <div *ngIf="f['email'].errors['email']">Email must be a valid email address</div>
          </div>
        </div>

        <button [disabled]="loading" class="btn btn-primary w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center mb-3">
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Send Reset Link
        </button>

        <div class="text-center">
          <a routerLink="/auth/login" class="text-primary text-decoration-none small fw-bold">
            <i class="bi bi-arrow-left me-1"></i> Back to Login
          </a>
        </div>
      </form>
    </div>
  `
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.forgotForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.forgotForm.invalid) return;

    this.loading = true;
    this.apiService.forgotPassword(this.forgotForm.value.email)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.showSuccess('Password reset link sent to your email.');
            this.router.navigate(['/auth/login']);
          } else {
            this.notificationService.showError(res.message || 'Error sending reset link.');
          }
        },
        error: (err) => {
          this.notificationService.showError('Error connecting to server.');
          console.error(err);
        }
      });
  }
}
