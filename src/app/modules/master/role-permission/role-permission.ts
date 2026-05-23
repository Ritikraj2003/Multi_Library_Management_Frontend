import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-role-permission',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './role-permission.html',
  styleUrl: './role-permission.css'
})
export class RolePermission implements OnInit {
  private apiService = inject(ApiService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  
  roles: any[] = [];
  searchTerm: string = '';
  loading: boolean = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  
  currentUser = this.authService.currentUserValue;
  
  // Modal State
  isModalOpen = false;
  isEditMode = false;
  
  currentRole: any = {
    name: '',
    isActive: true
  };
  
  // Permissions State for Modal
  allLibraryPermissions: any[] = [];
  availablePermissions: any[] = [];
  chosenPermissions: any[] = [];
  
  availableSearchTerm: string = '';
  chosenSearchTerm: string = '';
  
  // Selection state for dual listbox
  selectedAvailable: any[] = [];
  selectedChosen: any[] = [];

  Math = Math;
  
  ngOnInit() {
    this.loadRoles();
  }
  
  loadRoles() {
    this.loading = true;
    const params = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm
    };
    
    if (this.currentUser?.libraryId) {
      // If we have a specific API for fetching roles with pagination for a library, use it.
      // Otherwise, we might just fetch all for the library and paginate client-side.
      // Assuming getRolesByLibraryId does not paginate, let's just fetch all and filter/paginate client-side for now,
      // OR if the backend supports it, pass params.
      this.apiService.getRolesByLibraryId(this.currentUser.libraryId)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe((res: any) => {
        if (res.success) {
          let data = res.data;
          if (this.searchTerm) {
            data = data.filter((r: any) => r.name.toLowerCase().includes(this.searchTerm.toLowerCase()));
          }
          this.totalRecords = data.length;
          const startIndex = (this.currentPage - 1) * this.pageSize;
          this.roles = data.slice(startIndex, startIndex + this.pageSize);
        }
      });
    } else {
      this.apiService.getAllRoles(params)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe((res: any) => {
        if (res.success) {
          this.roles = res.data.items || res.data;
          this.totalRecords = res.data.totalCount || this.roles.length;
        }
      });
    }
  }
  
  onSearch() {
    this.currentPage = 1;
    this.loadRoles();
  }
  
  onPageSizeChange() {
    this.currentPage = 1;
    this.loadRoles();
  }
  
