
import { LoaderService } from '../../../shared/services/loader.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Component, OnInit, ChangeDetectorRef, HostListener, ViewChild, ElementRef } from '@angular/core';
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

  @ViewChild('floorArea') floorAreaRef!: ElementRef;

  // Floor boundaries
  get floorWidth(): number {
    return this.floorAreaRef ? Math.max(1200, this.floorAreaRef.nativeElement.offsetWidth) : 1200;
  }

  get floorHeight(): number {
    return this.floorAreaRef ? Math.max(800, this.floorAreaRef.nativeElement.offsetHeight) : 800;
  }

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private loaderService: LoaderService
  ) { }

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

            let currentX = 20;
            let currentY = 20;
            this.tables.forEach(t => {
              const tableWidth = 150;
              const tableHeight = 130;
              const isInvalid = !t.xAxis && !t.yAxis;
              const isOutside = t.xAxis < 0 || t.yAxis < 0 || t.xAxis > this.floorWidth - tableWidth || t.yAxis > this.floorHeight - tableHeight;

              if (isInvalid || isOutside) {
                t.xAxis = currentX;
                t.yAxis = currentY;
                currentX += 180;
                if (currentX > this.floorWidth - 160) {
                  currentX = 20;
                  currentY += 150;
                }
              }
            });
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
        return 'assets/images/Occupied_Chair.svg';
      case 'overlap':
        return 'assets/images/Time_Overlap_Chair.svg';
      default:
        return 'assets/images/Available_Chair.svg';
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

  // --- Mouse Events ---
  onMouseDown(event: MouseEvent, table: any): void {
    if (!this.isEditMode) return;
    this.startDrag(event.clientX, event.clientY, table);
    event.preventDefault(); // Prevent text selection
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.handleDrag(event.clientX, event.clientY);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.stopDrag();
  }

  // --- Touch Events ---
  onTouchStart(event: TouchEvent, table: any): void {
    if (!this.isEditMode || event.touches.length === 0) return;
    this.startDrag(event.touches[0].clientX, event.touches[0].clientY, table);
    // Prevent default to avoid scrolling/zooming while trying to drag
    event.preventDefault();
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (this.isDragging && event.touches.length > 0) {
      this.handleDrag(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  @HostListener('document:touchend')
  onTouchEnd(): void {
    this.stopDrag();
  }

  // --- Common Drag Logic ---
  private startDrag(clientX: number, clientY: number, table: any): void {
    this.isDragging = true;
    this.draggedTableId = table.id;
    this.initialX = table.xAxis || 0;
    this.initialY = table.yAxis || 0;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
  }

  private handleDrag(clientX: number, clientY: number): void {
    if (!this.isDragging || !this.draggedTableId || !this.isEditMode) return;
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    const table = this.tables.find(t => t.id === this.draggedTableId);
    if (table) {
      let newX = this.initialX + dx;
      let newY = this.initialY + dy;

      // Table width is approx 150px, height 130px
      const tableWidth = 150;
      const tableHeight = 130;

      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > this.floorWidth - tableWidth) newX = this.floorWidth - tableWidth;
      if (newY > this.floorHeight - tableHeight) newY = this.floorHeight - tableHeight;

      table.xAxis = newX;
      table.yAxis = newY;
    }
  }

  private stopDrag(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedTableId = null;
    }
  }
}
