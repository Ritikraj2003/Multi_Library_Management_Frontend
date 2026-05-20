import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { finalize } from 'rxjs';
import { Pagination } from '../../../shared/models/pagination.model';
import { RegistrationFormComponent } from '../registration-form/registration-form.component';
import { RegistrationRenewComponent } from '../registration-renew/registration-renew.component';
import { PaymentHistoryComponent } from '../payment-history/payment-history.component';
import { PrintPreviewComponent } from '../print-preview/print-preview.component';

declare var bootstrap: any;

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RegistrationFormComponent, RegistrationRenewComponent, PaymentHistoryComponent, LoaderComponent, PrintPreviewComponent],
  templateUrl: './registration-list.component.html'
})
export class RegistrationListComponent implements OnInit {
  registrations: any[] = [];
  loading = false;
  activeTab = 'all';
  pagination: Pagination | null = null;
  selectedRegistration: any = undefined;
  libraryId!: number;
  libraryName: string = '';
  isSuperadmin = false;
  modal: any;
  currentModalType?: 'form' | 'renew' | 'history' | 'view' | 'qr' | 'whatsapp' | 'bulk_whatsapp' | 'print';
  qrUrl = '';

  // WhatsApp States
  whatsappLoading = false;
  whatsappMessage = '';
  whatsappRecipient = '';
  whatsappPhone = '';
  whatsappReg: any = null;

  // Bulk WhatsApp States
  bulkWhatsappLoading = false;
  bulkWhatsappMessageTemplate = 'Hello {name},\n\nThis is a friendly reminder that your library registration payment of *₹{amount}* is due on *{date}* for Seat *{seat}* ({batch}).\n\n*Please complete your payment as soon as possible.* to continue your registration.\n\n🏛️ *{library}*\nThank you!';
  bulkRecipientsCount = 0;
  bulkResults: any = null;
  bulkProgress = 0;
  bulkStatus: 'idle' | 'sending' | 'completed' | 'error' = 'idle';


  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {
    this.isSuperadmin = this.authService.currentUserValue?.isSuperadmin || false;
  }

  ngOnInit(): void {
    this.libraryId = this.authService.currentUserValue?.libraryId ?? 0;
    this.libraryName = this.authService.currentUserValue?.libraryName || 'Library';
    this.loadRegistrations();
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.loadRegistrations(1);
  }

