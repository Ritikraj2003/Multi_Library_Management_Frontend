import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';

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
  profileImagePreview: string | ArrayBuffer | null = null;
  profileImageFile: File | null = null;


  get isCurrentUserSuperadmin(): boolean {
    return this.authService.currentUserValue?.isSuperadmin || false;
  }

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService
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
      
      if (this.userData.profileImage) {
        this.profileImagePreview = environment.apiUrl.replace('api/', '') + this.userData.profileImage;
      } else {
        this.profileImagePreview = null;
      }
    } else {
      this.isEdit = false;
      this.userForm.reset({ roleId: 2, isSuperadmin: false });
      this.profileImagePreview = null;
      this.profileImageFile = null;
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.profileImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  loadLibraries(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser?.isSuperadmin) {
      this.apiService.getAllLibraries().subscribe({
        next: (res) => {
          this.libraries = (res.data.items || (res.data ? [res.data] : [])).sort((a: any, b: any) => 
            (a.name || a.Name || '').localeCompare(b.name || b.Name || '')
          );
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
        this.roles = (res.data || []).sort((a: any, b: any) => 
          (a.name || a.roleName || a.Name || a.RoleName || '').localeCompare(b.name || b.roleName || b.Name || b.RoleName || '')
        );
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
    const formData = new FormData();
    const formValues = this.userForm.value;

    Object.keys(formValues).forEach(key => {
      if (formValues[key] !== null && formValues[key] !== undefined) {
        formData.append(key, formValues[key]);
      }
    });

    if (this.isEdit) {
      formData.append('id', this.userData.id.toString());
    }

    if (this.profileImageFile) {
      formData.append('profileImageFile', this.profileImageFile);
    }

    const request = this.isEdit 
      ? this.apiService.updateUser(formData)
      : this.apiService.createUser(formData);

    request.pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notificationService.showSuccess(this.isEdit ? 'User updated successfully' : 'User created successfully');
            this.saved.emit();
          }
        },
        error: (err) => {
          this.notificationService.showError('Error saving user');
          console.error('Error saving user:', err);
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}

