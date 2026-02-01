import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private hubConnection: signalR.HubConnection;

  constructor() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7280/LibraryHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();
  }

  public async startConnectionAsync(): Promise<void> {
    try {
      await this.hubConnection.start();
    } catch (err) {
      console.log('Error establishing connection with LibraryHub: ' + err)
    }
  }

  public handleDisconnects(): void {
    this.hubConnection.onclose(() => {
      console.log('Connection with LibraryHub lost');
    });
  }

  public async getLibraryAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke('GetLibraryAsync');
    } catch (err) {
      console.error(err);
    }
  }

  public getLibraryListener = () => {
    this.hubConnection.on('ReceiveLibrary', (response: string) => {
      console.log(response);
    });
  }
}
