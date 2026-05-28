import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';
import { Router } from '@angular/router';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  private timer: any;

  constructor(
    public authService: AuthService,
    private router: Router,
    private layoutService: LayoutService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentDate = new Date();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }
}
