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
  filteredStudents: any[] = [];
  searchTerm: string = '';
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
        isActiveStatus: status === 'Active' || status === 1
      }, { emitEvent: false });

      // Find student and set search term
      const student = this.students.find(s => s.id === (data.studentId || data.StudentId));
      if (student) {
        this.searchTerm = `${student.fullName} (${student.mobile})`;
      } else if (data.studentName || data.fullName || data.FullName) {
        this.searchTerm = `${data.studentName || data.fullName || data.FullName} (${data.mobile || data.Mobile || ''})`;
      }

      this.regForm.get('studentId')?.disable({ emitEvent: false });
      this.regForm.get('tableSeatId')?.disable({ emitEvent: false });
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

  loadDropdowns(): void {
    const params: any = this.authService.currentUserValue?.isSuperadmin ? {} : { LibraryId: this.libraryId };
    params.PageSize = 1000; // Increase page size to get all students
    
    this.apiService.getAllStudents(params).subscribe(res => {
      const data = res.data?.items || res.data?.Items || [];
      this.students = data.map((s: any) => ({
        id: s.id ?? s.Id,
        fullName: s.fullName ?? s.FullName,
        mobile: s.mobile ?? s.Mobile
      }));
      this.filteredStudents = [...this.students];
      
      // If we are in edit mode, we need to set the search term now that students are loaded
      if (this.isEdit) {
        this.updateForm();
      }
    });
    
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
    this.apiService.getSeatAvailability(seatId, this.libraryId, registrationId).subscribe(res => {
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
    const displayString = selectedStudent ? `${selectedStudent.fullName} (${selectedStudent.mobile})`.toLowerCase() : '';
    
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
    this.searchTerm = `${student.fullName} (${student.mobile})`;
    this.filteredStudents = [];
  }

  isStudentSelected(term: string): boolean {
    const selectedId = this.regForm.get('studentId')?.value;
    if (!selectedId) return false;
    const selectedStudent = this.students.find(s => s.id === selectedId);
    if (!selectedStudent) return false;
    const displayString = `${selectedStudent.fullName} (${selectedStudent.mobile})`;
    return term.toLowerCase() === displayString.toLowerCase();
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
