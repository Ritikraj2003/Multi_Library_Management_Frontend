import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-registration-renew',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-renew.component.html'
})
export class RegistrationRenewComponent implements OnInit {
  @Input() registrationId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  renewForm: FormGroup;
  loading = false;
  libraryId!: number;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.renewForm = this.fb.group({
      months: [1, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      paymentMode: ['Cash', [Validators.required]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
  }

  onSubmit(): void {
    if (this.renewForm.invalid) return;

    this.loading = true;
    const body = { 
      ...this.renewForm.value, 
      registrationId: this.registrationId,
      libraryId: this.libraryId,
      createdBy: this.authService.currentUserValue?.userId 
    };

    this.apiService.renewRegistration(body)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.saved.emit();
          } else {
            alert(res.message);
          }
        },
        error: (err: any) => console.error('Error renewing registration:', err)
      });
  }
}
