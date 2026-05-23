import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { finalize } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './batch-list.component.html',
  styleUrls: ['./batch-list.component.css']
})
export class BatchListComponent implements OnInit {
  batches: any[] = [];
  loading = false;
  saving = false;
  selectedBatch: any = null;
  modal: any;
  libraryId!: number;

  batchForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.batchForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadBatches();
  }

  loadBatches(): void {
    if (!this.libraryId) return;
    this.loading = true;
    this.apiService.getBatchesByLibraryId(this.libraryId)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res) => {
          const data = res?.data || res || [];
          this.batches = (Array.isArray(data) ? data : []).map((b: any) => ({
            id: b.id ?? b.Id,
            name: b.name ?? b.Name,
            startTime: b.startTime ?? b.StartTime,
            endTime: b.endTime ?? b.EndTime,
            isActive: b.isActive ?? b.IsActive,
            libraryId: b.libraryId ?? b.LibraryId
          }));
        },
        error: (err) => console.error('Error loading batches:', err)
      });
  }

  openAddModal(): void {
    this.selectedBatch = null;
    this.batchForm.reset({ isActive: true });
    this.showModal();
  }

  openEditModal(batch: any): void {
    this.selectedBatch = batch;
    this.batchForm.patchValue({
      name: batch.name,
      startTime: batch.startTime,
      endTime: batch.endTime,
      isActive: batch.isActive
    });
    this.showModal();
  }

  private showModal(): void {
    const el = document.getElementById('batchModal');
    if (el) {
      this.modal = new bootstrap.Modal(el);
      this.modal.show();
    }
  }

  hideModal(): void {
    if (this.modal) this.modal.hide();
  }

  onSubmit(): void {
    if (this.batchForm.invalid) {
      this.markAllTouched();
      return;
    }

    this.saving = true;
    const formValue = this.batchForm.value;
    const body = { ...formValue, libraryId: this.libraryId };

    const request = this.selectedBatch
      ? this.apiService.updateBatch(this.selectedBatch.id, body)
      : this.apiService.createBatch(body);

    request.pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (res) => {
          this.hideModal();
          this.loadBatches();
        },
        error: (err) => console.error('Error saving batch:', err)
      });
  }

  onDelete(id: number): void {
    if (confirm('Are you sure you want to delete this batch?')) {
      this.apiService.deleteBatch(id).subscribe({
        next: () => this.loadBatches(),
        error: (err) => console.error('Error deleting batch:', err)
      });
    }
  }

  get f() { return this.batchForm.controls; }

  private markAllTouched(): void {
    Object.values(this.batchForm.controls).forEach(c => c.markAsTouched());
  }
}
