import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly apiKey = 'AIzaSyBJo0KQ8m12zWmSurnnGgRG38PxNus7TQ0';
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

  constructor(private http: HttpClient) {}

  generateContent(prompt: string, images: string[] = []): Observable<string> {
    const contents: any[] = [
      {
        parts: [{ text: prompt }],
      },
    ];

    if (images.length > 0) {
      // For multimodal requests, we add images to the parts
      const imageParts = images.map((base64Image) => ({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Image,
        },
      }));
      contents[0].parts.push(...imageParts);
    }

    const payload = {
      contents: contents,
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
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
        return 'No summary generated.';
      })
    );
  }

  generateAnswer(
    question: string,
    context: string
  ): Observable<{ answer: string; quote: string; page?: number }> {
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

    return this.http.post<any>(this.apiUrl, payload).pipe(
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
            // Clean up potential markdown code blocks
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
      })
    );
  }
}
