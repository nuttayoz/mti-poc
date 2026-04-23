export interface DocumentGatewaySummary {
  attachmentsProcessed: number;
  attachmentsSkipped: number;
  messagesFailed: number;
  messagesFound: number;
  messagesProcessed: number;
  messagesSkipped: number;
}

export interface DocumentGatewayRunResult {
  durationMs: number;
  finishedAt: string;
  job: 'document-gateway';
  skipped: boolean;
  startedAt: string;
  summary?: DocumentGatewaySummary;
}

export interface DocumentGatewayStatus {
  intervalMs: number;
  job: 'document-gateway';
  lastRun?: DocumentGatewayRunResult;
  running: boolean;
  runOnStartup: boolean;
}

export interface DocumentGatewayRecoveryResult {
  job: 'document-gateway';
  recovered: number;
  recoveredMessageIds: string[];
  skipped: boolean;
}
