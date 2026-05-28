import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LoaderService } from '../../shared/services/loader.service';

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
  private loaderService = inject(LoaderService);

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
    this.loaderService.show();
    this.message = '';

    const payload = {
      libraryId: this.libraryId,
      studentId: this.studentId,
      latitude: this.latitude,
      longitude: this.longitude
    };

    this.http.post<any>(`${environment.apiUrl}Attendance/Mark`, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.loaderService.hide();
        
        // 1. Check if success is true or false
        const success = res && (res.success || res.Success);
        this.isSuccess = !!success;
        
        // 2. Set popup message to whatever message is coming from the API
        this.message = res ? (res.message || res.Message || 'Attendance Marked successfully!') : 'Attendance Marked successfully!';
        
        this.showModal = true;
        if (this.isSuccess) {
          this.studentId = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.loaderService.hide();
        this.isSuccess = false;
        console.error('Attendance error (after interceptor):', err);

        let errMsg = '';

        // errorInterceptor transforms the error into a plain string: err.error?.message || err.statusText
        if (typeof err === 'string') {
          errMsg = err;
        } else if (err && err.error) {
          if (err.error.message) {
            errMsg = err.error.message;
          } else if (err.error.Message) {
            errMsg = err.error.Message;
          } else if (typeof err.error === 'string') {
            try {
              const parsed = JSON.parse(err.error);
              errMsg = parsed.message || parsed.Message || err.error;
            } catch (e) {
              errMsg = err.error;
            }
          }
        } else if (err && err.message) {
          errMsg = err.message;
        }

        this.message = errMsg || 'Failed to mark attendance.';
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
