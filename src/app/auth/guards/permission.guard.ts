import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const requiredPermission = route.data['permission'];
    if (!requiredPermission) return true;

    const user = this.authService.currentUserValue;
    if (user && user.permissions && user.permissions.includes(requiredPermission)) {
      return true;
    }

    // If no permission, redirect to dashboard or access denied
    this.router.navigate(['/dashboard']);
    return false;
  }
}
