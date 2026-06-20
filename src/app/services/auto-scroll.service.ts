import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { IScrollPosition } from '../components/library/interfaces/scroll-position';
import { ScrollPosition } from '../components/library/models/scroll-position';
import { environment } from '../../environments/environment';
import { SnackbarService } from './snackbar.service';
import { getErrorMessage } from '../common/functions';

@Injectable({
  providedIn: 'root'
})
export class AutoScrollService {
  private hubConnection: signalR.HubConnection;
  private retryCount: number = 0;

  private scrollPosition: BehaviorSubject<ScrollPosition> = new BehaviorSubject<ScrollPosition>(new ScrollPosition(0, 0));
  public scrollPosition$: Observable<ScrollPosition> = this.scrollPosition.asObservable();

  constructor(private snackbarService: SnackbarService, private ngZone: NgZone,) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.autoScrollHubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Debug)
      .build();
    this.hubConnection.serverTimeoutInMilliseconds = 600000;
    this.hubConnection.keepAliveIntervalInMilliseconds = 150000;
  }

  public async startConnectionAsync(): Promise<void> {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Disconnected)
        await this.hubConnection.start();

      this.getLibraryScrollPositionListener();
    } catch (err) {
      this.snackbarService.showMessage('Error establishing connection with AutoScrollHub: ' + err)
      console.log('Error establishing connection with AutoScrollHub: ' + err)
    }
  }

  public handleDisconnects(): void {
    this.hubConnection.onclose(() => {
      console.log('Connection with AutoScrollHub lost');
    });
  }

  private getLibraryScrollPositionListener = () => {
    this.hubConnection.on('ReceiveLibraryScrollPosition', (response: string) => {
      this.ngZone.run(() => {
        try {
          const scrollPosition = JSON.parse(response) as IScrollPosition;
          this.updateScrollPositionSubject(scrollPosition);
        } catch (err) {
          this.retryCount++;
          if (this.retryCount > 3) {
            this.snackbarService.showMessage("Retrying scroll position request");
            setInterval(async () => await this.getLibraryScrollPositionAsync(), 0);
            return;
          }

          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  public updateScrollPositionSubject(position: IScrollPosition) {
    this.scrollPosition.next(new ScrollPosition(position.horizontal, position.vertical));
  }

  public async updateLibraryScrollPositionAsync(horizontal: number, vertical: number): Promise<void> {
    try {
      await this.hubConnection.invoke('UpdateLibraryScrollPositionAsync', horizontal, vertical);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async getLibraryScrollPositionAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke('GetLibraryScrollPositionAsync');
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }
}
