# Ruleta RozTii

Ruleta interactiva estilo oscuro/azul, preparada para GitHub Pages.

## Incluye

- Giro lento permanente cuando la ruleta está en reposo.
- Giro principal con aceleración/desaceleración.
- Resultado elegido al detenerse, siempre alineado con la flecha.
- Ventana (modal) grande para mostrar el reto elegido.
- Sonido generado con Web Audio API: sonido de inicio, ticks durante el giro y sonido de resultado.
- Agregar, eliminar, limpiar y restaurar retos.
- Guardado automático de los retos en `localStorage`.
- Diseño responsive para PC y móvil.

## Cambiar el logo del centro

El logo del centro se carga desde:

```text
assets/avatar.png
```

Reemplaza ese archivo por tu logo manteniendo el nombre `avatar.png`.

No necesitas modificar el código.

## Ejecutar

Abre `index.html` en un navegador moderno. No requiere Node.js.

También puedes usar:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`.

## GitHub Pages

Sube estos archivos al repositorio:

```text
index.html
style.css
script.js
README.md
assets/avatar.png
```

Después entra a **Settings → Pages → Deploy from a branch → main → /(root)** y guarda.