  loadRegistrations(pageNumber: number = 1, pageSize: number = 10): void {
    this.loading = true;
    this.registrations = []; // Clear old data immediately to prevent flash when switching tabs
    this.pagination = null;
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

  openQrModal(): void {
    const baseUrl = window.location.origin;
    this.qrUrl = `${baseUrl}/public/register/${this.libraryId}`;
    this.currentModalType = 'qr';
    this.showModal('qrModal');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    });
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
    this.cdr.detectChanges();
    const el = document.getElementById(id);
    if (el) {
      let modalInstance = bootstrap.Modal.getInstance(el);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(el);
      }
      this.modal = modalInstance;
      this.modal.show();
    }
  }

  hideModal(): void {
    if (this.modal) this.modal.hide();
  }

  onSaved(reg?: any): void {
    this.hideModal();
    this.loadRegistrations(this.pagination?.pageNumber || 1);
    if (reg) {
      setTimeout(() => {
        this.openPrintPreview(reg);
      }, 600);
    }
  }

  openPrintPreview(reg: any): void {
    if (!reg) return;
    
    // Check if we need to fetch full details (list DTO lacks some detailed receipt fields like TableNumber or SecurityAmount)
    const hasFullDetails = reg.tableNumber !== undefined && reg.securityAmount !== undefined;
    
    if (reg.id && !hasFullDetails) {
      this.loading = true;
      this.apiService.getRegistrationById(reg.id).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) {
            // Merge mobile number from list item to guarantee it is present
            const detailedReg = { 
              ...res.data, 
              mobile: reg.mobile || res.data.mobile 
            };
            this.selectedRegistration = detailedReg;
            this.currentModalType = 'print';
            this.showModal('printPreviewModal');
          } else {
            alert(res.message || 'Failed to fetch invoice details.');
          }
        },
        error: (err) => {
          this.loading = false;
          console.error('Error fetching detailed registration:', err);
          alert('Could not retrieve full receipt details.');
        }
      });
    } else {
      this.selectedRegistration = reg;
      this.currentModalType = 'print';
      this.showModal('printPreviewModal');
    }
  }

  changePage(page: number): void {
    if (page >= 1 && (!this.pagination || page <= this.pagination.totalPages)) {
      this.loadRegistrations(page);
    }
  }

  getStatusClass(status: any): string {
    if (status === undefined || status === null) return 'bg-secondary';
    const s = String(status).toLowerCase();
    switch(s) {
      case 'active': case '1': return 'bg-success';
      case 'expired': case '2': return 'bg-danger';
      case 'due': case '4': return 'bg-warning text-dark';
      case 'cancelled': case '3': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  getStatusText(status: any): string {
    if (status === undefined || status === null) return 'Unknown';
    const s = String(status).toLowerCase();
    switch(s) {
      case 'active': case '1': return 'Active';
      case 'expired': case '2': return 'Expired';
      case 'cancelled': case '3': return 'Cancelled';
      case 'due': case '4': return 'Due';
      default: return s.charAt(0).toUpperCase() + s.slice(1);
    }
  }

  // ===================== WhatsApp Methods =====================

  openWhatsAppModal(reg: any): void {
    this.whatsappReg = reg;
    this.whatsappRecipient = reg.studentName;
    this.whatsappPhone = reg.mobile;
    
    // Default template message
    const formattedDate = reg.dueDate ? new Date(reg.dueDate).toLocaleDateString() : 'N/A';
    this.whatsappMessage = `Hello ${reg.studentName},\n\nThis is a friendly reminder that your library registration payment of *₹${reg.monthlyAmount}* is due on *${formattedDate}* for Seat *${reg.seatNumber}* (${reg.batchName}).\n\n*Please complete your payment to continue your registration.*\n\n🏛️ *${this.libraryName}*\nThank you!`;
    
    this.currentModalType = 'whatsapp';
    this.showModal('whatsappModal');
  }

  sendWhatsAppMessage(): void {
    if (!this.whatsappPhone) {
      this.notificationService.showError('Recipient phone number is required.');
      return;
    }

    const whatsAppLibId = 'LIB' + String(this.libraryId).padStart(3, '0');
    const body = {
      libraryId: whatsAppLibId,
      number: this.whatsappPhone,
      message: this.whatsappMessage
    };

    this.whatsappLoading = true;
    this.cdr.markForCheck();

    this.apiService.sendSingleWhatsAppMessage(body)
      .pipe(finalize(() => {
        this.whatsappLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.notificationService.showSuccess('WhatsApp message sent successfully!');
            this.hideModal();
          } else {
            this.notificationService.showError(res.message || 'Failed to send WhatsApp message.');
          }
        },
        error: (err: any) => {
          console.error('Error sending WhatsApp message:', err);
          const errMsg = err.error?.message || err.message || 'Error occurred. Make sure WhatsApp is connected in settings.';
          this.notificationService.showError(errMsg);
        }
      });
  }

  openBulkWhatsAppModal(): void {
    this.bulkStatus = 'idle';
    this.bulkProgress = 0;
    this.bulkResults = null;
    
    // Count recipients
    this.bulkRecipientsCount = this.registrations.length;
    this.currentModalType = 'bulk_whatsapp';
    this.showModal('bulkWhatsappModal');
  }

  sendBulkWhatsAppAlerts(): void {
    if (this.registrations.length === 0) {
      this.notificationService.showWarning('No recipients found to send alerts to.');
      return;
    }

    const whatsAppLibId = 'LIB' + String(this.libraryId).padStart(3, '0');
    
    // Build JSON data
    const bulkData = this.registrations.map(reg => {
      const formattedDate = reg.dueDate ? new Date(reg.dueDate).toLocaleDateString() : 'N/A';
      
      // Resolve placeholders: {name}, {amount}, {date}, {seat}, {batch}, {library}
      let msg = this.bulkWhatsappMessageTemplate
        .replace(/{name}/g, reg.studentName || '')
        .replace(/{amount}/g, String(reg.monthlyAmount || ''))
        .replace(/{date}/g, formattedDate)
        .replace(/{seat}/g, String(reg.seatNumber || ''))
        .replace(/{batch}/g, reg.batchName || '')
        .replace(/{library}/g, this.libraryName || '');
        
      return {
        phone: reg.mobile,
        message: msg
      };
    });

    const body = {
      libraryId: whatsAppLibId,
      data: bulkData
    };

    this.bulkWhatsappLoading = true;
    this.bulkStatus = 'sending';
    this.bulkProgress = 0;
    this.cdr.markForCheck();

    this.apiService.sendBulkWhatsAppJson(body)
      .pipe(finalize(() => {
        this.bulkWhatsappLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.bulkStatus = 'completed';
            this.bulkResults = res.results;
            this.notificationService.showSuccess(`Bulk alerts complete: Sent ${res.results.success} successfully, ${res.results.failed} failed.`);
          } else {
            this.bulkStatus = 'error';
            this.notificationService.showError(res.message || 'Failed to send bulk WhatsApp alerts.');
          }
        },
        error: (err: any) => {
          console.error('Error sending bulk WhatsApp alerts:', err);
          this.bulkStatus = 'error';
          const errMsg = err.error?.message || err.message || 'Error occurred. Make sure WhatsApp is connected in settings.';
          this.notificationService.showError(errMsg);
        }
      });
  }

  get bulkPreviewMessage(): string {
    if (this.registrations.length === 0) return '';
    const firstReg = this.registrations[0];
    const formattedDate = firstReg.dueDate ? new Date(firstReg.dueDate).toLocaleDateString() : 'N/A';
    
    return this.bulkWhatsappMessageTemplate
      .replace(/{name}/g, firstReg.studentName || '')
      .replace(/{amount}/g, String(firstReg.monthlyAmount || ''))
      .replace(/{date}/g, formattedDate)
      .replace(/{seat}/g, String(firstReg.seatNumber || ''))
      .replace(/{batch}/g, firstReg.batchName || '')
      .replace(/{library}/g, this.libraryName || '');
  }
}
// Touch to trigger clean re-compilation of print-preview features
