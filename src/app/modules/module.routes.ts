import { Routes } from '@angular/router';
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

export const MODULE_ROUTES: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'students', component: StudentListComponent },
    { path: 'registrations', component: RegistrationListComponent },
    { path: 'master/user-registration', component: UserListComponent },
    { path: 'master/batch', component: BatchListComponent },
    { path: 'master/section', component: SectionListComponent },
    { path: 'master/tables', component: TableListComponent },
    { path: 'master/general-setting', component: GeneralSettingComponent },
    { path: 'master', component: DashboardComponent }, // Placeholder
    { path: 'library', component: LibraryListComponent },
    { path: 'table-layout', component: TableLayoutComponent },
    { path: 'attendance', loadComponent: () => import('./attendance/attendance-list/attendance-list.component').then(m => m.AttendanceListComponent) },
];

