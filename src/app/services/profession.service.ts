import { Injectable } from '@angular/core';
import { CrudService } from './crud.service';

export interface Profession {
  id: number;
  name: string;
  description: string;
  image: string;
}

export interface ProfessionStats {
  totalProfessions: number;
  totalSubjects: number;
  totalModules: number;
  averageSubjectsPerProfession: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProfessionService extends CrudService<Profession> {
  constructor() {
    super('professions');
  }

  getProfessionStats() {
    return this.http.get<ProfessionStats>(`${this.apiUrl}/professions/stats`);
  }

  getSubjectsForProfession(professionId: number) {
    return this.http.get(`${this.apiUrl}/subjects/by-profession/${professionId}`);
  }
}
