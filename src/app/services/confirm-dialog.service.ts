import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  /**
   * Show a confirmation dialog using native browser confirm
   * FIXME: Somehow now always works....
   * @param title The title of the dialog
   * @param content The content/message of the dialog
   * @returns Promise<boolean> - true if confirmed, false if canceled (maybe...)
   */
  confirm(title: string, content: string): Promise<boolean> {
    return Promise.resolve(confirm(`${title}\n\n${content}`));
  }

  /**
   * Show a delete confirmation dialog
   * FIXME: Somehow now always works....
   * @param itemName The name of the item to delete
   * @returns Promise<boolean> - true if confirmed, false if canceled (maybe...)
   */
  confirmDelete(itemName: string): Promise<boolean> {
    return Promise.resolve(
      confirm(`Biztosan törölni szeretnéd ezt: "${itemName}"?\n\nEz a művelet nem vonható vissza.`),
    );
  }
}
