import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { finalize } from 'rxjs';
import { Pagination } from '../../../../shared/models/pagination.model';

declare var bootstrap: any;

@Component({
  selector: 'app-section-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './section-list.component.html',
  styleUrls: ['./section-list.component.css']
})
export class SectionListComponent implements OnInit {
  floors: any[] = [];
  loading = false;
  saving = false;
  selectedFloor: any = null;
  modal: any;
  libraryId!: number;
  isSuperadmin = false;
  pagination: Pagination | null = null;

  floorForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
    this.floorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      floorNumber: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadFloors();
  }

  loadFloors(): void {
    this.loading = true;
    const params: any = {};
    if (!this.isSuperadmin && this.libraryId) {
      params.LibraryId = this.libraryId;
    }

    this.apiService.getAllFloors(params)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res) => {
          if (res && res.data) {
            const items = res.data.items || (Array.isArray(res.data) ? res.data : [res.data]);
            this.floors = items.map((f: any) => ({
              id: f.id ?? f.Id,
              name: f.name ?? f.Name,
              floorNumber: f.floorNumber ?? f.FloorNumber,
              isActive: f.isActive ?? f.IsActive,
              libraryId: f.libraryId ?? f.LibraryId
            }));
            
            if (res.data.totalCount !== undefined) {
               this.pagination = {
                 pageNumber: res.data.pageNumber,
                 pageSize: res.data.pageSize,
                 totalRecords: res.data.totalCount,
                 totalPages: res.data.totalPages
               };
            }
          }
        },
        error: (err) => console.error('Error loading floors:', err)
      });
  }

  openAddModal(): void {
    this.selectedFloor = null;
    this.floorForm.reset();
    this.showModal();
  }

  openEditModal(floor: any): void {
    this.selectedFloor = floor;
    this.floorForm.patchValue({
      name: floor.name,
      floorNumber: floor.floorNumber
    });
    this.showModal();
  }

  private showModal(): void {
    const el = document.getElementById('floorModal');
    if (el) {
      this.modal = new bootstrap.Modal(el);
      this.modal.show();
    }
  }

  hideModal(): void {
    if (this.modal) this.modal.hide();
  }

  onSubmit(): void {
    if (this.floorForm.invalid) {
      this.markAllTouched();
      return;
    }

    this.saving = true;
    const formValue = this.floorForm.value;
    const body = { ...formValue, libraryId: this.libraryId };

    const request = this.selectedFloor
      ? this.apiService.updateFloor(this.selectedFloor.id, body)
      : this.apiService.createFloor(body);

    request.pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (res) => {
          if (res.success !== false) {
             this.hideModal();
             this.loadFloors();
          }
        },
        error: (err) => console.error('Error saving floor:', err)
      });
  }

  onDelete(id: number): void {
    if (confirm('Are you sure you want to delete this section/floor?')) {
      this.apiService.deleteFloor(id).subscribe({
        next: () => this.loadFloors(),
        error: (err) => console.error('Error deleting floor:', err)
      });
    }
  }

  get f() { return this.floorForm.controls; }

  private markAllTouched(): void {
    Object.values(this.floorForm.controls).forEach(c => c.markAsTouched());
  }
}
