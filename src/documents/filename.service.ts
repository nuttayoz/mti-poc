import { Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import { DocumentInput } from './document.types';

@Injectable()
export class FilenameService {
  buildOutputFilename(input: DocumentInput): string {
    const date = this.formatDate(input.receivedAt ?? new Date());
    const descriptor = this.buildDescriptor(input);
    const extension = this.getExtension(input.filename);

    return `${date}_${descriptor}${extension}`;
  }

  private buildDescriptor(input: DocumentInput): string {
    const baseName = input.filename.replace(/\.[^.]+$/, '');
    const parts = [input.sender, input.subject, baseName]
      .filter((part): part is string => Boolean(part?.trim()))
      .map((part) => this.slugify(part));

    return parts.join('_').slice(0, 120) || 'document';
  }

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getExtension(filename: string): string {
    const extension = extname(filename).toLowerCase();

    return extension || '.bin';
  }

  private slugify(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }
}
