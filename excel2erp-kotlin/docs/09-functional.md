---
layout: default
title: "El Jardín de los Senderos"
---

# El Jardín de los Senderos que se Bifurcan

Una noche, mientras revisan el código final, Dárico le señala algo a Regina:

*"¿Te das cuenta de lo que **no** hay aquí?"*

Regina examina el código. Es limpio, es expresivo, pero no logra ver a qué se refiere. *"No sé... ¿no hay errores?"*, bromea.

---

*"Casi"*, ríe Dárico. *"No hay ni una sola variable mutable. Ni un `var` en todo el código. No hay bucles `while` ni `for`. Ningún dato ha sido 'dañado'. Es puro nirvana funcional"*.

---

## La Tubería de Transformación

<a href="img/09-data-pipeline.jpg" class="img-link float-right">
  <img src="img/09-data-pipeline.jpg" alt="Datos fluyendo por tuberías">
</a>

*"No necesitamos bucles"*, explica. *"Si queremos transformar una lista, usamos `map`. Si queremos filtrarla, usamos `filter`. Si necesitamos un acumulador, usamos `fold`"*.

```kotlin
// Sin bucles, sin mutabilidad
fun expand(text: String, props: Map<String, String?>): String =
    props.entries.fold(text) { str, (key, value) ->
        str.replace("\${${key}}", value ?: "")
    }
```

La idea le parece extraña a Regina. *"¿Cómo es posible? Se supone que programar es... cambiar cosas"*.

---

*"Ese es el paradigma imperativo"*, explica Dárico. *"Le decimos a la máquina **cómo** hacer las cosas. Pero el enfoque funcional es diferente: describimos el resultado que queremos. Tratamos los datos como un río que fluye a través de una tubería de transformaciones"*.

> En lugar de mutar datos, se crean datos nuevos en cada paso. El estado no se modifica, **fluye**.

---

<div class="nav">
  <a class="prev" href="08-excel.html">← Anterior</a>
  <span class="page">9 / 10</span>
  <a class="next" href="10-conclusion.html">Siguiente →</a>
</div>

---

*Alusión a 'El Jardín de Senderos que se Bifurcan' (1941) de Jorge Luis Borges, un laberinto de posibilidades donde cada decisión crea una nueva rama.*
