import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';
import { LoaderService } from '../../../shared/services/loader.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { environment } from '../../../../environments/environment';

declare const Razorpay: any;

interface LibraryCheckoutInfo {
  name: string;
  address?: string;
  city?: string;
  mobile?: string;
  email?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-form.component.html'
})
export class RegistrationFormComponent implements OnInit, OnChanges {
  @Input() registrationData: any = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  regForm: FormGroup;
  loading = false;
  isEdit = false;
  students: any[] = [];
  filteredStudents: any[] = [];
  activeRegistrationStudentIds = new Set<number>();
  searchTerm: string = '';
  seats: any[] = [];
  batches: any[] = [];
  libraryId!: number;
  isRazorpayVerified = false;
  libraryCheckout: LibraryCheckoutInfo = { name: 'Library' };

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private notificationService: NotificationService
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
      rfidCode: [''],
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

    this.regForm.get('startDate')?.valueChanges.subscribe(startDate => {
      if (startDate) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + 1);
        const dueDateStr = date.toISOString().substring(0, 10);
        this.regForm.get('dueDate')?.setValue(dueDateStr, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.libraryCheckout.name = this.authService.currentUserValue?.libraryName || 'Library';
    this.loadLibraryDetails();
    this.loadDropdowns();
    this.loadRazorpayStatus();
    this.updateForm();
  }

  private loadLibraryDetails(): void {
    const current = this.authService.currentUserValue;
    if (!current) return;

    const baseUrl = environment.apiUrl.replace(/api\/?$/, '');
    const icon = current.libraryIcon;
    this.libraryCheckout = {
      name: current.libraryName || this.libraryCheckout.name,
      imageUrl: icon ? `${baseUrl}${icon.startsWith('/') ? icon : '/' + icon}` : undefined
    };
  }

  private loadRazorpayStatus(): void {
    if (this.libraryId <= 0) return;
    this.apiService.isRazorpayVerified(this.libraryId).subscribe({
      next: (res: any) => {
        this.isRazorpayVerified = res.success && !!(res.data ?? res.Data);
        this.syncPaymentModeWithRazorpayStatus();
      },
      error: () => {
        this.isRazorpayVerified = false;
        this.syncPaymentModeWithRazorpayStatus();
      }
    });
  }

  private syncPaymentModeWithRazorpayStatus(): void {
    const mode = this.regForm.get('paymentMode')?.value;
    if (!this.isRazorpayVerified && mode === 'Razorpay') {
      this.regForm.patchValue({ paymentMode: 'Cash' });
    }
    if (mode === 'Cheque') {
      this.regForm.patchValue({ paymentMode: 'Cash' });
    }
  }

  ngOnChanges(): void {
    this.updateForm();
  }

  private updateForm(): void {
    if (this.registrationData) {
      const data = { ...this.registrationData };

      // Handle PascalCase vs camelCase from different APIs
      const startDate = data.startDate || data.StartDate;
      const dueDate = data.dueDate || data.DueDate;
      const tableSeatId = data.tableSeatId || data.TableSeatId;
      const batchId = data.batchId || data.BatchId;
      const id = data.id || data.Id;
      const status = data.status || data.Status;
      const monthlyAmount = data.monthlyAmount || data.MonthlyAmount;
      const securityAmount = data.securityAmount || data.SecurityAmount;
      const notes = data.notes || data.Notes;

      if (id) {
        // --- EDIT MODE: full existing registration ---
        this.isEdit = true;

        if (startDate) data.startDate = new Date(startDate).toISOString().substring(0, 10);
        if (dueDate) data.dueDate = new Date(dueDate).toISOString().substring(0, 10);

        if (tableSeatId) {
          this.checkSeatAvailability(tableSeatId, batchId, id);
        }

        this.regForm.patchValue({
          studentId: data.studentId || data.StudentId,
          tableSeatId: tableSeatId,
          batchId: batchId,
          startDate: data.startDate,
          dueDate: data.dueDate,
          monthlyAmount: monthlyAmount,
          securityAmount: securityAmount,
          notes: notes,
          rfidCode: data.rfidCode || data.RfidCode || data.RFIDCode || '',
          isActiveStatus: status === 'Active' || status === 1
        }, { emitEvent: false });

        const student = this.students.find(s => s.id === (data.studentId || data.StudentId));
        if (student) {
          this.searchTerm = `${student.fullName} (${student.mobile})`;
        } else if (data.studentName || data.fullName || data.FullName) {
          this.searchTerm = `${data.studentName || data.fullName || data.FullName} (${data.mobile || data.Mobile || ''})`;
        }

        this.regForm.get('studentId')?.disable({ emitEvent: false });
        this.regForm.get('tableSeatId')?.disable({ emitEvent: false });

      } else {
        // --- NEW FORM with pre-selected seat & batch (from Seating Layout click) ---
        this.isEdit = false;
        this.searchTerm = '';
        this.regForm.enable();
        this.regForm.reset({ paymentMode: 'Cash', monthlyAmount: 0, securityAmount: 0 });

        // Pre-fill seat & batch, then trigger availability check
        if (tableSeatId) {
          this.regForm.patchValue({ tableSeatId, batchId }, { emitEvent: false });
          this.checkSeatAvailability(tableSeatId, batchId);
        }
      }
    } else {
      this.isEdit = false;
      this.searchTerm = '';
      this.regForm.enable();
      this.regForm.reset({ paymentMode: 'Cash', monthlyAmount: 0, securityAmount: 0 });
    }
  }

  closeDropdown(): void {
    setTimeout(() => {
      this.filteredStudents = [];
    }, 200);
  }

  private loadActiveRegistrationStudentIds(): void {
    if (this.libraryId <= 0) return;
    this.apiService.getActiveRegistrationStudentIds(this.libraryId).subscribe({
      next: (res: any) => {
        const ids: number[] = res.data ?? res.Data ?? [];
        this.activeRegistrationStudentIds = new Set(ids);
        this.applyActiveRegistrationFlags();
        if (this.searchTerm && !this.isEdit) {
          const selectedId = this.regForm.get('studentId')?.value;
          const selected = this.students.find(s => s.id === selectedId);
          if (selected) {
            this.searchTerm = this.getStudentDisplayLabel(selected);
          }
        }
      }
    });
  }

  private applyActiveRegistrationFlags(): void {
    this.students = this.students.map(s => ({
      ...s,
      hasActiveRegistration: this.activeRegistrationStudentIds.has(s.id)
    }));
    if (this.filteredStudents.length > 0) {
      this.filteredStudents = this.filteredStudents.map(s => ({
        ...s,
        hasActiveRegistration: this.activeRegistrationStudentIds.has(s.id)
      }));
    }
  }

  getStudentDisplayLabel(student: { fullName: string; mobile: string; hasActiveRegistration?: boolean }): string {
    const base = `${student.fullName} (${student.mobile})`;
    return student.hasActiveRegistration ? `${base} (Active Registration)` : base;
  }

  get selectedStudentHasActiveRegistration(): boolean {
    if (this.isEdit) return false;
    const studentId = this.regForm.get('studentId')?.value;
    if (!studentId) return false;
    const student = this.students.find(s => s.id === studentId);
    return !!(student?.hasActiveRegistration || this.activeRegistrationStudentIds.has(studentId));
  }

  loadDropdowns(): void {
    const params: any = this.authService.currentUserValue?.isSuperadmin ? {} : { LibraryId: this.libraryId };
    params.PageSize = 1000; // Increase page size to get all students
    
    this.apiService.getAllStudents(params).subscribe(res => {
      const data = res.data?.items || res.data?.Items || [];
      this.students = data.map((s: any) => ({
        id: s.id ?? s.Id,
        fullName: s.fullName ?? s.FullName,
        mobile: s.mobile ?? s.Mobile,
        hasActiveRegistration: false
      }));
      this.applyActiveRegistrationFlags();
      this.filteredStudents = [...this.students];

      if (this.isEdit) {
        this.updateForm();
      }
    });

    this.loadActiveRegistrationStudentIds();
    
    // Load all active seats (ignoring global IsOccupied as we now check per batch)
    this.apiService.getAllTables({ ...params, IsActive: true }).subscribe(res => {
      const data = res.data?.items || res.data?.Items || [];
      this.seats = data.map((s: any) => ({
        id: s.id ?? s.Id,
        seatNumber: s.seatNumber ?? s.SeatNumber,
        tableNumber: s.tableNumber ?? s.TableNumber,
        floorName: s.floorName ?? s.FloorName ?? s.Floors?.Name
      }));
    });

    // We don't load all batches globally anymore if we want to filter by seat
    // But we might want to load them all first and then disable occupied ones
    this.apiService.getBatchesByLibraryId(this.libraryId).subscribe(res => {
      const data = res.data || [];
      this.batches = (Array.isArray(data) ? data : []).map((b: any) => ({
        id: b.id ?? b.Id,
        name: b.name ?? b.Name,
        isOccupied: b.isOccupied ?? b.IsOccupied
      }));
    });
  }

  checkSeatAvailability(seatId: number, patchBatchId?: number, registrationId?: number): void {
    const libId = this.libraryId || this.authService.currentUserValue?.libraryId || 0;
    this.apiService.getSeatAvailability(seatId, libId, registrationId).subscribe(res => {
      if (res.success) {
        const batchData = res.data.batches || res.data.Batches || [];
        const processedBatches = batchData.map((b: any) => {
          let st = b.startTime ?? b.StartTime ?? '';
          let et = b.endTime ?? b.EndTime ?? '';
          
          const bt = b.batchTime ?? b.BatchTime ?? '';
          if (!st && bt.includes('-')) {
            const parts = bt.split('-').map((p: string) => p.trim());
            st = parts[0];
            et = parts[1];
          }

          return {
            id: b.id ?? b.Id ?? b.batchId ?? b.BatchId,
            name: b.name ?? b.Name ?? b.batchName ?? b.BatchName,
            batchTime: bt || (st ? `${st} - ${et}` : ''),
            startTime: st,
            endTime: et,
            isOccupied: b.isOccupied ?? b.IsOccupied,
            isDirectlyOccupied: b.isDirectlyOccupied ?? b.IsDirectlyOccupied ?? false
          };
        });

        // Apply overlap logic: ONLY check overlaps against batches that are DIRECTLY booked
        const directlyOccupiedBatches = processedBatches.filter((b: any) => b.isDirectlyOccupied);
        
        this.batches = processedBatches.map((b: any) => {
          // If it's already directly occupied, or the server already says it's occupied (overlap), keep it.
          if (b.isOccupied) {
            // If it's occupied but NOT directly, it means it's an overlap
            if (!b.isDirectlyOccupied && !b.name.includes('(Time Overlap)')) {
              return { ...b, name: `${b.name} (Time Overlap)` };
            }
            return b;
          }
          
          // Double check overlap on client side against directly booked shifts
          const hasOverlap = directlyOccupiedBatches.some((occ: any) => 
            this.isOverlapping(b.startTime, b.endTime, occ.startTime, occ.endTime)
          );
          
          if (hasOverlap) {
            return { ...b, isOccupied: true, name: `${b.name} (Time Overlap)` };
          }
          return b;
        });
        
        if (patchBatchId) {
          this.regForm.get('batchId')?.setValue(patchBatchId);
        } else {
          const currentBatchId = this.regForm.get('batchId')?.value;
          const currentBatch = this.batches.find(b => b.id === currentBatchId);
          if (currentBatch && currentBatch.isOccupied) {
            this.regForm.get('batchId')?.setValue(null);
          }
        }
      }
    });
  }

  filterStudents(term: string): void {
    this.searchTerm = term;
    if (!term) {
      this.filteredStudents = [...this.students];
      this.regForm.get('studentId')?.setValue(null);
      return;
    }

    const lowTerm = term.toLowerCase();
    
    // If the term exactly matches a selected student's display string, don't show dropdown
    const selectedId = this.regForm.get('studentId')?.value;
    const selectedStudent = this.students.find(s => s.id === selectedId);
    const displayString = selectedStudent ? this.getStudentDisplayLabel(selectedStudent).toLowerCase() : '';
    
    if (lowTerm === displayString) {
      this.filteredStudents = [];
      return;
    }

    this.filteredStudents = this.students.filter(s => 
      s.fullName.toLowerCase().includes(lowTerm) || 
      s.mobile.includes(lowTerm) ||
      s.id.toString().includes(lowTerm)
    );
  }

  selectStudent(student: any): void {
    this.regForm.get('studentId')?.setValue(student.id);
    const withFlag = {
      ...student,
      hasActiveRegistration: this.activeRegistrationStudentIds.has(student.id)
    };
    this.searchTerm = this.getStudentDisplayLabel(withFlag);
    this.filteredStudents = [];
    if (withFlag.hasActiveRegistration) {
      this.notificationService.showWarning('This student already has an active registration.');
    }
  }

  isStudentSelected(term: string): boolean {
    const selectedId = this.regForm.get('studentId')?.value;
    if (!selectedId) return false;
    const selectedStudent = this.students.find(s => s.id === selectedId);
    if (!selectedStudent) return false;
    return term.toLowerCase() === this.getStudentDisplayLabel(selectedStudent).toLowerCase();
  }

  private timeToMinutes(time: string): number {
    if (!time) return 0;
    // Handle both "06:00" and "06:00:00"
    const parts = time.split(':').map(Number);
    if (parts.length < 2) return 0;
    return parts[0] * 60 + parts[1];
  }

  private isOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
    if (!start1 || !end1 || !start2 || !end2) return false;
    const s1 = this.timeToMinutes(start1);
    let e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    let e2 = this.timeToMinutes(end2);
    
    // Avoid marking as overlap if times are essentially missing/invalid
    if (s1 === 0 && e1 === 0) return false;
    if (s2 === 0 && e2 === 0) return false;

    // Handle overnight shifts if any (though usually not in library)
    if (e1 <= s1) e1 += 1440; 
    if (e2 <= s2) e2 += 1440;

    return s1 < e2 && s2 < e1;
  }

