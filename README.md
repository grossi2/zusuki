# Zusuki

Aplicacion web simple para practicar lectura musical sobre pentagrama en clave de sol.

Esta version esta hecha solo con HTML, CSS y JavaScript, sin dependencias externas ni proceso de build.

## Caracteristicas

- Navegacion en varias paginas
- Configuracion de nomenclatura latina o anglosajona
- Opcion de sonido activable para el juego
- Seccion de teoria con visualizacion de notas
- Juego para adivinar notas con puntaje de aciertos y errores
- Persistencia local de configuracion con `localStorage`

## Estructura

- `index.html`: portada principal
- `configuracion.html`: preferencias de nomenclatura y sonido
- `teoria.html`: visualizacion de notas en el pentagrama
- `jugar.html`: practica interactiva
- `acerca.html`: informacion general del proyecto
- `script.js`: logica principal de la aplicacion
- `styles.css`: estilos globales

## Como ejecutar

No hace falta instalar nada. Puedes abrir `index.html` directamente en el navegador.

Si prefieres levantar un servidor local simple:

```bash
python3 -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

## Estado actual

La aplicacion guarda de forma local:

- nomenclatura elegida
- nivel seleccionado
- sonido activado o desactivado

El puntaje del juego se mantiene durante la sesion actual de la pagina.

## Proximas mejoras

- autenticacion de usuarios
- guardado remoto de estadisticas
- reportes por dia, semana y mes
- graficas de evolucion
- nuevos niveles y ejercicios

## Autor

Desarrollado por Guillermo Rossi.
