import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-general-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './general-setting.component.html',
  styleUrl: './general-setting.component.css'
})
export class GeneralSettingComponent implements OnInit {
  emailForm: FormGroup;
  razorpayForm: FormGroup;
  libraryId: number = 0;
  savingEmail = false;
  savingRazorpay = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.libraryId = this.authService.currentUserValue?.libraryId || 0;
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
  }

  ngOnInit(): void {
    this.loadSettings();
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
              alert('Email settings saved successfully!');
            }
          },
          error: (err: any) => {
            console.error(`Error for ${key}:`, err);
            this.savingEmail = false;
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
              alert('Razorpay settings saved successfully!');
            }
          },
          error: () => {
            this.savingRazorpay = false;
          }
        });
      });
    }
  }
}
