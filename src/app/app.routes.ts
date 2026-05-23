import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [

  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
      }
    ]
  },
  {
    path: 'public/register/:libraryId',
    loadComponent: () => import('./public/public-registration/public-registration.component').then(m => m.PublicRegistrationComponent)
  },
  {
    path: 'public/attendance/:libraryId',
    loadComponent: () => import('./public/public-attendance/public-attendance.component').then(m => m.PublicAttendanceComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./modules/module.routes').then(m => m.MODULE_ROUTES)
      }
    ]
  },
  {
    path: 'receipt/:registrationId/:libraryId/:paymentId',
    loadComponent: () => import('./public/public-receipt/public-receipt.component').then(m => m.PublicReceiptComponent)
  },
  {
    path: 'receipt/:id',
    loadComponent: () => import('./public/public-receipt/public-receipt.component').then(m => m.PublicReceiptComponent)
  },
  { path: '**', redirectTo: 'auth/login' }
];
