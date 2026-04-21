import { Injectable } from '@nestjs/common';
import { DocumentProcessor } from './document-processor.interface';
import { DocumentInput, ProcessedDocument } from './document.types';
import { FilenameService } from './filename.service';

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

@Injectable()
export class PassthroughDocumentProcessor implements DocumentProcessor {
  constructor(private readonly filenameService: FilenameService) {}

  supports(input: Pick<DocumentInput, 'filename' | 'mimeType'>): boolean {
    if (SUPPORTED_MIME_TYPES.has(input.mimeType)) {
      return true;
    }

    return /\.(csv|docx|jpeg|jpg|pdf|png|txt|xlsx)$/i.test(input.filename);
  }

  async process(input: DocumentInput): Promise<ProcessedDocument> {
    return {
      buffer: input.buffer,
      filename: this.filenameService.buildOutputFilename(input),
      mimeType: input.mimeType,
      source: {
        filename: input.filename,
        gmailMessageId: input.gmailMessageId,
        mimeType: input.mimeType,
      },
    };
  }
}
