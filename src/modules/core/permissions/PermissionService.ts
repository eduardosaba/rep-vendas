export type Role = 'admin' | 'manager' | 'representative' | 'supervisor';

export type Permission = 
  | 'manage:products'
  | 'manage:users'
  | 'manage:orders'
  | 'view:orders'
  | 'reserve:stock'
  | 'view:reports'
  | 'manage:pricing'
  | 'manage:branding';

const RolePermissions: Record<Role, Permission[]> = {
  admin: [
    'manage:products', 'manage:users', 'manage:orders', 
    'view:orders', 'reserve:stock', 'view:reports', 
    'manage:pricing', 'manage:branding'
  ],
  manager: [
    'manage:products', 'view:orders', 'manage:orders', 
    'reserve:stock', 'view:reports'
  ],
  supervisor: [
    'view:orders', 'view:reports'
  ],
  representative: [
    'view:orders', 'reserve:stock'
  ]
};

export class PermissionService {
  private userRole: Role;
  private customPermissions: Permission[];

  constructor(userRole: Role, customPermissions: Permission[] = []) {
    this.userRole = userRole;
    this.customPermissions = customPermissions;
  }

  /**
   * Checks if the user has a specific permission based on their role and custom grants.
   */
  hasPermission(permission: Permission): boolean {
    if (this.customPermissions.includes(permission)) {
      return true;
    }
    
    const rolePerms = RolePermissions[this.userRole] || [];
    return rolePerms.includes(permission);
  }

  /**
   * Helper to check if user can manage products
   */
  canManageProducts(): boolean {
    return this.hasPermission('manage:products');
  }

  /**
   * Helper to check if user can view orders
   */
  canViewOrders(): boolean {
    return this.hasPermission('view:orders');
  }

  /**
   * Helper to check if user can reserve stock
   */
  canReserveStock(): boolean {
    return this.hasPermission('reserve:stock');
  }
}
