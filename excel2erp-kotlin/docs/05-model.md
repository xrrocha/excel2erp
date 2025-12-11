---
layout: default
title: "El Motor en Kotlin"
---

# Un Vistazo al "Motor"

<a href="img/05-model.jpg" class="img-link">
  <img src="img/05-model.jpg" alt="Un Vistazo al Motor">
</a>

Entusiasmada, Regina le muestra su "mapa" YAML a su novio Dárico, que recientemente volvió de un proyecto Android en Estados Unidos donde reemplazó Java por Kotlin.

Dárico queda impresionado. *"Esto es brillante"*, le dice. *"Has modelado perfectamente el 'qué'. Ahora construyamos el 'cómo' con Kotlin"*.

<a href="img/diagrama-clases-es.png" class="img-link float-right">
  <img src="img/diagrama-clases-es.png" alt="Diagrama de clases">
</a>

<div class="clearfix"></div>

Al principio, ella duda. *"¿Kotlin? ¿No es para celulares?"*

*"No te preocupes"*, le dice él. *"La sintaxis es muy parecida a C# o JavaScript. Y escribir en inglés te abrirá puertas"*.

---

## El Reto Interesante

Dárico plantea: *"¿Qué pasa cuando el Excel de un cliente no incluye la fecha de entrega? El ERP la necesita. ¿Cómo sabe el motor qué datos pedir?"*

Regina reflexiona. *"Supongo que con un `if` gigante..."*

Dárico sonríe. *"Ahí es donde vuelve la 'aritmética'. ¿Y si hacemos algo más mágico?"*

---

## La Magia Funcional

En lugar de escribir código que *extrae* los datos, escriben código que **construye una función extractora** sobre la marcha, basada en la configuración.

```kotlin
fun resolveHeader(headerSpec: FileSpec):
    Pair<(Workbook) -> Map<String, String?>, List<Property>> {

    // Particiona las propiedades en presentes y ausentes
    val (present, absent) = headerSpec.properties
        .partition { headerMap.containsKey(it.name) }

    // Sintetiza la función extractora
    val extractor = { wb: Workbook ->
        defaultValues + present.associate { /* ... */ }
    }

    return Pair(extractor, absent.filterNot { /* ... */ })
}
```

El resultado no es solo una lista de campos faltantes, sino también una **función a medida** para ese cliente.

*"¡Es como si el código se escribiera a sí mismo!"*

---

<a class="drill-down" href="code/model-kt.html">↓ Ver Model.kt completo</a>

---

<div class="nav">
  <a class="prev" href="04-analysis.html">← Anterior</a>
  <span class="page">5 / 10</span>
  <a class="next" href="06-jackson.html">Siguiente →</a>
</div>
