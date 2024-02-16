import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService, Station_nearest, Stations_nearest, Transport_type } from './api.service';
import { FormsModule } from "@angular/forms";
import { CommonModule } from '@angular/common';
import * as O from 'rxjs';
import * as Op from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  providers: [ApiService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  api = inject(ApiService);

  transport_type?: Transport_type;
  stations_from?: Stations_nearest;
  station_from?: string;
  stations_to?: Map<string, string>;
  station_to = "";


  change_transport_type() {
    delete this.stations_from;
    delete this.stations_to;
    delete this.station_from;
    this.station_to = "";
    this.api.get_stations(this.transport_type!).subscribe(stations => {
      this.stations_from = stations;
    });
  }

  change_station_from() {
    delete this.stations_to;
    this.station_to = "";
    if (!this.station_from) {
      return
    }
    
    this.api.get_threads(this.station_from).pipe(Op.switchMap(threads => {
      if (!this.station_from) {
        return O.EMPTY;
      }
      return this.api.get_destination_stations(threads, this.station_from);
    })).subscribe(destinations => {
      this.stations_to = destinations; 
    });
  }

  constructor() {
    console.log(this.constructor.name, this);
  }
}
