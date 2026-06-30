# Simulador de Sistemas Amortiguados de 2do Orden

Un simulador web interactivo diseñado para analizar, visualizar y comprender la respuesta en el tiempo de los sistemas de segundo orden (subamortiguados, críticamente amortiguados y sobreamortiguados). 

La herramienta no solo calcula la respuesta matemática a diferentes entradas (escalón unitario e impulso), sino que también **simula físicamente** el comportamiento mediante un sistema interactivo de masa-resorte-amortiguador.

## 🚀 Características Principales

- **Simulación Visual e Interactiva:** Una representación física animada de un sistema masa-resorte-amortiguador que reacciona en tiempo real. 
- **Interactividad Táctil/Mouse:** Puedes hacer clic sobre la masa para generar un **Impulso (Golpe)** o puedes **Arrastrar y soltar** la masa para observar el sistema en régimen de **Respuesta Libre** desde condiciones iniciales arbitrarias.
- **Gráfica en Vivo:** La gráfica de respuesta en el tiempo se traza punto a punto de manera dinámica, sincronizada completamente con el movimiento del resorte.
- **Plano S (Polos):** Visualización en tiempo real de la ubicación de los polos conjugados en el plano complejo $s$ según los parámetros seleccionados.
- **Cálculo de Métricas Automático:** Calcula instantáneamente métricas clave de ingeniería de control como:
  - Tiempo de Asentamiento ($T_s$ al 2%)
  - Sobreimpulso Máximo ($M_p$)
  - Frecuencia Amortiguada ($\omega_d$)
- **Comparativa de Casos:** Permite superponer los 3 regímenes de amortiguamiento principales ($\zeta < 1$, $\zeta = 1$, $\zeta > 1$) en una sola gráfica para fines educativos.
- **Exportación:** Botón dedicado para exportar/descargar la gráfica generada en formato PNG.

## ⚙️ Parámetros Modificables

Puedes ajustar los siguientes valores desde la interfaz:
* **Factor de amortiguamiento ($\zeta$):** Desde $0.01$ hasta $3.0$.
* **Frecuencia natural ($\omega_n$):** En rad/s.
* **Tipo de Entrada:** Respuesta al Escalón Unitario o al Impulso de Dirac.
* **Tiempo de simulación ($t_{max}$):** Define el rango del eje horizontal de la gráfica.

## 💻 Tecnologías Utilizadas

Este proyecto está construido enteramente con tecnologías web estándar (Vanilla), por lo que es rápido, ligero y no requiere procesos de compilación (build).

- **HTML5 & CSS3:** Estructura semántica con un diseño moderno "Dark Premium", utilizando CSS Grid/Flexbox y variables nativas.
- **JavaScript (Vanilla):** Toda la lógica matemática, simulación de físicas y manejo del DOM.
- **Canvas API:** Dibujado procedimental del sistema masa-resorte.
- **[Chart.js](https://www.chartjs.org/):** Librería externa (cargada mediante CDN) utilizada para renderizar de manera fluida y precisa las gráficas matemáticas (Serie de tiempo y Plano S).

## 🛠️ Cómo usarlo (Instalación)

No necesitas instalar Node.js ni ningún servidor especial para ejecutar este simulador:

1. Clona o descarga este repositorio en tu computadora.
2. Abre la carpeta del proyecto.
3. Haz doble clic en el archivo `index.html` para abrirlo en tu navegador web de preferencia (Chrome, Firefox, Edge, Safari).
4. ¡Listo! Empieza a jugar con los sliders y a interactuar con la masa en la pantalla.

---
*Diseñado con una estética moderna e interacciones responsivas para facilitar la enseñanza y comprensión de la Teoría de Control y Dinámica de Sistemas.*
