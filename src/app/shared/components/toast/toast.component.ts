import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastMessage } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999">
      <div *ngFor="let toast of toasts; let i = index" 
           class="toast show align-items-center text-white border-0 mb-2" 
           [ngClass]="getBgClass(toast.type)"
           role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <i [ngClass]="getIconClass(toast.type)" class="me-2"></i>
            {{ toast.message }}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" (click)="removeToast(toast)"></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast {
      min-width: 250px;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription!: Subscription;

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.subscription = this.notificationService.toastState$.subscribe(toast => {
      this.toasts.push(toast);
      this.cdr.detectChanges();
      setTimeout(() => {
        this.removeToast(toast);
      }, 3000);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeToast(toast: ToastMessage): void {
    this.toasts = this.toasts.filter(t => t !== toast);
    this.cdr.detectChanges();
  }

  getBgClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-success';
      case 'error': return 'bg-danger';
      case 'warning': return 'bg-warning text-dark';
      case 'info': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'bi bi-check-circle-fill';
      case 'error': return 'bi bi-exclamation-triangle-fill';
      case 'warning': return 'bi bi-exclamation-circle-fill';
      case 'info': return 'bi bi-info-circle-fill';
      default: return 'bi bi-bell-fill';
    }
  }
}
