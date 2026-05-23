import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { finalize } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-public-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './public-registration.component.html',
  styles: [`
    .registration-container {
      min-height: 100vh;
      background: #f0fdfa; /* light teal background */
      background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
      padding: 2rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .form-card {
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 800px;
      overflow: hidden;
      margin: 0 auto;
    }
    .form-header {
      background: linear-gradient(135deg, #27c1bb 0%, #1a9e99 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .form-body {
      padding: 2rem;
    }
    .form-control {
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    .form-control:focus {
      box-shadow: 0 0 0 3px rgba(39, 193, 187, 0.25); /* Teal focus shadow */
      border-color: #27c1bb;
    }
    .btn-submit {
      background: #27c1bb; /* Teal button */
      color: white;
      padding: 1rem 2rem;
      border-radius: 0.75rem;
      font-weight: 600;
      transition: all 0.3s ease;
      width: 100%;
      border: none;
    }
    .btn-submit:hover {
      background: #20a7a1;
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(39, 193, 187, 0.4);
    }
    .preview-img {
      max-width: 100%;
      max-height: 150px;
      object-fit: contain;
      border-radius: 0.75rem;
      margin-top: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .success-container {
      text-align: center;
      padding: 3rem;
    }
    .success-icon {
      font-size: 5rem;
      color: #27c1bb;
      margin-bottom: 1.5rem;
    }
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-user-select: none;
    }
    .loader-content {
      background: white;
      padding: 2.5rem 3rem;
      border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .loader-text {
      font-weight: 600;
      color: #2d3748;
      font-size: 1.1rem;
      margin-top: 1rem !important;
      user-select: none;
      -webkit-user-select: none;
    }
    @keyframes zoomIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    @media (max-width: 768px) {
      .registration-container { padding: 1rem; }
      .form-card { border-radius: 1rem; }
      .form-header { padding: 1.5rem 1rem; }
      .form-body { padding: 1.5rem 1rem; }
      .row.g-4 > [class^="col-"] { margin-top: 1rem; }
    }
    @media (max-width: 576px) {
      .registration-container { padding: 0.5rem; background: white; }
      .form-card { border-radius: 0; box-shadow: none; border: none; }
      .form-header { border-radius: 1rem; margin-bottom: 1rem; }
      .form-body { padding: 1rem 0; }
    }
  `]
})
export class PublicRegistrationComponent implements OnInit {
  regForm: FormGroup;
  libraryId!: number;
  loading = false;
  submitted = false;
  enrollmentNumber = '';
  
  studentImageFile: File | null = null;
  documentImageFile: File | null = null;
  studentImagePreview: string | ArrayBuffer | null = null;
  documentImagePreview: string | ArrayBuffer | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {
    this.regForm = this.fb.group({
      fullName: ['', [Validators.required]],
      fatherName: ['', [Validators.required]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.email]],
      address: ['', [Validators.required]],
      dob: ['', [Validators.required]],
      documentType: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.libraryId = +params['libraryId'];
    });
  }

  onFileChange(event: any, type: string): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'student') {
          this.studentImageFile = file;
          this.studentImagePreview = reader.result;
        } else {
          this.documentImageFile = file;
          this.documentImagePreview = reader.result;
        }
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.regForm.invalid) {
      Object.values(this.regForm.controls).forEach(c => c.markAsTouched());
      this.scrollToFirstInvalid();
      this.notificationService.showError('Please fill in all the required fields correctly.');
      return;
    }

    this.loading = true;
    const formData = new FormData();
    const formValue = this.regForm.value;

    Object.keys(formValue).forEach(key => {
      formData.append(key, formValue[key]);
    });
    
    formData.append('libraryId', this.libraryId.toString());

    if (this.studentImageFile) {
      formData.append('studentImage', this.studentImageFile);
    }
    if (this.documentImageFile) {
      formData.append('documentImage', this.documentImageFile);
    }

    this.apiService.createStudent(formData)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) {
            this.submitted = true;
            
            // Extremely robust ID extraction
            let finalId = 'N/A';
            
            if (res.data) {
              finalId = res.data.id ?? res.data.Id ?? res.data.studentId ?? res.data.StudentId ?? finalId;
            }
            
            if (finalId === 'N/A') {
              finalId = res.id ?? res.Id ?? res.studentId ?? res.StudentId ?? finalId;
            }
            
            this.enrollmentNumber = finalId.toString();
            console.log('Assigned ID:', this.enrollmentNumber);
            this.notificationService.showSuccess('Registration submitted successfully!');
            
            this.cdr.detectChanges(); 
            
            // Show modal with a slight delay
            setTimeout(() => {
              this.showSuccessModal();
            }, 200);
          } else {
            this.notificationService.showError(res.message || 'Registration failed. Please try again.');
          }
        },
        error: (err: any) => {
          this.loading = false;
          console.error('Registration error:', err);
          this.notificationService.showError('Something went wrong. Please check your connection.');
        }
      });
  }

  showSuccessModal(): void {
    const el = document.getElementById('successModal');
    if (el) {
      const modal = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
      modal.show();
    }
  }

  resetForm(): void {
    window.location.reload();
  }

  scrollToFirstInvalid(): void {
    setTimeout(() => {
      const firstInvalidControl = document.querySelector('.is-invalid, .ng-invalid[formControlName]');
      if (firstInvalidControl) {
        firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstInvalidControl instanceof HTMLElement) {
          firstInvalidControl.focus();
        }
      }
    }, 100);
  }
}
