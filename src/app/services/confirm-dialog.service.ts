import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  /**
   * Show a confirmation dialog using native browser confirm
   * @param title The title of the dialog
   * @param content The content/message of the dialog
   * @returns Promise<boolean> - true if confirmed, false if canceled
   */
  confirm(title: string, content: string): Promise<boolean> {
    return Promise.resolve(confirm(`${title}\n\n${content}`));
  }

  /**
   * Show a delete confirmation dialog
   * @param itemName The name of the item to delete
   * @returns Promise<boolean> - true if confirmed, false if canceled
   */
  confirmDelete(itemName: string): Promise<boolean> {
    return Promise.resolve(
      confirm(`Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`)
    );
  }
}
