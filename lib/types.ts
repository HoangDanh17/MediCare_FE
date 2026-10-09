export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  gender: 0 | 1;
  dob: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export interface PagedUsers {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: UserResponse[];
}

export interface RolePermission {
  id: string;
  name: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: RolePermission[];
}

export interface PermissionOption {
  id: string;
  name: string;
}

export type PermissionSetting = "Inherit" | "Allow" | "Deny";

export interface MePermission {
  id: string;
  name: string;
  displayName: string;
  fromRole: boolean;
  setting: PermissionSetting;
  hasPermission: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
  gender: 0 | 1;
  dob: string;
}

export interface CreateRoleRequest {
  name: string;
  permissionIds: string[];
}

export interface MajorResponse {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateMajorRequest {
  name: string;
  description: string | null;
}

export type RoomType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RoomResponse {
  id: string;
  name: string;
  type: RoomType;
  isActive: boolean;
}

export interface CreateRoomRequest {
  name: string;
  type: RoomType;
}

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 1, label: "Phòng khám" },
  { value: 2, label: "Phòng thủ thuật" },
  { value: 3, label: "Phòng mổ" },
  { value: 4, label: "Phòng xét nghiệm" },
  { value: 5, label: "Chẩn đoán hình ảnh" },
  { value: 6, label: "Cấp cứu" },
  { value: 7, label: "Buồng bệnh" },
];

export function roomTypeLabel(type: number): string {
  return ROOM_TYPES.find((t) => t.value === type)?.label ?? `Loại ${type}`;
}

export interface PermissionChange {
  permissionId: string;
  effect: PermissionSetting;
}

export type PermissionCode =
  | "user.read"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "role.read"
  | "role.create"
  | "role.update"
  | "role.delete"
  | "permission.read"
  | "major.read"
  | "major.create"
  | "major.update"
  | "major.delete"
  | "room.read"
  | "room.create"
  | "room.update"
  | "room.delete";

export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  "user.read": "Xem người dùng",
  "user.create": "Tạo người dùng",
  "user.update": "Cập nhật người dùng",
  "user.delete": "Xóa người dùng",
  "role.read": "Xem vai trò",
  "role.create": "Tạo vai trò",
  "role.update": "Cập nhật vai trò",
  "role.delete": "Xóa vai trò",
  "permission.read": "Xem danh sách quyền",
  "major.read": "Xem khoa",
  "major.create": "Tạo khoa",
  "major.update": "Cập nhật khoa",
  "major.delete": "Xóa khoa",
  "room.read": "Xem phòng",
  "room.create": "Tạo phòng",
  "room.update": "Cập nhật phòng",
  "room.delete": "Xóa phòng",
};
