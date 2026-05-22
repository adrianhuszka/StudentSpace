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
  contentPreview?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private geminiService = inject(GeminiService);
  private apiUrl = environment.apiUrl;

  private searchIndex = signal<SearchIndexItem[]>([]);
  private isIndexed = signal(false);

  constructor() {}

  async indexContent(): Promise<void> {
    if (this.isIndexed()) return;

    try {
      const professions = await this.http.get<any[]>(`${this.apiUrl}/professions`).toPromise();

      if (!professions) return;

      const index: SearchIndexItem[] = [];

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

  async findAnswer(
    question: string,
  ): Promise<{ answer: string; quote?: string; page?: number; module?: SearchIndexItem }> {
    if (!this.isIndexed()) {
      await this.indexContent();
    }

    const index = this.searchIndex();
    if (index.length === 0) {
      return { answer: 'Nem találtam elérhető tananyagot.' };
    }

    const relevantModule = await this.identifyRelevantModule(question, index);

    if (!relevantModule) {
      const fallbackAnswer = await this.generateGeneralAnswer(question);
      if (fallbackAnswer) {
        return { answer: fallbackAnswer };
      }
      return { answer: 'Nem találtam releváns tananyagot a kérdésedhez.' };
    }

    let content = '';
    if (relevantModule.moduleType === 'MD') {
      content = await this.fetchModuleContent(relevantModule);
    } else if (relevantModule.moduleType === 'PDF') {
      content = await this.fetchPdfText(relevantModule);
    }

    if (!content) {
      return { answer: 'Nem sikerült betölteni a tananyag tartalmát.', module: relevantModule };
    }

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

  private async generateGeneralAnswer(question: string): Promise<string | null> {
    const prompt = `
      A felhasználó kérdése: "${question}"

      Nem áll rendelkezésre közvetlenül releváns tananyag a belső indexben.
      Adj rövid, pontos, érthető választ magyar nyelven.
      Ha bizonytalan az információ, ezt jelezd röviden.
    `;

    try {
      const answer = await this.geminiService.generateContent(prompt).toPromise();
      return answer?.trim() || null;
    } catch (e) {
      console.error('Error generating general fallback answer:', e);
      return null;
    }
  }

  private async identifyRelevantModule(
    question: string,
    index: SearchIndexItem[],
  ): Promise<SearchIndexItem | null> {
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

    const keywords = question
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 3);
    const match = index.find((m) =>
      keywords.some(
        (k) =>
          m.moduleTitle.toLowerCase().includes(k) || m.contentPreview?.toLowerCase().includes(k),
      ),
    );
    return match || null;
  }

  private async fetchModuleContent(item: SearchIndexItem): Promise<string> {
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
