import { Routes } from '@angular/router';
import { QuizComponent } from './quiz';
import { QuizResultsComponent } from './quiz-results';

export const QUIZ_ROUTES: Routes = [
  {
    path: ':id',
    component: QuizComponent,
  },
  {
    path: ':id/results',
    component: QuizResultsComponent,
  },
];
