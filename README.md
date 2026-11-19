# Juego 3D Arena
Aplicación web con Flask y Three.js para una pizzería nocturna inspirada en seguridad arcade.

## Arquitectura

- `app.py`: servidor Flask y API REST.
- `templates/index.html`: interfaz y HUD.
- `static/css/style.css`: diseño responsivo y controles táctiles.
- `static/js/three.min.js`: biblioteca Three.js r128 local.
- `static/js/game.js`: escena, movimiento, salto y objetivos.
- Cuatro animatrónicos 3D: Freddy, Bonnie, Chica y Foxy.
- Laberinto con suelo de tablero, paredes decoradas, mesas y lámparas cálidas.
- Linterna, batería, munición, fusibles, radar de movimiento y controles táctiles.

## Ejecutar localmente

```bash
python -m pip install -r requirements.txt
python app.py
```

Abrir `http://localhost:5000`.

## Controles

- `WASD` o flechas: mover.
- `Espacio`: saltar.
- Botones táctiles: controles móviles.
- Objetivo: recoger los octaedros amarillos.

## API

- `GET /api/status`: estado del servicio.
- `GET /api/scores`: mejores puntuaciones almacenadas en memoria.
- `POST /api/scores`: registra una puntuación JSON con `name` y `score`.

## Despliegue por USB/SSH

Desde Termux o PRoot:

```bash
scp -r ./juego3d dell:C:/Users/Desktop/
ssh dell
cd C:\Users\Desktop\juego3d
python app.py
```

La aplicación queda disponible en `http://10.15.185.187:5000`.
