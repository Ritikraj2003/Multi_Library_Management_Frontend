import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-table-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
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

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
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
    
    // Load registrations first or in parallel
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
            // Ensure data is filtered by floor on frontend as well
            this.tables = allItems.filter((t: any) => (t.floorId ?? t.FloorId) == this.selectedFloorId);
          }
        });
    });
  }

  getTableBatches(tableId: number | undefined): any[] {
    if (!tableId) return [];
    return this.batches.map(batch => {
      const bId = batch.id ?? batch.Id;
      if (!bId) return { ...batch, isOccupied: false };

      const isOccupied = this.registrations.some(reg => {
        const regTableId = reg.tableSeatId ?? reg.TableSeatId;
        const regBatchId = reg.batchId ?? reg.BatchId;
        return regTableId === tableId && regBatchId === bId;
      });

      return {
        ...batch,
        id: bId,
        isOccupied
      };
    });
  }

  getShapeClass(index: number): string {
    const shapes = ['rectangle', 'triangle', 'circle'];
    return shapes[index % shapes.length];
  }
}
