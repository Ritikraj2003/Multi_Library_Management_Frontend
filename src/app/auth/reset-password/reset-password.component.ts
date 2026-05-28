import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { LoaderService } from '../../shared/services/loader.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  styleUrls: ['../login/login.component.css'],
  template: `
    <div class="login-card p-4 shadow-lg animate__animated animate__fadeInDown">
      <div class="text-center mb-4">
        <div class="logo-placeholder mb-3">
          <img src="assets/images/logo.png" alt="SLM Logo" class="img-fluid" style="max-height: 150px; object-fit: contain;" />
        </div>
        <h3 class="fw-bold">Reset Password</h3>
        <p class="text-muted small">Enter your new password below.</p>
      </div>

      <div *ngIf="isExpired" class="alert alert-danger text-center py-3">
        <i class="bi bi-clock-history fs-3 d-block mb-2"></i>
        <h5 class="fw-bold">Link Expired</h5>
        <p class="small mb-0">This reset link has expired (5 minute limit). Please request a new one.</p>
        <a routerLink="/auth/forgot-password" class="btn btn-outline-danger btn-sm mt-3">Request New Link</a>
      </div>

      <form *ngIf="!isExpired" [formGroup]="resetForm" (ngSubmit)="onSubmit()">
        <div class="mb-3">
          <label class="form-label fw-semibold">New Password</label>
          <div class="input-group">
            <span class="input-group-text bg-transparent border-end-0">
              <i class="bi bi-lock text-muted"></i>
            </span>
            <input type="password" formControlName="password" class="form-control border-start-0 ps-0" 
                   [ngClass]="{ 'is-invalid': submitted && f['password'].errors }" placeholder="New password">
          </div>
          <div *ngIf="submitted && f['password'].errors" class="invalid-feedback d-block">
            <div *ngIf="f['password'].errors['required']">Password is required</div>
            <div *ngIf="f['password'].errors['minlength']">Minimum 6 characters required</div>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label fw-semibold">Confirm Password</label>
          <div class="input-group">
            <span class="input-group-text bg-transparent border-end-0">
              <i class="bi bi-check2-circle text-muted"></i>
            </span>
            <input type="password" formControlName="confirmPassword" class="form-control border-start-0 ps-0" 
                   [ngClass]="{ 'is-invalid': submitted && resetForm.errors?.['mismatch'] }" placeholder="Confirm password">
          </div>
          <div *ngIf="submitted && resetForm.errors?.['mismatch']" class="invalid-feedback d-block">
            Passwords do not match
          </div>
        </div>

        <button [disabled]="loading" class="btn btn-primary w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center">

          Reset Password
        </button>
      </form>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  loading = false;
  submitted = false;
  token: string = '';
  isExpired = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private loaderService: LoaderService
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    const timestamp = this.route.snapshot.queryParams['t'] || '';
    
    if (!this.token) {
      this.notificationService.showError('Invalid reset link.');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Check 5 minute restriction (timestamp is in ms)
    if (timestamp) {
      const now = new Date().getTime();
      const diff = (now - parseInt(timestamp)) / (1000 * 60);
      if (diff > 5) {
        this.isExpired = true;
      }
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  get f() { return this.resetForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.resetForm.invalid) return;

    this.loading = true;
    this.loaderService.show();
    const body = {
      token: this.token,
      newPassword: this.resetForm.value.password
    };

    this.apiService.resetPassword(body)
      .pipe(finalize(() => {
        this.loading = false;
        this.loaderService.hide();
      }))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.showSuccess('Password reset successfully. You can now login.');
            this.router.navigate(['/auth/login']);
          } else {
            // If backend says expired
            if (res.message?.toLowerCase().includes('expired')) {
               this.isExpired = true;
            }
            this.notificationService.showError(res.message || 'Error resetting password.');
          }
        },
        error: (err) => {
          this.notificationService.showError('Error connecting to server.');
          console.error(err);
        }
      });
  }
}
