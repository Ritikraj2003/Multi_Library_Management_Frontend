import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, interval } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { LoaderService } from '../../../shared/services/loader.service';

@Component({
  selector: 'app-general-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './general-setting.component.html',
  styleUrl: './general-setting.component.css'
})
export class GeneralSettingComponent implements OnInit, OnDestroy {
  emailForm: FormGroup;
  razorpayForm: FormGroup;
  attendanceLocationForm: FormGroup;
  libraryId: number = 0;
  savingEmail = false;
  savingRazorpay = false;
  isRazorpayVerified = false;
  savingAttendanceLocation = false;
  fetchingLocation = false;

  // WhatsApp Integration State
  whatsAppLibraryId: string = 'LIB001';
  whatsAppStatus: 'DISCONNECTED' | 'INITIALIZING' | 'QR_RECEIVED' | 'CONNECTED' | 'ERROR' | 'UNKNOWN' = 'DISCONNECTED';
  qrCodeBase64: SafeResourceUrl | string = '';
  isWhatsAppLoading: boolean = false;
  private whatsAppPollingSub: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public authService: AuthService,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private loaderService: LoaderService
  ) {
    this.libraryId = this.authService.currentUserValue?.libraryId || 0;
    
    // Default to "LIB001" or format current libraryId padded (e.g. 1 -> LIB001)
    if (this.libraryId > 0) {
      this.whatsAppLibraryId = 'LIB' + String(this.libraryId).padStart(3, '0');
    } else {
      this.whatsAppLibraryId = 'LIB001';
    }

    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      host: ['', Validators.required],
      port: ['', [Validators.required, Validators.pattern('^[0-9]*$')]]
    });

    this.razorpayForm = this.fb.group({
      keyId: ['', Validators.required],
      keySecret: ['', Validators.required]
    });

    this.attendanceLocationForm = this.fb.group({
      latitude: [12.8917, [Validators.required]],
      longitude: [77.5949, [Validators.required]],
      radiusInMeters: [2.0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    
    // Start polling for WhatsApp status after a short delay
    this.checkWhatsAppStatus();
  }

  loadSettings() {
    if (this.libraryId > 0) {
      this.apiService.getSettingsByLibraryId(this.libraryId).subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            const s = res.data;
            this.emailForm.patchValue({
              email: s.email ?? s.Email ?? '',
              password: s.emailAppPassword ?? s.EmailAppPassword ?? '',
              host: s.emailSmtp ?? s.EmailSmtp ?? '',
              port: s.emailPort != null ? String(s.emailPort) : (s.EmailPort != null ? String(s.EmailPort) : '')
            });
            this.razorpayForm.patchValue({
              keyId: s.razorpayKey ?? s.RazorpayKey ?? '',
              keySecret: s.razorpaySecretKey ?? s.RazorpaySecretKey ?? ''
            });
            this.isRazorpayVerified = !!(s.isRazorpayVerified ?? s.IsRazorpayVerified);
          }
        }
      });

      this.apiService.getAttendanceLocationByLibraryId(this.libraryId).subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            this.attendanceLocationForm.patchValue({
              latitude: res.data.latitude,
              longitude: res.data.longitude,
              radiusInMeters: res.data.radiusInMeters
            });
          }
        }
      });
    }
  }

  onSaveEmail() {
    if (this.emailForm.valid) {
      this.savingEmail = true;
      this.loaderService.show();
      const values = this.emailForm.value;
      this.apiService.upsertEmailSettings({
        libraryId: this.libraryId,
        email: values.email,
        emailSmtp: values.host,
        emailPort: parseInt(values.port, 10),
        emailAppPassword: values.password
      }).subscribe({
        next: (res: any) => {
          this.savingEmail = false;
          this.loaderService.hide();
          if (res?.success) {
            this.notificationService.showSuccess('Email settings saved successfully!');
          } else {
            this.notificationService.showError(res?.message || 'Failed to save email settings');
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingEmail = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        }
      });
    }
  }

  getFormErrors(form: FormGroup) {
    const errors: any = {};
    Object.keys(form.controls).forEach(key => {
      const controlErrors = form.get(key)?.errors;
      if (controlErrors != null) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }

  onSaveRazorpay() {
    if (this.razorpayForm.valid) {
      this.savingRazorpay = true;
      this.loaderService.show();
      const values = this.razorpayForm.value;
      this.apiService.upsertRazorpaySettings({
        libraryId: this.libraryId,
        razorpayKey: values.keyId,
        razorpaySecretKey: values.keySecret
      }).subscribe({
        next: (res: any) => {
          this.savingRazorpay = false;
          this.loaderService.hide();
          if (res?.success) {
            const data = res.data;
            this.isRazorpayVerified = !!(data?.isRazorpayVerified ?? data?.IsRazorpayVerified);
            if (this.isRazorpayVerified) {
              this.notificationService.showSuccess(res.message || 'Razorpay settings saved and verified successfully!');
            } else {
              this.notificationService.showWarning(res.message || 'Keys saved but could not be verified. Please check Key ID and Secret.');
            }
          } else {
            this.notificationService.showError(res?.message || 'Failed to save Razorpay settings');
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingRazorpay = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        }
      });
    }
  }

  fetchCurrentLocation() {
    if (!navigator.geolocation) {
      this.notificationService.showError('Geolocation is not supported by this browser.');
      return;
    }
    this.fetchingLocation = true;
    this.loaderService.show();
    this.cdr.detectChanges();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.attendanceLocationForm.patchValue({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          this.fetchingLocation = false;
          this.loaderService.hide();
          this.notificationService.showSuccess('Location fetched successfully!');
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.fetchingLocation = false;
          this.loaderService.hide();
          this.notificationService.showError('Could not fetch location. Please enable location permissions.');
          this.cdr.detectChanges();
        });
      },
      { enableHighAccuracy: true }
    );
  }

  onSaveAttendanceLocation() {
    if (this.attendanceLocationForm.valid) {
      this.savingAttendanceLocation = true;
      this.loaderService.show();
      this.cdr.detectChanges();
      const values = this.attendanceLocationForm.value;
      console.log('Saving attendance location:', { libraryId: this.libraryId, ...values });
      this.apiService.upsertAttendanceLocation({
        libraryId: this.libraryId,
        latitude: parseFloat(values.latitude),
        longitude: parseFloat(values.longitude),
        radiusInMeters: parseFloat(values.radiusInMeters)
      }).subscribe({
        next: (res: any) => {
          this.savingAttendanceLocation = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          console.log('Upsert attendance location response:', res);

          // Only treat as success if success field is explicitly true
          const isSuccess = res && (res.success === true || res.Success === true);
          const msg = res ? (res.message || res.Message) : '';

          if (isSuccess) {
            this.notificationService.showSuccess('Location saved successfully!');
          } else {
            this.notificationService.showError(msg || 'Failed to save attendance location');
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.savingAttendanceLocation = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          // errorInterceptor transforms err into a plain string
          const errMsg = typeof err === 'string' ? err : (err?.error?.message || err?.message || 'An error occurred while saving.');
          this.notificationService.showError(errMsg);
          this.cdr.detectChanges();
        }
      });
    }
  }

  // WhatsApp Integration Methods
  connectWhatsApp() {
    this.isWhatsAppLoading = true;
    this.whatsAppStatus = 'INITIALIZING';
    this.stopPolling();
    this.cdr.detectChanges();

    this.apiService.initWhatsApp(this.whatsAppLibraryId).subscribe({
      next: (res: any) => {
        this.isWhatsAppLoading = false;
        console.log('WhatsApp connection response:', res);
        
        // Show response message in toaster
        if (res.message) {
          if (res.success) {
            this.notificationService.showSuccess(res.message);
          } else {
            this.notificationService.showWarning(res.message);
          }
        } else {
          this.notificationService.showInfo('WhatsApp session initialization triggered.');
        }

        const statusUpper = (res.status || res.state || '').toUpperCase();
        const isConnected = res.connected || statusUpper === 'CONNECTED';

        if (isConnected) {
          this.whatsAppStatus = 'CONNECTED';
          this.qrCodeBase64 = '';
          this.stopPolling();
        } else if (res.qrCode || statusUpper === 'QR_RECEIVED' || statusUpper.startsWith('UNPAIRED')) {
          this.whatsAppStatus = 'QR_RECEIVED';
          this.qrCodeBase64 = res.qrCode ? this.sanitizer.bypassSecurityTrustResourceUrl(res.qrCode) : '';
          this.startPolling();
        } else if (statusUpper === 'INITIALIZING') {
          this.whatsAppStatus = 'INITIALIZING';
        } else {
          this.whatsAppStatus = 'DISCONNECTED';
          this.stopPolling();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isWhatsAppLoading = false;
        this.whatsAppStatus = 'ERROR';
        this.stopPolling();
        console.error('WhatsApp initialization error:', err);
        const errMsg = err.error?.message || err.message || 'Failed to initialize WhatsApp connection';
        this.notificationService.showError(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  logoutWhatsApp() {
    this.isWhatsAppLoading = true;
    this.cdr.detectChanges();

    this.apiService.killSession(this.whatsAppLibraryId).subscribe({
      next: (res: any) => {
        this.isWhatsAppLoading = false;
        console.log('WhatsApp logout response:', res);
        
        if (res.message) {
          this.notificationService.showSuccess(res.message);
        } else {
          this.notificationService.showSuccess('WhatsApp session terminated successfully.');
        }

        this.whatsAppStatus = 'DISCONNECTED';
        this.qrCodeBase64 = '';
        this.stopPolling();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isWhatsAppLoading = false;
        console.error('WhatsApp logout error:', err);
        const errMsg = err.error?.message || err.message || 'Failed to logout WhatsApp session';
        this.notificationService.showError(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  checkWhatsAppStatus() {
    this.isWhatsAppLoading = true;
    this.cdr.detectChanges();

    this.apiService.getWhatsAppStatus(this.whatsAppLibraryId).subscribe({
      next: (res: any) => {
        this.isWhatsAppLoading = false;
        console.log('WhatsApp status response:', res);
        
        // Show status message in toaster
        if (res.message) {
          if (res.success || res.connected) {
            this.notificationService.showSuccess(res.message);
          } else {
            this.notificationService.showInfo(res.message);
          }
        } else if (res.state) {
          this.notificationService.showInfo(`Current WhatsApp State: ${res.state}`);
        }

        const statusUpper = (res.status || res.state || '').toUpperCase();
        const isConnected = res.connected || statusUpper === 'CONNECTED';

        if (isConnected) {
          this.whatsAppStatus = 'CONNECTED';
          this.qrCodeBase64 = '';
          this.stopPolling();
        } else if (res.qrCode || statusUpper === 'QR_RECEIVED' || statusUpper.startsWith('UNPAIRED')) {
          this.whatsAppStatus = 'QR_RECEIVED';
          this.qrCodeBase64 = res.qrCode ? this.sanitizer.bypassSecurityTrustResourceUrl(res.qrCode) : '';
          this.startPolling();
        } else if (statusUpper === 'INITIALIZING') {
          this.whatsAppStatus = 'INITIALIZING';
          this.stopPolling();
        } else {
          this.whatsAppStatus = 'DISCONNECTED';
          this.stopPolling();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isWhatsAppLoading = false;
        console.error('WhatsApp status error:', err);
        const errMsg = err.error?.message || err.message || 'Failed to retrieve WhatsApp status';
        this.notificationService.showError(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  startPolling() {
    if (this.whatsAppPollingSub) {
      return; // Already polling
    }

    this.whatsAppPollingSub = interval(3000).subscribe({
      next: () => {
        this.apiService.getWhatsAppStatus(this.whatsAppLibraryId).subscribe({
          next: (res: any) => {
            console.log('WhatsApp polling status update:', res);
            
            // Show all messages in toaster
            if (res.message) {
              this.notificationService.showInfo(res.message);
            }

            const statusUpper = (res.status || res.state || '').toUpperCase();
            const isConnected = res.connected || statusUpper === 'CONNECTED';

            if (isConnected) {
              this.whatsAppStatus = 'CONNECTED';
              this.qrCodeBase64 = '';
              this.stopPolling();
              this.notificationService.showSuccess('WhatsApp Connected Successfully!');
            } else if (res.qrCode || statusUpper === 'QR_RECEIVED' || statusUpper.startsWith('UNPAIRED')) {
              this.whatsAppStatus = 'QR_RECEIVED';
              if (res.qrCode) {
                this.qrCodeBase64 = this.sanitizer.bypassSecurityTrustResourceUrl(res.qrCode);
              }
            } else {
              this.whatsAppStatus = 'DISCONNECTED';
              this.stopPolling();
            }
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('WhatsApp polling error:', err);
          }
        });
      }
    });
  }

  stopPolling() {
    if (this.whatsAppPollingSub) {
      this.whatsAppPollingSub.unsubscribe();
      this.whatsAppPollingSub = null;
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
