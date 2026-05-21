import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit {
  private permission: string = '';

  @Input() set appHasPermission(val: string) {
    this.permission = val;
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.updateView();
    });
  }

  private updateView() {
    this.viewContainer.clear();
    const user = this.authService.currentUserValue;
    if (user && user.permissions && user.permissions.includes(this.permission)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
