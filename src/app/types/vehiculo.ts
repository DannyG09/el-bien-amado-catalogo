export type EstadoVehiculo =
  | "disponible"
  | "reservado"
  | "rentado"
  | "mantenimiento"
  | "pintura";

export type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  color: string;
  tipoSeguro: string;
  precioDia: number;
  imagen: string | null;
  descripcion: string | null;
  disponible: boolean;
  estado: EstadoVehiculo;
};
