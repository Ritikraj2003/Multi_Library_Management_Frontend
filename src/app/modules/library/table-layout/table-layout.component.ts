import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { RegistrationFormComponent } from '../../registrations/registration-form/registration-form.component';
import { finalize } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-table-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, RegistrationFormComponent],
  templateUrl: './table-layout.component.html',
  styleUrls: ['./table-layout.component.css']
})
export class TableLayoutComponent implements OnInit {
  floors: any[] = [];
  tables: any[] = [];
  batches: any[] = [];
  registrations: any[] = [];
  selectedFloorId: number | null = null;
  loading = true;
  libraryId!: number;

  // Registration modal state
  preselectedRegistration: any = null;
  private regModal: any;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadFloors();
  }

  loadFloors(): void {
    const params = { LibraryId: this.libraryId };
    this.apiService.getAllFloors(params).subscribe((res: any) => {
      if (res.success && res.data) {
        this.floors = (res.data.items || res.data || []).sort((a: any, b: any) =>
          (a.name || a.Name || '').localeCompare(b.name || b.Name || '')
        );
        if (this.floors.length > 0) {
          this.selectedFloorId = this.floors[0].id ?? this.floors[0].Id;
          this.loadTables();
        }
      }
    });

    this.apiService.getBatchesByLibraryId(this.libraryId).subscribe((res: any) => {
      if (res.success || res.data) {
        this.batches = (res.data || []).sort((a: any, b: any) =>
          (a.name || a.batchName || '').localeCompare(b.name || b.batchName || '')
        );
      }
    });
  }

  onFloorChange(floorId: any): void {
    this.selectedFloorId = +floorId;
    this.loadTables();
  }

  loadTables(): void {
    if (!this.selectedFloorId) return;
    this.loading = true;

    this.apiService.getAllRegistrations({ LibraryId: this.libraryId, PageSize: 1000 }).subscribe((res: any) => {
      const allRegs = res.data?.items || res.data || [];
      this.registrations = allRegs.filter((r: any) => (r.status === 'Active' || r.Status === 'Active'));

      const params = {
        LibraryId: this.libraryId,
        FloorId: this.selectedFloorId,
        PageSize: 1000
      };

      this.apiService.getAllTables(params)
        .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
        .subscribe((res: any) => {
          if (res.success && res.data) {
            const allItems = res.data.items || res.data || [];
            this.tables = allItems.filter((t: any) => (t.floorId ?? t.FloorId) == this.selectedFloorId);
          }
        });
    });
  }

  getTableBatches(tableId: number | undefined): any[] {
    if (!tableId) return [];

    const enriched = this.batches.map(batch => {
      const bId = batch.id ?? batch.Id;
      if (!bId) return { ...batch, isOccupied: false, isOverlap: false };

      const isOccupied = this.registrations.some(reg => {
        const regTableId = reg.tableSeatId ?? reg.TableSeatId;
        const regBatchId = reg.batchId ?? reg.BatchId;
        return regTableId === tableId && regBatchId === bId;
      });

      return {
        ...batch,
        id: bId,
        startTime: batch.startTime ?? batch.StartTime ?? '',
        endTime: batch.endTime ?? batch.EndTime ?? '',
        isOccupied,
        isOverlap: false
      };
    });

    for (let i = 0; i < enriched.length; i++) {
      for (let j = i + 1; j < enriched.length; j++) {
        const a = enriched[i];
        const b = enriched[j];
        if ((a.isOccupied || b.isOccupied) &&
            a.startTime && a.endTime && b.startTime && b.endTime) {
          if (this.timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
            if (!enriched[i].isOccupied) enriched[i] = { ...enriched[i], isOverlap: true };
            if (!enriched[j].isOccupied) enriched[j] = { ...enriched[j], isOverlap: true };
          }
        }
      }
    }

    return enriched;
  }

  private timeToMinutes(time: string): number {
    if (!time) return 0;
    const parts = time.split(':').map(Number);
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }

  private timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
    const start1 = this.timeToMinutes(s1);
    let end1 = this.timeToMinutes(e1);
    const start2 = this.timeToMinutes(s2);
    let end2 = this.timeToMinutes(e2);
    if (end1 <= start1) end1 += 1440;
    if (end2 <= start2) end2 += 1440;
    return start1 < end2 && start2 < end1;
  }

  onBatchClick(table: any, batch: any): void {
    if (!this.authService.hasPermission('TABLE_REGISTRATION')) return;
    
    // Only open modal for available (non-occupied, non-overlap) batches
    if (batch.isOccupied || batch.isOverlap) return;

    // Pre-fill seat and batch for the registration form
    this.preselectedRegistration = {
      tableSeatId: table.id,
      batchId: batch.id
    };
    this.cdr.detectChanges();

    const el = document.getElementById('layoutRegModal');
    if (el) {
      this.regModal = new bootstrap.Modal(el);
      this.regModal.show();
    }
  }

  onRegSaved(): void {
    this.preselectedRegistration = null;
    this.regModal?.hide();
    // Reload layout data to reflect new booking
    this.loadTables();
  }

  onRegCancelled(): void {
    this.preselectedRegistration = null;
    this.regModal?.hide();
  }

  getShapeClass(index: number): string {
    const shapes = ['rectangle', 'triangle', 'circle'];
    return shapes[index % shapes.length];
  }
}
