import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoaderComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string = '/';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    // redirect to home if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value)
      .subscribe({
        next: (res: any) => {
          if (res && res.success) {
            this.notificationService.showSuccess('Login successful!');
            
            let targetUrl = this.returnUrl;
            
            const getFallbackUrl = () => {
              if (this.authService.hasPermission('VIEW_DASHBOARD')) {
                return '/dashboard';
              } else if (this.authService.hasPermission('VIEW_ATTENDANCE') || this.authService.hasPermission('ATTENDANCE_QR')) {
                return '/attendance';
              } else if (this.authService.hasPermission('VIEW_REGISTRATION') || this.authService.hasPermission('STUDENT_REGISTRATION_QR')) {
                return '/registrations';
              } else if (this.authService.hasPermission('VIEW_STUDENT') || this.authService.hasPermission('CREATE_STUDENT')) {
                return '/students';
              } else if (this.authService.hasPermission('VIEW_USER')) {
                return '/master/user-registration';
              } else if (this.authService.hasPermission('VIEW_LIBRARY')) {
                return '/library';
              } else if (this.authService.hasPermission('VIEW_BATCH')) {
                return '/master/batch';
              } else if (this.authService.hasPermission('VIEW_SECTION')) {
                return '/master/section';
              } else if (this.authService.hasPermission('VIEW_SEAT')) {
                return '/master/tables';
              } else if (this.authService.hasPermission('GENERAL_SETTING_EMAIL_VIEW') || this.authService.hasPermission('GENERAL_SETTING_ATTENDANCE_LOCATION_VIEW')) {
                return '/master/general-setting';
              } else if (this.authService.hasPermission('VIEW_ROLE')) {
                return '/master/role-permission';
              } else if (this.authService.hasPermission('VIEW_SEATING_LAYOUT')) {
                return '/table-layout';
              }
              return null;
            };

            if (targetUrl === '/' || targetUrl === '/dashboard') {
              targetUrl = getFallbackUrl() || '/';
            }

            this.router.navigate([targetUrl]).then(success => {
              if (!success && targetUrl !== getFallbackUrl() && getFallbackUrl() !== null) {
                // If initial returnUrl navigation fails, try the fallback route
                const fallbackUrl = getFallbackUrl();
                if (fallbackUrl) {
                  this.router.navigate([fallbackUrl]).then(fallbackSuccess => {
                    if (!fallbackSuccess) {
                      this.showNoAccessError();
                    }
                  });
                } else {
                  this.showNoAccessError();
                }
              } else if (!success) {
                this.showNoAccessError();
              }
            });
          } else {
            this.error = res?.message || 'Invalid email or password.';
            this.notificationService.showError(this.error);
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: (error: any) => {
          this.error = error?.error?.message || error?.message || error || 'An error occurred during login.';
          this.notificationService.showError(this.error);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private showNoAccessError() {
    this.notificationService.showError('You do not have access to any modules.');
    this.loading = false;
    this.cdr.markForCheck();
  }
}
