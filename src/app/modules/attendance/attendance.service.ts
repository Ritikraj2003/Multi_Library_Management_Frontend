import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  markAttendance(data: { studentId: number; latitude: number; longitude: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}Attendance/Mark`, data);
  }

  getTodayAttendance(libraryId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}Attendance/Today/${libraryId}`);
  }
}
