---
layout: default
title: "Tlön, Uqbar, HTMX"
---

# Tlön, Uqbar, HTMX

<a href="img/07-htmx.jpg" class="img-link">
  <img src="img/07-htmx.jpg" alt="Tlön, Uqbar, HTMX">
</a>

Con el modelo de datos listo, Regina suspira: *"Pero ahora viene la parte que odio: la interfaz de usuario. No quiero meterme en React o Angular solo para un formulario simple"*.

Dárico la sorprende: *"Estoy totalmente de acuerdo. He encontrado la respuesta a toda esa basura"*.

---

## La Herejía Sensata

*"Se llama **HTMX**. Olvida todo lo que crees saber sobre desarrollo web moderno"*.

La idea: en lugar de que el servidor envíe JSON para que JavaScript lo convierta en HTML, **¿por qué no enviar directamente el HTML?**

```html
<select hx-get="/forms" hx-target="#form-container">
  <option value="el-dorado">El Dorado</option>
  <option value="cascabel">Cascabel</option>
</select>

<div id="form-container">
  <!-- El servidor devuelve HTML puro aquí -->
</div>
```

Toda la lógica para generar el formulario dinámico se queda en el servidor, en Kotlin, donde Regina se siente cómoda.

---

## El Flujo en Acción

1) La página inicial:

<a href="img/htmx-flow.png" class="img-link">
  <img src="img/htmx-flow.png" alt="Página inicial">
</a>

2) Al seleccionar "El Dorado", HTMX pide el formulario al servidor.

3) El servidor devuelve HTML puro con los campos específicos de ese cliente.

4) El resultado final — sin una sola línea de JavaScript escrita a mano:

<a href="img/final-result.png" class="img-link">
  <img src="img/final-result.png" alt="Resultado final">
</a>

---

El navegador se encarga de lo que mejor sabe hacer: renderizar HTML. El servidor se encarga de la lógica.

> La complejidad de la UI se ha desvanecido.

---

<a class="drill-down" href="code/server-kt.html">↓ Ver Server.kt completo</a>

---

<div class="nav">
  <a class="prev" href="06-jackson.html">← Anterior</a>
  <span class="page">7 / 10</span>
  <a class="next" href="08-excel.html">Siguiente →</a>
</div>

---

*Alusión a 'Tlön, Uqbar, Orbis Tertius' (1940) de Jorge Luis Borges, donde un mundo ficticio termina reemplazando la realidad.*
