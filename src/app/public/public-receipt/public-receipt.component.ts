import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-public-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-receipt.component.html',
  styleUrls: ['./public-receipt.component.css']
})
export class PublicReceiptComponent implements OnInit {
  registrationId: number | null = null;
  libraryId: number | null = null;
  paymentId: number | null = null;
  registration: any = null;
  loading: boolean = true;
  error: string | null = null;
  
  // Customization Toggles similar to print-preview
  showSignature: boolean = true;
  showTerms: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const regIdParam = params.get('registrationId');
      const libIdParam = params.get('libraryId');
      const payIdParam = params.get('paymentId');
      const singleIdParam = params.get('id');

      if (regIdParam && libIdParam && payIdParam) {
        this.registrationId = +regIdParam;
        this.libraryId = +libIdParam;
        this.paymentId = +payIdParam;
        this.loadReceipt();
      } else if (singleIdParam) {
        this.registrationId = +singleIdParam;
        this.libraryId = null;
        this.paymentId = null;
        this.loadReceipt();
      } else {
        this.error = 'Invalid receipt link.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadReceipt(): void {
    if (!this.registrationId) return;
    this.loading = true;
    
    const request = this.libraryId !== null && this.paymentId !== null
      ? this.apiService.getPublicReceipt(this.registrationId, this.libraryId, this.paymentId)
      : this.apiService.getPublicReceipt(this.registrationId);

    request.subscribe({
      next: (res: any) => {
        if (res) {
          if (res.success && res.data) {
            this.registration = res.data;
            this.error = null;
          } else if (res.id || res.Id || res.studentName || res.StudentName) {
            this.registration = res;
            this.error = null;
          } else {
            this.error = res?.message || 'Receipt not found.';
          }
        } else {
          this.error = 'Receipt not found.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err?.error?.message || err?.message || 'Failed to load receipt.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get totalAmount(): number {
    if (!this.registration) return 0;
    return (this.registration.monthlyAmount || 0) + (this.registration.securityAmount || 0);
  }

  get paymentMode(): string {
    return this.registration?.paymentMode || 'Cash';
  }

  downloadBill(): void {
    const element = document.getElementById('print-area');
    if (!element) return;

    this.loading = true;
    this.cdr.detectChanges();

    // Use html2canvas to render the #print-area element to a canvas
    html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true, // CORS settings for remote images (like QR code servers)
      allowTaint: true
    }).then((canvas: any) => {
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate layout matching the card's aspect ratio
      const pdfWidth = 120; // 120mm width
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `Receipt_SLM-REG-${this.registrationId || 'Bill'}.pdf`;
      doc.save(fileName);
      
      this.loading = false;
      this.cdr.detectChanges();
    }).catch((err: any) => {
      console.error('Error generating PDF:', err);
      this.loading = false;
      this.cdr.detectChanges();
      // Fallback to native window.print() if html2canvas/jspdf fails
      window.print();
    });
  }
}
