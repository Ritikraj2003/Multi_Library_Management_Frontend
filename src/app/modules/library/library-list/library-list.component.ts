import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, LibraryFormComponent],
  templateUrl: './library-list.component.html',
  styleUrls: ['./library-list.component.css']
})
export class LibraryListComponent implements OnInit {
  libraries: any[] = [];
  loading = false;
  isSuperadmin = false;
  pagination: Pagination | null = null;
  selectedLibrary: any = null;
  modal: any;

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

  onSaved(): void {
    if (this.modal) {
      this.modal.hide();
    }
    this.loadLibraries();
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
}
