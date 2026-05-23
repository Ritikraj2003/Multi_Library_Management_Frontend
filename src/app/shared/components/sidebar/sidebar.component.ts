import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  isMasterExpanded = false;
  imageBaseUrl = environment.apiUrl.replace('api/', '');
  currentUser$ = this.authService.currentUser;

  menuItems = [
    { title: 'Dashboard', icon: 'bi-grid-fill', route: '/dashboard' },
    { title: 'Students', icon: 'bi-people-fill', route: '/students' },
    { title: 'Registrations', icon: 'bi-journal-check', route: '/registrations' },
    { title: 'Attendance', icon: 'bi-calendar-check', route: '/attendance' },
    { title: 'Seating Layout', icon: 'bi-layout-three-columns', route: '/table-layout' },
    {
      title: 'Master',
      icon: 'bi-database-fill',
      isMaster: true,
      children: [
        { title: 'Batch', route: '/master/batch' },
        { title: 'Section', route: '/master/section' },
        { title: 'Seat Master', route: '/master/tables' },
        { title: 'User Registration', route: '/master/user-registration' },
        { title: 'Role Permissions', route: '/master/role-permission' },
        { title: 'General Setting', route: '/master/general-setting' },

      ]
    },
    { title: 'Library', icon: 'bi-building', route: '/library' }
  ];

  toggleMaster() {
    this.isMasterExpanded = !this.isMasterExpanded;
  }

  hasMenuPermission(title: string): boolean {
    switch (title) {
      case 'Dashboard':
        return this.authService.hasPermission('VIEW_DASHBOARD');
      case 'Students':
        return this.authService.hasPermission('VIEW_STUDENT') || this.authService.hasPermission('CREATE_STUDENT') || this.authService.hasPermission('EDIT_STUDENT');
      case 'Registrations':
        return this.authService.hasPermission('VIEW_REGISTRATION') || this.authService.hasPermission('CREATE_REGISTRATION') || this.authService.hasPermission('EDIT_REGISTRATION') || this.authService.hasPermission('STUDENT_REGISTRATION_QR');
      case 'Attendance':
        return this.authService.hasPermission('VIEW_ATTENDANCE') || this.authService.hasPermission('ATTENDANCE_QR');
      case 'Seating Layout':
        return this.authService.hasPermission('VIEW_SEATING_LAYOUT');
      case 'Library':
        return this.authService.hasPermission('VIEW_LIBRARY') || this.authService.hasPermission('CREATE_LIBRARY') || this.authService.hasPermission('EDIT_LIBRARY');
      case 'Batch':
        return this.authService.hasPermission('VIEW_BATCH') || this.authService.hasPermission('CREATE_BATCH') || this.authService.hasPermission('EDIT_BATCH');
      case 'Section':
        return this.authService.hasPermission('VIEW_SECTION') || this.authService.hasPermission('CREATE_SECTION') || this.authService.hasPermission('EDIT_SECTION');
      case 'Seat Master':
        return this.authService.hasPermission('VIEW_SEAT') || this.authService.hasPermission('CREATE_SEAT') || this.authService.hasPermission('EDIT_SEAT');
      case 'User Registration':
        return this.authService.hasPermission('VIEW_USER') || this.authService.hasPermission('CREATE_USER') || this.authService.hasPermission('EDIT_USER');
      case 'Role Permissions':
        return this.authService.hasPermission('VIEW_ROLE') || this.authService.hasPermission('CREATE_ROLE') || this.authService.hasPermission('EDIT_ROLE');
      case 'General Setting':
        return this.authService.hasPermission('GENERAL_SETTING_EMAIL_VIEW') || 
               this.authService.hasPermission('GENERAL_SETTING_RAZORPAY_VIEW') ||
               this.authService.hasPermission('GENERAL_SETTING_WHATSAPP_VIEW') ||
               this.authService.hasPermission('GENERAL_SETTING_ATTENDANCE_LOCATION_VIEW');
      case 'Master':
        return this.hasMenuPermission('Batch') || 
               this.hasMenuPermission('Section') || 
               this.hasMenuPermission('Seat Master') || 
               this.hasMenuPermission('User Registration') || 
               this.hasMenuPermission('Role Permissions') || 
               this.hasMenuPermission('General Setting');
      default:
        return false;
    }
  }
}
