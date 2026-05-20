import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-print-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-preview.component.html',
  styleUrls: ['./print-preview.component.css']
})
export class PrintPreviewComponent implements OnInit {
  private _registration: any = null;

  @Input() set registration(value: any) {
    if (!value) {
      this._registration = null;
      return;
    }
    const data = { ...value };
    this._registration = {
      id: data.id ?? data.Id,
      registrationId: data.registrationId ?? data.RegistrationId ?? data.id ?? data.Id,
      studentName: data.studentName ?? data.StudentName,
      mobile: data.mobile ?? data.Mobile,
      rfidCode: data.rfidCode ?? data.RfidCode ?? data.RFIDCode ?? '',
      tableNumber: data.tableNumber ?? data.TableNumber ?? 'N/A',
      seatNumber: data.seatNumber ?? data.SeatNumber ?? 'N/A',
      batchName: data.batchName ?? data.BatchName ?? 'N/A',
      batchTime: data.batchTime ?? data.BatchTime ?? 'N/A',
      startDate: data.startDate ?? data.StartDate,
      dueDate: data.dueDate ?? data.DueDate,
      monthlyAmount: Number(data.monthlyAmount ?? data.MonthlyAmount ?? 0),
      securityAmount: Number(data.securityAmount ?? data.SecurityAmount ?? 0),
      paymentMode: data.paymentMode ?? data.PaymentMode ?? 'Cash',
      createdByName: data.createdByName ?? data.CreatedByName ?? 'Administrator',
      registrationDate: data.registrationDate ?? data.RegistrationDate
    };
  }

  get registration() {
    return this._registration;
  }

  @Output() close = new EventEmitter<void>();

  libraryName: string = 'Library';
  libraryEmail: string = '';
  currentDate: Date = new Date();
  
  // Customization Toggles
  showSignature: boolean = true;
  showTerms: boolean = true;
  receiptType: 'thermal' | 'classic' = 'thermal';

  // Loading States
  sharingWhatsApp: boolean = false;
  sharingEmail: boolean = false;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  libraryId: number = 0;

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    this.libraryName = user?.libraryName || 'Library';
    this.libraryEmail = user?.email || '';
    this.libraryId = user?.libraryId || 0;
  }

  get totalAmount(): number {
    if (!this.registration) return 0;
    return this.registration.monthlyAmount + this.registration.securityAmount;
  }

  get paymentMode(): string {
    return this.registration?.paymentMode || 'Cash';
  }

  print(): void {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    // 1. Clone the bill inner content to a new top-level div directly on <body>
    const container = document.createElement('div');
    container.id = 'print-bill-container';
    container.innerHTML = `<div class="print-receipt-card ${this.receiptType} receipt-inner p-4">${printArea.innerHTML}</div>`;
    document.body.appendChild(container);

    // 2. Inject a <style> that hides everything except our container during print
    const style = document.createElement('style');
    style.id = 'print-bill-style';
    style.innerHTML = `
      @media print {
        @page { margin: 10mm; }
        body > *:not(#print-bill-container) { display: none !important; visibility: hidden !important; }
        #print-bill-container {
          display: flex !important;
          justify-content: center !important;
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          background: #fff !important;
          z-index: 999999 !important;
          padding: 16px !important;
          box-sizing: border-box !important;
        }
        #print-bill-container .print-receipt-card {
          box-shadow: none !important;
          border: none !important;
          width: 340px !important;
          max-width: 100% !important;
        }
        #print-bill-container .print-receipt-card.classic {
          width: 520px !important;
        }
        .receipt-cut-line { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    // 3. Clean up after print dialog closes
    const cleanup = () => {
      document.getElementById('print-bill-container')?.remove();
      document.getElementById('print-bill-style')?.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  }

  toggleReceiptType(): void {
    this.receiptType = this.receiptType === 'thermal' ? 'classic' : 'thermal';
  }

  shareWhatsApp(): void {
    if (!this.registration || this.sharingWhatsApp) return;
    const studentName = this.registration.studentName || 'Student';
    const mobile = this.registration.mobile || '';
    const library = this.libraryName || 'Library';
    const receiptNo = `SLM-REG-${this.registration.id}`;
    const amount = this.totalAmount;
    
    let formattedDue = 'N/A';
    try {
      if (this.registration.dueDate) {
        formattedDue = new Date(this.registration.dueDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (e) {}

    const seat = this.registration.seatNumber || 'N/A';
    const batch = this.registration.batchName || 'N/A';
    const regId = this.registration.registrationId;
    const libId = this.libraryId || this.registration.libraryId || 0;
    const payId = this.registration.id;
    const receiptUrl = `${window.location.origin}/receipt/${regId}/${libId}/${payId}`;

    const text = `Hello *${studentName}*,\n\nThis is a payment confirmation receipt from *${library}*.\n\n*Receipt Details:*\n- *Receipt No:* #${receiptNo}\n- *Assigned Seat:* Seat ${seat} (${batch})\n- *Amount Paid:* ₹${amount}\n- *Next Due Date:* ${formattedDue}\n\n*View & Download Full Bill here:*\n${receiptUrl}\n\nThank you for studying with us! 🏛️`;
    
    let cleanPhone = mobile.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    if (!cleanPhone) {
      this.notificationService.showError('Student does not have a valid mobile number.');
      return;
    }

    const whatsAppLibId = 'LIB' + String(this.libraryId).padStart(3, '0');
    const body = {
      libraryId: whatsAppLibId,
      number: cleanPhone,
      message: text
    };

    this.sharingWhatsApp = true;
    this.cdr.detectChanges();

    this.apiService.sendSingleWhatsAppMessage(body).subscribe({
      next: (res: any) => {
        this.sharingWhatsApp = false;
        if (res && res.success) {
          this.notificationService.showSuccess('WhatsApp message sent successfully!');
        } else {
          this.notificationService.showError(res?.message || 'Failed to send WhatsApp message.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.sharingWhatsApp = false;
        console.error(err);
        this.notificationService.showError(err.error?.message || err.message || 'Failed to send WhatsApp message.');
        this.cdr.detectChanges();
      }
    });
  }

  shareEmail(): void {
    if (!this.registration || this.sharingEmail) return;

    let targetEmail = this.registration.email || '';
    const confirmPrompt = window.confirm(`Send PDF invoice receipt to the student's email address (${targetEmail || 'No email saved'})? Click OK to send, or Cancel to enter a custom email.`);
    
    let customEmail: string | null = null;
    if (!confirmPrompt) {
      const inputEmail = window.prompt('Please enter the email address to send the PDF receipt:', '');
      if (inputEmail === null) return;
      if (inputEmail.trim() === '') {
        this.notificationService.showError('Email address cannot be empty.');
        return;
      }
      customEmail = inputEmail;
    }

    this.sharingEmail = true;
    this.cdr.detectChanges();

    const payload = {
      registrationId: this.registration.registrationId,
      customEmail: customEmail,
      paymentId: this.registration.id
    };

    this.apiService.sendReceiptEmail(payload).subscribe({
      next: (res: any) => {
        this.sharingEmail = false;
        if (res && res.success) {
          this.notificationService.showSuccess('Payment receipt PDF generated and sent to email successfully!');
        } else {
          this.notificationService.showError(res.message || 'Failed to send receipt email.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.sharingEmail = false;
        console.error(err);
        this.notificationService.showError(err.error?.message || err.message || 'Failed to send receipt email.');
        this.cdr.detectChanges();
      }
    });
  }
}
