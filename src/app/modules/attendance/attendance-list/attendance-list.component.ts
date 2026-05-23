import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../attendance.service';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';



@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.css']
})
export class AttendanceListComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  cdr = inject(ChangeDetectorRef);

  // Raw data from API
  allAttendances: any[] = [];

  // Search
  searchTerm: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  // Student detail modal
  selectedStudent: any = null;
  showStudentModal: boolean = false;

  // Other
  qrCodeUrl: string = '';
  scanUrl: string = '';
  libraryId: number = 0;
  showModal: boolean = false;
  isLoading: boolean = false;

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user && user.libraryId) {
        this.libraryId = user.libraryId;
        this.loadAttendances();
        this.generateQrCode();
      }
    });
  }

  loadAttendances() {
    this.isLoading = true;
    this.attendanceService.getTodayAttendance(this.libraryId).subscribe({
      next: (res: any) => {
        this.allAttendances = (res?.success && Array.isArray(res?.data)) ? res.data : [];
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching today attendance', err);
        this.allAttendances = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Search & Filter ---
  get filteredAttendances(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.allAttendances;
    return this.allAttendances.filter(r =>
      r.studentName?.toLowerCase().includes(term) ||
      String(r.studentId).includes(term) ||
      r.mobile?.includes(term)
    );
  }

  onSearchChange() {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  get showingUpTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  // --- Pagination ---
  get totalRecords(): number {
    return this.filteredAttendances.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  get paginatedAttendances(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAttendances.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    // Show max 5 page numbers around current
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  // --- Student Detail Modal ---
  openStudentModal(record: any) {
    this.selectedStudent = record;
    this.showStudentModal = true;
    this.cdr.detectChanges();
  }

  closeStudentModal() {
    this.showStudentModal = false;
    this.selectedStudent = null;
    this.cdr.detectChanges();
  }

  getPhotoUrl(photo: string | null | undefined): string {
    if (!photo) return '';
    // photo is like: uploads/student/abc.jpg
    // apiUrl is like: https://localhost:7098/api/
    // We need: https://localhost:7098/uploads/student/abc.jpg
    const base = environment.apiUrl.replace(/\/api\/?$/, ''); // → https://localhost:7098
    const cleanPhoto = photo.startsWith('/') ? photo.slice(1) : photo;
    const url = `${base}/${cleanPhoto}`;
    return url;
  }

  // --- QR ---
  generateQrCode() {
    const origin = window.location.origin;
    this.scanUrl = `${origin}/public/attendance/${this.libraryId}`;
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(this.scanUrl)}`;
  }

  showUrlPopup() {
    navigator.clipboard.writeText(this.scanUrl).then(() => {
      this.notificationService.showSuccess('Link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  openQrModal() {
    this.showModal = true;
  }

  closeQrModal() {
    this.showModal = false;
  }
}
