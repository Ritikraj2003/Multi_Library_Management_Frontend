import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-library-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './library-form.component.html',
  styleUrls: ['./library-form.component.css']
})
export class LibraryFormComponent implements OnInit {
  @Input() libraryData: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  libraryForm: FormGroup;
  loading = false;
  isEdit = false;
  
  libraryIconFile: File | null = null;
  documentImageFile: File | null = null;
  libraryIconPreview: string | ArrayBuffer | null = null;
  documentImagePreview: string | ArrayBuffer | null = null;


  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {
    this.libraryForm = this.fb.group({
      name: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      documentType: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.updateForm();
  }

  ngOnChanges(): void {
    this.updateForm();
  }

  private updateForm(): void {
    if (this.libraryData) {
      this.isEdit = true;
      this.libraryForm.patchValue(this.libraryData);
      this.libraryIconPreview = this.libraryData.libraryIcon ? environment.apiUrl.replace('api/', '') + this.libraryData.libraryIcon : null;
      this.documentImagePreview = this.libraryData.documentImage ? environment.apiUrl.replace('api/', '') + this.libraryData.documentImage : null;
    } else {
      this.isEdit = false;
      this.libraryForm.reset({ isActive: true });
      this.libraryIconFile = null;
      this.documentImageFile = null;
      this.libraryIconPreview = null;
      this.documentImagePreview = null;
    }
  }

  onFileChange(event: any, type: string): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'icon') {
          this.libraryIconFile = file;
          this.libraryIconPreview = reader.result;
        } else {
          this.documentImageFile = file;
          this.documentImagePreview = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.libraryForm.invalid) {
      this.markFormGroupTouched(this.libraryForm);
      return;
    }

    this.loading = true;
    const formData = new FormData();
    const formValue = this.libraryForm.value;

    Object.keys(formValue).forEach(key => {
      formData.append(key, formValue[key]);
    });

    if (this.libraryIconFile) {
      formData.append('libraryIconFile', this.libraryIconFile);
    }
    if (this.documentImageFile) {
      formData.append('documentImageFile', this.documentImageFile);
    }

    if (this.isEdit) {
      formData.append('id', this.libraryData.id);
    }

    const request = this.isEdit 
      ? this.apiService.updateLibrary(formData)
      : this.apiService.createLibrary(formData);

    request.pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.showSuccess(this.isEdit ? 'Library updated successfully' : 'Library created successfully');
            this.saved.emit(res.data);
          }
        },
        error: (err) => {
          this.notificationService.showError('Error saving library');
          console.error('Error saving library:', err);
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as any);
      }
    });
  }
}