  onSubmit(): void {
    if (this.regForm.invalid) {
      Object.values(this.regForm.controls).forEach(c => c.markAsTouched());
      return;
    }

    if (!this.isEdit) {
      const studentId = this.regForm.get('studentId')?.value;
      if (!studentId) {
        this.notificationService.showError('Please select a student.');
        return;
      }
      this.apiService.hasActiveRegistration(studentId).subscribe({
        next: (res: any) => {
          const hasActive = res.success && !!(res.data ?? res.Data);
          if (hasActive) {
            this.activeRegistrationStudentIds.add(studentId);
            this.applyActiveRegistrationFlags();
            const student = this.students.find(s => s.id === studentId);
            if (student) {
              this.searchTerm = this.getStudentDisplayLabel({ ...student, hasActiveRegistration: true });
            }
            this.notificationService.showError('Student already has an active registration. Cannot register again.');
            return;
          }
          this.proceedAfterActiveCheck();
        },
        error: () => {
          if (this.selectedStudentHasActiveRegistration) {
            this.notificationService.showError('Student already has an active registration. Cannot register again.');
            return;
          }
          this.proceedAfterActiveCheck();
        }
      });
      return;
    }

    this.proceedAfterActiveCheck();
  }

  private proceedAfterActiveCheck(): void {
    if (!this.isEdit && this.regForm.get('paymentMode')?.value === 'Razorpay') {
      this.startRazorpayPayment();
      return;
    }
    this.submitRegistration();
  }

