import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ApiService } from '../../shared/services/api.service';
import { StorageService } from '../../shared/services/storage.service';
import { User } from '../../shared/models/user.model';
import { ApiResponse } from '../../shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(
    private apiService: ApiService,
    private storageService: StorageService
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.storageService.getItem('currentUser'));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(credentials: any): Observable<ApiResponse<User>> {
    return this.apiService.login(credentials)
      .pipe(map(response => {
        if (response && response.success && response.data.token) {
          this.storageService.setItem('currentUser', response.data);
          this.currentUserSubject.next(response.data);
        }
        return response;
      }));
  }

  logout(): void {
    this.storageService.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }
}
