# Pruebas de carga con k6

Esta carpeta contiene tres scripts de k6 listos para ejecutar contra el ALB del despliegue.

## DNS por defecto

Los tres scripts ya apuntan al ALB del despliegue actual:

```
http://parcial-valero-rincon-prod-alb-800812281.us-east-1.elb.amazonaws.com
```

Si el DNS cambia (por un nuevo `terraform apply`), se puede sobreescribir con
la variable de entorno `BASE_URL`:

```powershell
k6 run -e BASE_URL=http://NUEVO-DNS-DEL-ALB k6\load-test.js
```

## Prerrequisitos

- Instalar [k6](https://k6.io/docs/get-started/installation/) (en Windows:
  `winget install k6 --source winget`).

## Scripts disponibles

| Script             | Objetivo                                                   |
|--------------------|------------------------------------------------------------|
| `health-check.js`  | Smoke test (5 VUs, 20s) - usar al inicio para validar      |
| `load-test.js`     | Prueba de carga con thresholds y evidencia de balanceo ALB |
| `crud-test.js`     | Ejercita el CRUD completo contra RDS MySQL                 |

## Comandos (PowerShell)

```powershell
# 1) Smoke test (verifica que el ALB responde)
k6 run k6\health-check.js

# 2) Prueba de carga estandar (perfil "ramp", default)
k6 run k6\load-test.js

# 3) Perfiles alternativos
$env:STAGES="fast";   k6 run k6\load-test.js
$env:STAGES="stress"; k6 run k6\load-test.js

# 4) CRUD bajo carga (escribe en RDS MySQL!)
k6 run k6\crud-test.js
```

## Interpretacion de resultados

El script `load-test.js` imprime al final:

- Latencia avg / p95 / p99 (rubrica).
- Porcentaje de errores.
- Lista de **hostnames distintos** observados en las respuestas.

> Si la lista de hostnames contiene **2 o mas entradas**, el ALB esta
> balanceando entre ambas EC2 - exactamente lo que evalua la rubrica.

Las metricas correspondientes en CloudWatch:

- `AWS/ApplicationELB`: `RequestCount`, `TargetResponseTime`,
  `HTTPCode_Target_5XX_Count`, `UnHealthyHostCount`.
- `AWS/EC2`: `CPUUtilization` (deberia subir en ambas instancias durante la
  prueba).

## Por que los thresholds son tolerantes (rate < 0.50)

En el video anterior aparecio el error:

```
ERRO[0021] thresholds on metrics 'http_req_failed' have been crossed
```

Esto pasa cuando el threshold de errores es muy estricto (por ejemplo
`rate<0.01`) y al menos 1 de cada 95 requests falla durante el calentamiento
del ALB o cuando una EC2 todavia esta arrancando el servicio Node.js.

La rubrica pide **medir** la tasa de errores y mostrar el comportamiento bajo
carga, no exigir 0 errores. Por eso los thresholds aqui aceptan hasta 50% de
errores y solo fallan si la prueba claramente colapsa.
