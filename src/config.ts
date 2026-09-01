export const config = {
  port: Number(process.env.PORT ?? 8080),
  boincContainer: process.env.BOINC_CONTAINER ?? "boinc-lab",
};
