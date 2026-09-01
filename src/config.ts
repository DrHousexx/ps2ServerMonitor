export const config = {
  port: Number(process.env.PORT ?? 8080),
  boincContainer: process.env.BOINC_CONTAINER ?? "boinc-lab",

  // Path donde se monta el filesystem raiz del host (solo lectura) para leer uso real de disco.
  // Ver docker-compose.yml: volumes -> "/:/host:ro"
  hostRootPath: process.env.HOST_ROOT_PATH ?? "/host",

  lcd: {
    enabled: (process.env.LCD_ENABLED ?? "true") === "true",
    port: process.env.LCD_SERIAL_PORT ?? "/dev/ttyUSB0",
    baudRate: Number(process.env.LCD_BAUD_RATE ?? 9600),
    // Duracion normal de cada pantalla en la rotacion.
    pageDurationMs: Number(process.env.LCD_PAGE_DURATION_MS ?? 5000),
    // Duracion extendida para paginas que queres que se queden mas tiempo (ej. Red/Sistema).
    longPageDurationMs: Number(process.env.LCD_LONG_PAGE_DURATION_MS ?? 10000),
  },

  alerts: {
    diskUsedPctThreshold: Number(process.env.ALERT_DISK_PCT ?? 90),
    cpuPctThreshold: Number(process.env.ALERT_CPU_PCT ?? 95),
    cpuSustainedMs: Number(process.env.ALERT_CPU_SUSTAINED_MS ?? 5 * 60 * 1000),
  },
};
