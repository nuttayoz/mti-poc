import { Injectable } from '@nestjs/common';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { DocumentProcessor } from './document-processor.interface';
import { DocumentInput, ProcessedDocument } from './document.types';
import { FilenameService } from './filename.service';
import { PassthroughDocumentProcessor } from './passthrough-document.processor';

@Injectable()
export class MockExternalDocumentProcessor implements DocumentProcessor {
  constructor(
    private readonly config: AppConfigService,
    private readonly filenameService: FilenameService,
    private readonly logger: JsonLogger,
    private readonly passthroughProcessor: PassthroughDocumentProcessor,
  ) {}

  supports(input: Pick<DocumentInput, 'filename' | 'mimeType'>): boolean {
    return this.passthroughProcessor.supports(input);
  }

  async process(input: DocumentInput): Promise<ProcessedDocument> {
    this.logger.log(
      {
        byteLength: input.buffer.byteLength,
        event: 'document.transform.mock_external_request',
        externalApiConfigured: Boolean(this.config.externalTransformApi.url),
        filename: input.filename,
        gmailMessageId: input.gmailMessageId,
        mimeType: input.mimeType,
      },
      MockExternalDocumentProcessor.name,
    );

    const outputFilename = this.filenameService.buildOutputFilename(input);

    this.logger.log(
      {
        byteLength: input.buffer.byteLength,
        event: 'document.transform.mock_external_response',
        filename: outputFilename,
        gmailMessageId: input.gmailMessageId,
        mimeType: input.mimeType,
      },
      MockExternalDocumentProcessor.name,
    );

    return {
      buffer: input.buffer,
      filename: outputFilename,
      mimeType: input.mimeType,
      source: {
        filename: input.filename,
        gmailMessageId: input.gmailMessageId,
        mimeType: input.mimeType,
      },
      transform: {
        mode: 'mock-external',
        provider: 'mock',
      },
    };
  }
}
