import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { LoaderService } from '../../../../shared/services/loader.service';
import { finalize } from 'rxjs';
import { Pagination } from '../../../../shared/models/pagination.model';

declare var bootstrap: any;

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './table-list.component.html',
  styleUrls: ['./table-list.component.css']
})
export class TableListComponent implements OnInit {
  tables: any[] = [];
  floors: any[] = [];
  loading = false;
  saving = false;
  selectedTable: any = null;
  modal: any;
  libraryId!: number;
  isSuperadmin = false;
  pagination: Pagination | null = null;

  tableForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
    this.tableForm = this.fb.group({
      floorId: ['', [Validators.required]],
      tableNumber: ['', [Validators.required]],
      seatNumber: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadFloors();
    this.loadTables();
  }

  loadFloors(): void {
    const params: any = {};
    if (!this.isSuperadmin && this.libraryId) {
      params.LibraryId = this.libraryId;
    }

    this.apiService.getAllFloors(params)
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
            this.cdr.markForCheck();
          }
        },
        error: (err) => console.error('Error loading floors:', err)
      });
  }

  loadTables(pageNumber: number = 1, pageSize: number = 10): void {
    this.loading = true;
    this.loaderService.show();
    const params: any = {
      PageNumber: pageNumber,
      PageSize: pageSize
    };
    
    if (!this.isSuperadmin && this.libraryId) {
      params.LibraryId = this.libraryId;
    }

    this.apiService.getAllTables(params)
      .pipe(finalize(() => { 
        this.loading = false; 
        this.loaderService.hide();
        this.cdr.markForCheck(); 
      }))
      .subscribe({
        next: (res) => {
          if (res && res.data) {
            const items = res.data.items || (Array.isArray(res.data) ? res.data : [res.data]);
            this.tables = items.map((t: any) => ({
              id: t.id ?? t.Id,
              floorId: t.floorId ?? t.FloorId,
              tableNumber: t.tableNumber ?? t.TableNumber,
              seatNumber: t.seatNumber ?? t.SeatNumber,
              isOccupied: t.isOccupied ?? t.IsOccupied,
              isActive: t.isActive ?? t.IsActive,
              libraryId: t.libraryId ?? t.LibraryId,
              floorName: t.floorName || t.FloorName || t.Floors?.Name || t.floors?.name
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
        error: (err) => console.error('Error loading tables:', err)
      });
  }

  openAddModal(): void {
    this.selectedTable = null;
    this.tableForm.reset();
    this.showModal();
  }

  openEditModal(table: any): void {
    this.selectedTable = table;
    this.tableForm.patchValue({
      floorId: table.floorId,
      tableNumber: table.tableNumber,
      seatNumber: table.seatNumber
    });
    this.showModal();
  }

  private showModal(): void {
    const el = document.getElementById('tableModal');
    if (el) {
      this.modal = new bootstrap.Modal(el);
      this.modal.show();
    }
  }

  hideModal(): void {
    if (this.modal) this.modal.hide();
  }

  onSubmit(): void {
    if (this.tableForm.invalid) {
      this.markAllTouched();
      return;
    }

    this.saving = true;
    this.loaderService.show();
    const formValue = this.tableForm.value;
    const body = { ...formValue, libraryId: this.libraryId };

    if (this.selectedTable) {
        body.id = this.selectedTable.id;
    }

    const request = this.selectedTable
      ? this.apiService.updateTable(body)
      : this.apiService.createTable(body);

    request.pipe(finalize(() => {
      this.saving = false;
      this.loaderService.hide();
    }))
      .subscribe({
        next: (res) => {
          if (res.success !== false) {
             this.hideModal();
             this.loadTables();
          }
        },
        error: (err) => console.error('Error saving table:', err)
      });
  }

  onDelete(id: number): void {
    if (confirm('Are you sure you want to delete this table/seat?')) {
      this.apiService.deleteTable(id).subscribe({
        next: () => this.loadTables(this.pagination?.pageNumber || 1),
        error: (err) => console.error('Error deleting table:', err)
      });
    }
  }

  changePage(page: number): void {
    if (page >= 1 && (!this.pagination || page <= this.pagination.totalPages)) {
      this.loadTables(page);
    }
  }

  get f() { return this.tableForm.controls; }

  private markAllTouched(): void {
    Object.values(this.tableForm.controls).forEach(c => c.markAsTouched());
  }
}
