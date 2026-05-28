
import { LoaderService } from '../../../shared/services/loader.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
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
  imports: [CommonModule, FormsModule, RegistrationFormComponent],
  templateUrl: './table-layout.component.html',
  styleUrls: ['./table-layout.component.css']
})
export class TableLayoutComponent implements OnInit {
  floors: any[] = [];
  tables: any[] = [];
  batches: any[] = [];
  registrations: any[] = [];
  selectedFloorId: number | null = null;
  selectedBatchId: number | null = null;
  loading = true;
  libraryId!: number;

  // Registration modal state
  preselectedRegistration: any = null;
  private regModal: any;

  // Drag and Drop state
  isEditMode = false;
  isDragging = false;
  draggedTableId: number | null = null;
  dragStartX = 0;
  dragStartY = 0;
  initialX = 0;
  initialY = 0;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private loaderService: LoaderService
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

        if (this.batches.length > 0 && !this.selectedBatchId) {
          this.selectedBatchId = this.batches[0].id ?? this.batches[0].Id;
        }
      }
    });
  }

  onFloorChange(floorId: any): void {
    this.selectedFloorId = +floorId;
    this.loadTables();
  }

  onBatchChange(batchId: any): void {
    this.selectedBatchId = +batchId;
  }

  loadTables(): void {
    if (!this.selectedFloorId) return;
    this.loading = true;
    this.loaderService.show();

    this.apiService.getAllRegistrations({ LibraryId: this.libraryId, PageSize: 1000 }).subscribe((res: any) => {
      const allRegs = res.data?.items || res.data || [];
      this.registrations = allRegs.filter((r: any) => (r.status === 'Active' || r.Status === 'Active'));

      const params = {
        LibraryId: this.libraryId,
        FloorId: this.selectedFloorId,
        PageSize: 1000
      };

      this.apiService.getAllTables(params)
        .pipe(finalize(() => { 
          this.loading = false; 
          this.loaderService.hide();
          this.cdr.detectChanges(); 
        }))
        .subscribe((res: any) => {
          if (res.success && res.data) {
            const allItems = res.data.items || res.data || [];
            this.tables = allItems.filter((t: any) => (t.floorId ?? t.FloorId) == this.selectedFloorId);
          }
        });
    });
  }

  getTableStatus(tableId: number | undefined): 'available' | 'occupied' | 'overlap' {
    if (!tableId || !this.selectedBatchId) return 'available';

    const selectedBatch = this.batches.find(b => (b.id ?? b.Id) === this.selectedBatchId);
    const sStart = selectedBatch?.startTime ?? selectedBatch?.StartTime ?? '';
    const sEnd = selectedBatch?.endTime ?? selectedBatch?.EndTime ?? '';

    const isOccupied = this.registrations.some(reg => {
      const regTableId = reg.tableSeatId ?? reg.TableSeatId;
      const regBatchId = reg.batchId ?? reg.BatchId;
      return regTableId === tableId && regBatchId === this.selectedBatchId;
    });
    if (isOccupied) return 'occupied';

    if (sStart && sEnd) {
      const otherRegs = this.registrations.filter(reg => {
        const regTableId = reg.tableSeatId ?? reg.TableSeatId;
        const regBatchId = reg.batchId ?? reg.BatchId;
        return regTableId === tableId && regBatchId !== this.selectedBatchId;
      });

      for (const reg of otherRegs) {
        const regBatchId = reg.batchId ?? reg.BatchId;
        const b = this.batches.find(x => (x.id ?? x.Id) === regBatchId);
        const bStart = b?.startTime ?? b?.StartTime ?? '';
        const bEnd = b?.endTime ?? b?.EndTime ?? '';
        if (bStart && bEnd && this.timesOverlap(sStart, sEnd, bStart, bEnd)) {
          return 'overlap';
        }
      }
    }

    return 'available';
  }

  getStatusLabel(status: 'available' | 'occupied' | 'overlap'): string {
    switch (status) {
      case 'occupied': return 'Occupied';
      case 'overlap': return 'Time Overlap';
      default: return 'Available';
    }
  }

  getStatusIcon(status: 'available' | 'occupied' | 'overlap'): string {
    switch (status) {
      case 'occupied':
        return 'assets/images/occupied-removebg-preview.png';
      case 'overlap':
        return 'assets/images/timeoverlap-removebg-preview.png';
      default:
        return 'assets/images/Avaialble-removebg-preview.png';
    }
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

  onBatchClick(event: Event, table: any, batch: any): void {
    event.stopPropagation();
    
    if (!this.authService.hasPermission('TABLE_REGISTRATION')) {
      this.notificationService.showError('You do not have permission to register tables!');
      return;
    }
    
    // Only open modal for available (non-occupied, non-overlap) batches
    if (batch.isOccupied || batch.isOverlap) {
      this.notificationService.showWarning('This batch is already occupied or overlapping with another booking.');
      return;
    }

    // Pre-fill seat and batch for the registration form
    this.preselectedRegistration = {
      tableSeatId: table.id,
      batchId: batch.id
    };
    this.cdr.detectChanges();

    const el = document.getElementById('layoutRegModal');
    if (el) {
      if (!this.regModal) {
        this.regModal = new bootstrap.Modal(el);
      }
      this.regModal.show();
    } else {
      this.notificationService.showError('Registration modal element not found!');
    }
  }

  onTableClick(table: any): void {
    if (this.isEditMode) return;

    if (!this.authService.hasPermission('TABLE_REGISTRATION')) {
      this.notificationService.showError('You do not have permission to register tables!');
      return;
    }

    if (!this.selectedBatchId) {
      this.notificationService.showWarning('Please select a batch first.');
      return;
    }

    const status = this.getTableStatus(table.id);
    if (status !== 'available') {
      if (status === 'overlap') {
        this.notificationService.showWarning('This table has a time overlap with another booking.');
      } else {
        this.notificationService.showWarning('This table is already occupied for the selected batch.');
      }
      return;
    }

    this.preselectedRegistration = {
      tableSeatId: table.id,
      batchId: this.selectedBatchId
    };
    this.cdr.detectChanges();

    const el = document.getElementById('layoutRegModal');
    if (el) {
      if (!this.regModal) {
        this.regModal = new bootstrap.Modal(el);
      }
      this.regModal.show();
    } else {
      this.notificationService.showError('Registration modal element not found!');
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

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  saveLayout(): void {
    const dtos = this.tables.map(t => ({
      id: t.id,
      xAxis: t.xAxis || 0,
      yAxis: t.yAxis || 0
    }));
    this.apiService.updateTablePositions(dtos).subscribe(res => {
      if (res.success) {
        this.isEditMode = false;
        this.notificationService.showSuccess('Layout saved successfully!');
      } else {
        this.notificationService.showError('Failed to save layout: ' + res.message);
      }
    });
  }

  onMouseDown(event: MouseEvent, table: any): void {
    if (!this.isEditMode) return;
    this.isDragging = true;
    this.draggedTableId = table.id;
    this.initialX = table.xAxis || 0;
    this.initialY = table.yAxis || 0;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    event.preventDefault(); // Prevent text selection
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedTableId || !this.isEditMode) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    const table = this.tables.find(t => t.id === this.draggedTableId);
    if (table) {
      table.xAxis = this.initialX + dx;
      table.yAxis = this.initialY + dy;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedTableId = null;
    }
  }
}