  nextPage() {
    if (this.currentPage * this.pageSize < this.totalRecords) {
      this.currentPage++;
      this.loadRoles();
    }
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadRoles();
    }
  }
  
  loadLibraryPermissions(callback?: () => void) {
    if (this.allLibraryPermissions.length > 0) {
      if (callback) callback();
      return;
    }

    const libraryId = this.currentUser?.libraryId;
    if (libraryId) {
      this.apiService.getPermissionsByLibrary(libraryId).subscribe((res: any) => {
        if (res.success) {
          this.allLibraryPermissions = res.data.map((lp: any) => ({
            id: lp.permissionId,
            name: lp.permissionName,
            module: lp.module,
            displayName: `${lp.module} | ${lp.permissionName}`
          }));
          if (callback) callback();
        }
      });
    } else {
      this.apiService.getAllPermissions({ pageSize: 1000 }).subscribe((res: any) => {
        if (res.success) {
          const items = res.data.items || res.data;
          this.allLibraryPermissions = items.map((p: any) => ({
            id: p.id,
            name: p.name,
            module: p.module,
            displayName: `${p.module} | ${p.name}`
          }));
          if (callback) callback();
        }
      });
    }
  }
  
  openAddModal() {
    this.loadLibraryPermissions(() => {
      this.isEditMode = false;
      this.currentRole = { name: '', isActive: true };
      this.availablePermissions = [...this.allLibraryPermissions];
      this.chosenPermissions = [];
      this.selectedAvailable = [];
      this.selectedChosen = [];
      this.availableSearchTerm = '';
      this.chosenSearchTerm = '';
      this.isModalOpen = true;
    });
  }
  
  openEditModal(role: any) {
    this.loadLibraryPermissions(() => {
      this.isEditMode = true;
      this.currentRole = { ...role };
      this.selectedAvailable = [];
      this.selectedChosen = [];
      this.availableSearchTerm = '';
      this.chosenSearchTerm = '';
      
      // Fetch role permissions
      this.apiService.getPermissionsByRole(role.id).subscribe((res: any) => {
        if (res.success) {
          const rolePermIds = res.data.map((rp: any) => Number(rp.permissionId));
          
          this.chosenPermissions = this.allLibraryPermissions.filter(p => rolePermIds.includes(Number(p.id)));
          this.availablePermissions = this.allLibraryPermissions.filter(p => !rolePermIds.includes(Number(p.id)));
          
          this.isModalOpen = true;
        }
      });
    });
  }
  
  closeModal() {
    this.isModalOpen = false;
  }
  
  getFilteredAvailablePermissions() {
    if (!this.availableSearchTerm) return this.availablePermissions;
    return this.availablePermissions.filter(p => 
      p.displayName.toLowerCase().includes(this.availableSearchTerm.toLowerCase())
    );
  }

  getFilteredChosenPermissions() {
    if (!this.chosenSearchTerm) return this.chosenPermissions;
    return this.chosenPermissions.filter(p => 
      p.displayName.toLowerCase().includes(this.chosenSearchTerm.toLowerCase())
    );
  }
  
  // Dual Listbox Logic
  selectAvailable(perm: any) {
    const index = this.selectedAvailable.indexOf(perm);
    if (index > -1) this.selectedAvailable.splice(index, 1);
    else this.selectedAvailable.push(perm);
  }
  
  selectChosen(perm: any) {
    const index = this.selectedChosen.indexOf(perm);
    if (index > -1) this.selectedChosen.splice(index, 1);
    else this.selectedChosen.push(perm);
  }
  
  moveToChosen() {
    this.chosenPermissions.push(...this.selectedAvailable);
    this.availablePermissions = this.availablePermissions.filter(p => !this.selectedAvailable.includes(p));
    this.selectedAvailable = [];
  }
  
  moveToAvailable() {
    this.availablePermissions.push(...this.selectedChosen);
    this.chosenPermissions = this.chosenPermissions.filter(p => !this.selectedChosen.includes(p));
    this.selectedChosen = [];
  }
  
  chooseAll() {
    const filtered = this.getFilteredAvailablePermissions();
    this.chosenPermissions.push(...filtered);
    this.availablePermissions = this.availablePermissions.filter(p => !filtered.includes(p));
    this.selectedAvailable = [];
  }
  
  removeAll() {
    const filtered = this.getFilteredChosenPermissions();
    this.availablePermissions.push(...filtered);
    this.chosenPermissions = this.chosenPermissions.filter(p => !filtered.includes(p));
    this.selectedChosen = [];
  }
  
  saveRole() {
    if (!this.currentRole.name) {
      alert("Role Name is required.");
      return;
    }
    if (this.chosenPermissions.length === 0) {
      alert("At least one permission must be chosen.");
      return;
    }
    
    const rolePayload = {
      ...this.currentRole,
      libraryId: this.currentUser?.libraryId || null
    };
    
    const saveObservable = this.isEditMode ? 
      this.apiService.updateRole(rolePayload) : 
      this.apiService.createRole(rolePayload);
      
    saveObservable.subscribe((res: any) => {
      if (res.success) {
        const roleId = this.isEditMode ? this.currentRole.id : res.data.id;
        
        // Now save permissions
        const permPayload = {
          roleId: roleId,
          permissionIds: this.chosenPermissions.map(p => p.id)
        };
        
        this.apiService.assignPermissionsToRole(permPayload).subscribe((permRes: any) => {
          if (permRes.success) {
            this.closeModal();
            this.loadRoles();
          } else {
            alert("Role saved but permissions failed: " + permRes.message);
          }
        });
      } else {
        alert(res.message);
      }
    });
  }
  
  deleteRole(id: number) {
    if (confirm('Are you sure you want to delete this role?')) {
      this.apiService.deleteRole(id).subscribe((res: any) => {
        if (res.success) {
          this.loadRoles();
        } else {
          alert(res.message);
        }
      });
    }
  }
}
