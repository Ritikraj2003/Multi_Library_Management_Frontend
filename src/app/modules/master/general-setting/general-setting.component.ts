import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, interval } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';

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
    private authService: AuthService,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
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
            const settings: any[] = res.data;
            settings.forEach(s => {
              if (s.key === 'email') this.emailForm.patchValue({ email: s.value });
              if (s.key === 'password') this.emailForm.patchValue({ password: s.value });
              if (s.key === 'host') this.emailForm.patchValue({ host: s.value });
              if (s.key === 'port') this.emailForm.patchValue({ port: s.value });
              if (s.key === 'keyId') this.razorpayForm.patchValue({ keyId: s.value });
              if (s.key === 'keySecret') this.razorpayForm.patchValue({ keySecret: s.value });
            });
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
    console.log('onSaveEmail triggered');
    console.log('Form valid:', this.emailForm.valid);
    console.log('Form values:', this.emailForm.value);
    console.log('Library ID:', this.libraryId);

    if (this.emailForm.valid) {
      this.savingEmail = true;
      const values = this.emailForm.value;
      const keys = Object.keys(values);
      
      let completed = 0;
      keys.forEach(key => {
        console.log(`Upserting ${key}: ${values[key]}`);
        this.apiService.upsertSetting({
          libraryId: this.libraryId,
          key: key,
          value: values[key]
        }).subscribe({
          next: (res: any) => {
            console.log(`Response for ${key}:`, res);
            completed++;
            if (completed === keys.length) {
              this.savingEmail = false;
              this.notificationService.showSuccess('Email settings saved successfully!');
              this.cdr.detectChanges();
            }
          },
          error: (err: any) => {
            console.error(`Error for ${key}:`, err);
            this.savingEmail = false;
            this.cdr.detectChanges();
          }
        });
      });
    } else {
      console.warn('Form is invalid. Errors:', this.getFormErrors(this.emailForm));
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
      const values = this.razorpayForm.value;
      const keys = Object.keys(values);

      let completed = 0;
      keys.forEach(key => {
        this.apiService.upsertSetting({
          libraryId: this.libraryId,
          key: key,
          value: values[key]
        }).subscribe({
          next: () => {
            completed++;
            if (completed === keys.length) {
              this.savingRazorpay = false;
              this.notificationService.showSuccess('Razorpay settings saved successfully!');
              this.cdr.detectChanges();
            }
          },
          error: () => {
            this.savingRazorpay = false;
            this.cdr.detectChanges();
          }
        });
      });
    }
  }

  fetchCurrentLocation() {
    if (!navigator.geolocation) {
      this.notificationService.showError('Geolocation is not supported by this browser.');
      return;
    }
    this.fetchingLocation = true;
    this.cdr.detectChanges();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.attendanceLocationForm.patchValue({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          this.fetchingLocation = false;
          this.notificationService.showSuccess('Location fetched successfully!');
          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.fetchingLocation = false;
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
