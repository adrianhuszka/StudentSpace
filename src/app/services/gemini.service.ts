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
}
