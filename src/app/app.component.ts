import { Component, OnDestroy, OnInit, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService, Routes_from_to, Station_nearest, Stations_nearest, Transport_type } from './api.service';
import { Form, FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from '@angular/common';
import * as O from 'rxjs';
import * as Op from 'rxjs/operators';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

// класс FormControl не наследуется в ts.
// https://stackoverflow.com/a/73918224
function ctrl_replay<T>(ctrl: FormControl<T>) {
  return ctrl.valueChanges.pipe(Op.startWith(ctrl.value));
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule, MatDatepickerModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule, ReactiveFormsModule],
  providers: [ApiService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  api = inject(ApiService);

  date = new FormControl(new Date());
  transport_type = new FormControl<Transport_type | null>(null);
  station_from = new FormControl<string | null>(null);
  station_to = new FormControl<string | null>(null);

  stations_from = ctrl_replay(this.transport_type).pipe(
    Op.switchMap(tt => {
      if (!tt) {
        return O.of(null);
      }
      return this.api.get_stations(tt);
    }),
    Op.catchError(err => O.of(null)),
    Op.shareReplay(1),
  );

  stations_to = O.combineLatest([ctrl_replay(this.station_from), ctrl_replay(this.date)]).pipe(
    Op.switchMap(([sf, date]) => {
      if (!sf || !date) {
        return O.of(null);
      }
      return this.api.get_routes(sf, date.toISOString()).pipe(Op.switchMap(threads => {
        if (threads.size == 0) {
          return O.of(new Map<string, string>());
        }
        return this.api.get_destination_stations(threads, sf).pipe(Op.startWith("loading"));
      }));
    }),
    Op.catchError(err => O.of(null)),
    Op.shareReplay(1),
  );

  routes = O.combineLatest([ctrl_replay(this.station_from), ctrl_replay(this.station_to), ctrl_replay(this.date)]).pipe(
    Op.switchMap(([sf, st, date]) => {
      if (!sf || !st || !date) {
        return O.of(null);
      }
      return this.api.get_routes_from_to(sf, st, date.toISOString());
    }),
    Op.catchError(err => O.of(null)),
    Op.shareReplay(1),
  )

  routes_table = this.routes.pipe(Op.map(rs => {
    if (!rs) return []
    return rs.segments;
  }));
  displayedColumns: string[] = ['route', 'arrival', 'departure'];

  constructor() {
    console.log(this.constructor.name, this);
  }

  alive = false;
  ngOnInit(): void {
    this.alive = true;

    this.stations_from.pipe(Op.distinctUntilChanged()).subscribe(x => {
      if (!this.alive) return;
      this.station_from.setValue(null);
    });

    this.stations_to.pipe(Op.distinctUntilChanged()).subscribe(x => {
      if (!this.alive) return;
      this.station_to.setValue(null);
    });
  }

  ngOnDestroy(): void {
    this.alive = false;
  }
}
