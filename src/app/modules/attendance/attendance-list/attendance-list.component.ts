import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../attendance.service';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.css']
})
export class AttendanceListComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private authService = inject(AuthService);
  
  attendances: any[] = [];
  qrCodeUrl: string = '';
  scanUrl: string = '';
  libraryId: number = 0;

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
    this.attendanceService.getTodayAttendance(this.libraryId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.attendances = res.data;
        }
      },
      error: (err) => {
        console.error('Error fetching today attendance', err);
      }
    });
  }

  generateQrCode() {
    const origin = window.location.origin;
    this.scanUrl = `${origin}/public/attendance/${this.libraryId}`;
    console.log('Attendance Scan URL:', this.scanUrl);
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(this.scanUrl)}`;
  }

  showUrlPopup() {
    window.prompt('Copy this URL to test attendance marking:', this.scanUrl);
  }
}
