import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { GeminiService } from './gemini.service';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';

export interface SearchIndexItem {
  professionId: string;
  professionName: string;
  subjectId: number;
  subjectName: string;
  moduleId: string;
  moduleTitle: string;
  moduleType: 'MD' | 'PDF';
  contentPreview?: string; // Optional: first few lines or keywords
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private geminiService = inject(GeminiService);
  private apiUrl = environment.apiUrl;

  // In-memory index of all available modules
  private searchIndex = signal<SearchIndexItem[]>([]);
  private isIndexed = signal(false);

  constructor() {}

  // Initialize the index (call this after login)
  async indexContent(): Promise<void> {
    if (this.isIndexed()) return;

    try {
      // 1. Fetch all professions
      const professions = await this.http.get<any[]>(`${this.apiUrl}/professions`).toPromise();

      if (!professions) return;

      const index: SearchIndexItem[] = [];

      // 2. For each profession, fetch subjects
      const indexPromises = professions.map(async (p) => {
        const subjects = await this.http
          .get<any[]>(`${this.apiUrl}/subjects/by-profession/${p.id}`)
          .toPromise();

        if (subjects) {
          subjects.forEach((s) => {
            if (s.module) {
              s.module.forEach((m: any) => {
                index.push({
                  professionId: p.id,
                  professionName: p.name,
                  subjectId: s.id,
                  subjectName: s.name,
                  moduleId: m.id,
                  moduleTitle: m.title,
                  moduleType: m.moduleType,
                  contentPreview: typeof m.content === 'string' ? m.content.substring(0, 200) : '',
                });
              });
            }
          });
        }
      });

      await Promise.all(indexPromises);
      this.searchIndex.set(index);
      this.isIndexed.set(true);
      console.log('Chatbot content indexed:', index.length, 'modules');
    } catch (err) {
      console.error('Failed to index content for chatbot:', err);
    }
  }

  // Find the best module for the question
  async findAnswer(
    question: string
  ): Promise<{ answer: string; quote?: string; page?: number; module?: SearchIndexItem }> {
    if (!this.isIndexed()) {
      await this.indexContent();
    }

    const index = this.searchIndex();
    if (index.length === 0) {
      return { answer: 'Nem találtam elérhető tananyagot.' };
    }

    // 1. Identify relevant module using Gemini (or simple keyword match for now)
    // Simple keyword matching for speed/cost, or use Gemini to pick from list
    const relevantModule = await this.identifyRelevantModule(question, index);

    if (!relevantModule) {
      return { answer: 'Nem találtam releváns tananyagot a kérdésedhez.' };
    }

    // 2. Fetch full content of the module
    let content = '';
    if (relevantModule.moduleType === 'MD') {
      // For MD, we might already have content or need to fetch if it was truncated
      // Assuming we need to fetch full content if not in index
      // For now, let's assume we need to fetch it to be safe/fresh
      // But wait, the index building above used what was in the subject response.
      // Let's check if the subject response includes full content. Usually yes for MD.
      // If so, we might have it in the index (if we stored it).
      // Let's re-fetch to be sure.
      // Actually, the subject endpoint returns modules with content.
      // So we can just use what we have or fetch specific module.
      // Let's fetch specific module to get PDF blob if needed.
      content = await this.fetchModuleContent(relevantModule);
    } else if (relevantModule.moduleType === 'PDF') {
      // For PDF, we need to extract text. This is heavy.
      // Maybe we can skip PDF text extraction for now and just point to it?
      // Or use the `extractTextFromPdf` logic.
      // Let's try to fetch PDF text.
      content = await this.fetchPdfText(relevantModule);
    }

    if (!content) {
      return { answer: 'Nem sikerült betölteni a tananyag tartalmát.', module: relevantModule };
    }

    // 3. Ask Gemini for the answer
    const response = await this.geminiService.generateAnswer(question, content).toPromise();

    if (!response) {
      return { answer: 'Hiba történt a válasz generálása közben.' };
    }

    return {
      answer: response.answer,
      quote: response.quote,
      page: response.page,
      module: relevantModule,
    };
  }

  private async identifyRelevantModule(
    question: string,
    index: SearchIndexItem[]
  ): Promise<SearchIndexItem | null> {
    // Construct a prompt for Gemini to pick the best module
    const modulesList = index
      .map((m, i) => `${i}. [${m.professionName} - ${m.subjectName}] ${m.moduleTitle}`)
      .join('\n');

    const prompt = `
      Which of the following modules is most likely to contain the answer to the question: "${question}"?
      
      Modules:
      ${modulesList}
      
      Return ONLY the index number of the best matching module. If none seem relevant, return -1.
    `;

    try {
      const result = await this.geminiService.generateContent(prompt).toPromise();
      const indexNum = parseInt(result?.trim() || '-1');
      if (!isNaN(indexNum) && indexNum >= 0 && indexNum < index.length) {
        return index[indexNum];
      }
    } catch (e) {
      console.error('Error identifying module:', e);
    }

    // Fallback: Keyword search
    const keywords = question
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 3);
    const match = index.find((m) =>
      keywords.some(
        (k) =>
          m.moduleTitle.toLowerCase().includes(k) || m.contentPreview?.toLowerCase().includes(k)
      )
    );
    return match || null;
  }

  private async fetchModuleContent(item: SearchIndexItem): Promise<string> {
    // For MD, we can just fetch the subject again or module details
    // Assuming we have an endpoint for module details or we use the index if we stored it
    // Let's assume we need to fetch it.
    // Actually, SelectedProfession fetches subjects which contain modules.
    // Let's try to get it from the index first if we stored it.
    // In indexContent we stored contentPreview.
    // Let's fetch the subject again to get full content.
    try {
      const subjects = await this.http
        .get<any[]>(`${this.apiUrl}/subjects/by-profession/${item.professionId}`)
        .toPromise();
      const subject = subjects?.find((s) => s.id === item.subjectId);
      const module = subject?.module?.find((m: any) => m.id === item.moduleId);
      return module?.content || '';
    } catch (e) {
      return '';
    }
  }

  private async fetchPdfText(item: SearchIndexItem): Promise<string> {
    // This requires downloading the PDF and parsing it.
    // We can reuse the logic from SelectedProfession, but we are in a service.
    // We need to import pdfjs-dist here.
    try {
      const blob = await this.http
        .get(`${this.apiUrl}/modules/${item.moduleId}/pdf`, { responseType: 'blob' })
        .toPromise();
      if (!blob) return '';

      const arrayBuffer = await blob.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      // Limit pages for performance
      const maxPages = Math.min(pdf.numPages, 5);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `Page ${i}: ${pageText}\n`;
      }
      return fullText;
    } catch (e) {
      console.error('Error extracting PDF text:', e);
      return '';
    }
  }

  navigateToModule(item: SearchIndexItem, quote?: string, page?: number) {
    this.router.navigate(['/selected-profession', item.professionId], {
      queryParams: {
        moduleId: item.moduleId,
        quote: quote,
        page: page,
      },
    });
  }
}
