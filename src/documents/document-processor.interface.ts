import { DocumentInput, ProcessedDocument } from './document.types';

export interface DocumentProcessor {
  process(input: DocumentInput): Promise<ProcessedDocument>;
  supports(input: Pick<DocumentInput, 'filename' | 'mimeType'>): boolean;
}
