import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loaderSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.loaderSubject.asObservable();

  private activeRequests = 0;

  show() {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.loaderSubject.next(true);
    }
  }

  hide() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      this.loaderSubject.next(false);
    }
  }
}
