import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly apiKey = environment.geminiApiKey;

  constructor(private http: HttpClient) {}

  private getApiUrl(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
  }

  private mapGeminiError(err: any) {
    const apiMessage = err?.error?.error?.message || err?.message || '';

    if (/api key/i.test(apiMessage) || /API_KEY_INVALID/i.test(JSON.stringify(err?.error))) {
      return throwError(
        () => new Error('A Gemini API-kulcs érvénytelen vagy lejárt. Állíts be új kulcsot.'),
      );
    }

    return throwError(() => err);
  }

  generateContent(prompt: string, images: string[] = []): Observable<string> {
    if (!this.apiKey?.trim()) {
      return throwError(() => new Error('A Gemini API-kulcs nincs beállítva.'));
    }

    const contents: any[] = [
      {
        parts: [{ text: prompt }],
      },
    ];

    if (images.length > 0) {
      const imageParts = images.map((base64Image) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      }));
      contents[0].parts.push(...imageParts);
    }

    const payload = {
      contents: contents,
    };

    return this.http.post<any>(this.getApiUrl(), payload).pipe(
      map((response) => {
        if (
          response.candidates &&
          response.candidates.length > 0 &&
          response.candidates[0].content &&
          response.candidates[0].content.parts &&
          response.candidates[0].content.parts.length > 0
        ) {
          return response.candidates[0].content.parts[0].text;
        }
        return 'Nem készült összefoglaló.';
      }),
      catchError((err) => this.mapGeminiError(err)),
    );
  }

  generateAnswer(
    question: string,
    context: string,
  ): Observable<{ answer: string; quote: string; page?: number }> {
    if (!this.apiKey?.trim()) {
      return throwError(() => new Error('A Gemini API-kulcs nincs beállítva.'));
    }

    const prompt = `
      You are a helpful teaching assistant. Answer the student's question based ONLY on the provided context.
      
      Context:
      ${context}
      
      Question: ${question}
      
      Return your response in strict JSON format with the following structure:
      {
        "answer": "Your answer here (in Hungarian)",
        "quote": "The exact substring from the context that supports your answer (for scrolling)",
        "page": 1 (optional, if context has page numbers, otherwise omit)
      }
      Do not include markdown formatting like \`\`\`json. Just the raw JSON object.
    `;

    const contents = [{ parts: [{ text: prompt }] }];
    const payload = { contents };

    return this.http.post<any>(this.getApiUrl(), payload).pipe(
      map((response) => {
        if (
          response.candidates &&
          response.candidates.length > 0 &&
          response.candidates[0].content &&
          response.candidates[0].content.parts &&
          response.candidates[0].content.parts.length > 0
        ) {
          const text = response.candidates[0].content.parts[0].text;
          try {
            const cleanText = text
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim();
            return JSON.parse(cleanText);
          } catch (e) {
            console.error('Failed to parse Gemini response:', text);
            return { answer: 'Hiba történt a válasz feldolgozása közben.', quote: '' };
          }
        }
        return { answer: 'Nem találtam választ a dokumentumban.', quote: '' };
      }),
      catchError((err) => this.mapGeminiError(err)),
    );
  }
}
