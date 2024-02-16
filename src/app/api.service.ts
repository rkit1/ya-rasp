import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import * as O from 'rxjs';
import * as Op from 'rxjs/operators';

const api_key = 'd881c559-1a00-4405-be1e-41371b60f0fe';

export interface Pagination {
  'pagination': {
    'total': number,
    'limit': number,
    'offset': number,
  },
}

export type Transport_type = 'plane' | 'train' | 'suburban' | 'bus' | 'sea' | 'river' | 'helicopter';
const Transport_type_strings: Map<Transport_type, string> = new Map([
  ['plane', 'самолет'],
  ['train', 'поезд'],
  ['suburban', 'электричка'],
  ['bus', 'автобус'],
  ['sea', 'морской транспорт'],
  ['river', 'речной транспорт'],
  ['helicopter', 'вертолет'],
]);

export interface Station_nearest {
  'distance': number,
  'code': string,
  'station_type': string,
  'station_type_name': string,
  'type_choices': {
    'schedule': {
      'desktop_url': string//'https://rasp.yandex.ru/station/9761931/schedule',
      'touch_url': string
    }
  },
  'title': string,
  // 'popular_title': '',
  // 'short_title': '',
  'transport_type': Transport_type,
  // 'lat': 50.4516962252837,
  // 'lng': 40.1392928134917,
  // 'type': 'station'
}

export interface Stations_nearest extends Pagination {
  'stations': Station_nearest[],
}

export interface Station_schedule extends Pagination {
  "schedule": {
    "thread": {
      "uid": string,
    }
  }[],
  "interval_schedule": {
    "thread": {
      "uid": string,
    },
  }[],
}

export interface Thread_schedule {
  "title": string,
  "stops": {
    "station": {
      "title": string,
      "code": string,
    },
  }[]
}

export interface Routes_from_to extends Pagination {
  "interval_segments": {
    "start_date": string,
    "duration": number
  }[],
  "segments": {
    "arrival": string,
    "departure": string
    "thread": {
      "title": string,
      "number": string
    }
  }[]
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  http = inject(HttpClient);

  tansport_type_strings: Map<Transport_type, string> = new Map([
    ['plane', 'самолет'],
    ['train', 'поезд'],
    ['suburban', 'электричка'],
    ['bus', 'автобус'],
    ['sea', 'морской транспорт'],
    ['river', 'речной транспорт'],
    ['helicopter', 'вертолет'],
  ]);

  get_stations(type: Transport_type) {
    return this.http.get<Stations_nearest>(
      `/api/v3.0/nearest_stations/?apikey=${api_key}` +
      `&lat=55.80136114609288&lng=37.560503846329894&distance=50&lang=ru_RU&transport_types=${type}`
    )
  }

  // Возвращает uid всех линий
  get_routes(uid: string, date?: string): O.Observable<Set<string>> {
    return this.http.get<Station_schedule>(
      `/api/v3.0/schedule/?apikey=${api_key}` +
      `&station=${uid}` +
      (date ? `&date=${date}` : '')
    ).pipe(Op.map(sch => {
      const thr = new Set<string>();
      for (const ent of sch.schedule) {
        thr.add(ent.thread.uid);
      }
      for (const ent of sch.interval_schedule) {
        thr.add(ent.thread.uid);
      }
      return thr;
    }));
  }

  get_destination_stations(routes: Set<string>, from_uid: string, date?: string): O.Observable<Map<string, string>> {
    const arr: O.Observable<Thread_schedule>[] = [];
    routes.forEach(route_uid => arr.push(this.http.get<Thread_schedule>(
      `/api/v3.0/thread/?apikey=${api_key}` +
      `&uid=${route_uid}&from=${from_uid}` +
      (date ? `&date=${date}` : '')
    )));
    return O.forkJoin(arr).pipe(Op.map(x => {
      const m = new Map<string, string>();
      x.forEach(val => {
        for (const st of val.stops) {
          m.set(st.station.code, st.station.title);
        }
      });
      return m;
    }));
  }

  get_routes_from_to(from_uid: string, to_uid: string, date?: string) {
    return this.http.get<Routes_from_to>(
      `/api/v3.0/search/?apikey=${api_key}` +
      `&from=${from_uid}&to=${to_uid}` +
      (date ? `&date=${date}` : '')
    )
  }
}
