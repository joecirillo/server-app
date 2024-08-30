import { Component, OnInit } from '@angular/core';
import { ServerService } from './service/server.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AppState } from './interface/app-state';
import { CustomResponse } from './interface/custom-response';
import { DataState } from './enum/data-state.enum';
import { catchError, map, startWith } from 'rxjs/operators';
import { Status } from './enum/status.enum';
import { NgForm } from '@angular/forms';
import { Server } from './interface/server';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  appState$: Observable<AppState<CustomResponse>>;
  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<string>('');
  private dataSubject = new BehaviorSubject<CustomResponse>(null);
  filterStatus$ = this.filterSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.filterSubject.asObservable();

  title = 'serverapp';
  constructor(private serverService: ServerService) {}

  ngOnInit(): void {
    this.appState$ = this.serverService.servers$.pipe(
      map((response) => {
        this.dataSubject.next(response)
        return { dataState: DataState.LOADED_STATE, appData: { ...response, data: {servers: response.data.servers.reverse()}} };
      }),
      startWith({ dataState: DataState.LOADING_STATE }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  pingServer(ipAddress: string): void {
    this.filterSubject.next(ipAddress);
    this.appState$ = this.serverService.ping$(ipAddress).pipe(
      map((response) => {
        this.dataSubject.value.data.servers[
          this.dataSubject.value.data.servers.findIndex(server => server.id === response.data.server.id)
        ] = response.data.server;
        this.filterSubject.next('');
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        this.filterSubject.next('');
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  filterServers(status: any): void {
    console.log(status);
    this.appState$ = this.serverService.filter$(status, this.dataSubject.value).pipe(
      map((response) => {

        return { dataState: DataState.LOADED_STATE, appData: response };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  saveServer(serverForm: NgForm): void {
    this.isLoading.next(true);
    this.appState$ = this.serverService.save$(serverForm.value).pipe(
      map((response) => {
        this.dataSubject.next({...response, data: { servers: [response.data.server, ...this.dataSubject.value.data.servers] }});
        document.getElementById('closeModal').click;
        this.isLoading.next(false);
        serverForm.resetForm({ status: this.Status.SERVER_DOWN });
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        this.isLoading.next(false);
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  deleteServer(server: Server): void {
    console.log(server);
    this.appState$ = this.serverService.delete$(server.id).pipe(
      map((response) => {
        this.dataSubject.next(
          { ...response, data: {servers: this.dataSubject.value.data.servers.filter(s => s.id !== server.id)} })
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }
}
