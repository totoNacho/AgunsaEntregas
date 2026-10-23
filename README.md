# AgunsaEntregas — Web (recepción remota con firma)

App web para que un usuario reciba y firme la entrega de un equipo TI de forma remota.

## Flujo
1. **El técnico** abre la app, completa los datos del equipo y destinatarios, y pulsa
   **Generar enlace**. Copia o comparte ese enlace por correo o Teams.
2. **El usuario** abre el enlace en su teléfono (iPhone o Android), ve los datos
   (bloqueados), completa su nombre, RUT y firma, y genera el comprobante.
3. Se descarga el PDF y se abre Outlook con los destinatarios para enviarlo.

Funciona en iPhone, Android y PC. No requiere servidor ni base de datos: los datos del
técnico viajan codificados dentro del propio enlace.

## Publicado con GitHub Pages
La app es estática (HTML + JS). Se sirve tal cual desde GitHub Pages.

## Estructura
```
index.html      # Interfaz (vista técnico / vista usuario)
app.js          # Lógica: enlace, firma, PDF, envío
assets/         # Logos AGUNSA + jsPDF (librería de PDF)
```