  private startRazorpayPayment(): void {
    const values = this.regForm.getRawValue();
    const amount = Number(values.monthlyAmount || 0) + Number(values.securityAmount || 0);
    if (amount <= 0) {
      this.notificationService.showError('Total amount must be greater than zero for Razorpay payment.');
      return;
    }

    if (typeof Razorpay === 'undefined') {
      this.notificationService.showError('Razorpay SDK failed to load. Please refresh the page.');
      return;
    }

    this.loading = true;
    this.loaderService.show();

    this.apiService.createRazorpayOrder({
      libraryId: this.libraryId,
      amount,
      currency: 'INR'
    }).subscribe({
      next: (orderRes: any) => {
        if (!orderRes?.success) {
          this.loading = false;
          this.loaderService.hide();
          this.notificationService.showError(orderRes?.message || 'Could not create Razorpay order.');
          return;
        }

        const options = this.buildRazorpayOptions(orderRes, amount);

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (err: any) => {
          this.loading = false;
          this.loaderService.hide();
          const msg = err?.error?.description || err?.error?.reason || 'Payment failed.';
          this.notificationService.showError(msg);
        });
        this.loading = false;
        this.loaderService.hide();
        rzp.open();
      },
      error: (err: any) => {
        this.loading = false;
        this.loaderService.hide();
        const msg = typeof err === 'string' ? err : (err?.error?.message || 'Failed to start Razorpay payment.');
        this.notificationService.showError(msg);
      }
    });
  }

  private buildRazorpayOptions(orderRes: any, amount: number): Record<string, unknown> {
    const lib = this.libraryCheckout;
    const studentId = this.regForm.get('studentId')?.value;
    const student = this.students.find(s => s.id === studentId);
    const location = [lib.address, lib.city].filter(Boolean).join(', ');
    const descriptionParts = ['Student registration fee'];
    if (location) descriptionParts.push(location);
    if (student?.mobile) {
      descriptionParts.push(`Contact: ${student.mobile}`);
    } else if (lib.mobile) {
      descriptionParts.push(`Contact: ${lib.mobile}`);
    }

    const options: Record<string, unknown> = {
      key: orderRes.key,
      amount: orderRes.amount,
      currency: orderRes.currency || 'INR',
      name: lib.name,
      description: descriptionParts.join(' • '),
      order_id: orderRes.orderId,
      handler: (response: any) => this.onRazorpaySuccess(response),
      notes: {
        library_id: String(this.libraryId),
        library_name: lib.name,
        ...(student?.mobile ? { library_mobile: student.mobile } : lib.mobile ? { library_mobile: lib.mobile } : {}),
        ...(student?.email ? { library_email: student.email } : lib.email ? { library_email: lib.email } : {}),
        amount_inr: String(amount)
      },
      modal: {
        ondismiss: () => {
          this.loading = false;
          this.loaderService.hide();
          this.notificationService.showWarning('Payment cancelled. Registration was not created.');
        }
      }
    };

    if (lib.imageUrl) {
      options['image'] = lib.imageUrl;
    }

    if (student) {
      options['prefill'] = {
        name: student.fullName,
        contact: student.mobile,
        email: student.email || ''
      };
    }

    return options;
  }

  private onRazorpaySuccess(response: any): void {
    this.loading = true;
    this.loaderService.show();
    this.apiService.verifyRazorpayPayment({
      libraryId: this.libraryId,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpayOrderId: response.razorpay_order_id,
      razorpaySignature: response.razorpay_signature
    }).subscribe({
      next: (verifyRes: any) => {
        const verified = verifyRes?.success === true || verifyRes?.Success === true;
        if (verified) {
          this.submitRegistration({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id
          });
        } else {
          this.endLoading();
          this.notificationService.showError(verifyRes?.message || 'Payment verification failed. Registration was not created.');
        }
      },
      error: (err: any) => {
        this.endLoading();
        const msg = typeof err === 'string' ? err : (err?.error?.message || 'Payment verification failed.');
        this.notificationService.showError(msg);
      }
    });
  }

  private endLoading(): void {
    this.loading = false;
    this.loaderService.hide();
  }

  private submitRegistration(razorpay?: { razorpayPaymentId: string; razorpayOrderId: string }): void {
    this.loading = true;
    if (!razorpay) {
      this.loaderService.show();
    }
    const body: any = {
      ...this.regForm.getRawValue(),
      libraryId: this.libraryId,
      createdBy: this.authService.currentUserValue?.userId
    };

    if (razorpay) {
      body.razorpayPaymentId = razorpay.razorpayPaymentId;
      body.razorpayOrderId = razorpay.razorpayOrderId;
    }

    if (this.isEdit) {
      body.status = body.isActiveStatus ? 1 : 3;
    }
    delete body.isActiveStatus;

    const request = this.isEdit
      ? this.apiService.updateRegistration(this.registrationData.id, body)
      : this.apiService.createRegistration(body);

    request.pipe(finalize(() => this.endLoading())).subscribe({
      next: (res: any) => {
        const ok = res?.success === true || res?.Success === true;
        if (ok) {
          this.notificationService.showSuccess(res.message || res.Message || 'Registration saved successfully.');
          this.saved.emit(res.data);
        } else {
          this.notificationService.showError(res?.message || res?.Message || 'Failed to save registration.');
        }
      },
      error: (err: any) => {
        const msg = typeof err === 'string' ? err : (err?.error?.message || 'Error saving registration.');
        this.notificationService.showError(msg);
        console.error('Error saving registration:', err);
      }
    });
  }
}
