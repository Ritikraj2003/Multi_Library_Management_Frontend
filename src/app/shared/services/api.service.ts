import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Auth Endpoints
  login(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Auth/Login`, body);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Auth/ForgotPassword`, { email });
  }

  resetPassword(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Auth/ResetPassword`, body);
  }

  // Library Endpoints
  getAllLibraries(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Library/GetAll`, { params });
  }

  getLibraryById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Library/GetById/${id}`);
  }

  createLibrary(body: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Library/Create`, body);
  }

  updateLibrary(body: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}Library/Update`, body);
  }

  deleteLibrary(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}Library/Delete/${id}`);
  }

  // User Endpoints
  getAllUsers(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}User/GetAll`, { params });
  }

  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}User/GetById/${id}`);
  }

  createUser(body: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}User/Create`, body);
  }

  updateUser(body: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}User/Update`, body);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}User/Delete/${id}`);
  }

  // Role Endpoints
  getRolesByLibraryId(libraryId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Role/GetByLibraryId/${libraryId}`);
  }

  // Batch Endpoints
  getBatchesByLibraryId(libraryId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Batch/GetByLibraryId/${libraryId}`);
  }

  createBatch(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Batch/Create`, body);
  }

  updateBatch(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}Batch/Update`, { ...body, id });
  }

  deleteBatch(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}Batch/Delete/${id}`);
  }

  // Floor Endpoints
  getAllFloors(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Floor/GetAll`, { params });
  }

  createFloor(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Floor/Create`, body);
  }

  updateFloor(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}Floor/Update`, { ...body, id });
  }

  deleteFloor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}Floor/Delete/${id}`);
  }

  // TableSeat Endpoints
  getAllTables(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}TableSeat/GetAll`, { params });
  }

  createTable(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}TableSeat/Create`, body);
  }

  updateTable(body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}TableSeat/Update`, body);
  }

  deleteTable(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}TableSeat/Delete/${id}`);
  }

  // Student Endpoints
  getAllStudents(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Student/GetAll`, { params });
  }

  createStudent(body: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Student/Create`, body);
  }

  updateStudent(body: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}Student/Update`, body);
  }

  deleteStudent(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}Student/Delete/${id}`);
  }

  // Student Registration Endpoints
  getAllRegistrations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration`, { params });
  }

  getRegistrationById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration/${id}`);
  }

  createRegistration(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}student-registration`, body);
  }

  updateRegistration(id: number, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}student-registration/${id}`, body);
  }

  deleteRegistration(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}student-registration/${id}`);
  }

  getDueRegistrations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration/due`, { params });
  }

  getTodayDueRegistrations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration/today-due`, { params });
  }

  getExpiredRegistrations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration/expired`, { params });
  }

  getCancelledRegistrations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration/cancelled`, { params });
  }

  renewRegistration(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}student-registration/renew`, body);
  }

  getPaymentHistory(registrationId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}student-registration/payment-history/${registrationId}`);
  }

  getSeatAvailability(seatId: number, libraryId: number, registrationId?: number): Observable<any> {
    let url = `${this.baseUrl}student-registration/seat-availability/${seatId}/${libraryId}`;
    if (registrationId) url += `?registrationId=${registrationId}`;
    return this.http.get<any>(url);
  }

  // Dashboard Endpoints
  getDashboardStats(libraryId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}Dashboard/stats/${libraryId}`);
  }

  // General Setting Endpoints
  getSettingsByLibraryId(libraryId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}GeneralSetting/GetByLibraryId/${libraryId}`);
  }

  upsertSetting(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}GeneralSetting/Upsert`, body);
  }

  deleteSetting(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}GeneralSetting/Delete/${id}`);
  }
}
