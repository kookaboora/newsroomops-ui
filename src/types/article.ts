export type ArticleStatus = "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED";
export type ArticlePriority = "LOW" | "MEDIUM" | "HIGH";

export type AuditAction =
  | "CREATED"
  | "UPDATED"
  | "SENT_TO_REVIEW"
  | "SCHEDULED"
  | "PUBLISHED";

export type AuditDiff = Record<
  string,
  {
    from: string | null;
    to: string | null;
  }
>;

export type AuditEvent = {
  id: string;
  ts: string; // ISO timestamp
  actor: string;
  action: AuditAction;
  message: string;
  diff?: AuditDiff;
};

export type Article = {
  id: string;
  headline: string;

  status: ArticleStatus;
  priority: ArticlePriority;

  category: string;
  region: string;
  author: string;

  updatedAt: string;
  scheduledAt?: string;

  tags: string[];
  hasHeroImage: boolean;
  hasCaption: boolean;

  auditLog: AuditEvent[];
};