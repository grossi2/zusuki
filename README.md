# Zusuki

Aplicacion web para practicar lectura musical sobre pentagrama en clave de sol.

El proyecto esta hecho con HTML, CSS y JavaScript en el navegador, sin bundlers ni proceso de build. Usa Firebase para autenticacion con Google y guardado de estadisticas.

## Caracteristicas

- Navegacion en varias paginas
- Configuracion de nomenclatura latina o anglosajona
- Opcion de sonido activable para el juego
- Seccion de teoria con visualizacion de notas
- Juego para adivinar notas con puntaje de aciertos y errores
- Persistencia local de configuracion con `localStorage`
- Login con Google mediante Firebase Authentication
- Guardado de sesiones de juego en Firestore
- Pagina de estadisticas con resumen diario, semanal y mensual
- Grafica simple de evolucion de aciertos y errores

## Estructura

- `index.html`: portada principal
- `configuracion.html`: preferencias de nomenclatura y sonido
- `teoria.html`: visualizacion de notas en el pentagrama
- `jugar.html`: practica interactiva
- `estadisticas.html`: resumen historico y evolucion por dia
- `acerca.html`: informacion general del proyecto
- `script.js`: logica principal de la aplicacion
- `firebase.js`: integracion con Firebase Auth y Firestore
- `firebase-config.js`: configuracion del proyecto Firebase
- `styles.css`: estilos globales

## Como ejecutar

Necesitas servir el proyecto desde un servidor local. No lo abras con `file:///`.

Ejemplo:

```bash
python3 -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

## Uso

1. Entra a `Configuracion` y elige nomenclatura y sonido
2. Revisa `Teoria`
3. Practica en `Jugar`
4. Inicia sesion con Google para guardar resultados
5. Consulta tu evolucion en `Estadisticas`

## Estado actual

La aplicacion guarda de forma local:

- nomenclatura elegida
- nivel seleccionado
- sonido activado o desactivado

Ademas, cuando el usuario inicia sesion, puede guardar sesiones de juego en Firestore.

## Firebase

El proyecto usa:

- Firebase Authentication con Google
- Cloud Firestore para guardar estadisticas por usuario

Completa `firebase-config.js` con los datos de tu proyecto:

```js
export const firebaseWebConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};
```

Luego configura esto en Firebase:

- habilita Authentication con proveedor Google
- crea Firestore Database
- agrega `localhost` a dominios autorizados si hace falta

### Reglas de Firestore

Para que cada usuario solo pueda leer y escribir sus propias estadisticas:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/gameSessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Modelo de datos

Las estadisticas se guardan en Firestore con esta estructura:

```text
users/{uid}/gameSessions/{sessionId}
```

Cada sesion incluye, entre otros, estos campos:

- `correctCount`
- `wrongCount`
- `level`
- `notation`
- `savedAtMs`
- `savedDateKey`

## Proximas mejoras

- estadisticas automaticas sin boton manual
- filtros por nivel
- mas tipos de ejercicios
- mas niveles y notas
- nuevos niveles y ejercicios

## Autor

Desarrollado por Guillermo Rossi.
