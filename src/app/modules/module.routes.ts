import { Routes } from '@angular/router';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LibraryListComponent } from './library/library-list/library-list.component';
import { UserListComponent } from './master/user-registration/user-list/user-list.component';
import { BatchListComponent } from './master/batch/batch-list/batch-list.component';
import { SectionListComponent } from './master/section/section-list/section-list.component';
import { TableListComponent } from './master/tables/table-list/table-list.component';
import { StudentListComponent } from './students/student-list/student-list.component';
import { RegistrationListComponent } from './registrations/registration-list/registration-list.component';
import { GeneralSettingComponent } from './master/general-setting/general-setting.component';
import { TableLayoutComponent } from './library/table-layout/table-layout.component';
import { RolePermission } from './master/role-permission/role-permission';
 
export const MODULE_ROUTES: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_DASHBOARD'] } },
    { path: 'students', component: StudentListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_STUDENT', 'CREATE_STUDENT', 'EDIT_STUDENT'] } },
    { path: 'registrations', component: RegistrationListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_REGISTRATION', 'CREATE_REGISTRATION', 'EDIT_REGISTRATION', 'STUDENT_REGISTRATION_QR'] } },
    { path: 'master/user-registration', component: UserListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_USER', 'CREATE_USER', 'EDIT_USER'] } },
    { path: 'master/batch', component: BatchListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_BATCH', 'CREATE_BATCH', 'EDIT_BATCH'] } },
    { path: 'master/section', component: SectionListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_SECTION', 'CREATE_SECTION', 'EDIT_SECTION'] } },
    { path: 'master/tables', component: TableListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_SEAT', 'CREATE_SEAT', 'EDIT_SEAT'] } },
    { path: 'master/general-setting', component: GeneralSettingComponent, canActivate: [PermissionGuard], data: { permissions: ['GENERAL_SETTING_EMAIL_VIEW', 'GENERAL_SETTING_RAZORPAY_VIEW', 'GENERAL_SETTING_WHATSAPP_VIEW', 'GENERAL_SETTING_ATTENDANCE_LOCATION_VIEW'] } },
    { path: 'master/role-permission', component: RolePermission, canActivate: [PermissionGuard], data: { permissions: ['VIEW_ROLE', 'CREATE_ROLE', 'EDIT_ROLE'] } },
    { path: 'master', component: DashboardComponent }, // Placeholder
    { path: 'library', component: LibraryListComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_LIBRARY', 'CREATE_LIBRARY', 'EDIT_LIBRARY'] } },
    { path: 'table-layout', component: TableLayoutComponent, canActivate: [PermissionGuard], data: { permissions: ['VIEW_SEATING_LAYOUT'] } },
    { path: 'attendance', loadComponent: () => import('./attendance/attendance-list/attendance-list.component').then(m => m.AttendanceListComponent), canActivate: [PermissionGuard], data: { permissions: ['VIEW_ATTENDANCE', 'ATTENDANCE_QR'] } },
];

