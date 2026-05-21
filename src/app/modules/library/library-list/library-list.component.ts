import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { Pagination } from '../../../shared/models/pagination.model';
import { LibraryFormComponent } from '../library-form/library-form.component';
import { finalize } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-library-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LibraryFormComponent, LoaderComponent],
  templateUrl: './library-list.component.html',
  styleUrls: ['./library-list.component.css']
})
export class LibraryListComponent implements OnInit {
  libraries: any[] = [];
  loading = false;
  isSuperadmin = false;
  pagination: Pagination | null = null;
  selectedLibrary: any = undefined;
  modal: any;

  // Permissions Modal State
  isPermissionModalOpen = false;
  currentPermissionLibrary: any = null;
  allPermissions: any[] = [];
  availablePermissions: any[] = [];
  chosenPermissions: any[] = [];
  selectedAvailable: any[] = [];
  selectedChosen: any[] = [];
  availableSearchTerm: string = '';
  Math = Math;

  // View Permissions Modal State
  isViewPermissionModalOpen = false;
  viewPermissionsList: any[] = [];
  viewPermissionLibraryName = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
  }

  ngOnInit(): void {
    this.loadLibraries();
  }

  loadAllPermissions(callback?: () => void) {
    if (this.allPermissions.length > 0) {
      if (callback) callback();
      return;
    }

    this.apiService.getAllPermissions({ pageSize: 1000 }).subscribe((res: any) => {
      if (res.success) {
        const items = res.data.items || res.data;
        this.allPermissions = items.map((p: any) => ({
          id: p.id,
          name: p.name,
          module: p.module,
          displayName: `${p.module} | ${p.name}`
        }));
        if (callback) callback();
      }
    });
  }

  openAddModal(): void {
    this.selectedLibrary = null;
    this.showModal();
  }

  openEditModal(lib: any): void {
    this.selectedLibrary = lib;
    this.showModal();
  }

  private showModal(): void {
    const modalElement = document.getElementById('libraryModal');
    if (modalElement) {
      this.modal = new bootstrap.Modal(modalElement);
      this.modal.show();
    }
  }

  onSaved(newLibrary?: any): void {
    if (this.modal) {
      this.modal.hide();
    }
    this.loadLibraries();
    
    // Automatically open permissions modal if a new library was passed back
    if (newLibrary && newLibrary.id) {
      this.openPermissionModal(newLibrary);
    }
  }

  onCancelled(): void {
    if (this.modal) {
      this.modal.hide();
    }
  }

  onDelete(id: number): void {
    if (confirm('Are you sure you want to delete this library?')) {
      this.apiService.deleteLibrary(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadLibraries();
          }
        },
        error: (err) => console.error('Error deleting library:', err)
      });
    }
  }

  loadLibraries(): void {
    this.loading = true;
    if (this.isSuperadmin) {
      // Call get all for superadmin
      this.apiService.getAllLibraries()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          console.log('Superadmin Libraries Response:', res);
          if (res && res.data && res.data.items) {
            this.libraries = res.data.items;
            this.pagination = {
              pageNumber: res.data.pageNumber,
              pageSize: res.data.pageSize,
              totalRecords: res.data.totalCount,
              totalPages: res.data.totalPages
            };
          }
        },
        error: (err) => {
          console.error('Superadmin Libraries Error:', err);
        }
      });
    } else {
      // Call single library for regular admin
      const libraryId = this.authService.currentUserValue?.libraryId;
      console.log('Fetching library for ID:', libraryId);
      if (libraryId) {
        this.apiService.getLibraryById(libraryId)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }))
        .subscribe({
          next: (res) => {
            console.log('Single Library Response:', res);
            if (res && res.data) {
              this.libraries = [res.data];
            } else if (res) {
              // Handle case where res might be the library itself
              this.libraries = [(res as any).data || res];
            }
          },
          error: (err) => {
            console.error('Single Library Error:', err);
          }
        });
      } else {
        console.warn('No libraryId found for current user');
        this.loading = false;
      }
    }
  }

  // Permissions Modal Logic
  openPermissionModal(lib: any) {
    this.loadAllPermissions(() => {
      this.currentPermissionLibrary = lib;
      this.selectedAvailable = [];
      this.selectedChosen = [];
      this.availableSearchTerm = '';
      
      this.apiService.getPermissionsByLibrary(lib.id).subscribe((res: any) => {
        if (res.success) {
          const libPermIds = res.data.map((lp: any) => Number(lp.permissionId));
          this.chosenPermissions = this.allPermissions.filter(p => libPermIds.includes(Number(p.id)));
          this.availablePermissions = this.allPermissions.filter(p => !libPermIds.includes(Number(p.id)));
          this.isPermissionModalOpen = true;
        } else {
          // Fallback if no permissions assigned yet
          this.chosenPermissions = [];
          this.availablePermissions = [...this.allPermissions];
          this.isPermissionModalOpen = true;
        }
      });
    });
  }

  closePermissionModal() {
    this.isPermissionModalOpen = false;
    this.currentPermissionLibrary = null;
  }

  // View Permissions Modal Logic
  openViewPermissionModal(lib: any) {
    this.viewPermissionLibraryName = lib.name;
    this.apiService.getPermissionsByLibrary(lib.id).subscribe((res: any) => {
      if (res.success) {
        this.viewPermissionsList = res.data;
        this.isViewPermissionModalOpen = true;
      } else {
        this.viewPermissionsList = [];
        this.isViewPermissionModalOpen = true;
      }
      this.cdr.detectChanges();
    });
  }

  closeViewPermissionModal() {
    this.isViewPermissionModalOpen = false;
    this.viewPermissionsList = [];
    this.cdr.detectChanges();
  }

  getFilteredAvailablePermissions() {
    if (!this.availableSearchTerm) return this.availablePermissions;
    return this.availablePermissions.filter(p => 
      p.displayName.toLowerCase().includes(this.availableSearchTerm.toLowerCase())
    );
  }
  
  selectAvailable(perm: any) {
    const index = this.selectedAvailable.indexOf(perm);
    if (index > -1) this.selectedAvailable.splice(index, 1);
    else this.selectedAvailable.push(perm);
  }
  
  selectChosen(perm: any) {
    const index = this.selectedChosen.indexOf(perm);
    if (index > -1) this.selectedChosen.splice(index, 1);
    else this.selectedChosen.push(perm);
  }
  
  moveToChosen() {
    this.chosenPermissions.push(...this.selectedAvailable);
    this.availablePermissions = this.availablePermissions.filter(p => !this.selectedAvailable.includes(p));
    this.selectedAvailable = [];
  }
  
  moveToAvailable() {
    this.availablePermissions.push(...this.selectedChosen);
    this.chosenPermissions = this.chosenPermissions.filter(p => !this.selectedChosen.includes(p));
    this.selectedChosen = [];
  }
  
  chooseAll() {
    const filtered = this.getFilteredAvailablePermissions();
    this.chosenPermissions.push(...filtered);
    this.availablePermissions = this.availablePermissions.filter(p => !filtered.includes(p));
    this.selectedAvailable = [];
  }
  
  removeAll() {
    this.availablePermissions.push(...this.chosenPermissions);
    this.chosenPermissions = [];
    this.selectedChosen = [];
  }
  
  savePermissions() {
    if (!this.currentPermissionLibrary) return;
    
    const body = {
      libraryId: this.currentPermissionLibrary.id,
      permissionIds: this.chosenPermissions.map(p => p.id)
    };
    
    this.apiService.assignPermissionsToLibrary(body).subscribe((res: any) => {
      if (res.success) {
        this.closePermissionModal();
      } else {
        alert(res.message);
      }
    });
  }
}
