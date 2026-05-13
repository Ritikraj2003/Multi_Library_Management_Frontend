import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-library-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './library-form.component.html',
  styleUrls: ['./library-form.component.css']
})
export class LibraryFormComponent implements OnInit {
  @Input() libraryData: any = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  libraryForm: FormGroup;
  loading = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.libraryForm = this.fb.group({
      name: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
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
    } else {
      this.isEdit = false;
      this.libraryForm.reset({ isActive: true });
    }
  }

  onSubmit(): void {
    if (this.libraryForm.invalid) {
      this.markFormGroupTouched(this.libraryForm);
      return;
    }

    this.loading = true;
    const formData = this.libraryForm.value;

    const request = this.isEdit 
      ? this.apiService.updateLibrary(this.libraryData.id, formData)
      : this.apiService.createLibrary(formData);

    request.pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.saved.emit();
          }
        },
        error: (err) => console.error('Error saving library:', err)
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
