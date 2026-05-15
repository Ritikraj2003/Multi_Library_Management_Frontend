import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  isMasterExpanded = false;

  menuItems = [
    { title: 'Dashboard', icon: 'bi-grid-fill', route: '/dashboard' },
    { title: 'Students', icon: 'bi-people-fill', route: '/dashboard/students' },
    { title: 'Registrations', icon: 'bi-journal-check', route: '/dashboard/registrations' },
    { 
      title: 'Master', 
      icon: 'bi-database-fill', 
      isMaster: true,
      children: [
        { title: 'Batch', route: '/dashboard/master/batch' },
        { title: 'Section', route: '/dashboard/master/section' },
        { title: 'Tables', route: '/dashboard/master/tables' },
        { title: 'User Registration', route: '/dashboard/master/user-registration' },
        { title: 'General Setting', route: '/dashboard/master/general-setting' }
      ]
    },
    { title: 'Library', icon: 'bi-building', route: '/dashboard/library' }
  ];

  toggleMaster() {
    this.isMasterExpanded = !this.isMasterExpanded;
  }
}
