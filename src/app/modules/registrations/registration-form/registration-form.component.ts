import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-form.component.html'
})
export class RegistrationFormComponent implements OnInit, OnChanges {
  @Input() registrationData: any = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  regForm: FormGroup;
  loading = false;
  isEdit = false;
  students: any[] = [];
  seats: any[] = [];
  batches: any[] = [];
  libraryId!: number;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.regForm = this.fb.group({
      studentId: [null, [Validators.required]],
      tableSeatId: [null, [Validators.required]],
      batchId: [null, [Validators.required]],
      startDate: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      monthlyAmount: [0, [Validators.required, Validators.min(0)]],
      securityAmount: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
      paymentMode: ['Cash', [Validators.required]],
      isActiveStatus: [true]
    });

    this.regForm.get('tableSeatId')?.valueChanges.subscribe(seatId => {
      if (seatId) {
        this.checkSeatAvailability(seatId);
      } else {
        this.batches = [];
        this.regForm.get('batchId')?.setValue(null);
      }
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadDropdowns();
    this.updateForm();
  }

  ngOnChanges(): void {
    this.updateForm();
  }

  private updateForm(): void {
    if (this.registrationData) {
      this.isEdit = true;
      const data = { ...this.registrationData };
      if (data.startDate) data.startDate = new Date(data.startDate).toISOString().substring(0, 10);
      if (data.dueDate) data.dueDate = new Date(data.dueDate).toISOString().substring(0, 10);
      
      // Load batches for the existing seat and then patch the batchId
      if (data.tableSeatId) {
        this.checkSeatAvailability(data.tableSeatId, data.batchId, data.id);
      }
      
      
      this.regForm.patchValue({
        ...data,
        isActiveStatus: data.status === 'Active'
      }, { emitEvent: false });
      this.regForm.get('studentId')?.disable();
      this.regForm.get('tableSeatId')?.disable();
    } else {
      this.isEdit = false;
      this.regForm.enable();
      this.regForm.reset({ paymentMode: 'Cash', monthlyAmount: 0, securityAmount: 0 });
    }
  }

  loadDropdowns(): void {
    const params = this.authService.currentUserValue?.isSuperadmin ? {} : { LibraryId: this.libraryId };
    
    this.apiService.getAllStudents(params).subscribe(res => this.students = res.data.items || []);
    
    // Load all active seats (ignoring global IsOccupied as we now check per batch)
    this.apiService.getAllTables({ ...params, IsActive: true }).subscribe(res => {
      this.seats = res.data.items || [];
    });

    // We don't load all batches globally anymore if we want to filter by seat
    // But we might want to load them all first and then disable occupied ones
    this.apiService.getBatchesByLibraryId(this.libraryId).subscribe(res => this.batches = res.data || []);
  }

  checkSeatAvailability(seatId: number, patchBatchId?: number, registrationId?: number): void {
    this.apiService.getSeatAvailability(seatId, this.libraryId, registrationId).subscribe(res => {
      if (res.success) {
        this.batches = res.data.batches;
        
        if (patchBatchId) {
          this.regForm.get('batchId')?.setValue(patchBatchId);
        } else {
          // Optionally: if currently selected batch is occupied, reset it
          const currentBatchId = this.regForm.get('batchId')?.value;
          const currentBatch = this.batches.find(b => (b.id || b.batchId) === currentBatchId);
          if (currentBatch && currentBatch.isOccupied) {
            this.regForm.get('batchId')?.setValue(null);
          }
        }
      }
    });
  }

  onSubmit(): void {
    if (this.regForm.invalid) {
      Object.values(this.regForm.controls).forEach(c => c.markAsTouched());
      return;
    }

    this.loading = true;
    const body = { 
      ...this.regForm.getRawValue(), 
      libraryId: this.libraryId,
      createdBy: this.authService.currentUserValue?.userId 
    };

    if (this.isEdit) {
      body.status = body.isActiveStatus ? 1 : 3; // 1: Active, 3: Cancelled
    }
    delete body.isActiveStatus;

    const request = this.isEdit 
      ? this.apiService.updateRegistration(this.registrationData.id, body)
      : this.apiService.createRegistration(body);

    request.pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.saved.emit();
          } else {
            alert(res.message);
          }
        },
        error: (err: any) => console.error('Error saving registration:', err)
      });
  }
}
