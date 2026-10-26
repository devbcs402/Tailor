import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      default: '',
    },
    actorRole: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'tenant_created',
        'tenant_updated',
        'tenant_deactivated',
        'tenant_reactivated',
        'tenant_admin_created',
        'tenant_admin_password_reset',
        'platform_owner_login',
        'tenant_login',
      ],
      index: true,
    },
    targetTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    targetTenantName: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
