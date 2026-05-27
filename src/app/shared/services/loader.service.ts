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
    setTimeout(() => {
      this.activeRequests++;
      if (this.activeRequests === 1) {
        this.loaderSubject.next(true);
      }
    });
  }

  hide() {
    setTimeout(() => {
      this.activeRequests--;
      if (this.activeRequests <= 0) {
        this.activeRequests = 0;
        this.loaderSubject.next(false);
      }
    });
  }
}
