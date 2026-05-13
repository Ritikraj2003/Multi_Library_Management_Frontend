export interface User {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  libraryId: number | null;
  libraryName: string | null;
  libraryIcon: string | null;
  isSuperadmin: boolean;
  permissions: string[];
}
