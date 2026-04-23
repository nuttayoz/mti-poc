import { Module } from '@nestjs/common';
import { DocumentProcessorSelectorService } from './document-processor-selector.service';
import { DOCUMENT_PROCESSOR } from './document.tokens';
import { FilenameService } from './filename.service';
import { MockExternalDocumentProcessor } from './mock-external-document.processor';
import { PassthroughDocumentProcessor } from './passthrough-document.processor';

@Module({
  providers: [
    FilenameService,
    DocumentProcessorSelectorService,
    MockExternalDocumentProcessor,
    PassthroughDocumentProcessor,
    {
      provide: DOCUMENT_PROCESSOR,
      useExisting: DocumentProcessorSelectorService,
    },
  ],
  exports: [DOCUMENT_PROCESSOR, FilenameService],
})
export class DocumentsModule {}
