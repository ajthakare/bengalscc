import { getStore } from '@netlify/blobs';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  description: string;
  target?: string;
  details?: Record<string, any>;
}

/**
 * Add an audit log entry
 * Logs are stored in monthly files: logs-YYYY-MM.json
 */
export async function addAuditLog(
  username: string,
  action: string,
  description: string,
  target?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    // Get current month key (e.g., "2026-02")
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const logKey = `logs-${monthKey}`;

    // Get audit logs store
    const logsStore = getStore({
      name: 'audit-logs',
      siteID: process.env.SITE_ID || '',
      token: process.env.NETLIFY_AUTH_TOKEN || '',
    });

    // Get existing logs for this month
    const existingLogs = (await logsStore.get(logKey, { type: 'json' })) as
      | AuditLogEntry[]
      | null;

    const logs = existingLogs || [];

    // Create new log entry
    const logEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      username,
      action,
      description,
      target,
      details,
    };

    // Add to logs array
    logs.push(logEntry);

    // Save back to store
    await logsStore.setJSON(logKey, logs);

    console.log(`Audit log added: ${username} - ${description}`);
  } catch (error) {
    console.error('Failed to add audit log:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Get audit logs for a specific month
 */
export async function getAuditLogs(
  year: number,
  month: number
): Promise<AuditLogEntry[]> {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const logKey = `logs-${monthKey}`;

  const logsStore = getStore({
    name: 'audit-logs',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const logs = (await logsStore.get(logKey, { type: 'json' })) as
    | AuditLogEntry[]
    | null;

  return logs || [];
}

/**
 * List available log months
 */
export async function listLogMonths(): Promise<string[]> {
  const logsStore = getStore({
    name: 'audit-logs',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const { blobs } = await logsStore.list();

  // Extract month keys from blob keys (logs-YYYY-MM)
  const months = blobs
    .map((blob) => blob.key.replace('logs-', ''))
    .filter((key) => /^\d{4}-\d{2}$/.test(key))
    .sort()
    .reverse(); // Most recent first

  return months;
}

/**
 * Delete logs older than specified days
 */
export async function cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
  const logsStore = getStore({
    name: 'audit-logs',
    siteID: process.env.SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
  });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

  const { blobs } = await logsStore.list();
  let deletedCount = 0;

  for (const blob of blobs) {
    const monthKey = blob.key.replace('logs-', '');
    if (monthKey < cutoffKey) {
      await logsStore.delete(blob.key);
      deletedCount++;
      console.log(`Deleted old audit log: ${blob.key}`);
    }
  }

  return deletedCount;
}
