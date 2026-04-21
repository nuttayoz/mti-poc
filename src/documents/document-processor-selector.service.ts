import { Injectable } from '@nestjs/common';
import { JsonLogger } from '../common/logging/json-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { DocumentProcessor } from './document-processor.interface';
import { DocumentInput, ProcessedDocument } from './document.types';
import { MockExternalDocumentProcessor } from './mock-external-document.processor';
import { PassthroughDocumentProcessor } from './passthrough-document.processor';

@Injectable()
export class DocumentProcessorSelectorService implements DocumentProcessor {
  constructor(
    private readonly config: AppConfigService,
    private readonly logger: JsonLogger,
    private readonly mockExternalProcessor: MockExternalDocumentProcessor,
    private readonly passthroughProcessor: PassthroughDocumentProcessor,
  ) {}

  supports(input: Pick<DocumentInput, 'filename' | 'mimeType'>): boolean {
    return this.getProcessor().supports(input);
  }

  process(input: DocumentInput): Promise<ProcessedDocument> {
    const processor = this.getProcessor();

    this.logger.log(
      {
        event: 'document.processor.selected',
        filename: input.filename,
        mode: this.config.documentProcessorMode,
      },
      DocumentProcessorSelectorService.name,
    );

    return processor.process(input);
  }

  private getProcessor(): DocumentProcessor {
    if (this.config.documentProcessorMode === 'passthrough') {
      return this.passthroughProcessor;
    }

    return this.mockExternalProcessor;
  }
}
