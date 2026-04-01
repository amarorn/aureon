export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  PLATFORM_SUPPORT = 'platform_support',
  TENANT_OWNER = 'tenant_owner',
  TENANT_ADMIN = 'tenant_admin',
  TENANT_MEMBER = 'tenant_member',
}

export enum UserStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  INVITED = 'invited',
  BLOCKED = 'blocked',
}

export enum TenantType {
  CUSTOMER = 'customer',
  INTERNAL = 'internal',
}

export enum TenantApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum TenantOperationalStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DISABLED = 'disabled',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

export enum FeatureFlagSource {
  PACKAGE = 'package',
  MANUAL_OVERRIDE = 'manual_override',
}

export enum AccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const DOMAIN_ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'ACCOUNT_PENDING_APPROVAL',
  'ACCOUNT_REJECTED',
  'TENANT_SUSPENDED',
  'FEATURE_NOT_INCLUDED',
  'INSUFFICIENT_ROLE',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];
