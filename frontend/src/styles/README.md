# Temas de Argillá

- `themes/brand.css`: navegación negra y roja y colores de acciones compartidos.
- `themes/light.css` y `themes/dark.css`: valores de cada tema.
- `themes/tokens.css`: conexión de las variables con las utilidades de Tailwind 4.
- `base.css`: reglas generales, foco y placeholders.

Usar roles semánticos en los componentes: `bg-app`, `bg-surface`,
`bg-field`, `text-content`, `text-secondary`, `text-muted`,
`border-border` para separadores y `border-control-border` para controles.
Los botones sólidos llevan `text-on-action`; los estados combinan
`text-success`, `bg-success-soft` y `border-success-border` (o info,
warning, danger).

Los estados interactivos usan las mismas utilidades, por ejemplo
`hover:bg-surface-hover` y `focus:border-focus`. Mantener tamaños,
espaciado y distribución en Tailwind dentro del componente.

Para añadir un nuevo rol, definirlo en ambas paletas y exponerlo en tokens.
Evitar colores fijos o duplicar las clases de cada componente con `dark:`.
La ilustración decorativa de acceso conserva colores fijos deliberadamente;
la navegación usa los roles `nav-*`, independientes del tema.

`index.html` aplica `argilla-theme` antes del primer pintado.
`ThemeProvider` mantiene el atributo `data-theme` de `html`,
sincroniza `color-scheme` y guarda los cambios. El valor inicial es claro;
un navegador que bloquee el almacenamiento sigue permitiendo cambiar el
tema durante la sesión. El tema también alcanza los portales en `body`.
