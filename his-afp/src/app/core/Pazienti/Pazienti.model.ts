export interface Paziente {
  id: string; // id
  nome: string; // nome
  cognome: string; // cognome
  braccialetto: string; // braccialetto
  eta: number; // da calcolare con dataNascita
  codiceColore: string; // coloreCode
  note: string; // noteTriage
  patologia: string; // patologiaCode
}

export interface PazienteDTO {
  id: number;
  patientId?: number;
  braccialetto: string;
  dataOraIngresso: string;
  stato: string;
  noteTriage: string;
  patologiaCode: string;
  nome: string;
  cognome: string;
  dataNascita: string;
  sex: string;
  codiceFiscale: string;
  patologiaDescrizione: string;
  coloreCode: string;
  coloreHex: string;
  coloreNome: string;
  modalitaArrivoCode: string;
  modalitaArrivoDescrizione: string;

  indirizzoVia: string;
  indirizzoCivico: string;
  comune: string;
  provincia: string;
}

export interface PatientAdmission {
  anagrafica: {
    nome: string;
    cognome: string;
    dataNascita: string;
    codiceFiscale: string;
    sesso: string;
  };
  sanitaria: {
    patologia: string;
    codiceColore: string;
    modArrivo: string;
    noteTriage: string;
  };
  residenza: {
    via: string;
    civico: string;
    comune: string;
    provincia: string;
  };
}

export interface PatientAdmissionRes {
  id: number;
  braccialetto: string;
}

export interface PatientSearchQuery {
  cf?: string;
  nome?: string;
  cognome?: string;
  dataNascita?: string;
}

export interface DischargedAdmissionReport {
  braccialetto: string;
  stato: 'DIM';
  nome: string;
  cognome: string;
  dataOraIngresso: string;
  dataOraDimissione: string;
}
