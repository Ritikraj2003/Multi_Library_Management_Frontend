import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-library-permission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library-permission.html',
  styleUrl: './library-permission.css'
})
export class LibraryPermission implements OnInit {
  private apiService = inject(ApiService);
  
  libraries: any[] = [];
  selectedLibraryId: number | null = null;
  
  allPermissions: any[] = [];
  groupedPermissions: { [key: string]: any[] } = {};
  modules: string[] = [];
  
  selectedPermissions: Set<number> = new Set<number>();
  
  ngOnInit() {
    this.loadLibraries();
    this.loadAllPermissions();
  }
  
  loadLibraries() {
    this.apiService.getAllLibraries({ pageSize: 1000 }).subscribe((res: any) => {
      if (res.success) {
        this.libraries = res.data.items || res.data;
      }
    });
  }
  
  loadAllPermissions() {
    this.apiService.getAllPermissions({ pageSize: 1000 }).subscribe((res: any) => {
      if (res.success) {
        this.allPermissions = res.data.items || res.data;
        this.groupPermissions();
      }
    });
  }
  
  groupPermissions() {
    this.groupedPermissions = {};
    for (const p of this.allPermissions) {
      if (!this.groupedPermissions[p.module]) {
        this.groupedPermissions[p.module] = [];
      }
      this.groupedPermissions[p.module].push(p);
    }
    this.modules = Object.keys(this.groupedPermissions);
  }
  
  onLibraryChange() {
    this.selectedPermissions.clear();
    if (!this.selectedLibraryId) return;
    
    this.apiService.getPermissionsByLibrary(this.selectedLibraryId).subscribe((res: any) => {
      if (res.success) {
        res.data.forEach((lp: any) => {
          this.selectedPermissions.add(lp.permissionId);
        });
      }
    });
  }
  
  togglePermission(permissionId: number) {
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
  }
  
  hasPermission(permissionId: number): boolean {
    return this.selectedPermissions.has(permissionId);
  }
  
  savePermissions() {
    if (!this.selectedLibraryId) {
      alert('Please select a library first');
      return;
    }
    
    const body = {
      libraryId: Number(this.selectedLibraryId),
      permissionIds: Array.from(this.selectedPermissions)
    };
    
    this.apiService.assignPermissionsToLibrary(body).subscribe((res: any) => {
      if (res.success) {
        alert('Permissions saved successfully');
      } else {
        alert(res.message);
      }
    });
  }
}
