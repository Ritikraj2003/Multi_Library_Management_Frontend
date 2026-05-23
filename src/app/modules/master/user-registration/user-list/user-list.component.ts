import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { Pagination } from '../../../../shared/models/pagination.model';
import { UserFormComponent } from '../user-form/user-form.component';
import { finalize } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserFormComponent, LoaderComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  loading = false;
  isSuperadmin = false;
  pagination: Pagination | null = null;
  selectedUser: any = undefined;
  modal: any;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    const params: any = {};
    if (!this.isSuperadmin) {
      params.LibraryId = this.authService.currentUserValue?.libraryId;
    }

    this.apiService.getAllUsers(params)
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    }))
    .subscribe({
      next: (res) => {
        if (res && res.data) {
          this.users = res.data.items || (Array.isArray(res.data) ? res.data : [res.data]);
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
      error: (err) => console.error('Error loading users:', err)
    });
  }

  openAddModal(): void {
    this.selectedUser = null;
    this.showModal();
  }

  openEditModal(user: any): void {
    this.selectedUser = user;
    this.showModal();
  }

  private showModal(): void {
    const modalElement = document.getElementById('userModal');
    if (modalElement) {
      this.modal = new bootstrap.Modal(modalElement);
      this.modal.show();
    }
  }

  onSaved(): void {
    if (this.modal) {
      this.modal.hide();
    }
    this.loadUsers();
  }

  onCancelled(): void {
    if (this.modal) {
      this.modal.hide();
    }
  }

  onDelete(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.apiService.deleteUser(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadUsers();
          }
        },
        error: (err) => console.error('Error deleting user:', err)
      });
    }
  }
}
