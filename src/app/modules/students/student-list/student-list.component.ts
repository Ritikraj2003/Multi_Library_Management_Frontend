import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';
import { Pagination } from '../../../shared/models/pagination.model';
import { environment } from '../../../../environments/environment';
import { StudentFormComponent } from '../student-form/student-form.component';

declare var bootstrap: any;

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, StudentFormComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  students: any[] = [];
  loading = false;
  selectedStudent: any = null;
  modal: any;
  libraryId!: number;
  isSuperadmin = false;
  pagination: Pagination | null = null;
  viewSelectedStudent: any = null;
  imageBaseUrl = environment.imageBaseUrl;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadStudents();
  }

  loadStudents(pageNumber: number = 1, pageSize: number = 10): void {
    this.loading = true;
    const params: any = {
      PageNumber: pageNumber,
      PageSize: pageSize
    };
    
    if (!this.isSuperadmin && this.libraryId) {
      params.LibraryId = this.libraryId;
    }

    this.apiService.getAllStudents(params)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          if (res && res.data) {
            this.students = res.data.items || [];
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
        error: (err: any) => console.error('Error loading students:', err)
      });
  }

  openAddModal(): void {
    this.selectedStudent = null;
    this.showModal('studentModal');
  }

  openEditModal(student: any): void {
    this.selectedStudent = student;
    this.showModal('studentModal');
  }

  openViewModal(student: any): void {
    this.viewSelectedStudent = student;
    this.showModal('viewStudentModal');
  }

  private showModal(modalId: string): void {
    const el = document.getElementById(modalId);
    if (el) {
      this.modal = new bootstrap.Modal(el);
      this.modal.show();
    }
  }

  hideModal(modalId?: string): void {
    if (this.modal) this.modal.hide();
  }

  onSaved(): void {
    this.hideModal('studentModal');
    this.loadStudents(this.pagination?.pageNumber || 1);
  }

  getImageUrl(path: string): string {
    if (!path) return 'assets/images/default-avatar.png'; // Placeholder if needed
    return this.imageBaseUrl + path;
  }

  openImageInNewTab(path: string): void {
    if (path) {
      window.open(this.getImageUrl(path), '_blank');
    }
  }

  onDelete(id: number): void {
    if (confirm('Are you sure you want to delete this student?')) {
      this.apiService.deleteStudent(id).subscribe({
        next: () => this.loadStudents(this.pagination?.pageNumber || 1),
        error: (err: any) => console.error('Error deleting student:', err)
      });
    }
  }

  changePage(page: number): void {
    if (page >= 1 && (!this.pagination || page <= this.pagination.totalPages)) {
      this.loadStudents(page);
    }
  }
}
