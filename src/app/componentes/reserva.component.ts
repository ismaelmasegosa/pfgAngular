import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CursoService } from '../servicios/curso.service';
import { UsuarioService } from '../servicios/usuario.service';
import { ReservaService } from '../servicios/reserva.service';
import { HorarioService } from '../servicios/horarios.service';
import { Recurso } from '../modelo/recurso';
import { Curso } from '../modelo/curso';
import { Usuario } from '../modelo/usuario';
import { Observable } from 'rxjs/Rx';
import { Message } from 'primeng/api';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Reserva } from '../modelo/reserva';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEsExtra from '@angular/common/locales/extra/es';
import * as moment from 'moment';


@Component({
  selector: 'reserva',
  templateUrl: '../vista/reserva/reserva.component.html',
  styleUrls: ['../vista/reserva/reserva.component.css']
})
export class ReservaComponent implements OnInit {
  @Input('dialog') dialog: string;
  @Input('recurso') recurso: Recurso;
  @Output()
  cerrar: EventEmitter<string> = new EventEmitter<string>();

  public usuarios: Usuario[];
  public msgs: Message[] = [];
  public cols: any[];
  public minDate = new Date();
  public maxDate = new Date();
  public es: any;
  public horasDisponibles: string[];
  public reserva: Reserva;
  public fechaSeleccionada: Date;
  public reservaDiaria: boolean = false;
  public reservas: boolean = false;
  public fechasNoDisponibles: Array<Date>;
  public colsCursos: any[];
  public reservasList: Reserva[];
  public eventos: any[];
  public header: any;
  public mesMostrado: number = 0;
  public yearMostrado: number = 0;
  public usuario: Usuario;
  public maxFechas: number;


  constructor(
    private _reservaService: ReservaService,
    private _horarioService: HorarioService,
    private _usuarioService: UsuarioService,
    private _route: ActivatedRoute,
    private _router: Router,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit() {
    registerLocaleData(localeEs, 'es', localeEsExtra);
    moment.lang("es");
    if (this.dialog === "diaria") {
      this.getHorasDisponibles();
      this.reserva = new Reserva("", [], [], null, null, null, "");
      this.usuario = JSON.parse(localStorage.getItem("usuario"))
      if (this.usuario.rol === "ROL_PROFESOR") {
        this.reserva.usuario = this.usuario;
        this.maxFechas = 30;
      }
      this.reserva.recurso = this.recurso;
      this.reservaDiaria = true;
    } else if (this.dialog === "reservas") {
      this.mesMostrado = 0;
      this.header = {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay'
      };
      this.getReservas("05");

    }
    this.maxDate.setFullYear(this.minDate.getFullYear() + 1);
    this.es = {
      firstDayOfWeek: 1,
      dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
      dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
      dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
      monthNames: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      monthNamesShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
      today: 'Hoy',
      clear: 'Borrar'
    }
    this.cols = [
      { field: 'nombre', header: 'Nombre' },
      { field: 'apellido', header: 'Apellido' }
    ];
    this.colsCursos = [
      { field: 'nombre', header: 'Nombre' }
    ];
  }

  getHorasDisponibles() {
    this._horarioService.getHoras().subscribe(
      response => {
        if (response.status !== 403) {
          this.horasDisponibles = response.json();
          this.getUsuarios();
        } else {
          this._router.navigate(["login"]);
        }

      },
      error => {
        console.log(<any>error);
      }
    );
  }

  getReservas(fecha) {
    this._reservaService.getReservasByRecursoAndFecha(this.recurso.id, fecha).subscribe(
      response => {
        if (response.status !== 403) {
          this.trasnformarReservasEventos(response.json());
        } else {
          this._router.navigate(["login"]);
        }
      },
      error => {
        console.log(<any>error);
      }
    );
  }
  clickeado(event) {
    console.log(event)
    if (this.mesMostrado !== Number(event.getDate()._d.getUTCMonth() + 1)) {
      console.log(event.getDate()._d.getMonth())
      this.mesMostrado = Number(event.getDate()._d.getUTCMonth() + 1)
      this.yearMostrado = Number(event.getDate()._d.getFullYear())

      if (Number(event.getDate()._d.getUTCMonth() + 1) < 10) {
        this.getReservas("0" + this.mesMostrado + "/" + this.yearMostrado);

      } else {
        this.getReservas(this.mesMostrado + "/" + this.yearMostrado);

      }
    }
  }

  getFechasNoDisponibles() {
    console.log(this.reserva.intervalos_reservas.length === 0);
    this.fechasNoDisponibles = [];
    this._reservaService.getFechasNoDisponibles(this.reserva.intervalos_reservas, this.recurso.id).subscribe(
      response => {
        if (response.status !== 403) {
          for (let fecha in response.json()) {
            let fechaSeparada = response.json()[fecha].split("/")
            this.fechasNoDisponibles.push(new Date(fechaSeparada[2] + "-" + fechaSeparada[1] + "-" + fechaSeparada[0] + "T" + "00:00"));
          }
          console.log(this.fechasNoDisponibles);
          this.fechasNoDisponibles = [...this.fechasNoDisponibles];
        } else {
          this._router.navigate(["login"]);
        }
      },
      error => {
        this.mostrarMensajeIncorrecto();
      }
    );
  }


  getUsuarios() {
    this._usuarioService.getUsuarios().subscribe(
      response => {
        if (response.status !== 403) {
          this.usuarios = response;
          console.log(this.usuarios);
        } else {
          this._router.navigate(["login"]);
        }
      },
      error => {
        console.log(<any>error);
      }
    );
  }

  abrirDialogReservaDiaria(recurso: Recurso) {
    this.reserva.recurso = recurso;
    this.getHorasDisponibles();
    this.getUsuarios();
    console.log(this.horasDisponibles);
  }

  trasnformarReservasEventos(reservas: Reserva[]) {
    this.eventos = [];
    let evento = {};

    let observableReservas = Observable.from(reservas);

    observableReservas.map((reserva: Reserva) => {
      let horas = reserva.intervalos_reservas[0].split("-");
      let fechaSeparada = reserva.fechas_reservas[0].split("/")
      console.log(reserva);
      evento = {
        "title": reserva.usuario.nombre,
        "start": fechaSeparada[2] + "-" + fechaSeparada[1] + "-" + fechaSeparada[0] + "T" + horas[0],
        "end": fechaSeparada[2] + "-" + fechaSeparada[1] + "-" + fechaSeparada[0] + "T" + horas[1],
        "color": "#0767a3",
        "reserva": reserva
      }
      this.eventos.push(evento);
    }).finally(() => {
      this.getUsuarios();
      this.reservas = true;
      console.log(this.eventos)
    }).subscribe();
  }


  mostrarMensajeCorrecto() {
    this.msgs = [];
    this.msgs.push({ severity: 'success', summary: 'Operacion realizada' });
  }

  mostrarMensajeIncorrecto() {
    this.msgs = [];
    this.msgs.push({ severity: 'error', summary: 'Error en la operación' });
  }

  cancelar() {
    this.reservaDiaria = false;
    this.recurso = null;
    this.cerrar.emit("cerrar");
  }

  saveReserva() {
    console.log(this.reserva)
    this._reservaService.addReserva(this.reserva).subscribe(
      response => {
        console.log(response)
        if (response.status === 201) {
          this.cerrar.emit("ok");
        } else if (response.status === 403) {
          this._router.navigate(["login"]);
        } else {
          this.cerrar.emit("fail");
          this.mostrarMensajeIncorrecto();
        }
      },
      error => {
        this.mostrarMensajeIncorrecto();
      }
    );
  }

}
