export const config = {
  port: Number(process.env.PORT ?? 8080),
  boincContainer: process.env.BOINC_CONTAINER ?? "boinc-lab",
  lcd: {
    enabled: (process.env.LCD_ENABLED ?? "true") === "true",
    port: process.env.LCD_SERIAL_PORT ?? "/dev/ttyUSB0",
    baudRate: Number(process.env.LCD_BAUD_RATE ?? 9600),
  },
};
