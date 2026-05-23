import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const requiredPermissions = route.data['permissions'] as string[];
    const requiredPermission = route.data['permission'] as string; // fallback for single

    if (!requiredPermissions && !requiredPermission) return true;

    const user = this.authService.currentUserValue;
    if (user && user.isSuperadmin) return true;

    if (user && user.permissions) {
      if (requiredPermissions && requiredPermissions.length > 0) {
        // If array of permissions provided, check if user has AT LEAST ONE
        const hasAny = requiredPermissions.some(p => user.permissions.includes(p));
        if (hasAny) return true;
      } else if (requiredPermission && user.permissions.includes(requiredPermission)) {
        return true;
      }
    }

    // If no permission, redirect to dashboard or access denied
    if (state.url !== '/dashboard' && state.url !== '/') {
      this.router.navigate(['/dashboard']);
    }
    return false;
  }
}
