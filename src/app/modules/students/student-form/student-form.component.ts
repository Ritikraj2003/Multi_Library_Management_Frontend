import { Component, EventEmitter, Input, OnInit, Output, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification.service';
import { LoaderService } from '../../../shared/services/loader.service';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-form.component.html',
  styleUrls: ['./student-form.component.css']
})
export class StudentFormComponent implements OnInit, OnChanges {
  @Input() studentData: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  studentForm: FormGroup;
  loading = false;
  isEdit = false;
  libraries: any[] = [];
  studentImageFile: File | null = null;
  documentImageFile: File | null = null;
  studentImagePreview: string | ArrayBuffer | null = null;
  documentImagePreview: string | ArrayBuffer | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef
  ) {
    this.studentForm = this.fb.group({
      fullName: ['', [Validators.required]],
      fatherName: ['', [Validators.required]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.email]],
      gender: ['', [Validators.required]],
      address: ['', [Validators.required]],
      documentType: ['', [Validators.required]],
      dob: ['', [Validators.required]],
      libraryId: [null, [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadLibraries();
    this.updateForm();
  }

  ngOnChanges(): void {
    this.updateForm();
  }

  private updateForm(): void {
    if (this.studentData) {
      this.isEdit = true;
      // Convert date if necessary
      const formattedData = { ...this.studentData };
      if (formattedData.dob) {
        formattedData.dob = new Date(formattedData.dob).toISOString().substring(0, 10);
      }
      formattedData.gender = formattedData.gender ?? formattedData.Gender ?? '';
      this.studentForm.patchValue(formattedData);
      this.studentImagePreview = formattedData.photo ? environment.apiUrl.replace('api/', '') + formattedData.photo : null;
      this.documentImagePreview = formattedData.documentImage ? environment.apiUrl.replace('api/', '') + formattedData.documentImage : null;
    } else {
      this.isEdit = false;
      this.studentForm.reset({ isActive: true, gender: '' });
      this.studentImageFile = null;
      this.documentImageFile = null;
      this.studentImagePreview = null;
      this.documentImagePreview = null;
      // Re-apply library restriction if needed
      if (!this.authService.currentUserValue?.isSuperadmin) {
        this.studentForm.patchValue({ libraryId: this.authService.currentUserValue?.libraryId });
      }
    }
  }

  loadLibraries(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser?.isSuperadmin) {
      this.apiService.getAllLibraries().subscribe({
        next: (res: any) => {
          this.libraries = (res.data.items || (res.data ? [res.data] : [])).sort((a: any, b: any) => 
            (a.name || a.Name || '').localeCompare(b.name || b.Name || '')
          );
        }
      });
    } else if (currentUser?.libraryId) {
      this.apiService.getLibraryById(currentUser.libraryId).subscribe({
        next: (res: any) => {
          this.libraries = res.data ? [res.data] : [];
          if (this.libraries.length > 0) {
            this.studentForm.patchValue({ libraryId: currentUser.libraryId });
          }
        }
      });
    }
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
    if (this.studentForm.invalid) {
      this.markFormGroupTouched(this.studentForm);
      return;
    }

    this.loading = true;
    this.loaderService.show();
    const formData = new FormData();
    const formValue = this.studentForm.value;

    Object.keys(formValue).forEach(key => {
      formData.append(key, formValue[key]);
    });

    if (this.studentImageFile) {
      formData.append('studentImage', this.studentImageFile);
    }
    if (this.documentImageFile) {
      formData.append('documentImage', this.documentImageFile);
    }

    if (this.isEdit) {
      formData.append('id', this.studentData.id);
    }

    const request = this.isEdit 
      ? this.apiService.updateStudent(formData)
      : this.apiService.createStudent(formData);

    request.pipe(finalize(() => {
      this.loading = false;
      this.loaderService.hide();
      this.cdr.markForCheck();
    }))
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.notificationService.showSuccess(this.isEdit ? 'Student updated successfully' : 'Student created successfully');
            this.saved.emit({ isEdit: this.isEdit, response: res });
          } else {
            this.notificationService.showError(res?.message || 'Failed to save student');
          }
        },
        error: (err: any) => {
          const errMsg = err?.error?.message || err?.message || 'Error saving student';
          this.notificationService.showError(errMsg);
          console.error('Error saving student:', err);
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}
