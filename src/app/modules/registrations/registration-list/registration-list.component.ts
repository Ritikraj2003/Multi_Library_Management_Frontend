import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { finalize } from 'rxjs';
import { Pagination } from '../../../shared/models/pagination.model';
import { RegistrationFormComponent } from '../registration-form/registration-form.component';
import { RegistrationRenewComponent } from '../registration-renew/registration-renew.component';
import { PaymentHistoryComponent } from '../payment-history/payment-history.component';

declare var bootstrap: any;

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [CommonModule, RegistrationFormComponent, RegistrationRenewComponent, PaymentHistoryComponent],
  templateUrl: './registration-list.component.html'
})
export class RegistrationListComponent implements OnInit {
  registrations: any[] = [];
  loading = false;
  activeTab = 'all';
  pagination: Pagination | null = null;
  selectedRegistration: any = null;
  libraryId!: number;
  isSuperadmin = false;
  modal: any;
  currentModalType: 'form' | 'renew' | 'history' | 'view' = 'form';


  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.loadRegistrations();
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.loadRegistrations(1);
  }

  loadRegistrations(pageNumber: number = 1, pageSize: number = 10): void {
    this.loading = true;
    const params: any = {
      PageNumber: pageNumber,
      PageSize: pageSize
    };
    
    if (!this.isSuperadmin && this.libraryId) {
      params.LibraryId = this.libraryId;
    }

    let request;
    switch(this.activeTab) {
      case 'due': request = this.apiService.getDueRegistrations(params); break;
      case 'today': request = this.apiService.getTodayDueRegistrations(params); break;
      case 'expired': request = this.apiService.getExpiredRegistrations(params); break;
      case 'cancelled': request = this.apiService.getCancelledRegistrations(params); break;
      case 'active': 
        params.IsActive = true;
        request = this.apiService.getAllRegistrations(params); 
        break;
      default: request = this.apiService.getAllRegistrations(params); break;
    }

    request.pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          if (res && res.data) {
            this.registrations = res.data.items || [];
            if (res.data.totalCount !== undefined) {
               this.pagination = {
                 pageNumber: res.data.pageNumber,
                 pageSize: res.data.pageSize,
                 totalRecords: res.data.totalCount,
                 totalPages: res.data.totalPages
               };
            }
          }
        },
        error: (err: any) => console.error('Error loading registrations:', err)
      });
  }

  openAddModal(): void {
    this.selectedRegistration = null;
    this.currentModalType = 'form';
    this.showModal('registrationModal');
  }

  openEditModal(reg: any): void {
    this.selectedRegistration = reg;
    this.currentModalType = 'form';
    this.showModal('registrationModal');
  }

  openRenewModal(reg: any): void {
    this.selectedRegistration = reg;
    this.currentModalType = 'renew';
    this.showModal('renewModal');
  }

  openHistoryModal(reg: any): void {
    this.selectedRegistration = reg;
    this.currentModalType = 'history';
    this.showModal('historyModal');
  }

  openViewModal(reg: any): void {
    this.selectedRegistration = reg;
    this.currentModalType = 'view';
    this.showModal('viewModal');
  }


  cancelRegistration(reg: any): void {
    if (!confirm(`Are you sure you want to cancel the registration for ${reg.studentName}? This will free up the seat.`)) {
      return;
    }

    this.loading = true;
    this.apiService.deleteRegistration(reg.id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.loadRegistrations(this.pagination?.pageNumber || 1);
          } else {
            alert(res.message || 'Cancellation failed');
          }
        },
        error: (err: any) => {
          console.error('Error cancelling registration:', err);
          alert('Something went wrong during cancellation');
        }
      });
  }

  private showModal(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      this.modal = new bootstrap.Modal(el);
      this.modal.show();
    }
  }

  hideModal(): void {
    if (this.modal) this.modal.hide();
  }

  onSaved(): void {
    this.hideModal();
    this.loadRegistrations(this.pagination?.pageNumber || 1);
  }

  changePage(page: number): void {
    if (page >= 1 && (!this.pagination || page <= this.pagination.totalPages)) {
      this.loadRegistrations(page);
    }
  }

  getStatusClass(status: string): string {
    switch(status.toLowerCase()) {
      case 'active': return 'bg-success';
      case 'expired': return 'bg-danger';
      case 'due': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }
}
