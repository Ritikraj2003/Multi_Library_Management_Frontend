import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-public-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-attendance.component.html',
  styleUrls: ['./public-attendance.component.css']
})
export class PublicAttendanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  libraryId: number = 0;
  studentId: number | null = null;
  latitude: number | null = null;
  longitude: number | null = null;
  
  isLoading: boolean = false;
  message: string = '';
  isSuccess: boolean = false;
  locationError: string = '';
  showModal: boolean = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.libraryId = Number(params.get('libraryId'));
    });
    this.getLocation();
  }

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.latitude = position.coords.latitude;
          this.longitude = position.coords.longitude;
          this.locationError = '';
        },
        (error) => {
          this.locationError = 'Please enable location services to mark attendance.';
          console.error(error);
        },
        { enableHighAccuracy: true }
      );
    } else {
      this.locationError = 'Geolocation is not supported by this browser.';
    }
  }

  submitAttendance() {
    if (!this.studentId) {
      this.message = 'Please enter your Enrollment ID (Student ID).';
      this.isSuccess = false;
      return;
    }

    if (this.latitude === null || this.longitude === null) {
      this.message = 'Location not available. Cannot mark attendance.';
      this.isSuccess = false;
      return;
    }

    this.isLoading = true;
    this.message = '';

    const payload = {
      studentId: this.studentId,
      latitude: this.latitude,
      longitude: this.longitude
    };

    this.http.post<any>(`${environment.apiUrl}Attendance/Mark`, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isSuccess = res.success;
        this.message = res.message || 'Attendance Marked successfully!';
        this.showModal = true;
        if (this.isSuccess) {
          this.studentId = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.message = err.error?.message || 'An error occurred while marking attendance.';
        this.showModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.cdr.detectChanges();
  }
}
