import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit, OnChanges {
  @Input() userData: any = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  userForm: FormGroup;
  loading = false;
  isEdit = false;
  libraries: any[] = [];
  roles: any[] = [];

  get isCurrentUserSuperadmin(): boolean {
    return this.authService.currentUserValue?.isSuperadmin || false;
  }

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roleId: [2, [Validators.required]], // Default to Admin
      libraryId: [null, [Validators.required]],
      isSuperadmin: [false]
    });
  }

  ngOnInit(): void {
    this.loadLibraries();
    this.updateForm();

    // Watch library changes to update roles
    this.userForm.get('libraryId')?.valueChanges.subscribe(libId => {
      if (libId) {
        this.loadRoles(libId);
      } else {
        this.roles = [];
      }
    });
  }

  ngOnChanges(): void {
    this.updateForm();
  }

  private updateForm(): void {
    if (this.userData) {
      this.isEdit = true;
      this.userForm.patchValue(this.userData);
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    } else {
      this.isEdit = false;
      this.userForm.reset({ roleId: 2, isSuperadmin: false });
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  loadLibraries(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser?.isSuperadmin) {
      this.apiService.getAllLibraries().subscribe({
        next: (res) => {
          this.libraries = res.data.items || (res.data ? [res.data] : []);
          this.handleLibraryLoaded();
        }
      });
    } else if (currentUser?.libraryId) {
      this.apiService.getLibraryById(currentUser.libraryId).subscribe({
        next: (res) => {
          this.libraries = res.data ? [res.data] : [];
          if (this.libraries.length > 0) {
            this.userForm.patchValue({ libraryId: currentUser.libraryId });
          }
          this.handleLibraryLoaded();
        }
      });
    }
  }

  private handleLibraryLoaded(): void {
    const currentLibId = this.userForm.get('libraryId')?.value;
    if (currentLibId) {
      this.loadRoles(currentLibId);
    }
  }

  loadRoles(libraryId: number): void {
    this.apiService.getRolesByLibraryId(libraryId).subscribe({
      next: (res) => {
        this.roles = res.data || [];
      },
      error: (err) => console.error('Error loading roles:', err)
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    this.loading = true;
    const formData = this.userForm.value;

    const request = this.isEdit 
      ? this.apiService.updateUser(this.userData.id, formData)
      : this.apiService.createUser(formData);

    request.pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.saved.emit();
          }
        },
        error: (err) => console.error('Error saving user:', err)
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}

